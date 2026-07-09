import { describe, expect, it } from "vitest";
import {
  allowedNextRefundStatuses,
  evaluateRefundTransition,
  isRefundStatus,
  refundDisplayStatusLabel,
  refundStatusLabel,
} from "./refund-transitions";

describe("refund transitions", () => {
  it("treats idle refund state as display-only and rejects legacy aliases", () => {
    expect(refundDisplayStatusLabel(null)).toBe("No refund requested");
    expect(refundStatusLabel("REFUND_PENDING")).toBe("Refund pending");
    expect(isRefundStatus("REFUND_PENDING")).toBe(true);
    expect(isRefundStatus("REFUND_NOT_REQUESTED")).toBe(false);
    expect(isRefundStatus("REFUND_REQUESTED")).toBe(false);
    expect(isRefundStatus("REFUND_REJECTED")).toBe(false);
    expect(isRefundStatus("REFUND_COMPLETED")).toBe(false);

    expect(
      evaluateRefundTransition({
        currentStatus: null,
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "REFUND_NOT_REQUESTED",
      })
    ).toMatchObject({
      allowed: false,
      reason: "UNKNOWN_TARGET_STATUS",
      targetStatus: "REFUND_NOT_REQUESTED",
    });

    expect(
      evaluateRefundTransition({
        currentStatus: null,
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "REFUND_REQUESTED",
      })
    ).toMatchObject({
      allowed: false,
      reason: "LEGACY_REFUND_STATUS_ALIAS",
      targetStatus: "REFUND_REQUESTED",
    });
  });

  it("allows only documented refund moves and reports allowed next statuses", () => {
    expect(allowedNextRefundStatuses(null)).toEqual(["REFUND_PENDING"]);
    expect(allowedNextRefundStatuses("REFUND_PENDING")).toEqual([
      "REFUND_APPROVED",
      "REFUND_DECLINED",
      "REFUND_FAILED",
    ]);
    expect(allowedNextRefundStatuses("REFUND_APPROVED")).toEqual([
      "REFUND_SENT",
    ]);
    expect(allowedNextRefundStatuses("REFUND_SENT")).toEqual([]);

    expect(
      evaluateRefundTransition({
        currentStatus: null,
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "REFUND_PENDING",
      })
    ).toMatchObject({
      allowed: true,
      newStatus: "REFUND_PENDING",
      oldStatus: null,
    });

    expect(
      evaluateRefundTransition({
        currentStatus: "REFUND_PENDING",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "REFUND_SENT",
      })
    ).toMatchObject({
      allowed: false,
      reason: "INVALID_TRANSITION",
    });
  });

  it("requires paid order state but not delivered fulfillment", () => {
    expect(
      evaluateRefundTransition({
        currentStatus: null,
        paymentStatus: "PAYMENT_PENDING",
        targetStatus: "REFUND_PENDING",
      })
    ).toMatchObject({
      allowed: false,
      reason: "PAYMENT_NOT_PAID",
    });

    expect(
      evaluateRefundTransition({
        currentStatus: null,
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "REFUND_PENDING",
      })
    ).toMatchObject({
      allowed: true,
      newStatus: "REFUND_PENDING",
    });
  });

  it("rejects same, stale, terminal, unknown, and sent-without-reference states safely", () => {
    expect(
      evaluateRefundTransition({
        currentStatus: "REFUND_PENDING",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "REFUND_PENDING",
      })
    ).toMatchObject({
      allowed: false,
      reason: "SAME_REFUND_STATUS",
    });

    expect(
      evaluateRefundTransition({
        currentStatus: "REFUND_SENT",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "REFUND_APPROVED",
      })
    ).toMatchObject({
      allowed: false,
      reason: "TERMINAL_REFUND_STATUS",
    });

    expect(
      evaluateRefundTransition({
        currentStatus: "WAREHOUSE_INTERNAL",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "REFUND_PENDING",
      })
    ).toMatchObject({
      allowed: false,
      reason: "UNKNOWN_REFUND_STATUS",
    });

    expect(
      evaluateRefundTransition({
        currentStatus: "REFUND_APPROVED",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "REFUND_SENT",
      })
    ).toMatchObject({
      allowed: false,
      reason: "MISSING_REFUND_REFERENCE",
    });
  });
});
