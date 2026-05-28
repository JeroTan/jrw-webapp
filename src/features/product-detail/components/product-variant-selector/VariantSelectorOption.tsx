import * as React from "react";
import { mergeClassNames } from "@/components/utils";

type VariantSelectorOptionProps = {
  groupName: string;
  isSelected: boolean;
  name: string;
  onSelect: () => void;
  swatchColor?: string;
};

export function VariantSelectorOption({
  groupName,
  isSelected,
  name,
  onSelect,
  swatchColor,
}: VariantSelectorOptionProps) {
  return (
    <button
      aria-label={`${groupName}: ${name}`}
      aria-pressed={isSelected}
      className={mergeClassNames(
        "inline-flex min-h-control-md items-center gap-grid-xs border px-grid-sm font-system text-sm font-bold uppercase text-brand-content shadow-none filter-none hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent",
        isSelected
          ? "border-brand-accent bg-brand-accent text-brand-surface"
          : "border-brand-border bg-brand-background"
      )}
      onClick={onSelect}
      type="button"
    >
      {swatchColor ? (
        <span
          aria-hidden="true"
          className="size-4 border border-brand-border"
          data-variant-swatch="true"
          style={{ backgroundColor: swatchColor }}
        />
      ) : null}
      <span>{name}</span>
    </button>
  );
}

export default VariantSelectorOption;
