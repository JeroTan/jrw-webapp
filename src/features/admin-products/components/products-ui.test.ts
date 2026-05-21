import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductEditor, suggestedProductSlug } from "./ProductEditor";
import { ProductList, filterProductsByQuery } from "./ProductList";
import type {
  ProductAssignableBrand,
  ProductAssignableCategory,
  ProductRecord,
} from "../types";

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
    variantCount: 0,
    lowestPrice: null,
    priceRangeMin: null,
    priceRangeMax: null,
    hasAvailableVariants: false,
    imageCount: 0,
    primaryImageUrl: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const brands: ProductAssignableBrand[] = [
  {
    id: "brand_1",
    name: "Home",
    status: "ACTIVE",
  },
];

const categories: ProductAssignableCategory[] = [
  {
    id: "cat_1",
    name: "Lighting",
    slug: "lighting",
    status: "ACTIVE",
  },
];

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
    expect(markup).toContain("Brand filter");
    expect(markup).toContain("Category filter");
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
    expect(readyMarkup).toContain("No brand");
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
    expect(createMarkup).toContain("No brand (brandless)");
    expect(createMarkup).toContain("Categories");

    const editMarkup = renderToStaticMarkup(
      createElement(ProductEditor, {
        mode: "edit",
        open: true,
        product: product({
          id: "prod_2",
          name: "Kitchen Scale",
          slug: "kitchen-scale",
        }),
        availableBrands: brands,
        availableCategories: categories,
        organizationReady: true,
        organization: {
          productId: "prod_2",
          brand: {
            id: "brand_1",
            name: "Home",
            status: "ACTIVE",
          },
          categories: [
            {
              id: "cat_1",
              name: "Lighting",
              slug: "lighting",
              status: "ACTIVE",
            },
          ],
        },
        onClose: () => undefined,
        onSave: async () => undefined,
      })
    );

    expect(editMarkup).toContain("Edit product");
    expect(editMarkup).toContain("kitchen-scale");
    expect(editMarkup).toContain("Membership status");
    expect(editMarkup).toContain("Category links selected");
    expect(editMarkup).toContain("Save changes");
  });

  it("suggests editable slugs from product names", () => {
    expect(suggestedProductSlug(" Desk Lamp / Metal ")).toBe("desk-lamp-metal");
    expect(suggestedProductSlug("")).toBe("");
  });
});
