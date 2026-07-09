import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  formatPriceCentavos,
  normalizeVariationChainText,
  VariantEditor,
} from "./VariantEditor";
import { VariationOptionsBuilder } from "./VariationOptionsBuilder";
import { VariantList } from "./VariantList";
import { variantHasDuplicateVariation } from "../variantHasDuplicateVariation";
import type { ProductPhotoRecord, ProductVariantRecord } from "../types";

const now = "2026-05-21T05:00:00.000Z";

function variant(
  overrides: Partial<ProductVariantRecord> = {}
): ProductVariantRecord {
  return {
    id: "var_1",
    productId: "prod_1",
    name: "Small / Black",
    sku: "SKU-S-BLK",
    priceCentavos: 1999,
    isPreorder: false,
    expectedRelease: null,
    variationChain: [
      { group: "Size", name: "Small" },
      { group: "Color", name: "Black" },
    ],
    status: "ACTIVE",
    hasAvailableStock: true,
    stock: 12,
    inventoryState: "IN_STOCK",
    stockVersion: 0,
    availability: "Available",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function photo(
  overrides: Partial<ProductPhotoRecord> = {}
): ProductPhotoRecord {
  return {
    id: "photo_1",
    productId: "prod_1",
    imageId: "https://pub.r2.dev/products/prod_1/photo_1.png",
    name: "Front",
    sortOrder: 0,
    isPrimary: true,
    r2Key: "products/prod_1/photo_1.png",
    fileSize: 120000,
    contentType: "image/png",
    width: 1200,
    height: 1200,
    createdAt: now,
    updatedAt: now,
    uploadedAt: now,
    url: "/assets/products/prod_1/photo_1.png",
    ...overrides,
  };
}

describe("variants UI surfaces", () => {
  it("renders loading and ready variant list states", () => {
    const loadingMarkup = renderToStaticMarkup(
      createElement(VariantList, {
        productId: "prod_1",
        autoLoad: false,
        initialLoadState: "loading",
      })
    );

    expect(loadingMarkup).toContain("Variants");
    expect(loadingMarkup).toContain("Search variants");
    expect(loadingMarkup).toContain("Loading variant table");

    const readyMarkup = renderToStaticMarkup(
      createElement(VariantList, {
        productId: "prod_1",
        autoLoad: false,
        initialLoadState: "ready",
        initialVariants: [variant()],
      })
    );

    expect(readyMarkup).toContain("Small / Black");
    expect(readyMarkup).toContain("SKU-S-BLK");
    expect(readyMarkup).toContain("PHP");
    expect(readyMarkup).toContain("Active");
    expect(readyMarkup).toContain("IN STOCK");
    expect(readyMarkup).toContain("justify-items-start");
    expect(readyMarkup).toContain("Archive");
  });

  it("renders empty variant list state", () => {
    const markup = renderToStaticMarkup(
      createElement(VariantList, {
        productId: "prod_1",
        autoLoad: false,
        initialLoadState: "ready",
        initialVariants: [],
      })
    );

    expect(markup).toContain("No variants exist");
    expect(markup).toContain("Create first variant");
  });

  it("disables row actions for archived variants", () => {
    const markup = renderToStaticMarkup(
      createElement(VariantList, {
        productId: "prod_1",
        autoLoad: false,
        initialLoadState: "ready",
        initialVariants: [
          variant({
            status: "ARCHIVED",
            hasAvailableStock: false,
            stock: 0,
          }),
        ],
      })
    );

    expect(markup).toContain("Archived");
    expect((markup.match(/disabled=\"\"/g) ?? []).length).toBe(2);
  });

  it("shows duplicate option warning in matrix", () => {
    const markup = renderToStaticMarkup(
      createElement(VariantList, {
        productId: "prod_1",
        autoLoad: false,
        initialLoadState: "ready",
        initialVariants: [
          variant({
            id: "var_1",
            sku: "SKU-S-BLK",
            variationChain: [
              { group: "Size", name: "Small" },
              { group: "Color", name: "Black" },
            ],
          }),
          variant({
            id: "var_2",
            sku: "SKU-S-BLK-2",
            variationChain: [
              { group: "Color", name: "Black" },
              { group: "Size", name: "Small" },
            ],
          }),
        ],
      })
    );

    expect(markup).toContain("Duplicate option combinations detected:");
  });

  it("ignores archived variants when checking option duplicates", () => {
    const markup = renderToStaticMarkup(
      createElement(VariantList, {
        productId: "prod_1",
        autoLoad: false,
        initialLoadState: "ready",
        initialVariants: [
          variant({
            id: "var_1",
            sku: "SKU-S-BLK",
            variationChain: [{ group: "Size", name: "Small" }],
          }),
          variant({
            id: "var_2",
            sku: "SKU-S-BLK-OLD",
            status: "ARCHIVED",
            variationChain: [{ group: "Size", name: "Small" }],
          }),
        ],
      })
    );

    expect(markup).not.toContain("Duplicate option combinations detected:");
  });

  it("renders variant editor create and edit flows", () => {
    const createMarkup = renderToStaticMarkup(
      createElement(VariantEditor, {
        mode: "create",
        open: true,
        onClose: () => undefined,
        onSave: async () => undefined,
      })
    );

    expect(createMarkup).toContain("Create variant");
    expect(createMarkup).toContain("Variant name");
    expect(createMarkup).toContain("Price");
    expect(createMarkup).toContain("Pesos");
    expect(createMarkup).toContain("Centavos");
    expect(createMarkup).toContain("Preorder");
    expect(createMarkup).toContain("Variation options");
    expect(createMarkup).toContain("Category");

    const editMarkup = renderToStaticMarkup(
      createElement(VariantEditor, {
        mode: "edit",
        open: true,
        variant: variant(),
        onClose: () => undefined,
        onSave: async () => undefined,
      })
    );

    expect(editMarkup).toContain("Edit variant");
    expect(editMarkup).toContain("SKU-S-BLK");
    expect(editMarkup).toContain("Size");
    expect(editMarkup).toContain("Small");
    expect(editMarkup).toContain("Save changes");
  });

  it("renders option builder references without verbose empty copy", () => {
    const markup = renderToStaticMarkup(
      createElement(VariationOptionsBuilder, {
        onChange: () => undefined,
        options: [{ group: "Size", name: "Large" }],
        referenceVariants: [variant()],
      })
    );

    expect(markup).toContain("Variation options");
    expect(markup).toContain("Category");
    expect(markup).toContain("Size");
    expect(markup).toContain("Large");
    expect(markup).toContain("Small");
    expect(markup).toContain("Color");
    expect(markup).toContain("Black");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).not.toContain("No categories");
    expect(markup).not.toContain("No options");
  });

  it("renders optional variant image assignment from product images", () => {
    const markup = renderToStaticMarkup(
      createElement(VariantEditor, {
        availableImages: [photo()],
        mode: "edit",
        open: true,
        variant: variant({ imageReferenceId: "photo_1" }),
        onClose: () => undefined,
        onSave: async () => undefined,
      })
    );

    expect(markup).toContain("Variant image");
    expect(markup).toContain("Use product primary image");
    expect(markup).toContain("Front");
  });

  it("blocks duplicate active variation combinations but ignores current or archived rows", () => {
    const options = [
      { group: "Color", name: "Black" },
      { group: "Size", name: "Small" },
    ];

    expect(
      variantHasDuplicateVariation({
        options,
        variants: [variant()],
      })
    ).toBe(true);

    expect(
      variantHasDuplicateVariation({
        editingVariantId: "var_1",
        options,
        variants: [variant()],
      })
    ).toBe(false);

    expect(
      variantHasDuplicateVariation({
        options,
        variants: [variant({ status: "ARCHIVED" })],
      })
    ).toBe(false);
  });

  it("normalizes variation chain text and formats centavos", () => {
    expect(
      normalizeVariationChainText("Size: Small\nColor: Black\nSize: Small")
    ).toEqual([
      { group: "Color", name: "Black" },
      { group: "Size", name: "Small" },
    ]);

    expect(formatPriceCentavos(1999)).toBe("PHP 19.99");
    expect(formatPriceCentavos(0)).toBe("PHP 0.00");
  });
});
