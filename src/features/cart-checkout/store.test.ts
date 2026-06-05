import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addCartItem } from "@/domain/checkout/cart";
import {
  addCartItemToStore,
  applyCheckoutValidationSummaryToStore,
  CART_STORAGE_KEY,
  getCartSnapshot,
  parseCartState,
  readCartStateFromStorage,
  resetCartStoreForTest,
  subscribeCartStore,
  writeCartStateToStorage,
} from "./store";

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

type FakeStorageEvent = {
  key: string | null;
  newValue: string | null;
};

function createStorageDouble() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

function createWindowDouble(storage = createStorageDouble()) {
  const listeners = new Set<(event: FakeStorageEvent) => void>();

  return {
    addEventListener: (type: string, listener: (event: FakeStorageEvent) => void) => {
      if (type === "storage") {
        listeners.add(listener);
      }
    },
    dispatchStorage: (event: FakeStorageEvent) => {
      for (const listener of listeners) {
        listener(event);
      }
    },
    localStorage: storage,
    removeEventListener: (
      type: string,
      listener: (event: FakeStorageEvent) => void
    ) => {
      if (type === "storage") {
        listeners.delete(listener);
      }
    },
  };
}

describe("cart store", () => {
  const originalWindow = (globalThis as { window?: unknown }).window;

  beforeEach(() => {
    resetCartStoreForTest();
  });

  afterEach(() => {
    resetCartStoreForTest();
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  it("hydrates and persists localStorage cart state safely", () => {
    const storage = createStorageDouble();
    const added = addCartItem(
      {
        items: [],
        updatedAt: "t0",
      },
      linenSmall,
      "t1"
    );

    writeCartStateToStorage(added.state, storage);

    expect(readCartStateFromStorage(storage)).toMatchObject({
      items: [{ productId: "prod_linen", quantity: 1 }],
      updatedAt: "t1",
    });
    expect(parseCartState("{bad json").items).toHaveLength(0);

    const fallbackLabel = parseCartState(
      JSON.stringify({
        items: [
          {
            ...added.state.items[0],
            priceCentavos: 149900,
            priceLabel: "",
          },
        ],
        updatedAt: "t2",
      })
    );

    expect(fallbackLabel.items[0]?.priceLabel).toBe("PHP 1,499.00");

    const legacyOverMax = parseCartState(
      JSON.stringify({
        items: [
          {
            ...added.state.items[0],
            maxQuantity: undefined,
            quantity: 102,
          },
        ],
        updatedAt: "t3",
      })
    );

    expect(legacyOverMax.items[0]).toMatchObject({
      maxQuantity: 99,
      quantity: 99,
    });
  });

  it("notifies same-tab subscribers after cart writes", () => {
    const windowDouble = createWindowDouble();
    (globalThis as { window?: unknown }).window = windowDouble;
    let publishCount = 0;

    subscribeCartStore(() => {
      publishCount += 1;
    });
    const result = addCartItemToStore(linenSmall);

    expect(result.error).toBeNull();
    expect(publishCount).toBe(1);
    expect(windowDouble.localStorage.getItem(CART_STORAGE_KEY)).toContain(
      "prod_linen"
    );
  });

  it("syncs cross-tab storage events into current snapshot", () => {
    const windowDouble = createWindowDouble();
    (globalThis as { window?: unknown }).window = windowDouble;
    let publishCount = 0;

    subscribeCartStore(() => {
      publishCount += 1;
    });

    const added = addCartItem(
      {
        items: [],
        updatedAt: "t0",
      },
      { ...linenSmall, quantity: 2 },
      "t1"
    );

    windowDouble.dispatchStorage({
      key: CART_STORAGE_KEY,
      newValue: JSON.stringify(added.state),
    });

    expect(publishCount).toBe(1);
    expect(getCartSnapshot()).toMatchObject({
      items: [{ quantity: 2 }],
    });
  });

  it("applies checkout validation summaries to local cart lines", () => {
    const windowDouble = createWindowDouble();
    (globalThis as { window?: unknown }).window = windowDouble;
    const added = addCartItemToStore(linenSmall);

    expect(added.error).toBeNull();

    applyCheckoutValidationSummaryToStore({
      issues: [
        {
          code: "PRICE_CHANGED",
          message: "Review updated price before checkout.",
          productId: "prod_linen",
          variantId: "variant_linen_small",
        },
      ],
      items: [
        {
          availabilityLabel: "Available",
          availabilityStatus: "STALE",
          lineSubtotalCentavos: 2499,
          lineSubtotalLabel: "PHP 24.99",
          maxQuantity: 8,
          priceCentavos: 2499,
          priceLabel: "PHP 24.99",
          productId: "prod_linen",
          productName: "Linen Shirt",
          productSlug: "linen-shirt",
          quantity: 1,
          reason: "Review updated price before checkout.",
          recoveryStatus: "PRICE_CHANGED",
          variantId: "variant_linen_small",
          variantLabel: "Size: Small",
          variantOptions: [{ group: "Size", name: "Small" }],
        },
      ],
      lineItemCount: 1,
      requiresCustomerAcceptance: true,
      status: "CHANGED",
      subtotalCentavos: 2499,
      subtotalLabel: "PHP 24.99",
      totalQuantity: 1,
    });

    expect(getCartSnapshot().items[0]).toMatchObject({
      availabilityStatus: "STALE",
      priceCentavos: 2499,
      quantity: 1,
      staleReason: "Review updated price before checkout.",
    });
  });
});

