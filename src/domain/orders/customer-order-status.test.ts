import { describe, expect, it } from "vitest";
import {
  buildCustomerOrderTimeline,
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

  it("builds a newest-first customer timeline without raw status codes", () => {
    const timeline = buildCustomerOrderTimeline({
      createdAt: "2026-07-08T01:00:00.000Z",
      lanes: buildCustomerOrderStatusLanes({
        fulfillmentStatus: "SHIPPED",
        paymentStatus: "PAYMENT_PAID",
        updatedAt: "2026-07-08T03:00:00.000Z",
      }),
      updatedAt: "2026-07-08T03:00:00.000Z",
    });

    expect(timeline.map((event) => event.title)).toEqual([
      "Parcel picked up",
      "Packed by JRW",
      "Order placed",
      "Payment confirmed",
    ]);
    expect(timeline[0]).toMatchObject({
      label: "In transit",
      tone: "info",
      updatedAt: "2026-07-08T03:00:00.000Z",
    });
    expect(JSON.stringify(timeline)).not.toMatch(
      /PAYMENT_PAID|ORDER_PLACED|RETURN_NOT_REQUESTED|REFUND_NOT_REQUESTED/
    );
  });
});
