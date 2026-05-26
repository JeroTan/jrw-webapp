import * as React from "react";
import { StorefrontHero } from "./StorefrontHero";

export default function StorefrontHomeHero() {
  return (
    <section
      className="grid gap-grid-md mb-5"
      aria-labelledby="storefront-home-title"
    >
      <StorefrontHero
        actions={[
          { href: "/products", label: "Check products", variant: "primary" },
          {
            href: "/categories",
            label: "Categories",
            variant: "ghost",
          },
        ]}
        copy="Explore products and see what fits you."
        id="storefront-home-title"
        kicker="JRW. Storefront"
        title="Lifestyle products"
      />
    </section>
  );
}
