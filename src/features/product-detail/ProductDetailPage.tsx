import * as React from "react";
import type { StorefrontProductDetailResult } from "./types";
import { ProductBrandSummary } from "./components/product-brand-summary/ProductBrandSummary";
import { ProductDescription } from "./components/product-description/ProductDescription";
import {
  initialSelectedImageIdFromDetail,
  ProductDetailsPanel,
} from "./components/product-details/ProductDetailsPanel";
import { ProductGallery } from "./components/product-gallery/ProductGallery";
import { ProductRecommendations } from "./components/product-recommendations/ProductRecommendations";

type ProductDetailPageProps = {
  detail: StorefrontProductDetailResult;
};

export { availabilityLabelForCartCapacity } from "./components/product-details/ProductDetailsPanel";

export function ProductDetailPage({ detail }: ProductDetailPageProps) {
  const [selectedImageId, setSelectedImageId] = React.useState<string | null>(
    () => initialSelectedImageIdFromDetail(detail)
  );

  return (
    <section
      aria-labelledby="product-detail-title"
      className="grid  gap-grid-lg sm:mt-4 mt-2"
    >
      <section
        className="grid gap-grid-md "
        data-product-detail-module="product-details"
      >
        <div className="grid sm:gap-grid-lg gap-grid-md lg:grid-cols-[minmax(0,40%)_minmax(0,60%)]">
          <ProductGallery
            gallery={detail.gallery}
            onSelectImage={setSelectedImageId}
            productName={detail.product.name}
            selectedImageId={selectedImageId}
          />

          <ProductDetailsPanel
            detail={detail}
            onSelectedImageChange={setSelectedImageId}
          />
        </div>

        <ProductDescription description={detail.product.description} />
      </section>

      <ProductBrandSummary brand={detail.brand} />
      <ProductRecommendations recommendations={detail.recommendations} />
      <section
        aria-hidden="true"
        data-placeholder="comments-review"
        data-product-detail-module="reviews-placeholder"
        hidden
      />
    </section>
  );
}

export default ProductDetailPage;
