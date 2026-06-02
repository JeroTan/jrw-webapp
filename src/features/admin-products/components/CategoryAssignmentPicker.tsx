import * as React from "react";
import { Check } from "lucide-react";

import { mergeClassNames } from "@/components/utils";
import type { ProductAssignableCategory } from "../types";

export type CategoryAssignmentPickerProps = {
  categories: ProductAssignableCategory[];
  disabled?: boolean;
  error?: string;
  loading?: boolean;
  onChange: (categoryIds: string[]) => void;
  selectedCategoryIds: string[];
};

const sectionClass = "grid gap-grid-xs";
const titleClass = "font-system text-[0.8125rem] font-bold text-brand-content";
const countClass = "font-system text-xs font-bold text-brand-muted";
const errorClass = "font-system text-xs font-bold text-brand-danger";
const panelClass =
  "grid min-h-control-md grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-xs";
const itemClass =
  "min-h-control-md border px-grid-sm py-grid-xs text-left font-system text-sm hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:cursor-not-allowed disabled:opacity-60";
const idleItemClass = "border-brand-border bg-brand-surface text-brand-content";
const selectedItemClass =
  "border-brand-accent bg-brand-accent font-bold text-brand-surface";

export function CategoryAssignmentPicker({
  categories,
  disabled = false,
  error,
  loading = false,
  onChange,
  selectedCategoryIds,
}: CategoryAssignmentPickerProps) {
  const titleId = React.useId();
  const selectedIds = React.useMemo(
    () =>
      new Set(
        selectedCategoryIds
          .map((categoryId) => categoryId.trim())
          .filter((categoryId) => categoryId.length > 0)
      ),
    [selectedCategoryIds]
  );

  return (
    <section aria-labelledby={titleId} className={sectionClass}>
      <div className="flex flex-wrap items-center justify-between gap-grid-xs">
        <p className={titleClass} id={titleId}>
          Categories
        </p>
        <span className={countClass}>
          {loading ? "Loading" : `${selectedIds.size} selected`}
        </span>
      </div>

      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}

      <div className={panelClass}>
        {categories.length > 0 ? (
          categories.map((category) => {
            const selected = selectedIds.has(category.id);

            return (
              <button
                aria-pressed={selected}
                className={mergeClassNames(
                  itemClass,
                  selected ? selectedItemClass : idleItemClass
                )}
                disabled={disabled}
                key={category.id}
                onClick={() => {
                  onChange(
                    selected
                      ? selectedCategoryIds.filter(
                          (categoryId) => categoryId !== category.id
                        )
                      : Array.from(
                          new Set([...selectedCategoryIds, category.id])
                        )
                  );
                }}
                type="button"
              >
                <span className="flex min-w-0 items-center justify-between gap-grid-xs">
                  <span className="min-w-0 truncate">{category.name}</span>
                  {selected ? <Check aria-hidden="true" size={14} /> : null}
                </span>
              </button>
            );
          })
        ) : (
          <span aria-hidden="true" className="min-h-control-md" />
        )}
      </div>
    </section>
  );
}
