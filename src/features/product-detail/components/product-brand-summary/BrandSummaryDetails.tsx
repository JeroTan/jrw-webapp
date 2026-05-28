import * as React from "react";
import type { PublicCatalogBrandSummary } from "@/domain/products/public-types";
import { BrandProductCount } from "./BrandProductCount";

type BrandSummaryDetailsProps = {
  brand: PublicCatalogBrandSummary;
};

export function BrandSummaryDetails({ brand }: BrandSummaryDetailsProps) {
  return (
    <div className="grid min-w-0 content-center gap-1">
      <a
        className="font-identity text-[1.35rem] font-extrabold text-brand-content no-underline [overflow-wrap:anywhere] hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        href={brand.href}
      >
        {brand.name}
      </a>
      <BrandProductCount productCount={brand.productCount} />
    </div>
  );
}

export default BrandSummaryDetails;
