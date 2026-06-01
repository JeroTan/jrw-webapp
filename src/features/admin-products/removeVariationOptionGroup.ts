import type { ProductVariantOption } from "./types";
import { normalizeVariationOptionPart } from "./normalizeVariationOptionPart";

export function removeVariationOptionGroup(
  options: ProductVariantOption[],
  group: string
): ProductVariantOption[] {
  const normalizedGroup = normalizeVariationOptionPart(group).toLowerCase();

  return options.filter(
    (option) =>
      normalizeVariationOptionPart(option.group).toLowerCase() !==
      normalizedGroup
  );
}
