export function StorefrontFooter() {
  return (
    <footer className="jrw-storefront-footer">
      <div className="jrw-storefront-shell__inner jrw-storefront-footer__content">
        <p className="jrw-storefront-footer__identity">
          JRW. Lifestyle Products
        </p>

        <nav aria-label="Storefront quick links">
          <ul className="jrw-storefront-footer__links">
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
        </nav>
      </div>
    </footer>
  );
}

export default StorefrontFooter;
