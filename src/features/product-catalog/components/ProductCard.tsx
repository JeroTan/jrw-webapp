import * as React from "react";
import type { StorefrontCatalogProductCard } from "../types";

type ProductCardProps = {
  product: StorefrontCatalogProductCard;
};

function ProductImage({ product }: ProductCardProps) {
  if (product.imageSrc) {
    return (
      <a
        className="grid h-[220px] place-items-center overflow-hidden border-b border-brand-border-strong bg-brand-background"
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
      className="grid h-[220px] place-items-center border-b border-brand-border-strong bg-[linear-gradient(135deg,var(--color-brand-background)_0_25%,var(--color-brand-surface)_25%_50%,var(--color-brand-border)_50%_75%,var(--color-brand-surface)_75%)] bg-[length:28px_28px] p-grid-sm text-center font-system text-xs font-bold uppercase text-brand-muted no-underline"
      href={product.href}
    >
      Image coming soon
    </a>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="grid h-full min-h-[360px] grid-rows-[auto_1fr] bg-brand-surface">
      <ProductImage product={product} />

      <div className="grid content-start gap-grid-xs p-grid-sm">
        <div className="grid gap-grid-xs">
          <a
            className="font-identity text-[1.1rem] font-extrabold leading-tight no-underline hover:text-brand-accent focus-visible:text-brand-accent [overflow-wrap:anywhere]"
            href={product.href}
          >
            {product.name}
          </a>

          <p className="m-0 font-system text-xs text-brand-muted">
            {[
              product.brandName ?? "Brandless",
              product.categoryName,
              product.availability.label,
            ]
              .filter(Boolean)
              .join(" / ")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-grid-xs">
          <span className="inline-flex min-h-control-sm items-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase">
            {product.priceLabel}
          </span>

          {product.quickAction.disabled ? (
            <span
              aria-disabled="true"
              className="inline-flex min-h-control-sm items-center justify-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase text-brand-muted"
            >
              {product.quickAction.label}
            </span>
          ) : (
            <a
              className="inline-flex min-h-control-sm items-center justify-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent"
              href={product.quickAction.href}
            >
              {product.quickAction.label}
            </a>
          )}
        </div>

        {product.quickAction.disabled && product.quickAction.hint ? (
          <p className="m-0 font-system text-xs text-brand-muted">
            {product.quickAction.hint}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default ProductCard;
