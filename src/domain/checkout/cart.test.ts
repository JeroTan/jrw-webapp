import { describe, expect, it } from "vitest";
import {
  addCartItem,
  cartHasBlockingIssues,
  cartLineItemCount,
  cartStaleItemCount,
  cartSubtotalCentavos,
  cartTotalQuantity,
  createEmptyCartState,
  markCartItemAvailability,
  removeCartItem,
  updateCartItemQuantity,
  validateCartQuantity,
} from "./cart";

const linenSmall = {
  availabilityText: "Available",
  imageAlt: "Linen Shirt front",
  imageSrc: "/assets/products/linen/front.jpg",
  priceCentavos: 1999,
  productId: "prod_linen",
  productName: "Linen Shirt",
  productSlug: "linen-shirt",
  quantity: 1,
  variantId: "variant_linen_small",
  variantLabel: "Size: Small",
  variantOptions: [{ group: "Size", name: "Small" }],
  variantProductId: "prod_linen",
};

describe("cart domain rules", () => {
  it("adds and merges repeated product variant lines by quantity", () => {
    const first = addCartItem(createEmptyCartState("t0"), linenSmall, "t1");
    const second = addCartItem(first.state, { ...linenSmall, quantity: 2 }, "t2");

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(cartLineItemCount(second.state)).toBe(1);
    expect(cartTotalQuantity(second.state)).toBe(3);
    expect(second.state.items[0]).toMatchObject({
      priceCentavos: 1999,
      productId: "prod_linen",
      quantity: 3,
      variantId: "variant_linen_small",
    });
  });

  it("updates, removes, and recalculates subtotal from centavos", () => {
    const added = addCartItem(createEmptyCartState("t0"), linenSmall, "t1");
    const updated = updateCartItemQuantity(
      added.state,
      "prod_linen",
      "variant_linen_small",
      "4",
      "t2"
    );
    const removed = removeCartItem(
      updated.state,
      "prod_linen",
      "variant_linen_small",
      "t3"
    );

    expect(updated.error).toBeNull();
    expect(cartSubtotalCentavos(updated.state)).toBe(7996);
    expect(cartTotalQuantity(removed)).toBe(0);
  });

  it("rejects invalid quantity without changing prior cart state", () => {
    const added = addCartItem(createEmptyCartState("t0"), linenSmall, "t1");
    const belowMin = updateCartItemQuantity(
      added.state,
      "prod_linen",
      "variant_linen_small",
      0,
      "t2"
    );
    const notNumeric = updateCartItemQuantity(
      added.state,
      "prod_linen",
      "variant_linen_small",
      "two",
      "t3"
    );

    expect(validateCartQuantity(1.5).error?.code).toBe("QUANTITY_NOT_INTEGER");
    expect(belowMin.error?.code).toBe("QUANTITY_BELOW_MIN");
    expect(notNumeric.error?.code).toBe("QUANTITY_NOT_NUMERIC");
    expect(belowMin.state).toBe(added.state);
    expect(notNumeric.state.items[0]?.quantity).toBe(1);
  });

  it("caps cart quantity at 99 or lower variant capacity", () => {
    const cappedAtStorefrontMax = addCartItem(
      createEmptyCartState("t0"),
      { ...linenSmall, maxQuantity: 150, quantity: 99 },
      "t1"
    );
    const overStorefrontMax = updateCartItemQuantity(
      cappedAtStorefrontMax.state,
      "prod_linen",
      "variant_linen_small",
      100,
      "t2"
    );
    const stockLimited = addCartItem(
      createEmptyCartState("t0"),
      { ...linenSmall, maxQuantity: 6, quantity: 6 },
      "t1"
    );
    const overStockLimit = updateCartItemQuantity(
      stockLimited.state,
      "prod_linen",
      "variant_linen_small",
      7,
      "t2"
    );

    expect(cappedAtStorefrontMax.error).toBeNull();
    expect(cappedAtStorefrontMax.state.items[0]?.maxQuantity).toBe(99);
    expect(overStorefrontMax.error?.code).toBe("QUANTITY_ABOVE_MAX");
    expect(overStorefrontMax.state.items[0]?.quantity).toBe(99);
    expect(stockLimited.state.items[0]?.maxQuantity).toBe(6);
    expect(overStockLimit.error?.code).toBe("QUANTITY_ABOVE_MAX");
    expect(overStockLimit.state.items[0]?.quantity).toBe(6);
  });

  it("rejects mismatched product and variant payloads", () => {
    const result = addCartItem(
      createEmptyCartState("t0"),
      {
        ...linenSmall,
        variantProductId: "prod_other",
      },
      "t1"
    );

    expect(result.error?.code).toBe("PRODUCT_VARIANT_MISMATCH");
    expect(result.state.items).toHaveLength(0);
  });

  it("marks stale or unavailable items as checkout blockers", () => {
    const added = addCartItem(createEmptyCartState("t0"), linenSmall, "t1");
    const stale = markCartItemAvailability(
      added.state,
      "prod_linen",
      "variant_linen_small",
      "STALE",
      "Could not verify this item. Try refresh.",
      "t2"
    );

    expect(cartStaleItemCount(stale)).toBe(1);
    expect(cartHasBlockingIssues(stale)).toBe(true);
    expect(stale.items[0]).toMatchObject({
      availabilityStatus: "STALE",
      staleReason: "Could not verify this item. Try refresh.",
    });
  });
});

