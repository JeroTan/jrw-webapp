import * as React from "react";

import { buildCategoryHref } from "./api";
import type {
  StorefrontCatalogPageError,
  StorefrontCatalogQuery,
  StorefrontCatalogResult,
  StorefrontCatalogView,
  StorefrontCategoryNavigationMode,
} from "./types";
import { CatalogPagination } from "./components/CatalogPagination";
import { ProductCatalogEmptyState } from "./components/ProductCatalogEmptyState";
import { ProductCatalogErrorState } from "./components/ProductCatalogErrorState";
import { ProductCatalogFilters } from "./components/ProductCatalogFilters";
import { ProductGrid } from "./components/ProductGrid";

type ProductCatalogPageProps = {
  basePath: string;
  catalog: StorefrontCatalogResult | null;
  brands: Array<{
    href: string;
    id: string;
    name: string;
    slug: string;
  }>;
  categories: Array<{
    href: string;
    id: string;
    name: string;
    slug: string;
  }>;
  categoryNavigationMode: StorefrontCategoryNavigationMode;
  error?: StorefrontCatalogPageError | null;
  query?: StorefrontCatalogQuery;
  showCategoryDirectory?: boolean;
  showFilters?: boolean;
  view?: StorefrontCatalogView;
  baseClassname?: string;
};

const defaultQuery: StorefrontCatalogQuery = {
  brands: [],
  categories: [],
  page: 1,
  pageSize: 20,
  q: "",
  sort: "new",
  stock: [],
};

export default function ProductCatalog({
  basePath,
  brands,
  catalog,
  categories,
  categoryNavigationMode,
  error = null,
  query,
  showCategoryDirectory = false,
  showFilters = true,
  view = "grid",
  baseClassname = "",
}: ProductCatalogPageProps) {
  const resolvedQuery = query ?? catalog?.query ?? defaultQuery;

  return (
    <section
      aria-label="Product catalog"
      className={`grid gap-grid-md ${baseClassname}`}
    >
      {showCategoryDirectory && categories.length > 0 ? (
        <section
          className="grid gap-grid-sm"
          aria-labelledby="catalog-category-directory-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-grid-xs">
            <h2
              className="m-0 text-[clamp(1.55rem,4.8vw,2.6rem)]"
              id="catalog-category-directory-title"
            >
              Shop by category
            </h2>
            <a
              className="inline-flex min-h-control-md items-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent"
              href="/categories"
            >
              View all categories
            </a>
          </div>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-grid-sm p-0">
            {categories.map((category) => (
              <li key={category.id}>
                <a
                  className="grid min-h-33 gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm no-underline hover:border-brand-accent focus-visible:border-brand-accent"
                  href={buildCategoryHref(category.slug, resolvedQuery, view)}
                >
                  <span className="font-identity text-[1.15rem] font-bold">
                    {category.name}
                  </span>
                  <span className="text-[0.8125rem] text-brand-muted">
                    Browse products in this category.
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div
        className={
          showFilters
            ? "grid items-start md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]"
            : "grid"
        }
      >
        {showFilters ? (
          <aside className="self-start border border-brand-border bg-background p-grid-sm">
            <ProductCatalogFilters
              basePath={basePath}
              brands={brands}
              categories={categories}
              categoryNavigationMode={categoryNavigationMode}
              query={resolvedQuery}
              view={view}
            />
          </aside>
        ) : null}

        <div className="grid content-start gap-grid-sm self-start">
          {error ? (
            <ProductCatalogErrorState categories={categories} error={error} />
          ) : catalog?.items.length ? (
            <>
              <ProductGrid products={catalog.items} />
              <CatalogPagination
                basePath={basePath}
                page={catalog.pagination.page}
                query={catalog.query}
                totalItems={catalog.pagination.totalItems}
                totalPages={catalog.pagination.totalPages}
                view={view}
              />
            </>
          ) : catalog?.emptyState ? (
            <ProductCatalogEmptyState
              categories={categories}
              emptyState={catalog.emptyState}
            />
          ) : (
            <ProductCatalogErrorState
              categories={categories}
              error={{
                code: "INTERNAL_ERROR",
                message:
                  "Catalog data is unavailable right now. Try again soon.",
                title: "Catalog unavailable",
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
