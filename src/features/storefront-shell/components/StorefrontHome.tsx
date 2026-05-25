import * as React from "react";
import { storefrontHomeLinks } from "../data";

export function StorefrontHome() {
  return (
    <section
      className="grid gap-grid-md"
      aria-labelledby="storefront-home-title"
    >
      <div className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md">
        <p className="font-system text-xs font-bold uppercase text-brand-muted">JRW. Storefront</p>
        <h1 className="max-w-[16ch] font-identity text-[clamp(2rem,9vw,4.5rem)] [overflow-wrap:anywhere]" id="storefront-home-title">
          Lifestyle products, ready to browse.
        </h1>
        <p className="max-w-[72ch] text-[0.9375rem] text-brand-muted">
          Explore products, move into category browsing, and reach cart or
          account when needed.
        </p>
        <div className="flex flex-wrap gap-grid-xs">
          <a
            className="inline-flex min-h-control-md items-center justify-center gap-grid-xs rounded-none border border-brand-accent bg-brand-accent px-grid-sm font-system font-bold leading-none text-brand-surface no-underline shadow-none whitespace-nowrap filter-none hover:border-brand-accent hover:text-brand-surface focus-visible:text-brand-surface"
            href="/products"
          >
            Browse products
          </a>
          <a
            className="inline-flex min-h-control-md items-center justify-center gap-grid-xs rounded-none border border-brand-border-strong bg-brand-surface px-grid-sm font-system font-bold leading-none text-brand-content no-underline shadow-none whitespace-nowrap filter-none hover:border-brand-accent min-h-control-md px-grid-sm bg-brand-surface text-brand-content"
            href="/products?view=categories"
          >
            Browse categories
          </a>
        </div>
      </div>

      <section aria-labelledby="storefront-start-title">
        <h2
          className="mb-grid-sm text-[clamp(1.55rem,4.8vw,2.6rem)]"
          id="storefront-start-title"
        >
          Start browsing
        </h2>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-grid-sm p-0 lg:grid-cols-4">
          {storefrontHomeLinks.map((link) => (
            <li key={link.href}>
              <a className="grid min-h-[168px] gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm no-underline hover:border-brand-accent focus-visible:border-brand-accent motion-safe:transition-colors motion-safe:duration-[120ms]" href={link.href}>
                <span className="font-identity text-[1.15rem] font-bold">
                  {link.label}
                </span>
                <span className="text-[0.8125rem] text-brand-muted">
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
