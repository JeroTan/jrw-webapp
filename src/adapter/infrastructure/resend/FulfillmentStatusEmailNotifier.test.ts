import { describe, expect, it } from "vitest";
import { ResendFulfillmentStatusEmailNotifier } from "./FulfillmentStatusEmailNotifier";

describe("ResendFulfillmentStatusEmailNotifier", () => {
  it("escapes fulfillment email content and avoids provider/PII leakage", async () => {
    const payloads: unknown[] = [];
    const notifier = new ResendFulfillmentStatusEmailNotifier({
      appBaseUrl: "https://jrw.test",
      client: {
        emails: {
          send: async (payload) => {
            payloads.push(payload);
            return { data: { id: "email_1" } };
          },
        },
      },
      fromEmail: "JRW <orders@jrw.test>",
    });

    const result = await notifier.sendFulfillmentStatusEmail({
      currency: "PHP",
      fulfillmentStatusLabel: "Shipped",
      items: [
        { amountCentavos: 1999, name: "Frozen Linen Shirt", quantity: 1 },
      ],
      orderNumber: "JRW-2026-ORDER1",
      requestId: "req_email",
      statusUrl: "/account/orders/JRW-2026-ORDER1",
      toEmail: "nina@example.com",
      totalCentavos: 1999,
    });

    expect(result).toEqual({ ok: true, messageId: "email_1" });
    expect(JSON.stringify(payloads)).toContain("Shipped");
    expect(JSON.stringify(payloads)).toContain("PHP 19.99");
    expect(JSON.stringify(payloads)).not.toMatch(
      /checkout\.paymongo|cs_test|Sampaguita|0917|token|secret|card/i
    );
  });
});
