import { describe, expect, it } from "vitest";
import {
  buildCustomerOrderStatusLanes,
  customerOrderStatusLaneLabel,
} from "./customer-order-status";

describe("customer order status lanes", () => {
  it("maps payment, fulfillment, return, and refund lanes separately", () => {
    const lanes = buildCustomerOrderStatusLanes({
      fulfillmentStatus: "SHIPPED",
      paymentStatus: "PAYMENT_PAID",
      updatedAt: "2026-07-08T01:00:00.000Z",
    });

    expect(lanes).toEqual({
      fulfillment: {
        kind: "fulfillment",
        label: "Shipped",
        updatedAt: "2026-07-08T01:00:00.000Z",
        value: "SHIPPED",
      },
      payment: {
        kind: "payment",
        label: "Payment paid",
        updatedAt: "2026-07-08T01:00:00.000Z",
        value: "PAYMENT_PAID",
      },
      refund: {
        kind: "refund",
        label: "No refund requested",
        updatedAt: null,
        value: "REFUND_NOT_REQUESTED",
      },
      return: {
        kind: "return",
        label: "No return requested",
        updatedAt: null,
        value: "RETURN_NOT_REQUESTED",
      },
    });
  });

  it("degrades unknown values to safe unavailable labels", () => {
    expect(customerOrderStatusLaneLabel("payment", "PAYMENT_PROVIDER_X")).toBe(
      "Payment status unavailable"
    );
    expect(customerOrderStatusLaneLabel("fulfillment", "DRONE_HANDOFF")).toBe(
      "Fulfillment status unavailable"
    );
    expect(customerOrderStatusLaneLabel("return", "WAREHOUSE_INTERNAL")).toBe(
      "Return status unavailable"
    );
    expect(customerOrderStatusLaneLabel("refund", "PAYMONGO_REFUND_ID")).toBe(
      "Refund status unavailable"
    );
  });

  it("keeps customer-safe labels free of provider/internal wording", () => {
    const labels = Object.values(
      buildCustomerOrderStatusLanes({
        fulfillmentStatus: "ORDER_PLACED",
        paymentStatus: "PAYMENT_PENDING",
      })
    ).map((lane) => lane.label);

    expect(labels.join(" ")).not.toMatch(
      /paymongo|provider|payload|signature|token|secret|card/i
    );
  });
});
