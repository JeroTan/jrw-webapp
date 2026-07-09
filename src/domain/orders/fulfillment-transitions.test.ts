import { describe, expect, it } from "vitest";
import {
  allowedNextFulfillmentStatuses,
  evaluateFulfillmentTransition,
  fulfillmentStatusLabel,
  isFulfillmentStatus,
} from "./fulfillment-transitions";

describe("fulfillment transitions", () => {
  it("allows only forward and cancellation transitions from paid orders", () => {
    expect(allowedNextFulfillmentStatuses("ORDER_PLACED")).toEqual([
      "PROCESSING",
      "CANCELLED",
    ]);
    expect(allowedNextFulfillmentStatuses("PROCESSING")).toEqual([
      "SHIPPED",
      "CANCELLED",
    ]);
    expect(allowedNextFulfillmentStatuses("SHIPPED")).toEqual(["DELIVERED"]);
    expect(allowedNextFulfillmentStatuses("DELIVERED")).toEqual([]);
    expect(allowedNextFulfillmentStatuses("CANCELLED")).toEqual([]);

    expect(
      evaluateFulfillmentTransition({
        currentStatus: "ORDER_PLACED",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "PROCESSING",
      })
    ).toMatchObject({
      allowed: true,
      newStatus: "PROCESSING",
      oldStatus: "ORDER_PLACED",
    });
  });

  it("blocks unpaid, terminal, same, invalid, and unknown transitions with stable reasons", () => {
    expect(
      evaluateFulfillmentTransition({
        currentStatus: "ORDER_PLACED",
        paymentStatus: "PAYMENT_PENDING",
        targetStatus: "PROCESSING",
      })
    ).toMatchObject({ allowed: false, reason: "PAYMENT_NOT_PAID" });
    expect(
      evaluateFulfillmentTransition({
        currentStatus: "DELIVERED",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "CANCELLED",
      })
    ).toMatchObject({ allowed: false, reason: "TERMINAL_FULFILLMENT_STATUS" });
    expect(
      evaluateFulfillmentTransition({
        currentStatus: "PROCESSING",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "PROCESSING",
      })
    ).toMatchObject({ allowed: false, reason: "SAME_FULFILLMENT_STATUS" });
    expect(
      evaluateFulfillmentTransition({
        currentStatus: "PROCESSING",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "DELIVERED",
      })
    ).toMatchObject({ allowed: false, reason: "INVALID_TRANSITION" });
    expect(
      evaluateFulfillmentTransition({
        currentStatus: "PACKED",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "SHIPPED",
      })
    ).toMatchObject({ allowed: false, reason: "UNKNOWN_FULFILLMENT_STATUS" });
    expect(
      evaluateFulfillmentTransition({
        currentStatus: "PROCESSING",
        paymentStatus: "PAYMENT_PAID",
        targetStatus: "lost",
      })
    ).toMatchObject({ allowed: false, reason: "UNKNOWN_TARGET_STATUS" });
  });

  it("exposes safe labels and status guards for API/UI contracts", () => {
    expect(isFulfillmentStatus("SHIPPED")).toBe(true);
    expect(isFulfillmentStatus("lost")).toBe(false);
    expect(fulfillmentStatusLabel("DELIVERED")).toBe("Delivered");
    expect(fulfillmentStatusLabel("lost")).toBe(
      "Fulfillment status unavailable"
    );
  });
});
