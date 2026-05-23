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
        className="jrw-storefront-brand-product-card"
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
      <p className="jrw-storefront-brand-row__empty">
        No products available yet.
      </p>
    );
  }

  return (
    <ul
      aria-label={`${brand.name} products`}
      className="jrw-storefront-brand-product-strip"
    >
      {visibleProducts.map((product) => (
        <ProductPreviewCard key={product.id} product={product} />
      ))}
      {remainingProducts > 0 ? (
        <li>
          <a
            aria-label={`View ${remainingProducts} more products from ${brand.name}`}
            className="jrw-storefront-brand-product-card jrw-storefront-brand-product-card--more"
            href={brand.href}
          >
            +{remainingProducts}
          </a>
        </li>
      ) : null}
    </ul>
  );
}
