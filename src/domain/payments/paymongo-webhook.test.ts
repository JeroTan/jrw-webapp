import { describe, expect, it } from "vitest";
import {
  classifyPayMongoWebhookEventType,
  createPayMongoWebhookSignatureHeader,
  decidePayMongoWebhookIdempotency,
  hashPayMongoWebhookPayload,
  parsePayMongoWebhookEvent,
  verifyPayMongoWebhookSignature,
} from "./paymongo-webhook";

const webhookKey = "jrw-test-webhook-key";
const timestamp = 1_787_000_000;
const nowMs = timestamp * 1000;

function rawPaidEvent() {
  return JSON.stringify({
    data: {
      id: "evt_checkout_paid_123",
      attributes: {
        type: "checkout_session.payment.paid",
        data: {
          id: "pay_123",
          type: "payment",
          attributes: {
            checkout_session_id: "cs_test_123",
            payment_intent_id: "pi_123",
          },
        },
      },
    },
  });
}

describe("PayMongo webhook domain", () => {
  it("verifies a PayMongo signature against the exact raw request body", async () => {
    const rawBody = rawPaidEvent();
    const signatureHeader = await createPayMongoWebhookSignatureHeader({
      rawBody,
      timestamp,
      webhookKey,
    });

    await expect(
      verifyPayMongoWebhookSignature({
        nowMs,
        rawBody,
        signatureHeader,
        webhookKey,
      })
    ).resolves.toMatchObject({
      ok: true,
      payloadHash: await hashPayMongoWebhookPayload(rawBody),
      signedPayload: `${timestamp}.${rawBody}`,
      timestamp,
    });

    const reserializedBody = JSON.stringify(JSON.parse(rawBody), null, 2);

    await expect(
      verifyPayMongoWebhookSignature({
        nowMs,
        rawBody: reserializedBody,
        signatureHeader,
        webhookKey,
      })
    ).resolves.toEqual({
      code: "WEBHOOK_INVALID_SIGNATURE",
      ok: false,
      reason: "invalid_signature",
    });
  });

  it("rejects missing, malformed, stale, and invalid signatures safely", async () => {
    const rawBody = rawPaidEvent();
    const signatureHeader = await createPayMongoWebhookSignatureHeader({
      rawBody,
      timestamp,
      webhookKey,
    });

    await expect(
      verifyPayMongoWebhookSignature({
        nowMs,
        rawBody,
        signatureHeader,
        webhookKey: "",
      })
    ).resolves.toEqual({
      code: "PROVIDER_UNAVAILABLE",
      ok: false,
      reason: "missing_key",
    });
    await expect(
      verifyPayMongoWebhookSignature({ nowMs, rawBody, webhookKey })
    ).resolves.toEqual({
      code: "WEBHOOK_INVALID_SIGNATURE",
      ok: false,
      reason: "missing_signature",
    });
    await expect(
      verifyPayMongoWebhookSignature({
        nowMs,
        rawBody,
        signatureHeader: "bad-header",
        webhookKey,
      })
    ).resolves.toEqual({
      code: "WEBHOOK_INVALID_SIGNATURE",
      ok: false,
      reason: "malformed_signature",
    });
    await expect(
      verifyPayMongoWebhookSignature({
        nowMs: nowMs + 301_000,
        rawBody,
        signatureHeader,
        webhookKey,
      })
    ).resolves.toEqual({
      code: "WEBHOOK_INVALID_SIGNATURE",
      ok: false,
      reason: "stale_signature",
    });
  });

  it("extracts only safe event identity and provider references after verification", () => {
    const parsed = parsePayMongoWebhookEvent(rawPaidEvent());

    expect(parsed).toEqual({
      event: {
        eventType: "checkout_session.payment.paid",
        providerCheckoutSessionId: "cs_test_123",
        providerEventId: "evt_checkout_paid_123",
        providerPaymentId: "pay_123",
        providerPaymentIntentId: "pi_123",
      },
      ok: true,
    });
    expect(JSON.stringify(parsed)).not.toMatch(
      /signature|webhookKey|rawPayload|rawBody|checkout_url|card|email|phone|address|token/i
    );
  });

  it("classifies supported and unsupported event types explicitly", () => {
    expect(
      classifyPayMongoWebhookEventType("checkout_session.payment.paid")
    ).toEqual({
      eventType: "checkout_session.payment.paid",
      status: "supported",
    });
    expect(classifyPayMongoWebhookEventType("payment.refunded")).toEqual({
      eventType: "payment.refunded",
      status: "unsupported",
    });
  });

  it("decides idempotency for new, duplicate, conflicting, and unsupported events", () => {
    const supported = classifyPayMongoWebhookEventType(
      "checkout_session.payment.paid"
    );
    const unsupported = classifyPayMongoWebhookEventType("payment.refunded");

    expect(
      decidePayMongoWebhookIdempotency({
        eventDecision: supported,
        existing: null,
        payloadHash: "hash_1",
      })
    ).toEqual({ decision: "record-new", nextStatus: "RECEIVED" });
    expect(
      decidePayMongoWebhookIdempotency({
        eventDecision: unsupported,
        existing: null,
        payloadHash: "hash_1",
      })
    ).toEqual({ decision: "record-new", nextStatus: "IGNORED" });
    expect(
      decidePayMongoWebhookIdempotency({
        eventDecision: supported,
        existing: {
          payloadHash: "hash_1",
          processingStatus: "PROCESSED",
          providerEventId: "evt_123",
        },
        payloadHash: "hash_1",
      })
    ).toEqual({ decision: "duplicate", existingStatus: "PROCESSED" });
    expect(
      decidePayMongoWebhookIdempotency({
        eventDecision: supported,
        existing: {
          payloadHash: "hash_1",
          processingStatus: "PROCESSED",
          providerEventId: "evt_123",
        },
        payloadHash: "hash_2",
      })
    ).toEqual({
      code: "IDEMPOTENCY_CONFLICT",
      decision: "conflict",
      nextStatus: "CONFLICT",
    });
  });
});
