import { describe, expect, it } from "vitest";
import { createPayMongoWebhookSignatureHeader } from "@/lib/paymongo/PayMongoWebhookVerifier";
import { Result } from "@/utils/general/result";
import {
  PaymentWebhookService,
  type PaymentWebhookRepositoryLike,
} from "./PaymentWebhookService";

const webhookSecret = "whsec_test";
const timestamp = 1_787_000_000;
const nowMs = timestamp * 1000;
const now = "2026-06-23T08:00:00.000Z";

function rawPaidEvent() {
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
          payments: [{ id: "pay_123", attributes: { status: "paid" } }],
        },
      },
    },
  });
}

async function signature(rawBody: string) {
  return createPayMongoWebhookSignatureHeader({
    mode: "test",
    rawBody,
    timestamp,
    webhookSecret,
  });
}

function repositoryStub(
  overrides: Partial<PaymentWebhookRepositoryLike> = {}
): PaymentWebhookRepositoryLike & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    claimEvent: async () => {
      calls.push("claimEvent");
      return {
        decision: "claimed" as const,
        event: {
          createdAt: now,
          eventType: "checkout_session.payment.paid",
          firstRequestId: "req_1",
          id: "webhook_event_1",
          lastRequestId: "req_1",
          payloadHash: "a".repeat(64),
          processedAt: null,
          processingStatus: "RECEIVED" as const,
          provider: "PAYMONGO",
          providerCheckoutSessionId: "cs_test_123",
          providerEventId:
            "derived:checkout_session.payment.paid:cs_test_123:pay_123",
          providerPaymentId: "pay_123",
          providerPaymentIntentId: "pi_123",
          receivedAt: now,
          relatedPaymentId: null,
          updatedAt: now,
        },
      };
    },
    processPaidCheckoutSession: async () => {
      calls.push("processPaidCheckoutSession");
      return {
        decision: "paid" as const,
        paymentId: "payment_1",
        paymentStatus: "PAYMENT_PAID" as const,
      };
    },
    ...overrides,
  };
}

describe("PaymentWebhookService", () => {
  it("rejects invalid signature before parsing, idempotency, mutation, or audit", async () => {
    const repository = repositoryStub();
    const auditEvents: unknown[] = [];
    const service = new PaymentWebhookService({
      auditPublisher: { publish: async (event) => void auditEvents.push(event) },
      repository,
    });

    const result = await service.processPayMongoWebhook({
      now,
      nowMs,
      rawBody: rawPaidEvent(),
      requestId: "req_bad_sig",
      signatureHeader: "t=1496734173,te=bad,li=",
      webhookSecret,
    });

    expect(result.error?.code).toBe("WEBHOOK_INVALID_SIGNATURE");
    expect(repository.calls).toEqual([]);
    expect(auditEvents).toEqual([]);
  });

  it("claims and processes valid paid Hosted Checkout event", async () => {
    const rawBody = rawPaidEvent();
    const service = new PaymentWebhookService({ repository: repositoryStub() });
    const result = await service.processPayMongoWebhook({
      now,
      nowMs,
      rawBody,
      requestId: "req_paid",
      signatureHeader: await signature(rawBody),
      webhookSecret,
    });

    expect(result).toEqual(
      Result.okay({
        event: {
          eventType: "checkout_session.payment.paid",
          idempotent: false,
          providerEventId:
            "derived:checkout_session.payment.paid:cs_test_123:pay_123",
          status: "PROCESSED",
        },
        payment: { paymentId: "payment_1", status: "PAYMENT_PAID" },
      })
    );
  });

  it("returns duplicate exact retries without processing payment again", async () => {
    const rawBody = rawPaidEvent();
    const repository = repositoryStub({
      claimEvent: async () => {
        repository.calls.push("claimEvent");
        return {
          decision: "duplicate" as const,
          event: {
            ...(await repositoryStub().claimEvent({} as never)).event,
            processingStatus: "PROCESSED" as const,
            relatedPaymentId: "payment_1",
          },
        };
      },
    });
    const service = new PaymentWebhookService({ repository });

    const result = await service.processPayMongoWebhook({
      now,
      nowMs,
      rawBody,
      requestId: "req_duplicate",
      signatureHeader: await signature(rawBody),
      webhookSecret,
    });

    expect(result.content?.event).toMatchObject({
      idempotent: true,
      status: "PROCESSED",
    });
    expect(repository.calls).toEqual(["claimEvent"]);
  });

  it("blocks conflicting duplicate payloads", async () => {
    const rawBody = rawPaidEvent();
    const repository = repositoryStub({
      claimEvent: async () => ({
        decision: "conflict" as const,
        event: {
          ...(await repositoryStub().claimEvent({} as never)).event,
          processingStatus: "CONFLICT" as const,
        },
      }),
    });
    const service = new PaymentWebhookService({ repository });

    const result = await service.processPayMongoWebhook({
      now,
      nowMs,
      rawBody,
      requestId: "req_conflict",
      signatureHeader: await signature(rawBody),
      webhookSecret,
    });

    expect(result.error?.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("records unsupported events as ignored", async () => {
    const rawBody = JSON.stringify({
      data: {
        id: "evt_refund_1",
        type: "event",
        attributes: { type: "payment.refunded", data: { id: "refund_1" } },
      },
    });
    const service = new PaymentWebhookService({
      repository: repositoryStub({
        claimEvent: async () => ({
          decision: "claimed" as const,
          event: {
            ...(await repositoryStub().claimEvent({} as never)).event,
            eventType: "payment.refunded",
            processingStatus: "IGNORED" as const,
            providerEventId: "evt_refund_1",
          },
        }),
      }),
    });

    const result = await service.processPayMongoWebhook({
      now,
      nowMs,
      rawBody,
      requestId: "req_ignored",
      signatureHeader: await signature(rawBody),
      webhookSecret,
    });

    expect(result.content?.event).toEqual({
      eventType: "payment.refunded",
      idempotent: false,
      providerEventId: "evt_refund_1",
      status: "IGNORED",
    });
  });
});
