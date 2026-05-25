import * as React from "react";

import type {
  StorefrontBrandProductPreview,
  StorefrontBrandRow,
} from "../types";

const MAX_VISIBLE_PRODUCTS = 5;

function ProductPreviewCard({
  product,
}: {
  product: StorefrontBrandProductPreview;
}) {
  return (
    <li>
      <a
        aria-label={product.imageAlt}
        className="flex aspect-square min-w-0 items-center justify-center overflow-hidden border border-brand-border bg-brand-background no-underline hover:border-brand-accent focus-visible:border-brand-accent [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
        href={product.href}
      >
        {product.imageSrc ? (
          <img
            alt={product.imageAlt}
            decoding="async"
            loading="lazy"
            src={product.imageSrc}
          />
        ) : (
          <span aria-hidden="true" />
        )}
      </a>
    </li>
  );
}

export function BrandProductStrip({ brand }: { brand: StorefrontBrandRow }) {
  const visibleProducts = brand.products.slice(0, MAX_VISIBLE_PRODUCTS);
  const totalProducts = Math.max(brand.productCount, brand.products.length);
  const remainingProducts = Math.max(0, totalProducts - visibleProducts.length);

  if (totalProducts === 0) {
    return (
      <p className="m-0 border border-brand-border bg-brand-background p-grid-sm text-brand-muted">
        No products available yet.
      </p>
    );
  }

  return (
    <ul
      aria-label={`${brand.name} products`}
      className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-grid-xs p-0 md:grid-cols-6"
    >
      {visibleProducts.map((product) => (
        <ProductPreviewCard key={product.id} product={product} />
      ))}
      {remainingProducts > 0 ? (
        <li>
          <a
            aria-label={`View ${remainingProducts} more products from ${brand.name}`}
            className="flex aspect-square min-w-0 items-center justify-center overflow-hidden border border-brand-border bg-brand-background no-underline hover:border-brand-accent focus-visible:border-brand-accent [&_img]:h-full [&_img]:w-full [&_img]:object-cover border-brand-border-strong font-system text-[clamp(1.15rem,4vw,1.75rem)] font-bold text-brand-accent"
            href={brand.href}
          >
            +{remainingProducts}
          </a>
        </li>
      ) : null}
    </ul>
  );
}
