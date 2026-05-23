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
      className="jrw-storefront-brand-detail"
    >
      <header className="jrw-storefront-brand-detail__hero">
        <p className="jrw-storefront-kicker">Brand</p>
        <h1
          className="jrw-storefront-brand-detail__title"
          id="storefront-brand-detail-title"
        >
          {title}
        </h1>
        <p className="jrw-storefront-brand-detail__copy">
          {brand
            ? "Products grouped under this brand."
            : "Products for this brand will appear here when product browsing opens."}
        </p>
      </header>

      {hasProducts && brand ? (
        <div className="jrw-storefront-brand-detail__products">
          <BrandProductStrip brand={brand} />
        </div>
      ) : (
        <div className="jrw-storefront-brand-empty">
          <p data-brand-slug={slug}>No brand products available yet.</p>
          <div className="jrw-storefront-inline-links">
            <a className="jrw-storefront-link" href="/brands">
              Back to brands
            </a>
            <a className="jrw-storefront-link" href="/products">
              Browse all products
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

export default StorefrontBrandDetail;
