import type { ProductVariantOption } from "./types";
import { normalizeVariationOptionPart } from "./normalizeVariationOptionPart";

export function hasDuplicateVariationOptionGroup(
  options: ProductVariantOption[]
): boolean {
  const groups = new Set<string>();

  return options.some((option) => {
    const group = normalizeVariationOptionPart(option.group).toLowerCase();
    if (!group) {
      return false;
    }

    if (groups.has(group)) {
      return true;
    }

    groups.add(group);
    return false;
  });
}
