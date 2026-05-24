import type { StorefrontCatalogQuery, StorefrontCatalogView } from "./types";

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
