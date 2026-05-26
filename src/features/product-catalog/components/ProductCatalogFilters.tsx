import * as React from "react";
import { Button, ButtonLink, SearchInput, Select } from "@/components/ui";
import { buildCatalogHref, buildCategoryHref } from "../api";
import type {
  StorefrontCatalogCategoryOption,
  StorefrontCatalogQuery,
  StorefrontCatalogView,
  StorefrontCategoryNavigationMode,
} from "../types";

type ProductCatalogFiltersProps = {
  basePath: string;
  categories: StorefrontCatalogCategoryOption[];
  categoryNavigationMode: StorefrontCategoryNavigationMode;
  query: StorefrontCatalogQuery;
  view: StorefrontCatalogView;
};

function clearHref(
  basePath: string,
  categoryNavigationMode: StorefrontCategoryNavigationMode,
  view: StorefrontCatalogView
) {
  if (categoryNavigationMode === "route") {
    return buildCatalogHref(
      "/products",
      {
        page: 1,
        pageSize: 20,
        q: "",
        sort: "new",
      },
      view
    );
  }

  return buildCatalogHref(
    basePath,
    {
      page: 1,
      pageSize: 20,
      q: "",
      sort: "new",
    },
    view
  );
}

function categoryHref(input: {
  basePath: string;
  categoryNavigationMode: StorefrontCategoryNavigationMode;
  categorySlug: string;
  query: StorefrontCatalogQuery;
  view: StorefrontCatalogView;
}) {
  if (input.categoryNavigationMode === "route") {
    return buildCategoryHref(input.categorySlug, input.query, input.view);
  }

  return buildCatalogHref(input.basePath, input.query, input.view, {
    category: input.categorySlug,
    page: 1,
  });
}

export function ProductCatalogFilters({
  basePath,
  categories,
  categoryNavigationMode,
  query,
  view,
}: ProductCatalogFiltersProps) {
  const hasActiveFilters =
    query.q.trim().length > 0 ||
    Boolean(query.category) ||
    query.pageSize !== 20;

  return (
    <div className="grid gap-grid-sm">
      <form action={basePath} className="m-0 grid gap-grid-sm" method="get">
        <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
          Filters
        </p>

        <SearchInput
          defaultValue={query.q}
          id={`catalog-search-${basePath.replace(/[^a-z0-9]+/gi, "-")}`}
          label="Search products"
          name="q"
          placeholder="Search products"
          borderTone="subtle"
        />

        <Select
          defaultValue={String(query.pageSize)}
          label="Items per page"
          name="pageSize"
          borderTone="subtle"
          textSize="xs"
        >
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </Select>

        <input name="sort" type="hidden" value="new" />

        {view === "categories" ? (
          <input name="view" type="hidden" value="categories" />
        ) : null}

        {categoryNavigationMode === "query" && query.category ? (
          <input name="category" type="hidden" value={query.category} />
        ) : null}

        <Button borderTone="subtle" textSize="sm" type="submit">
          Apply filters
        </Button>

        {hasActiveFilters ? (
          <a
            className="inline-flex min-h-control-md items-center justify-center border border-brand-border-strong px-grid-sm font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent"
            href={clearHref(basePath, categoryNavigationMode, view)}
          >
            Clear filters
          </a>
        ) : null}
      </form>

      <div className="grid gap-grid-xs">
        <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
          Categories
        </p>
        <div className="flex flex-wrap gap-grid-xs">
          <ButtonLink
            aria-current={query.category ? undefined : "page"}
            borderTone="subtle"
            size="sm"
            textSize="xs"
            href={
              categoryNavigationMode === "route"
                ? buildCatalogHref("/products", query, view, {
                    category: undefined,
                    page: 1,
                  })
                : buildCatalogHref(basePath, query, view, {
                    category: undefined,
                    page: 1,
                  })
            }
          >
            All Products
          </ButtonLink>

          {categories.map((category) => {
            const selected = query.category === category.slug;

            return (
              <ButtonLink
                aria-current={selected ? "page" : undefined}
                borderTone="subtle"
                size="sm"
                textSize="xs"
                href={categoryHref({
                  basePath,
                  categoryNavigationMode,
                  categorySlug: category.slug,
                  query,
                  view,
                })}
                key={category.id}
              >
                {category.name}
              </ButtonLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ProductCatalogFilters;
