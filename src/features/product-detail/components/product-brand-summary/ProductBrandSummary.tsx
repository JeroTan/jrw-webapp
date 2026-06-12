import * as React from "react";
import type { PublicCatalogBrandSummary } from "@/domain/products/public-types";
import { BrandSummaryDetails } from "./BrandSummaryDetails";
import { BrandSummaryImage } from "./BrandSummaryImage";

type ProductBrandSummaryProps = {
  brand: PublicCatalogBrandSummary | null;
};

export function ProductBrandSummary({ brand }: ProductBrandSummaryProps) {
  if (!brand) {
    return null;
  }

  return (
    <section
      aria-labelledby="product-brand-title"
      className="grid gap-grid-sm border border-brand-border bg-brand-background p-grid-sm"
      data-product-detail-module="brand-summary"
    >
      <div className="grid gap-grid-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <BrandSummaryImage brand={brand} />
        <BrandSummaryDetails brand={brand} />
      </div>
    </section>
  );
}

export default ProductBrandSummary;
