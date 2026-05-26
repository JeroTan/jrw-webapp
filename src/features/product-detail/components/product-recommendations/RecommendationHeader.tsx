import * as React from "react";
import type { PublicCatalogRecommendations } from "@/domain/products/public-types";

type RecommendationHeaderProps = {
  recommendations: PublicCatalogRecommendations;
};

export function RecommendationHeader({
  recommendations,
}: RecommendationHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-grid-sm">
      <h2
        className="m-0 text-[clamp(1.4rem,4vw,2rem)]"
        id="product-recommendations-title"
      >
        {recommendations.title}
      </h2>
      <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
        {recommendations.source}
      </p>
    </div>
  );
}

export default RecommendationHeader;
