import { describe, expect, it } from "vitest";
import { STOREFRONT_CART_LINE_ITEM_MAX } from "@/domain/checkout/cart-validation";
import { SNAPSHOT_VARIANT_OPTION_MAX_ITEMS } from "@/domain/snapshots/schemas";
import { createApp } from "@/server/app";
import {
  CheckoutController,
  type CheckoutServiceLike,
} from "@/server/controllers/CheckoutController";
import { CheckoutService } from "@/server/services/CheckoutService";
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
    saveDetails: async () =>
      Result.okay({
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
      }),
    reserveInventory: async () =>
      Result.okay({
        attempt: {
          attemptId: "attempt_checkout_details",
          status: "INVENTORY_RESERVED",
        },
        cart: validatedSummary,
        next: { payMongoCreationRequired: true, paymentAllowed: true },
        reservation: {
          expiresAt: "2026-06-12T08:15:00.000Z",
          reservationId: "reservation_checkout_details",
          status: "ACTIVE",
        },
      }),
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

  it("documents checkout details endpoint as optional guest-or-customer auth", async () => {
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
          }
        >
      >;
    };

    const details = body.paths?.["/api/checkout/details"]?.post;

    expect(details?.summary).toBe("Validate checkout details");
    expect(details?.tags).toContain("Checkout");
    expect(details?.["x-auth"]).toEqual({
      mode: "optional",
      roles: ["PROSPECT", "CUSTOMER"],
    });
    expect(details?.["x-rate-limit-class"]).toBe("checkout-payment");
    expect(details?.["x-error-codes"]).toEqual(
      expect.arrayContaining([
        "VALIDATION_FAILED",
        "PROVIDER_UNAVAILABLE",
        "INTERNAL_ERROR",
      ])
    );
  });

  it("documents reservation endpoint with optional auth and safe denial codes", async () => {
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
          }
        >
      >;
    };

    const reservation =
      body.paths?.["/api/checkout/attempts/{attemptId}/reservations"]?.post;

    expect(reservation?.summary).toBe("Reserve checkout inventory");
    expect(reservation?.tags).toContain("Checkout");
    expect(reservation?.["x-auth"]).toEqual({
      mode: "optional",
      roles: ["PROSPECT", "CUSTOMER"],
    });
    expect(reservation?.["x-rate-limit-class"]).toBe("checkout-payment");
    expect(reservation?.["x-error-codes"]).toEqual(
      expect.arrayContaining([
        "AUTH_FORBIDDEN",
        "IDEMPOTENCY_CONFLICT",
        "INVENTORY_UNAVAILABLE",
        "CONFLICT_STATE",
      ])
    );
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

  it("returns guest checkout details with nullable customer reference", async () => {
    let receivedActor: unknown;
    let receivedBody: unknown;
    const app = createApp({
      routes: {
        checkout: {
          controllerFactory: () =>
            checkoutController({
              saveDetails: async (input) => {
                receivedActor = input.actor;
                receivedBody = input.body;
                return Result.okay({
                  attempt: {
                    attemptId: "attempt_guest",
                    attemptToken: "attempt_token_guest",
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
                });
              },
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/checkout/details", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_checkout_details_guest",
        },
        body: JSON.stringify({
          email: " Nina@Example.COM ",
          fullName: "Nina Reyes",
          phone: "+63 917 555 1212",
          streetAddress: "12 Sampaguita Street",
          barangay: "Barangay 456",
          cityProvince: "Quezon City",
          postalCode: "1100",
          privacyAcknowledged: true,
        }),
      })
    );

    expect(receivedActor).toMatchObject({
      authenticated: false,
      role: "PROSPECT",
    });
    expect(receivedBody).toMatchObject({
      email: " Nina@Example.COM ",
      privacyAcknowledged: true,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        attempt: {
          attemptId: "attempt_guest",
          attemptToken: "attempt_token_guest",
          status: "DETAILS_CAPTURED",
        },
        customer: { customerId: null, mode: "guest" },
        details: { email: "nina@example.com" },
        next: { cartValidationRequired: true, paymentAllowed: false },
      },
      meta: {
        code: "SUCCESS",
        requestId: "req_checkout_details_guest",
      },
    });
  });

  it("passes signed-in customer actor to checkout details without browser customer id", async () => {
    let receivedActor: unknown;
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async ({ sessionRealm, sessionToken }) =>
          sessionRealm === "CUSTOMER" && sessionToken === "customer-token"
            ? {
                authenticated: true,
                role: "CUSTOMER",
                actorId: "customer_server",
                safeActorId: "customer_server",
                accountStatus: {
                  approved: true,
                  emailVerified: true,
                  status: "ACTIVE",
                },
                eligibility: {
                  active: true,
                  approved: true,
                  emailVerified: true,
                },
              }
            : undefined,
      },
      routes: {
        checkout: {
          controllerFactory: () =>
            checkoutController({
              saveDetails: async (input) => {
                receivedActor = input.actor;
                return Result.okay({
                  attempt: {
                    attemptId: "attempt_customer",
                    attemptToken: "attempt_token_customer",
                    status: "DETAILS_CAPTURED",
                  },
                  customer: {
                    customerId: input.actor?.actorId ?? null,
                    mode: "signed-in",
                  },
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
                });
              },
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/checkout/details", {
        method: "POST",
        headers: {
          cookie: "jrw_customer_session=customer-token",
          "content-type": "application/json",
          "x-request-id": "req_checkout_details_customer",
        },
        body: JSON.stringify({
          email: "nina@example.com",
          fullName: "Nina Reyes",
          phone: "+63 917 555 1212",
          streetAddress: "12 Sampaguita Street",
          barangay: "Barangay 456",
          cityProvince: "Quezon City",
          postalCode: "1100",
          privacyAcknowledged: true,
        }),
      })
    );

    expect(receivedActor).toMatchObject({
      actorId: "customer_server",
      role: "CUSTOMER",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        customer: {
          customerId: "customer_server",
          mode: "signed-in",
        },
      },
    });
  });

  it("rejects browser-supplied customer identity fields with stable reasons before persistence", async () => {
    let persisted = false;
    const app = createApp({
      routes: {
        checkout: {
          controllerFactory: () =>
            new CheckoutController(
              new CheckoutService({
                repository: {
                  createCheckoutAttempt: async (input) => {
                    persisted = true;
                    return {
                      id: "attempt_unreachable",
                      customerId: input.customerId,
                      checkoutEmail: input.details.email,
                      createdAt: "2026-06-12T00:00:00.000Z",
                      fullName: input.details.fullName,
                      attemptTokenHash: input.attemptTokenHash,
                      cartFingerprint: null,
                      reservationExpiresAt: null,
                      reservationId: null,
                      status: "DETAILS_CAPTURED",
                      updatedAt: "2026-06-12T00:00:00.000Z",
                    };
                  },
                  createCheckoutReservation: async () => {
                    throw new Error("unreachable");
                  },
                  failReservationAndAttempt: async () => undefined,
                  findActiveReservationForAttempt: async () => null,
                  findCheckoutAttempt: async () => null,
                  findCartLines: async () => [],
                  releaseStockLine: async () => undefined,
                  reserveStockAndCreateCheckoutReservation: async () => null,
                  reserveStockLine: async () => false,
                },
              })
            ),
        },
      },
    });
    const response = await app.handle(
      new Request("https://jrw.test/api/checkout/details", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_checkout_details_unknown",
        },
        body: JSON.stringify({
          email: "nina@example.com",
          fullName: "Nina Reyes",
          phone: "+63 917 555 1212",
          streetAddress: "12 Sampaguita Street",
          barangay: "Barangay 456",
          cityProvince: "Quezon City",
          postalCode: "1100",
          privacyAcknowledged: true,
          customerId: "browser_customer",
        }),
      })
    );

    expect(persisted).toBe(false);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: {
          reasons: expect.arrayContaining(["customerId:unknown"]),
          requestId: "req_checkout_details_unknown",
        },
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

  it("returns reservation success envelope with request id", async () => {
    let receivedAttemptId = "";
    let receivedActor: unknown;
    let receivedBody: unknown;
    const app = createApp({
      routes: {
        checkout: {
          controllerFactory: () =>
            checkoutController({
              reserveInventory: async (input) => {
                receivedAttemptId = input.attemptId;
                receivedActor = input.actor;
                receivedBody = input.body;
                return Result.okay({
                  attempt: {
                    attemptId: input.attemptId,
                    status: "INVENTORY_RESERVED",
                  },
                  cart: validatedSummary,
                  next: {
                    payMongoCreationRequired: true,
                    paymentAllowed: true,
                  },
                  reservation: {
                    expiresAt: "2026-06-12T08:15:00.000Z",
                    reservationId: "reservation_guest",
                    status: "ACTIVE",
                  },
                });
              },
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/checkout/attempts/attempt_guest/reservations",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-request-id": "req_checkout_reserve_guest",
          },
          body: JSON.stringify({
            attemptToken: "attempt_token_guest",
            ...requestBody,
          }),
        }
      )
    );

    expect(receivedAttemptId).toBe("attempt_guest");
    expect(receivedActor).toMatchObject({
      authenticated: false,
      role: "PROSPECT",
    });
    expect(receivedBody).toMatchObject({
      attemptToken: "attempt_token_guest",
      items: requestBody.items,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        attempt: {
          attemptId: "attempt_guest",
          status: "INVENTORY_RESERVED",
        },
        next: {
          payMongoCreationRequired: true,
          paymentAllowed: true,
        },
        reservation: {
          reservationId: "reservation_guest",
          status: "ACTIVE",
        },
      },
      meta: {
        code: "SUCCESS",
        requestId: "req_checkout_reserve_guest",
      },
    });
  });

  it("returns safe reservation denial envelope", async () => {
    const app = createApp({
      routes: {
        checkout: {
          controllerFactory: () =>
            checkoutController({
              reserveInventory: async () =>
                Result.error(new GeneralError({}, "AUTH_FORBIDDEN")),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/checkout/attempts/attempt_guest/reservations",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-request-id": "req_checkout_reserve_denied",
          },
          body: JSON.stringify({
            attemptToken: "wrong",
            ...requestBody,
          }),
        }
      )
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: {
          requestId: "req_checkout_reserve_denied",
        },
      },
    });
  });

  it("rejects oversized public cart validation payloads before controller work", async () => {
    let controllerCreated = false;
    const app = createApp({
      routes: {
        checkout: {
          controllerFactory: () => {
            controllerCreated = true;
            return checkoutController({});
          },
        },
      },
    });
    const response = await app.handle(
      new Request("https://jrw.test/api/checkout/cart-validations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_checkout_route_too_many",
        },
        body: JSON.stringify({
          items: Array.from(
            { length: STOREFRONT_CART_LINE_ITEM_MAX + 1 },
            (_, index) => ({
              ...requestBody.items[0],
              productId: `prod_linen_${index}`,
              variantId: `variant_linen_small_${index}`,
            })
          ),
        }),
      })
    );

    expect(controllerCreated).toBe(false);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: {
          requestId: "req_checkout_route_too_many",
        },
      },
    });
  });

  it("rejects oversized variant option arrays before controller work", async () => {
    let controllerCreated = false;
    const app = createApp({
      routes: {
        checkout: {
          controllerFactory: () => {
            controllerCreated = true;
            return checkoutController({});
          },
        },
      },
    });
    const response = await app.handle(
      new Request("https://jrw.test/api/checkout/cart-validations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_checkout_route_too_many_options",
        },
        body: JSON.stringify({
          items: [
            {
              ...requestBody.items[0],
              variantOptions: Array.from(
                { length: SNAPSHOT_VARIANT_OPTION_MAX_ITEMS + 1 },
                (_, index) => ({
                  group: `Group ${index}`,
                  name: `Name ${index}`,
                })
              ),
            },
          ],
        }),
      })
    );

    expect(controllerCreated).toBe(false);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: {
          requestId: "req_checkout_route_too_many_options",
        },
      },
    });
  });
});
