import * as React from "react";

import { Button, ButtonLink, SearchInput } from "@/components/ui";
import { StorefrontHero } from "@/features/storefront-shell/StorefrontHero";

import type { StorefrontBrandRow } from "../types";
import { BrandProductStrip } from "./BrandProductStrip";

type StorefrontBrandIndexProps = {
  query?: string;
  rows?: StorefrontBrandRow[];
  withProductsOnly?: boolean;
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function filterRows(
  rows: StorefrontBrandRow[],
  query: string,
  withProductsOnly: boolean
) {
  const normalizedQuery = normalizeSearch(query);

  return rows.filter((row) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      row.name.toLowerCase().includes(normalizedQuery);
    const matchesProductFilter = !withProductsOnly || row.productCount > 0;

    return matchesQuery && matchesProductFilter;
  });
}

export function StorefrontBrandIndex({
  query = "",
  rows = [],
  withProductsOnly = false,
}: StorefrontBrandIndexProps) {
  const filteredRows = filterRows(rows, query, withProductsOnly);
  const hasFilters = query.trim().length > 0 || withProductsOnly;
  const emptyMessage = hasFilters
    ? "No brands match current filters."
    : "Brand product rows will appear here when product browsing opens.";

  return (
    <section
      aria-labelledby="storefront-brands-title"
      className="grid gap-grid-md"
    >
      <StorefrontHero
        actions={[
          { href: "/products", label: "Browse products", variant: "primary" },
          { href: "/products?view=categories", label: "Browse categories" },
        ]}
        copy="Browse products grouped under each brand."
        id="storefront-brands-title"
        kicker="Brands"
        title="Browse by brand."
      />

      <div className="grid gap-grid-sm md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <aside
          aria-label="Brand filters"
          className="self-start border border-brand-border-strong bg-brand-surface p-grid-sm"
        >
          <form action="/brands" className="m-0 grid gap-grid-sm">
            <p className="font-system text-xs font-bold uppercase text-brand-muted">
              Filters
            </p>
            <SearchInput
              defaultValue={query}
              id="brand-search"
              label="Search brands"
              name="q"
              placeholder="Search brands"
            />
            <label className="flex min-h-control-md items-center gap-grid-xs border border-brand-border bg-brand-background px-grid-xs font-system text-xs font-bold [&_input]:size-[18px] [&_input]:accent-brand-accent">
              <input
                defaultChecked={withProductsOnly}
                name="withProducts"
                type="checkbox"
                value="1"
              />
              <span>Brands with products</span>
            </label>
            <Button textSize="xs" type="submit">
              Apply filters
            </Button>
          </form>
        </aside>

        {filteredRows.length > 0 ? (
          <ul
            aria-label="Brand product rows"
            className="m-0 grid list-none gap-grid-sm p-0"
          >
            {filteredRows.map((brand) => (
              <li
                className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm"
                key={brand.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-grid-xs">
                  <a
                    className="font-identity text-[1.35rem] font-extrabold no-underline hover:text-brand-accent focus-visible:text-brand-accent [overflow-wrap:anywhere]"
                    href={brand.href}
                  >
                    {brand.name}
                  </a>
                  <span className="border border-brand-border bg-brand-background px-2 py-[0.35rem] font-system text-xs font-bold uppercase text-brand-muted">
                    {brand.productCount} products
                  </span>
                </div>
                <BrandProductStrip brand={brand} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm text-brand-muted [&_p]:m-0">
            <p>{emptyMessage}</p>
            <ButtonLink href="/products" textSize="xs">
              Browse all products
            </ButtonLink>
          </div>
        )}
      </div>
    </section>
  );
}

export default StorefrontBrandIndex;
