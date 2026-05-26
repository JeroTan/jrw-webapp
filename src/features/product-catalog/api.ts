import type { StorefrontCatalogQuery, StorefrontCatalogView } from "./types";

type CatalogHrefOverrides = Partial<StorefrontCatalogQuery>;

function appendValues(
  params: URLSearchParams,
  name: string,
  values: string[] | undefined
) {
  for (const value of values ?? []) {
    const cleanValue = value.trim();

    if (cleanValue.length > 0) {
      params.append(name, cleanValue);
    }
  }
}

function priceInputValue(value: number | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const pesos = value / 100;
  return Number.isInteger(pesos) ? String(pesos) : pesos.toFixed(2);
}

export function buildCatalogHref(
  basePath: string,
  query: StorefrontCatalogQuery,
  view: StorefrontCatalogView,
  overrides: CatalogHrefOverrides = {}
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

  appendValues(
    params,
    "category",
    next.categories.length > 0
      ? next.categories
      : next.category
        ? [next.category]
        : []
  );
  appendValues(params, "brand", next.brands);
  appendValues(params, "stock", next.stock);

  const minPrice = priceInputValue(next.minPriceCentavos);
  const maxPrice = priceInputValue(next.maxPriceCentavos);

  if (minPrice !== undefined) {
    params.set("minPrice", minPrice);
  }

  if (maxPrice !== undefined) {
    params.set("maxPrice", maxPrice);
  }

  params.set("sort", "new");

  if (view === "categories") {
    params.set("view", "categories");
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

  params.set("sort", "new");

  if (view === "categories") {
    params.set("view", "categories");
  }

  const search = params.toString();
  const path = `/categories/${encodeURIComponent(slug)}`;

  return search.length > 0 ? `${path}?${search}` : path;
}
