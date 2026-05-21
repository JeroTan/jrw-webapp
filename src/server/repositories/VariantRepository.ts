import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  availabilityLabelFromState,
  deriveInventoryStateFromQuantity,
  isInventoryState,
  isInventoryStateInStock,
} from "@/domain/products/schemas";
import type {
  InventoryAvailabilityRecord,
  InventoryState,
  ProductVariantOption,
  ProductVariantRecord,
  ProductVariantSummary,
  VariantListResult,
} from "@/domain/products/types";
import { product_variants } from "@/domain/schema/catalog";
import { and, desc, eq, ne, sql } from "drizzle-orm";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const ARCHIVED_STOCK_LOCK_VERSION = -1;

type VariantRowLike = {
  id: string;
  name: string;
  stock: number;
  inventory_state: string;
  price: number;
  sku: string;
  is_preorder: boolean;
  expected_release: string | null;
  stock_version: number;
  stock_lock_version: number;
  variation_chain: ProductVariantOption[];
  product_id: string;
};

export type CreateVariantRecordInput = {
  productId: string;
  name: string;
  sku: string;
  priceCentavos: number;
  stock: number;
  isPreorder: boolean;
  expectedRelease: string | null;
  variationChain: ProductVariantOption[];
};

export type UpdateVariantRecordInput = {
  name?: string;
  sku?: string;
  priceCentavos?: number;
  stock?: number;
  isPreorder?: boolean;
  expectedRelease?: string | null;
  variationChain?: ProductVariantOption[];
};

export type VariantRepository = {
  create(input: CreateVariantRecordInput): Promise<ProductVariantRecord>;
  findById(variantId: string): Promise<ProductVariantRecord | null>;
  findBySku(sku: string): Promise<ProductVariantRecord | null>;
  listByProductId(
    productId: string,
    options: { page: number; pageSize: number }
  ): Promise<VariantListResult>;
  update(
    variantId: string,
    input: UpdateVariantRecordInput
  ): Promise<ProductVariantRecord | null>;
  archive(variantId: string): Promise<ProductVariantRecord | null>;
  findDuplicateOptionCombination(input: {
    productId: string;
    variationChain: ProductVariantOption[];
    excludeVariantId?: string;
  }): Promise<ProductVariantRecord | null>;
  updateStockQuantity(input: {
    variantId: string;
    quantity: number;
    inventoryState: InventoryState;
  }): Promise<ProductVariantRecord | null>;
  updateInventoryState(input: {
    variantId: string;
    inventoryState: InventoryState;
  }): Promise<ProductVariantRecord | null>;
  getStockAvailability(input: {
    productId: string;
    variantId: string;
  }): Promise<InventoryAvailabilityRecord | null>;
  getProductSummary(productId: string): Promise<ProductVariantSummary>;
};

function normalizeOption(value: ProductVariantOption): ProductVariantOption {
  return {
    group: value.group.trim(),
    name: value.name.trim(),
  };
}

function normalizeOptionSignature(options: ProductVariantOption[]): string {
  return JSON.stringify(
    options
      .map((option) => ({
        group: option.group.trim().toLowerCase(),
        name: option.name.trim().toLowerCase(),
      }))
      .sort((left, right) =>
        `${left.group}:${left.name}`.localeCompare(`${right.group}:${right.name}`)
      )
  );
}

function normalizeVariationChain(
  options: ProductVariantOption[]
): ProductVariantOption[] {
  const deduped = new Map<string, ProductVariantOption>();
  options.forEach((option) => {
    const normalized = normalizeOption(option);
    const key = `${normalized.group.toLowerCase()}::${normalized.name.toLowerCase()}`;
    if (!deduped.has(key)) {
      deduped.set(key, normalized);
    }
  });

  return Array.from(deduped.values()).sort((left, right) =>
    `${left.group.toLowerCase()}:${left.name.toLowerCase()}`.localeCompare(
      `${right.group.toLowerCase()}:${right.name.toLowerCase()}`
    )
  );
}

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

function validPositiveInteger(value: number | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  );
}

function normalizePage(value: number | undefined): number {
  return validPositiveInteger(value) ? value : DEFAULT_PAGE;
}

function normalizePageSize(value: number | undefined): number {
  const pageSize = validPositiveInteger(value) ? value : DEFAULT_PAGE_SIZE;
  return Math.min(pageSize, MAX_PAGE_SIZE);
}

function toInventoryState(row: VariantRowLike): InventoryState {
  if (isInventoryState(row.inventory_state)) {
    return row.inventory_state;
  }

  return deriveInventoryStateFromQuantity({
    quantity: Number(row.stock),
    isPreorder: Boolean(row.is_preorder),
  });
}

function toVariantRecord(row: VariantRowLike): ProductVariantRecord {
  const archived = row.stock_lock_version === ARCHIVED_STOCK_LOCK_VERSION;
  const inventoryState = toInventoryState(row);
  const availability = availabilityLabelFromState(inventoryState);

  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    sku: row.sku,
    priceCentavos: Number(Math.round(row.price)),
    stock: Number(row.stock),
    isPreorder: Boolean(row.is_preorder),
    expectedRelease: row.expected_release,
    variationChain: Array.isArray(row.variation_chain)
      ? row.variation_chain.map((option) => ({
          group: option.group,
          name: option.name,
        }))
      : [],
    status: archived ? "ARCHIVED" : "ACTIVE",
    hasAvailableStock: !archived && isInventoryStateInStock(inventoryState),
    inventoryState,
    stockVersion: Number(row.stock_version ?? 0),
    availability,
  };
}

export class DrizzleVariantRepository implements VariantRepository {
  constructor(private readonly db: AppDb) {}

  async create(input: CreateVariantRecordInput): Promise<ProductVariantRecord> {
    const inventoryState = deriveInventoryStateFromQuantity({
      quantity: input.stock,
      isPreorder: input.isPreorder,
    });

    const [row] = await this.db
      .insert(product_variants)
      .values({
        product_id: input.productId,
        name: input.name,
        sku: input.sku,
        price: input.priceCentavos,
        stock: input.stock,
        inventory_state: inventoryState,
        is_preorder: input.isPreorder,
        expected_release: input.expectedRelease,
        stock_version: 0,
        variation_chain: normalizeVariationChain(input.variationChain),
      })
      .returning();

    return toVariantRecord(row);
  }

  async findById(variantId: string): Promise<ProductVariantRecord | null> {
    const [row] = await this.db
      .select()
      .from(product_variants)
      .where(eq(product_variants.id, variantId))
      .limit(1);

    return row ? toVariantRecord(row) : null;
  }

  async findBySku(sku: string): Promise<ProductVariantRecord | null> {
    const [row] = await this.db
      .select()
      .from(product_variants)
      .where(sql`lower(${product_variants.sku}) = ${normalizeLookup(sku)}`)
      .limit(1);

    return row ? toVariantRecord(row) : null;
  }

  async listByProductId(
    productId: string,
    options: { page: number; pageSize: number }
  ): Promise<VariantListResult> {
    const page = normalizePage(options.page);
    const pageSize = normalizePageSize(options.pageSize);
    const offset = (page - 1) * pageSize;

    const [total] = await this.db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(product_variants)
      .where(eq(product_variants.product_id, productId));

    const totalItems = Number(total?.count ?? 0);

    const rows = await this.db
      .select()
      .from(product_variants)
      .where(eq(product_variants.product_id, productId))
      .orderBy(
        sql`case when ${product_variants.stock_lock_version} = ${ARCHIVED_STOCK_LOCK_VERSION} then 1 else 0 end`,
        desc(product_variants.id)
      )
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows.map((row) => toVariantRecord(row)),
      page,
      pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize),
    };
  }

  async update(
    variantId: string,
    input: UpdateVariantRecordInput
  ): Promise<ProductVariantRecord | null> {
    const current = await this.findById(variantId);
    if (!current) {
      return null;
    }

    const nextStock = input.stock ?? current.stock;
    const nextIsPreorder = input.isPreorder ?? current.isPreorder;
    const nextInventoryState = deriveInventoryStateFromQuantity({
      quantity: nextStock,
      isPreorder: nextIsPreorder,
    });

    const patch = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.priceCentavos !== undefined ? { price: input.priceCentavos } : {}),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
      ...(input.isPreorder !== undefined ? { is_preorder: input.isPreorder } : {}),
      ...(input.expectedRelease !== undefined
        ? { expected_release: input.expectedRelease }
        : {}),
      ...(input.variationChain !== undefined
        ? { variation_chain: normalizeVariationChain(input.variationChain) }
        : {}),
      inventory_state: nextInventoryState,
      stock_version: sql`${product_variants.stock_version} + 1`,
    };

    const [row] = await this.db
      .update(product_variants)
      .set(patch)
      .where(eq(product_variants.id, variantId))
      .returning();

    return row ? toVariantRecord(row) : null;
  }

  async archive(variantId: string): Promise<ProductVariantRecord | null> {
    const [row] = await this.db
      .update(product_variants)
      .set({
        stock_lock_version: ARCHIVED_STOCK_LOCK_VERSION,
        stock: 0,
        inventory_state: "OUT_OF_STOCK",
        is_preorder: false,
        expected_release: null,
        stock_version: sql`${product_variants.stock_version} + 1`,
      })
      .where(eq(product_variants.id, variantId))
      .returning();

    return row ? toVariantRecord(row) : null;
  }

  async updateStockQuantity(input: {
    variantId: string;
    quantity: number;
    inventoryState: InventoryState;
  }): Promise<ProductVariantRecord | null> {
    const [row] = await this.db
      .update(product_variants)
      .set({
        stock: input.quantity,
        inventory_state: input.inventoryState,
        is_preorder: input.inventoryState === "PREORDER",
        stock_version: sql`${product_variants.stock_version} + 1`,
      })
      .where(
        and(
          eq(product_variants.id, input.variantId),
          ne(product_variants.stock_lock_version, ARCHIVED_STOCK_LOCK_VERSION)
        )
      )
      .returning();

    return row ? toVariantRecord(row) : null;
  }

  async updateInventoryState(input: {
    variantId: string;
    inventoryState: InventoryState;
  }): Promise<ProductVariantRecord | null> {
    const [row] = await this.db
      .update(product_variants)
      .set({
        inventory_state: input.inventoryState,
        is_preorder: input.inventoryState === "PREORDER",
        stock_version: sql`${product_variants.stock_version} + 1`,
      })
      .where(
        and(
          eq(product_variants.id, input.variantId),
          ne(product_variants.stock_lock_version, ARCHIVED_STOCK_LOCK_VERSION)
        )
      )
      .returning();

    return row ? toVariantRecord(row) : null;
  }

  async getStockAvailability(input: {
    productId: string;
    variantId: string;
  }): Promise<InventoryAvailabilityRecord | null> {
    const [row] = await this.db
      .select()
      .from(product_variants)
      .where(
        and(
          eq(product_variants.id, input.variantId),
          eq(product_variants.product_id, input.productId),
          ne(product_variants.stock_lock_version, ARCHIVED_STOCK_LOCK_VERSION)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    const record = toVariantRecord(row);
    return {
      productId: record.productId,
      variantId: record.id,
      label: record.availability,
      inStock: record.hasAvailableStock,
    };
  }

  async findDuplicateOptionCombination(input: {
    productId: string;
    variationChain: ProductVariantOption[];
    excludeVariantId?: string;
  }): Promise<ProductVariantRecord | null> {
    const rows = await this.db
      .select()
      .from(product_variants)
      .where(
        and(
          eq(product_variants.product_id, input.productId),
          ne(product_variants.stock_lock_version, ARCHIVED_STOCK_LOCK_VERSION),
          ...(input.excludeVariantId
            ? [ne(product_variants.id, input.excludeVariantId)]
            : [])
        )
      );

    const expected = normalizeOptionSignature(input.variationChain);
    const duplicate = rows.find(
      (row) => normalizeOptionSignature(row.variation_chain) === expected
    );

    return duplicate ? toVariantRecord(duplicate) : null;
  }

  async getProductSummary(productId: string): Promise<ProductVariantSummary> {
    const [row] = await this.db
      .select({
        variantCount:
          sql<number>`cast(count(case when ${product_variants.stock_lock_version} != ${ARCHIVED_STOCK_LOCK_VERSION} then 1 end) as integer)`,
        lowestPrice:
          sql<number | null>`cast(min(case when ${product_variants.stock_lock_version} != ${ARCHIVED_STOCK_LOCK_VERSION} then ${product_variants.price} end) as integer)`,
        priceRangeMin:
          sql<number | null>`cast(min(case when ${product_variants.stock_lock_version} != ${ARCHIVED_STOCK_LOCK_VERSION} then ${product_variants.price} end) as integer)`,
        priceRangeMax:
          sql<number | null>`cast(max(case when ${product_variants.stock_lock_version} != ${ARCHIVED_STOCK_LOCK_VERSION} then ${product_variants.price} end) as integer)`,
        hasAvailableVariants:
          sql<number>`cast(max(case when ${product_variants.stock_lock_version} != ${ARCHIVED_STOCK_LOCK_VERSION} and (${product_variants.stock} > 0 or ${product_variants.is_preorder} = 1) then 1 else 0 end) as integer)`,
      })
      .from(product_variants)
      .where(eq(product_variants.product_id, productId));

    return {
      variantCount: Number(row?.variantCount ?? 0),
      lowestPrice:
        row?.lowestPrice === null || row?.lowestPrice === undefined
          ? null
          : Number(row.lowestPrice),
      priceRangeMin:
        row?.priceRangeMin === null || row?.priceRangeMin === undefined
          ? null
          : Number(row.priceRangeMin),
      priceRangeMax:
        row?.priceRangeMax === null || row?.priceRangeMax === undefined
          ? null
          : Number(row.priceRangeMax),
      hasAvailableVariants: Number(row?.hasAvailableVariants ?? 0) > 0,
    };
  }
}

export function createVariantRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    variantRepository: new DrizzleVariantRepository(db),
  };
}
