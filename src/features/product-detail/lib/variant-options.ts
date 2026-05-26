import type { PublicCatalogDetailVariant } from "@/domain/products/public-types";

export type VariantSelection = Record<string, string>;

export type VariantOption = {
  name: string;
  swatchColor?: string;
};

export type VariantOptionGroup = {
  name: string;
  options: VariantOption[];
};

const namedColorPattern =
  /^(black|blue|brown|cyan|gray|green|grey|indigo|lime|magenta|navy|orange|pink|purple|red|rose|silver|teal|violet|white|yellow)$/i;
const hexColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isColorGroup(groupName: string): boolean {
  return /colou?r/i.test(groupName.trim());
}

export function swatchColorFromValue(value: string): string | undefined {
  const cleanValue = value.trim();

  if (hexColorPattern.test(cleanValue)) {
    return cleanValue;
  }

  if (namedColorPattern.test(cleanValue)) {
    return cleanValue.toLowerCase();
  }

  return undefined;
}

export function optionGroupsFromVariants(
  variants: PublicCatalogDetailVariant[]
): VariantOptionGroup[] {
  const groups = new Map<string, VariantOptionGroup>();

  for (const variant of variants) {
    for (const optionValue of variant.optionValues) {
      const groupName = optionValue.group.trim();
      const optionName = optionValue.name.trim();

      if (!groupName || !optionName) {
        continue;
      }

      const group =
        groups.get(groupName) ??
        ({
          name: groupName,
          options: [],
        } satisfies VariantOptionGroup);

      if (!groups.has(groupName)) {
        groups.set(groupName, group);
      }

      if (group.options.some((option) => option.name === optionName)) {
        continue;
      }

      group.options.push({
        name: optionName,
        ...(isColorGroup(groupName)
          ? { swatchColor: swatchColorFromValue(optionName) }
          : {}),
      });
    }
  }

  return Array.from(groups.values());
}

export function selectionFromVariant(
  variant: PublicCatalogDetailVariant | null | undefined
): VariantSelection {
  if (!variant) {
    return {};
  }

  return variant.optionValues.reduce<VariantSelection>((selection, option) => {
    const groupName = option.group.trim();
    const optionName = option.name.trim();

    if (groupName && optionName) {
      selection[groupName] = optionName;
    }

    return selection;
  }, {});
}

export function findVariantForSelection(
  variants: PublicCatalogDetailVariant[],
  selection: VariantSelection
): PublicCatalogDetailVariant | null {
  const selectionEntries = Object.entries(selection).filter(
    ([groupName, optionName]) => groupName.trim() && optionName.trim()
  );

  if (selectionEntries.length === 0) {
    return null;
  }

  return (
    variants.find((variant) => {
      const optionMap = selectionFromVariant(variant);
      const optionEntries = Object.entries(optionMap);

      if (optionEntries.length !== selectionEntries.length) {
        return false;
      }

      return selectionEntries.every(
        ([groupName, optionName]) => optionMap[groupName] === optionName
      );
    }) ?? null
  );
}
