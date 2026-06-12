import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
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
  checkout_reservation_items,
  checkout_reservations,
} from "@/domain/schema/transactions";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

const ARCHIVED_STOCK_LOCK_VERSION = -1;

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
  findCartLines(
    items: CheckoutCartRequestItem[]
  ): Promise<CheckoutCartServerLine[]>;
  releaseStockLine(line: CheckoutReservationPlanLine): Promise<void>;
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
  | "RESERVATION_FAILED";

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
  status: "ACTIVE" | "RELEASED" | "EXPIRED" | "FAILED";
  subtotalCentavos: number;
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
type CheckoutReservationRow = typeof checkout_reservations.$inferSelect;

function attemptStatus(value: string): CheckoutAttemptStatus {
  return value === "INVENTORY_RESERVED" || value === "RESERVATION_FAILED"
    ? value
    : "DETAILS_CAPTURED";
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

function rowToReservation(row: CheckoutReservationRow): CheckoutReservationRecord {
  return {
    cartFingerprint: row.cart_fingerprint,
    checkoutAttemptId: row.checkout_attempt_id,
    expiresAt: row.expires_at,
    id: row.id,
    status:
      row.status === "RELEASED" ||
      row.status === "EXPIRED" ||
      row.status === "FAILED"
        ? row.status
        : "ACTIVE",
    subtotalCentavos: Number(row.subtotal_centavos),
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

    return rows[0] ? rowToReservation(rows[0]) : null;
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
      return true;
    }

    const expectedVersionRows = await this.db
      .select({ stockVersion: product_variants.stock_version })
      .from(product_variants)
      .where(
        and(
          eq(product_variants.id, line.variantId),
          eq(product_variants.product_id, line.productId),
          eq(product_variants.is_preorder, false),
          gte(product_variants.stock_lock_version, 0)
        )
      )
      .limit(1);
    const expectedStockVersion = expectedVersionRows[0]?.stockVersion;

    if (typeof expectedStockVersion !== "number") {
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
          eq(product_variants.stock_version, expectedStockVersion),
          gte(product_variants.stock, line.quantity),
          gte(product_variants.stock_lock_version, 0)
        )
      )
      .returning({ id: product_variants.id });

    return rows.length === 1;
  }

  async releaseStockLine(line: CheckoutReservationPlanLine): Promise<void> {
    if (line.mode === "PREORDER") {
      return;
    }

    const nextStock = sql`${product_variants.stock} + ${line.quantity}`;
    await this.db
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
          gte(product_variants.stock_lock_version, 0)
        )
      );
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

      await this.db
        .update(checkout_attempts)
        .set({
          status: "INVENTORY_RESERVED",
          cart_fingerprint: input.cartFingerprint,
          reservation_id: reservation.id,
          reservation_expires_at: input.expiresAt,
          updated_request_id: input.requestId,
          updated_at: now,
        })
        .where(eq(checkout_attempts.id, input.attemptId));

      return rowToReservation(reservation);
    } catch (error) {
      await this.failReservationAndAttempt({
        attemptId: input.attemptId,
        now,
        requestId: input.requestId,
        reservationId,
      });
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
      .where(eq(checkout_attempts.id, input.attemptId));
  }
}

export function createCheckoutRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleCheckoutRepository(db),
  };
}
