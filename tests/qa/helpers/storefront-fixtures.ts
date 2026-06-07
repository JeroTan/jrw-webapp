import { expect, type Page, type Route } from "@playwright/test";

export const qaProductSlug = "qa-long-runner-jacket";

const longProductName =
  "JRW Modular Weatherproof Field Jacket With Extra Long Product Name";
const longVariantLabel =
  "Color: Ultramarine Blue / Size: Extra Long Tall / Fit: Relaxed Utility";

export const qaCartState = {
  items: [
    {
      availabilityStatus: "ACTIVE",
      availabilityText: "Available",
      imageAlt: longProductName,
      imageSrc:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'%3E%3Crect width='320' height='320' fill='%23f4f4f1'/%3E%3Cpath d='M0 0h320v320H0z' fill='none' stroke='%231d1d1b'/%3E%3Ctext x='160' y='164' text-anchor='middle' font-size='32' fill='%231d1d1b'%3EJRW%3C/text%3E%3C/svg%3E",
      maxQuantity: 12,
      priceCentavos: 149900,
      priceLabel: "PHP 1,499.00",
      productId: "prod_qa_jacket",
      productName: longProductName,
      productSlug: qaProductSlug,
      quantity: 2,
      updatedAt: "2026-06-07T00:00:00.000Z",
      variantId: "variant_qa_jacket_blue_tall",
      variantLabel: longVariantLabel,
      variantOptions: [
        { group: "Color", name: "Ultramarine Blue" },
        { group: "Size", name: "Extra Long Tall" },
      ],
    },
  ],
  updatedAt: "2026-06-07T00:00:00.000Z",
};

const qaValidatedLine = {
  availabilityLabel: "Available",
  availabilityStatus: "ACTIVE",
  imageAlt: longProductName,
  imageSrc: qaCartState.items[0].imageSrc,
  lineSubtotalCentavos: 299800,
  lineSubtotalLabel: "PHP 2,998.00",
  maxQuantity: 12,
  priceCentavos: 149900,
  priceLabel: "PHP 1,499.00",
  productId: "prod_qa_jacket",
  productName: longProductName,
  productSlug: qaProductSlug,
  quantity: 2,
  recoveryStatus: "READY",
  variantId: "variant_qa_jacket_blue_tall",
  variantLabel: longVariantLabel,
  variantOptions: [
    { group: "Color", name: "Ultramarine Blue" },
    { group: "Size", name: "Extra Long Tall" },
  ],
};

export const qaValidCheckoutSummary = {
  issues: [],
  items: [qaValidatedLine],
  lineItemCount: 1,
  requiresCustomerAcceptance: false,
  status: "VALID",
  subtotalCentavos: 299800,
  subtotalLabel: "PHP 2,998.00",
  totalQuantity: 2,
};

const qaBlockedCheckoutSummary = {
  ...qaValidCheckoutSummary,
  issues: [
    {
      code: "QUANTITY_UNAVAILABLE",
      message: "This option is unavailable right now.",
      productId: "prod_qa_jacket",
      variantId: "variant_qa_jacket_blue_tall",
    },
  ],
  items: [
    {
      ...qaValidatedLine,
      availabilityLabel: "Unavailable",
      availabilityStatus: "UNAVAILABLE",
      lineSubtotalCentavos: 0,
      lineSubtotalLabel: "PHP 0.00",
      maxQuantity: 0,
      quantity: 0,
      reason:
        "This option is unavailable right now because inventory changed before checkout.",
      recoveryStatus: "BLOCKED",
      suggestedAction:
        "Remove this item or choose another option before continuing to checkout.",
    },
  ],
  requiresCustomerAcceptance: true,
  status: "BLOCKED",
  subtotalCentavos: 0,
  subtotalLabel: "PHP 0.00",
  totalQuantity: 0,
};

const qaProductDetailEnvelope = {
  data: {
    action: {
      disabled: false,
      label: "Add to cart",
      reason: "Availability rechecks before checkout.",
    },
    brand: null,
    gallery: [
      {
        alt: longProductName,
        height: 320,
        id: "image_qa_jacket",
        isPrimary: true,
        name: longProductName,
        src: qaCartState.items[0].imageSrc,
        width: 320,
      },
    ],
    metadata: {
      availabilityText: "Available",
      canonicalPath: `/products/${qaProductSlug}`,
      description: `${longProductName}.`,
      imageAlt: longProductName,
      imageSrc: qaCartState.items[0].imageSrc,
      robots: "index,follow",
      title: `${longProductName} | JRW`,
    },
    product: {
      availability: {
        inStock: true,
        label: "Available",
        tone: "success",
      },
      brandName: "JRW Studio",
      categories: [],
      description: `${longProductName}.`,
      id: "prod_qa_jacket",
      name: longProductName,
      priceCentavos: 149900,
      priceLabel: "PHP 1,499.00",
      primaryImage: {
        alt: longProductName,
        height: 320,
        id: "image_qa_jacket",
        isPrimary: true,
        name: longProductName,
        src: qaCartState.items[0].imageSrc,
        width: 320,
      },
      slug: qaProductSlug,
      summary: longProductName,
    },
    recommendations: null,
    recoveryLinks: [],
    selectedVariantId: "variant_qa_jacket_blue_tall",
    variants: [
      {
        availability: {
          inStock: true,
          label: "Available",
          tone: "success",
        },
        disabled: false,
        id: "variant_qa_jacket_blue_tall",
        imageSrc: qaCartState.items[0].imageSrc,
        label: longVariantLabel,
        maxQuantity: 12,
        optionValues: [
          { group: "Color", name: "Ultramarine Blue" },
          { group: "Size", name: "Extra Long Tall" },
        ],
        priceCentavos: 149900,
        priceLabel: "PHP 1,499.00",
        productId: "prod_qa_jacket",
        selected: true,
      },
    ],
  },
  meta: { requestId: "qa_product_detail" },
};

export async function seedQaCart(page: Page) {
  await page.addInitScript((state) => {
    window.localStorage.setItem("jrw.cart.v1", JSON.stringify(state));
  }, qaCartState);
}

export async function mockQaProductDetail(page: Page) {
  await page.route(
    `**/api/storefront/catalog/products/${qaProductSlug}`,
    (route) =>
      route.fulfill({
        body: JSON.stringify(qaProductDetailEnvelope),
        contentType: "application/json",
        status: 200,
      })
  );
}

export async function mockQaCheckoutValidation(
  page: Page,
  result: "blocked" | "valid"
) {
  await page.route("**/api/checkout/cart-validations", async (route: Route) => {
    const requestBody = route.request().postDataJSON() as typeof qaCartState;

    expect(requestBody.items[0]).toMatchObject({
      productId: "prod_qa_jacket",
      productSlug: qaProductSlug,
      quantity: 2,
      variantId: "variant_qa_jacket_blue_tall",
    });

    if (result === "valid") {
      await route.fulfill({
        body: JSON.stringify({
          data: qaValidCheckoutSummary,
          meta: { requestId: "qa_checkout_valid" },
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        error: {
          code: "INVENTORY_UNAVAILABLE",
          details: qaBlockedCheckoutSummary,
          message: "Inventory is unavailable.",
        },
      }),
      contentType: "application/json",
      status: 409,
    });
  });
}

