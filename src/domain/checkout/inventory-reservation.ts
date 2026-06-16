import type { CheckoutCartValidationSummary } from "./cart-validation";

export type CheckoutReservationStatus =
  | "ACTIVE"
  | "RELEASED"
  | "EXPIRED"
  | "FAILED";

export type CheckoutAttemptReservationStatus =
  | "DETAILS_CAPTURED"
  | "INVENTORY_RESERVED"
  | "RESERVATION_FAILED";

export type CheckoutReservationMode = "STOCK" | "PREORDER";

export type CheckoutReservationPlanLine = {
  mode: CheckoutReservationMode;
  priceCentavos: number;
  productId: string;
  quantity: number;
  variantId: string;
};

export type CheckoutReservationPlan =
  | {
      fingerprint: string;
      lines: CheckoutReservationPlanLine[];
      ok: true;
      subtotalCentavos: number;
    }
  | {
      code: "CONFLICT_STATE" | "INVENTORY_UNAVAILABLE";
      ok: false;
      summary: CheckoutCartValidationSummary;
    };

export type CheckoutReservationResponse = {
  attempt: {
    attemptId: string;
    status: "INVENTORY_RESERVED";
  };
  reservation: {
    expiresAt: string;
    reservationId: string;
    status: "ACTIVE";
  };
  cart: CheckoutCartValidationSummary;
  next: {
    payMongoCreationRequired: true;
    paymentAllowed: true;
  };
};

export type CheckoutReservationRetryDecision = "reuse" | "conflict" | "reserve";

export function createCheckoutCartFingerprint(
  summary: CheckoutCartValidationSummary
): string {
  return JSON.stringify(
    summary.items
      .map((item) => ({
        lineSubtotalCentavos: item.lineSubtotalCentavos,
        priceCentavos: item.priceCentavos,
        productId: item.productId,
        quantity: item.quantity,
        variantId: item.variantId,
      }))
      .sort((left, right) =>
        `${left.productId}\u0000${left.variantId}`.localeCompare(
          `${right.productId}\u0000${right.variantId}`
        )
      )
  );
}

export function checkoutReservationExpiresAt(
  now: Date,
  ttlMinutes = 15
): string {
  return new Date(now.getTime() + ttlMinutes * 60_000).toISOString();
}

export function planCheckoutReservation(
  summary: CheckoutCartValidationSummary
): CheckoutReservationPlan {
  if (summary.status === "CHANGED") {
    return { code: "CONFLICT_STATE", ok: false, summary };
  }

  if (summary.status === "BLOCKED") {
    return { code: "INVENTORY_UNAVAILABLE", ok: false, summary };
  }

  const lines = summary.items
    .filter((item) => item.quantity > 0)
    .map(
      (item): CheckoutReservationPlanLine => ({
        mode: item.availabilityLabel === "Preorder" ? "PREORDER" : "STOCK",
        priceCentavos: item.priceCentavos,
        productId: item.productId,
        quantity: item.quantity,
        variantId: item.variantId,
      })
    );

  return {
    fingerprint: createCheckoutCartFingerprint(summary),
    lines,
    ok: true,
    subtotalCentavos: summary.subtotalCentavos,
  };
}

export function decideCheckoutReservationRetry({
  activeReservationFingerprint,
  requestedFingerprint,
}: {
  activeReservationFingerprint: string | null;
  requestedFingerprint: string;
}): CheckoutReservationRetryDecision {
  if (!activeReservationFingerprint) {
    return "reserve";
  }

  return activeReservationFingerprint === requestedFingerprint
    ? "reuse"
    : "conflict";
}

export function toCheckoutReservationResponse({
  attemptId,
  cart,
  expiresAt,
  reservationId,
}: {
  attemptId: string;
  cart: CheckoutCartValidationSummary;
  expiresAt: string;
  reservationId: string;
}): CheckoutReservationResponse {
  return {
    attempt: {
      attemptId,
      status: "INVENTORY_RESERVED",
    },
    cart,
    next: {
      payMongoCreationRequired: true,
      paymentAllowed: true,
    },
    reservation: {
      expiresAt,
      reservationId,
      status: "ACTIVE",
    },
  };
}
