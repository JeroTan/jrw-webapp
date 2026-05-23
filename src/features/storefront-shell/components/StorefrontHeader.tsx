import { IconButton, SearchInput } from "@/components/ui";

import { storefrontNavLinks } from "../data";

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      className="jrw-storefront-icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 5H6L8 15H18L20 8H7.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="19" r="1.5" fill="currentColor" />
      <circle cx="17" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

function CartAction() {
  return (
    <form action="/cart" className="jrw-storefront-action-form" method="get">
      <div className="jrw-storefront-cart-action">
        <IconButton label="Open cart" type="submit">
          <CartIcon />
        </IconButton>
        <span aria-hidden="true" className="jrw-storefront-cart-count">
          0
        </span>
      </div>
    </form>
  );
}

function StorefrontNav({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav
      aria-label="Storefront navigation"
      className="jrw-storefront-nav-shell"
    >
      <ul
        className={
          mobile
            ? "jrw-storefront-nav jrw-storefront-nav--mobile"
            : "jrw-storefront-nav"
        }
      >
        {storefrontNavLinks.map((link) => (
          <li key={link.href}>
            <a className="jrw-storefront-nav__link" href={link.href}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SearchForm({ id }: { id: string }) {
  return (
    <form
      action="/products"
      className="jrw-storefront-search"
      method="get"
      role="search"
    >
      <SearchInput
        hideLabel
        id={id}
        label="Search products"
        name="q"
        placeholder="Search products"
      />
    </form>
  );
}

export function StorefrontHeader() {
  return (
    <header className="jrw-storefront-header" role="banner">
      <div className="jrw-storefront-shell__inner jrw-storefront-header__mobile">
        <a
          aria-label="JRW. lifestyle products home"
          className="jrw-storefront-logo"
          href="/"
        >
          JRW.
          {/* JRW brand always have "." after the letter "W" like "JRW." */}
        </a>

        <div className="jrw-storefront-header__mobile-actions">
          <CartAction />

          <a
            aria-label="Sign in"
            className="jrw-storefront-account-link"
            href="/account"
          >
            Sign in
          </a>

          <details className="jrw-storefront-mobile-menu">
            <summary className="jrw-storefront-mobile-menu__toggle">
              Menu
            </summary>

            <div className="jrw-storefront-mobile-menu__panel">
              <SearchForm id="storefront-mobile-search" />
              <StorefrontNav mobile />
            </div>
          </details>
        </div>
      </div>

      <div className="jrw-storefront-shell__inner jrw-storefront-header__desktop">
        <a
          aria-label="JRW. lifestyle products home"
          className="jrw-storefront-logo"
          href="/"
        >
          JRW.
        </a>

        <StorefrontNav />
        <SearchForm id="storefront-desktop-search" />

        <div className="jrw-storefront-header__desktop-actions">
          <CartAction />

          <a
            aria-label="Sign in"
            className="jrw-storefront-account-link"
            href="/account"
          >
            Sign in
          </a>
        </div>
      </div>
    </header>
  );
}

export default StorefrontHeader;
