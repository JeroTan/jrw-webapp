import { createId } from "@paralleldrive/cuid2";
import { and, eq, ne } from "drizzle-orm";
import type { AppDb } from "@/adapter/infrastructure/db/client";
import { checkout_payments, payment_webhook_events } from "@/domain/schema/transactions";
import type { PayMongoWebhookProcessingStatus } from "@/domain/payments/paymongo-webhook";

type PaymentWebhookEventRow = typeof payment_webhook_events.$inferSelect;

export type PaymentWebhookRecord = {
  createdAt: string;
  eventType: string;
  firstRequestId: string;
  id: string;
  lastRequestId: string;
  payloadHash: string;
  processedAt: string | null;
  processingStatus: PayMongoWebhookProcessingStatus;
  provider: string;
  providerCheckoutSessionId: string | null;
  providerEventId: string;
  providerPaymentId: string | null;
  providerPaymentIntentId: string | null;
  receivedAt: string;
  relatedPaymentId: string | null;
  updatedAt: string;
};

export type ClaimPaymentWebhookEventInput = {
  eventType: string;
  initialStatus: "IGNORED" | "RECEIVED";
  now?: string;
  payloadHash: string;
  providerCheckoutSessionId?: string | null;
  providerEventId: string;
  providerPaymentId?: string | null;
  providerPaymentIntentId?: string | null;
  requestId: string;
};

export type ClaimPaymentWebhookEventResult =
  | { decision: "claimed"; event: PaymentWebhookRecord }
  | { decision: "duplicate"; event: PaymentWebhookRecord }
  | { decision: "conflict"; event: PaymentWebhookRecord };

export type ProcessPaidCheckoutSessionInput = {
  eventId: string;
  now?: string;
  providerCheckoutSessionId: string;
  requestId: string;
};

export type ProcessPaidCheckoutSessionResult =
  | {
      decision: "already-paid" | "paid";
      paymentId: string;
      paymentStatus: "PAYMENT_PAID";
    }
  | { decision: "invalid-state"; paymentId: string; paymentStatus: string }
  | { decision: "unmatched" };

function processingStatus(value: string): PayMongoWebhookProcessingStatus {
  switch (value) {
    case "RECEIVED":
    case "PROCESSED":
    case "IGNORED":
    case "CONFLICT":
    case "FAILED":
      return value;
    default:
      return "FAILED";
  }
}

function rowToWebhookEvent(row: PaymentWebhookEventRow): PaymentWebhookRecord {
  return {
    createdAt: row.created_at,
    eventType: row.event_type,
    firstRequestId: row.first_request_id,
    id: row.id,
    lastRequestId: row.last_request_id,
    payloadHash: row.payload_hash,
    processedAt: row.processed_at,
    processingStatus: processingStatus(row.processing_status),
    provider: row.provider,
    providerCheckoutSessionId: row.provider_checkout_session_id,
    providerEventId: row.provider_event_id,
    providerPaymentId: row.provider_payment_id,
    providerPaymentIntentId: row.provider_payment_intent_id,
    receivedAt: row.received_at,
    relatedPaymentId: row.related_payment_id,
    updatedAt: row.updated_at,
  };
}

export class DrizzlePaymentWebhookRepository {
  constructor(private readonly db: AppDb) {}

  async claimEvent(
    input: ClaimPaymentWebhookEventInput
  ): Promise<ClaimPaymentWebhookEventResult> {
    const now = input.now ?? new Date().toISOString();
    const eventId = createId();
    const insertedRows = await this.db
      .insert(payment_webhook_events)
      .values({
        id: eventId,
        provider: "PAYMONGO",
        provider_event_id: input.providerEventId,
        event_type: input.eventType,
        payload_hash: input.payloadHash,
        processing_status: input.initialStatus,
        provider_checkout_session_id: input.providerCheckoutSessionId ?? null,
        provider_payment_id: input.providerPaymentId ?? null,
        provider_payment_intent_id: input.providerPaymentIntentId ?? null,
        first_request_id: input.requestId,
        last_request_id: input.requestId,
        received_at: now,
        processed_at: input.initialStatus === "IGNORED" ? now : null,
        created_at: now,
        updated_at: now,
      })
      .onConflictDoNothing({
        target: payment_webhook_events.provider_event_id,
      })
      .returning();

    if (insertedRows[0]) {
      return { decision: "claimed", event: rowToWebhookEvent(insertedRows[0]) };
    }

    const existing = await this.findByProviderEventId(input.providerEventId);

    if (!existing) {
      throw new Error("PAYMONGO_WEBHOOK_EVENT_CLAIM_RACE");
    }

    if (existing.payload_hash === input.payloadHash) {
      const rows = await this.db
        .update(payment_webhook_events)
        .set({ last_request_id: input.requestId, updated_at: now })
        .where(eq(payment_webhook_events.id, existing.id))
        .returning();

      return {
        decision: "duplicate",
        event: rowToWebhookEvent(rows[0] ?? existing),
      };
    }

    const rows = await this.db
      .update(payment_webhook_events)
      .set({
        last_request_id: input.requestId,
        processing_status: "CONFLICT",
        updated_at: now,
      })
      .where(
        and(
          eq(payment_webhook_events.id, existing.id),
          ne(payment_webhook_events.payload_hash, input.payloadHash)
        )
      )
      .returning();

    return {
      decision: "conflict",
      event: rowToWebhookEvent(rows[0] ?? existing),
    };
  }

  async processPaidCheckoutSession(
    input: ProcessPaidCheckoutSessionInput
  ): Promise<ProcessPaidCheckoutSessionResult> {
    const now = input.now ?? new Date().toISOString();
    const paymentRows = await this.db
      .select()
      .from(checkout_payments)
      .where(
        and(
          eq(checkout_payments.provider, "PAYMONGO"),
          eq(
            checkout_payments.provider_checkout_session_id,
            input.providerCheckoutSessionId
          )
        )
      )
      .limit(1);
    const payment = paymentRows[0];

    if (!payment) {
      await this.markEventFailed({
        eventId: input.eventId,
        now,
        requestId: input.requestId,
      });

      return { decision: "unmatched" };
    }

    if (payment.status === "PAYMENT_PAID") {
      await this.markEventProcessed({
        eventId: input.eventId,
        now,
        paymentId: payment.id,
        requestId: input.requestId,
      });

      return {
        decision: "already-paid",
        paymentId: payment.id,
        paymentStatus: "PAYMENT_PAID",
      };
    }

    if (payment.status !== "PAYMENT_PENDING") {
      await this.markEventFailed({
        eventId: input.eventId,
        now,
        paymentId: payment.id,
        requestId: input.requestId,
      });

      return {
        decision: "invalid-state",
        paymentId: payment.id,
        paymentStatus: payment.status,
      };
    }

    const paymentUpdate = this.db
      .update(checkout_payments)
      .set({
        status: "PAYMENT_PAID",
        updated_request_id: input.requestId,
        updated_at: now,
      })
      .where(
        and(
          eq(checkout_payments.id, payment.id),
          eq(checkout_payments.status, "PAYMENT_PENDING")
        )
      )
      .returning({ id: checkout_payments.id, status: checkout_payments.status });
    const eventUpdate = this.db
      .update(payment_webhook_events)
      .set({
        last_request_id: input.requestId,
        processing_status: "PROCESSED",
        related_payment_id: payment.id,
        processed_at: now,
        updated_at: now,
      })
      .where(eq(payment_webhook_events.id, input.eventId))
      .returning({ id: payment_webhook_events.id });
    const [updatedPayments] = await this.db.batch([paymentUpdate, eventUpdate]);

    if (updatedPayments[0]) {
      return {
        decision: "paid",
        paymentId: updatedPayments[0].id,
        paymentStatus: "PAYMENT_PAID",
      };
    }

    return {
      decision: "already-paid",
      paymentId: payment.id,
      paymentStatus: "PAYMENT_PAID",
    };
  }

  private async findByProviderEventId(
    providerEventId: string
  ): Promise<PaymentWebhookEventRow | null> {
    const rows = await this.db
      .select()
      .from(payment_webhook_events)
      .where(eq(payment_webhook_events.provider_event_id, providerEventId))
      .limit(1);

    return rows[0] ?? null;
  }

  private async markEventFailed(input: {
    eventId: string;
    now: string;
    paymentId?: string;
    requestId: string;
  }) {
    await this.db
      .update(payment_webhook_events)
      .set({
        last_request_id: input.requestId,
        processing_status: "FAILED",
        related_payment_id: input.paymentId ?? null,
        processed_at: input.now,
        updated_at: input.now,
      })
      .where(eq(payment_webhook_events.id, input.eventId));
  }

  private async markEventProcessed(input: {
    eventId: string;
    now: string;
    paymentId: string;
    requestId: string;
  }) {
    await this.db
      .update(payment_webhook_events)
      .set({
        last_request_id: input.requestId,
        processing_status: "PROCESSED",
        related_payment_id: input.paymentId,
        processed_at: input.now,
        updated_at: input.now,
      })
      .where(eq(payment_webhook_events.id, input.eventId));
  }
}
