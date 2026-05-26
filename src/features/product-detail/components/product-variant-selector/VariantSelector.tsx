import * as React from "react";
import type { PublicCatalogDetailVariant } from "@/domain/products/public-types";
import {
  findVariantForSelection,
  optionGroupsFromVariants,
  selectionFromVariant,
} from "@/features/product-detail/lib/variant-options";
import { VariantSelectorOption } from "./VariantSelectorOption";
import { VariantWrapper } from "./VariantWrapper";

type VariantSelectorProps = {
  selectedVariantId: string | null;
  variants: PublicCatalogDetailVariant[];
  onSelectVariant: (variantId: string) => void;
};

export function VariantSelector({
  selectedVariantId,
  variants,
  onSelectVariant,
}: VariantSelectorProps) {
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ??
    variants.find((variant) => variant.selected) ??
    variants[0] ??
    null;
  const selection = selectionFromVariant(selectedVariant);
  const optionGroups = optionGroupsFromVariants(variants);

  if (variants.length === 0) {
    return (
      <section className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
        <h2 className="m-0 text-[clamp(1.2rem,3vw,1.6rem)]">Options</h2>
        <p className="m-0 text-sm text-brand-muted">
          Product options are unavailable right now.
        </p>
      </section>
    );
  }

  if (optionGroups.length === 0) {
    return (
      <section
        aria-label="Product variants"
        className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm"
      >
        <h2 className="m-0 text-[clamp(1.2rem,3vw,1.6rem)]">Options</h2>
        <VariantWrapper label="Option">
          {variants.map((variant) => (
            <VariantSelectorOption
              groupName="Option"
              isSelected={variant.id === selectedVariant?.id}
              key={variant.id}
              name={variant.label}
              onSelect={() => onSelectVariant(variant.id)}
            />
          ))}
        </VariantWrapper>
      </section>
    );
  }

  return (
    <section
      aria-label="Product variants"
      className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm"
      data-product-detail-module="variant-selector"
    >
      <h2 className="m-0 text-[clamp(1.2rem,3vw,1.6rem)]">Options</h2>
      {optionGroups.map((group) => (
        <VariantWrapper key={group.name} label={group.name}>
          {group.options.map((option) => (
            <VariantSelectorOption
              groupName={group.name}
              isSelected={selection[group.name] === option.name}
              key={option.name}
              name={option.name}
              onSelect={() => {
                const nextVariant = findVariantForSelection(variants, {
                  ...selection,
                  [group.name]: option.name,
                });

                if (nextVariant) {
                  onSelectVariant(nextVariant.id);
                }
              }}
              swatchColor={option.swatchColor}
            />
          ))}
        </VariantWrapper>
      ))}
    </section>
  );
}

export default VariantSelector;
