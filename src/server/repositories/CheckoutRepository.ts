import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import type {
  CheckoutCartRequestItem,
  CheckoutCartServerLine,
} from "@/domain/checkout/cart-validation";
import type { CheckoutContactSnapshot } from "@/domain/checkout/contact-delivery";
import {
  availabilityLabelFromState,
  deriveInventoryStateFromQuantity,
  isInventoryState,
} from "@/domain/products/schemas";
import type {
  InventoryState,
  ProductStatus,
  ProductVariantOption,
  ProductVariantStatus,
} from "@/domain/products/types";
import { product_variants, products } from "@/domain/schema/catalog";
import { checkout_attempts } from "@/domain/schema/transactions";
import { and, eq, gte, inArray } from "drizzle-orm";

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
  findCartLines(
    items: CheckoutCartRequestItem[]
  ): Promise<CheckoutCartServerLine[]>;
};

export type CreateCheckoutAttemptInput = {
  customerId: string | null;
  details: CheckoutContactSnapshot;
  now?: string;
  requestId: string;
};

export type CheckoutAttemptRecord = {
  id: string;
  customerId: string | null;
  checkoutEmail: string;
  createdAt: string;
  fullName: string;
  status: "DETAILS_CAPTURED";
  updatedAt: string;
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

  return deriveInventoryStateFromQuantity({
    quantity: Number(row.stockQuantity),
    isPreorder: Boolean(row.variantPreorder),
  });
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

function rowToCheckoutAttempt(row: CheckoutAttemptRow): CheckoutAttemptRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    checkoutEmail: row.checkout_email,
    createdAt: row.created_at,
    fullName: row.full_name,
    status: "DETAILS_CAPTURED",
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
}

export function createCheckoutRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleCheckoutRepository(db),
  };
}
