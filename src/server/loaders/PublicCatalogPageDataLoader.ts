import { normalizePublicCatalogQuery } from "@/domain/products/public-catalog";
import type {
  PublicCatalogQuery,
  PublicCatalogQueryInput,
} from "@/domain/products/public-types";
import type {
  StorefrontCategoryIndexPageData,
  StorefrontCatalogPageData,
  StorefrontCatalogPageError,
  StorefrontCatalogView,
} from "@/features/product-catalog/types";
import type {
  StorefrontProductDetailPageData,
  StorefrontProductDetailPageError,
} from "@/features/product-detail/types";
import { createPublicCatalogRepositories } from "@/server/repositories/PublicCatalogRepository";
import { PublicCatalogService } from "@/server/services/PublicCatalogService";
import type { GeneralError } from "@/utils/general/error";

const defaultQuery: PublicCatalogQuery = {
  brands: [],
  categories: [],
  page: 1,
  pageSize: 20,
  q: "",
  sort: "new",
  stock: [],
};

type RuntimeEnv = Partial<Env> & Record<string, unknown>;

function parseView(value: string | null): StorefrontCatalogView {
  return value === "categories" ? "categories" : "grid";
}

function rawParam(params: URLSearchParams, name: string): string | undefined {
  return params.has(name) ? (params.get(name) ?? "") : undefined;
}

function rawParams(
  params: URLSearchParams,
  name: string
): string[] | undefined {
  return params.has(name) ? params.getAll(name) : undefined;
}

function requestedQuery(
  baseUrl: URL,
  categorySlug?: string
): PublicCatalogQueryInput {
  const cleanCategorySlug = categorySlug?.trim();

  return {
    ...(cleanCategorySlug
      ? { category: [cleanCategorySlug] }
      : rawParams(baseUrl.searchParams, "category")
        ? { category: rawParams(baseUrl.searchParams, "category") }
        : {}),
    ...(rawParams(baseUrl.searchParams, "brand")
      ? { brand: rawParams(baseUrl.searchParams, "brand") }
      : {}),
    maxPrice: rawParam(baseUrl.searchParams, "maxPrice"),
    minPrice: rawParam(baseUrl.searchParams, "minPrice"),
    page: rawParam(baseUrl.searchParams, "page"),
    pageSize: rawParam(baseUrl.searchParams, "pageSize"),
    q: baseUrl.searchParams.get("q")?.trim() ?? "",
    sort: rawParam(baseUrl.searchParams, "sort"),
    ...(rawParams(baseUrl.searchParams, "stock")
      ? { stock: rawParams(baseUrl.searchParams, "stock") }
      : {}),
  };
}

function displayList(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.map((item) => item.trim()).filter((item) => item.length > 0);
}

function displayQueryFromInput(
  input: PublicCatalogQueryInput
): PublicCatalogQuery {
  const normalized = normalizePublicCatalogQuery(input);

  if (!normalized.error) {
    return normalized.content;
  }

  const categories = displayList(input.category);
  const brands = displayList(input.brand);

  return {
    ...defaultQuery,
    brands,
    categories,
    ...(categories[0] ? { category: categories[0] } : {}),
    q: input.q?.trim() ?? "",
    stock: [],
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

function detailError(input: {
  error?: GeneralError;
  message?: string;
}): StorefrontProductDetailPageError {
  if (input.error?.code === "RESOURCE_NOT_FOUND") {
    return {
      code: "RESOURCE_NOT_FOUND",
      message: "Product not found. Browse current products instead.",
      title: "Product not found",
    };
  }

  return {
    code: input.error?.code ?? "PROVIDER_UNAVAILABLE",
    message:
      input.message?.trim() ||
      "Product page is unavailable right now. Try again soon.",
    title: "Product unavailable",
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
      brands: [],
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

  const [catalogResult, categoryResult, brandResult] = await Promise.all([
    service.listCatalog({
      query: queryInput,
      requestId: "storefront_catalog_page",
    }),
    service.listCategories({
      requestId: "storefront_catalog_categories",
    }),
    service.listBrands({
      requestId: "storefront_catalog_brands",
    }),
  ]);
  const categories = categoryResult.error ? [] : categoryResult.content.items;
  const brands = brandResult.error ? [] : brandResult.content.items;

  if (catalogResult.error) {
    return {
      brands,
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
    brands,
    catalog: catalogResult.content,
    categories,
    error: null,
    query: catalogResult.content.query,
    view,
  };
}

export async function loadStorefrontCategoryIndexPageData(input: {
  baseUrl: URL;
  runtimeEnv?: RuntimeEnv;
}): Promise<StorefrontCategoryIndexPageData> {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    return {
      categories: [],
      error: catalogError({ message: "Categories are unavailable right now." }),
      sections: [],
    };
  }

  const repositories = createPublicCatalogRepositories(db as D1Database);
  const service = new PublicCatalogService({
    ...repositories,
  });
  const categoryResult = await service.listCategories({
    requestId: "storefront_category_index_categories",
  });

  if (categoryResult.error) {
    return {
      categories: [],
      error: catalogError({ error: categoryResult.error }),
      sections: [],
    };
  }

  const sections = await Promise.all(
    categoryResult.content.items.map(async (category) => {
      const catalogResult = await service.listCatalog({
        query: {
          category: [category.slug],
          page: 1,
          pageSize: 4,
          sort: "new",
        },
        requestId: `storefront_category_index_${category.slug}`,
      });

      return {
        category,
        productCount: catalogResult.error
          ? 0
          : catalogResult.content.pagination.totalItems,
        products: catalogResult.error ? [] : catalogResult.content.items,
      };
    })
  );

  return {
    categories: categoryResult.content.items,
    error: null,
    sections,
  };
}

export async function loadStorefrontProductDetailPageData(input: {
  runtimeEnv?: RuntimeEnv;
  slug: string;
}): Promise<StorefrontProductDetailPageData> {
  const slug = input.slug.trim();

  if (!slug) {
    return {
      detail: null,
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Product not found. Browse current products instead.",
        title: "Product not found",
      },
      status: 404,
    };
  }

  const db = input.runtimeEnv?.DB;

  if (!db) {
    return {
      detail: null,
      error: detailError({
        message: "Product page is unavailable right now. Try again soon.",
      }),
      status: 503,
    };
  }

  try {
    const repositories = createPublicCatalogRepositories(db as D1Database);
    const service = new PublicCatalogService({
      ...repositories,
    });
    const result = await service.getProductDetail({
      requestId: "storefront_product_detail_page",
      slug,
    });

    return {
      detail: result.error ? null : result.content,
      error: result.error
        ? detailError({
            error: result.error,
          })
        : null,
      status:
        result.error?.code === "RESOURCE_NOT_FOUND"
          ? 404
          : result.error
            ? 503
            : 200,
    };
  } catch {
    return {
      detail: null,
      error: detailError({
        message: "Product page is unavailable right now. Try again soon.",
      }),
      status: 503,
    };
  }
}
