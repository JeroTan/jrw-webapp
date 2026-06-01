import * as React from "react";

import { PageToolbar } from "@/components/layout";
import { CleanButton, SearchInput, Select, ViewToggle } from "@/components/ui";
import type {
  ProductAssignableBrand,
  ProductAssignableCategory,
} from "../types";

type ProductListToolbarView = "table" | "list";

export type ProductListToolbarProps = {
  availableBrands: ProductAssignableBrand[];
  availableCategories: ProductAssignableCategory[];
  brandFilter: string;
  brandlessFilterValue: string;
  categoryFilter: string;
  onBrandFilterChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onCreateProduct: () => void;
  onSearchQueryChange: (value: string) => void;
  onViewModeChange: (value: ProductListToolbarView) => void;
  searchQuery: string;
  viewMode: ProductListToolbarView;
};

export function ProductListToolbar({
  availableBrands,
  availableCategories,
  brandFilter,
  brandlessFilterValue,
  categoryFilter,
  onBrandFilterChange,
  onCategoryFilterChange,
  onCreateProduct,
  onSearchQueryChange,
  onViewModeChange,
  searchQuery,
  viewMode,
}: ProductListToolbarProps) {
  return (
    <PageToolbar
      aria-label="Product list controls"
      actions={
        <>
          <ViewToggle
            label="Product dashboard view"
            onChange={onViewModeChange}
            options={[
              { label: "Table", value: "table" },
              { label: "List", value: "list" },
            ]}
            value={viewMode}
          />
          <CleanButton
            className="max-md:w-full"
            onClick={onCreateProduct}
            variant="primary"
          >
            Create product
          </CleanButton>
        </>
      }
      main={
        <div className="grid grid-cols-[minmax(240px,1.4fr)_repeat(2,minmax(180px,1fr))] gap-grid-sm max-lg:grid-cols-2 max-md:grid-cols-1">
          <SearchInput
            className="min-w-0 max-lg:col-span-2 max-md:col-span-1"
            label="Search products"
            onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
            placeholder="Search by name or slug"
            value={searchQuery}
          />

          <Select
            label="Brand filter"
            onChange={(event) => onBrandFilterChange(event.currentTarget.value)}
            value={brandFilter}
          >
            <option value="">All brands</option>
            <option value={brandlessFilterValue}>No brand (brandless)</option>
            {availableBrands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </Select>

          <Select
            label="Category filter"
            onChange={(event) =>
              onCategoryFilterChange(event.currentTarget.value)
            }
            value={categoryFilter}
          >
            <option value="">All categories</option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
      }
    />
  );
}
