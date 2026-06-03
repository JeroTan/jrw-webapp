import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import type { PublicBrandRow } from "@/domain/brands/public-types";
import {
  formatCatalogPriceLabel,
  publicCatalogAvailabilityFromStates,
} from "@/domain/products/public-catalog";
import type { PublicCatalogProductCard } from "@/domain/products/public-types";
import type { InventoryState } from "@/domain/products/types";
import {
  brands,
  categories,
  product_categories,
  product_photos,
  product_variants,
  products,
} from "@/domain/schema/catalog";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";

const BRAND_LIST_LIMIT = 50;
const BRAND_PRODUCT_PREVIEW_LIMIT = 4;

type BrandSummaryLookup = {
  id: string;
  imageAlt: string | null;
  imageSrc: string | null;
  name: string;
  slug: string;
};

type BrandSummaryRow = BrandSummaryLookup & {
  productCount: number;
};

type BrandProductPreviewRow = {
  brandName: string | null;
  categoryName: string | null;
  fallbackBrandName: string | null;
  hasAnyActiveVariant: number;
  hasInStock: number;
  hasLowStock: number;
  hasPreorder: number;
  id: string;
  imageAlt: string | null;
  productName: string;
  productSlug: string;
  priceRangeMax: number | null;
  priceRangeMin: number | null;
  r2Key: string | null;
};

export type PublicBrandRepository = {
  findBrandRow(slugOrId: string): Promise<PublicBrandRow | null>;
  listBrandRows(): Promise<PublicBrandRow[]>;
};

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

function brandHref(slug: string): string {
  return `/brands/${encodeURIComponent(slug)}`;
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

function availabilityStates(row: BrandProductPreviewRow): InventoryState[] {
  const states: InventoryState[] = [];

  if (Number(row.hasInStock) > 0) {
    states.push("IN_STOCK");
  }

  if (Number(row.hasLowStock) > 0) {
    states.push("LOW_STOCK");
  }

  if (Number(row.hasPreorder) > 0) {
    states.push("PREORDER");
  }

  if (Number(row.hasAnyActiveVariant) > 0 && states.length === 0) {
    states.push("OUT_OF_STOCK");
  }

  return states;
}

function productBrandScopeClause(brand: BrandSummaryLookup) {
  return (
    or(
      eq(products.brand_id, brand.id),
      sql`trim(coalesce(${products.brand}, '')) = ${brand.id.trim()}`,
      sql`lower(trim(coalesce(${products.brand}, ''))) = ${normalizeLookup(
        brand.name
      )}`,
      sql`lower(trim(coalesce(${products.brand}, ''))) = ${normalizeLookup(
        brand.slug
      )}`
    ) ?? sql`0 = 1`
  );
}

function productCardFromRow(
  row: BrandProductPreviewRow
): PublicCatalogProductCard {
  const availability = publicCatalogAvailabilityFromStates(
    availabilityStates(row)
  );
  const href = productHref(row.productSlug);
  const brandName =
    row.brandName?.trim() || row.fallbackBrandName?.trim() || null;

  return {
    availability,
    brandName,
    ...(row.categoryName ? { categoryName: row.categoryName } : {}),
    href,
    id: row.id,
    imageAlt: row.imageAlt?.trim() || row.productName,
    ...(productImageSrc(row.r2Key)
      ? { imageSrc: productImageSrc(row.r2Key) }
      : {}),
    name: row.productName,
    priceLabel: formatCatalogPriceLabel({
      lowestPrice: row.priceRangeMin,
      priceRangeMax: row.priceRangeMax,
      priceRangeMin: row.priceRangeMin,
    }),
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

function brandRowFromSummary(
  row: BrandSummaryRow,
  productPreviews: PublicCatalogProductCard[]
): PublicBrandRow {
  return {
    href: brandHref(row.slug),
    id: row.id,
    ...(row.imageAlt ? { imageAlt: row.imageAlt } : {}),
    ...(row.imageSrc ? { imageSrc: row.imageSrc } : {}),
    name: row.name,
    productCount: Number(row.productCount ?? 0),
    products: productPreviews,
    slug: row.slug,
  };
}

export class DrizzlePublicBrandRepository implements PublicBrandRepository {
  constructor(private readonly db: AppDb) {}

  async listBrandRows(): Promise<PublicBrandRow[]> {
    const brandSummaries = await this.listActiveBrandSummaries();
    const rows = await Promise.all(
      brandSummaries.map(async (brand) =>
        brandRowFromSummary(brand, await this.listBrandProductPreviews(brand))
      )
    );

    return rows;
  }

  async findBrandRow(slugOrId: string): Promise<PublicBrandRow | null> {
    const brand = await this.findActiveBrand(slugOrId);

    if (!brand) {
      return null;
    }

    const productCount = await this.countPublishedProducts(brand);
    const productPreviews = await this.listBrandProductPreviews(brand);

    return brandRowFromSummary({ ...brand, productCount }, productPreviews);
  }

  private async findActiveBrand(
    slugOrId: string
  ): Promise<BrandSummaryLookup | null> {
    const cleanSlugOrId = slugOrId.trim();

    if (!cleanSlugOrId) {
      return null;
    }

    const normalized = normalizeLookup(cleanSlugOrId);
    const [brand] = await this.db
      .select({
        id: brands.id,
        imageAlt: brands.image_alt,
        imageSrc: brands.image_id,
        name: brands.name,
        slug: brands.slug,
      })
      .from(brands)
      .where(
        and(
          eq(brands.status, "ACTIVE"),
          or(
            eq(brands.id, cleanSlugOrId),
            sql`lower(${brands.slug}) = ${normalized}`
          )
        )
      )
      .limit(1);

    return brand ?? null;
  }

  private async listActiveBrandSummaries(): Promise<BrandSummaryRow[]> {
    const activeBrands = await this.db
      .select({
        id: brands.id,
        imageAlt: brands.image_alt,
        imageSrc: brands.image_id,
        name: brands.name,
        slug: brands.slug,
      })
      .from(brands)
      .where(eq(brands.status, "ACTIVE"))
      .orderBy(sql`lower(${brands.name})`, asc(brands.id))
      .limit(BRAND_LIST_LIMIT);

    return Promise.all(
      activeBrands.map(async (brand) => ({
        ...brand,
        productCount: await this.countPublishedProducts(brand),
      }))
    );
  }

  private async countPublishedProducts(
    brand: BrandSummaryLookup
  ): Promise<number> {
    const [result] = await this.db
      .select({
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(products)
      .where(
        and(productBrandScopeClause(brand), eq(products.status, "PUBLISHED"))
      );

    return Number(result?.count ?? 0);
  }

  private async listBrandProductPreviews(
    brand: BrandSummaryLookup
  ): Promise<PublicCatalogProductCard[]> {
    const previewRows = await this.db
      .select({
        brandName: brands.name,
        categoryName: sql<string | null>`(
          select ${categories.name}
          from ${product_categories}
          inner join ${categories}
            on ${categories.id} = ${product_categories.category_id}
          where ${product_categories.product_id} = ${products.id}
            and ${categories.status} = 'ACTIVE'
            and ${categories.is_visible} = 1
          order by ${categories.sort_order} asc,
            ${categories.name} asc,
            ${categories.id} asc
          limit 1
        )`,
        fallbackBrandName: products.brand,
        hasAnyActiveVariant: sql<number>`cast((select case when exists(select 1 from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0) then 1 else 0 end) as integer)`,
        hasInStock: sql<number>`cast((select case when exists(select 1 from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0 and ${product_variants.inventory_state} = 'IN_STOCK') then 1 else 0 end) as integer)`,
        hasLowStock: sql<number>`cast((select case when exists(select 1 from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0 and ${product_variants.inventory_state} = 'LOW_STOCK') then 1 else 0 end) as integer)`,
        hasPreorder: sql<number>`cast((select case when exists(select 1 from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0 and ${product_variants.inventory_state} = 'PREORDER') then 1 else 0 end) as integer)`,
        id: products.id,
        productName: products.name,
        productSlug: products.slug,
        priceRangeMax: sql<
          number | null
        >`cast((select max(${product_variants.price}) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0) as integer)`,
        priceRangeMin: sql<
          number | null
        >`cast((select min(${product_variants.price}) from ${product_variants} where ${product_variants.product_id} = ${products.id} and ${product_variants.stock_lock_version} >= 0) as integer)`,
        r2Key: sql<string | null>`(
          select ${product_photos.r2_key}
          from ${product_photos}
          where ${product_photos.product_id} = ${products.id}
          order by ${product_photos.is_primary} desc,
            ${product_photos.sort_order} asc,
            ${product_photos.id} asc
          limit 1
        )`,
        imageAlt: sql<string | null>`(
          select ${product_photos.name}
          from ${product_photos}
          where ${product_photos.product_id} = ${products.id}
          order by ${product_photos.is_primary} desc,
            ${product_photos.sort_order} asc,
            ${product_photos.id} asc
          limit 1
        )`,
      })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brand_id))
      .where(
        and(productBrandScopeClause(brand), eq(products.status, "PUBLISHED"))
      )
      .orderBy(desc(products.updated_at), desc(products.id))
      .limit(BRAND_PRODUCT_PREVIEW_LIMIT);

    return previewRows.map(productCardFromRow);
  }
}

export function createPublicBrandRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzlePublicBrandRepository(db),
  };
}
