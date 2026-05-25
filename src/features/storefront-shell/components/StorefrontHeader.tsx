import * as React from "react";
import { IconButton, SearchInput } from "@/components/ui";
import { CartDrawer, useCartSummary } from "@/features/cart-checkout";

import { storefrontNavLinks } from "../data";

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-[18px]"
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
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const summary = useCartSummary();
  const cartLabel =
    summary.totalQuantity === 1
      ? "Open cart, 1 item"
      : `Open cart, ${summary.totalQuantity} items`;

  return (
    <>
      <div className="relative">
        <IconButton
          className="hover:!outline-0 hover:border-brand-accent hover:text-brand-accent focus-visible:border-brand-accent focus-visible:text-brand-accent motion-safe:transition-colors motion-safe:duration-[120ms]"
          label={cartLabel}
          onClick={() => setDrawerOpen(true)}
        >
          <CartIcon />
        </IconButton>
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center border border-brand-border-strong bg-brand-surface px-1 font-system text-[0.625rem] font-bold leading-none max-[374px]:-right-1"
        >
          {summary.totalQuantity}
        </span>
      </div>
      <CartDrawer onClose={() => setDrawerOpen(false)} open={drawerOpen} />
    </>
  );
}

function StorefrontNav({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav
      aria-label="Storefront navigation"
      className={
        mobile
          ? "min-w-0"
          : "min-w-0 md:col-span-full md:row-start-2 xl:col-auto xl:row-auto"
      }
    >
      <ul
        className={
          mobile
            ? "m-0 grid list-none gap-grid-xs p-0"
            : "m-0 flex list-none flex-wrap gap-grid-xs p-0 md:flex-nowrap md:justify-end md:overflow-x-auto md:pb-0.5 xl:justify-start"
        }
      >
        {storefrontNavLinks.map((link) => (
          <li key={link.href}>
            <a className="inline-flex min-h-control-md items-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase no-underline hover:border-brand-accent hover:text-brand-accent focus-visible:border-brand-accent focus-visible:text-brand-accent [overflow-wrap:anywhere] motion-safe:transition-colors motion-safe:duration-[120ms]" href={link.href}>
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
      className="min-w-0"
      method="get"
      role="search"
    >
      <SearchInput
        hideLabel
        id={id}
        inputClassName="hover:border-brand-accent [&:hover]:border-brand-accent motion-safe:transition-colors motion-safe:duration-[120ms]"
        label="Search products"
        name="q"
        placeholder="Search products"
      />
    </form>
  );
}

export function StorefrontHeader() {
  return (
    <header className="border-b border-brand-border-strong bg-brand-surface" role="banner">
      <div className="mx-auto w-[min(100%,1440px)] px-grid-sm xs:px-grid-md 3xl:px-grid-lg flex min-h-[68px] items-center justify-between gap-grid-sm py-grid-xs max-[374px]:flex-wrap max-[374px]:items-start max-[374px]:gap-1.5 md:hidden">
        <a
          aria-label="JRW. lifestyle products home"
          className="inline-flex min-h-control-md items-center border border-transparent font-identity text-[1.6rem] font-extrabold leading-none text-brand-content no-underline hover:!text-brand-accent focus-visible:border-brand-accent max-[374px]:px-1 max-[374px]:text-[1.45rem] [&:hover]:!text-brand-accent motion-safe:transition-colors motion-safe:duration-[120ms]"
          href="/"
        >
          JRW.
          {/* JRW brand always have "." after the letter "W" like "JRW." */}
        </a>

        <div className="flex items-center gap-grid-xs max-[374px]:justify-between max-[374px]:gap-1">
          <CartAction />

          <a
            aria-label="Sign in"
            className="inline-flex min-h-control-md items-center justify-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent max-[374px]:px-1.5 max-[374px]:text-[0.6875rem] motion-safe:transition-colors motion-safe:duration-[120ms]"
            href="/account"
          >
            Sign in
          </a>

          <details className="group relative">
            <summary className="inline-flex min-h-control-md min-w-control-md list-none items-center justify-center gap-1.5 border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase marker:hidden group-open:border-brand-accent max-[374px]:px-1.5 max-[374px]:text-[0.6875rem] [&::-webkit-details-marker]:hidden">
              <span>Menu</span>
              <span aria-hidden="true" className="group-open:hidden">
                +
              </span>
              <span aria-hidden="true" className="hidden group-open:inline">
                -
              </span>
            </summary>

            <div className="absolute right-0 top-[calc(100%+8px)] z-30 grid w-[min(92vw,380px)] gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm">
              <SearchForm id="storefront-mobile-search" />
              <StorefrontNav mobile />
            </div>
          </details>
        </div>
      </div>

      <div className="mx-auto w-[min(100%,1440px)] px-grid-sm xs:px-grid-md 3xl:px-grid-lg hidden min-h-20 items-center gap-grid-sm py-grid-sm md:grid md:grid-cols-[auto_minmax(220px,1fr)_auto] lg:gap-grid-md xl:grid-cols-[auto_minmax(0,1fr)_minmax(260px,360px)_auto]">
        <a
          aria-label="JRW. lifestyle products home"
          className="inline-flex min-h-control-md items-center border border-transparent font-identity text-[1.6rem] font-extrabold leading-none text-brand-content no-underline hover:!text-brand-accent focus-visible:border-brand-accent max-[374px]:px-1 max-[374px]:text-[1.45rem] [&:hover]:!text-brand-accent motion-safe:transition-colors motion-safe:duration-[120ms]"
          href="/"
        >
          JRW.
        </a>

        <StorefrontNav />
        <SearchForm id="storefront-desktop-search" />

        <div className="flex items-center justify-self-end gap-grid-xs">
          <CartAction />

          <a
            aria-label="Sign in"
            className="inline-flex min-h-control-md items-center justify-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent max-[374px]:px-1.5 max-[374px]:text-[0.6875rem] motion-safe:transition-colors motion-safe:duration-[120ms]"
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
