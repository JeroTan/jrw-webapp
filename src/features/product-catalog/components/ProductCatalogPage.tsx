import * as React from "react";
import { buildCategoryHref } from "../api";
import type {
  StorefrontCatalogPageError,
  StorefrontCatalogPageMode,
  StorefrontCatalogQuery,
  StorefrontCatalogResult,
  StorefrontCatalogView,
  StorefrontCategoryNavigationMode,
} from "../types";
import { CatalogPagination } from "./CatalogPagination";
import { ProductCatalogEmptyState } from "./ProductCatalogEmptyState";
import { ProductCatalogErrorState } from "./ProductCatalogErrorState";
import { ProductCatalogFilters } from "./ProductCatalogFilters";
import { ProductGrid } from "./ProductGrid";

type ProductCatalogPageProps = {
  basePath: string;
  catalog: StorefrontCatalogResult | null;
  categories: Array<{
    href: string;
    id: string;
    name: string;
    slug: string;
  }>;
  categoryNavigationMode: StorefrontCategoryNavigationMode;
  error?: StorefrontCatalogPageError | null;
  mode: StorefrontCatalogPageMode;
  query?: StorefrontCatalogQuery;
  showCategoryDirectory?: boolean;
  showFilters?: boolean;
  view?: StorefrontCatalogView;
};

const defaultQuery: StorefrontCatalogQuery = {
  page: 1,
  pageSize: 20,
  q: "",
  sort: "new",
};

function heroContent(input: {
  mode: StorefrontCatalogPageMode;
  selectedCategoryName?: string;
}) {
  switch (input.mode) {
    case "home":
      return {
        copy: "Search published products, browse categories, and open product pages from one storefront view.",
        kicker: "JRW. Storefront",
        title: "Lifestyle products, live in catalog.",
      };
    case "category":
      return {
        copy: input.selectedCategoryName
          ? `Browse published products in ${input.selectedCategoryName}.`
          : "Browse published products by category.",
        kicker: "Category",
        title: input.selectedCategoryName || "Category browsing",
      };
    default:
      return {
        copy: "Search published products, move through categories, and keep browsing JRW products.",
        kicker: "Products",
        title: "Browse products.",
      };
  }
}

export function ProductCatalogPage({
  basePath,
  catalog,
  categories,
  categoryNavigationMode,
  error = null,
  mode,
  query,
  showCategoryDirectory = false,
  showFilters = true,
  view = "grid",
}: ProductCatalogPageProps) {
  const resolvedQuery = query ?? catalog?.query ?? defaultQuery;
  const selectedCategoryName = catalog?.selectedCategory?.name;
  const hero = heroContent({
    mode,
    ...(selectedCategoryName ? { selectedCategoryName } : {}),
  });

  return (
    <section
      aria-labelledby="product-catalog-title"
      className="grid gap-grid-md"
    >
      <header className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md">
        <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
          {hero.kicker}
        </p>
        <h1
          className="max-w-[18ch] font-identity text-[clamp(2rem,8vw,4rem)] [overflow-wrap:anywhere]"
          id="product-catalog-title"
        >
          {hero.title}
        </h1>
        <p className="max-w-[68ch] text-[0.9375rem] text-brand-muted">
          {hero.copy}
        </p>
        <div className="flex flex-wrap gap-grid-xs">
          <a
            className="inline-flex min-h-control-md items-center justify-center border border-brand-border-strong bg-brand-accent px-grid-sm font-system text-xs font-bold uppercase text-brand-surface no-underline hover:border-brand-accent focus-visible:border-brand-accent"
            href="/products"
          >
            Browse products
          </a>
          <a
            className="inline-flex min-h-control-md items-center justify-center border border-brand-border-strong px-grid-sm font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent"
            href="/products?view=categories"
          >
            Browse categories
          </a>
        </div>
      </header>

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
              href="/products?view=categories"
            >
              View all categories
            </a>
          </div>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-grid-sm p-0">
            {categories.map((category) => (
              <li key={category.id}>
                <a
                  className="grid min-h-[132px] gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm no-underline hover:border-brand-accent focus-visible:border-brand-accent"
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
            ? "grid gap-grid-sm md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]"
            : "grid gap-grid-sm"
        }
      >
        {showFilters ? (
          <aside className="self-start border border-brand-border-strong bg-brand-surface p-grid-sm">
            <ProductCatalogFilters
              basePath={basePath}
              categories={categories}
              categoryNavigationMode={categoryNavigationMode}
              query={resolvedQuery}
              view={view}
            />
          </aside>
        ) : null}

        <div className="grid gap-grid-sm">
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

export default ProductCatalogPage;
