import * as React from "react";
import type { StorefrontCatalogProductCard } from "../types";

type ProductCardProps = {
  product: StorefrontCatalogProductCard;
};

function productInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "JRW";
}

function ProductImage({ product }: ProductCardProps) {
  if (product.imageSrc) {
    return (
      <div className="grid aspect-square place-items-center overflow-hidden border-b border-brand-border bg-brand-background">
        <img
          alt={product.imageAlt}
          className="h-full w-full object-cover"
          loading="lazy"
          src={product.imageSrc}
        />
      </div>
    );
  }

  return (
    <div
      aria-label={`${product.name} image coming soon`}
      className="grid aspect-square place-items-center border-b border-brand-border bg-[linear-gradient(135deg,var(--color-brand-background)_0_25%,var(--color-brand-surface)_25%_50%,var(--color-brand-border)_50%_75%,var(--color-brand-surface)_75%)] bg-size-[28px_28px] p-grid-sm text-center font-system text-xs font-bold uppercase text-brand-muted"
      role="img"
    >
      <span className="grid size-28 place-items-center border border-brand-border bg-brand-surface font-identity text-[2.375rem] font-black text-brand-content">
        {productInitials(product.name)}
      </span>
    </div>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group h-full min-h-90 border-r border-b hover:border border-brand-border hover:border-brand-border-strong -outline-offset-2 bg-brand-surface">
      <a
        aria-label={`View ${product.name}`}
        className="grid h-full grid-rows-[auto_1fr] text-brand-content no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        href={product.href}
      >
        <ProductImage product={product} />

        <div className="grid content-start gap-grid-xs p-grid-sm">
          <div className="grid gap-grid-xs">
            <h3 className="m-0 font-identity text-[1.05rem] font-extrabold leading-tight wrap-anywhere ">
              {product.name}
            </h3>

            <p className="m-0 font-system text-xs text-brand-muted">
              {[
                ...(product.brandName ? [product.brandName] : []),
                product.categoryName,
                product.availability.label,
              ]
                .filter(Boolean)
                .join(" / ")}
            </p>
          </div>

          <span className="mt-2 inline-flex min-h-7 w-fit items-center border border-brand-content px-2.5 font-system text-[0.6875rem] uppercase leading-none text-brand-content">
            {product.priceLabel}
          </span>
        </div>
      </a>
    </article>
  );
}

export default ProductCard;
