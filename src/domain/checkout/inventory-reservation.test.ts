import { describe, expect, it } from "vitest";
import type { CheckoutCartValidationSummary } from "./cart-validation";
import {
  checkoutReservationExpiresAt,
  createCheckoutCartFingerprint,
  decideCheckoutReservationRetry,
  planCheckoutReservation,
  toCheckoutReservationResponse,
} from "./inventory-reservation";

const validSummary: CheckoutCartValidationSummary = {
  issues: [],
  items: [
    {
      availabilityLabel: "Available",
      availabilityStatus: "ACTIVE",
      lineSubtotalCentavos: 3998,
      lineSubtotalLabel: "PHP 39.98",
      maxQuantity: 8,
      priceCentavos: 1999,
      priceLabel: "PHP 19.99",
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
  subtotalCentavos: 3998,
  subtotalLabel: "PHP 39.98",
  totalQuantity: 2,
};

describe("checkout inventory reservation domain rules", () => {
  it("plans stock-backed reservation lines only for valid accepted carts", () => {
    const plan = planCheckoutReservation(validSummary);

    expect(plan).toMatchObject({
      ok: true,
      fingerprint: createCheckoutCartFingerprint(validSummary),
      lines: [
        {
          mode: "STOCK",
          priceCentavos: 1999,
          productId: "prod_linen",
          quantity: 2,
          variantId: "variant_linen_small",
        },
      ],
      subtotalCentavos: 3998,
    });
  });

  it("does not plan changed or blocked carts for reservation", () => {
    const changed = planCheckoutReservation({
      ...validSummary,
      requiresCustomerAcceptance: true,
      status: "CHANGED",
    });
    const blocked = planCheckoutReservation({
      ...validSummary,
      requiresCustomerAcceptance: true,
      status: "BLOCKED",
    });

    expect(changed).toMatchObject({
      code: "CONFLICT_STATE",
      ok: false,
    });
    expect(blocked).toMatchObject({
      code: "INVENTORY_UNAVAILABLE",
      ok: false,
    });
  });

  it("keeps preorder lines sellable without stock decrement mode", () => {
    const plan = planCheckoutReservation({
      ...validSummary,
      items: [
        {
          ...validSummary.items[0]!,
          availabilityLabel: "Preorder",
          maxQuantity: 99,
        },
      ],
    });

    expect(plan).toMatchObject({
      ok: true,
      lines: [
        {
          mode: "PREORDER",
          quantity: 2,
          variantId: "variant_linen_small",
        },
      ],
    });
  });

  it("decides idempotent retry versus conflicting reservation payload", () => {
    const fingerprint = createCheckoutCartFingerprint(validSummary);

    expect(
      decideCheckoutReservationRetry({
        activeReservationFingerprint: fingerprint,
        requestedFingerprint: fingerprint,
      })
    ).toBe("reuse");
    expect(
      decideCheckoutReservationRetry({
        activeReservationFingerprint: "different",
        requestedFingerprint: fingerprint,
      })
    ).toBe("conflict");
    expect(
      decideCheckoutReservationRetry({
        activeReservationFingerprint: null,
        requestedFingerprint: fingerprint,
      })
    ).toBe("reserve");
  });

  it("maps successful reservation output without internal lock details", () => {
    const response = toCheckoutReservationResponse({
      attemptId: "attempt_1",
      cart: validSummary,
      expiresAt: checkoutReservationExpiresAt(
        new Date("2026-06-12T08:00:00.000Z")
      ),
      reservationId: "reservation_1",
    });

    expect(response).toEqual({
      attempt: {
        attemptId: "attempt_1",
        status: "INVENTORY_RESERVED",
      },
      cart: validSummary,
      next: {
        payMongoCreationRequired: true,
        paymentAllowed: true,
      },
      reservation: {
        expiresAt: "2026-06-12T08:15:00.000Z",
        reservationId: "reservation_1",
        status: "ACTIVE",
      },
    });
    expect(JSON.stringify(response)).not.toMatch(
      /stock_version|stock_lock_version|token|hash|durable/i
    );
  });
});
