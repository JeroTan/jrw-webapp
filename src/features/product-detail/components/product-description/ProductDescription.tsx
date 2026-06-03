import * as React from "react";
import { renderProductDescription } from "@/features/product-detail/lib/renderProductDescription";
import { ProductDescriptionLayout } from "./ProductDescriptionLayout";

type ProductDescriptionProps = {
  description: string;
};

export function ProductDescription({ description }: ProductDescriptionProps) {
  const html = renderProductDescription(description);

  return (
    <section
      aria-labelledby="product-description-title"
      className="grid gap-grid-sm "
      data-product-detail-module="product-description"
    >
      <h2 className="brand-title" id="product-description-title">
        Product description
      </h2>
      <ProductDescriptionLayout>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </ProductDescriptionLayout>
    </section>
  );
}

export default ProductDescription;
