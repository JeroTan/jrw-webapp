import { normalizePublicCatalogQuery } from "@/domain/products/public-catalog";
import type {
  PublicCatalogCategoryListResult,
  PublicCatalogResult,
} from "@/domain/products/public-types";
import type { PublicCatalogRepository } from "@/server/repositories/PublicCatalogRepository";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

export type PublicCatalogListServiceInput = {
  query: {
    category?: string;
    page?: number;
    pageSize?: number;
    q?: string;
    sort?: string;
  };
  requestId: string;
};

export type PublicCatalogCategoryListServiceInput = {
  requestId: string;
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
  page: number;
  q: string;
  totalItems: number;
  totalPages: number;
}) {
  if (input.category) {
    return {
      actionHref: "/products",
      actionLabel: "Browse all products",
      message: "This category has no published products yet.",
      title: "Category empty",
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

  return {
    actionHref: "/products?view=categories",
    actionLabel: "Browse categories",
    message: "Published JRW products will appear here when ready.",
    title: "Products coming soon",
  };
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

      if (normalizedQuery.content.category && !selectedCategory) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", {
            category: normalizedQuery.content.category,
          })
        );
      }

      const browseResult = await this.repository.listPublishedProductCards({
        ...(selectedCategory ? { categoryId: selectedCategory.id } : {}),
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
                page: browseResult.pagination.page,
                q: normalizedQuery.content.q,
                totalItems: browseResult.pagination.totalItems,
                totalPages: browseResult.pagination.totalPages,
              })
            : null,
        items: browseResult.items,
        pagination: browseResult.pagination,
        query: normalizedQuery.content,
        selectedCategory,
      });
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
}
