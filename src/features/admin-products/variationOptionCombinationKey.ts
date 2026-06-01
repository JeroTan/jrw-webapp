import type { ProductVariantOption } from "./types";
import { normalizeVariationOptionPart } from "./normalizeVariationOptionPart";

export function variationOptionCombinationKey(
  options: ProductVariantOption[]
): string {
  return options
    .map((option) => {
      const group = normalizeVariationOptionPart(option.group).toLowerCase();
      const name = normalizeVariationOptionPart(option.name).toLowerCase();
      return group && name ? `${group}::${name}` : "";
    })
    .filter((value) => value.length > 0)
    .sort((left, right) => left.localeCompare(right))
    .join("|");
}
