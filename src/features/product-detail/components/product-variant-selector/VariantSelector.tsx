import * as React from "react";
import type { PublicCatalogDetailVariant } from "@/domain/products/public-types";
import {
  findVariantForSelection,
  optionGroupsFromVariants,
  selectionFromVariant,
  type VariantSelection,
} from "@/features/product-detail/lib/variant-options";
import { VariantSelectorOption } from "./VariantSelectorOption";
import { VariantWrapper } from "./VariantWrapper";

type VariantSelectorProps = {
  selectedSelection?: VariantSelection;
  selectedVariantId: string | null;
  variants: PublicCatalogDetailVariant[];
  onSelectOptions?: (
    selection: VariantSelection,
    variant: PublicCatalogDetailVariant | null
  ) => void;
  onSelectVariant?: (variantId: string) => void;
};

export function VariantSelector({
  selectedSelection,
  selectedVariantId,
  variants,
  onSelectOptions,
  onSelectVariant,
}: VariantSelectorProps) {
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ??
    variants.find((variant) => variant.selected) ??
    variants[0] ??
    null;
  const selection = selectedSelection ?? selectionFromVariant(selectedVariant);
  const optionGroups = optionGroupsFromVariants(variants);

  function selectVariant(variant: PublicCatalogDetailVariant) {
    onSelectOptions?.(selectionFromVariant(variant), variant);
    onSelectVariant?.(variant.id);
  }

  function selectOption(nextSelection: VariantSelection) {
    const nextVariant = findVariantForSelection(variants, nextSelection);

    onSelectOptions?.(nextSelection, nextVariant);

    if (nextVariant) {
      onSelectVariant?.(nextVariant.id);
    }
  }

  if (variants.length === 0) {
    return "";
  }

  return (
    <section
      aria-label="Product variants"
      className="grid gap-grid-sm "
      data-product-detail-module="variant-selector"
    >
      {optionGroups.map((group) => (
        <VariantWrapper key={group.name} label={group.name}>
          {group.options.map((option) => (
            <VariantSelectorOption
              groupName={group.name}
              isSelected={selection[group.name] === option.name}
              key={option.name}
              name={option.name}
              onSelect={() =>
                selectOption({
                  ...selection,
                  [group.name]: option.name,
                })
              }
              swatchColor={option.swatchColor}
            />
          ))}
        </VariantWrapper>
      ))}
    </section>
  );
}

export default VariantSelector;
