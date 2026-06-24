import * as React from "react";
import { Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui";
import { InputBox } from "@/components/ui/InputBox";
import { mergeClassNames } from "@/components/utils";
import type { ProductAssignableCategory, ProductCategoryDraft } from "../types";

export type CategoryAssignmentPickerProps = {
  categories: ProductAssignableCategory[];
  disabled?: boolean;
  draftCategories?: ProductCategoryDraft[];
  error?: string;
  loading?: boolean;
  newCategoryName?: string;
  onAddCategoryDraft?: () => void;
  onChange: (categoryIds: string[]) => void;
  onNewCategoryNameChange?: (value: string) => void;
  onRemoveCategoryDraft?: (categoryId: string) => void;
  selectedCategoryIds: string[];
};

const sectionClass = "grid gap-grid-xs";
const titleClass = "font-system text-[0.8125rem] font-bold text-brand-content";
const countClass = "font-system text-xs font-bold text-brand-muted";
const errorClass = "font-system text-xs font-bold text-brand-danger";
const panelClass =
  "grid min-h-control-md grid-cols-[minmax(0,1fr)_minmax(220px,0.36fr)] border border-brand-border-strong bg-brand-surface max-lg:grid-cols-1";
const categoryListClass =
  "grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-grid-xs";
const categoryMainClass = "grid gap-grid-xs p-grid-xs";
const categorySidebarClass =
  "grid content-start gap-grid-xs border-l border-brand-border p-grid-xs max-lg:border-l-0 max-lg:border-t";
const itemClass =
  "min-h-control-md border px-grid-sm py-grid-xs text-left font-system text-sm hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:cursor-not-allowed disabled:opacity-60";
const idleItemClass = "border-brand-border bg-brand-surface text-brand-content";
const selectedItemClass =
  "border-brand-accent bg-brand-accent font-bold text-brand-surface";
const pendingItemClass =
  "border-brand-accent bg-brand-accent/10 text-brand-content";
const sidebarTitleClass =
  "font-system text-xs font-bold uppercase text-brand-muted";
const selectedRowClass =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-grid-xs border border-brand-border bg-brand-surface px-grid-xs py-1 font-system text-xs";

export function CategoryAssignmentPicker({
  categories,
  disabled = false,
  draftCategories = [],
  error,
  loading = false,
  newCategoryName = "",
  onAddCategoryDraft,
  onChange,
  onNewCategoryNameChange,
  onRemoveCategoryDraft,
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
  const categoryLookup = React.useMemo(() => {
    const entries = new Map<
      string,
      ProductAssignableCategory | ProductCategoryDraft
    >();

    for (const category of categories) {
      entries.set(category.id, category);
    }

    for (const category of draftCategories) {
      entries.set(category.id, category);
    }

    return entries;
  }, [categories, draftCategories]);
  const selectedCategories = selectedCategoryIds
    .map((categoryId) => categoryLookup.get(categoryId))
    .filter(
      (
        category
      ): category is ProductAssignableCategory | ProductCategoryDraft =>
        Boolean(category)
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
        <div className={categoryMainClass}>
          {onAddCategoryDraft && onNewCategoryNameChange ? (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-grid-xs max-sm:grid-cols-1">
              <InputBox
                disabled={disabled}
                hideLabel
                label="Add category"
                onChange={(event) =>
                  onNewCategoryNameChange(event.currentTarget.value)
                }
                placeholder="Add category"
                value={newCategoryName}
              />
              <Button
                aria-label="Stage category"
                disabled={disabled || newCategoryName.trim().length === 0}
                onClick={onAddCategoryDraft}
                size="sm"
                title="Stage category"
                variant="secondary"
              >
                <Plus aria-hidden="true" size={14} />
                Category
              </Button>
            </div>
          ) : null}

          <div className={categoryListClass}>
            {categories.map((category) => {
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
            })}

            {draftCategories.map((category) => {
              const selected = selectedIds.has(category.id);

              return (
                <button
                  aria-pressed={selected}
                  className={mergeClassNames(
                    itemClass,
                    selected ? selectedItemClass : pendingItemClass
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
            })}

            {categories.length === 0 && draftCategories.length === 0 ? (
              <span aria-hidden="true" className="min-h-control-md" />
            ) : null}
          </div>
        </div>

        <aside className={categorySidebarClass}>
          <p className={sidebarTitleClass}>Selected</p>
          {selectedCategories.map((category) => {
            const isDraft = draftCategories.some(
              (draft) => draft.id === category.id
            );

            return (
              <span className={selectedRowClass} key={category.id}>
                <span className="min-w-0 truncate">
                  {category.name}
                  {isDraft ? " (new)" : ""}
                </span>
                <button
                  aria-label={`Remove ${category.name}`}
                  className="inline-flex size-5 items-center justify-center text-brand-muted hover:text-brand-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                  disabled={disabled}
                  onClick={() => {
                    if (isDraft && onRemoveCategoryDraft) {
                      onRemoveCategoryDraft(category.id);
                      return;
                    }

                    onChange(
                      selectedCategoryIds.filter(
                        (categoryId) => categoryId !== category.id
                      )
                    );
                  }}
                  type="button"
                >
                  <X aria-hidden="true" size={12} />
                </button>
              </span>
            );
          })}
        </aside>
      </div>
    </section>
  );
}
