import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductEditor, suggestedProductSlug } from "./ProductEditor";
import { ProductList, filterProductsByQuery } from "./ProductList";
import type { ProductRecord } from "../types";

const now = "2026-05-20T11:30:00.000Z";

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
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("products UI surfaces", () => {
  it("filters products by name or slug", () => {
    const rows = [
      product(),
      product({
        id: "prod_2",
        name: "Kitchen Scale",
        slug: "kitchen-scale",
      }),
    ];

    expect(filterProductsByQuery(rows, "lamp")).toHaveLength(1);
    expect(filterProductsByQuery(rows, "kitchen-scale")).toHaveLength(1);
    expect(filterProductsByQuery(rows, "missing")).toHaveLength(0);
    expect(filterProductsByQuery(rows, "")).toHaveLength(2);
  });

  it("renders loading state copy for product list", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductList, {
        autoLoad: false,
        initialLoadState: "loading",
      })
    );

    expect(markup).toContain("Products");
    expect(markup).toContain("You can manage your list of products here.");
    expect(markup).toContain("Search products");
    expect(markup).toContain("Loading product table");
  });

  it("renders empty and ready list states", () => {
    const emptyMarkup = renderToStaticMarkup(
      createElement(ProductList, {
        autoLoad: false,
        initialLoadState: "ready",
        initialProducts: [],
      })
    );

    expect(emptyMarkup).toContain("No products exist");
    expect(emptyMarkup).toContain("Create first product");

    const readyMarkup = renderToStaticMarkup(
      createElement(ProductList, {
        autoLoad: false,
        initialLoadState: "ready",
        initialProducts: [product()],
      })
    );

    expect(readyMarkup).toContain("Desk Lamp");
    expect(readyMarkup).toContain("desk-lamp");
    expect(readyMarkup).toContain("Draft");
    expect(readyMarkup).toContain("Edit");
  });

  it("renders product editor for create and edit flows", () => {
    const createMarkup = renderToStaticMarkup(
      createElement(ProductEditor, {
        mode: "create",
        open: true,
        onClose: () => undefined,
        onSave: async () => undefined,
      })
    );

    expect(createMarkup).toContain("Create product");
    expect(createMarkup).toContain("Summary");
    expect(createMarkup).toContain("Description");

    const editMarkup = renderToStaticMarkup(
      createElement(ProductEditor, {
        mode: "edit",
        open: true,
        product: product({
          id: "prod_2",
          name: "Kitchen Scale",
          slug: "kitchen-scale",
        }),
        onClose: () => undefined,
        onSave: async () => undefined,
      })
    );

    expect(editMarkup).toContain("Edit product");
    expect(editMarkup).toContain("kitchen-scale");
    expect(editMarkup).toContain("Save changes");
  });

  it("suggests editable slugs from product names", () => {
    expect(suggestedProductSlug(" Desk Lamp / Metal ")).toBe("desk-lamp-metal");
    expect(suggestedProductSlug("")).toBe("");
  });
});
