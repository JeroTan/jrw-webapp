import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import { brands, product_photos, products } from "@/domain/schema/catalog";
import type {
  PublicBrandProductPreview,
  PublicBrandRow,
} from "@/domain/brands/public-types";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";

const BRAND_LIST_LIMIT = 50;
const BRAND_PRODUCT_PREVIEW_LIMIT = 5;

type BrandSummaryLookup = {
  id: string;
  name: string;
  slug: string;
};

type BrandSummaryRow = BrandSummaryLookup & {
  productCount: number;
};

type BrandProductPreviewRow = {
  id: string;
  imageAlt: string | null;
  productName: string;
  productSlug: string;
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

function productPreviewFromRow(
  row: BrandProductPreviewRow
): PublicBrandProductPreview {
  return {
    href: productHref(row.productSlug),
    id: row.id,
    imageAlt: row.imageAlt?.trim() || row.productName,
    imageSrc: productImageSrc(row.r2Key),
  };
}

function brandRowFromSummary(
  row: BrandSummaryRow,
  productPreviews: PublicBrandProductPreview[]
): PublicBrandRow {
  return {
    href: brandHref(row.slug),
    id: row.id,
    name: row.name,
    productCount: Number(row.productCount ?? 0),
    products: productPreviews,
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
  ): Promise<PublicBrandProductPreview[]> {
    const previewRows = await this.db
      .select({
        id: products.id,
        productName: products.name,
        productSlug: products.slug,
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
      .where(
        and(productBrandScopeClause(brand), eq(products.status, "PUBLISHED"))
      )
      .orderBy(desc(products.updated_at), desc(products.id))
      .limit(BRAND_PRODUCT_PREVIEW_LIMIT);

    return previewRows.map(productPreviewFromRow);
  }
}

export function createPublicBrandRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzlePublicBrandRepository(db),
  };
}
