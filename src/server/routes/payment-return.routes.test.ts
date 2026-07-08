import { describe, expect, it } from "vitest";
import { createApp } from "@/server/app";
import { PaymentReconciliationController } from "@/server/controllers/PaymentReconciliationController";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";

describe("payment return routes", () => {
  const statusLanes = {
    fulfillment: {
      kind: "fulfillment" as const,
      label: "Order placed",
      updatedAt: "2026-07-08T01:00:00.000Z",
      value: "ORDER_PLACED",
    },
    payment: {
      kind: "payment" as const,
      label: "Payment paid",
      updatedAt: "2026-07-08T01:00:00.000Z",
      value: "PAYMENT_PAID",
    },
    refund: {
      kind: "refund" as const,
      label: "No refund requested",
      updatedAt: null,
      value: "REFUND_NOT_REQUESTED",
    },
    return: {
      kind: "return" as const,
      label: "No return requested",
      updatedAt: null,
      value: "RETURN_NOT_REQUESTED",
    },
  };

  it("documents public server-state payment return endpoint", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("https://jrw.test/api/openapi/json")
    );
    const body = (await response.json()) as {
      paths?: Record<string, { get?: Record<string, unknown> }>;
    };

    const operation = body.paths?.["/api/checkout/payment-return"]?.get;

    expect(operation).toMatchObject({
      summary: "Read checkout payment return status",
      "x-auth": { mode: "public" },
      "x-rate-limit-class": "checkout-payment",
    });
    expect(JSON.stringify(operation)).toContain("server-owned checkout");
  });

  it("passes lookup query to controller and returns safe status envelope", async () => {
    let receivedLookup: unknown;
    const app = createApp({
      routes: {
        paymentReturns: {
          controllerFactory: () =>
            new PaymentReconciliationController({
              getPaymentReturnStatus: async (input) => {
                receivedLookup = input;

                return Result.okay({
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
                  receipt: {
                    fulfillmentStatus: {
                      label: "Order placed",
                      value: "ORDER_PLACED",
                    },
                    guestAccountCta: {
                      eligible: true,
                      href: "/account/register?returnTo=%2Faccount%2Forders",
                      label: "Create account",
                    },
                    inboxReminder:
                      "Order and delivery updates were sent to your checkout email inbox.",
                    items: [
                      {
                        lineTotalCentavos: 3998,
                        name: "Linen Shirt",
                        productId: "prod_linen",
                        quantity: 2,
                        unitAmountCentavos: 1999,
                        variantId: "variant_linen_small",
                        variantLabel: "Size: Small",
                      },
                    ],
                    paymentStatus: {
                      label: "Payment paid",
                      value: "confirmed",
                    },
                    source: "order",
                    statusLanes,
                    totals: {
                      currency: "PHP",
                      subtotalCentavos: 3998,
                      totalCentavos: 3998,
                    },
                  },
                  status: "confirmed" as const,
                });
              },
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/checkout/payment-return?attemptId=attempt_1&paymentStatus=paid",
        {
          headers: { "x-request-id": "req_return_route" },
        }
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(receivedLookup).toMatchObject({
      attemptId: "attempt_1",
      requestId: "req_return_route",
    });
    expect(JSON.stringify(receivedLookup)).not.toContain("paid");
    expect(body).toMatchObject({
      data: {
        order: { orderNumber: "JRW-2026-ORDER1" },
        payment: { status: "PAYMENT_PAID" },
        receipt: {
          guestAccountCta: { eligible: true },
          items: [{ name: "Linen Shirt" }],
          paymentStatus: { label: "Payment paid" },
        },
        status: "confirmed",
      },
      meta: {
        code: "SUCCESS",
        requestId: "req_return_route",
      },
    });
    expect(JSON.stringify(body)).not.toMatch(
      /nina@example|0917|Sampaguita|checkout\.paymongo|secret|card/i
    );
  });

  it("does not use raw email as guest receipt lookup input", async () => {
    let receivedLookup: unknown;
    const app = createApp({
      routes: {
        paymentReturns: {
          controllerFactory: () =>
            new PaymentReconciliationController({
              getPaymentReturnStatus: async (input) => {
                receivedLookup = input;
                return Result.error(new GeneralError({}, "RESOURCE_NOT_FOUND"));
              },
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/checkout/payment-return?email=buyer@example.test",
        {
          headers: { "x-request-id": "req_return_email_lookup" },
        }
      )
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(receivedLookup).toMatchObject({
      attemptId: undefined,
      paymentId: undefined,
      providerCheckoutSessionId: undefined,
      requestId: "req_return_email_lookup",
    });
    expect(JSON.stringify(receivedLookup)).not.toContain("buyer@example.test");
    expect(JSON.stringify(body)).not.toContain("buyer@example.test");
  });
});
