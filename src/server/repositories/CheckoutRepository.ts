import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import type {
  CheckoutCartRequestItem,
  CheckoutCartServerLine,
} from "@/domain/checkout/cart-validation";
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
  findCartLines(
    items: CheckoutCartRequestItem[]
  ): Promise<CheckoutCartServerLine[]>;
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

export class DrizzleCheckoutRepository implements CheckoutRepository {
  constructor(private readonly db: AppDb) {}

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
