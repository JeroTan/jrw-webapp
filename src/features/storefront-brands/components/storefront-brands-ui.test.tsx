import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { StorefrontBrandRow } from "../types";
import { StorefrontBrandDetail } from "./StorefrontBrandDetail";
import { StorefrontBrandIndex } from "./StorefrontBrandIndex";

const brand: StorefrontBrandRow = {
  href: "/brands/jrw-studio",
  id: "brand_jrw",
  name: "JRW Studio",
  productCount: 1,
  products: [
    {
      href: "/products/linen-shirt",
      id: "prod_linen",
      imageAlt: "Linen Shirt",
      imageSrc: "/assets/products/linen-shirt/main.jpg",
    },
  ],
};

describe("storefront brand UI", () => {
  it("uses shared storefront hero style on brand index", () => {
    const markup = renderToStaticMarkup(
      createElement(StorefrontBrandIndex, {
        rows: [brand],
      })
    );

    expect(markup).toContain("Browse by brand.");
    expect(markup).toContain("Browse products grouped under each brand.");
    expect(markup).toContain("grid gap-grid-sm bg-brand-surface p-grid-md");
    expect(markup).toContain("bg-brand-accent");
    expect(markup).toContain("text-brand-surface");
    expect(markup).not.toContain(
      "border border-brand-border-strong bg-brand-surface p-grid-md"
    );
  });

  it("uses shared storefront hero style on brand detail", () => {
    const markup = renderToStaticMarkup(
      createElement(StorefrontBrandDetail, {
        brand,
        slug: "jrw-studio",
      })
    );

    expect(markup).toContain("JRW Studio");
    expect(markup).toContain("Products grouped under this brand.");
    expect(markup).toContain("Back to brands");
    expect(markup).toContain("Browse products");
    expect(markup).not.toContain(
      "border border-brand-border-strong bg-brand-surface p-grid-md"
    );
  });
});
