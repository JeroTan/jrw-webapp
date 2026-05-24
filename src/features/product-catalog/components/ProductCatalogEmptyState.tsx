import * as React from "react";
import { EmptyState } from "@/components/feedback";
import type {
  StorefrontCatalogCategoryOption,
  StorefrontCatalogEmptyState,
} from "../types";

type ProductCatalogEmptyStateProps = {
  categories: StorefrontCatalogCategoryOption[];
  emptyState: StorefrontCatalogEmptyState;
};

export function ProductCatalogEmptyState({
  categories,
  emptyState,
}: ProductCatalogEmptyStateProps) {
  return (
    <div className="grid gap-grid-sm">
      <EmptyState
        action={
          emptyState.actionHref && emptyState.actionLabel ? (
            <a
              className="inline-flex min-h-control-md items-center justify-center border border-brand-border-strong px-grid-sm font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent"
              href={emptyState.actionHref}
            >
              {emptyState.actionLabel}
            </a>
          ) : null
        }
        className="border-brand-border-strong"
        message={<p className="m-0">{emptyState.message}</p>}
        title={emptyState.title}
      />

      {categories.length > 0 ? (
        <div className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            Try another category
          </p>
          <div className="flex flex-wrap gap-grid-xs">
            {categories.map((category) => (
              <a
                className="inline-flex min-h-control-md items-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent"
                href={category.href}
                key={category.id}
              >
                {category.name}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ProductCatalogEmptyState;
