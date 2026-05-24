import { normalizePublicCatalogQuery } from "@/domain/products/public-catalog";
import type {
  PublicCatalogQuery,
  PublicCatalogQueryInput,
} from "@/domain/products/public-types";
import type {
  StorefrontCatalogPageData,
  StorefrontCatalogPageError,
  StorefrontCatalogView,
} from "@/features/product-catalog/types";
import { createPublicCatalogRepositories } from "@/server/repositories/PublicCatalogRepository";
import { PublicCatalogService } from "@/server/services/PublicCatalogService";
import type { GeneralError } from "@/utils/general/error";

const defaultQuery: PublicCatalogQuery = {
  page: 1,
  pageSize: 20,
  q: "",
  sort: "new",
};

type RuntimeEnv = Partial<Env> & Record<string, unknown>;

export type StorefrontProductPlaceholderPageData = {
  error: StorefrontCatalogPageError | null;
  exists: boolean;
  status: 200 | 404 | 503;
};

function parseView(value: string | null): StorefrontCatalogView {
  return value === "categories" ? "categories" : "grid";
}

function rawParam(params: URLSearchParams, name: string): string | undefined {
  return params.has(name) ? (params.get(name) ?? "") : undefined;
}

function requestedQuery(
  baseUrl: URL,
  categorySlug?: string
): PublicCatalogQueryInput {
  const categoryFromQuery = baseUrl.searchParams.get("category")?.trim();
  const cleanCategorySlug = categorySlug?.trim();

  return {
    ...(cleanCategorySlug
      ? { category: cleanCategorySlug }
      : categoryFromQuery
        ? { category: categoryFromQuery }
        : {}),
    page: rawParam(baseUrl.searchParams, "page"),
    pageSize: rawParam(baseUrl.searchParams, "pageSize"),
    q: baseUrl.searchParams.get("q")?.trim() ?? "",
    sort: rawParam(baseUrl.searchParams, "sort"),
  };
}

function displayQueryFromInput(
  input: PublicCatalogQueryInput
): PublicCatalogQuery {
  const normalized = normalizePublicCatalogQuery(input);

  if (!normalized.error) {
    return normalized.content;
  }

  const category = input.category?.trim();

  return {
    ...(category ? { category } : {}),
    ...defaultQuery,
    q: input.q?.trim() ?? "",
  };
}

function catalogError(input: {
  categorySlug?: string;
  error?: GeneralError;
  message?: string;
}): StorefrontCatalogPageError {
  if (input.error?.code === "VALIDATION_FAILED") {
    return {
      code: "VALIDATION_FAILED",
      message: "Update the filters and try again.",
      title: "Invalid catalog filters",
    };
  }

  if (input.error?.code === "RESOURCE_NOT_FOUND" && input.categorySlug) {
    return {
      code: "RESOURCE_NOT_FOUND",
      message: "Category not found. Browse another category or all products.",
      title: "Category not found",
    };
  }

  return {
    code: input.error?.code ?? "PROVIDER_UNAVAILABLE",
    message:
      input.message?.trim() ||
      "Catalog is unavailable right now. Try again soon.",
    title: "Catalog unavailable",
  };
}

export async function loadStorefrontCatalogPageData(input: {
  baseUrl: URL;
  categorySlug?: string;
  runtimeEnv?: RuntimeEnv;
}): Promise<StorefrontCatalogPageData> {
  const queryInput = requestedQuery(input.baseUrl, input.categorySlug);
  const view = parseView(input.baseUrl.searchParams.get("view"));
  const query = displayQueryFromInput(queryInput);
  const db = input.runtimeEnv?.DB;

  if (!db) {
    return {
      catalog: null,
      categories: [],
      error: catalogError({ message: "Catalog is unavailable right now." }),
      query,
      view,
    };
  }

  const repositories = createPublicCatalogRepositories(db as D1Database);
  const service = new PublicCatalogService({
    ...repositories,
  });

  const [catalogResult, categoryResult] = await Promise.all([
    service.listCatalog({
      query: queryInput,
      requestId: "storefront_catalog_page",
    }),
    service.listCategories({
      requestId: "storefront_catalog_categories",
    }),
  ]);
  const categories = categoryResult.error ? [] : categoryResult.content.items;

  if (catalogResult.error) {
    return {
      catalog: null,
      categories,
      error: catalogError({
        categorySlug: query.category,
        error: catalogResult.error,
      }),
      query,
      view,
    };
  }

  return {
    catalog: catalogResult.content,
    categories,
    error: null,
    query: catalogResult.content.query,
    view,
  };
}

export async function loadStorefrontProductPlaceholderPageData(input: {
  runtimeEnv?: RuntimeEnv;
  slug: string;
}): Promise<StorefrontProductPlaceholderPageData> {
  const slug = input.slug.trim();

  if (!slug) {
    return {
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Product not found. Browse current products instead.",
        title: "Product not found",
      },
      exists: false,
      status: 404,
    };
  }

  const db = input.runtimeEnv?.DB;

  if (!db) {
    return {
      error: {
        code: "PROVIDER_UNAVAILABLE",
        message: "Product page is unavailable right now. Try again soon.",
        title: "Product unavailable",
      },
      exists: false,
      status: 503,
    };
  }

  try {
    const repositories = createPublicCatalogRepositories(db as D1Database);
    const exists =
      await repositories.repository.findPublishedProductExistsBySlug(slug);

    return {
      error: exists
        ? null
        : {
            code: "RESOURCE_NOT_FOUND",
            message: "Product not found. Browse current products instead.",
            title: "Product not found",
          },
      exists,
      status: exists ? 200 : 404,
    };
  } catch {
    return {
      error: {
        code: "PROVIDER_UNAVAILABLE",
        message: "Product page is unavailable right now. Try again soon.",
        title: "Product unavailable",
      },
      exists: false,
      status: 503,
    };
  }
}
