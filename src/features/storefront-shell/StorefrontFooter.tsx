export function StorefrontFooter() {
  return (
    <footer className="border-t border-brand-border-strong bg-brand-surface">
      <div className="mx-auto w-[min(100%,1440px)] px-grid-sm xs:px-grid-md 3xl:px-grid-lg flex min-h-[72px] flex-wrap items-center justify-between gap-grid-sm py-grid-sm">
        <p className="font-identity text-[1.05rem] font-bold">
          JRW. Lifestyle Products
        </p>

        <nav aria-label="Storefront quick links">
          <ul className="m-0 flex list-none flex-wrap gap-grid-xs p-0 [&_a]:inline-flex [&_a]:min-h-control-sm [&_a]:items-center [&_a]:border [&_a]:border-brand-border-strong [&_a]:px-grid-xs [&_a]:font-system [&_a]:text-xs [&_a]:font-bold [&_a]:uppercase [&_a]:no-underline [&_a:hover]:border-brand-accent [&_a:focus-visible]:border-brand-accent motion-safe:[&_a]:transition-colors motion-safe:[&_a]:duration-[120ms]">
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
