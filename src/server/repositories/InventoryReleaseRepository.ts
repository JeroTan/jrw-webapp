import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { AppDb } from "@/adapter/infrastructure/db/client";
import {
  decideInventoryReleaseForPayment,
  type InventoryReleaseReason,
} from "@/domain/checkout/inventory-release";
import { product_variants } from "@/domain/schema/catalog";
import {
  checkout_attempts,
  checkout_payments,
  checkout_reservation_items,
  checkout_reservation_releases,
  checkout_reservations,
  orders,
} from "@/domain/schema/transactions";

export type InventoryReleaseSkipReason =
  | "missing-payment"
  | "skip-active-pending"
  | "skip-mismatch"
  | "skip-order-exists"
  | "skip-paid"
  | "skip-provider-mismatch"
  | "skip-reservation-inactive";

export type InventoryReleaseInput = {
  allowPendingTimeout?: boolean;
  now?: string;
  paymentId: string;
  releaseReason?: InventoryReleaseReason;
  requestId: string;
};

export type ReleaseStalePendingPaymentsInput = {
  limit?: number;
  now?: string;
  requestId: string;
};

type InventoryReleaseResultBase = {
  attemptId: string | null;
  itemCount: number;
  paymentId: string;
  paymentStatus: string;
  releaseReason: InventoryReleaseReason | null;
  reservationId: string | null;
  restoredQuantity: number;
};

export type InventoryReleaseResult =
  | (InventoryReleaseResultBase & { decision: "released" })
  | (InventoryReleaseResultBase & { decision: "already-released" })
  | (InventoryReleaseResultBase & {
      decision: "skipped";
      skipReason: InventoryReleaseSkipReason;
    })
  | (InventoryReleaseResultBase & {
      decision: "failed";
      errorCode: "INVENTORY_RELEASE_FAILED";
    });

export type ReleaseStalePendingPaymentsResult = {
  failedCount: number;
  processedCount: number;
  releasedCount: number;
  results: InventoryReleaseResult[];
  skippedCount: number;
};

export type InventoryReleaseRepositoryLike = {
  releaseInventoryForPayment(
    input: InventoryReleaseInput
  ): Promise<InventoryReleaseResult>;
  releaseStalePendingPayments?(
    input: ReleaseStalePendingPaymentsInput
  ): Promise<ReleaseStalePendingPaymentsResult>;
};

type PaymentReleaseSource = {
  attemptId: string;
  attemptReservationId: string | null;
  orderId: string | null;
  paymentCreatedAt: string;
  paymentId: string;
  paymentProvider: string;
  paymentReservationId: string;
  paymentStatus: string;
  reservationAttemptId: string | null;
  reservationExpiresAt: string | null;
  reservationId: string | null;
  reservationStatus: string | null;
};

type ReservationItemRow = {
  id: string;
  productId: string | null;
  quantity: number;
  reservationMode: string;
  variantId: string | null;
};

type ReleaseRow = typeof checkout_reservation_releases.$inferSelect;

const RELEASE_OPEN_STATUSES = ["REQUESTED", "FAILED"] as const;

function clampReleaseLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return 50;
  }

  return Math.max(1, Math.min(Math.trunc(limit), 200));
}

function isReservationTimedOut(expiresAt: string | null, now: string): boolean {
  if (!expiresAt) {
    return false;
  }

  const expiresTime = Date.parse(expiresAt);
  const nowTime = Date.parse(now);

  if (Number.isFinite(expiresTime) && Number.isFinite(nowTime)) {
    return expiresTime <= nowTime;
  }

  return expiresAt <= now;
}

function attemptStatusForReleaseReason(reason: InventoryReleaseReason): string {
  return reason === "PENDING_TIMEOUT" ? "PAYMENT_EXPIRED" : reason;
}

export class DrizzleInventoryReleaseRepository implements InventoryReleaseRepositoryLike {
  constructor(private readonly db: AppDb) {}

  async releaseInventoryForPayment(
    input: InventoryReleaseInput
  ): Promise<InventoryReleaseResult> {
    const now = input.now ?? new Date().toISOString();
    const source = await this.findPaymentReleaseSource(input.paymentId);

    if (!source) {
      return {
        attemptId: null,
        decision: "skipped",
        itemCount: 0,
        paymentId: input.paymentId,
        paymentStatus: "UNKNOWN",
        releaseReason: null,
        reservationId: null,
        restoredQuantity: 0,
        skipReason: "missing-payment",
      };
    }

    if (source.paymentProvider !== "PAYMONGO") {
      return {
        attemptId: source.attemptId,
        decision: "skipped",
        itemCount: 0,
        paymentId: source.paymentId,
        paymentStatus: source.paymentStatus,
        releaseReason: null,
        reservationId: source.reservationId,
        restoredQuantity: 0,
        skipReason: "skip-provider-mismatch",
      };
    }

    const stalePendingTimedOut =
      input.allowPendingTimeout === true &&
      source.paymentStatus === "PAYMENT_PENDING" &&
      isReservationTimedOut(source.reservationExpiresAt, now);
    const decision = decideInventoryReleaseForPayment({
      orderExists: Boolean(source.orderId),
      paymentReservationMatches:
        Boolean(source.reservationId) &&
        source.paymentReservationId === source.reservationId &&
        source.attemptId === source.reservationAttemptId,
      paymentStatus: source.paymentStatus,
      reservationStatus: source.reservationStatus,
      stalePendingTimedOut,
    });
    const base = {
      attemptId: source.attemptId,
      itemCount: 0,
      paymentId: source.paymentId,
      paymentStatus: source.paymentStatus,
      releaseReason: null,
      reservationId: source.reservationId,
      restoredQuantity: 0,
    } satisfies InventoryReleaseResultBase;

    if (decision.decision === "already-released") {
      return { ...base, decision: "already-released" };
    }

    if (decision.decision !== "release") {
      return {
        ...base,
        decision: "skipped",
        skipReason: decision.decision,
      };
    }

    if (!source.reservationId) {
      return {
        ...base,
        decision: "skipped",
        skipReason: "skip-mismatch",
      };
    }

    const releaseReason = input.releaseReason ?? decision.reason;
    let paymentStatus = source.paymentStatus;

    if (decision.reason === "PENDING_TIMEOUT") {
      const newerPendingPaymentExists = await this.newerPendingPaymentExists({
        attemptId: source.attemptId,
        createdAt: source.paymentCreatedAt,
        paymentId: source.paymentId,
        reservationId: source.reservationId,
      });

      if (newerPendingPaymentExists) {
        return {
          ...base,
          decision: "skipped",
          releaseReason,
          skipReason: "skip-active-pending",
        };
      }

      paymentStatus = await this.markPendingPaymentExpired({
        now,
        paymentId: source.paymentId,
        requestId: input.requestId,
      });

      if (paymentStatus !== "PAYMENT_EXPIRED") {
        return {
          ...base,
          decision: "skipped",
          paymentStatus,
          skipReason: "skip-reservation-inactive",
        };
      }
    }

    const items = await this.findReservationItems(source.reservationId);
    let appliedItemCount = 0;
    let restoredQuantity = 0;

    for (const item of items) {
      const release = await this.ensureReleaseRow({
        attemptId: source.attemptId,
        item,
        now,
        paymentId: source.paymentId,
        releaseReason,
        requestId: input.requestId,
        reservationId: source.reservationId,
      });

      if (release.status === "APPLIED") {
        continue;
      }

      if (
        item.reservationMode !== "STOCK" ||
        !item.productId ||
        !item.variantId
      ) {
        const applied = await this.markReleaseApplied({
          now,
          releaseId: release.id,
          releaseReason,
          requestId: input.requestId,
        });
        if (applied) {
          appliedItemCount += 1;
        }
        continue;
      }

      const applied = await this.applyStockRelease({
        item,
        now,
        releaseId: release.id,
        releaseReason,
        requestId: input.requestId,
      });

      if (applied === "failed") {
        await this.markReleaseFailed({
          now,
          releaseId: release.id,
          releaseReason,
          requestId: input.requestId,
        });

        return {
          attemptId: source.attemptId,
          decision: "failed",
          errorCode: "INVENTORY_RELEASE_FAILED",
          itemCount: items.length,
          paymentId: source.paymentId,
          paymentStatus,
          releaseReason,
          reservationId: source.reservationId,
          restoredQuantity,
        };
      }

      if (applied === "applied") {
        appliedItemCount += 1;
        restoredQuantity += item.quantity;
      }
    }

    await this.finalizeReservationRelease({
      attemptId: source.attemptId,
      now,
      releaseReason,
      requestId: input.requestId,
      reservationId: source.reservationId,
    });

    if (appliedItemCount === 0) {
      return {
        attemptId: source.attemptId,
        decision: "already-released",
        itemCount: items.length,
        paymentId: source.paymentId,
        paymentStatus,
        releaseReason,
        reservationId: source.reservationId,
        restoredQuantity: 0,
      };
    }

    return {
      attemptId: source.attemptId,
      decision: "released",
      itemCount: items.length,
      paymentId: source.paymentId,
      paymentStatus,
      releaseReason,
      reservationId: source.reservationId,
      restoredQuantity,
    };
  }

  async releaseStalePendingPayments(
    input: ReleaseStalePendingPaymentsInput
  ): Promise<ReleaseStalePendingPaymentsResult> {
    const now = input.now ?? new Date().toISOString();
    const limit = clampReleaseLimit(input.limit);
    const rows = await this.db
      .select({ paymentId: checkout_payments.id })
      .from(checkout_payments)
      .innerJoin(
        checkout_reservations,
        eq(checkout_reservations.id, checkout_payments.reservation_id)
      )
      .leftJoin(
        orders,
        or(
          eq(orders.payment_id, checkout_payments.id),
          eq(orders.reservation_id, checkout_payments.reservation_id),
          eq(orders.checkout_attempt_id, checkout_payments.checkout_attempt_id)
        )
      )
      .where(
        and(
          eq(checkout_payments.status, "PAYMENT_PENDING"),
          eq(checkout_payments.provider, "PAYMONGO"),
          eq(checkout_reservations.status, "ACTIVE"),
          lte(checkout_reservations.expires_at, now),
          isNull(orders.id)
        )
      )
      .orderBy(asc(checkout_reservations.expires_at), asc(checkout_payments.id))
      .limit(limit);
    let failedCount = 0;
    let releasedCount = 0;
    const results: InventoryReleaseResult[] = [];
    let skippedCount = 0;

    for (const row of rows) {
      const result = await this.releaseInventoryForPayment({
        allowPendingTimeout: true,
        now,
        paymentId: row.paymentId,
        releaseReason: "PENDING_TIMEOUT",
        requestId: input.requestId,
      });
      results.push(result);

      if (
        result.decision === "released" ||
        result.decision === "already-released"
      ) {
        releasedCount += 1;
      } else if (result.decision === "failed") {
        failedCount += 1;
      } else {
        skippedCount += 1;
      }
    }

    return {
      failedCount,
      processedCount: rows.length,
      releasedCount,
      results,
      skippedCount,
    };
  }

  private async findPaymentReleaseSource(
    paymentId: string
  ): Promise<PaymentReleaseSource | null> {
    const rows = await this.db
      .select({
        attemptId: checkout_payments.checkout_attempt_id,
        attemptReservationId: checkout_attempts.reservation_id,
        orderId: orders.id,
        paymentCreatedAt: checkout_payments.created_at,
        paymentId: checkout_payments.id,
        paymentProvider: checkout_payments.provider,
        paymentReservationId: checkout_payments.reservation_id,
        paymentStatus: checkout_payments.status,
        reservationAttemptId: checkout_reservations.checkout_attempt_id,
        reservationExpiresAt: checkout_reservations.expires_at,
        reservationId: checkout_reservations.id,
        reservationStatus: checkout_reservations.status,
      })
      .from(checkout_payments)
      .leftJoin(
        checkout_attempts,
        eq(checkout_attempts.id, checkout_payments.checkout_attempt_id)
      )
      .leftJoin(
        checkout_reservations,
        eq(checkout_reservations.id, checkout_payments.reservation_id)
      )
      .leftJoin(
        orders,
        or(
          eq(orders.payment_id, checkout_payments.id),
          eq(orders.reservation_id, checkout_payments.reservation_id),
          eq(orders.checkout_attempt_id, checkout_payments.checkout_attempt_id)
        )
      )
      .where(eq(checkout_payments.id, paymentId))
      .limit(1);

    return rows[0] ?? null;
  }

  private async newerPendingPaymentExists(input: {
    attemptId: string;
    createdAt: string;
    paymentId: string;
    reservationId: string;
  }): Promise<boolean> {
    const rows = await this.db
      .select({ id: checkout_payments.id })
      .from(checkout_payments)
      .where(
        and(
          eq(checkout_payments.provider, "PAYMONGO"),
          eq(checkout_payments.checkout_attempt_id, input.attemptId),
          eq(checkout_payments.reservation_id, input.reservationId),
          eq(checkout_payments.status, "PAYMENT_PENDING"),
          sql`${checkout_payments.id} <> ${input.paymentId}`,
          sql`${checkout_payments.created_at} > ${input.createdAt}`
        )
      )
      .limit(1);

    return rows.length > 0;
  }

  private async findReservationItems(
    reservationId: string
  ): Promise<ReservationItemRow[]> {
    const rows = await this.db
      .select({
        id: checkout_reservation_items.id,
        productId: checkout_reservation_items.product_id,
        quantity: checkout_reservation_items.quantity,
        reservationMode: checkout_reservation_items.reservation_mode,
        variantId: checkout_reservation_items.variant_id,
      })
      .from(checkout_reservation_items)
      .where(eq(checkout_reservation_items.reservation_id, reservationId))
      .orderBy(
        asc(checkout_reservation_items.created_at),
        asc(checkout_reservation_items.id)
      );

    return rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
    }));
  }

  private async ensureReleaseRow(input: {
    attemptId: string;
    item: ReservationItemRow;
    now: string;
    paymentId: string;
    releaseReason: InventoryReleaseReason;
    requestId: string;
    reservationId: string;
  }): Promise<ReleaseRow> {
    await this.db
      .insert(checkout_reservation_releases)
      .values({
        id: createId(),
        reservation_id: input.reservationId,
        reservation_item_id: input.item.id,
        checkout_attempt_id: input.attemptId,
        payment_id: input.paymentId,
        product_id: input.item.productId,
        variant_id: input.item.variantId,
        quantity: input.item.quantity,
        reservation_mode: input.item.reservationMode,
        release_reason: input.releaseReason,
        status: "REQUESTED",
        error_code: null,
        requested_at: input.now,
        applied_at: null,
        failed_at: null,
        created_request_id: input.requestId,
        updated_request_id: input.requestId,
        created_at: input.now,
        updated_at: input.now,
      })
      .onConflictDoNothing({
        target: checkout_reservation_releases.reservation_item_id,
      });

    const release = await this.findReleaseByReservationItemId(input.item.id);

    if (!release) {
      throw new Error("D1_INVENTORY_RELEASE_CLAIM_FAILED");
    }

    return release;
  }

  private async findReleaseByReservationItemId(
    reservationItemId: string
  ): Promise<ReleaseRow | null> {
    const rows = await this.db
      .select()
      .from(checkout_reservation_releases)
      .where(
        eq(checkout_reservation_releases.reservation_item_id, reservationItemId)
      )
      .limit(1);

    return rows[0] ?? null;
  }

  private async findReleaseById(releaseId: string): Promise<ReleaseRow | null> {
    const rows = await this.db
      .select()
      .from(checkout_reservation_releases)
      .where(eq(checkout_reservation_releases.id, releaseId))
      .limit(1);

    return rows[0] ?? null;
  }

  private async markPendingPaymentExpired(input: {
    now: string;
    paymentId: string;
    requestId: string;
  }): Promise<string> {
    const rows = await this.db
      .update(checkout_payments)
      .set({
        status: "PAYMENT_EXPIRED",
        updated_request_id: input.requestId,
        updated_at: input.now,
      })
      .where(
        and(
          eq(checkout_payments.id, input.paymentId),
          eq(checkout_payments.status, "PAYMENT_PENDING")
        )
      )
      .returning({ status: checkout_payments.status });

    if (rows[0]) {
      return rows[0].status;
    }

    const latestRows = await this.db
      .select({ status: checkout_payments.status })
      .from(checkout_payments)
      .where(eq(checkout_payments.id, input.paymentId))
      .limit(1);

    return latestRows[0]?.status ?? "UNKNOWN";
  }

  private async applyStockRelease(input: {
    item: ReservationItemRow;
    now: string;
    releaseId: string;
    releaseReason: InventoryReleaseReason;
    requestId: string;
  }): Promise<"applied" | "already-applied" | "failed"> {
    if (!input.item.productId || !input.item.variantId) {
      return "failed";
    }

    const nextStock = sql`${product_variants.stock} + ${input.item.quantity}`;
    const openReleaseExists = sql`EXISTS (
      SELECT 1 FROM ${checkout_reservation_releases}
      WHERE ${checkout_reservation_releases.id} = ${input.releaseId}
        AND ${checkout_reservation_releases.status} IN ('REQUESTED', 'FAILED')
    )`;
    const variantExists = sql`EXISTS (
      SELECT 1 FROM ${product_variants}
      WHERE ${product_variants.id} = ${input.item.variantId}
        AND ${product_variants.product_id} = ${input.item.productId}
        AND ${product_variants.is_preorder} = 0
    )`;
    const stockUpdate = this.db
      .update(product_variants)
      .set({
        stock: nextStock,
        stock_version: sql`${product_variants.stock_version} + 1`,
        inventory_state: sql`CASE
          WHEN ${nextStock} <= 0 THEN 'OUT_OF_STOCK'
          WHEN ${nextStock} <= 10 THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END`,
      })
      .where(
        and(
          eq(product_variants.id, input.item.variantId),
          eq(product_variants.product_id, input.item.productId),
          eq(product_variants.is_preorder, false),
          openReleaseExists
        )
      )
      .returning({ id: product_variants.id });
    const releaseUpdate = this.db
      .update(checkout_reservation_releases)
      .set({
        status: "APPLIED",
        release_reason: input.releaseReason,
        error_code: null,
        applied_at: input.now,
        failed_at: null,
        updated_request_id: input.requestId,
        updated_at: input.now,
      })
      .where(
        and(
          eq(checkout_reservation_releases.id, input.releaseId),
          inArray(checkout_reservation_releases.status, RELEASE_OPEN_STATUSES),
          variantExists
        )
      )
      .returning({ id: checkout_reservation_releases.id });
    const [stockRows, releaseRows] = await this.db.batch([
      stockUpdate,
      releaseUpdate,
    ]);

    if (stockRows.length === 1 && releaseRows.length === 1) {
      return "applied";
    }

    const latest = await this.findReleaseById(input.releaseId);

    if (latest?.status === "APPLIED") {
      return "already-applied";
    }

    return "failed";
  }

  private async markReleaseApplied(input: {
    now: string;
    releaseId: string;
    releaseReason: InventoryReleaseReason;
    requestId: string;
  }): Promise<boolean> {
    const rows = await this.db
      .update(checkout_reservation_releases)
      .set({
        status: "APPLIED",
        release_reason: input.releaseReason,
        error_code: null,
        applied_at: input.now,
        failed_at: null,
        updated_request_id: input.requestId,
        updated_at: input.now,
      })
      .where(
        and(
          eq(checkout_reservation_releases.id, input.releaseId),
          inArray(checkout_reservation_releases.status, RELEASE_OPEN_STATUSES)
        )
      )
      .returning({ id: checkout_reservation_releases.id });

    return rows.length === 1;
  }

  private async markReleaseFailed(input: {
    now: string;
    releaseId: string;
    releaseReason: InventoryReleaseReason;
    requestId: string;
  }): Promise<void> {
    await this.db
      .update(checkout_reservation_releases)
      .set({
        status: "FAILED",
        release_reason: input.releaseReason,
        error_code: "INVENTORY_RELEASE_FAILED",
        failed_at: input.now,
        updated_request_id: input.requestId,
        updated_at: input.now,
      })
      .where(
        and(
          eq(checkout_reservation_releases.id, input.releaseId),
          inArray(checkout_reservation_releases.status, RELEASE_OPEN_STATUSES)
        )
      );
  }

  private async finalizeReservationRelease(input: {
    attemptId: string;
    now: string;
    releaseReason: InventoryReleaseReason;
    requestId: string;
    reservationId: string;
  }): Promise<void> {
    const reservationUpdate = this.db
      .update(checkout_reservations)
      .set({
        status: "RELEASED",
        updated_at: input.now,
      })
      .where(
        and(
          eq(checkout_reservations.id, input.reservationId),
          eq(checkout_reservations.status, "ACTIVE")
        )
      )
      .returning({ id: checkout_reservations.id });
    const attemptUpdate = this.db
      .update(checkout_attempts)
      .set({
        status: attemptStatusForReleaseReason(input.releaseReason),
        reservation_id: null,
        reservation_expires_at: null,
        updated_request_id: input.requestId,
        updated_at: input.now,
      })
      .where(eq(checkout_attempts.id, input.attemptId))
      .returning({ id: checkout_attempts.id });

    await this.db.batch([reservationUpdate, attemptUpdate]);
  }
}
