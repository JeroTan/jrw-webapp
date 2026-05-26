import * as React from "react";

import { ButtonLink } from "@/components/ui";
import type { StorefrontBrandRow } from "../types";
import { BrandProductStrip } from "./BrandProductStrip";

type StorefrontBrandDetailProps = {
  brand?: StorefrontBrandRow | null;
  slug: string;
};

export function StorefrontBrandDetail({
  brand = null,
  slug,
}: StorefrontBrandDetailProps) {
  const title = brand?.name ?? "Brand products";
  const hasProducts = Boolean(brand && brand.products.length > 0);

  return (
    <section
      aria-labelledby="storefront-brand-detail-title"
      className="grid gap-grid-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-grid-sm">
        <div className="grid gap-grid-xs">
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            Brand
          </p>
          <h1
            className="m-0 font-identity text-[clamp(2rem,7vw,4rem)] font-extrabold leading-none"
            id="storefront-brand-detail-title"
          >
            {title}
          </h1>
          {brand ? (
            <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
              {brand.productCount} products
            </p>
          ) : null}
          {brand?.imageSrc ? (
            <img
              alt={brand.imageAlt ?? `${brand.name} brand image`}
              className="h-14 w-fit max-w-48 object-contain"
              decoding="async"
              loading="lazy"
              src={brand.imageSrc}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap gap-grid-xs">
          <ButtonLink href="/brands" size="sm" textSize="xs">
            Back to brands
          </ButtonLink>
          <ButtonLink href="/products" size="sm" textSize="xs">
            All products
          </ButtonLink>
        </div>
      </div>

      {hasProducts && brand ? (
        <BrandProductStrip brand={brand} />
      ) : (
        <div className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm text-brand-muted [&_p]:m-0">
          <p data-brand-slug={slug}>No brand products available yet.</p>
          <div className="flex flex-wrap gap-grid-xs">
            <ButtonLink href="/brands" textSize="xs">
              Back to brands
            </ButtonLink>
            <ButtonLink href="/products" textSize="xs" variant="primary">
              Browse all products
            </ButtonLink>
          </div>
        </div>
      )}
    </section>
  );
}

export default StorefrontBrandDetail;
