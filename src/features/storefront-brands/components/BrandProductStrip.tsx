import * as React from "react";

import { ProductGrid } from "@/features/product-catalog";
import type { StorefrontBrandRow } from "../types";

export function BrandProductStrip({ brand }: { brand: StorefrontBrandRow }) {
  if (brand.products.length === 0) {
    return (
      <p className="m-0 border border-brand-border bg-brand-surface p-grid-sm text-brand-muted">
        No products available yet.
      </p>
    );
  }

  return <ProductGrid products={brand.products} />;
}

export default BrandProductStrip;
