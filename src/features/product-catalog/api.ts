import type {
  StorefrontCatalogQuery,
  StorefrontCatalogCategoryListResult,
  StorefrontCatalogPageData,
  StorefrontCatalogPageError,
  StorefrontCatalogResult,
  StorefrontCatalogView,
} from "./types";

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
};

function apiUrl(baseUrl: URL, path: string): string {
  return new URL(path, baseUrl).toString();
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseView(value: string | null): StorefrontCatalogView {
  return value === "categories" ? "categories" : "grid";
}

function requestedQuery(
  baseUrl: URL,
  categorySlug?: string
): StorefrontCatalogQuery {
  const categoryFromQuery = baseUrl.searchParams.get("category")?.trim();

  return {
    ...(categorySlug
      ? { category: categorySlug }
      : categoryFromQuery
        ? { category: categoryFromQuery }
        : {}),
    page: parsePositiveInteger(baseUrl.searchParams.get("page"), 1),
    pageSize: Math.min(
      parsePositiveInteger(baseUrl.searchParams.get("pageSize"), 20),
      100
    ),
    q: baseUrl.searchParams.get("q")?.trim() ?? "",
    sort: "new",
  };
}

async function safeEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return {};
  }
}

function toCatalogError(input: {
  categorySlug?: string;
  fallbackCode?: string;
  message?: string;
}): StorefrontCatalogPageError {
  if (input.fallbackCode === "RESOURCE_NOT_FOUND" && input.categorySlug) {
    return {
      code: "RESOURCE_NOT_FOUND",
      message: "Category not found. Browse another category or all products.",
      title: "Category not found",
    };
  }

  return {
    code: input.fallbackCode ?? "INTERNAL_ERROR",
    message:
      input.message?.trim() ||
      "Catalog is unavailable right now. Try again soon.",
    title: "Catalog unavailable",
  };
}

export function buildCatalogHref(
  basePath: string,
  query: StorefrontCatalogQuery,
  view: StorefrontCatalogView,
  overrides: Partial<StorefrontCatalogQuery> = {}
): string {
  const next = {
    ...query,
    ...overrides,
  };
  const params = new URLSearchParams();

  if (next.q.trim().length > 0) {
    params.set("q", next.q.trim());
  }

  if (next.page > 1) {
    params.set("page", String(next.page));
  }

  if (next.pageSize !== 20) {
    params.set("pageSize", String(next.pageSize));
  }

  params.set("sort", "new");

  if (view === "categories") {
    params.set("view", "categories");
  }

  if (next.category?.trim()) {
    params.set("category", next.category.trim());
  }

  const search = params.toString();
  return search.length > 0 ? `${basePath}?${search}` : basePath;
}

export function buildCategoryHref(
  slug: string,
  query: StorefrontCatalogQuery,
  view: StorefrontCatalogView
): string {
  const params = new URLSearchParams();

  if (query.q.trim().length > 0) {
    params.set("q", query.q.trim());
  }

  if (query.pageSize !== 20) {
    params.set("pageSize", String(query.pageSize));
  }

  params.set("sort", "new");

  if (view === "categories") {
    params.set("view", "categories");
  }

  const search = params.toString();
  const path = `/categories/${encodeURIComponent(slug)}`;

  return search.length > 0 ? `${path}?${search}` : path;
}

export async function fetchStorefrontCatalogPageData(input: {
  baseUrl: URL;
  categorySlug?: string;
}): Promise<StorefrontCatalogPageData> {
  const query = requestedQuery(input.baseUrl, input.categorySlug);
  const view = parseView(input.baseUrl.searchParams.get("view"));
  const catalogParams = new URLSearchParams();

  if (query.q.trim().length > 0) {
    catalogParams.set("q", query.q.trim());
  }

  if (query.page > 1) {
    catalogParams.set("page", String(query.page));
  }

  if (query.pageSize !== 20) {
    catalogParams.set("pageSize", String(query.pageSize));
  }

  if (query.category?.trim()) {
    catalogParams.set("category", query.category.trim());
  }

  catalogParams.set("sort", "new");

  const [catalogResponse, categoryResponse] = await Promise.all([
    fetch(
      apiUrl(
        input.baseUrl,
        `/api/storefront/catalog?${catalogParams.toString()}`
      ),
      {
        headers: { accept: "application/json" },
      }
    ),
    fetch(apiUrl(input.baseUrl, "/api/storefront/catalog/categories"), {
      headers: { accept: "application/json" },
    }),
  ]);

  const categoryEnvelope =
    await safeEnvelope<StorefrontCatalogCategoryListResult>(categoryResponse);
  const categories = categoryEnvelope.data?.items ?? [];

  if (!catalogResponse.ok) {
    const envelope =
      await safeEnvelope<StorefrontCatalogResult>(catalogResponse);

    return {
      catalog: null,
      categories,
      error: toCatalogError({
        categorySlug: input.categorySlug,
        fallbackCode: envelope.error?.code,
        message: envelope.error?.message,
      }),
      query,
      view,
    };
  }

  const catalogEnvelope =
    await safeEnvelope<StorefrontCatalogResult>(catalogResponse);
  const catalog = catalogEnvelope.data ?? null;

  return {
    catalog,
    categories,
    error: catalog
      ? null
      : toCatalogError({
          categorySlug: input.categorySlug,
          message: "Catalog data is unavailable right now. Try again soon.",
        }),
    query: catalog?.query ?? query,
    view,
  };
}
