import type { ProductVariantOption } from "./types";
import { normalizeVariationOptionPart } from "./normalizeVariationOptionPart";

export function mergeVariationOption(
  options: ProductVariantOption[],
  option: ProductVariantOption
): ProductVariantOption[] {
  const group = normalizeVariationOptionPart(option.group);
  const name = normalizeVariationOptionPart(option.name);
  const normalizedGroup = group.toLowerCase();
  let replaced = false;
  const nextOptions = options.map((current) => {
    if (
      normalizeVariationOptionPart(current.group).toLowerCase() !==
      normalizedGroup
    ) {
      return current;
    }

    replaced = true;
    return { group, name };
  });

  return replaced ? nextOptions : [...nextOptions, { group, name }];
}
