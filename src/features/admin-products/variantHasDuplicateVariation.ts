import type { ProductVariantOption, ProductVariantRecord } from "./types";
import { variationOptionCombinationKey } from "./variationOptionCombinationKey";

export function variantHasDuplicateVariation(input: {
  editingVariantId?: string | null;
  options: ProductVariantOption[];
  variants: ProductVariantRecord[];
}): boolean {
  const key = variationOptionCombinationKey(input.options);
  if (!key) {
    return false;
  }

  return input.variants.some(
    (variant) =>
      variant.status !== "ARCHIVED" &&
      variant.id !== input.editingVariantId &&
      variationOptionCombinationKey(variant.variationChain) === key
  );
}
