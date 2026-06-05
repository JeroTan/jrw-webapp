import { describe, expect, it } from "vitest";
import {
  validateCheckoutCart,
  type CheckoutCartRequestItem,
  type CheckoutCartServerLine,
} from "./cart-validation";

const requestItem: CheckoutCartRequestItem = {
  priceCentavos: 1999,
  productId: "prod_linen",
  productName: "Linen Shirt",
  productSlug: "linen-shirt",
  quantity: 2,
  variantId: "variant_linen_small",
  variantLabel: "Size: Small",
};

const serverLine: CheckoutCartServerLine = {
  availabilityLabel: "Available",
  imageAlt: "Linen Shirt front",
  imageSrc: "/assets/products/linen-shirt/front.jpg",
  inventoryState: "IN_STOCK",
  priceCentavos: 1999,
  productId: "prod_linen",
  productName: "Linen Shirt",
  productSlug: "linen-shirt",
  productStatus: "PUBLISHED",
  stockQuantity: 12,
  variantId: "variant_linen_small",
  variantLabel: "Size: Small",
  variantOptions: [{ group: "Size", name: "Small" }],
  variantProductId: "prod_linen",
  variantStatus: "ACTIVE",
};

describe("checkout cart validation rules", () => {
  it("validates a published sellable cart line", () => {
    const result = validateCheckoutCart({
      items: [requestItem],
      serverLines: [serverLine],
    });

    expect(result.error).toBeNull();
    expect(result.summary).toMatchObject({
      lineItemCount: 1,
      requiresCustomerAcceptance: false,
      status: "VALID",
      subtotalCentavos: 3998,
      subtotalLabel: "PHP 39.98",
      totalQuantity: 2,
    });
    expect(result.summary?.items[0]).toMatchObject({
      availabilityStatus: "ACTIVE",
      lineSubtotalCentavos: 3998,
      maxQuantity: 12,
      priceCentavos: 1999,
      recoveryStatus: "READY",
    });
  });

  it("returns validation errors for empty or invalid local payloads", () => {
    const empty = validateCheckoutCart({ items: [], serverLines: [] });
    const invalid = validateCheckoutCart({
      items: [{ ...requestItem, quantity: 0 }],
      serverLines: [serverLine],
    });

    expect(empty.error).toMatchObject({
      code: "VALIDATION_FAILED",
      reasons: ["cart:empty"],
    });
    expect(invalid.error).toMatchObject({
      code: "VALIDATION_FAILED",
      reasons: ["items[0].quantity:invalid_value"],
    });
  });

  it("blocks missing, unpublished, mismatched, archived, and out-of-stock lines", () => {
    const result = validateCheckoutCart({
      items: [
        { ...requestItem, productId: "prod_missing", variantId: "variant_missing" },
        { ...requestItem, productId: "prod_draft", variantId: "variant_draft" },
        { ...requestItem, productId: "prod_mismatch" },
        { ...requestItem, productId: "prod_archived", variantId: "variant_archived" },
        { ...requestItem, productId: "prod_out", variantId: "variant_out" },
      ],
      serverLines: [
        {
          ...serverLine,
          productId: "prod_draft",
          productStatus: "DRAFT",
          variantId: "variant_draft",
          variantProductId: "prod_draft",
        },
        {
          ...serverLine,
          productId: "prod_mismatch",
          variantProductId: "prod_other",
        },
        {
          ...serverLine,
          productId: "prod_archived",
          variantId: "variant_archived",
          variantProductId: "prod_archived",
          variantStatus: "ARCHIVED",
        },
        {
          ...serverLine,
          inventoryState: "OUT_OF_STOCK",
          productId: "prod_out",
          stockQuantity: 0,
          variantId: "variant_out",
          variantProductId: "prod_out",
        },
      ],
    });

    expect(result.error).toBeNull();
    expect(result.summary).toMatchObject({
      requiresCustomerAcceptance: true,
      status: "BLOCKED",
    });
    expect(result.summary?.issues.map((issue) => issue.code)).toEqual([
      "ITEM_INVALID",
      "PRODUCT_UNAVAILABLE",
      "PRODUCT_VARIANT_MISMATCH",
      "VARIANT_UNAVAILABLE",
      "QUANTITY_UNAVAILABLE",
    ]);
    expect(result.summary?.items.every((item) => item.availabilityStatus === "UNAVAILABLE")).toBe(true);
  });

  it("allows preorder and changed quantity to the safe storefront maximum", () => {
    const result = validateCheckoutCart({
      items: [{ ...requestItem, quantity: 5 }],
      serverLines: [
        {
          ...serverLine,
          availabilityLabel: "Preorder",
          inventoryState: "PREORDER",
          stockQuantity: 0,
        },
      ],
    });

    expect(result.error).toBeNull();
    expect(result.summary).toMatchObject({
      requiresCustomerAcceptance: false,
      status: "VALID",
      totalQuantity: 5,
    });
    expect(result.summary?.items[0]).toMatchObject({
      maxQuantity: 99,
      recoveryStatus: "READY",
    });
  });

  it("marks price changes and quantity reductions for explicit retry", () => {
    const result = validateCheckoutCart({
      items: [{ ...requestItem, priceCentavos: 1499, quantity: 10 }],
      serverLines: [
        {
          ...serverLine,
          priceCentavos: 2099,
          stockQuantity: 4,
        },
      ],
    });

    expect(result.error).toBeNull();
    expect(result.summary).toMatchObject({
      requiresCustomerAcceptance: true,
      status: "CHANGED",
      subtotalCentavos: 8396,
      totalQuantity: 4,
    });
    expect(result.summary?.issues.map((issue) => issue.code)).toEqual([
      "PRICE_CHANGED",
      "QUANTITY_REDUCED",
    ]);
    expect(result.summary?.items[0]).toMatchObject({
      availabilityStatus: "STALE",
      lineSubtotalCentavos: 8396,
      priceCentavos: 2099,
      quantity: 4,
      reason: "Quantity changed to match current availability.",
      recoveryStatus: "QUANTITY_REDUCED",
    });
  });
});
