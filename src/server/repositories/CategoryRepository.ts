import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import { createId } from "@paralleldrive/cuid2";
import {
  categories,
  categoryStatusValues,
  product_categories,
} from "@/domain/schema/catalog";
import type {
  CategoryListResult,
  CategoryRecord,
  CategoryStatus,
} from "@/domain/categories/types";
import { toApiDateTime } from "@/lib/api/date-time";
import { and, asc, desc, eq, sql } from "drizzle-orm";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type CategoryRowLike = {
  [key: string]: unknown;
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
  status: CategoryStatus;
  created_at: string;
  updated_at: string;
};

type CategoryStatusValue = (typeof categoryStatusValues)[number];

export type CreateCategoryRecordInput = {
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isVisible: boolean;
  status: CategoryStatusValue;
  createdAt: string;
  updatedAt: string;
};

export type UpdateCategoryRecordInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
  updatedAt: string;
};

export type ListCategoryOptions = {
  page?: number;
  pageSize?: number;
  status?: CategoryStatus;
  isVisible?: boolean;
};

export type CategoryRepository = {
  create(input: CreateCategoryRecordInput): Promise<CategoryRecord>;
  findById(categoryId: string): Promise<CategoryRecord | null>;
  findBySlug(slug: string): Promise<CategoryRecord | null>;
  list(options: ListCategoryOptions): Promise<CategoryListResult>;
  update(
    categoryId: string,
    input: UpdateCategoryRecordInput
  ): Promise<CategoryRecord>;
  archive(categoryId: string, timestamp: string): Promise<CategoryRecord>;
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

function categoryDtoFromRow(
  row: CategoryRowLike,
  linkedProductCount: number | null = 0
): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    status: row.status,
    createdAt: toApiDateTime(row.created_at),
    updatedAt: toApiDateTime(row.updated_at),
    linkedProductCount,
  };
}

export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(private readonly db: AppDb) {}

  async create(input: CreateCategoryRecordInput): Promise<CategoryRecord> {
    const [category] = await this.db
      .insert(categories)
      .values({
        id: createId(),
        name: input.name,
        slug: input.slug,
        description: input.description,
        sort_order: input.sortOrder,
        is_visible: input.isVisible,
        status: input.status,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
      })
      .returning();

    return categoryDtoFromRow(category, 0);
  }

  async findById(categoryId: string): Promise<CategoryRecord | null> {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);

    if (!category) {
      return null;
    }

    const [countRow] = await this.db
      .select({
        total: sql<number>`cast(count(*) as integer)`,
      })
      .from(product_categories)
      .where(eq(product_categories.category_id, category.id));

    return categoryDtoFromRow(category, Number(countRow?.total ?? 0));
  }

  async findBySlug(slug: string): Promise<CategoryRecord | null> {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(sql`lower(${categories.slug}) = ${normalizeLookup(slug)}`)
      .limit(1);

    return category ? categoryDtoFromRow(category, 0) : null;
  }

  async list(options: ListCategoryOptions): Promise<CategoryListResult> {
    const page = normalizePage(options.page);
    const pageSize = normalizePageSize(options.pageSize);
    const offset = (page - 1) * pageSize;
    const filters = [
      ...(options.status ? [eq(categories.status, options.status)] : []),
      ...(options.isVisible === undefined
        ? []
        : [eq(categories.is_visible, options.isVisible)]),
    ];
    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const [totalResult] = await this.db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(categories)
      .where(whereClause);
    const totalItems = Number(totalResult?.count ?? 0);

    const rows = await this.db
      .select({
        category: categories,
        linkedProductCount:
          sql<number>`cast(count(${product_categories.product_id}) as integer)`,
      })
      .from(categories)
      .leftJoin(
        product_categories,
        eq(product_categories.category_id, categories.id)
      )
      .where(whereClause)
      .groupBy(categories.id)
      .orderBy(
        asc(categories.sort_order),
        asc(categories.name),
        desc(categories.updated_at)
      )
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows.map((row) =>
        categoryDtoFromRow(row.category, Number(row.linkedProductCount ?? 0))
      ),
      page,
      pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize),
    };
  }

  async update(
    categoryId: string,
    input: UpdateCategoryRecordInput
  ): Promise<CategoryRecord> {
    const [category] = await this.db
      .update(categories)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
        ...(input.isVisible !== undefined ? { is_visible: input.isVisible } : {}),
        updated_at: input.updatedAt,
      })
      .where(eq(categories.id, categoryId))
      .returning();

    if (!category) {
      throw new Error("D1_ERROR: category not found for update");
    }

    const [countRow] = await this.db
      .select({
        total: sql<number>`cast(count(*) as integer)`,
      })
      .from(product_categories)
      .where(eq(product_categories.category_id, category.id));

    return categoryDtoFromRow(category, Number(countRow?.total ?? 0));
  }

  async archive(categoryId: string, timestamp: string): Promise<CategoryRecord> {
    const [category] = await this.db
      .update(categories)
      .set({
        status: "ARCHIVED",
        updated_at: timestamp,
      })
      .where(eq(categories.id, categoryId))
      .returning();

    if (!category) {
      throw new Error("D1_ERROR: category not found for archive");
    }

    const [countRow] = await this.db
      .select({
        total: sql<number>`cast(count(*) as integer)`,
      })
      .from(product_categories)
      .where(eq(product_categories.category_id, category.id));

    return categoryDtoFromRow(category, Number(countRow?.total ?? 0));
  }
}

export function createCategoryRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleCategoryRepository(db),
  };
}

