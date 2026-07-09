import { describe, expect, it } from "vitest";
import {
  allowedNextReturnStatuses,
  evaluateReturnTransition,
  isReturnStatus,
  returnDisplayStatusLabel,
  returnStatusLabel,
} from "./return-transitions";

describe("return transitions", () => {
  it("treats idle return state as display-only and rejects it as a target", () => {
    expect(returnDisplayStatusLabel(null)).toBe("No return requested");
    expect(returnStatusLabel("RETURN_REQUESTED")).toBe("Return requested");
    expect(isReturnStatus("RETURN_REQUESTED")).toBe(true);
    expect(isReturnStatus("RETURN_NOT_REQUESTED")).toBe(false);

    expect(
      evaluateReturnTransition({
        currentStatus: null,
        fulfillmentStatus: "DELIVERED",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "RETURN_NOT_REQUESTED",
      })
    ).toMatchObject({
      allowed: false,
      reason: "UNKNOWN_TARGET_STATUS",
      targetStatus: "RETURN_NOT_REQUESTED",
    });
  });

  it("allows only documented status moves and reports allowed next statuses", () => {
    expect(allowedNextReturnStatuses(null)).toEqual(["RETURN_REQUESTED"]);
    expect(allowedNextReturnStatuses("RETURN_REQUESTED")).toEqual([
      "RETURN_APPROVED",
      "RETURN_REJECTED",
      "RETURN_CANCELLED",
    ]);
    expect(allowedNextReturnStatuses("RETURN_APPROVED")).toEqual([
      "RETURN_RECEIVED",
    ]);
    expect(allowedNextReturnStatuses("RETURN_RECEIVED")).toEqual([
      "RETURN_COMPLETED",
    ]);
    expect(allowedNextReturnStatuses("RETURN_COMPLETED")).toEqual([]);

    expect(
      evaluateReturnTransition({
        currentStatus: null,
        fulfillmentStatus: "DELIVERED",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "RETURN_REQUESTED",
      })
    ).toMatchObject({
      allowed: true,
      newStatus: "RETURN_REQUESTED",
      oldStatus: null,
    });

    expect(
      evaluateReturnTransition({
        currentStatus: "RETURN_REQUESTED",
        fulfillmentStatus: "DELIVERED",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "RETURN_COMPLETED",
      })
    ).toMatchObject({
      allowed: false,
      reason: "INVALID_TRANSITION",
    });
  });

  it("requires paid and delivered order state before new return cases", () => {
    expect(
      evaluateReturnTransition({
        currentStatus: null,
        fulfillmentStatus: "SHIPPED",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "RETURN_REQUESTED",
      })
    ).toMatchObject({
      allowed: false,
      reason: "FULFILLMENT_NOT_DELIVERED",
    });

    expect(
      evaluateReturnTransition({
        currentStatus: null,
        fulfillmentStatus: "DELIVERED",
        paymentStatus: "PAYMENT_PENDING",
        targetStatus: "RETURN_REQUESTED",
      })
    ).toMatchObject({
      allowed: false,
      reason: "PAYMENT_NOT_PAID",
    });
  });

  it("rejects same, stale, terminal, and unknown return states safely", () => {
    expect(
      evaluateReturnTransition({
        currentStatus: "RETURN_REQUESTED",
        fulfillmentStatus: "DELIVERED",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "RETURN_REQUESTED",
      })
    ).toMatchObject({
      allowed: false,
      reason: "SAME_RETURN_STATUS",
    });

    expect(
      evaluateReturnTransition({
        currentStatus: "RETURN_COMPLETED",
        fulfillmentStatus: "DELIVERED",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "RETURN_RECEIVED",
      })
    ).toMatchObject({
      allowed: false,
      reason: "TERMINAL_RETURN_STATUS",
    });

    expect(
      evaluateReturnTransition({
        currentStatus: "WAREHOUSE_INTERNAL",
        fulfillmentStatus: "DELIVERED",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "RETURN_REQUESTED",
      })
    ).toMatchObject({
      allowed: false,
      reason: "UNKNOWN_RETURN_STATUS",
    });
  });
});
