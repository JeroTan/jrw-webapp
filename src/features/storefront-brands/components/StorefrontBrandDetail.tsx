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
      <header className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md">
        <p className="font-system text-xs font-bold uppercase text-brand-muted">Brand</p>
        <h1
          className="max-w-[18ch] font-identity text-[clamp(2rem,8vw,4rem)] [overflow-wrap:anywhere]"
          id="storefront-brand-detail-title"
        >
          {title}
        </h1>
        <p className="max-w-[64ch] text-[0.9375rem] text-brand-muted">
          {brand
            ? "Products grouped under this brand."
            : "Products for this brand will appear here when product browsing opens."}
        </p>
      </header>

      {hasProducts && brand ? (
        <div className="border border-brand-border-strong bg-brand-surface p-grid-sm">
          <BrandProductStrip brand={brand} />
        </div>
      ) : (
        <div className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm text-brand-muted [&_p]:m-0">
          <p data-brand-slug={slug}>No brand products available yet.</p>
          <div className="flex flex-wrap gap-grid-xs">
            <a className="inline-flex min-h-control-md w-fit items-center justify-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent motion-safe:transition-colors motion-safe:duration-[120ms]" href="/brands">
              Back to brands
            </a>
            <a className="inline-flex min-h-control-md w-fit items-center justify-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent motion-safe:transition-colors motion-safe:duration-[120ms]" href="/products">
              Browse all products
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

export default StorefrontBrandDetail;
