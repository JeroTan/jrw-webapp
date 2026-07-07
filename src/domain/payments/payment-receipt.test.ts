import { describe, expect, it } from "vitest";
import {
  buildPaymentReceipt,
  fulfillmentStatusLabel,
  paymentStatusLabel,
} from "./payment-receipt";

describe("payment receipt domain", () => {
  it("builds safe confirmed guest receipt with labels and account CTA intent", () => {
    const receipt = buildPaymentReceipt({
      customerId: null,
      fulfillmentStatus: "ORDER_PLACED",
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
      orderNumber: "JRW-2026-ORDER1",
      paymentStatus: "PAYMENT_PAID",
      source: "order",
      subtotalCentavos: 3998,
      totalCentavos: 3998,
    });

    expect(receipt).toMatchObject({
      guestAccountCta: {
        eligible: true,
        href: "/account/register?returnTo=%2Faccount%2Forders",
        label: "Create account",
      },
      inboxReminder:
        "Order and delivery updates were sent to your checkout email inbox.",
      paymentStatus: { label: "Payment paid", value: "confirmed" },
      fulfillmentStatus: { label: "Order placed", value: "ORDER_PLACED" },
      totals: { subtotalCentavos: 3998, totalCentavos: 3998 },
    });
    expect(JSON.stringify(receipt)).not.toMatch(
      /nina@example|0917|Sampaguita|checkout\.paymongo|token|secret/i
    );
  });

  it("uses safe labels for pending and terminal statuses", () => {
    expect(paymentStatusLabel("PAYMENT_PENDING")).toBe("Payment pending");
    expect(paymentStatusLabel("PAYMENT_FAILED")).toBe("Payment failed");
    expect(paymentStatusLabel("PAYMENT_EXPIRED")).toBe("Payment expired");
    expect(paymentStatusLabel("PAYMENT_CANCELLED")).toBe("Payment cancelled");
    expect(fulfillmentStatusLabel(null)).toBe("Not started");
  });

  it("adds signed receipt context to account CTA without exposing email", () => {
    const receipt = buildPaymentReceipt({
      accountPrefillContext: "signed.receipt.context",
      customerId: null,
      fulfillmentStatus: "ORDER_PLACED",
      items: [],
      paymentStatus: "PAYMENT_PAID",
      source: "order",
      subtotalCentavos: 0,
      totalCentavos: 0,
    });

    expect(receipt.guestAccountCta.href).toBe(
      "/account/register?returnTo=%2Faccount%2Forders&receiptContext=signed.receipt.context"
    );
    expect(JSON.stringify(receipt)).not.toContain("nina@example.com");
  });
});
