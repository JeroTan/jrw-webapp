import * as React from "react";
import { EmptyState } from "@/components/feedback";
import type {
  StorefrontCatalogCategoryOption,
  StorefrontCatalogPageError,
} from "../types";

type ProductCatalogErrorStateProps = {
  categories: StorefrontCatalogCategoryOption[];
  error: StorefrontCatalogPageError;
};

export function ProductCatalogErrorState({
  categories,
  error,
}: ProductCatalogErrorStateProps) {
  return (
    <div className="grid gap-grid-sm">
      <EmptyState
        action={
          <a
            className="inline-flex min-h-control-md items-center justify-center border border-brand-border-strong px-grid-sm font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent"
            href="/products"
          >
            Browse all products
          </a>
        }
        className="border-brand-border-strong"
        message={<p className="m-0">{error.message}</p>}
        title={error.title}
      />

      {categories.length > 0 ? (
        <div className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            Browse categories
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

export default ProductCatalogErrorState;
