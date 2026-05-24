import * as React from "react";
import { StatusBadge } from "@/components/feedback";
import type { StorefrontCatalogProductCard } from "../types";

type ProductCardProps = {
  product: StorefrontCatalogProductCard;
};

function ProductImage({ product }: ProductCardProps) {
  if (product.imageSrc) {
    return (
      <a
        className="grid aspect-square place-items-center overflow-hidden border-b border-brand-border-strong bg-brand-background"
        href={product.href}
      >
        <img
          alt={product.imageAlt}
          className="h-full w-full object-cover"
          loading="lazy"
          src={product.imageSrc}
        />
      </a>
    );
  }

  return (
    <a
      className="grid aspect-square place-items-center border-b border-brand-border-strong bg-brand-background p-grid-sm text-center font-system text-xs font-bold uppercase text-brand-muted no-underline"
      href={product.href}
    >
      Image coming soon
    </a>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="grid h-full grid-rows-[auto_1fr_auto] border border-brand-border-strong bg-brand-surface">
      <ProductImage product={product} />

      <div className="grid gap-grid-sm p-grid-sm">
        <div className="flex flex-wrap items-center gap-grid-xs">
          <StatusBadge
            label={product.availability.label}
            tone={product.availability.tone}
          />
          {product.brandName ? (
            <span className="font-system text-xs font-bold uppercase text-brand-muted">
              {product.brandName}
            </span>
          ) : null}
        </div>

        <div className="grid gap-grid-xs">
          <a
            className="font-identity text-[1.2rem] font-extrabold leading-tight no-underline hover:text-brand-accent focus-visible:text-brand-accent [overflow-wrap:anywhere]"
            href={product.href}
          >
            {product.name}
          </a>

          <div className="min-h-[2.5rem] text-sm text-brand-muted">
            {product.categoryName ? (
              <p className="m-0">{product.categoryName}</p>
            ) : (
              <p className="m-0">Published product</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-grid-xs border-t border-brand-border-strong p-grid-sm">
        <div className="flex flex-wrap items-center justify-between gap-grid-xs">
          <span className="font-system text-sm font-bold text-brand-content">
            {product.priceLabel}
          </span>

          {product.quickAction.disabled ? (
            <span
              aria-disabled="true"
              className="inline-flex min-h-control-md items-center justify-center border border-brand-border-strong px-grid-sm font-system text-xs font-bold uppercase text-brand-muted"
            >
              {product.quickAction.label}
            </span>
          ) : (
            <a
              className="inline-flex min-h-control-md items-center justify-center border border-brand-border-strong px-grid-sm font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent"
              href={product.quickAction.href}
            >
              {product.quickAction.label}
            </a>
          )}
        </div>

        {product.quickAction.disabled && product.quickAction.hint ? (
          <p className="m-0 text-xs text-brand-muted">
            {product.quickAction.hint}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default ProductCard;
