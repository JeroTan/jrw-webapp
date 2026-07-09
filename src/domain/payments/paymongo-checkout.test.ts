import { describe, expect, it } from "vitest";
import {
  buildPayMongoCheckoutSessionPayload,
  buildPayMongoReturnUrls,
  decideCheckoutPaymentCreation,
  normalizePayMongoPaymentMethods,
} from "./paymongo-checkout";

const reservation = {
  checkoutAttemptId: "attempt_123",
  expiresAt: "2026-06-12T08:15:00.000Z",
  id: "reservation_123",
  items: [
    {
      imageSrc: "/assets/products/linen-shirt/front.jpg",
      name: "Linen Shirt - Size: Small",
      priceCentavos: 1999,
      productId: "prod_linen",
      quantity: 2,
      reservationMode: "STOCK",
      variantId: "variant_linen_small",
    },
  ],
  status: "ACTIVE",
  subtotalCentavos: 3998,
} as const;

describe("PayMongo checkout domain", () => {
  it("builds a Hosted Checkout V2 payload from server reservation facts", () => {
    const payload = buildPayMongoCheckoutSessionPayload({
      attemptId: "attempt_123",
      cancelUrl: "https://jrw.test/checkout",
      currency: "PHP",
      metadata: {
        checkout_attempt_id: "attempt_123",
        payment_id: "payment_123",
        reservation_id: "reservation_123",
      },
      paymentMethods: ["card", "gcash", "qrph"],
      referenceNumber: "JRW-payment_123",
      reservation,
      sendEmailReceipt: false,
      successUrl: "https://jrw.test/checkout/payment-return",
    });

    expect(payload).toEqual({
      data: {
        attributes: {
          cancel_url: "https://jrw.test/checkout",
          line_items: [
            {
              amount: 1999,
              currency: "PHP",
              images: [
                "https://jrw.test/assets/products/linen-shirt/front.jpg",
              ],
              name: "Linen Shirt - Size: Small",
              quantity: 2,
            },
          ],
          metadata: {
            checkout_attempt_id: "attempt_123",
            payment_id: "payment_123",
            reservation_id: "reservation_123",
          },
          payment_method_types: ["card", "gcash", "qrph"],
          reference_number: "JRW-payment_123",
          send_email_receipt: false,
          success_url: "https://jrw.test/checkout/payment-return",
        },
      },
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /nina@example|0917|Sampaguita|attempt_token|secret|card_number/i
    );
  });

  it("normalizes server-owned payment methods from env strings", () => {
    expect(normalizePayMongoPaymentMethods("card, gcash, qrph, card")).toEqual([
      "card",
      "gcash",
      "qrph",
    ]);
    expect(normalizePayMongoPaymentMethods("")).toEqual([
      "card",
      "gcash",
      "qrph",
    ]);
  });

  it("builds checkout return URLs from server-owned base URL", () => {
    expect(
      buildPayMongoReturnUrls({
        attemptId: "attempt_123",
        appBaseUrl: "https://jrw.test/root/",
      })
    ).toEqual({
      cancelUrl: "https://jrw.test/checkout",
      successUrl:
        "https://jrw.test/checkout/payment-return?attemptId=attempt_123",
    });
  });

  it("decides payment creation eligibility without provider access", () => {
    expect(
      decideCheckoutPaymentCreation({
        attemptStatus: "INVENTORY_RESERVED",
        existingPayment: null,
        now: "2026-06-12T08:00:00.000Z",
        reservationExpiresAt: "2026-06-12T08:15:00.000Z",
        reservationId: "reservation_123",
        reservationStatus: "ACTIVE",
      })
    ).toEqual({ decision: "create" });

    expect(
      decideCheckoutPaymentCreation({
        attemptStatus: "INVENTORY_RESERVED",
        existingPayment: {
          paymentId: "payment_123",
          reservationId: "reservation_123",
          status: "PAYMENT_PENDING",
        },
        now: "2026-06-12T08:00:00.000Z",
        reservationExpiresAt: "2026-06-12T08:15:00.000Z",
        reservationId: "reservation_123",
        reservationStatus: "ACTIVE",
      })
    ).toEqual({ decision: "reuse" });

    expect(
      decideCheckoutPaymentCreation({
        attemptStatus: "INVENTORY_RESERVED",
        existingPayment: null,
        now: "2026-06-12T08:15:00.000Z",
        reservationExpiresAt: "2026-06-12T08:15:00.000Z",
        reservationId: "reservation_123",
        reservationStatus: "ACTIVE",
      })
    ).toEqual({ code: "CONFLICT_STATE", decision: "reject" });
  });
});
