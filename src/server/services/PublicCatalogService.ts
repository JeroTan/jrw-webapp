import { normalizePublicCatalogQuery } from "@/domain/products/public-catalog";
import type {
  PublicCatalogBrandListResult,
  PublicCatalogBrandOption,
  PublicCatalogCategoryListResult,
  PublicCatalogCategoryOption,
  PublicCatalogDetailResult,
  PublicCatalogQueryInput,
  PublicCatalogResult,
  PublicCatalogStockFilter,
} from "@/domain/products/public-types";
import type { InventoryState } from "@/domain/products/types";
import type { PublicCatalogRepository } from "@/server/repositories/PublicCatalogRepository";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

export type PublicCatalogListServiceInput = {
  query: PublicCatalogQueryInput;
  requestId: string;
};

export type PublicCatalogCategoryListServiceInput = {
  requestId: string;
};

export type PublicCatalogBrandListServiceInput = {
  requestId: string;
};

export type PublicCatalogDetailServiceInput = {
  requestId: string;
  slug: string;
};

export type PublicCatalogServiceOptions = {
  repository: PublicCatalogRepository;
};

function serviceError(
  code: "VALIDATION_FAILED" | "RESOURCE_NOT_FOUND" | "PROVIDER_UNAVAILABLE",
  data: Record<string, unknown> = {}
) {
  return new GeneralError(data, code);
}

function providerFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    /D1_|SQLITE_|database|query|constraint|prepare|execute|transaction|storage/i.test(
      error.message
    )
  );
}

function buildEmptyState(input: {
  category?: { name: string } | null;
  hasFilters: boolean;
  page: number;
  q: string;
  totalItems: number;
  totalPages: number;
}) {
  if (
    input.totalItems > 0 &&
    input.totalPages > 0 &&
    input.page > input.totalPages
  ) {
    return {
      actionHref: "/products",
      actionLabel: "Return to first page",
      message: "This page has no products. Try an earlier page.",
      title: "No products on this page",
    };
  }

  if (input.category && input.q.trim().length > 0) {
    return {
      actionHref: "/products",
      actionLabel: "Browse all products",
      message: `Try a different term in ${input.category.name} or browse all products.`,
      title: "No products match this category search",
    };
  }

  if (input.q.trim().length > 0) {
    return {
      actionHref: "/products",
      actionLabel: "Clear search",
      message: "Try a different term or browse all products.",
      title: "No products match this search",
    };
  }

  if (input.hasFilters) {
    return {
      actionHref: "/products",
      actionLabel: "Clear filters",
      message: "Try fewer filters or browse all products.",
      title: "No products match these filters",
    };
  }

  if (input.category) {
    return {
      actionHref: "/products",
      actionLabel: "Browse all products",
      message: "This category has no published products yet.",
      title: "Category empty",
    };
  }

  return {
    actionHref: "/categories",
    actionLabel: "Browse categories",
    message: "Published JRW products will appear here when ready.",
    title: "Products coming soon",
  };
}

const stockFilterStateMap: Record<PublicCatalogStockFilter, InventoryState> = {
  available: "IN_STOCK",
  "low-stock": "LOW_STOCK",
  preorder: "PREORDER",
  unavailable: "OUT_OF_STOCK",
};

function inventoryStatesFromStockFilters(
  filters: PublicCatalogStockFilter[]
): InventoryState[] {
  return Array.from(
    new Set(filters.map((filter) => stockFilterStateMap[filter]))
  );
}

export class PublicCatalogService {
  private readonly repository: PublicCatalogRepository;

  constructor(options: PublicCatalogServiceOptions) {
    this.repository = options.repository;
  }

  async listCatalog(
    input: PublicCatalogListServiceInput
  ): Promise<AppResult<PublicCatalogResult>> {
    const normalizedQuery = normalizePublicCatalogQuery(input.query);

    if (normalizedQuery.error) {
      return Result.error(
        serviceError("VALIDATION_FAILED", normalizedQuery.error.data)
      );
    }

    try {
      const selectedCategory = normalizedQuery.content.category
        ? await this.repository.findActiveVisibleCategoryBySlug(
            normalizedQuery.content.category
          )
        : null;
      const selectedCategories =
        normalizedQuery.content.categories.length > 0
          ? await Promise.all(
              normalizedQuery.content.categories.map((category) =>
                this.repository.findActiveVisibleCategoryBySlug(category)
              )
            )
          : [];
      const selectedBrands =
        normalizedQuery.content.brands.length > 0
          ? await Promise.all(
              normalizedQuery.content.brands.map((brand) =>
                this.repository.findActiveBrandBySlug(brand)
              )
            )
          : [];
      const missingCategoryIndex = selectedCategories.findIndex(
        (category) => !category
      );
      const missingBrandIndex = selectedBrands.findIndex((brand) => !brand);

      if (missingCategoryIndex >= 0) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", {
            category: normalizedQuery.content.categories[missingCategoryIndex],
          })
        );
      }

      if (missingBrandIndex >= 0) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", {
            brand: normalizedQuery.content.brands[missingBrandIndex],
          })
        );
      }

      const validCategories = selectedCategories.filter(
        (category): category is PublicCatalogCategoryOption => Boolean(category)
      );
      const validBrands = selectedBrands.filter(
        (brand): brand is PublicCatalogBrandOption => Boolean(brand)
      );
      const categoryForContext =
        validCategories.length === 1 ? validCategories[0] : selectedCategory;
      const inventoryStates = inventoryStatesFromStockFilters(
        normalizedQuery.content.stock
      );

      const browseResult = await this.repository.listPublishedProductCards({
        ...(validBrands.length > 0
          ? { brandIds: validBrands.map((brand) => brand.id) }
          : {}),
        ...(validCategories.length > 0
          ? { categoryIds: validCategories.map((category) => category.id) }
          : {}),
        ...(categoryForContext
          ? { categoryName: categoryForContext.name }
          : {}),
        ...(inventoryStates.length > 0 ? { inventoryStates } : {}),
        ...(normalizedQuery.content.maxPriceCentavos !== undefined
          ? { maxPriceCentavos: normalizedQuery.content.maxPriceCentavos }
          : {}),
        ...(normalizedQuery.content.minPriceCentavos !== undefined
          ? { minPriceCentavos: normalizedQuery.content.minPriceCentavos }
          : {}),
        page: normalizedQuery.content.page,
        pageSize: normalizedQuery.content.pageSize,
        ...(normalizedQuery.content.q
          ? { search: normalizedQuery.content.q }
          : {}),
      });

      return Result.okay({
        emptyState:
          browseResult.items.length === 0
            ? buildEmptyState({
                category: selectedCategory,
                hasFilters:
                  normalizedQuery.content.brands.length > 0 ||
                  normalizedQuery.content.categories.length > 0 ||
                  normalizedQuery.content.stock.length > 0 ||
                  normalizedQuery.content.minPriceCentavos !== undefined ||
                  normalizedQuery.content.maxPriceCentavos !== undefined,
                page: browseResult.pagination.page,
                q: normalizedQuery.content.q,
                totalItems: browseResult.pagination.totalItems,
                totalPages: browseResult.pagination.totalPages,
              })
            : null,
        items: browseResult.items,
        pagination: browseResult.pagination,
        query: normalizedQuery.content,
        selectedCategory: categoryForContext ?? null,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async listBrands(
    _input: PublicCatalogBrandListServiceInput
  ): Promise<AppResult<PublicCatalogBrandListResult>> {
    try {
      const items = await this.repository.listActiveBrandOptions();

      return Result.okay({ items });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async listCategories(
    _input: PublicCatalogCategoryListServiceInput
  ): Promise<AppResult<PublicCatalogCategoryListResult>> {
    try {
      const items = await this.repository.listActiveVisibleCategoryOptions();

      return Result.okay({ items });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async getProductDetail(
    input: PublicCatalogDetailServiceInput
  ): Promise<AppResult<PublicCatalogDetailResult>> {
    const slug = input.slug.trim();

    if (!slug) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          reasons: ["slug:invalid_value"],
        })
      );
    }

    try {
      const detail =
        await this.repository.findPublishedProductDetailBySlug(slug);

      if (!detail) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", {
            slug,
          })
        );
      }

      return Result.okay(detail);
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }
}
