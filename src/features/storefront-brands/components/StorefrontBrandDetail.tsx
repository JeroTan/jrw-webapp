import * as React from "react";

import { ButtonLink } from "@/components/ui";
import { StorefrontHero } from "@/features/storefront-shell/StorefrontHero";
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
  const hasProducts = Boolean(brand && brand.productCount > 0);

  return (
    <section
      aria-labelledby="storefront-brand-detail-title"
      className="grid gap-grid-md"
    >
      <StorefrontHero
        actions={[
          { href: "/brands", label: "Back to brands" },
          { href: "/products", label: "Browse products", variant: "primary" },
        ]}
        copy={
          brand
            ? "Products grouped under this brand."
            : "Products for this brand will appear here when product browsing opens."
        }
        id="storefront-brand-detail-title"
        kicker="Brand"
        title={title}
      />

      {hasProducts && brand ? (
        <div className="border border-brand-border-strong bg-brand-surface p-grid-sm">
          <BrandProductStrip brand={brand} />
        </div>
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
