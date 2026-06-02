import * as React from "react";
import type { StorefrontProductDetailPageError } from "../types";

type ProductDetailErrorStateProps = {
  error: StorefrontProductDetailPageError;
};

const defaultLinks = [
  {
    href: "/products",
    label: "Browse all products",
  },
  {
    href: "/categories",
    label: "Browse categories",
  },
];

export function ProductDetailErrorState({
  error,
}: ProductDetailErrorStateProps) {
  return (
    <section
      aria-labelledby="product-detail-error-title"
      className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md"
    >
      <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
        Product
      </p>
      <h1
        className="m-0 max-w-[18ch] font-identity text-[clamp(2rem,8vw,4rem)] wrap-anywhere"
        id="product-detail-error-title"
      >
        {error.title}
      </h1>
      <p className="m-0 max-w-[60ch] text-[0.9375rem] text-brand-muted">
        {error.message}
      </p>

      <div className="flex flex-wrap gap-grid-xs">
        {defaultLinks.map((link) => (
          <a
            className="inline-flex min-h-control-md items-center justify-center border border-brand-border-strong px-grid-sm font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}

export default ProductDetailErrorState;
