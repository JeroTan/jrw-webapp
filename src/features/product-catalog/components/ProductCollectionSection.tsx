import * as React from "react";

import { ButtonLink } from "@/components/ui";
import type { StorefrontCatalogProductCard } from "../types";
import { ProductGrid } from "./ProductGrid";

type ProductCollectionSectionProps = {
  actionHref?: string;
  actionLabel?: string;
  emptyMessage?: string;
  imageAlt?: string;
  imageSrc?: string;
  meta?: string;
  products: StorefrontCatalogProductCard[];
  title: string;
};

function sectionId(title: string): string {
  return `${title
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()}-section`;
}

export function ProductCollectionSection({
  actionHref,
  actionLabel = "View more",
  emptyMessage = "No products available yet.",
  imageAlt,
  imageSrc,
  meta,
  products,
  title,
}: ProductCollectionSectionProps) {
  const titleId = sectionId(title);
  const hasProducts = products.length > 0;

  return (
    <section className="grid gap-grid-sm" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-start justify-between gap-grid-sm">
        <div className="grid gap-grid-xs">
          <h2
            className="m-0 font-identity text-[clamp(1.5rem,4vw,2.35rem)] font-extrabold leading-none"
            id={titleId}
          >
            {title}
          </h2>
          {meta ? (
            <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
              {meta}
            </p>
          ) : null}
          {imageSrc ? (
            <img
              alt={imageAlt ?? `${title} brand image`}
              className="h-14 w-fit max-w-48 object-contain"
              decoding="async"
              loading="lazy"
              src={imageSrc}
            />
          ) : null}
        </div>

        {actionHref && hasProducts ? (
          <ButtonLink
            borderTone="subtle"
            href={actionHref}
            size="sm"
            textSize="xs"
          >
            {actionLabel}
          </ButtonLink>
        ) : null}
      </div>

      {hasProducts ? (
        <ProductGrid products={products} />
      ) : (
        <p className="m-0 border border-brand-border bg-brand-surface p-grid-sm text-brand-muted">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

export default ProductCollectionSection;
