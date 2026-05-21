import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductListDashboard } from "./ProductListDashboard";
import type { ProductRecord } from "../types";

const now = "2026-05-21T11:30:00.000Z";

function product(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: "prod_1",
    name: "Desk Lamp",
    slug: "desk-lamp",
    summary: "Metal lamp",
    description: "Compact lamp with matte finish.",
    status: "DRAFT",
    brandId: null,
    brandName: null,
    linkedCategoryCount: 0,
    variantCount: 2,
    lowestPrice: 1299,
    priceRangeMin: 1299,
    priceRangeMax: 1999,
    hasAvailableVariants: true,
    imageCount: 0,
    primaryImageUrl: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("product list dashboard", () => {
  it("renders loading shell", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductListDashboard, {
        autoLoad: false,
        initialLoadState: "loading",
      })
    );

    expect(markup).toContain("Products");
    expect(markup).toContain("Search products");
    expect(markup).toContain("Loading product table");
    expect(markup).toContain("Brand filter");
    expect(markup).toContain("Category filter");
  });

  it("renders table-first columns and pagination", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductListDashboard, {
        autoLoad: false,
        initialLoadState: "ready",
        initialProducts: [product()],
      })
    );

    expect(markup).toContain("Brand / Category");
    expect(markup).toContain("Stock / Availability");
    expect(markup).toContain("Price summary");
    expect(markup).toContain("Updated");
    expect(markup).toContain("Rows per page");
    expect(markup).toContain("Page 1 of 1");
    expect(markup).toContain("Available variants");
  });

  it("renders empty state action", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductListDashboard, {
        autoLoad: false,
        initialLoadState: "ready",
        initialProducts: [],
      })
    );

    expect(markup).toContain("No products exist");
    expect(markup).toContain("Create first product");
  });
});

