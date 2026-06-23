import { Miniflare } from "miniflare";
import { describe, expect, it } from "vitest";
import { createDb } from "@/adapter/infrastructure/db/client";
import { DrizzlePaymentWebhookRepository } from "./PaymentWebhookRepository";

const now = "2026-06-23T08:00:00.000Z";

async function createWebhookTestD1() {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    d1Databases: ["DB"],
  });
  const d1 = await mf.getD1Database("DB");

  for (const statement of [
    `CREATE TABLE checkout_payments (
      id text PRIMARY KEY NOT NULL,
      checkout_attempt_id text NOT NULL,
      reservation_id text NOT NULL,
      provider text DEFAULT 'PAYMONGO' NOT NULL,
      provider_checkout_session_id text NOT NULL,
      provider_reference_number text NOT NULL,
      status text DEFAULT 'PAYMENT_PENDING' NOT NULL,
      amount_centavos integer NOT NULL,
      currency text DEFAULT 'PHP' NOT NULL,
      checkout_url text NOT NULL,
      livemode integer DEFAULT 0 NOT NULL,
      created_request_id text NOT NULL,
      updated_request_id text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE UNIQUE INDEX uq_checkout_payments_provider_session
      ON checkout_payments(provider_checkout_session_id)`,
    `CREATE TABLE payment_webhook_events (
      id text PRIMARY KEY NOT NULL,
      provider text DEFAULT 'PAYMONGO' NOT NULL,
      provider_event_id text NOT NULL,
      event_type text NOT NULL,
      payload_hash text NOT NULL,
      processing_status text DEFAULT 'RECEIVED' NOT NULL,
      related_payment_id text,
      provider_checkout_session_id text,
      provider_payment_id text,
      provider_payment_intent_id text,
      first_request_id text NOT NULL,
      last_request_id text NOT NULL,
      received_at text NOT NULL,
      processed_at text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE UNIQUE INDEX uq_payment_webhook_events_provider_event_id
      ON payment_webhook_events(provider_event_id)`,
  ]) {
    await d1.prepare(statement).run();
  }

  await d1
    .prepare(
      `INSERT INTO checkout_payments (
        id, checkout_attempt_id, reservation_id, provider,
        provider_checkout_session_id, provider_reference_number, status,
        amount_centavos, currency, checkout_url, livemode,
        created_request_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "payment_1",
      "attempt_1",
      "reservation_1",
      "PAYMONGO",
      "cs_test_123",
      "JRW-attempt_1-reservation_1",
      "PAYMENT_PENDING",
      3998,
      "PHP",
      "https://checkout.paymongo.com/cs_test_123",
      0,
      "req_create",
      now,
      now
    )
    .run();

  return { d1, mf, repository: new DrizzlePaymentWebhookRepository(createDb(d1)) };
}

const supportedClaim = {
  eventType: "checkout_session.payment.paid",
  initialStatus: "RECEIVED" as const,
  now,
  payloadHash: "a".repeat(64),
  providerCheckoutSessionId: "cs_test_123",
  providerEventId:
    "derived:checkout_session.payment.paid:cs_test_123:pay_123",
  providerPaymentId: "pay_123",
  providerPaymentIntentId: "pi_123",
  requestId: "req_webhook_1",
};

describe("DrizzlePaymentWebhookRepository", () => {
  it("claims new events before processing and returns exact retries", async () => {
    const { mf, repository } = await createWebhookTestD1();

    await expect(repository.claimEvent(supportedClaim)).resolves.toMatchObject({
      decision: "claimed",
      event: { processingStatus: "RECEIVED" },
    });
    await expect(
      repository.claimEvent({ ...supportedClaim, requestId: "req_webhook_2" })
    ).resolves.toMatchObject({
      decision: "duplicate",
      event: {
        firstRequestId: "req_webhook_1",
        lastRequestId: "req_webhook_2",
        processingStatus: "RECEIVED",
      },
    });

    await mf.dispose();
  }, 15_000);

  it("marks same event ID with a different payload hash as conflict", async () => {
    const { mf, repository } = await createWebhookTestD1();
    await repository.claimEvent(supportedClaim);

    await expect(
      repository.claimEvent({
        ...supportedClaim,
        payloadHash: "b".repeat(64),
        requestId: "req_conflict",
      })
    ).resolves.toMatchObject({
      decision: "conflict",
      event: {
        lastRequestId: "req_conflict",
        processingStatus: "CONFLICT",
      },
    });

    await mf.dispose();
  }, 15_000);

  it("records unsupported events as ignored idempotently", async () => {
    const { mf, repository } = await createWebhookTestD1();
    const claim = {
      ...supportedClaim,
      eventType: "payment.refunded",
      initialStatus: "IGNORED" as const,
      providerEventId: "evt_refund_unsupported",
    };

    await expect(repository.claimEvent(claim)).resolves.toMatchObject({
      decision: "claimed",
      event: { processingStatus: "IGNORED", processedAt: now },
    });
    await expect(repository.claimEvent(claim)).resolves.toMatchObject({
      decision: "duplicate",
      event: { processingStatus: "IGNORED" },
    });

    await mf.dispose();
  }, 15_000);

  it("guards pending-to-paid mutation and links processed event", async () => {
    const { d1, mf, repository } = await createWebhookTestD1();
    const claim = await repository.claimEvent(supportedClaim);
    if (claim.decision !== "claimed") throw new Error("expected claim");

    await expect(
      repository.processPaidCheckoutSession({
        eventId: claim.event.id,
        now,
        providerCheckoutSessionId: "cs_test_123",
        requestId: "req_process",
      })
    ).resolves.toEqual({
      decision: "paid",
      paymentId: "payment_1",
      paymentStatus: "PAYMENT_PAID",
    });

    const payment = await d1
      .prepare("SELECT status, updated_request_id FROM checkout_payments WHERE id = ?")
      .bind("payment_1")
      .first<{ status: string; updated_request_id: string }>();
    const event = await d1
      .prepare(
        "SELECT processing_status, related_payment_id FROM payment_webhook_events WHERE id = ?"
      )
      .bind(claim.event.id)
      .first<{ processing_status: string; related_payment_id: string }>();

    expect(payment).toEqual({
      status: "PAYMENT_PAID",
      updated_request_id: "req_process",
    });
    expect(event).toEqual({
      processing_status: "PROCESSED",
      related_payment_id: "payment_1",
    });

    await mf.dispose();
  }, 15_000);

  it("marks unmatched supported events failed without payment mutation", async () => {
    const { d1, mf, repository } = await createWebhookTestD1();
    const claim = await repository.claimEvent({
      ...supportedClaim,
      providerCheckoutSessionId: "cs_missing",
      providerEventId:
        "derived:checkout_session.payment.paid:cs_missing:pay_missing",
    });
    if (claim.decision !== "claimed") throw new Error("expected claim");

    await expect(
      repository.processPaidCheckoutSession({
        eventId: claim.event.id,
        now,
        providerCheckoutSessionId: "cs_missing",
        requestId: "req_unmatched",
      })
    ).resolves.toEqual({ decision: "unmatched" });

    const payment = await d1
      .prepare("SELECT status FROM checkout_payments WHERE id = ?")
      .bind("payment_1")
      .first<{ status: string }>();
    expect(payment?.status).toBe("PAYMENT_PENDING");

    await mf.dispose();
  }, 15_000);
});
