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
      className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md"
      data-product-detail-module="brand-summary"
    >
      <h2 className="m-0 text-[clamp(1.4rem,4vw,2rem)]" id="product-brand-title">
        Brand details
      </h2>
      <div className="grid gap-grid-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <BrandSummaryImage brand={brand} />
        <BrandSummaryDetails brand={brand} />
      </div>
    </section>
  );
}

export default ProductBrandSummary;
