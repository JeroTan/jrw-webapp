import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { addCartItem, markCartItemAvailability } from "@/domain/checkout/cart";
import type { PublicCatalogDetailResult } from "@/domain/products/public-types";
import {
  CartDrawerView,
  CartPageView,
  CheckoutDetailsPageView,
} from "@/features/cart-checkout";
import { fetchCartProductDetail, refreshCartItem } from "../api";
import {
  getCartSnapshot,
  resetCartStoreForTest,
  writeCartStateToStorage,
} from "../store";

const detail: PublicCatalogDetailResult = {
  action: {
    disabled: false,
    label: "Add to cart",
    reason: "Availability rechecks before checkout.",
  },
  brand: null,
  gallery: [
    {
      alt: "Linen Shirt front",
      height: 1200,
      id: "photo_linen_front",
      isPrimary: true,
      name: "Linen Shirt front",
      src: "/assets/products/linen-shirt/front.jpg",
      width: 1200,
    },
  ],
  metadata: {
    availabilityText: "Available",
    canonicalPath: "/products/linen-shirt",
    description: "Lightweight linen shirt • PHP 19.99 • Available • JRW Studio",
    imageAlt: "Linen Shirt front",
    imageSrc: "/assets/products/linen-shirt/front.jpg",
    robots: "index,follow",
    title: "Linen Shirt | JRW",
  },
  product: {
    availability: {
      inStock: true,
      label: "Available",
      tone: "success",
    },
    brandName: "JRW Studio",
    categories: [],
    description: "Lightweight linen shirt for warm days.",
    id: "prod_linen",
    name: "Linen Shirt",
    priceCentavos: 1999,
    priceLabel: "PHP 19.99",
    primaryImage: {
      alt: "Linen Shirt front",
      height: 1200,
      id: "photo_linen_front",
      isPrimary: true,
      name: "Linen Shirt front",
      src: "/assets/products/linen-shirt/front.jpg",
      width: 1200,
    },
    slug: "linen-shirt",
    summary: "Lightweight linen shirt",
  },
  recommendations: null,
  recoveryLinks: [],
  selectedVariantId: "variant_linen_small",
  variants: [
    {
      availability: {
        inStock: true,
        label: "Available",
        tone: "success",
      },
      disabled: false,
      id: "variant_linen_small",
      imageSrc: "/assets/products/linen-shirt/front.jpg",
      label: "Size: Small",
      maxQuantity: 12,
      optionValues: [{ group: "Size", name: "Small" }],
      priceCentavos: 1999,
      priceLabel: "PHP 19.99",
      productId: "prod_linen",
      selected: true,
    },
  ],
};

const activeCart = addCartItem(
  {
    items: [],
    updatedAt: "t0",
  },
  {
    availabilityText: "Available",
    imageAlt: "Linen Shirt front",
    imageSrc: "/assets/products/linen-shirt/front.jpg",
    priceCentavos: 149900,
    productId: "prod_linen",
    productName: "Linen Shirt",
    productSlug: "linen-shirt",
    quantity: 2,
    variantId: "variant_linen_small",
    variantLabel: "Size: Small",
    variantOptions: [{ group: "Size", name: "Small" }],
    variantProductId: "prod_linen",
  },
  "t1"
).state;

describe("cart checkout UI", () => {
  const originalWindow = (globalThis as { window?: unknown }).window;

  afterEach(() => {
    resetCartStoreForTest();
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  it("renders cart page checkout flow shell, line items, and summary rail", () => {
    const markup = renderToStaticMarkup(
      createElement(CartPageView, { state: activeCart })
    );

    expect(markup).toContain('aria-labelledby="cart-title"');
    expect(markup).toContain('id="cart-title"');
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain("01 Cart");
    expect(markup).toContain("02 Details");
    expect(markup).toContain("03 Payment");
    expect(markup).toContain("04 Receipt");
    expect(markup).toContain("Linen Shirt");
    expect(markup).toContain("Quantity for Linen Shirt Size: Small");
    expect(markup).toContain("min-h-control-md");
    expect(markup).toContain("!min-h-control-sm");
    expect(markup).toContain('max="99"');
    expect(markup).toContain(">QUANTITY</label>");
    expect(markup).toContain("w-14!");
    expect(markup).not.toContain(
      "border-brand-border px-2 py-1 font-system text-[0.6875rem] font-bold uppercase text-brand-muted"
    );
    expect(markup).toContain("Checkout");
    expect(markup).toContain('href="/checkout"');
    expect(markup).toContain("Cart summary");
    expect(markup).toContain("2 item quantity across 1 line");
    expect(markup).toContain("w-full");
    expect(markup).not.toContain("Pending");
    expect(markup).not.toContain("Fulfillment");
    expect(markup).not.toContain("Not placed");
    expect(markup).not.toContain("Return");
    expect(markup).not.toContain("Refund");
    expect(markup).not.toContain("Not requested");
    expect(markup).toContain("Item price: PHP 1,499.00");
    expect(markup).toContain("PHP 2,998.00");
    expect(markup).not.toContain(
      "Checkout validates price and availability again before payment."
    );
    expect(markup).not.toContain("Update");
    expect(markup).not.toContain("Verified display item");
  });

  it("renders checkout details placeholder as step two", () => {
    const markup = renderToStaticMarkup(
      createElement(CheckoutDetailsPageView, { state: activeCart })
    );

    expect(markup).toContain('id="checkout-details-title"');
    expect(markup).toContain("01 Cart");
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain("02 Details");
    expect(markup).toContain("Full name");
    expect(markup).toContain("Email");
    expect(markup).toContain("Phone");
    expect(markup).toContain("City");
    expect(markup).toContain("Barangay");
    expect(markup).toContain("Postal code");
    expect(markup).toContain("Continue to Payment");
  });

  it("renders empty cart state without checkout action", () => {
    const markup = renderToStaticMarkup(
      createElement(CartPageView, {
        state: { items: [], updatedAt: "t0" },
      })
    );

    expect(markup).toContain("Cart empty");
    expect(markup).toContain("Browse products");
    expect(markup).toContain("disabled");
  });

  it("renders drawer dialog with shared cart rows and summary", () => {
    const markup = renderToStaticMarkup(
      createElement(CartDrawerView, {
        onClose: () => undefined,
        open: true,
        state: activeCart,
      })
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("See full cart page");
    expect(markup).toContain("Review line items before next checkout step.");
  });

  it("blocks checkout for stale or unavailable cart items", () => {
    const staleCart = markCartItemAvailability(
      activeCart,
      "prod_linen",
      "variant_linen_small",
      "UNAVAILABLE",
      "Selected option is unavailable right now.",
      "t2"
    );
    const markup = renderToStaticMarkup(
      createElement(CartPageView, { state: staleCart })
    );

    expect(markup).toContain("Selected option is unavailable right now.");
    expect(markup).toContain("Resolve unavailable or unverified items");
    expect(markup).toContain("Checkout");
    expect(markup).not.toContain("stock_lock_version");
    expect(markup).not.toContain("R2");
  });

  it("maps public detail refresh responses without leaking provider errors", async () => {
    const ok = await fetchCartProductDetail(
      "linen-shirt",
      async () =>
        new Response(JSON.stringify({ data: detail }), {
          status: 200,
        })
    );
    const providerFailure = await fetchCartProductDetail(
      "linen-shirt",
      async () =>
        new Response(JSON.stringify({ error: { code: "PROVIDER_UNAVAILABLE" } }), {
          status: 503,
        })
    );

    expect(ok.kind).toBe("ok");
    expect(providerFailure).toEqual({
      kind: "stale",
      reason: "Could not verify this item. Try refresh.",
    });
  });

  it("marks cart item unavailable when refreshed detail no longer sells variant", async () => {
    const storage = new Map<string, string>();
    const windowDouble = {
      addEventListener: () => undefined,
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => {
          storage.delete(key);
        },
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      },
      removeEventListener: () => undefined,
    };
    (globalThis as { window?: unknown }).window = windowDouble;
    writeCartStateToStorage(activeCart, windowDouble.localStorage);
    resetCartStoreForTest();

    const unavailableDetail: PublicCatalogDetailResult = {
      ...detail,
      variants: [
        {
          ...detail.variants[0]!,
          availability: {
            inStock: false,
            label: "Unavailable",
            tone: "error",
          },
          disabled: true,
          unavailableReason: "Selected option is unavailable right now.",
        },
      ],
    };
    const result = await refreshCartItem(
      activeCart.items[0]!,
      async () =>
        new Response(JSON.stringify({ data: unavailableDetail }), {
          status: 200,
        })
    );

    expect(result.kind).toBe("unavailable");
    expect(getCartSnapshot().items[0]).toMatchObject({
      availabilityStatus: "UNAVAILABLE",
      staleReason: "Selected option is unavailable right now.",
    });
  });
});
