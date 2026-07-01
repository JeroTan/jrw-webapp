import { describe, expect, it } from "vitest";
import {
  decideInventoryReleaseForPayment,
  isReleasableTerminalPaymentStatus,
} from "./inventory-release";

describe("inventory release decisions", () => {
  it("releases failed, expired, and cancelled payments with active matching reservation", () => {
    for (const status of [
      "PAYMENT_FAILED",
      "PAYMENT_EXPIRED",
      "PAYMENT_CANCELLED",
    ] as const) {
      expect(
        decideInventoryReleaseForPayment({
          orderExists: false,
          paymentReservationMatches: true,
          paymentStatus: status,
          reservationStatus: "ACTIVE",
        })
      ).toEqual({
        decision: "release",
        reason: status,
      });
      expect(isReleasableTerminalPaymentStatus(status)).toBe(true);
    }
  });

  it("releases stale pending payments only when timeout policy says so", () => {
    expect(
      decideInventoryReleaseForPayment({
        orderExists: false,
        paymentReservationMatches: true,
        paymentStatus: "PAYMENT_PENDING",
        reservationStatus: "ACTIVE",
        stalePendingTimedOut: true,
      })
    ).toEqual({
      decision: "release",
      reason: "PENDING_TIMEOUT",
    });

    expect(
      decideInventoryReleaseForPayment({
        orderExists: false,
        paymentReservationMatches: true,
        paymentStatus: "PAYMENT_PENDING",
        reservationStatus: "ACTIVE",
        stalePendingTimedOut: false,
      })
    ).toEqual({ decision: "skip-active-pending" });
  });

  it("skips paid, order-linked, mismatched, and inactive reservations", () => {
    expect(
      decideInventoryReleaseForPayment({
        orderExists: false,
        paymentReservationMatches: true,
        paymentStatus: "PAYMENT_PAID",
        reservationStatus: "ACTIVE",
      })
    ).toEqual({ decision: "skip-paid" });

    expect(
      decideInventoryReleaseForPayment({
        orderExists: true,
        paymentReservationMatches: true,
        paymentStatus: "PAYMENT_FAILED",
        reservationStatus: "ACTIVE",
      })
    ).toEqual({ decision: "skip-order-exists" });

    expect(
      decideInventoryReleaseForPayment({
        orderExists: false,
        paymentReservationMatches: false,
        paymentStatus: "PAYMENT_FAILED",
        reservationStatus: "ACTIVE",
      })
    ).toEqual({ decision: "skip-mismatch" });

    expect(
      decideInventoryReleaseForPayment({
        orderExists: false,
        paymentReservationMatches: true,
        paymentStatus: "PAYMENT_FAILED",
        reservationStatus: "RELEASED",
      })
    ).toEqual({ decision: "already-released" });
  });
});
