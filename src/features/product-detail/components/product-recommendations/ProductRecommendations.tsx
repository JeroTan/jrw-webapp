import * as React from "react";
import type { PublicCatalogRecommendations } from "@/domain/products/public-types";
import { RecommendationGrid } from "./RecommendationGrid";
import { RecommendationHeader } from "./RecommendationHeader";
import { RecommendationViewMore } from "./RecommendationViewMore";

type ProductRecommendationsProps = {
  recommendations: PublicCatalogRecommendations | null;
};

export function ProductRecommendations({
  recommendations,
}: ProductRecommendationsProps) {
  if (!recommendations || recommendations.items.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="product-recommendations-title"
      className="grid gap-grid-sm"
      data-product-detail-module="recommendations"
    >
      <RecommendationHeader recommendations={recommendations} />
      <RecommendationGrid products={recommendations.items} />
      <div className="flex justify-center">
        <RecommendationViewMore recommendations={recommendations} />
      </div>
    </section>
  );
}

export default ProductRecommendations;
