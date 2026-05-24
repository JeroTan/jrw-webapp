import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  formatCatalogPrice,
  publicCatalogAvailabilityFromStates,
} from "@/domain/products/public-catalog";
import type {
  PublicCatalogCategoryOption,
  PublicCatalogPagination,
  PublicCatalogProductCard,
} from "@/domain/products/public-types";
import type { InventoryState, ProductRecord } from "@/domain/products/types";
import {
  categories,
  product_categories,
  product_photos,
  product_variants,
  products,
} from "@/domain/schema/catalog";
import {
  DrizzleCategoryRepository,
  type CategoryRepository,
} from "@/server/repositories/CategoryRepository";
import {
  DrizzleProductRepository,
  type ProductRepository,
} from "@/server/repositories/ProductRepository";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

type PublicCatalogBrowseInput = {
  categoryId?: string;
  categoryName?: string;
  page: number;
  pageSize: number;
  search?: string;
};

type ProductCategoryRow = {
  name: string;
  productId: string;
};

type ProductPhotoRow = {
  imageAlt: string | null;
  productId: string | null;
  r2Key: string | null;
};

type ProductAvailabilityRow = {
  hasAnyActiveVariant: number;
  hasInStock: number;
  hasLowStock: number;
  hasPreorder: number;
  productId: string;
};

export type PublicCatalogBrowseResult = {
  items: PublicCatalogProductCard[];
  pagination: PublicCatalogPagination;
};

export type PublicCatalogRepository = {
  findActiveVisibleCategoryBySlug(
    slug: string
  ): Promise<PublicCatalogCategoryOption | null>;
  findPublishedProductExistsBySlug(slug: string): Promise<boolean>;
  listActiveVisibleCategoryOptions(): Promise<PublicCatalogCategoryOption[]>;
  listPublishedProductCards(
    input: PublicCatalogBrowseInput
  ): Promise<PublicCatalogBrowseResult>;
};

function categoryHref(slug: string): string {
  return `/categories/${encodeURIComponent(slug)}`;
}

function productHref(slug: string): string {
  return `/products/${encodeURIComponent(slug)}`;
}

function productImageSrc(r2Key: string | null): string | undefined {
  const cleanKey = r2Key?.trim().replace(/^products\//, "");

  if (!cleanKey) {
    return undefined;
  }

  return `/assets/products/${cleanKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function priceLabel(product: ProductRecord): string {
  if (
    typeof product.priceRangeMin === "number" &&
    typeof product.priceRangeMax === "number"
  ) {
    if (product.priceRangeMin === product.priceRangeMax) {
      return formatCatalogPrice(product.priceRangeMin);
    }

    return `${formatCatalogPrice(product.priceRangeMin)} - ${formatCatalogPrice(product.priceRangeMax)}`;
  }

  if (typeof product.lowestPrice === "number") {
    return `Starts at ${formatCatalogPrice(product.lowestPrice)}`;
  }

  return "Price unavailable";
}

function toCategoryOption(input: {
  id: string;
  name: string;
  slug: string;
}): PublicCatalogCategoryOption {
  return {
    href: categoryHref(input.slug),
    id: input.id,
    name: input.name,
    slug: input.slug,
  };
}

function productCardFromRecord(input: {
  categoryName?: string;
  imageAlt?: string | null;
  imageSrc?: string;
  product: ProductRecord;
  states: InventoryState[];
}): PublicCatalogProductCard {
  const availability = publicCatalogAvailabilityFromStates(input.states);
  const href = productHref(input.product.slug);

  return {
    availability,
    brandName:
      typeof input.product.brandName === "string" &&
      input.product.brandName.trim().length > 0
        ? input.product.brandName
        : null,
    ...(input.categoryName ? { categoryName: input.categoryName } : {}),
    href,
    id: input.product.id,
    imageAlt: input.imageAlt?.trim() || input.product.name,
    ...(input.imageSrc ? { imageSrc: input.imageSrc } : {}),
    name: input.product.name,
    priceLabel: priceLabel(input.product),
    quickAction: availability.inStock
      ? {
          disabled: false,
          href,
          label: "View product",
        }
      : {
          disabled: true,
          hint: "Currently unavailable",
          href,
          label: "Unavailable",
        },
  };
}

export class DrizzlePublicCatalogRepository implements PublicCatalogRepository {
  constructor(
    private readonly db: AppDb,
    private readonly categoryRepository: CategoryRepository,
    private readonly productRepository: ProductRepository
  ) {}

  async findActiveVisibleCategoryBySlug(
    slug: string
  ): Promise<PublicCatalogCategoryOption | null> {
    const category = await this.categoryRepository.findBySlug(slug);

    if (!category || category.status !== "ACTIVE" || !category.isVisible) {
      return null;
    }

    return toCategoryOption(category);
  }

  async listActiveVisibleCategoryOptions(): Promise<
    PublicCatalogCategoryOption[]
  > {
    const items: PublicCatalogCategoryOption[] = [];
    let page = 1;

    while (true) {
      const result = await this.categoryRepository.list({
        isVisible: true,
        page,
        pageSize: 100,
        status: "ACTIVE",
      });

      items.push(...result.items.map(toCategoryOption));

      if (result.totalPages <= page || result.items.length === 0) {
        break;
      }

      page += 1;
    }

    return items;
  }

  async findPublishedProductExistsBySlug(slug: string): Promise<boolean> {
    const cleanSlug = slug.trim();

    if (!cleanSlug) {
      return false;
    }

    const [row] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          sql`lower(${products.slug}) = ${cleanSlug.toLowerCase()}`,
          eq(products.status, "PUBLISHED")
        )
      )
      .limit(1);

    return Boolean(row);
  }

  async listPublishedProductCards(
    input: PublicCatalogBrowseInput
  ): Promise<PublicCatalogBrowseResult> {
    const result = await this.productRepository.list({
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      page: input.page,
      pageSize: input.pageSize,
      ...(input.search ? { search: input.search } : {}),
      status: "PUBLISHED",
    });

    const productIds = result.items.map((product) => product.id);

    if (productIds.length === 0) {
      return {
        items: [],
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
        },
      };
    }

    const [categoryNames, photos, states] = await Promise.all([
      this.listPrimaryVisibleCategoryNames(productIds),
      this.listPrimaryPhotos(productIds),
      this.listAvailabilityStates(productIds),
    ]);

    return {
      items: result.items.map((product) =>
        productCardFromRecord({
          categoryName: input.categoryName ?? categoryNames.get(product.id),
          imageAlt: photos.get(product.id)?.imageAlt,
          imageSrc: productImageSrc(photos.get(product.id)?.r2Key ?? null),
          product,
          states: states.get(product.id) ?? [],
        })
      ),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      },
    };
  }

  private async listAvailabilityRows(
    productIds: string[]
  ): Promise<ProductAvailabilityRow[]> {
    return this.db
      .select({
        hasAnyActiveVariant: sql<number>`cast(max(case when ${product_variants.stock_lock_version} >= 0 then 1 else 0 end) as integer)`,
        hasInStock: sql<number>`cast(max(case when ${product_variants.stock_lock_version} >= 0 and ${product_variants.inventory_state} = 'IN_STOCK' then 1 else 0 end) as integer)`,
        hasLowStock: sql<number>`cast(max(case when ${product_variants.stock_lock_version} >= 0 and ${product_variants.inventory_state} = 'LOW_STOCK' then 1 else 0 end) as integer)`,
        hasPreorder: sql<number>`cast(max(case when ${product_variants.stock_lock_version} >= 0 and ${product_variants.inventory_state} = 'PREORDER' then 1 else 0 end) as integer)`,
        productId: product_variants.product_id,
      })
      .from(product_variants)
      .where(inArray(product_variants.product_id, productIds))
      .groupBy(product_variants.product_id);
  }

  private async listAvailabilityStates(
    productIds: string[]
  ): Promise<Map<string, InventoryState[]>> {
    const rows = await this.listAvailabilityRows(productIds);
    const states = new Map<string, InventoryState[]>();

    for (const row of rows) {
      const productStates: InventoryState[] = [];

      if (Number(row.hasInStock) > 0) {
        productStates.push("IN_STOCK");
      }

      if (Number(row.hasLowStock) > 0) {
        productStates.push("LOW_STOCK");
      }

      if (Number(row.hasPreorder) > 0) {
        productStates.push("PREORDER");
      }

      if (Number(row.hasAnyActiveVariant) > 0 && productStates.length === 0) {
        productStates.push("OUT_OF_STOCK");
      }

      states.set(row.productId, productStates);
    }

    return states;
  }

  private async listPrimaryPhotos(
    productIds: string[]
  ): Promise<Map<string, ProductPhotoRow>> {
    const rows = await this.db
      .select({
        imageAlt: product_photos.name,
        productId: product_photos.product_id,
        r2Key: product_photos.r2_key,
      })
      .from(product_photos)
      .where(inArray(product_photos.product_id, productIds))
      .orderBy(
        asc(product_photos.product_id),
        desc(product_photos.is_primary),
        asc(product_photos.sort_order),
        asc(product_photos.id)
      );

    const photoMap = new Map<string, ProductPhotoRow>();

    for (const row of rows) {
      if (!row.productId || photoMap.has(row.productId)) {
        continue;
      }

      photoMap.set(row.productId, row);
    }

    return photoMap;
  }

  private async listPrimaryVisibleCategoryNames(
    productIds: string[]
  ): Promise<Map<string, string>> {
    const rows = await this.db
      .select({
        name: categories.name,
        productId: product_categories.product_id,
      })
      .from(product_categories)
      .innerJoin(categories, eq(categories.id, product_categories.category_id))
      .where(
        and(
          inArray(product_categories.product_id, productIds),
          eq(categories.status, "ACTIVE"),
          eq(categories.is_visible, true)
        )
      )
      .orderBy(
        asc(product_categories.product_id),
        asc(categories.sort_order),
        asc(categories.name),
        asc(categories.id)
      );

    const categoryMap = new Map<string, string>();

    for (const row of rows as ProductCategoryRow[]) {
      if (!categoryMap.has(row.productId)) {
        categoryMap.set(row.productId, row.name);
      }
    }

    return categoryMap;
  }
}

export function createPublicCatalogRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzlePublicCatalogRepository(
      db,
      new DrizzleCategoryRepository(db),
      new DrizzleProductRepository(db)
    ),
  };
}
