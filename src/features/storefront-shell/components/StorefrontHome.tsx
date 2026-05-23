import { storefrontHomeLinks } from "../data";

export function StorefrontHome() {
  return (
    <section
      className="jrw-storefront-home"
      aria-labelledby="storefront-home-title"
    >
      <div className="jrw-storefront-hero">
        <p className="jrw-storefront-kicker">JRW. Storefront</p>
        <h1 className="jrw-storefront-hero__title" id="storefront-home-title">
          Lifestyle products, ready to browse.
        </h1>
        <p className="jrw-storefront-hero__copy">
          Explore products, move into category browsing, and reach cart or
          account when needed.
        </p>
        <div className="jrw-storefront-hero__actions">
          <a
            className="jrw-button jrw-button--md jrw-button--primary"
            href="/products"
          >
            Browse products
          </a>
          <a
            className="jrw-button jrw-button--md jrw-button--secondary"
            href="/products?view=categories"
          >
            Browse categories
          </a>
        </div>
        <ul
          className="jrw-storefront-path-list"
          aria-label="Storefront surface links"
        >
          <li>
            <a href="/products">Products</a>
          </li>
          <li>
            <a href="/cart">Cart</a>
          </li>
          <li>
            <a href="/account">Account</a>
          </li>
        </ul>
      </div>

      <section aria-labelledby="storefront-start-title">
        <h2
          className="jrw-storefront-section-title"
          id="storefront-start-title"
        >
          Start browsing
        </h2>
        <ul className="jrw-storefront-category-grid">
          {storefrontHomeLinks.map((link) => (
            <li key={link.href}>
              <a className="jrw-storefront-category-card" href={link.href}>
                <span className="jrw-storefront-category-card__label">
                  {link.label}
                </span>
                <span className="jrw-storefront-category-card__description">
                  {link.description}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

export default StorefrontHome;
