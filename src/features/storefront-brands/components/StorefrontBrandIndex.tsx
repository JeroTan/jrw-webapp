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
      className="jrw-storefront-brand-browser"
    >
      <header className="jrw-storefront-brand-browser__hero">
        <p className="jrw-storefront-kicker">Brands</p>
        <h1
          className="jrw-storefront-brand-browser__title"
          id="storefront-brands-title"
        >
          Browse by brand.
        </h1>
        <p className="jrw-storefront-brand-browser__copy">
          Browse products grouped under each brand.
        </p>
      </header>

      <div className="jrw-storefront-brand-browser__body">
        <aside
          aria-label="Brand filters"
          className="jrw-storefront-brand-filter"
        >
          <form action="/brands" className="jrw-storefront-brand-filter__form">
            <p className="jrw-storefront-brand-filter__title">Filters</p>
            <SearchInput
              defaultValue={query}
              id="brand-search"
              label="Search brands"
              name="q"
              placeholder="Search brands"
            />
            <label className="jrw-storefront-brand-filter-toggle">
              <input
                defaultChecked={withProductsOnly}
                name="withProducts"
                type="checkbox"
                value="1"
              />
              <span>Brands with products</span>
            </label>
            <button
              className="jrw-button jrw-button--md jrw-button--secondary"
              type="submit"
            >
              Apply filters
            </button>
          </form>
        </aside>

        {filteredRows.length > 0 ? (
          <ul
            aria-label="Brand product rows"
            className="jrw-storefront-brand-list"
          >
            {filteredRows.map((brand) => (
              <li className="jrw-storefront-brand-row" key={brand.id}>
                <div className="jrw-storefront-brand-row__header">
                  <a
                    className="jrw-storefront-brand-row__title"
                    href={brand.href}
                  >
                    {brand.name}
                  </a>
                  <span className="jrw-storefront-brand-row__count">
                    {brand.productCount} products
                  </span>
                </div>
                <BrandProductStrip brand={brand} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="jrw-storefront-brand-empty">
            <p>{emptyMessage}</p>
            <a className="jrw-storefront-link" href="/products">
              Browse all products
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

export default StorefrontBrandIndex;
