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
      "Delivery status unavailable"
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

  it("shows active return status with customer-safe labels and no Admin details", () => {
    const lanes = buildCustomerOrderStatusLanes({
      fulfillmentStatus: "DELIVERED",
      paymentStatus: "PAYMENT_PAID",
      returnStatus: "RETURN_APPROVED",
      returnUpdatedAt: "2026-07-08T04:00:00.000Z",
      updatedAt: "2026-07-08T03:00:00.000Z",
    });
    const timeline = buildCustomerOrderTimeline({
      createdAt: "2026-07-08T01:00:00.000Z",
      lanes,
      updatedAt: "2026-07-08T04:00:00.000Z",
    });

    expect(lanes.return).toEqual({
      kind: "return",
      label: "Return approved",
      updatedAt: "2026-07-08T04:00:00.000Z",
      value: "RETURN_APPROVED",
    });
    expect(timeline[0]).toMatchObject({
      description: "JRW approved your return request.",
      label: "Return approved",
      lane: "return",
      title: "Return approved",
      updatedAt: "2026-07-08T04:00:00.000Z",
    });
    expect(JSON.stringify(timeline)).not.toMatch(
      /RETURN_APPROVED|admin|notes|reference|request_id|provider/i
    );
  });

  it("shows active refund status with customer-safe labels and no Admin details", () => {
    const lanes = buildCustomerOrderStatusLanes({
      fulfillmentStatus: "DELIVERED",
      paymentStatus: "PAYMENT_PAID",
      refundStatus: "REFUND_DECLINED",
      refundUpdatedAt: "2026-07-08T05:00:00.000Z",
      updatedAt: "2026-07-08T03:00:00.000Z",
    });
    const timeline = buildCustomerOrderTimeline({
      createdAt: "2026-07-08T01:00:00.000Z",
      lanes,
      updatedAt: "2026-07-08T05:00:00.000Z",
    });

    expect(lanes.refund).toEqual({
      kind: "refund",
      label: "Refund declined",
      updatedAt: "2026-07-08T05:00:00.000Z",
      value: "REFUND_DECLINED",
    });
    expect(timeline[0]).toMatchObject({
      description: "JRW declined this refund request.",
      label: "Refund declined",
      lane: "refund",
      title: "Refund declined",
      tone: "warning",
      updatedAt: "2026-07-08T05:00:00.000Z",
    });
    expect(JSON.stringify(timeline)).not.toMatch(
      /REFUND_DECLINED|admin|notes|reference|request_id|paymongo|provider/i
    );
  });

  it("uses outcome-specific return and refund messages with lane timestamps", () => {
    const timeline = buildCustomerOrderTimeline({
      createdAt: "2026-07-08T01:00:00.000Z",
      lanes: buildCustomerOrderStatusLanes({
        fulfillmentStatus: "DELIVERED",
        paymentStatus: "PAYMENT_PAID",
        refundStatus: "REFUND_PENDING",
        refundUpdatedAt: "2026-07-08T06:00:00.000Z",
        returnStatus: "RETURN_REJECTED",
        returnUpdatedAt: "2026-07-08T05:00:00.000Z",
        updatedAt: "2026-07-08T03:00:00.000Z",
      }),
      updatedAt: "2026-07-08T07:00:00.000Z",
    });

    expect(timeline[0]).toMatchObject({
      description: "JRW is reviewing your refund request.",
      label: "Refund pending",
      title: "Refund pending",
      updatedAt: "2026-07-08T06:00:00.000Z",
    });
    expect(timeline[1]).toMatchObject({
      description: "JRW declined this return request.",
      label: "Return declined",
      title: "Return declined",
      updatedAt: "2026-07-08T05:00:00.000Z",
    });
    expect(JSON.stringify(timeline)).not.toMatch(/tracking this/i);
  });
});
