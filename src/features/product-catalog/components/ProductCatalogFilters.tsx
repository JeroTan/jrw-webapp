import * as React from "react";
import { Button, ButtonLink, CheckboxGroup, Input } from "@/components/ui";
import { buildCatalogHref } from "../api";
import type {
  StorefrontCatalogBrandOption,
  StorefrontCatalogCategoryOption,
  StorefrontCatalogQuery,
  StorefrontCatalogView,
  StorefrontCategoryNavigationMode,
} from "../types";

type ProductCatalogFiltersProps = {
  basePath: string;
  brands: StorefrontCatalogBrandOption[];
  categories: StorefrontCatalogCategoryOption[];
  categoryNavigationMode: StorefrontCategoryNavigationMode;
  query: StorefrontCatalogQuery;
  view: StorefrontCatalogView;
};

function clearHref(
  basePath: string,
  query: StorefrontCatalogQuery,
  view: StorefrontCatalogView
) {
  return buildCatalogHref(basePath, query, view, {
    brands: [],
    categories: [],
    category: undefined,
    maxPriceCentavos: undefined,
    minPriceCentavos: undefined,
    page: 1,
    pageSize: 20,
    stock: [],
  });
}

function priceValue(value: number | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const pesos = value / 100;
  return Number.isInteger(pesos) ? String(pesos) : pesos.toFixed(2);
}

export function ProductCatalogFilters({
  basePath,
  brands,
  categories,
  query,
  view,
}: ProductCatalogFiltersProps) {
  const hasActiveFilters =
    query.categories.length > 0 ||
    query.brands.length > 0 ||
    query.stock.length > 0 ||
    query.minPriceCentavos !== undefined ||
    query.maxPriceCentavos !== undefined;

  return (
    <div className="grid gap-grid-sm">
      <form action={basePath} className="m-0 grid gap-grid-sm" method="get">
        <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
          Filters
        </p>

        {categories.length > 0 ? (
          <CheckboxGroup
            defaultValues={query.categories}
            description="No selection means every category is included."
            legend="Categories"
            name="category"
            options={categories.map((category) => ({
              label: category.name,
              value: category.slug,
            }))}
            size="xs"
          />
        ) : null}

        {brands.length > 0 ? (
          <CheckboxGroup
            defaultValues={query.brands}
            description="No selection means every brand is included."
            legend="Brands"
            name="brand"
            options={brands.map((brand) => ({
              label: brand.name,
              value: brand.slug,
            }))}
            size="xs"
          />
        ) : null}

        <CheckboxGroup
          defaultValues={query.stock}
          description="No selection means every stock level is included."
          legend="Stock level"
          name="stock"
          options={[
            { label: "Available", value: "available" },
            { label: "Low stock", value: "low-stock" },
            { label: "Preorder", value: "preorder" },
            { label: "Unavailable", value: "unavailable" },
          ]}
          size="xs"
        />

        <fieldset className="m-0 grid gap-grid-xs border-0 p-0">
          <legend className="font-system text-xs font-bold uppercase text-brand-muted">
            Price range
          </legend>
          <div className="grid gap-grid-xs sm:grid-cols-2 md:grid-cols-1">
            <Input
              borderTone="subtle"
              defaultValue={priceValue(query.minPriceCentavos)}
              inputMode="decimal"
              label="Min price"
              min="0"
              name="minPrice"
              placeholder="PHP min"
              step="0.01"
              type="number"
            />
            <Input
              borderTone="subtle"
              defaultValue={priceValue(query.maxPriceCentavos)}
              inputMode="decimal"
              label="Max price"
              min="0"
              name="maxPrice"
              placeholder="PHP max"
              step="0.01"
              type="number"
            />
          </div>
        </fieldset>

        {query.q.trim().length > 0 ? (
          <input name="q" type="hidden" value={query.q.trim()} />
        ) : null}

        <input name="sort" type="hidden" value="new" />

        {view === "categories" ? (
          <input name="view" type="hidden" value="categories" />
        ) : null}

        <Button borderTone="subtle" textSize="sm" type="submit">
          Apply filters
        </Button>

        {hasActiveFilters ? (
          <ButtonLink
            borderTone="subtle"
            href={clearHref(basePath, query, view)}
            textSize="xs"
          >
            Clear filters
          </ButtonLink>
        ) : null}
      </form>
    </div>
  );
}

export default ProductCatalogFilters;
