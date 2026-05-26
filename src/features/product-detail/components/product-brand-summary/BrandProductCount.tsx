import * as React from "react";

type BrandProductCountProps = {
  productCount: number;
};

export function BrandProductCount({ productCount }: BrandProductCountProps) {
  return (
    <p className="m-0 font-system text-sm text-brand-muted">
      {productCount} product{productCount === 1 ? "" : "s"}
    </p>
  );
}

export default BrandProductCount;
