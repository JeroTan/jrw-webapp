import { describe, expect, it } from "vitest";

import { inventoryRowsFromProducts } from "./inventoryRowsFromProducts";
import type { ProductRecord, ProductVariantRecord } from "../types";

const product: ProductRecord = {
  brandId: "brand_1",
  brandName: "JRW Studio",
  createdAt: "2026-06-01T00:00:00.000Z",
  description: "Lamp",
  hasAvailableVariants: true,
  id: "prod_1",
  imageCount: 0,
  linkedCategoryCount: 1,
  lowestPrice: 1000,
  name: "Desk Lamp",
  priceRangeMax: 1000,
  priceRangeMin: 1000,
  primaryImageUrl: null,
  slug: "desk-lamp",
  status: "PUBLISHED",
  summary: null,
  updatedAt: "2026-06-01T00:00:00.000Z",
  variantCount: 1,
};

const variant: ProductVariantRecord = {
  availability: "Low Stock",
  createdAt: "2026-06-01T00:00:00.000Z",
  expectedRelease: null,
  hasAvailableStock: true,
  id: "variant_1",
  inventoryState: "LOW_STOCK",
  isPreorder: false,
  name: "Matte Black",
  priceCentavos: 1000,
  productId: "prod_1",
  sku: "LAMP-LOW",
  status: "ACTIVE",
  stock: 4,
  stockVersion: 1,
  updatedAt: "2026-06-01T00:00:00.000Z",
  variationChain: [],
};

describe("inventory rows from products", () => {
  it("marks low-stock variants as action rows", () => {
    const [row] = inventoryRowsFromProducts([{ product, variants: [variant] }]);

    expect(row.productName).toBe("Desk Lamp");
    expect(row.inventoryStateLabel).toBe("LOW STOCK");
    expect(row.needsAction).toBe(true);
  });

  it("creates action row for products without variants", () => {
    const [row] = inventoryRowsFromProducts([{ product, variants: [] }]);

    expect(row.variantName).toBe("No variants");
    expect(row.availabilityLabel).toBe("Create variant");
    expect(row.needsAction).toBe(true);
  });
});
