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

const emptyBrand: StorefrontBrandRow = {
  href: "/brands/empty-brand",
  id: "brand_empty",
  name: "Empty Brand",
  productCount: 0,
  products: [],
  slug: "empty-brand",
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
    expect(markup).toContain('aria-label="Brand filters"');
    expect(markup).toContain("Filters");
    expect(markup).toContain(
      'class="filter-panel-body mt-grid-sm hidden md:mt-0 md:grid"'
    );
    expect(markup).toContain('class="filter-panel-plus"');
    expect(markup).not.toContain("mb-grid-sm flex min-h-control-sm");
    expect(markup.match(/<form[^>]*action="\/brands"/g) ?? []).toHaveLength(1);
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

  it("hides brand action when brand has no products", () => {
    const markup = renderToStaticMarkup(
      createElement(StorefrontBrandIndex, {
        rows: [emptyBrand],
        selectedBrands: [],
      })
    );

    expect(markup).toContain("Empty Brand");
    expect(markup).toContain("0 products");
    expect(markup).toContain("No products from this brand yet.");
    expect(markup).not.toContain("View more");
    expect(markup).not.toContain('href="/brands/empty-brand"');
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
