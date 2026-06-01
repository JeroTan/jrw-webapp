import type { ProductVariantOption, ProductVariantRecord } from "./types";
import { normalizeVariationOptionPart } from "./normalizeVariationOptionPart";

export type VariationOptionGroupReference = {
  group: string;
  selectedValue: string | null;
  values: string[];
};

export function variationOptionGroupsFromVariants(input: {
  options: ProductVariantOption[];
  variants: ProductVariantRecord[];
}): VariationOptionGroupReference[] {
  const groups = new Map<
    string,
    {
      group: string;
      order: number;
      selectedValue: string | null;
      values: Map<string, string>;
    }
  >();
  let order = 0;

  for (const option of input.options) {
    const group = normalizeVariationOptionPart(option.group);
    const value = normalizeVariationOptionPart(option.name);
    if (!group || !value) {
      continue;
    }

    const key = group.toLowerCase();
    const current = groups.get(key) ?? {
      group,
      order: order++,
      selectedValue: null,
      values: new Map<string, string>(),
    };
    current.selectedValue = value;
    current.values.set(value.toLowerCase(), value);
    groups.set(key, current);
  }

  for (const variant of input.variants) {
    if (variant.status === "ARCHIVED") {
      continue;
    }

    for (const option of variant.variationChain) {
      const group = normalizeVariationOptionPart(option.group);
      const value = normalizeVariationOptionPart(option.name);
      if (!group || !value) {
        continue;
      }

      const key = group.toLowerCase();
      const current = groups.get(key) ?? {
        group,
        order: order++,
        selectedValue: null,
        values: new Map<string, string>(),
      };
      current.values.set(value.toLowerCase(), value);
      groups.set(key, current);
    }
  }

  return Array.from(groups.values())
    .sort(
      (left, right) =>
        left.order - right.order || left.group.localeCompare(right.group)
    )
    .map((group) => ({
      group: group.group,
      selectedValue: group.selectedValue,
      values: Array.from(group.values.values()).sort((left, right) =>
        left.localeCompare(right)
      ),
    }));
}
