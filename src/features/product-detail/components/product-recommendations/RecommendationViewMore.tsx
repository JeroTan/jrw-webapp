import * as React from "react";
import type { PublicCatalogRecommendations } from "@/domain/products/public-types";

type RecommendationViewMoreProps = {
  recommendations: PublicCatalogRecommendations;
};

export function RecommendationViewMore({
  recommendations,
}: RecommendationViewMoreProps) {
  if (!recommendations.actionHref || !recommendations.actionLabel) {
    return null;
  }

  return (
    <a
      className="inline-flex min-h-control-md w-fit items-center justify-center border border-brand-border-strong bg-brand-surface px-grid-sm font-system text-sm font-bold uppercase text-brand-content no-underline hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
      href={recommendations.actionHref}
    >
      {recommendations.actionLabel}
    </a>
  );
}

export default RecommendationViewMore;
