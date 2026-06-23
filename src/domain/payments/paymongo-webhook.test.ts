import { describe, expect, it } from "vitest";
import {
  classifyPayMongoWebhookEventType,
  decidePayMongoWebhookIdempotency,
  parsePayMongoWebhookEvent,
} from "./paymongo-webhook";

function rawHostedCheckoutPaidEvent() {
  return JSON.stringify({
    event_type: "send.webhook",
    data: {
      type: "checkout_session.payment.paid",
      resource: "checkout_session",
      livemode: false,
      data: {
        id: "cs_test_123",
        type: "checkout_session",
        attributes: {
          payment_intent: { id: "pi_123" },
          payments: [
            {
              id: "pay_123",
              attributes: {
                billing: { email: "buyer@example.test" },
                status: "paid",
              },
            },
          ],
          reference_number: "JRW-attempt-reservation",
        },
      },
    },
  });
}

describe("PayMongo webhook domain", () => {
  it("extracts safe Hosted Checkout identity and references", () => {
    const parsed = parsePayMongoWebhookEvent(rawHostedCheckoutPaidEvent());

    expect(parsed).toEqual({
      event: {
        eventType: "checkout_session.payment.paid",
        livemode: false,
        providerCheckoutSessionId: "cs_test_123",
        providerEventId:
          "derived:checkout_session.payment.paid:cs_test_123:pay_123",
        providerEventIdSource: "derived",
        providerPaymentId: "pay_123",
        providerPaymentIntentId: "pi_123",
      },
      ok: true,
    });
    expect(JSON.stringify(parsed)).not.toMatch(
      /billing|signature|webhookSecret|rawPayload|rawBody|checkout_url|card|email|phone|address|token/i
    );
  });

  it("supports standard PayMongo event envelopes with provider event IDs", () => {
    const parsed = parsePayMongoWebhookEvent(
      JSON.stringify({
        data: {
          id: "evt_payment_paid_123",
          type: "event",
          attributes: {
            type: "payment.paid",
            livemode: true,
            data: {
              id: "pay_456",
              type: "payment",
              attributes: { payment_intent_id: "pi_456" },
            },
          },
        },
      })
    );

    expect(parsed).toEqual({
      event: {
        eventType: "payment.paid",
        livemode: true,
        providerEventId: "evt_payment_paid_123",
        providerEventIdSource: "provider",
        providerPaymentId: "pay_456",
        providerPaymentIntentId: "pi_456",
      },
      ok: true,
    });
  });

  it("rejects malformed event envelopes safely", () => {
    expect(parsePayMongoWebhookEvent("not-json")).toEqual({
      ok: false,
      reason: "invalid_json",
    });
    expect(parsePayMongoWebhookEvent(JSON.stringify({ data: {} }))).toEqual({
      ok: false,
      reason: "missing_event_type",
    });
    expect(
      parsePayMongoWebhookEvent(
        JSON.stringify({ data: { type: "checkout_session.payment.paid" } })
      )
    ).toEqual({ ok: false, reason: "missing_event_id" });
  });

  it("classifies Hosted Checkout paid and unsupported event types", () => {
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

  it("decides new, duplicate, conflicting, and unsupported events", () => {
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
