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

export type PayMongoWebhookEventParseResult =
  | { event: PayMongoWebhookEvent; ok: true }
  | {
      ok: false;
      reason: "invalid_json" | "missing_event_id" | "missing_event_type";
    };

export type PayMongoWebhookEvent = {
  eventType: string;
  livemode?: boolean;
  providerCheckoutSessionId?: string;
  providerEventId: string;
  providerEventIdSource: "derived" | "provider";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.trim();
  return cleaned || undefined;
}

function recordAt(
  value: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null {
  const nested = value?.[key];
  return isRecord(nested) ? nested : null;
}

function stringAt(
  value: Record<string, unknown> | null,
  key: string
): string | undefined {
  return cleanString(value?.[key]);
}

function paidPaymentId(attributes: Record<string, unknown> | null) {
  const payments = attributes?.payments;

  if (!Array.isArray(payments)) {
    return undefined;
  }

  for (const payment of payments) {
    if (!isRecord(payment)) {
      continue;
    }

    const paymentAttributes = recordAt(payment, "attributes");

    if (stringAt(paymentAttributes, "status") === "paid") {
      return stringAt(payment, "id");
    }
  }

  return undefined;
}

function derivedEventId(input: {
  eventType: string;
  providerCheckoutSessionId?: string;
  providerPaymentId?: string;
  providerPaymentIntentId?: string;
}): string | undefined {
  const resourceId = input.providerCheckoutSessionId;
  const paymentReference =
    input.providerPaymentId ?? input.providerPaymentIntentId;

  return resourceId && paymentReference
    ? `derived:${input.eventType}:${resourceId}:${paymentReference}`
    : undefined;
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
    return { ok: false, reason: "missing_event_type" };
  }

  const envelopeData = recordAt(parsed, "data");
  const standardAttributes = recordAt(envelopeData, "attributes");
  const isStandardEnvelope = Boolean(standardAttributes);
  const eventType = isStandardEnvelope
    ? stringAt(standardAttributes, "type")
    : stringAt(envelopeData, "type");

  if (!eventType) {
    return { ok: false, reason: "missing_event_type" };
  }

  const resource = isStandardEnvelope
    ? recordAt(standardAttributes, "data")
    : recordAt(envelopeData, "data");
  const resourceAttributes = recordAt(resource, "attributes");
  const resourceType = stringAt(resource, "type");
  const providerCheckoutSessionId =
    stringAt(resourceAttributes, "checkout_session_id") ??
    stringAt(recordAt(resourceAttributes, "checkout_session"), "id") ??
    (resourceType === "checkout_session" ? stringAt(resource, "id") : undefined);
  const providerPaymentId =
    (resourceType === "payment" ? stringAt(resource, "id") : undefined) ??
    stringAt(resourceAttributes, "payment_id") ??
    paidPaymentId(resourceAttributes);
  const providerPaymentIntentId =
    stringAt(resourceAttributes, "payment_intent_id") ??
    stringAt(recordAt(resourceAttributes, "payment_intent"), "id");
  const suppliedProviderEventId = isStandardEnvelope
    ? stringAt(envelopeData, "id")
    : undefined;
  const providerEventId =
    suppliedProviderEventId ??
    derivedEventId({
      eventType,
      providerCheckoutSessionId,
      providerPaymentId,
      providerPaymentIntentId,
    });

  if (!providerEventId) {
    return { ok: false, reason: "missing_event_id" };
  }

  const livemodeValue = isStandardEnvelope
    ? standardAttributes?.livemode
    : envelopeData?.livemode;

  return {
    event: {
      eventType,
      ...(typeof livemodeValue === "boolean"
        ? { livemode: livemodeValue }
        : {}),
      ...(providerCheckoutSessionId ? { providerCheckoutSessionId } : {}),
      providerEventId,
      providerEventIdSource: suppliedProviderEventId ? "provider" : "derived",
      ...(providerPaymentId ? { providerPaymentId } : {}),
      ...(providerPaymentIntentId ? { providerPaymentIntentId } : {}),
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
