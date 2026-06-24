import type { ProductReadinessResult } from "./types";

const categoryRequirement = "category assignment";

export function previewProductReadiness(input: {
  hasSelectedCategory: boolean;
  readiness: ProductReadinessResult | null;
}): ProductReadinessResult | null {
  if (!input.readiness || !input.hasSelectedCategory) {
    return input.readiness;
  }

  const missingItems = input.readiness.missingItems.filter(
    (item) => !item.toLowerCase().includes(categoryRequirement)
  );

  return {
    isReady: missingItems.length === 0,
    missingItems,
  };
}
