import { describe, expect, it } from "vitest";
import { ResendPaymentStatusEmailNotifier } from "./PaymentStatusEmailNotifier";

describe("ResendPaymentStatusEmailNotifier", () => {
  it("escapes terminal payment email content and avoids provider/PII leakage", async () => {
    const payloads: unknown[] = [];
    const notifier = new ResendPaymentStatusEmailNotifier({
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

    const result = await notifier.sendPaymentStatusEmail({
      currency: "PHP",
      nextActionUrl: "/checkout",
      paymentStatusLabel: "Payment failed",
      referenceLabel: "Payment payment_1",
      requestId: "req_email",
      toEmail: "nina@example.com",
      totalCentavos: 3998,
    });

    expect(result).toEqual({ ok: true, messageId: "email_1" });
    expect(JSON.stringify(payloads)).toContain("Payment failed");
    expect(JSON.stringify(payloads)).toContain("PHP 39.98");
    expect(JSON.stringify(payloads)).not.toMatch(
      /checkout\.paymongo|cs_test|Sampaguita|0917|token|secret|card/i
    );
  });
});
