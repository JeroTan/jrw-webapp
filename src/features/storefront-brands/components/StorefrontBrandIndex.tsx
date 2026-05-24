import { SearchInput } from "@/components/ui";

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
      <header className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md">
        <p className="font-system text-xs font-bold uppercase text-brand-muted">Brands</p>
        <h1
          className="max-w-[18ch] font-identity text-[clamp(2rem,8vw,4rem)] [overflow-wrap:anywhere]"
          id="storefront-brands-title"
        >
          Browse by brand.
        </h1>
        <p className="max-w-[64ch] text-[0.9375rem] text-brand-muted">
          Browse products grouped under each brand.
        </p>
      </header>

      <div className="grid gap-grid-sm md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <aside
          aria-label="Brand filters"
          className="self-start border border-brand-border-strong bg-brand-surface p-grid-sm"
        >
          <form action="/brands" className="m-0 grid gap-grid-sm">
            <p className="font-system text-xs font-bold uppercase text-brand-muted">Filters</p>
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
            <button
              className="inline-flex min-h-control-md items-center justify-center gap-grid-xs rounded-none border border-brand-border-strong bg-brand-surface px-grid-sm font-system font-bold leading-none text-brand-content no-underline shadow-none whitespace-nowrap filter-none hover:border-brand-accent min-h-control-md px-grid-sm bg-brand-surface text-brand-content"
              type="submit"
            >
              Apply filters
            </button>
          </form>
        </aside>

        {filteredRows.length > 0 ? (
          <ul
            aria-label="Brand product rows"
            className="m-0 grid list-none gap-grid-sm p-0"
          >
            {filteredRows.map((brand) => (
              <li className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm" key={brand.id}>
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
            <a className="inline-flex min-h-control-md w-fit items-center justify-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent motion-safe:transition-colors motion-safe:duration-[120ms]" href="/products">
              Browse all products
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

export default StorefrontBrandIndex;
