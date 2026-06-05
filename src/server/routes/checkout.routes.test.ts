import { describe, expect, it } from "vitest";
import { createApp } from "@/server/app";
import {
  CheckoutController,
  type CheckoutServiceLike,
} from "@/server/controllers/CheckoutController";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";

const validatedSummary = {
  issues: [],
  items: [
    {
      availabilityLabel: "Available" as const,
      availabilityStatus: "ACTIVE" as const,
      lineSubtotalCentavos: 3998,
      lineSubtotalLabel: "PHP 39.98",
      maxQuantity: 8,
      priceCentavos: 1999,
      priceLabel: "PHP 19.99",
      productId: "prod_linen",
      productName: "Linen Shirt",
      productSlug: "linen-shirt",
      quantity: 2,
      recoveryStatus: "READY" as const,
      variantId: "variant_linen_small",
      variantLabel: "Size: Small",
      variantOptions: [{ group: "Size", name: "Small" }],
    },
  ],
  lineItemCount: 1,
  requiresCustomerAcceptance: false,
  status: "VALID" as const,
  subtotalCentavos: 3998,
  subtotalLabel: "PHP 39.98",
  totalQuantity: 2,
};

const requestBody = {
  cartUpdatedAt: "2026-06-05T08:00:00.000Z",
  items: [
    {
      priceCentavos: 1999,
      productId: "prod_linen",
      productName: "Linen Shirt",
      productSlug: "linen-shirt",
      quantity: 2,
      variantId: "variant_linen_small",
      variantLabel: "Size: Small",
    },
  ],
};

function checkoutController(service: Partial<CheckoutServiceLike>) {
  return new CheckoutController({
    validateCart: async () => Result.okay(validatedSummary),
    ...service,
  });
}

describe("checkout routes", () => {
  it("documents cart validation endpoint with checkout metadata", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("https://jrw.test/api/openapi/json")
    );
    const body = (await response.json()) as {
      paths?: Record<
        string,
        Record<
          string,
          {
            summary?: string;
            tags?: string[];
            "x-auth"?: { mode?: string; roles?: string[] };
            "x-rate-limit-class"?: string;
            "x-error-codes"?: string[];
            responses?: Record<string, unknown>;
          }
        >
      >;
    };

    const validation = body.paths?.["/api/checkout/cart-validations"]?.post;

    expect(validation?.summary).toBe("Validate cart before checkout");
    expect(validation?.tags).toContain("Checkout");
    expect(validation?.["x-auth"]).toEqual({
      mode: "optional",
      roles: ["PROSPECT", "CUSTOMER"],
    });
    expect(validation?.["x-rate-limit-class"]).toBe("checkout-payment");
    expect(validation?.["x-error-codes"]).toEqual(
      expect.arrayContaining([
        "VALIDATION_FAILED",
        "CONFLICT_STATE",
        "INVENTORY_UNAVAILABLE",
        "RESOURCE_NOT_FOUND",
        "PROVIDER_UNAVAILABLE",
        "INTERNAL_ERROR",
      ])
    );
    expect(validation?.responses).toHaveProperty("200");
    expect(validation?.responses).toHaveProperty("400");
    expect(validation?.responses).toHaveProperty("409");
  });

  it("returns validated cart success envelope with request id", async () => {
    let receivedBody: unknown;
    const app = createApp({
      routes: {
        checkout: {
          controllerFactory: () =>
            checkoutController({
              validateCart: async (input) => {
                receivedBody = input.body;
                return Result.okay(validatedSummary);
              },
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/checkout/cart-validations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_checkout_route_success",
        },
        body: JSON.stringify(requestBody),
      })
    );

    expect(receivedBody).toMatchObject(requestBody);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        status: "VALID",
        subtotalCentavos: 3998,
      },
      meta: {
        code: "SUCCESS",
        requestId: "req_checkout_route_success",
      },
    });
  });

  it("returns blocked cart errors with safe validation details", async () => {
    const blockedSummary = {
      ...validatedSummary,
      issues: [
        {
          code: "QUANTITY_UNAVAILABLE" as const,
          message: "This option is unavailable right now.",
          productId: "prod_linen",
          variantId: "variant_linen_small",
        },
      ],
      items: [
        {
          ...validatedSummary.items[0],
          availabilityStatus: "UNAVAILABLE" as const,
          lineSubtotalCentavos: 0,
          lineSubtotalLabel: "PHP 0.00",
          maxQuantity: 0,
          quantity: 0,
          reason: "This option is unavailable right now.",
          recoveryStatus: "BLOCKED" as const,
        },
      ],
      requiresCustomerAcceptance: true,
      status: "BLOCKED" as const,
      subtotalCentavos: 0,
      subtotalLabel: "PHP 0.00",
      totalQuantity: 0,
    };
    const app = createApp({
      routes: {
        checkout: {
          controllerFactory: () =>
            checkoutController({
              validateCart: async () =>
                Result.error(
                  new GeneralError(blockedSummary, "INVENTORY_UNAVAILABLE")
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/checkout/cart-validations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_checkout_route_blocked",
        },
        body: JSON.stringify(requestBody),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVENTORY_UNAVAILABLE",
        details: {
          requestId: "req_checkout_route_blocked",
          status: "BLOCKED",
          issues: [
            {
              code: "QUANTITY_UNAVAILABLE",
              message: "This option is unavailable right now.",
            },
          ],
        },
      },
    });
  });
});
