export const RELEASABLE_TERMINAL_PAYMENT_STATUSES = [
  "PAYMENT_FAILED",
  "PAYMENT_EXPIRED",
  "PAYMENT_CANCELLED",
] as const;

export type InventoryReleaseReason =
  | (typeof RELEASABLE_TERMINAL_PAYMENT_STATUSES)[number]
  | "PENDING_TIMEOUT";

export type InventoryReleaseReservationStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "FAILED"
  | "RELEASED";

export type InventoryReleaseDecision =
  | { decision: "release"; reason: InventoryReleaseReason }
  | { decision: "already-released" }
  | { decision: "skip-active-pending" }
  | { decision: "skip-mismatch" }
  | { decision: "skip-order-exists" }
  | { decision: "skip-paid" }
  | { decision: "skip-reservation-inactive" };

export function isReleasableTerminalPaymentStatus(
  status: string | null | undefined
): status is (typeof RELEASABLE_TERMINAL_PAYMENT_STATUSES)[number] {
  return RELEASABLE_TERMINAL_PAYMENT_STATUSES.includes(
    status as (typeof RELEASABLE_TERMINAL_PAYMENT_STATUSES)[number]
  );
}

export function decideInventoryReleaseForPayment(input: {
  orderExists: boolean;
  paymentReservationMatches: boolean;
  paymentStatus: string | null | undefined;
  reservationStatus: InventoryReleaseReservationStatus | string | null;
  stalePendingTimedOut?: boolean;
}): InventoryReleaseDecision {
  if (!input.paymentReservationMatches) {
    return { decision: "skip-mismatch" };
  }

  if (input.orderExists) {
    return { decision: "skip-order-exists" };
  }

  if (input.paymentStatus === "PAYMENT_PAID") {
    return { decision: "skip-paid" };
  }

  if (
    input.reservationStatus === "RELEASED" ||
    input.reservationStatus === "EXPIRED"
  ) {
    return { decision: "already-released" };
  }

  if (input.reservationStatus !== "ACTIVE") {
    return { decision: "skip-reservation-inactive" };
  }

  if (isReleasableTerminalPaymentStatus(input.paymentStatus)) {
    return { decision: "release", reason: input.paymentStatus };
  }

  if (input.paymentStatus === "PAYMENT_PENDING") {
    return input.stalePendingTimedOut
      ? { decision: "release", reason: "PENDING_TIMEOUT" }
      : { decision: "skip-active-pending" };
  }

  return { decision: "skip-reservation-inactive" };
}
