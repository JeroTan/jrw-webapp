import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import { createId } from "@paralleldrive/cuid2";
import {
  brandMembershipRoleValues,
  brandMembershipStatusValues,
  brandStatusValues,
  brand_memberships,
  brands,
  categories,
  categoryStatusValues,
  product_photos,
  productStatusValues,
  product_categories,
  product_variants,
  products,
} from "@/domain/schema/catalog";
import type {
  ProductListResult,
  ProductOrganizationRecord,
  ProductPublishReadinessSnapshot,
  ProductRecord,
  ProductStatus,
} from "@/domain/products/types";
import { toApiDateTime } from "@/lib/api/date-time";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type ProductStatusValue = (typeof productStatusValues)[number];
type BrandStatusValue = (typeof brandStatusValues)[number];
type BrandMembershipRoleValue = (typeof brandMembershipRoleValues)[number];
type BrandMembershipStatusValue = (typeof brandMembershipStatusValues)[number];
type CategoryStatusValue = (typeof categoryStatusValues)[number];

type ProductRowLike = {
  [key: string]: unknown;
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  description: string;
  status: ProductStatusValue;
  brand: string | null;
  brand_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductBrandRecord = {
  id: string;
  name: string;
  status: BrandStatusValue;
};

export type ProductBrandMembershipRecord = {
  adminId: string;
  role: BrandMembershipRoleValue;
  status: BrandMembershipStatusValue;
};

export type ProductCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  status: CategoryStatusValue;
};

export type CreateProductRecordInput = {
  name: string;
  slug: string;
  summary: string | null;
  description: string;
  status: ProductStatusValue;
  createdAt: string;
  updatedAt: string;
};

export type UpdateProductRecordInput = {
  name?: string;
  slug?: string;
  summary?: string | null;
  description?: string;
  updatedAt: string;
};

export type ListProductOptions = {
  page?: number;
  pageSize?: number;
  status?: ProductStatus;
  brandId?: string;
  brandless?: boolean;
  categoryId?: string;
  search?: string;
  includeArchived?: boolean;
  viewerAdminId?: string;
  restrictToViewerMembership?: boolean;
};

export type ProductRepository = {
  create(input: CreateProductRecordInput): Promise<ProductRecord>;
  findById(productId: string): Promise<ProductRecord | null>;
  findBySlug(slug: string): Promise<ProductRecord | null>;
  getPublishReadiness(
    productId: string
  ): Promise<ProductPublishReadinessSnapshot | null>;
  list(options: ListProductOptions): Promise<ProductListResult>;
  update(
    productId: string,
    input: UpdateProductRecordInput
  ): Promise<ProductRecord>;
  publishProduct(
    productId: string,
    updatedAt: string
  ): Promise<ProductRecord | null>;
  draftProduct(
    productId: string,
    updatedAt: string
  ): Promise<ProductRecord | null>;
  archiveProduct(
    productId: string,
    updatedAt: string
  ): Promise<ProductRecord | null>;
  assignBrand(
    productId: string,
    brandId: string,
    updatedAt: string
  ): Promise<ProductRecord>;
  removeBrand(productId: string, updatedAt: string): Promise<ProductRecord>;
  assignCategories(
    productId: string,
    categoryIds: string[],
    updatedAt: string
  ): Promise<void>;
  removeCategory(
    productId: string,
    categoryId: string,
    updatedAt: string
  ): Promise<void>;
  findCategoriesByIds(categoryIds: string[]): Promise<ProductCategoryRecord[]>;
  findOrganization(productId: string): Promise<ProductOrganizationRecord | null>;
  findBrandById(brandId: string): Promise<ProductBrandRecord | null>;
  findBrandMembership(
    brandId: string,
    adminId: string
  ): Promise<ProductBrandMembershipRecord | null>;
};

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

function toProductRecord(input: {
  row: ProductRowLike;
  brandName?: string | null;
  linkedCategoryCount?: number | null;
  variantCount?: number | null;
  lowestPrice?: number | null;
  priceRangeMin?: number | null;
  priceRangeMax?: number | null;
  hasAvailableVariants?: boolean | number | null;
  imageCount?: number | null;
  primaryImageUrl?: string | null;
}): ProductRecord {
  const fallbackBrandName =
    typeof input.row.brand === "string" && input.row.brand.trim().length > 0
      ? input.row.brand.trim()
      : null;

  return {
    id: input.row.id,
    name: input.row.name,
    slug: input.row.slug,
    summary: input.row.summary,
    description: input.row.description,
    status: input.row.status,
    brandId: input.row.brand_id,
    brandName:
      typeof input.brandName === "string" && input.brandName.trim().length > 0
        ? input.brandName
        : fallbackBrandName,
    linkedCategoryCount: Number(input.linkedCategoryCount ?? 0),
    variantCount: Number(input.variantCount ?? 0),
    lowestPrice:
      input.lowestPrice === null || input.lowestPrice === undefined
        ? null
        : Number(input.lowestPrice),
    priceRangeMin:
      input.priceRangeMin === null || input.priceRangeMin === undefined
        ? null
        : Number(input.priceRangeMin),
    priceRangeMax:
      input.priceRangeMax === null || input.priceRangeMax === undefined
        ? null
        : Number(input.priceRangeMax),
    hasAvailableVariants: Number(input.hasAvailableVariants ?? 0) > 0,
    imageCount: Number(input.imageCount ?? 0),
    primaryImageUrl:
      typeof input.primaryImageUrl === "string" &&
      input.primaryImageUrl.trim().length > 0
        ? input.primaryImageUrl
        : null,
    createdAt: toApiDateTime(input.row.created_at),
    updatedAt: toApiDateTime(input.row.updated_at),
  };
}

function toCategoryRecord(input: {
  id: string;
  name: string;
  slug: string;
  status: CategoryStatusValue;
}): ProductCategoryRecord {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    status: input.status,
  };
}

function activeMembership(
  membership: ProductBrandMembershipRecord | null
): membership is ProductBrandMembershipRecord {
  if (!membership) {
    return false;
  }

  if (membership.status !== "ACTIVE") {
    return false;
  }

  return membership.role === "OWNER" || membership.role === "MEMBER";
}

export class DrizzleProductRepository implements ProductRepository {
  constructor(private readonly db: AppDb) {}

  async create(input: CreateProductRecordInput): Promise<ProductRecord> {
    const [product] = await this.db
      .insert(products)
      .values({
        id: createId(),
        name: input.name,
        slug: input.slug,
        summary: input.summary,
        description: input.description,
        status: input.status,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
      })
      .returning();

    return toProductRecord({
      row: product,
      linkedCategoryCount: 0,
      variantCount: 0,
      lowestPrice: null,
      priceRangeMin: null,
      priceRangeMax: null,
      hasAvailableVariants: false,
      imageCount: 0,
      primaryImageUrl: null,
    });
  }

  async findById(productId: string): Promise<ProductRecord | null> {
    const [row] = await this.db
      .select({
        product: products,
        brandName: brands.name,
        linkedCategoryCount:
          sql<number>`cast(count(${product_categories.category_id}) as integer)`,
        variantCount:
          sql<number>`cast((select count(*) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0) as integer)`,
        lowestPrice:
          sql<number | null>`cast((select min(${product_variants.price}) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0) as integer)`,
        priceRangeMin:
          sql<number | null>`cast((select min(${product_variants.price}) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0) as integer)`,
        priceRangeMax:
          sql<number | null>`cast((select max(${product_variants.price}) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0) as integer)`,
        hasAvailableVariants:
          sql<number>`cast((select case when exists(select 1 from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0 and (${product_variants.stock} > 0 or ${product_variants.is_preorder} = 1)) then 1 else 0 end) as integer)`,
        imageCount:
          sql<number>`cast((select count(*) from ${product_photos} where ${product_photos.product_id} = ${products.id}) as integer)`,
        primaryImageUrl:
          sql<string | null>`(select ${product_photos.image_id} from ${product_photos} where ${product_photos.product_id} = ${products.id} order by ${product_photos.is_primary} desc, ${product_photos.sort_order} asc, ${product_photos.id} asc limit 1)`,
      })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brand_id))
      .leftJoin(product_categories, eq(product_categories.product_id, products.id))
      .where(eq(products.id, productId))
      .groupBy(products.id, brands.name)
      .limit(1);

    return row
      ? toProductRecord({
          row: row.product,
          brandName: row.brandName,
          linkedCategoryCount: row.linkedCategoryCount,
          variantCount: row.variantCount,
          lowestPrice: row.lowestPrice,
          priceRangeMin: row.priceRangeMin,
          priceRangeMax: row.priceRangeMax,
          hasAvailableVariants: row.hasAvailableVariants,
          imageCount: row.imageCount,
          primaryImageUrl: row.primaryImageUrl,
        })
      : null;
  }

  async findBySlug(slug: string): Promise<ProductRecord | null> {
    const [product] = await this.db
      .select()
      .from(products)
      .where(sql`lower(${products.slug}) = ${normalizeLookup(slug)}`)
      .limit(1);

    return product
      ? toProductRecord({
          row: product,
          linkedCategoryCount: 0,
          variantCount: 0,
          lowestPrice: null,
          priceRangeMin: null,
          priceRangeMax: null,
          hasAvailableVariants: false,
          imageCount: 0,
          primaryImageUrl: null,
        })
      : null;
  }

  async getPublishReadiness(
    productId: string
  ): Promise<ProductPublishReadinessSnapshot | null> {
    const [row] = await this.db
      .select({
        id: products.id,
        status: products.status,
        hasName:
          sql<number>`cast(case when length(trim(${products.name})) > 0 then 1 else 0 end as integer)`,
        hasSlug:
          sql<number>`cast(case when length(trim(${products.slug})) > 0 then 1 else 0 end as integer)`,
        categoryCount:
          sql<number>`cast((select count(*) from ${product_categories} inner join ${categories} on ${categories.id} = ${product_categories.category_id} where ${product_categories.product_id} = ${products.id} and ${categories.status} = 'ACTIVE' and ${categories.is_visible} = 1) as integer)`,
        variantCount:
          sql<number>`cast((select count(*) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0) as integer)`,
        imageCount:
          sql<number>`cast((select count(*) from ${product_photos} where ${product_photos.product_id} = ${products.id}) as integer)`,
        availableVariantCount:
          sql<number>`cast((select count(*) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0 and (${product_variants.stock} > 0 or ${product_variants.is_preorder} = 1)) as integer)`,
        variantsMissingSkuCount:
          sql<number>`cast((select count(*) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0 and trim(coalesce(${product_variants.sku}, '')) = '') as integer)`,
        variantsMissingPriceCount:
          sql<number>`cast((select count(*) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0 and ${product_variants.price} <= 0) as integer)`,
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      productId: row.id,
      status: row.status,
      hasName: Number(row.hasName ?? 0) > 0,
      hasSlug: Number(row.hasSlug ?? 0) > 0,
      categoryCount: Number(row.categoryCount ?? 0),
      variantCount: Number(row.variantCount ?? 0),
      imageCount: Number(row.imageCount ?? 0),
      availableVariantCount: Number(row.availableVariantCount ?? 0),
      variantsMissingSkuCount: Number(row.variantsMissingSkuCount ?? 0),
      variantsMissingPriceCount: Number(row.variantsMissingPriceCount ?? 0),
    };
  }

  async list(options: ListProductOptions): Promise<ProductListResult> {
    const page = normalizePage(options.page);
    const pageSize = normalizePageSize(options.pageSize);
    const offset = (page - 1) * pageSize;
    const normalizedSearch = options.search
      ? `%${normalizeLookup(options.search)}%`
      : undefined;

    const filters = [
      ...(options.status ? [eq(products.status, options.status)] : []),
      ...(!options.status && !options.includeArchived
        ? [ne(products.status, "ARCHIVED")]
        : []),
      ...(options.restrictToViewerMembership && options.viewerAdminId
        ? [
            sql`(
              ${products.brand_id} is null
              or exists (
                select 1
                from ${brand_memberships}
                where ${brand_memberships.brand_id} = ${products.brand_id}
                  and ${brand_memberships.admin_id} = ${options.viewerAdminId}
                  and ${brand_memberships.status} = 'ACTIVE'
                  and (
                    ${brand_memberships.role} = 'OWNER'
                    or ${brand_memberships.role} = 'MEMBER'
                  )
              )
            )`,
          ]
        : []),
      ...(options.brandId ? [eq(products.brand_id, options.brandId)] : []),
      ...(options.brandless ? [isNull(products.brand_id)] : []),
      ...(normalizedSearch
        ? [
            sql`(
              lower(${products.name}) like ${normalizedSearch}
              or lower(${products.slug}) like ${normalizedSearch}
            )`,
          ]
        : []),
      ...(options.categoryId
        ? [
            sql`exists (
              select 1
              from ${product_categories}
              where ${product_categories.product_id} = ${products.id}
                and ${product_categories.category_id} = ${options.categoryId}
            )`,
          ]
        : []),
    ];
    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const [totalResult] = await this.db
      .select({ count: sql<number>`cast(count(distinct ${products.id}) as integer)` })
      .from(products)
      .where(whereClause);
    const totalItems = Number(totalResult?.count ?? 0);

    const rows = await this.db
      .select({
        product: products,
        brandName: brands.name,
        linkedCategoryCount:
          sql<number>`cast(count(${product_categories.category_id}) as integer)`,
        variantCount:
          sql<number>`cast((select count(*) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0) as integer)`,
        lowestPrice:
          sql<number | null>`cast((select min(${product_variants.price}) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0) as integer)`,
        priceRangeMin:
          sql<number | null>`cast((select min(${product_variants.price}) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0) as integer)`,
        priceRangeMax:
          sql<number | null>`cast((select max(${product_variants.price}) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0) as integer)`,
        hasAvailableVariants:
          sql<number>`cast((select case when exists(select 1 from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0 and (${product_variants.stock} > 0 or ${product_variants.is_preorder} = 1)) then 1 else 0 end) as integer)`,
        imageCount:
          sql<number>`cast((select count(*) from ${product_photos} where ${product_photos.product_id} = ${products.id}) as integer)`,
        primaryImageUrl:
          sql<string | null>`(select ${product_photos.image_id} from ${product_photos} where ${product_photos.product_id} = ${products.id} order by ${product_photos.is_primary} desc, ${product_photos.sort_order} asc, ${product_photos.id} asc limit 1)`,
      })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brand_id))
      .leftJoin(product_categories, eq(product_categories.product_id, products.id))
      .where(whereClause)
      .groupBy(products.id, brands.name)
      .orderBy(desc(products.updated_at), desc(products.id))
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows.map((row) =>
        toProductRecord({
          row: row.product,
          brandName: row.brandName,
          linkedCategoryCount: row.linkedCategoryCount,
          variantCount: row.variantCount,
          lowestPrice: row.lowestPrice,
          priceRangeMin: row.priceRangeMin,
          priceRangeMax: row.priceRangeMax,
          hasAvailableVariants: row.hasAvailableVariants,
          imageCount: row.imageCount,
          primaryImageUrl: row.primaryImageUrl,
        })
      ),
      page,
      pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize),
    };
  }

  async update(
    productId: string,
    input: UpdateProductRecordInput
  ): Promise<ProductRecord> {
    const [updated] = await this.db
      .update(products)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.summary !== undefined ? { summary: input.summary } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        updated_at: input.updatedAt,
      })
      .where(eq(products.id, productId))
      .returning();

    if (!updated) {
      throw new Error("D1_ERROR: product not found for update");
    }

    const product = await this.findById(productId);
    if (!product) {
      throw new Error("D1_ERROR: product not found after update");
    }

    return product;
  }

  private async updateProductStatus(input: {
    productId: string;
    status: ProductStatusValue;
    allowedCurrentStatuses: readonly ProductStatusValue[];
    updatedAt: string;
  }): Promise<ProductRecord | null> {
    const [updated] = await this.db
      .update(products)
      .set({
        status: input.status,
        updated_at: input.updatedAt,
      })
      .where(
        and(
          eq(products.id, input.productId),
          inArray(products.status, [...input.allowedCurrentStatuses])
        )
      )
      .returning({ id: products.id });

    if (!updated) {
      return null;
    }

    const product = await this.findById(input.productId);
    if (!product) {
      throw new Error("D1_ERROR: product not found after status update");
    }

    return product;
  }

  async publishProduct(
    productId: string,
    updatedAt: string
  ): Promise<ProductRecord | null> {
    return this.updateProductStatus({
      productId,
      status: "PUBLISHED",
      allowedCurrentStatuses: ["DRAFT"],
      updatedAt,
    });
  }

  async draftProduct(
    productId: string,
    updatedAt: string
  ): Promise<ProductRecord | null> {
    return this.updateProductStatus({
      productId,
      status: "DRAFT",
      allowedCurrentStatuses: ["PUBLISHED"],
      updatedAt,
    });
  }

  async archiveProduct(
    productId: string,
    updatedAt: string
  ): Promise<ProductRecord | null> {
    return this.updateProductStatus({
      productId,
      status: "ARCHIVED",
      allowedCurrentStatuses: ["DRAFT", "PUBLISHED"],
      updatedAt,
    });
  }

  async assignBrand(
    productId: string,
    brandId: string,
    updatedAt: string
  ): Promise<ProductRecord> {
    const [brand] = await this.db
      .select({
        id: brands.id,
        name: brands.name,
      })
      .from(brands)
      .where(eq(brands.id, brandId))
      .limit(1);

    const [updated] = await this.db
      .update(products)
      .set({
        brand_id: brandId,
        brand: brand?.name ?? null,
        updated_at: updatedAt,
      })
      .where(eq(products.id, productId))
      .returning();

    if (!updated) {
      throw new Error("D1_ERROR: product not found for brand assign");
    }

    const product = await this.findById(productId);
    if (!product) {
      throw new Error("D1_ERROR: product not found after brand assign");
    }

    return product;
  }

  async removeBrand(productId: string, updatedAt: string): Promise<ProductRecord> {
    const [updated] = await this.db
      .update(products)
      .set({
        brand_id: null,
        brand: null,
        updated_at: updatedAt,
      })
      .where(eq(products.id, productId))
      .returning();

    if (!updated) {
      throw new Error("D1_ERROR: product not found for brand removal");
    }

    const product = await this.findById(productId);
    if (!product) {
      throw new Error("D1_ERROR: product not found after brand removal");
    }

    return product;
  }

  async assignCategories(
    productId: string,
    categoryIds: string[],
    updatedAt: string
  ): Promise<void> {
    const normalizedCategoryIds = Array.from(
      new Set(
        categoryIds
          .map((categoryId) => categoryId.trim())
          .filter((categoryId) => categoryId.length > 0)
      )
    );

    if (normalizedCategoryIds.length > 0) {
      const [, , updatedRows] = await this.db.batch([
        this.db
          .delete(product_categories)
          .where(eq(product_categories.product_id, productId)),
        this.db.insert(product_categories).values(
          normalizedCategoryIds.map((categoryId) => ({
            product_id: productId,
            category_id: categoryId,
          }))
        ),
        this.db
          .update(products)
          .set({ updated_at: updatedAt })
          .where(eq(products.id, productId))
          .returning({ id: products.id }),
      ]);

      if (!updatedRows[0]) {
        throw new Error("D1_ERROR: product not found for category assignment");
      }

      return;
    }

    const [, updatedRows] = await this.db.batch([
      this.db
        .delete(product_categories)
        .where(eq(product_categories.product_id, productId)),
      this.db
        .update(products)
        .set({ updated_at: updatedAt })
        .where(eq(products.id, productId))
        .returning({ id: products.id }),
    ]);

    if (!updatedRows[0]) {
      throw new Error("D1_ERROR: product not found for category assignment");
    }
  }

  async removeCategory(
    productId: string,
    categoryId: string,
    updatedAt: string
  ): Promise<void> {
    await this.db.batch([
      this.db
        .delete(product_categories)
        .where(
          and(
            eq(product_categories.product_id, productId),
            eq(product_categories.category_id, categoryId)
          )
        ),
      this.db
        .update(products)
        .set({ updated_at: updatedAt })
        .where(eq(products.id, productId)),
    ]);
  }

  async findCategoriesByIds(categoryIds: string[]): Promise<ProductCategoryRecord[]> {
    const normalizedCategoryIds = Array.from(
      new Set(
        categoryIds
          .map((categoryId) => categoryId.trim())
          .filter((categoryId) => categoryId.length > 0)
      )
    );

    if (normalizedCategoryIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        status: categories.status,
      })
      .from(categories)
      .where(inArray(categories.id, normalizedCategoryIds))
      .orderBy(asc(categories.name), asc(categories.id));

    return rows.map((row) =>
      toCategoryRecord({
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
      })
    );
  }

  async findOrganization(
    productId: string
  ): Promise<ProductOrganizationRecord | null> {
    const [productRow] = await this.db
      .select({
        id: products.id,
        brandId: brands.id,
        brandName: brands.name,
        brandStatus: brands.status,
      })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brand_id))
      .where(eq(products.id, productId))
      .limit(1);

    if (!productRow) {
      return null;
    }

    const linkedCategories = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        status: categories.status,
      })
      .from(product_categories)
      .innerJoin(categories, eq(categories.id, product_categories.category_id))
      .where(eq(product_categories.product_id, productId))
      .orderBy(asc(categories.name), asc(categories.id));

    return {
      productId: productRow.id,
      brand:
        productRow.brandId && productRow.brandName && productRow.brandStatus
          ? {
              id: productRow.brandId,
              name: productRow.brandName,
              status: productRow.brandStatus,
            }
          : null,
      categories: linkedCategories.map((row) =>
        toCategoryRecord({
          id: row.id,
          name: row.name,
          slug: row.slug,
          status: row.status,
        })
      ),
    };
  }

  async findBrandById(brandId: string): Promise<ProductBrandRecord | null> {
    const [brand] = await this.db
      .select({
        id: brands.id,
        name: brands.name,
        status: brands.status,
      })
      .from(brands)
      .where(eq(brands.id, brandId))
      .limit(1);

    return brand
      ? {
          id: brand.id,
          name: brand.name,
          status: brand.status,
        }
      : null;
  }

  async findBrandMembership(
    brandId: string,
    adminId: string
  ): Promise<ProductBrandMembershipRecord | null> {
    const [membership] = await this.db
      .select({
        adminId: brand_memberships.admin_id,
        role: brand_memberships.role,
        status: brand_memberships.status,
      })
      .from(brand_memberships)
      .where(
        and(
          eq(brand_memberships.brand_id, brandId),
          eq(brand_memberships.admin_id, adminId)
        )
      )
      .limit(1);

    return membership
      ? {
          adminId: membership.adminId,
          role: membership.role,
          status: membership.status,
        }
      : null;
  }
}

export function createProductRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleProductRepository(db),
  };
}

export { activeMembership };
