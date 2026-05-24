import * as React from "react";
import { StatusBadge } from "@/components/feedback";
import type { PublicCatalogDetailVariant } from "@/domain/products/public-types";

type ProductVariantSelectorProps = {
  name: string;
  selectedVariantId: string | null;
  variants: PublicCatalogDetailVariant[];
  onSelectVariant: (variantId: string) => void;
};

export function ProductVariantSelector({
  name,
  selectedVariantId,
  variants,
  onSelectVariant,
}: ProductVariantSelectorProps) {
  if (variants.length === 0) {
    return (
      <div className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
        <h2 className="m-0 text-[clamp(1.35rem,3vw,1.8rem)]">Options</h2>
        <p className="m-0 text-sm text-brand-muted">
          Product options are unavailable right now.
        </p>
      </div>
    );
  }

  return (
    <fieldset className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm">
      <legend className="px-grid-xs font-identity text-[1.1rem] font-bold">
        Choose an option
      </legend>

      <div
        aria-label="Product variants"
        className="grid gap-grid-xs"
        role="radiogroup"
      >
        {variants.map((variant) => {
          const helperId = `${name}-${variant.id}-helper`;
          const isSelected = variant.id === selectedVariantId;

          return (
            <label
              className={`grid gap-grid-xs border p-grid-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-accent ${
                isSelected
                  ? "border-brand-accent bg-brand-background"
                  : "border-brand-border-strong bg-brand-surface"
              }`}
              key={variant.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-grid-xs">
                <span className="flex items-start gap-grid-xs">
                  <input
                    aria-describedby={variant.unavailableReason ? helperId : undefined}
                    checked={isSelected}
                    className="mt-[0.2rem]"
                    name={name}
                    onChange={() => onSelectVariant(variant.id)}
                    type="radio"
                    value={variant.id}
                  />
                  <span className="grid gap-[0.2rem]">
                    <span className="font-system text-xs font-bold uppercase text-brand-muted">
                      {variant.optionValues.length > 0
                        ? variant.optionValues
                            .map((option) => `${option.group}: ${option.name}`)
                            .join(" / ")
                        : "Product option"}
                    </span>
                    <span className="font-identity text-[1rem] font-bold">
                      {variant.label}
                    </span>
                  </span>
                </span>

                <div className="grid justify-items-end gap-[0.2rem]">
                  <StatusBadge
                    label={variant.availability.label}
                    tone={variant.availability.tone}
                  />
                  <span className="font-system text-sm font-bold text-brand-content">
                    {variant.priceLabel}
                  </span>
                </div>
              </div>

              {variant.unavailableReason ? (
                <p className="m-0 text-xs text-brand-muted" id={helperId}>
                  {variant.unavailableReason}
                </p>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default ProductVariantSelector;
