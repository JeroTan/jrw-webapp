import * as React from "react";

import { Button, ButtonLink, CheckboxGroup } from "@/components/ui";
import { ProductCollectionSection } from "@/features/product-catalog";
import type { StorefrontBrandRow } from "../types";

type StorefrontBrandIndexProps = {
  rows?: StorefrontBrandRow[];
  selectedBrands?: string[];
};

function selectedBrandSet(values: string[]): Set<string> {
  return new Set(
    values.map((value) => value.trim()).filter((value) => value.length > 0)
  );
}

function filterRows(rows: StorefrontBrandRow[], selectedBrands: string[]) {
  const selected = selectedBrandSet(selectedBrands);

  if (selected.size === 0) {
    return rows;
  }

  return rows.filter((row) => selected.has(row.slug));
}

export function StorefrontBrandIndex({
  rows = [],
  selectedBrands = [],
}: StorefrontBrandIndexProps) {
  const filteredRows = filterRows(rows, selectedBrands);
  const hasFilters = selectedBrandSet(selectedBrands).size > 0;
  const emptyMessage = hasFilters
    ? "No brands match current filters."
    : "Brand product rows will appear here when product browsing opens.";

  return (
    <section
      aria-labelledby="storefront-brands-title"
      className="grid gap-grid-lg"
    >
      <div className="flex flex-wrap items-start justify-between gap-grid-sm">
        <div className="grid gap-grid-xs">
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            Browse
          </p>
          <h1
            className="m-0 font-identity text-[clamp(2rem,7vw,4rem)] font-extrabold leading-none"
            id="storefront-brands-title"
          >
            Brands
          </h1>
        </div>
        <ButtonLink href="/products" size="sm" textSize="xs">
          All products
        </ButtonLink>
      </div>

      <div className="grid gap-grid-md md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <aside
          aria-label="Brand filters"
          className="self-start border border-brand-border bg-background p-grid-sm"
        >
          <form action="/brands" className="m-0 grid gap-grid-sm" method="get">
            <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
              Filters
            </p>
            <CheckboxGroup
              defaultValues={selectedBrands}
              description="No selection means every brand is included."
              legend="Brands"
              name="brand"
              options={rows.map((row) => ({
                label: row.name,
                value: row.slug,
              }))}
              size="xs"
            />
            <Button borderTone="subtle" textSize="sm" type="submit">
              Apply filters
            </Button>
            {hasFilters ? (
              <ButtonLink borderTone="subtle" href="/brands" textSize="xs">
                Clear filters
              </ButtonLink>
            ) : null}
          </form>
        </aside>

        {filteredRows.length > 0 ? (
          <div aria-label="Brand product rows" className="grid gap-grid-xl">
            {filteredRows.map((brand) => (
              <ProductCollectionSection
                actionHref={brand.href}
                actionLabel="View more"
                emptyMessage="No products from this brand yet."
                imageAlt={brand.imageAlt}
                imageSrc={brand.imageSrc}
                key={brand.id}
                meta={`${brand.productCount} products`}
                products={brand.products}
                title={brand.name}
              />
            ))}
          </div>
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
