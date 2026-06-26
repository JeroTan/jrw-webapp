import { describe, expect, it } from "vitest";
import { createApp } from "@/server/app";
import { PaymentReconciliationController } from "@/server/controllers/PaymentReconciliationController";
import { Result } from "@/utils/general/result";

describe("payment return routes", () => {
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
});
