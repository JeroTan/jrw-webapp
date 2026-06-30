import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { addCartItem } from "@/domain/checkout/cart";
import type { PublicCatalogDetailResult } from "@/domain/products/public-types";
import {
  CartDrawerView,
  CartPageView,
  CheckoutDetailsPageView,
  CheckoutFlowShell,
  PaymentReturnCheckoutView,
  PaymentReturnStatusView,
  redirectToPayMongoCheckout,
} from "@/features/cart-checkout";
import {
  fetchCartProductDetail,
  createPayMongoPaymentHandoff,
  refreshCartItem,
  reserveCheckoutInventory,
  submitCheckoutDetails,
  validateCartBeforeCheckout,
} from "../api";
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
    expect(markup).not.toContain('href="/checkout"');
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

  it("renders checkout details form as step two without account prompts", () => {
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
    expect(markup).toContain("Street address");
    expect(markup).toContain("City / Province");
    expect(markup).toContain("Barangay");
    expect(markup).toContain("Postal code");
    expect(markup).toContain("I agree JRW can use these details");
    expect(markup).not.toContain("Save details");
    expect(markup).not.toContain("Details saved for checkout");
    expect(markup).not.toContain("Account assist");
    expect(markup).not.toContain("Email sign in");
    expect(markup).not.toContain("Create account");
    expect(markup).not.toContain(
      "/api/oauth/google/sessions?returnTo=/checkout"
    );
    expect(markup).not.toContain("Continue with Google");
    expect(markup).toContain("Continue to Payment");
    expect(markup).toMatch(/<button[^>]*disabled/);
  });

  it("keeps checkout details as first paint while cart validation is pending", () => {
    const markup = renderToStaticMarkup(
      createElement(CheckoutDetailsPageView, {
        state: activeCart,
        validationStatus: "pending",
      })
    );

    expect(markup).toContain('id="checkout-details-title"');
    expect(markup).toContain("02 Details");
    expect(markup).toContain("Checking cart before payment.");
    expect(markup).not.toContain('id="checkout-validation-title"');
    expect(markup).not.toContain("Review cart");
  });

  it("links completed checkout steps and renders a details back action", () => {
    const markup = renderToStaticMarkup(
      createElement(CheckoutDetailsPageView, { state: activeCart })
    );

    expect(markup).toContain('aria-label="Go back to Cart step"');
    expect(markup).toContain('href="/cart"');
    expect(markup).toContain("Back to Cart");
    expect(markup).toContain("lucide-arrow-left");
    expect(markup).not.toContain("&lt;-");
  });

  it("enables the payment CTA when checkout details are valid", () => {
    const markup = renderToStaticMarkup(
      createElement(CheckoutDetailsPageView, {
        canContinueToPayment: true,
        detailsValues: {
          barangay: "Barangay 456",
          cityProvince: "Quezon City",
          email: "nina@example.com",
          fullName: "Nina Reyes",
          phone: "+63 917 555 1212",
          postalCode: "1100",
          privacyAcknowledged: true,
          streetAddress: "12 Sampaguita Street",
        },
        onContinueToPayment: () => undefined,
        state: activeCart,
      })
    );

    expect(markup).toContain("Continue to Payment");
    expect(markup).not.toContain("Save details");
    expect(markup).not.toMatch(/<button[^>]*disabled/);
  });

  it("keeps the details step visible while payment reservation is processing", () => {
    const markup = renderToStaticMarkup(
      createElement(CheckoutDetailsPageView, {
        detailsStatus: "reserving",
        state: activeCart,
        validationStatus: "pending",
      })
    );

    expect(markup).toContain('id="checkout-details-title"');
    expect(markup).toContain("02 Details");
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain("Reserving items for payment.");
    expect(markup).not.toContain('id="checkout-validation-title"');
    expect(markup).not.toContain("Review cart");
  });

  it("renders reserved checkout as payment step with PayMongo handoff", () => {
    const markup = renderToStaticMarkup(
      createElement(CheckoutDetailsPageView, {
        detailsStatus: "reserved",
        paymentHandoffUrl: "https://checkout.paymongo.com/cs_test_ui",
        state: activeCart,
      })
    );

    expect(markup).toContain("03 Payment");
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain("Items reserved. Continue with PayMongo.");
    expect(markup).toContain("Continue to PayMongo");
    expect(markup).toContain('aria-label="Go back to Cart step"');
    expect(markup).toContain('aria-label="Go back to Details step"');
    expect(markup).toContain('href="/checkout"');
    expect(markup).toContain('href="https://checkout.paymongo.com/cs_test_ui"');
    expect(markup).toContain("Back to Details");
    expect(markup).toContain("lucide-arrow-left");
    expect(markup).not.toContain("&lt;-");
    expect(markup).not.toContain("Payment ready");
  });

  it("redirects immediately when PayMongo handoff is ready", () => {
    let assignedUrl = "";

    redirectToPayMongoCheckout(
      "https://checkout.paymongo.com/cs_test_redirect",
      {
        assign: (url) => {
          assignedUrl = String(url);
        },
      }
    );

    expect(assignedUrl).toBe("https://checkout.paymongo.com/cs_test_redirect");
  });

  it("does not redirect to an untrusted checkout URL", () => {
    let assignedUrl = "";

    const redirected = redirectToPayMongoCheckout(
      "https://evil.example/cs_bad",
      {
        assign: (url) => {
          assignedUrl = String(url);
        },
      }
    );

    expect(redirected).toBe(false);
    expect(assignedUrl).toBe("");
  });

  it("keeps receipt step history non-clickable", () => {
    const markup = renderToStaticMarkup(
      createElement(CheckoutFlowShell, {
        children: createElement("div", null, "Receipt ready"),
        currentStep: "receipt",
        state: activeCart,
        title: "Receipt",
        titleId: "receipt-title",
      })
    );

    expect(markup).toContain("04 Receipt");
    expect(markup).toContain('aria-current="step"');
    expect(markup).not.toContain('href="/cart"');
    expect(markup).not.toContain('href="/checkout"');
    expect(markup).not.toContain("Back to");
  });

  it("renders signed-in prefill while keeping missing checkout fields editable", () => {
    const markup = renderToStaticMarkup(
      createElement(CheckoutDetailsPageView, {
        detailsValues: {
          barangay: "",
          cityProvince: "",
          email: "nina@example.com",
          fullName: "Nina Reyes",
          phone: "",
          postalCode: "",
          privacyAcknowledged: false,
          streetAddress: "",
        },
        state: activeCart,
      })
    );

    expect(markup).toContain('value="nina@example.com"');
    expect(markup).toContain('value="Nina Reyes"');
    expect(markup).toContain('name="phone"');
    expect(markup).toContain('required=""');
    expect(markup).not.toContain("EMAIL_NOT_VERIFIED");
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
    const staleCart = {
      ...activeCart,
      items: [
        {
          ...activeCart.items[0]!,
          availabilityStatus: "STALE" as const,
          availabilityText: "Review needed",
          priceCentavos: 159900,
          priceLabel: "PHP 1,599.00",
          staleReason: "Review updated price before checkout.",
          suggestedAction: "Review updated price before checkout.",
        },
      ],
      updatedAt: "t2",
    };
    const markup = renderToStaticMarkup(
      createElement(CartPageView, { state: staleCart })
    );

    expect(markup).toContain("Review updated price before checkout.");
    expect(markup).toContain("Resolve unavailable or unverified items");
    expect(markup).toContain("Check cart");
    expect(markup).toContain("Item price: PHP 1,599.00");
    expect(markup).toContain("PHP 3,198.00");
    expect(markup).not.toContain("stock_lock_version");
    expect(markup).not.toContain("R2");
  });

  it("shows blocked line reasons and suggested actions together", () => {
    const unavailableCart = {
      ...activeCart,
      items: [
        {
          ...activeCart.items[0]!,
          availabilityStatus: "UNAVAILABLE" as const,
          availabilityText: "Unavailable",
          staleReason: "This option is unavailable right now.",
          suggestedAction: "Remove this item or choose another option.",
        },
      ],
      updatedAt: "t2",
    };
    const markup = renderToStaticMarkup(
      createElement(CartPageView, { state: unavailableCart })
    );

    expect(markup).toContain("This option is unavailable right now.");
    expect(markup).toContain("Remove this item or choose another option.");
    expect(markup).toContain("Item price: PHP 1,499.00");
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
        new Response(
          JSON.stringify({ error: { code: "PROVIDER_UNAVAILABLE" } }),
          {
            status: 503,
          }
        )
    );

    expect(ok.kind).toBe("ok");
    expect(providerFailure).toEqual({
      kind: "stale",
      reason: "Could not verify this item. Try refresh.",
    });
  });

  it("maps checkout validation API success with local cart payload", async () => {
    let capturedUrl = "";
    let capturedBody: unknown;
    const result = await validateCartBeforeCheckout(
      activeCart,
      async (url, init) => {
        capturedUrl = String(url);
        capturedBody = JSON.parse(String(init?.body));

        return new Response(
          JSON.stringify({
            data: {
              issues: [],
              items: [
                {
                  availabilityLabel: "Available",
                  availabilityStatus: "ACTIVE",
                  lineSubtotalCentavos: 299800,
                  lineSubtotalLabel: "PHP 2,998.00",
                  maxQuantity: 8,
                  priceCentavos: 149900,
                  priceLabel: "PHP 1,499.00",
                  productId: "prod_linen",
                  productName: "Linen Shirt",
                  productSlug: "linen-shirt",
                  quantity: 2,
                  recoveryStatus: "READY",
                  variantId: "variant_linen_small",
                  variantLabel: "Size: Small",
                  variantOptions: [{ group: "Size", name: "Small" }],
                },
              ],
              lineItemCount: 1,
              requiresCustomerAcceptance: false,
              status: "VALID",
              subtotalCentavos: 299800,
              subtotalLabel: "PHP 2,998.00",
              totalQuantity: 2,
            },
            meta: { requestId: "req_checkout_client" },
          }),
          { status: 200 }
        );
      }
    );

    expect(capturedUrl).toBe("/api/checkout/cart-validations");
    expect(capturedBody).toMatchObject({
      items: [
        {
          priceCentavos: 149900,
          productId: "prod_linen",
          productSlug: "linen-shirt",
          quantity: 2,
          variantId: "variant_linen_small",
        },
      ],
    });
    expect(result).toMatchObject({
      kind: "valid",
      summary: {
        status: "VALID",
      },
    });
  });

  it("maps checkout validation changed and runtime failures safely", async () => {
    const changedResult = await validateCartBeforeCheckout(
      activeCart,
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "CONFLICT_STATE",
              message: "The request conflicts with the current state.",
              details: {
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
                    maxQuantity: 8,
                    priceCentavos: 159900,
                    priceLabel: "PHP 1,599.00",
                    productId: "prod_linen",
                    productName: "Linen Shirt",
                    productSlug: "linen-shirt",
                    quantity: 2,
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
                subtotalCentavos: 319800,
                subtotalLabel: "PHP 3,198.00",
                totalQuantity: 2,
              },
            },
          }),
          { status: 409 }
        )
    );
    const failureResult = await validateCartBeforeCheckout(
      activeCart,
      async () => {
        throw new Error("network down");
      }
    );

    expect(changedResult).toMatchObject({
      kind: "changed",
      summary: {
        status: "CHANGED",
      },
    });
    expect(failureResult).toEqual({
      kind: "failure",
      reason: "Could not verify cart. Try again.",
    });
  });

  it("retries checkout validation after refreshing summary-less conflicts", async () => {
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
    const reducedDetail: PublicCatalogDetailResult = {
      ...detail,
      variants: [
        {
          ...detail.variants[0]!,
          maxQuantity: 1,
          priceCentavos: 149900,
          priceLabel: "PHP 1,499.00",
        },
      ],
    };
    const requestedUrls: string[] = [];
    let checkoutValidationCalls = 0;

    const result = await validateCartBeforeCheckout(activeCart, async (url) => {
      requestedUrls.push(String(url));

      if (String(url) === "/api/checkout/cart-validations") {
        checkoutValidationCalls += 1;

        if (checkoutValidationCalls === 1) {
          return new Response(
            JSON.stringify({
              error: {
                code: "CONFLICT_STATE",
                details: { requestId: "req_legacy_checkout_conflict" },
              },
            }),
            { status: 409 }
          );
        }

        return new Response(
          JSON.stringify({
            data: {
              issues: [],
              items: [
                {
                  availabilityLabel: "Available",
                  availabilityStatus: "ACTIVE",
                  lineSubtotalCentavos: 149900,
                  lineSubtotalLabel: "PHP 1,499.00",
                  maxQuantity: 1,
                  priceCentavos: 149900,
                  priceLabel: "PHP 1,499.00",
                  productId: "prod_linen",
                  productName: "Linen Shirt",
                  productSlug: "linen-shirt",
                  quantity: 1,
                  recoveryStatus: "READY",
                  variantId: "variant_linen_small",
                  variantLabel: "Size: Small",
                  variantOptions: [{ group: "Size", name: "Small" }],
                },
              ],
              lineItemCount: 1,
              requiresCustomerAcceptance: false,
              status: "VALID",
              subtotalCentavos: 149900,
              subtotalLabel: "PHP 1,499.00",
              totalQuantity: 1,
            },
            meta: { requestId: "req_checkout_retry_valid" },
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ data: reducedDetail }), {
        status: 200,
      });
    });

    expect(requestedUrls).toEqual([
      "/api/checkout/cart-validations",
      "/api/storefront/catalog/products/linen-shirt",
      "/api/checkout/cart-validations",
    ]);
    expect(result).toMatchObject({
      kind: "valid",
      summary: {
        status: "VALID",
      },
    });
    expect(getCartSnapshot().items[0]).toMatchObject({
      maxQuantity: 1,
      quantity: 1,
    });
  });

  it("posts checkout details without browser customer identity fields", async () => {
    let capturedUrl = "";
    let capturedBody: unknown;
    const result = await submitCheckoutDetails(
      {
        barangay: "Barangay 456",
        cityProvince: "Quezon City",
        email: "nina@example.com",
        fullName: "Nina Reyes",
        phone: "+63 917 555 1212",
        postalCode: "1100",
        privacyAcknowledged: true,
        streetAddress: "12 Sampaguita Street",
      },
      async (url, init) => {
        capturedUrl = String(url);
        capturedBody = JSON.parse(String(init?.body));

        return new Response(
          JSON.stringify({
            data: {
              attempt: {
                attemptId: "attempt_checkout_details",
                attemptToken: "attempt_token_checkout_details",
                status: "DETAILS_CAPTURED",
              },
              customer: { customerId: null, mode: "guest" },
              details: {
                barangay: "Barangay 456",
                cityProvince: "Quezon City",
                email: "nina@example.com",
                firstName: "Nina",
                fullName: "Nina Reyes",
                lastName: "Reyes",
                phone: "+63 917 555 1212",
                postalCode: "1100",
                privacyAcknowledged: true,
                streetAddress: "12 Sampaguita Street",
              },
              next: { cartValidationRequired: true, paymentAllowed: false },
            },
            meta: { requestId: "req_checkout_details_client" },
          }),
          { status: 200 }
        );
      }
    );

    expect(capturedUrl).toBe("/api/checkout/details");
    expect(capturedBody).toEqual({
      barangay: "Barangay 456",
      cityProvince: "Quezon City",
      email: "nina@example.com",
      fullName: "Nina Reyes",
      phone: "+63 917 555 1212",
      postalCode: "1100",
      privacyAcknowledged: true,
      streetAddress: "12 Sampaguita Street",
    });
    expect(result).toMatchObject({
      kind: "saved",
      attempt: {
        attemptToken: "attempt_token_checkout_details",
      },
      details: {
        email: "nina@example.com",
      },
    });
  });

  it("maps checkout details provider failure to service unavailable copy", async () => {
    const result = await submitCheckoutDetails(
      {
        barangay: "Barangay 456",
        cityProvince: "Quezon City",
        email: "nina@example.com",
        fullName: "Nina Reyes",
        phone: "+63 917 555 1212",
        postalCode: "1100",
        privacyAcknowledged: true,
        streetAddress: "12 Sampaguita Street",
      },
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "PROVIDER_UNAVAILABLE",
              message:
                "A required provider is unavailable. Please try again later.",
            },
          }),
          { status: 503 }
        )
    );

    expect(result).toEqual({
      kind: "failure",
      reason: "Checkout service is unavailable. Try again in a moment.",
    });
  });

  it("posts reservation request with attempt token and maps safe success", async () => {
    let capturedUrl = "";
    let capturedBody: unknown;
    const result = await reserveCheckoutInventory(
      {
        attemptId: "attempt_checkout_details",
        attemptToken: "attempt_token_checkout_details",
        state: activeCart,
      },
      async (url, init) => {
        capturedUrl = String(url);
        capturedBody = JSON.parse(String(init?.body));

        return new Response(
          JSON.stringify({
            data: {
              attempt: {
                attemptId: "attempt_checkout_details",
                status: "INVENTORY_RESERVED",
              },
              cart: {
                issues: [],
                items: [
                  {
                    availabilityLabel: "Available",
                    availabilityStatus: "ACTIVE",
                    lineSubtotalCentavos: 299800,
                    lineSubtotalLabel: "PHP 2,998.00",
                    maxQuantity: 8,
                    priceCentavos: 149900,
                    priceLabel: "PHP 1,499.00",
                    productId: "prod_linen",
                    productName: "Linen Shirt",
                    productSlug: "linen-shirt",
                    quantity: 2,
                    recoveryStatus: "READY",
                    variantId: "variant_linen_small",
                    variantLabel: "Size: Small",
                    variantOptions: [{ group: "Size", name: "Small" }],
                  },
                ],
                lineItemCount: 1,
                requiresCustomerAcceptance: false,
                status: "VALID",
                subtotalCentavos: 299800,
                subtotalLabel: "PHP 2,998.00",
                totalQuantity: 2,
              },
              next: {
                payMongoCreationRequired: true,
                paymentAllowed: true,
              },
              reservation: {
                expiresAt: "2026-06-12T08:15:00.000Z",
                reservationId: "reservation_checkout_details",
                status: "ACTIVE",
              },
            },
          }),
          { status: 200 }
        );
      }
    );

    expect(capturedUrl).toBe(
      "/api/checkout/attempts/attempt_checkout_details/reservations"
    );
    expect(capturedBody).toMatchObject({
      attemptToken: "attempt_token_checkout_details",
      items: [
        {
          priceCentavos: 149900,
          productId: "prod_linen",
          productSlug: "linen-shirt",
          quantity: 2,
          variantId: "variant_linen_small",
        },
      ],
    });
    expect(result).toMatchObject({
      kind: "reserved",
      next: {
        paymentAllowed: true,
      },
      reservation: {
        reservationId: "reservation_checkout_details",
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/hash|stock_version/i);
  });

  it("posts PayMongo handoff request with attempt token and maps safe success", async () => {
    let capturedUrl = "";
    let capturedBody: unknown;
    const result = await createPayMongoPaymentHandoff(
      {
        attemptId: "attempt_checkout_details",
        attemptToken: "attempt_token_checkout_details",
      },
      async (url, init) => {
        capturedUrl = String(url);
        capturedBody = JSON.parse(String(init?.body));

        return new Response(
          JSON.stringify({
            data: {
              attempt: {
                attemptId: "attempt_checkout_details",
                status: "PAYMENT_CREATED",
              },
              handoff: {
                checkoutUrl: "https://checkout.paymongo.com/cs_test_client",
                redirectMethod: "browser",
              },
              next: {
                orderCreated: false,
                receiptAvailable: false,
                webhookRequired: true,
              },
              payment: {
                amountCentavos: 299800,
                currency: "PHP",
                paymentId: "payment_checkout_details",
                provider: "PAYMONGO",
                providerCheckoutSessionId: "cs_test_client",
                status: "PAYMENT_PENDING",
              },
              reservation: {
                expiresAt: "2026-06-12T08:15:00.000Z",
                reservationId: "reservation_checkout_details",
                status: "ACTIVE",
              },
            },
          }),
          { status: 200 }
        );
      }
    );

    expect(capturedUrl).toBe(
      "/api/checkout/attempts/attempt_checkout_details/payments"
    );
    expect(capturedUrl).not.toContain("/__jrw-dev/paymongo/checkout-sessions");
    expect(capturedBody).toEqual({
      attemptToken: "attempt_token_checkout_details",
    });
    expect(result).toMatchObject({
      attempt: {
        status: "PAYMENT_CREATED",
      },
      checkoutUrl: "https://checkout.paymongo.com/cs_test_client",
      kind: "handoff",
      payment: {
        provider: "PAYMONGO",
        status: "PAYMENT_PENDING",
      },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /hash|stock_version|cardNumber/i
    );
  });

  it("rejects malicious checkout URLs from payment API responses", async () => {
    const result = await createPayMongoPaymentHandoff(
      {
        attemptId: "attempt_checkout_details",
        attemptToken: "attempt_token_checkout_details",
      },
      async () =>
        new Response(
          JSON.stringify({
            data: {
              attempt: {
                attemptId: "attempt_checkout_details",
                status: "PAYMENT_CREATED",
              },
              handoff: {
                checkoutUrl: "https://evil.example/cs_bad",
                redirectMethod: "browser",
              },
              next: {
                orderCreated: false,
                receiptAvailable: false,
                webhookRequired: true,
              },
              payment: {
                amountCentavos: 299800,
                currency: "PHP",
                paymentId: "payment_checkout_details",
                provider: "PAYMONGO",
                providerCheckoutSessionId: "cs_bad",
                status: "PAYMENT_PENDING",
              },
              reservation: {
                expiresAt: "2026-06-12T08:15:00.000Z",
                reservationId: "reservation_checkout_details",
                status: "ACTIVE",
              },
            },
          }),
          { status: 200 }
        )
    );

    expect(result.kind).toBe("failure");
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

  it("renders payment return confirmation without provider internals", () => {
    const markup = renderToStaticMarkup(
      createElement(PaymentReturnStatusView, {
        result: {
          kind: "loaded",
          status: {
            canRetry: false,
            next: {
              refreshAllowed: false,
              retryCheckoutAllowed: false,
            },
            order: {
              orderId: "order_1",
              orderNumber: "JRW-2026-ORDER1",
              totalCentavos: 3998,
            },
            payment: {
              paymentId: "payment_1",
              status: "PAYMENT_PAID",
            },
            status: "confirmed",
          },
        },
      })
    );

    expect(markup).toContain("Order confirmed");
    expect(markup).toContain("JRW-2026-ORDER1");
    expect(markup).toContain("mx-auto grid w-full max-w-xl");
    expect(markup).not.toContain("Continue shopping");
    expect(markup).not.toMatch(
      /checkout\.paymongo|cs_test|nina@example|Sampaguita|attemptToken|card/i
    );
  });

  it("keeps payment return status content free of inline actions", () => {
    const markup = renderToStaticMarkup(
      createElement(PaymentReturnStatusView, {
        result: {
          kind: "loaded",
          status: {
            canRetry: true,
            next: {
              refreshAllowed: true,
              retryCheckoutAllowed: true,
            },
            payment: {
              paymentId: "payment_1",
              status: "PAYMENT_PENDING",
            },
            status: "pending",
          },
        },
      })
    );

    expect(markup).toContain("Payment pending");
    expect(markup).not.toMatch(
      /<button|href=|Check status|Return to checkout/i
    );
  });

  it("renders payment return inside checkout receipt step", () => {
    const markup = renderToStaticMarkup(
      createElement(PaymentReturnCheckoutView, {
        result: {
          kind: "loaded",
          status: {
            canRetry: false,
            next: {
              refreshAllowed: true,
              retryCheckoutAllowed: false,
            },
            payment: {
              paymentId: "payment_1",
              status: "PAYMENT_PENDING",
            },
            status: "pending",
          },
        },
        state: activeCart,
      })
    );

    expect(markup).toContain("04 Receipt");
    expect(markup).toContain("Payment pending");
    expect(markup).toContain("Cart summary");
    expect(markup).not.toMatch(
      /checkout\.paymongo|cs_test|nina@example|Sampaguita|attemptToken|card/i
    );
  });

  it("uses server order total for confirmed receipt summary", () => {
    const markup = renderToStaticMarkup(
      createElement(PaymentReturnCheckoutView, {
        result: {
          kind: "loaded",
          status: {
            canRetry: false,
            next: {
              refreshAllowed: false,
              retryCheckoutAllowed: false,
            },
            order: {
              orderId: "order_1",
              orderNumber: "JRW-2026-ORDER1",
              totalCentavos: 3998,
            },
            payment: {
              paymentId: "payment_1",
              status: "PAYMENT_PAID",
            },
            status: "confirmed",
          },
        },
        state: activeCart,
      })
    );

    expect(markup).toContain("Order summary");
    expect(markup).toContain("JRW-2026-ORDER1");
    expect(markup).toContain("PHP 39.98");
    expect(markup).not.toContain("PHP 2,998.00");
  });
});
