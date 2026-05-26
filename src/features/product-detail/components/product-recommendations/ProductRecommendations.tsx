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
      className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md"
      data-product-detail-module="recommendations"
    >
      <RecommendationHeader recommendations={recommendations} />
      <RecommendationGrid products={recommendations.items} />
      <RecommendationViewMore recommendations={recommendations} />
    </section>
  );
}

export default ProductRecommendations;
