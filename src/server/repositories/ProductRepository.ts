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
  productStatusValues,
  product_categories,
  products,
} from "@/domain/schema/catalog";
import type {
  ProductListResult,
  ProductOrganizationRecord,
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
  list(options: ListProductOptions): Promise<ProductListResult>;
  update(
    productId: string,
    input: UpdateProductRecordInput
  ): Promise<ProductRecord>;
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
    });
  }

  async findById(productId: string): Promise<ProductRecord | null> {
    const [row] = await this.db
      .select({
        product: products,
        brandName: brands.name,
        linkedCategoryCount:
          sql<number>`cast(count(${product_categories.category_id}) as integer)`,
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
        })
      : null;
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

    const [row] = await this.db
      .select({
        brandName: brands.name,
        linkedCategoryCount:
          sql<number>`cast(count(${product_categories.category_id}) as integer)`,
      })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brand_id))
      .leftJoin(product_categories, eq(product_categories.product_id, products.id))
      .where(eq(products.id, productId))
      .groupBy(products.id, brands.name)
      .limit(1);

    return toProductRecord({
      row: updated,
      brandName: row?.brandName,
      linkedCategoryCount: row?.linkedCategoryCount ?? 0,
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

    const [row] = await this.db
      .select({
        brandName: brands.name,
        linkedCategoryCount:
          sql<number>`cast(count(${product_categories.category_id}) as integer)`,
      })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brand_id))
      .leftJoin(product_categories, eq(product_categories.product_id, products.id))
      .where(eq(products.id, productId))
      .groupBy(products.id, brands.name)
      .limit(1);

    return toProductRecord({
      row: updated,
      brandName: row?.brandName,
      linkedCategoryCount: row?.linkedCategoryCount ?? 0,
    });
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

    const [row] = await this.db
      .select({
        brandName: brands.name,
        linkedCategoryCount:
          sql<number>`cast(count(${product_categories.category_id}) as integer)`,
      })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brand_id))
      .leftJoin(product_categories, eq(product_categories.product_id, products.id))
      .where(eq(products.id, productId))
      .groupBy(products.id, brands.name)
      .limit(1);

    return toProductRecord({
      row: updated,
      brandName: row?.brandName,
      linkedCategoryCount: row?.linkedCategoryCount ?? 0,
    });
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
