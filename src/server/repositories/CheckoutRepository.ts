import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import { createId } from "@paralleldrive/cuid2";
import type {
  CheckoutCartRequestItem,
  CheckoutCartServerLine,
} from "@/domain/checkout/cart-validation";
import type { CheckoutContactSnapshot } from "@/domain/checkout/contact-delivery";
import type { CheckoutReservationPlanLine } from "@/domain/checkout/inventory-reservation";
import {
  availabilityLabelFromState,
  isInventoryState,
} from "@/domain/products/schemas";
import type {
  InventoryState,
  ProductStatus,
  ProductVariantOption,
  ProductVariantStatus,
} from "@/domain/products/types";
import { product_variants, products } from "@/domain/schema/catalog";
import {
  checkout_attempts,
  checkout_payment_items,
  checkout_payments,
  checkout_reservation_items,
  checkout_reservations,
} from "@/domain/schema/transactions";
import { and, asc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";

const ARCHIVED_STOCK_LOCK_VERSION = -1;

function errorSearchText(error: unknown): string {
  if (!(error instanceof Error)) {
    return "";
  }

  const causeText = "cause" in error ? ` ${errorSearchText(error.cause)}` : "";

  return `${error.message}${causeText}`;
}

function isD1ExplicitTransactionUnsupported(error: unknown): boolean {
  return /Failed query:\s*begin|SQL BEGIN|SAVEPOINT|state\.storage\.transaction/i.test(
    errorSearchText(error)
  );
}

type CheckoutLineRow = {
  inventoryState: string;
  priceCentavos: number;
  productId: string;
  productName: string;
  productSlug: string;
  productStatus: string;
  stockLockVersion: number;
  stockQuantity: number;
  variantId: string;
  variantLabel: string;
  variantOptions: ProductVariantOption[];
  variantProductId: string;
  variantPreorder: boolean;
};

export type CheckoutRepository = {
  createCheckoutAttempt(
    input: CreateCheckoutAttemptInput
  ): Promise<CheckoutAttemptRecord>;
  createCheckoutReservation(
    input: CreateCheckoutReservationInput
  ): Promise<CheckoutReservationRecord>;
  failReservationAndAttempt(input: FailReservationInput): Promise<void>;
  findActiveReservationForAttempt(
    attemptId: string
  ): Promise<CheckoutReservationRecord | null>;
  findCheckoutAttempt(attemptId: string): Promise<CheckoutAttemptRecord | null>;
  findPendingCheckoutPaymentForAttempt(
    attemptId: string
  ): Promise<CheckoutPaymentRecord | null>;
  findCartLines(
    items: CheckoutCartRequestItem[]
  ): Promise<CheckoutCartServerLine[]>;
  createCheckoutPayment(
    input: CreateCheckoutPaymentInput
  ): Promise<CheckoutPaymentRecord>;
  releaseCheckoutReservationForPaymentFailure(
    input: ReleaseCheckoutReservationForPaymentFailureInput
  ): Promise<void>;
  releaseExpiredCheckoutReservations(
    input: ReleaseExpiredCheckoutReservationsInput
  ): Promise<number>;
  releaseStockLine(line: CheckoutReservationPlanLine): Promise<void>;
  reserveStockAndCreateCheckoutReservation(
    input: CreateCheckoutReservationInput
  ): Promise<CheckoutReservationRecord | null>;
  reserveStockLine(line: CheckoutReservationPlanLine): Promise<boolean>;
};

export type CreateCheckoutAttemptInput = {
  attemptTokenHash: string;
  customerId: string | null;
  details: CheckoutContactSnapshot;
  now?: string;
  requestId: string;
};

export type CheckoutAttemptStatus =
  | "DETAILS_CAPTURED"
  | "INVENTORY_RESERVED"
  | "PAYMENT_CREATED"
  | "PAYMENT_CREATION_FAILED"
  | "RESERVATION_FAILED"
  | "UNKNOWN";

export type CheckoutAttemptRecord = {
  attemptTokenHash: string;
  cartFingerprint: string | null;
  id: string;
  customerId: string | null;
  checkoutEmail: string;
  createdAt: string;
  fullName: string;
  reservationExpiresAt: string | null;
  reservationId: string | null;
  status: CheckoutAttemptStatus;
  updatedAt: string;
};

export type CheckoutReservationRecord = {
  cartFingerprint: string;
  checkoutAttemptId: string;
  expiresAt: string;
  id: string;
  items?: CheckoutReservationItemRecord[];
  status: "ACTIVE" | "RELEASED" | "EXPIRED" | "FAILED";
  subtotalCentavos: number;
};

export type CheckoutReservationItemRecord = {
  name?: string;
  priceCentavos?: number;
  productId: string | null;
  quantity: number;
  reservationMode: "STOCK" | "PREORDER";
  variantId: string | null;
};

export type CheckoutPaymentStatus =
  | "PAYMENT_PENDING"
  | "PAYMENT_PAID"
  | "PAYMENT_FAILED"
  | "PAYMENT_EXPIRED"
  | "PAYMENT_CANCELLED"
  | "UNKNOWN";

export type CheckoutPaymentRecord = {
  amountCentavos: number;
  checkoutAttemptId: string;
  checkoutUrl: string;
  createdAt: string;
  currency: string;
  livemode: boolean;
  paymentId: string;
  provider: string;
  providerCheckoutSessionId: string;
  providerReferenceNumber: string;
  reservationId: string;
  status: CheckoutPaymentStatus;
  updatedAt: string;
};

export type CheckoutPaymentItemInput = {
  amountCentavos: number;
  currency: string;
  name: string;
  productId: string | null;
  quantity: number;
  variantId: string | null;
};

export type CreateCheckoutReservationInput = {
  attemptId: string;
  cartFingerprint: string;
  expiresAt: string;
  lines: CheckoutReservationPlanLine[];
  now?: string;
  requestId: string;
  subtotalCentavos: number;
};

export type FailReservationInput = {
  attemptId: string;
  now?: string;
  requestId: string;
  reservationId?: string;
};

export type CreateCheckoutPaymentInput = {
  amountCentavos: number;
  attemptId: string;
  checkoutUrl: string;
  currency: string;
  items: CheckoutPaymentItemInput[];
  livemode: boolean;
  now?: string;
  providerCheckoutSessionId: string;
  providerReferenceNumber: string;
  requestId: string;
  reservationId: string;
};

export type ReleaseCheckoutReservationForPaymentFailureInput = {
  attemptId: string;
  now?: string;
  requestId: string;
  reservationId: string;
};

export type ReleaseExpiredCheckoutReservationsInput = {
  limit?: number;
  now?: string;
  requestId: string;
};

class InventoryReservationUnavailableError extends Error {
  constructor() {
    super("INVENTORY_RESERVATION_UNAVAILABLE");
  }
}

function uniqueCleanValues(values: string[]): string[] {
  return Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0)
    )
  );
}

function rowInventoryState(row: CheckoutLineRow): InventoryState {
  if (isInventoryState(row.inventoryState)) {
    return row.inventoryState;
  }

  if (row.variantPreorder) {
    return "PREORDER";
  }

  return row.stockQuantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK";
}

function rowVariantStatus(row: CheckoutLineRow): ProductVariantStatus {
  return row.stockLockVersion === ARCHIVED_STOCK_LOCK_VERSION
    ? "ARCHIVED"
    : "ACTIVE";
}

function rowToServerLine(row: CheckoutLineRow): CheckoutCartServerLine {
  const inventoryState = rowInventoryState(row);
  const variantStatus = rowVariantStatus(row);

  return {
    availabilityLabel:
      variantStatus === "ARCHIVED"
        ? "Unavailable"
        : availabilityLabelFromState(inventoryState),
    inventoryState,
    priceCentavos: Number(Math.round(row.priceCentavos)),
    productId: row.productId,
    productName: row.productName,
    productSlug: row.productSlug,
    productStatus: row.productStatus as ProductStatus,
    stockQuantity: Number(row.stockQuantity),
    variantId: row.variantId,
    variantLabel: row.variantLabel,
    variantOptions: Array.isArray(row.variantOptions)
      ? row.variantOptions.map((option) => ({
          group: option.group,
          name: option.name,
        }))
      : [],
    variantProductId: row.variantProductId,
    variantStatus,
  };
}

type CheckoutAttemptRow = typeof checkout_attempts.$inferSelect;
type CheckoutPaymentRow = typeof checkout_payments.$inferSelect;
type CheckoutReservationRow = typeof checkout_reservations.$inferSelect;

function attemptStatus(value: string): CheckoutAttemptStatus {
  switch (value) {
    case "DETAILS_CAPTURED":
    case "INVENTORY_RESERVED":
    case "PAYMENT_CREATED":
    case "PAYMENT_CREATION_FAILED":
    case "RESERVATION_FAILED":
      return value;
    default:
      return "UNKNOWN";
  }
}

function paymentStatus(value: string): CheckoutPaymentStatus {
  switch (value) {
    case "PAYMENT_PENDING":
    case "PAYMENT_PAID":
    case "PAYMENT_FAILED":
    case "PAYMENT_EXPIRED":
    case "PAYMENT_CANCELLED":
      return value;
    default:
      return "UNKNOWN";
  }
}

function rowToCheckoutAttempt(row: CheckoutAttemptRow): CheckoutAttemptRecord {
  return {
    attemptTokenHash: row.attempt_token_hash,
    cartFingerprint: row.cart_fingerprint,
    id: row.id,
    customerId: row.customer_id,
    checkoutEmail: row.checkout_email,
    createdAt: row.created_at,
    fullName: row.full_name,
    reservationExpiresAt: row.reservation_expires_at,
    reservationId: row.reservation_id,
    status: attemptStatus(row.status),
    updatedAt: row.updated_at,
  };
}

function rowToReservation(
  row: CheckoutReservationRow,
  items: CheckoutReservationItemRecord[] = []
): CheckoutReservationRecord {
  return {
    cartFingerprint: row.cart_fingerprint,
    checkoutAttemptId: row.checkout_attempt_id,
    expiresAt: row.expires_at,
    id: row.id,
    items,
    status:
      row.status === "RELEASED" ||
      row.status === "EXPIRED" ||
      row.status === "FAILED"
        ? row.status
        : "ACTIVE",
    subtotalCentavos: Number(row.subtotal_centavos),
  };
}

function checkoutItemName(
  productName: string | null,
  variantName: string | null
): string | undefined {
  if (productName && variantName) {
    return `${productName} - ${variantName}`;
  }

  return productName ?? variantName ?? undefined;
}

function rowToCheckoutPayment(row: CheckoutPaymentRow): CheckoutPaymentRecord {
  return {
    amountCentavos: Number(row.amount_centavos),
    checkoutAttemptId: row.checkout_attempt_id,
    checkoutUrl: row.checkout_url,
    createdAt: row.created_at,
    currency: row.currency,
    livemode: Boolean(row.livemode),
    paymentId: row.id,
    provider: row.provider,
    providerCheckoutSessionId: row.provider_checkout_session_id,
    providerReferenceNumber: row.provider_reference_number,
    reservationId: row.reservation_id,
    status: paymentStatus(row.status),
    updatedAt: row.updated_at,
  };
}

export class DrizzleCheckoutRepository implements CheckoutRepository {
  constructor(private readonly db: AppDb) {}

  async createCheckoutAttempt(
    input: CreateCheckoutAttemptInput
  ): Promise<CheckoutAttemptRecord> {
    const acknowledgedAt = input.now ?? new Date().toISOString();
    const rows = await this.db
      .insert(checkout_attempts)
      .values({
        customer_id: input.customerId,
        checkout_email: input.details.email,
        full_name: input.details.fullName,
        first_name: input.details.firstName,
        last_name: input.details.lastName,
        phone: input.details.phone,
        street_address: input.details.streetAddress,
        barangay: input.details.barangay,
        city_province: input.details.cityProvince,
        postal_code: input.details.postalCode,
        privacy_acknowledged_at: acknowledgedAt,
        attempt_token_hash: input.attemptTokenHash,
        status: "DETAILS_CAPTURED",
        created_request_id: input.requestId,
        created_at: acknowledgedAt,
        updated_at: acknowledgedAt,
      })
      .returning();

    if (!rows[0]) {
      throw new Error("CHECKOUT_ATTEMPT_NOT_CREATED");
    }

    return rowToCheckoutAttempt(rows[0]);
  }

  async findCheckoutAttempt(
    attemptId: string
  ): Promise<CheckoutAttemptRecord | null> {
    const rows = await this.db
      .select()
      .from(checkout_attempts)
      .where(eq(checkout_attempts.id, attemptId))
      .limit(1);

    return rows[0] ? rowToCheckoutAttempt(rows[0]) : null;
  }

  async findPendingCheckoutPaymentForAttempt(
    attemptId: string
  ): Promise<CheckoutPaymentRecord | null> {
    const rows = await this.db
      .select()
      .from(checkout_payments)
      .where(
        and(
          eq(checkout_payments.checkout_attempt_id, attemptId),
          eq(checkout_payments.status, "PAYMENT_PENDING")
        )
      )
      .limit(1);

    return rows[0] ? rowToCheckoutPayment(rows[0]) : null;
  }

  async findActiveReservationForAttempt(
    attemptId: string
  ): Promise<CheckoutReservationRecord | null> {
    const rows = await this.db
      .select()
      .from(checkout_reservations)
      .where(
        and(
          eq(checkout_reservations.checkout_attempt_id, attemptId),
          eq(checkout_reservations.status, "ACTIVE")
        )
      )
      .limit(1);

    if (!rows[0]) {
      return null;
    }

    const itemRows = await this.db
      .select({
        priceCentavos: checkout_reservation_items.price_centavos,
        productId: checkout_reservation_items.product_id,
        productName: products.name,
        quantity: checkout_reservation_items.quantity,
        reservationMode: checkout_reservation_items.reservation_mode,
        variantId: checkout_reservation_items.variant_id,
        variantName: product_variants.name,
      })
      .from(checkout_reservation_items)
      .leftJoin(
        products,
        eq(products.id, checkout_reservation_items.product_id)
      )
      .leftJoin(
        product_variants,
        eq(product_variants.id, checkout_reservation_items.variant_id)
      )
      .where(eq(checkout_reservation_items.reservation_id, rows[0].id));

    return rowToReservation(
      rows[0],
      itemRows.map((item) => ({
        name: checkoutItemName(item.productName, item.variantName),
        priceCentavos: Number(item.priceCentavos),
        productId: item.productId,
        quantity: Number(item.quantity),
        reservationMode:
          item.reservationMode === "PREORDER" ? "PREORDER" : "STOCK",
        variantId: item.variantId,
      }))
    );
  }

  async createCheckoutPayment(
    input: CreateCheckoutPaymentInput
  ): Promise<CheckoutPaymentRecord> {
    const now = input.now ?? new Date().toISOString();
    const paymentId = createId();
    const eligibleAttempts = await this.db
      .select({ id: checkout_attempts.id })
      .from(checkout_attempts)
      .where(
        and(
          eq(checkout_attempts.id, input.attemptId),
          eq(checkout_attempts.reservation_id, input.reservationId),
          inArray(checkout_attempts.status, [
            "INVENTORY_RESERVED",
            "PAYMENT_CREATED",
          ])
        )
      )
      .limit(1);

    if (eligibleAttempts.length !== 1) {
      throw new Error("D1_CHECKOUT_ATTEMPT_NOT_PAYMENT_CREATABLE");
    }

    const paymentInsert = this.db
      .insert(checkout_payments)
      .values({
        id: paymentId,
        checkout_attempt_id: input.attemptId,
        reservation_id: input.reservationId,
        provider: "PAYMONGO",
        provider_checkout_session_id: input.providerCheckoutSessionId,
        provider_reference_number: input.providerReferenceNumber,
        status: "PAYMENT_PENDING",
        amount_centavos: input.amountCentavos,
        currency: input.currency,
        checkout_url: input.checkoutUrl,
        livemode: input.livemode,
        created_request_id: input.requestId,
        created_at: now,
        updated_at: now,
      })
      .returning();
    const attemptUpdate = this.db
      .update(checkout_attempts)
      .set({
        status: "PAYMENT_CREATED",
        updated_request_id: input.requestId,
        updated_at: now,
      })
      .where(
        and(
          eq(checkout_attempts.id, input.attemptId),
          eq(checkout_attempts.reservation_id, input.reservationId),
          inArray(checkout_attempts.status, [
            "INVENTORY_RESERVED",
            "PAYMENT_CREATED",
          ])
        )
      )
      .returning({ id: checkout_attempts.id });
    let paymentRows: CheckoutPaymentRow[];
    let attemptRows: Array<{ id: string }>;

    if (input.items.length > 0) {
      const paymentItemInsert = this.db.insert(checkout_payment_items).values(
        input.items.map((item) => ({
          id: createId(),
          payment_id: paymentId,
          product_id: item.productId,
          variant_id: item.variantId,
          name: item.name,
          amount_centavos: item.amountCentavos,
          currency: item.currency,
          quantity: item.quantity,
          created_at: now,
        }))
      );

      [paymentRows, , attemptRows] = await this.db.batch([
        paymentInsert,
        paymentItemInsert,
        attemptUpdate,
      ]);
    } else {
      [paymentRows, attemptRows] = await this.db.batch([
        paymentInsert,
        attemptUpdate,
      ]);
    }

    const payment = paymentRows[0];

    if (!payment || attemptRows.length !== 1) {
      throw new Error("D1_CHECKOUT_ATTEMPT_NOT_PAYMENT_CREATABLE");
    }

    return rowToCheckoutPayment(payment);
  }

  async releaseCheckoutReservationForPaymentFailure(
    input: ReleaseCheckoutReservationForPaymentFailureInput
  ): Promise<void> {
    const now = input.now ?? new Date().toISOString();
    const claimedAttempts = await this.db
      .update(checkout_attempts)
      .set({
        status: "PAYMENT_CREATION_FAILED",
        reservation_id: null,
        reservation_expires_at: null,
        updated_request_id: input.requestId,
        updated_at: now,
      })
      .where(
        and(
          eq(checkout_attempts.id, input.attemptId),
          eq(checkout_attempts.reservation_id, input.reservationId),
          eq(checkout_attempts.status, "INVENTORY_RESERVED"),
          sql`EXISTS (
            SELECT 1 FROM ${checkout_reservations}
            WHERE ${checkout_reservations.id} = ${input.reservationId}
              AND ${checkout_reservations.checkout_attempt_id} = ${input.attemptId}
              AND ${checkout_reservations.status} = 'ACTIVE'
          )`,
          sql`NOT EXISTS (
            SELECT 1 FROM ${checkout_payments}
            WHERE ${checkout_payments.checkout_attempt_id} = ${input.attemptId}
              AND ${checkout_payments.reservation_id} = ${input.reservationId}
              AND ${checkout_payments.status} = 'PAYMENT_PENDING'
          )`
        )
      )
      .returning({ id: checkout_attempts.id });

    if (claimedAttempts.length !== 1) {
      return;
    }

    const reservations = await this.db
      .select()
      .from(checkout_reservations)
      .where(
        and(
          eq(checkout_reservations.id, input.reservationId),
          eq(checkout_reservations.checkout_attempt_id, input.attemptId),
          eq(checkout_reservations.status, "ACTIVE")
        )
      )
      .limit(1);

    if (!reservations[0]) {
      return;
    }

    const itemRows = await this.db
      .select({
        priceCentavos: checkout_reservation_items.price_centavos,
        productId: checkout_reservation_items.product_id,
        quantity: checkout_reservation_items.quantity,
        reservationMode: checkout_reservation_items.reservation_mode,
        variantId: checkout_reservation_items.variant_id,
      })
      .from(checkout_reservation_items)
      .where(
        eq(checkout_reservation_items.reservation_id, input.reservationId)
      );

    for (const item of itemRows.reverse()) {
      if (
        item.reservationMode !== "STOCK" ||
        !item.productId ||
        !item.variantId
      ) {
        continue;
      }

      await this.releaseStockLine({
        mode: "STOCK",
        priceCentavos: Number(item.priceCentavos),
        productId: item.productId,
        quantity: Number(item.quantity),
        variantId: item.variantId,
      });
    }

    await this.db
      .update(checkout_reservations)
      .set({
        status: "RELEASED",
        updated_at: now,
      })
      .where(eq(checkout_reservations.id, input.reservationId));

    return;
  }

  async releaseExpiredCheckoutReservations(
    input: ReleaseExpiredCheckoutReservationsInput
  ): Promise<number> {
    const now = input.now ?? new Date().toISOString();
    const limit = Math.max(1, Math.min(Math.trunc(input.limit ?? 50), 200));
    const reservations = await this.db
      .select({
        attemptId: checkout_reservations.checkout_attempt_id,
        id: checkout_reservations.id,
      })
      .from(checkout_reservations)
      .innerJoin(
        checkout_attempts,
        eq(checkout_attempts.id, checkout_reservations.checkout_attempt_id)
      )
      .where(
        and(
          eq(checkout_reservations.status, "ACTIVE"),
          lte(checkout_reservations.expires_at, now),
          eq(checkout_attempts.reservation_id, checkout_reservations.id),
          inArray(checkout_attempts.status, [
            "DETAILS_CAPTURED",
            "INVENTORY_RESERVED",
            "RESERVATION_FAILED",
          ])
        )
      )
      .orderBy(asc(checkout_reservations.expires_at))
      .limit(limit);
    let releasedCount = 0;

    for (const reservation of reservations) {
      const claimedRows = await this.db
        .update(checkout_reservations)
        .set({
          status: "EXPIRED",
          updated_at: now,
        })
        .where(
          and(
            eq(checkout_reservations.id, reservation.id),
            eq(checkout_reservations.status, "ACTIVE"),
            lte(checkout_reservations.expires_at, now)
          )
        )
        .returning({
          attemptId: checkout_reservations.checkout_attempt_id,
          id: checkout_reservations.id,
        });
      const claimed = claimedRows[0];

      if (!claimed) {
        continue;
      }

      const itemRows = await this.db
        .select({
          priceCentavos: checkout_reservation_items.price_centavos,
          productId: checkout_reservation_items.product_id,
          quantity: checkout_reservation_items.quantity,
          reservationMode: checkout_reservation_items.reservation_mode,
          variantId: checkout_reservation_items.variant_id,
        })
        .from(checkout_reservation_items)
        .where(eq(checkout_reservation_items.reservation_id, claimed.id));

      for (const item of itemRows.reverse()) {
        if (
          item.reservationMode !== "STOCK" ||
          !item.productId ||
          !item.variantId
        ) {
          continue;
        }

        await this.releaseStockLine({
          mode: "STOCK",
          priceCentavos: Number(item.priceCentavos),
          productId: item.productId,
          quantity: Number(item.quantity),
          variantId: item.variantId,
        });
      }

      await this.db
        .update(checkout_attempts)
        .set({
          status: "RESERVATION_FAILED",
          reservation_id: null,
          reservation_expires_at: null,
          updated_request_id: input.requestId,
          updated_at: now,
        })
        .where(
          and(
            eq(checkout_attempts.id, claimed.attemptId),
            eq(checkout_attempts.reservation_id, claimed.id),
            inArray(checkout_attempts.status, [
              "DETAILS_CAPTURED",
              "INVENTORY_RESERVED",
              "RESERVATION_FAILED",
            ])
          )
        );

      releasedCount += 1;
    }

    return releasedCount;
  }

  async findCartLines(
    items: CheckoutCartRequestItem[]
  ): Promise<CheckoutCartServerLine[]> {
    const productIds = uniqueCleanValues(items.map((item) => item.productId));
    const variantIds = uniqueCleanValues(items.map((item) => item.variantId));

    if (productIds.length === 0 || variantIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select({
        inventoryState: product_variants.inventory_state,
        priceCentavos: product_variants.price,
        productId: products.id,
        productName: products.name,
        productSlug: products.slug,
        productStatus: products.status,
        stockLockVersion: product_variants.stock_lock_version,
        stockQuantity: product_variants.stock,
        variantId: product_variants.id,
        variantLabel: product_variants.name,
        variantOptions: product_variants.variation_chain,
        variantPreorder: product_variants.is_preorder,
        variantProductId: product_variants.product_id,
      })
      .from(product_variants)
      .innerJoin(products, eq(products.id, product_variants.product_id))
      .where(
        and(
          eq(products.status, "PUBLISHED"),
          gte(product_variants.stock_lock_version, 0),
          inArray(products.id, productIds),
          inArray(product_variants.id, variantIds)
        )
      );

    return rows.map(rowToServerLine);
  }

  async reserveStockLine(line: CheckoutReservationPlanLine): Promise<boolean> {
    if (line.mode === "PREORDER") {
      const rows = await this.db
        .select({ id: product_variants.id })
        .from(product_variants)
        .innerJoin(products, eq(products.id, product_variants.product_id))
        .where(
          and(
            eq(products.status, "PUBLISHED"),
            eq(product_variants.id, line.variantId),
            eq(product_variants.product_id, line.productId),
            eq(product_variants.is_preorder, true),
            eq(product_variants.inventory_state, "PREORDER"),
            eq(product_variants.price, line.priceCentavos),
            gte(product_variants.stock_lock_version, 0)
          )
        )
        .limit(1);

      return rows.length === 1;
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const expectedVersionRows = await this.db
        .select({
          stockQuantity: product_variants.stock,
          stockVersion: product_variants.stock_version,
        })
        .from(product_variants)
        .where(
          and(
            eq(product_variants.id, line.variantId),
            eq(product_variants.product_id, line.productId),
            eq(product_variants.is_preorder, false),
            inArray(product_variants.inventory_state, [
              "IN_STOCK",
              "LOW_STOCK",
            ]),
            eq(product_variants.price, line.priceCentavos),
            gte(product_variants.stock_lock_version, 0),
            sql`EXISTS (
              SELECT 1 FROM ${products}
              WHERE ${products.id} = ${product_variants.product_id}
                AND ${products.status} = 'PUBLISHED'
            )`
          )
        )
        .limit(1);
      const expectedStockVersion = expectedVersionRows[0]?.stockVersion;
      const stockQuantity = expectedVersionRows[0]?.stockQuantity;

      if (
        typeof expectedStockVersion !== "number" ||
        typeof stockQuantity !== "number" ||
        stockQuantity < line.quantity
      ) {
        return false;
      }

      const nextStock = sql`${product_variants.stock} - ${line.quantity}`;
      const rows = await this.db
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
            eq(product_variants.id, line.variantId),
            eq(product_variants.product_id, line.productId),
            eq(product_variants.is_preorder, false),
            inArray(product_variants.inventory_state, [
              "IN_STOCK",
              "LOW_STOCK",
            ]),
            eq(product_variants.price, line.priceCentavos),
            eq(product_variants.stock_version, expectedStockVersion),
            gte(product_variants.stock, line.quantity),
            gte(product_variants.stock_lock_version, 0),
            sql`EXISTS (
              SELECT 1 FROM ${products}
              WHERE ${products.id} = ${product_variants.product_id}
                AND ${products.status} = 'PUBLISHED'
            )`
          )
        )
        .returning({ id: product_variants.id });

      if (rows.length === 1) {
        return true;
      }
    }

    return false;
  }

  async releaseStockLine(line: CheckoutReservationPlanLine): Promise<void> {
    if (line.mode === "PREORDER") {
      return;
    }

    const nextStock = sql`${product_variants.stock} + ${line.quantity}`;
    const rows = await this.db
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
          eq(product_variants.id, line.variantId),
          eq(product_variants.product_id, line.productId),
          eq(product_variants.is_preorder, false)
        )
      )
      .returning({ id: product_variants.id });

    if (rows.length !== 1) {
      throw new Error("D1_ROLLBACK_FAILED");
    }
  }

  async createCheckoutReservation(
    input: CreateCheckoutReservationInput
  ): Promise<CheckoutReservationRecord> {
    const now = input.now ?? new Date().toISOString();
    let reservationId: string | undefined;

    try {
      const rows = await this.db
        .insert(checkout_reservations)
        .values({
          checkout_attempt_id: input.attemptId,
          status: "ACTIVE",
          cart_fingerprint: input.cartFingerprint,
          subtotal_centavos: input.subtotalCentavos,
          expires_at: input.expiresAt,
          created_request_id: input.requestId,
          created_at: now,
          updated_at: now,
        })
        .returning();
      const reservation = rows[0];

      if (!reservation) {
        throw new Error("CHECKOUT_RESERVATION_NOT_CREATED");
      }

      reservationId = reservation.id;

      if (input.lines.length > 0) {
        await this.db.insert(checkout_reservation_items).values(
          input.lines.map((line) => ({
            reservation_id: reservation.id,
            product_id: line.productId,
            variant_id: line.variantId,
            quantity: line.quantity,
            price_centavos: line.priceCentavos,
            reservation_mode: line.mode,
            created_at: now,
          }))
        );
      }

      const attemptRows = await this.db
        .update(checkout_attempts)
        .set({
          status: "INVENTORY_RESERVED",
          cart_fingerprint: input.cartFingerprint,
          reservation_id: reservation.id,
          reservation_expires_at: input.expiresAt,
          updated_request_id: input.requestId,
          updated_at: now,
        })
        .where(
          and(
            eq(checkout_attempts.id, input.attemptId),
            inArray(checkout_attempts.status, [
              "DETAILS_CAPTURED",
              "RESERVATION_FAILED",
            ]),
            isNull(checkout_attempts.reservation_id)
          )
        )
        .returning({ id: checkout_attempts.id });

      if (attemptRows.length !== 1) {
        throw new Error("D1_CHECKOUT_ATTEMPT_NOT_RESERVABLE");
      }

      return rowToReservation(
        reservation,
        input.lines.map((line) => ({
          name: undefined,
          priceCentavos: line.priceCentavos,
          productId: line.productId,
          quantity: line.quantity,
          reservationMode: line.mode,
          variantId: line.variantId,
        }))
      );
    } catch (error) {
      if (reservationId) {
        await this.failReservationAndAttempt({
          attemptId: input.attemptId,
          now,
          requestId: input.requestId,
          reservationId,
        });
      }

      throw error;
    }
  }

  async reserveStockAndCreateCheckoutReservation(
    input: CreateCheckoutReservationInput
  ): Promise<CheckoutReservationRecord | null> {
    if (process.env.CLOUDFLARE_ENV === "development") {
      return this.reserveStockAndCreateCheckoutReservationSequential(input);
    }

    try {
      return await this.db.transaction(async (tx) => {
        const transactionalRepository = new DrizzleCheckoutRepository(
          tx as unknown as AppDb
        );

        for (const line of input.lines) {
          const reserved = await transactionalRepository.reserveStockLine(line);

          if (!reserved) {
            throw new InventoryReservationUnavailableError();
          }
        }

        return transactionalRepository.createCheckoutReservation(input);
      });
    } catch (error) {
      if (error instanceof InventoryReservationUnavailableError) {
        return null;
      }

      if (isD1ExplicitTransactionUnsupported(error)) {
        return this.reserveStockAndCreateCheckoutReservationSequential(input);
      }

      throw error;
    }
  }

  private async reserveStockAndCreateCheckoutReservationSequential(
    input: CreateCheckoutReservationInput
  ): Promise<CheckoutReservationRecord | null> {
    const reservedLines: CheckoutReservationPlanLine[] = [];

    for (const line of input.lines) {
      const reserved = await this.reserveStockLine(line);

      if (!reserved) {
        for (const reservedLine of reservedLines.reverse()) {
          await this.releaseStockLine(reservedLine);
        }

        return null;
      }

      reservedLines.push(line);
    }

    try {
      return await this.createCheckoutReservation(input);
    } catch (error) {
      for (const reservedLine of reservedLines.reverse()) {
        await this.releaseStockLine(reservedLine);
      }

      throw error;
    }
  }

  async failReservationAndAttempt(input: FailReservationInput): Promise<void> {
    const now = input.now ?? new Date().toISOString();

    if (input.reservationId) {
      await this.db
        .update(checkout_reservations)
        .set({
          status: "FAILED",
          updated_at: now,
        })
        .where(eq(checkout_reservations.id, input.reservationId));
    }

    await this.db
      .update(checkout_attempts)
      .set({
        status: "RESERVATION_FAILED",
        updated_request_id: input.requestId,
        updated_at: now,
      })
      .where(
        and(
          eq(checkout_attempts.id, input.attemptId),
          inArray(checkout_attempts.status, [
            "DETAILS_CAPTURED",
            "RESERVATION_FAILED",
          ]),
          isNull(checkout_attempts.reservation_id)
        )
      );
  }
}

export function createCheckoutRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleCheckoutRepository(db),
  };
}
