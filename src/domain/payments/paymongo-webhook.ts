import type { ErrorCodeType } from "@/utils/general/error";

export const PAYMONGO_WEBHOOK_SUPPORTED_EVENT_TYPES = [
  "checkout_session.payment.paid",
] as const;

export const PAYMONGO_WEBHOOK_PROCESSING_STATUS = [
  "RECEIVED",
  "PROCESSED",
  "IGNORED",
  "CONFLICT",
  "FAILED",
] as const;

export type PayMongoWebhookSupportedEventType =
  (typeof PAYMONGO_WEBHOOK_SUPPORTED_EVENT_TYPES)[number];

export type PayMongoWebhookProcessingStatus =
  (typeof PAYMONGO_WEBHOOK_PROCESSING_STATUS)[number];

export type PayMongoWebhookSignatureVerificationResult =
  | {
      ok: true;
      payloadHash: string;
      signedPayload: string;
      timestamp: number;
    }
  | {
      code: ErrorCodeType;
      ok: false;
      reason:
        | "crypto_unavailable"
        | "invalid_signature"
        | "malformed_signature"
        | "missing_key"
        | "missing_signature"
        | "stale_signature";
    };

export type PayMongoWebhookEventParseResult =
  | { event: PayMongoWebhookEvent; ok: true }
  | {
      ok: false;
      reason: "invalid_json" | "missing_event_id" | "missing_event_type";
    };

export type PayMongoWebhookEvent = {
  eventType: string;
  providerCheckoutSessionId?: string;
  providerEventId: string;
  providerPaymentId?: string;
  providerPaymentIntentId?: string;
};

export type PayMongoWebhookEventDecision =
  | { eventType: PayMongoWebhookSupportedEventType; status: "supported" }
  | { eventType: string; status: "unsupported" };

export type PayMongoWebhookIdempotencyRecord = {
  payloadHash: string;
  processingStatus: PayMongoWebhookProcessingStatus;
  providerEventId: string;
};

export type PayMongoWebhookIdempotencyDecision =
  | { decision: "record-new"; nextStatus: "RECEIVED" | "IGNORED" }
  | { decision: "duplicate"; existingStatus: PayMongoWebhookProcessingStatus }
  | {
      code: "IDEMPOTENCY_CONFLICT";
      decision: "conflict";
      nextStatus: "CONFLICT";
    };

type ParsedSignatureHeader = {
  signatures: string[];
  timestamp: number;
};

const textEncoder = new TextEncoder();
const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300;
const HEX_SIGNATURE_PATTERN = /^[a-f0-9]{64}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqualHex(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return diff === 0;
}

function parsePayMongoSignatureHeader(
  signatureHeader: string
): ParsedSignatureHeader | null {
  const entries = signatureHeader
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");

      return separatorIndex === -1
        ? [part, ""]
        : [part.slice(0, separatorIndex), part.slice(separatorIndex + 1)];
    });
  const timestampText = entries.find(([key]) => key === "t")?.[1] ?? "";
  const timestamp = Number(timestampText);
  const signatures = entries
    .filter(([key]) => key === "v1")
    .map(([, value]) => value)
    .filter((value) => HEX_SIGNATURE_PATTERN.test(value));

  return Number.isSafeInteger(timestamp) && timestamp > 0 && signatures.length > 0
    ? { signatures, timestamp }
    : null;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));

  return bytesToHex(digest);
}

async function hmacSha256Hex(webhookKey: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(webhookKey),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(value)
  );

  return bytesToHex(digest);
}

export async function hashPayMongoWebhookPayload(rawBody: string): Promise<string> {
  return sha256Hex(rawBody);
}

export async function createPayMongoWebhookSignatureHeader(input: {
  rawBody: string;
  timestamp: number;
  webhookKey: string;
}): Promise<string> {
  const signedPayload = `${input.timestamp}.${input.rawBody}`;
  const signature = await hmacSha256Hex(input.webhookKey, signedPayload);

  return `t=${input.timestamp},v1=${signature}`;
}

export async function verifyPayMongoWebhookSignature(input: {
  nowMs?: number;
  rawBody: string;
  signatureHeader?: string | null;
  toleranceSeconds?: number;
  webhookKey?: string | null;
}): Promise<PayMongoWebhookSignatureVerificationResult> {
  const webhookKey = cleanString(input.webhookKey);

  if (!webhookKey) {
    return { code: "PROVIDER_UNAVAILABLE", ok: false, reason: "missing_key" };
  }

  const signatureHeader = cleanString(input.signatureHeader);

  if (!signatureHeader) {
    return {
      code: "WEBHOOK_INVALID_SIGNATURE",
      ok: false,
      reason: "missing_signature",
    };
  }

  const parsed = parsePayMongoSignatureHeader(signatureHeader);

  if (!parsed) {
    return {
      code: "WEBHOOK_INVALID_SIGNATURE",
      ok: false,
      reason: "malformed_signature",
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  const toleranceSeconds = Math.max(
    0,
    Math.trunc(input.toleranceSeconds ?? DEFAULT_SIGNATURE_TOLERANCE_SECONDS)
  );
  const ageSeconds = Math.abs(nowMs / 1000 - parsed.timestamp);

  if (ageSeconds > toleranceSeconds) {
    return {
      code: "WEBHOOK_INVALID_SIGNATURE",
      ok: false,
      reason: "stale_signature",
    };
  }

  try {
    const signedPayload = `${parsed.timestamp}.${input.rawBody}`;
    const expectedSignature = await hmacSha256Hex(webhookKey, signedPayload);
    const hasMatchingSignature = parsed.signatures.some((signature) =>
      constantTimeEqualHex(signature.toLowerCase(), expectedSignature)
    );

    if (!hasMatchingSignature) {
      return {
        code: "WEBHOOK_INVALID_SIGNATURE",
        ok: false,
        reason: "invalid_signature",
      };
    }

    return {
      ok: true,
      payloadHash: await hashPayMongoWebhookPayload(input.rawBody),
      signedPayload,
      timestamp: parsed.timestamp,
    };
  } catch {
    return {
      code: "PROVIDER_UNAVAILABLE",
      ok: false,
      reason: "crypto_unavailable",
    };
  }
}

function nestedRecord(
  value: Record<string, unknown>,
  path: readonly string[]
): Record<string, unknown> | null {
  return path.reduce<Record<string, unknown> | null>((current, key) => {
    if (!current) {
      return null;
    }

    const next = current[key];
    return isRecord(next) ? next : null;
  }, value);
}

function nestedString(
  value: Record<string, unknown>,
  path: readonly string[]
): string | undefined {
  const leaf = path.slice(0, -1).reduce<unknown>((current, key) => {
    return isRecord(current) ? current[key] : undefined;
  }, value);
  const lastKey = path[path.length - 1];

  if (!lastKey || !isRecord(leaf)) {
    return undefined;
  }

  const text = cleanString(leaf[lastKey]);

  return text || undefined;
}

export function parsePayMongoWebhookEvent(
  rawBody: string
): PayMongoWebhookEventParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  if (!isRecord(parsed)) {
    return { ok: false, reason: "missing_event_id" };
  }

  const providerEventId = nestedString(parsed, ["data", "id"]);
  const eventType = nestedString(parsed, ["data", "attributes", "type"]);
  const eventData = nestedRecord(parsed, ["data", "attributes", "data"]);

  if (!providerEventId) {
    return { ok: false, reason: "missing_event_id" };
  }

  if (!eventType) {
    return { ok: false, reason: "missing_event_type" };
  }

  return {
    event: {
      eventType,
      providerCheckoutSessionId:
        nestedString(parsed, [
          "data",
          "attributes",
          "data",
          "attributes",
          "checkout_session_id",
        ]) ??
        nestedString(parsed, [
          "data",
          "attributes",
          "data",
          "attributes",
          "checkout_session",
          "id",
        ]) ??
        (eventData?.type === "checkout_session" ? cleanString(eventData.id) : undefined),
      providerEventId,
      providerPaymentId:
        nestedString(parsed, ["data", "attributes", "data", "id"]) ??
        nestedString(parsed, [
          "data",
          "attributes",
          "data",
          "attributes",
          "payment_id",
        ]),
      providerPaymentIntentId: nestedString(parsed, [
        "data",
        "attributes",
        "data",
        "attributes",
        "payment_intent_id",
      ]),
    },
    ok: true,
  };
}

export function classifyPayMongoWebhookEventType(
  eventType: string
): PayMongoWebhookEventDecision {
  return PAYMONGO_WEBHOOK_SUPPORTED_EVENT_TYPES.includes(
    eventType as PayMongoWebhookSupportedEventType
  )
    ? {
        eventType: eventType as PayMongoWebhookSupportedEventType,
        status: "supported",
      }
    : { eventType, status: "unsupported" };
}

export function decidePayMongoWebhookIdempotency(input: {
  eventDecision: PayMongoWebhookEventDecision;
  existing: PayMongoWebhookIdempotencyRecord | null;
  payloadHash: string;
}): PayMongoWebhookIdempotencyDecision {
  if (!input.existing) {
    return {
      decision: "record-new",
      nextStatus:
        input.eventDecision.status === "supported" ? "RECEIVED" : "IGNORED",
    };
  }

  if (input.existing.payloadHash === input.payloadHash) {
    return {
      decision: "duplicate",
      existingStatus: input.existing.processingStatus,
    };
  }

  return {
    code: "IDEMPOTENCY_CONFLICT",
    decision: "conflict",
    nextStatus: "CONFLICT",
  };
}
