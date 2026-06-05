import { expect, type Page, test } from "@playwright/test";

const viewports = [320, 375, 390, 430, 768, 1024, 1440] as const;

const cartState = {
  items: [
    {
      availabilityStatus: "ACTIVE",
      availabilityText: "Available",
      maxQuantity: 12,
      priceCentavos: 149900,
      priceLabel: "PHP 1,499.00",
      productId: "prod_linen",
      productName: "Linen Shirt",
      productSlug: "linen-shirt",
      quantity: 2,
      updatedAt: "2026-06-05T00:00:00.000Z",
      variantId: "variant_linen_small",
      variantLabel: "Size: Small",
      variantOptions: [{ group: "Size", name: "Small" }],
    },
  ],
  updatedAt: "2026-06-05T00:00:00.000Z",
};

const productDetailEnvelope = {
  data: {
    action: {
      disabled: false,
      label: "Add to cart",
      reason: "Availability rechecks before checkout.",
    },
    brand: null,
    gallery: [],
    metadata: {
      availabilityText: "Available",
      canonicalPath: "/products/linen-shirt",
      description: "Lightweight linen shirt.",
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
      priceCentavos: 149900,
      priceLabel: "PHP 1,499.00",
      primaryImage: null,
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
        label: "Size: Small",
        maxQuantity: 12,
        optionValues: [{ group: "Size", name: "Small" }],
        priceCentavos: 149900,
        priceLabel: "PHP 1,499.00",
        productId: "prod_linen",
        selected: true,
      },
    ],
  },
  meta: { requestId: "qa_product_detail" },
};

function changedSummary() {
  return {
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
        lineSubtotalCentavos: 319800,
        lineSubtotalLabel: "PHP 3,198.00",
        maxQuantity: 12,
        priceCentavos: 159900,
        priceLabel: "PHP 1,599.00",
        productId: "prod_linen",
        productName: "Linen Shirt",
        productSlug: "linen-shirt",
        quantity: 2,
        reason: "Review updated price before checkout.",
        recoveryStatus: "PRICE_CHANGED",
        suggestedAction: "Review updated price before checkout.",
        variantId: "variant_linen_small",
        variantLabel: "Size: Small",
        variantOptions: [{ group: "Size", name: "Small" }],
      },
    ],
    lineItemCount: 1,
    requiresCustomerAcceptance: true,
    status: "CHANGED",
    subtotalCentavos: 319800,
    subtotalLabel: "PHP 3,198.00",
    totalQuantity: 2,
  };
}

function blockedSummary() {
  return {
    issues: [
      {
        code: "QUANTITY_UNAVAILABLE",
        message: "This option is unavailable right now.",
        productId: "prod_linen",
        variantId: "variant_linen_small",
      },
    ],
    items: [
      {
        availabilityLabel: "Unavailable",
        availabilityStatus: "UNAVAILABLE",
        lineSubtotalCentavos: 0,
        lineSubtotalLabel: "PHP 0.00",
        maxQuantity: 0,
        priceCentavos: 149900,
        priceLabel: "PHP 1,499.00",
        productId: "prod_linen",
        productName: "Linen Shirt",
        productSlug: "linen-shirt",
        quantity: 0,
        reason: "This option is unavailable right now.",
        recoveryStatus: "BLOCKED",
        suggestedAction: "Remove this item or choose another option.",
        variantId: "variant_linen_small",
        variantLabel: "Size: Small",
        variantOptions: [{ group: "Size", name: "Small" }],
      },
    ],
    lineItemCount: 1,
    requiresCustomerAcceptance: true,
    status: "BLOCKED",
    subtotalCentavos: 0,
    subtotalLabel: "PHP 0.00",
    totalQuantity: 0,
  };
}

async function seedCart(page: Page) {
  await page.addInitScript((state) => {
    window.localStorage.setItem("jrw.cart.v1", JSON.stringify(state));
  }, cartState);
}

async function mockProductDetail(page: Page) {
  await page.route("**/api/storefront/catalog/products/linen-shirt", (route) =>
    route.fulfill({
      body: JSON.stringify(productDetailEnvelope),
      contentType: "application/json",
      status: 200,
    })
  );
}

async function mockCheckoutValidation(
  page: Page,
  response: "blocked" | "changed"
) {
  await page.route("**/api/checkout/cart-validations", async (route) => {
    const requestBody = route.request().postDataJSON() as typeof cartState;
    expect(requestBody.items[0]).toMatchObject({
      productId: "prod_linen",
      productSlug: "linen-shirt",
      quantity: 2,
      variantId: "variant_linen_small",
    });

    await route.fulfill({
      body: JSON.stringify({
        error: {
          code:
            response === "changed" ? "CONFLICT_STATE" : "INVENTORY_UNAVAILABLE",
          details: response === "changed" ? changedSummary() : blockedSummary(),
          message:
            response === "changed"
              ? "Cart state changed."
              : "Inventory is unavailable.",
        },
      }),
      contentType: "application/json",
      status: 409,
    });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function waitForAstroIslands(page: Page) {
  await page.waitForFunction(
    () => !document.querySelector("astro-island[ssr]")
  );
}

for (const width of viewports) {
  test(`cart changed-price validation fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ height: width < 768 ? 900 : 1000, width });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedCart(page);
    await mockProductDetail(page);
    await mockCheckoutValidation(page, "changed");

    await page.goto("/cart");
    await waitForAstroIslands(page);

    const checkCart = page.getByRole("button", { name: "Check cart" });
    await expect(checkCart).toBeVisible();
    await Promise.all([
      page.waitForResponse("**/api/checkout/cart-validations"),
      checkCart.press("Enter"),
    ]);

    await expect(
      page.getByText("Review cart updates before checkout.")
    ).toBeVisible();
    await expect(
      page.getByText("Review updated price before checkout.").first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Review changes" })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test(`checkout blocked validation fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ height: width < 768 ? 900 : 1000, width });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedCart(page);
    await mockCheckoutValidation(page, "blocked");

    const validationResponse = page.waitForResponse(
      "**/api/checkout/cart-validations"
    );
    await page.goto("/checkout");
    await validationResponse;
    await waitForAstroIslands(page);

    await expect(
      page.getByRole("heading", { name: "Review cart" })
    ).toBeVisible();
    await expect(
      page.getByText("Resolve unavailable items before checkout.")
    ).toBeVisible();
    await expect(
      page.getByText("This option is unavailable right now.")
    ).toBeVisible();
    await expect(page.getByText("Full name")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
}
