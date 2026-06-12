import * as React from "react";
import type { PublicCatalogBrandSummary } from "@/domain/products/public-types";
import { BrandProductCount } from "./BrandProductCount";
import { ButtonLink } from "@/components";

type BrandSummaryDetailsProps = {
  brand: PublicCatalogBrandSummary;
};

export function BrandSummaryDetails({ brand }: BrandSummaryDetailsProps) {
  return (
    <div className="grid min-w-0 content-center gap-1">
      <h2 className="brand-title-big m-0" id="product-brand-title">
        {brand.name}
      </h2>
      <BrandProductCount productCount={brand.productCount} />
      <ButtonLink size="sm" textSize="xs" href={brand.href} className="w-fit">
        View all products in this brand
      </ButtonLink>
    </div>
  );
}

export default BrandSummaryDetails;
