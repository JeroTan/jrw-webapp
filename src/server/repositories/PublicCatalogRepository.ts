import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  formatCatalogPrice,
  formatCatalogPriceLabel,
  formatPublicVariantLabel,
  publicCatalogAvailabilityFromStates,
  publicCatalogUnavailableReason,
} from "@/domain/products/public-catalog";
import type {
  PublicCatalogBrandOption,
  PublicCatalogCategoryOption,
  PublicCatalogDetailResult,
  PublicCatalogGalleryItem,
  PublicCatalogPagination,
  PublicCatalogProductCard,
  PublicCatalogRecoveryLink,
} from "@/domain/products/public-types";
import type {
  InventoryState,
  ProductPhotoRecord,
  ProductRecord,
  ProductVariantRecord,
} from "@/domain/products/types";
import {
  categories,
  brands,
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
  DrizzlePhotoRepository,
  type PhotoRepository,
} from "@/server/repositories/PhotoRepository";
import {
  DrizzleProductRepository,
  type ProductRepository,
} from "@/server/repositories/ProductRepository";
import {
  DrizzleVariantRepository,
  type VariantRepository,
} from "@/server/repositories/VariantRepository";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

type PublicCatalogBrowseInput = {
  brandIds?: string[];
  categoryId?: string;
  categoryIds?: string[];
  categoryName?: string;
  inventoryStates?: InventoryState[];
  maxPriceCentavos?: number;
  minPriceCentavos?: number;
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
  findActiveBrandBySlug(slug: string): Promise<PublicCatalogBrandOption | null>;
  findActiveVisibleCategoryBySlug(
    slug: string
  ): Promise<PublicCatalogCategoryOption | null>;
  findPublishedProductDetailBySlug(
    slug: string
  ): Promise<PublicCatalogDetailResult | null>;
  findPublishedProductExistsBySlug(slug: string): Promise<boolean>;
  listActiveBrandOptions(): Promise<PublicCatalogBrandOption[]>;
  listActiveVisibleCategoryOptions(): Promise<PublicCatalogCategoryOption[]>;
  listPublishedProductCards(
    input: PublicCatalogBrowseInput
  ): Promise<PublicCatalogBrowseResult>;
};

function categoryHref(slug: string): string {
  return `/categories/${encodeURIComponent(slug)}`;
}

function brandHref(slug: string): string {
  return `/brands/${encodeURIComponent(slug)}`;
}

function productHref(slug: string): string {
  return `/products/${encodeURIComponent(slug)}`;
}

function publicProductAssetUrl(key: string): string {
  const cleanKey = key.trim().replace(/^products\//, "");

  return `/assets/products/${cleanKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function productImageSrc(r2Key: string | null): string | undefined {
  const cleanKey = r2Key?.trim();

  if (!cleanKey) {
    return undefined;
  }

  return publicProductAssetUrl(cleanKey);
}

function priceLabel(product: ProductRecord): string {
  return formatCatalogPriceLabel({
    lowestPrice: product.lowestPrice,
    priceRangeMax: product.priceRangeMax,
    priceRangeMin: product.priceRangeMin,
  });
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

function toBrandOption(input: {
  id: string;
  name: string;
  slug: string;
}): PublicCatalogBrandOption {
  return {
    href: brandHref(input.slug),
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

function truncateDescription(value: string, maxLength = 160): string {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

function galleryItemFromPhoto(input: {
  index: number;
  photo: ProductPhotoRecord;
  productName: string;
}): PublicCatalogGalleryItem {
  return {
    alt:
      input.photo.name?.trim() ||
      `${input.productName} image ${String(input.index + 1)}`,
    height: input.photo.height,
    id: input.photo.id,
    isPrimary: input.photo.isPrimary,
    name: input.photo.name,
    src: input.photo.url,
    width: input.photo.width,
  };
}

function detailRecoveryLinks(
  categories: PublicCatalogCategoryOption[]
): PublicCatalogRecoveryLink[] {
  const links: PublicCatalogRecoveryLink[] = [
    {
      href: "/products",
      label: "Browse all products",
    },
    {
      href: "/categories",
      label: "Browse categories",
    },
  ];

  if (categories[0]) {
    links.push({
      href: categories[0].href,
      label: `More in ${categories[0].name}`,
    });
  }

  return links;
}

function metadataContextLabels(input: {
  brandName: string | null;
  categories: PublicCatalogCategoryOption[];
}): string[] {
  const labels = [
    input.brandName?.trim(),
    input.categories[0]?.name?.trim(),
  ].filter((value): value is string => Boolean(value && value.length > 0));

  return Array.from(new Set(labels));
}

export function buildPublicCatalogDetailMetadata(input: {
  availabilityText: string;
  brandName: string | null;
  categories: PublicCatalogCategoryOption[];
  imageAlt?: string;
  imageSrc?: string;
  priceLabel: string;
  product: ProductRecord;
}): PublicCatalogDetailResult["metadata"] {
  const descriptionSource =
    input.product.summary?.trim() || input.product.description.trim();
  const contextLabels = metadataContextLabels({
    brandName: input.brandName,
    categories: input.categories,
  });
  const description = truncateDescription(
    [
      descriptionSource,
      input.priceLabel,
      input.availabilityText,
      ...(contextLabels.length > 0 ? contextLabels : ["JRW"]),
    ]
      .filter((value) => value && value.trim().length > 0)
      .join(" • ")
  );

  return {
    availabilityText: input.availabilityText,
    canonicalPath: productHref(input.product.slug),
    description,
    ...(input.imageAlt ? { imageAlt: input.imageAlt } : {}),
    ...(input.imageSrc ? { imageSrc: input.imageSrc } : {}),
    robots: "index,follow",
    title: `${input.product.name} | JRW`,
  };
}

function detailResultFromSource(input: {
  categories: PublicCatalogCategoryOption[];
  galleryPhotos: ProductPhotoRecord[];
  product: ProductRecord;
  variants: ProductVariantRecord[];
}): PublicCatalogDetailResult {
  const gallery = input.galleryPhotos.map((photo, index) =>
    galleryItemFromPhoto({
      index,
      photo,
      productName: input.product.name,
    })
  );
  const primaryImage =
    gallery.find((item) => item.isPrimary) ?? gallery[0] ?? null;
  const photoByImageReference = new Map(
    input.galleryPhotos.map((photo) => [photo.imageId, photo.url])
  );
  const activeVariants = input.variants.filter(
    (variant) => variant.status !== "ARCHIVED"
  );
  const defaultVariant =
    activeVariants.find((variant) => variant.hasAvailableStock) ??
    activeVariants[0] ??
    null;
  const variants = activeVariants.map((variant) => {
    const availability = publicCatalogAvailabilityFromStates([
      variant.inventoryState,
    ]);

    return {
      availability,
      disabled: !availability.inStock,
      id: variant.id,
      ...(variant.imageReferenceId &&
      photoByImageReference.has(variant.imageReferenceId)
        ? { imageSrc: photoByImageReference.get(variant.imageReferenceId) }
        : {}),
      label: formatPublicVariantLabel({
        name: variant.name,
        optionValues: variant.variationChain,
      }),
      optionValues: variant.variationChain.map((option) => ({
        group: option.group,
        name: option.name,
      })),
      priceCentavos: variant.priceCentavos,
      priceLabel: formatCatalogPrice(variant.priceCentavos),
      productId: variant.productId,
      selected: defaultVariant?.id === variant.id,
      ...(publicCatalogUnavailableReason({
        availability,
        variantCount: activeVariants.length,
      })
        ? {
            unavailableReason: publicCatalogUnavailableReason({
              availability,
              variantCount: activeVariants.length,
            }),
          }
        : {}),
    };
  });
  const selectedVariant = variants.find((variant) => variant.selected) ?? null;
  const selectedAvailability =
    selectedVariant?.availability ?? publicCatalogAvailabilityFromStates([]);
  const selectedPriceLabel =
    selectedVariant?.priceLabel ?? priceLabel(input.product);

  return {
    action: selectedVariant
      ? selectedVariant.disabled
        ? {
            disabled: true,
            label: "Unavailable",
            reason:
              selectedVariant.unavailableReason ??
              "Selected option is unavailable right now.",
          }
        : {
            disabled: false,
            label: "Add to cart",
            reason: "Availability rechecks before checkout.",
          }
      : {
          disabled: true,
          label: "Unavailable",
          reason: "Product options are unavailable right now.",
        },
    gallery,
    metadata: buildPublicCatalogDetailMetadata({
      availabilityText: selectedAvailability.label,
      brandName: input.product.brandName,
      categories: input.categories,
      ...(primaryImage?.alt ? { imageAlt: primaryImage.alt } : {}),
      ...(primaryImage?.src ? { imageSrc: primaryImage.src } : {}),
      priceLabel: selectedPriceLabel,
      product: input.product,
    }),
    product: {
      availability: selectedAvailability,
      brandName: input.product.brandName,
      categories: input.categories,
      description: input.product.description,
      id: input.product.id,
      name: input.product.name,
      priceCentavos:
        selectedVariant?.priceCentavos ?? input.product.lowestPrice,
      priceLabel: selectedPriceLabel,
      primaryImage,
      slug: input.product.slug,
      summary: input.product.summary,
    },
    recoveryLinks: detailRecoveryLinks(input.categories),
    selectedVariantId: selectedVariant?.id ?? null,
    variants,
  };
}

export class DrizzlePublicCatalogRepository implements PublicCatalogRepository {
  constructor(
    private readonly db: AppDb,
    private readonly categoryRepository: CategoryRepository,
    private readonly photoRepository: PhotoRepository,
    private readonly productRepository: ProductRepository,
    private readonly variantRepository: VariantRepository
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

  async findActiveBrandBySlug(
    slug: string
  ): Promise<PublicCatalogBrandOption | null> {
    const cleanSlug = slug.trim();

    if (!cleanSlug) {
      return null;
    }

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
          sql`lower(${brands.slug}) = ${cleanSlug.toLowerCase()}`
        )
      )
      .limit(1);

    return brand ? toBrandOption(brand) : null;
  }

  async listActiveBrandOptions(): Promise<PublicCatalogBrandOption[]> {
    const rows = await this.db
      .select({
        id: brands.id,
        name: brands.name,
        slug: brands.slug,
      })
      .from(brands)
      .where(eq(brands.status, "ACTIVE"))
      .orderBy(sql`lower(${brands.name})`, asc(brands.id));

    return rows.map(toBrandOption);
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

  async findPublishedProductDetailBySlug(
    slug: string
  ): Promise<PublicCatalogDetailResult | null> {
    const cleanSlug = slug.trim();

    if (!cleanSlug) {
      return null;
    }

    const product = await this.productRepository.findBySlug(cleanSlug);

    if (!product || product.status !== "PUBLISHED") {
      return null;
    }

    const [visibleCategories, galleryPhotos, variants] = await Promise.all([
      this.listVisibleCategories(product.id),
      this.photoRepository.listByProductId(product.id),
      this.listAllVariants(product.id),
    ]);

    return detailResultFromSource({
      categories: visibleCategories,
      galleryPhotos,
      product,
      variants,
    });
  }

  async listPublishedProductCards(
    input: PublicCatalogBrowseInput
  ): Promise<PublicCatalogBrowseResult> {
    const result = await this.productRepository.list({
      ...(input.brandIds ? { brandIds: input.brandIds } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.categoryIds ? { categoryIds: input.categoryIds } : {}),
      ...(input.inventoryStates
        ? { inventoryStates: input.inventoryStates }
        : {}),
      ...(input.maxPriceCentavos !== undefined
        ? { maxPriceCentavos: input.maxPriceCentavos }
        : {}),
      ...(input.minPriceCentavos !== undefined
        ? { minPriceCentavos: input.minPriceCentavos }
        : {}),
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

  private async listAllVariants(
    productId: string
  ): Promise<ProductVariantRecord[]> {
    const items: ProductVariantRecord[] = [];
    let page = 1;

    while (true) {
      const result = await this.variantRepository.listByProductId(productId, {
        page,
        pageSize: 100,
      });

      items.push(...result.items);

      if (result.totalPages <= page || result.items.length === 0) {
        break;
      }

      page += 1;
    }

    return items;
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

  private async listVisibleCategories(
    productId: string
  ): Promise<PublicCatalogCategoryOption[]> {
    const rows = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(product_categories)
      .innerJoin(categories, eq(categories.id, product_categories.category_id))
      .where(
        and(
          eq(product_categories.product_id, productId),
          eq(categories.status, "ACTIVE"),
          eq(categories.is_visible, true)
        )
      )
      .orderBy(
        asc(categories.sort_order),
        asc(categories.name),
        asc(categories.id)
      );

    return rows.map(toCategoryOption);
  }
}

export function createPublicCatalogRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzlePublicCatalogRepository(
      db,
      new DrizzleCategoryRepository(db),
      new DrizzlePhotoRepository({
        db,
        resolvePublicUrl: publicProductAssetUrl,
      }),
      new DrizzleProductRepository(db),
      new DrizzleVariantRepository(db)
    ),
  };
}
