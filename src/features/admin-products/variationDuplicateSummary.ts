import type { ProductVariantRecord } from "./types";
import { variationOptionCombinationKey } from "./variationOptionCombinationKey";

export function variationDuplicateSummary(
  variants: ProductVariantRecord[]
): string[] {
  const byKey = new Map<string, ProductVariantRecord[]>();

  variants.forEach((variant) => {
    if (variant.status === "ARCHIVED") {
      return;
    }

    const key = variationOptionCombinationKey(variant.variationChain);
    if (!key) {
      return;
    }

    const existing = byKey.get(key);
    if (existing) {
      existing.push(variant);
      return;
    }

    byKey.set(key, [variant]);
  });

  const duplicates: string[] = [];
  byKey.forEach((sameKeyVariants) => {
    if (sameKeyVariants.length <= 1) {
      return;
    }

    duplicates.push(
      sameKeyVariants
        .map((variant) => `${variant.name} (${variant.sku})`)
        .join(", ")
    );
  });

  return duplicates;
}
