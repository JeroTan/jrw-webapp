import { describe, expect, it } from "vitest";
import { createApp } from "@/server/app";
import { PaymentWebhookController } from "@/server/controllers/PaymentWebhookController";
import { Result } from "@/utils/general/result";

describe("payment webhook routes", () => {
  it("documents PayMongo webhook as public signature-authenticated endpoint", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("https://jrw.test/api/openapi/json")
    );
    const body = (await response.json()) as {
      paths?: Record<string, { post?: Record<string, unknown> }>;
    };

    const operation = body.paths?.["/api/payments/paymongo/webhooks"]?.post;

    expect(operation).toMatchObject({
      "x-auth": { mode: "public" },
      "x-rate-limit-class": "webhook",
    });
    expect(JSON.stringify(operation)).toContain("PayMongo-Signature");
  });

  it("passes exact raw body and signature header to controller", async () => {
    let receivedRawBody = "";
    let receivedSignature: string | null | undefined;
    const rawBody = '{"z":2, "a":1}';
    const app = createApp({
      routes: {
        paymentWebhooks: {
          controllerFactory: () =>
            new PaymentWebhookController({
              processPayMongoWebhook: async (input) => {
                receivedRawBody = input.rawBody;
                receivedSignature = input.signatureHeader;

                return Result.okay({
                  event: {
                    eventType: "checkout_session.payment.paid",
                    idempotent: false,
                    providerEventId: "evt_route_1",
                    status: "IGNORED",
                  },
                });
              },
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/payments/paymongo/webhooks", {
        body: rawBody,
        headers: {
          "content-type": "application/json",
          "Paymongo-Signature": "t=1496734173,te=sig,li=",
          "x-request-id": "req_route_raw",
        },
        method: "POST",
      })
    );
    const body = (await response.json()) as {
      data?: { event?: { providerEventId?: string } };
      meta?: { requestId?: string };
    };

    expect(response.status).toBe(200);
    expect(receivedRawBody).toBe(rawBody);
    expect(receivedSignature).toBe("t=1496734173,te=sig,li=");
    expect(body.data?.event?.providerEventId).toBe("evt_route_1");
    expect(body.meta?.requestId).toBe("req_route_raw");
  });
});
