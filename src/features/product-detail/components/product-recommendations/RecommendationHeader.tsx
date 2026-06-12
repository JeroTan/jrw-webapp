import * as React from "react";
import type { PublicCatalogRecommendations } from "@/domain/products/public-types";

type RecommendationHeaderProps = {
  recommendations: PublicCatalogRecommendations;
};

function recommendationSourceLabel(
  source: PublicCatalogRecommendations["source"]
): string {
  return source === "related" ? "Related products" : "Latest products";
}

export function RecommendationHeader({
  recommendations,
}: RecommendationHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-grid-sm">
      <h2 className="brand-title" id="product-recommendations-title">
        {recommendations.title}
      </h2>
      <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
        {recommendationSourceLabel(recommendations.source)}
      </p>
    </div>
  );
}

export default RecommendationHeader;
