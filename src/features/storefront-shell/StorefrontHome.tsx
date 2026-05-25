import * as React from "react";
import { storefrontHomeLinks } from "./data";
import { StorefrontHero } from "./StorefrontHero";

export function StorefrontHome() {
  return (
    <section
      className="grid gap-grid-md"
      aria-labelledby="storefront-home-title"
    >
      <StorefrontHero
        actions={[
          { href: "/products", label: "Browse products", variant: "primary" },
          { href: "/products?view=categories", label: "Browse categories" },
        ]}
        copy="Explore products, move into category browsing, and reach cart or account when needed."
        id="storefront-home-title"
        kicker="JRW. Storefront"
        title="Lifestyle products, ready to browse."
      />

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
              <a
                className="grid min-h-[168px] gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm no-underline hover:border-brand-accent focus-visible:border-brand-accent motion-safe:transition-colors motion-safe:duration-[120ms]"
                href={link.href}
              >
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
