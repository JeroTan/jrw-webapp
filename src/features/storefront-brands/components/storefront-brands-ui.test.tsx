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
      availability: {
        inStock: true,
        label: "Available",
        tone: "success",
      },
      brandName: "JRW Studio",
      categoryName: "Apparel",
      href: "/products/linen-shirt",
      id: "prod_linen",
      imageAlt: "Linen Shirt",
      imageSrc: "/assets/products/linen-shirt/main.jpg",
      name: "Linen Shirt",
      priceLabel: "PHP 19.99",
      quickAction: {
        disabled: false,
        href: "/products/linen-shirt",
        label: "View product",
      },
    },
  ],
  slug: "jrw-studio",
};

describe("storefront brand UI", () => {
  it("uses simple title and checklist filters on brand index", () => {
    const markup = renderToStaticMarkup(
      createElement(StorefrontBrandIndex, {
        rows: [brand],
        selectedBrands: ["jrw-studio"],
      })
    );

    expect(markup).toContain("Brands");
    expect(markup).toContain("Filters");
    expect(markup).toContain('name="brand"');
    expect(markup).toContain('value="jrw-studio"');
    expect(markup).toContain("JRW Studio");
    expect(markup).toContain("1 products");
    expect(markup).toContain("View more");
    expect(markup).toContain("Linen Shirt");
    expect(markup).toContain("PHP 19.99");
    expect(markup).toContain('type="submit"');
    expect(markup).not.toContain("Browse by brand.");
  });

  it("uses simple brand detail layout with product cards", () => {
    const markup = renderToStaticMarkup(
      createElement(StorefrontBrandDetail, {
        brand,
        slug: "jrw-studio",
      })
    );

    expect(markup).toContain("JRW Studio");
    expect(markup).toContain("Back to brands");
    expect(markup).toContain("All products");
    expect(markup).toContain("1 products");
    expect(markup).toContain("Linen Shirt");
    expect(markup).toContain("JRW Studio / Apparel / Available");
    expect(markup).not.toContain("Products grouped under this brand.");
  });
});
