import * as React from "react";
import type { PublicCatalogRecommendations } from "@/domain/products/public-types";
import { ButtonLink } from "@/components";

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
    <ButtonLink href={recommendations.actionHref} className="px-5">
      {recommendations.actionLabel}
    </ButtonLink>
  );
}

export default RecommendationViewMore;
