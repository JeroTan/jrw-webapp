import type { ErrorCodeType } from "@/utils/general/error";

export type PayMongoWebhookSignatureMode = "live" | "test";

export type PayMongoWebhookSignatureVerificationResult =
  | {
      mode: PayMongoWebhookSignatureMode;
      ok: true;
      payloadHash: string;
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

type SignatureCandidate = {
  mode: PayMongoWebhookSignatureMode;
  value: string;
};

type ParsedSignatureHeader = {
  signatures: SignatureCandidate[];
  timestamp: number;
};

const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300;
const HEX_SIGNATURE_PATTERN = /^[a-f0-9]{64}$/i;
const textEncoder = new TextEncoder();

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(value: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(value.length / 2);

  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }

  return bytes;
}

function parsePayMongoSignatureHeader(
  signatureHeader: string
): ParsedSignatureHeader | null {
  const values = new Map<string, string[]>();

  for (const part of signatureHeader.split(",")) {
    const separatorIndex = part.indexOf("=");

    if (separatorIndex < 1) {
      continue;
    }

    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    values.set(key, [...(values.get(key) ?? []), value]);
  }

  const timestamp = Number(values.get("t")?.[0]);
  const signatures: SignatureCandidate[] = [
    ...(values.get("te") ?? []).map((value) => ({
      mode: "test" as const,
      value,
    })),
    ...(values.get("li") ?? []).map((value) => ({
      mode: "live" as const,
      value,
    })),
  ].filter((signature) => HEX_SIGNATURE_PATTERN.test(signature.value));

  return Number.isSafeInteger(timestamp) && timestamp > 0 && signatures.length > 0
    ? { signatures, timestamp }
    : null;
}

async function importHmacKey(webhookSecret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(webhookSecret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"]
  );
}

async function hmacSha256Hex(
  webhookSecret: string,
  value: string
): Promise<string> {
  const key = await importHmacKey(webhookSecret);
  const digest = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));

  return bytesToHex(digest);
}

export async function hashPayMongoWebhookPayload(
  rawBody: string
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(rawBody)
  );

  return bytesToHex(digest);
}

export async function createPayMongoWebhookSignatureHeader(input: {
  mode: PayMongoWebhookSignatureMode;
  rawBody: string;
  timestamp: number;
  webhookSecret: string;
}): Promise<string> {
  const signature = await hmacSha256Hex(
    input.webhookSecret,
    `${input.timestamp}.${input.rawBody}`
  );

  return input.mode === "live"
    ? `t=${input.timestamp},te=,li=${signature}`
    : `t=${input.timestamp},te=${signature},li=`;
}

export async function verifyPayMongoWebhookSignature(input: {
  nowMs?: number;
  rawBody: string;
  signatureHeader?: string | null;
  toleranceSeconds?: number;
  webhookSecret?: string | null;
}): Promise<PayMongoWebhookSignatureVerificationResult> {
  const webhookSecret = cleanString(input.webhookSecret);

  if (!webhookSecret) {
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

  const toleranceSeconds = Math.max(
    0,
    Math.trunc(input.toleranceSeconds ?? DEFAULT_SIGNATURE_TOLERANCE_SECONDS)
  );
  const ageSeconds = Math.abs(
    (input.nowMs ?? Date.now()) / 1000 - parsed.timestamp
  );

  if (ageSeconds > toleranceSeconds) {
    return {
      code: "WEBHOOK_INVALID_SIGNATURE",
      ok: false,
      reason: "stale_signature",
    };
  }

  try {
    const key = await importHmacKey(webhookSecret);
    const signedPayload = textEncoder.encode(
      `${parsed.timestamp}.${input.rawBody}`
    );

    for (const signature of parsed.signatures) {
      const valid = await crypto.subtle.verify(
        "HMAC",
        key,
        hexToBytes(signature.value),
        signedPayload
      );

      if (valid) {
        return {
          mode: signature.mode,
          ok: true,
          payloadHash: await hashPayMongoWebhookPayload(input.rawBody),
          timestamp: parsed.timestamp,
        };
      }
    }

    return {
      code: "WEBHOOK_INVALID_SIGNATURE",
      ok: false,
      reason: "invalid_signature",
    };
  } catch {
    return {
      code: "PROVIDER_UNAVAILABLE",
      ok: false,
      reason: "crypto_unavailable",
    };
  }
}
