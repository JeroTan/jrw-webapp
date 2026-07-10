import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AdminOrderDetailDashboard,
  fulfillmentConflictMessage,
  refundConflictMessage,
  returnConflictMessage,
} from "./components/AdminOrderDetailDashboard";
import { AdminOrderListDashboard } from "./components/AdminOrderListDashboard";
import type { AdminOrderDetail, AdminOrderList } from "./types";

const lanes = {
  fulfillment: {
    kind: "fulfillment" as const,
    label: "Order placed",
    updatedAt: "2026-07-08T01:00:00.000Z",
    value: "ORDER_PLACED",
  },
  payment: {
    kind: "payment" as const,
    label: "Payment paid",
    updatedAt: "2026-07-08T01:00:00.000Z",
    value: "PAYMENT_PAID",
  },
  refund: {
    kind: "refund" as const,
    label: "No refund requested",
    updatedAt: null,
    value: "REFUND_NOT_REQUESTED",
  },
  return: {
    kind: "return" as const,
    label: "No return requested",
    updatedAt: null,
    value: "RETURN_NOT_REQUESTED",
  },
};

const order: AdminOrderDetail = {
  checkoutEmailMasked: "n***@example.test",
  contact: {
    checkoutEmail: "nina@example.test",
    fullName: "Nina Reyes",
    phone: "09171234567",
  },
  createdAt: "2026-07-08T01:00:00.000Z",
  currency: "PHP",
  customerKind: "CUSTOMER",
  customerLabel: "Nina R.",
  ...lanes,
  itemCount: 1,
  items: [
    {
      imageR2Key: "products/frozen-linen-shirt/front.webp",
      lineTotalCentavos: 3998,
      productName: "Frozen Linen Shirt",
      productSlug: "frozen-linen-shirt",
      quantity: 2,
      snapshotId: "snapshot_1",
      unitPriceCentavos: 1999,
      variantLabel: "Size: Small",
      variantOptions: [{ group: "Size", name: "Small" }],
    },
  ],
  orderId: "order_1",
  orderNumber: "JRW-2026-ORDER1",
  refundHistory: [],
  returnHistory: [],
  shippingAddress: {
    barangay: "Poblacion",
    cityProvince: "Makati",
    postalCode: "1200",
    shippingType: "STANDARD",
    streetAddress: "12 Sampaguita Street",
  },
  subtotalCentavos: 3998,
  totalCentavos: 3998,
  totalQuantity: 2,
  updatedAt: "2026-07-08T01:00:00.000Z",
};

const listData: AdminOrderList = {
  items: [order],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
  },
};

describe("admin orders UI", () => {
  it("renders list filters, rows, status badges, pagination, and safe list fields", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminOrderListDashboard, {
        autoLoad: false,
        initialData: listData,
        initialLoadState: "ready",
      })
    );

    expect(markup).toContain("Orders");
    expect(markup).toContain("Search orders");
    expect(markup).toContain("Payment");
    expect(markup).toContain("Fulfillment");
    expect(markup).toContain("Admin order list");
    expect(markup).toContain("JRW-2026-ORDER1");
    expect(markup).toContain("Nina R.");
    expect(markup).toContain("n***@example.test");
    expect(markup).toContain("Customer account");
    expect(markup).toContain("Payment paid");
    expect(markup).toContain("Order placed");
    expect(markup).toContain("No return requested");
    expect(markup).toContain("No refund requested");
    expect(markup).toContain("Page 1 of 1");
    expect(markup).not.toContain("nina@example.test");
    expect(markup).not.toContain("09171234567");
    expect(markup).not.toContain("Sampaguita");
  });

  it("renders list loading and empty states", () => {
    const loadingMarkup = renderToStaticMarkup(
      createElement(AdminOrderListDashboard, {
        autoLoad: false,
        initialLoadState: "loading",
      })
    );
    const emptyMarkup = renderToStaticMarkup(
      createElement(AdminOrderListDashboard, {
        autoLoad: false,
        initialData: {
          items: [],
          pagination: {
            page: 1,
            pageSize: 20,
            totalItems: 0,
            totalPages: 0,
          },
        },
        initialLoadState: "ready",
      })
    );

    expect(loadingMarkup).toContain("Loading order table");
    expect(emptyMarkup).toContain("No orders yet");
    expect(emptyMarkup).toContain(
      "Orders appear here after checkout and payment flow creates them."
    );
  });

  it("renders detail lanes, timeline, fulfillment actions, contact, and shipping", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminOrderDetailDashboard, {
        autoLoad: false,
        initialLoadState: "ready",
        initialOrder: order,
        orderId: "order_1",
      })
    );

    expect(markup).toContain("Order details");
    expect(markup).toContain("Status overview");
    expect(markup).toContain("Payment");
    expect(markup).toContain("Fulfillment");
    expect(markup).toContain("Return");
    expect(markup).toContain("Refund");
    expect(markup).toContain("sm:grid-cols-2 xl:grid-cols-4");
    expect(markup).toContain("Payment confirmed");
    expect(markup).toContain("Order placed");
    expect(markup).toContain("Fulfillment actions");
    expect(markup).toContain("Start processing");
    expect(markup).toContain("Cancel order");
    expect(markup).toContain("Return actions");
    expect(markup).toContain("Return available after delivery.");
    expect(markup).toContain("Return history");
    expect(markup).toContain("No return history yet.");
    expect(markup).toContain("Refund actions");
    expect(markup).toContain("Refund amount");
    expect(markup).toContain("Pesos");
    expect(markup).toContain("Centavos");
    expect(markup).toContain("Record refund");
    expect(markup).toContain("Refund history");
    expect(markup).toContain("No refund history yet.");
    expect(markup.match(/aria-expanded="false"/g)?.length).toBe(4);
    expect(markup).not.toContain('aria-expanded="true"');
    expect(markup).toContain("lucide-chevron-right");
    expect(markup).toContain(
      "order-1 grid gap-grid-sm lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]"
    );
    expect(markup).toContain("Frozen Linen Shirt");
    expect(markup).toContain(
      'src="/assets/products/frozen-linen-shirt/front.webp"'
    );
    expect(markup).toContain("Size: Small");
    expect(markup).toContain("Items purchased");
    expect(markup).toContain("Customer contact");
    expect(markup).toContain("Nina Reyes");
    expect(markup).toContain("nina@example.test");
    expect(markup).toContain("09171234567");
    expect(markup).toContain("12 Sampaguita Street");
    expect(markup).not.toContain("Approve refund");
    expect(markup).not.toContain("Return requested");
    expect(markup).not.toMatch(
      /state only|manual return state|manual refund state|payment state|fulfillment state|order truth timeline/i
    );
    expect(markup).not.toMatch(
      /ORDER_PLACED|PAYMENT_PAID|CUSTOMER|RETURN_NOT_REQUESTED|REFUND_NOT_REQUESTED/
    );
    expect(markup).not.toContain(">Snapshot<");
  });

  it("builds safe conflict messages from server details", () => {
    expect(
      fulfillmentConflictMessage({
        code: "CONFLICT_STATE",
        details: {
          allowedNextStatuses: ["SHIPPED", "CANCELLED"],
          currentStatus: "PROCESSING",
        },
        message: "Conflict",
        status: 409,
      })
    ).toBe(
      "Order status changed. Current fulfillment: Processing. Next: Mark as shipped, Cancel order."
    );
    expect(
      returnConflictMessage({
        code: "CONFLICT_STATE",
        details: {
          allowedNextStatuses: ["RETURN_RECEIVED"],
          currentStatus: "RETURN_APPROVED",
        },
        message: "Conflict",
        status: 409,
      })
    ).toBe(
      "Return status changed. Current return: Return approved. Next: Mark received."
    );
    expect(
      refundConflictMessage({
        code: "CONFLICT_STATE",
        details: {
          allowedNextStatuses: ["REFUND_SENT"],
          currentStatus: "REFUND_APPROVED",
        },
        message: "Conflict",
        status: 409,
      })
    ).toBe(
      "Refund status changed. Current refund: Refund approved. Next: Mark sent."
    );
    expect(
      refundConflictMessage({
        code: "CONFLICT_STATE",
        details: {
          maxAmountCentavos: 3998,
          reason: "AMOUNT_EXCEEDS_TARGET",
        },
        message: "Conflict",
        status: 409,
      })
    ).toBe("Refund amount is above current target maximum PHP 39.98.");
  });

  it("renders return request form with human labels only", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminOrderDetailDashboard, {
        autoLoad: false,
        initialLoadState: "ready",
        initialOrder: {
          ...order,
          fulfillment: {
            kind: "fulfillment",
            label: "Delivered",
            updatedAt: "2026-07-08T02:00:00.000Z",
            value: "DELIVERED",
          },
        },
        orderId: "order_1",
      })
    );

    expect(markup).toContain("Return actions");
    expect(markup).toContain("Target type");
    expect(markup).toContain("Entire order");
    expect(markup).toContain("Purchased item");
    expect(markup).toContain("Item");
    expect(markup).toContain("Reason");
    expect(markup).toContain("Notes");
    expect(markup).toContain("Reference ID");
    expect(markup).toContain("Record return request");
    expect(markup).toContain("Return history");
    expect(markup).toContain("No return history yet.");
    expect(markup).not.toMatch(
      /RETURN_APPROVED|RETURN_RECEIVED|RETURN_REQUESTED|req_return_1/
    );
  });

  it("renders direct next-step buttons after return is requested", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminOrderDetailDashboard, {
        autoLoad: false,
        initialLoadState: "ready",
        initialOrder: {
          ...order,
          fulfillment: {
            kind: "fulfillment",
            label: "Delivered",
            updatedAt: "2026-07-08T02:00:00.000Z",
            value: "DELIVERED",
          },
          return: {
            kind: "return",
            label: "Return requested",
            updatedAt: "2026-07-08T03:00:00.000Z",
            value: "RETURN_REQUESTED",
          },
          returnHistory: [
            {
              actorId: "admin_1",
              amountCentavos: 0,
              createdAt: "2026-07-08T03:00:00.000Z",
              currency: "PHP",
              id: "return_1",
              notes: null,
              orderId: "order_1",
              orderSnapshotId: "snapshot_1",
              previousStatus: null,
              reason: "Wrong size",
              referenceId: null,
              status: "RETURN_REQUESTED",
              statusLabel: "Return requested",
              targetLabel: "Frozen Linen Shirt - Size: Small",
              targetType: "ITEM",
              updatedAt: "2026-07-08T03:00:00.000Z",
            },
          ],
        },
        orderId: "order_1",
      })
    );

    expect(markup).toContain("Approve return");
    expect(markup).toContain("Decline return");
    expect(markup).toContain("Cancel return");
    expect(markup).toContain("md:col-span-2");
    expect(markup).not.toMatch(
      /RETURN_APPROVED|RETURN_REJECTED|RETURN_CANCELLED/
    );
  });

  it("renders refund request form with amount filled from order value", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminOrderDetailDashboard, {
        autoLoad: false,
        initialLoadState: "ready",
        initialOrder: order,
        orderId: "order_1",
      })
    );

    expect(markup).toContain("Refund actions");
    expect(markup).toContain("Target type");
    expect(markup).toContain("Entire order");
    expect(markup).toContain("Purchased item");
    expect(markup).toContain("Item");
    expect(markup).toContain("Refund amount");
    expect(markup).toContain('value="39"');
    expect(markup).toContain('value="98"');
    expect(markup).toContain("Reason");
    expect(markup).toContain("Notes");
    expect(markup).toContain("Reference ID");
    expect(markup).toContain("Record refund");
    expect(markup).toContain("Refund history");
    expect(markup).toContain("No refund history yet.");
    expect(markup).not.toContain("PayMongo");
    expect(markup).not.toMatch(
      /REFUND_PENDING|REFUND_APPROVED|REFUND_DECLINED|REFUND_SENT|REFUND_FAILED/
    );
  });

  it("renders refund history next-step buttons with reference prompt before sent", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminOrderDetailDashboard, {
        autoLoad: false,
        initialLoadState: "ready",
        initialOrder: {
          ...order,
          refund: {
            kind: "refund",
            label: "Refund approved",
            updatedAt: "2026-07-08T04:00:00.000Z",
            value: "REFUND_APPROVED",
          },
          refundHistory: [
            {
              actorId: "admin_1",
              amountCentavos: 3998,
              createdAt: "2026-07-08T04:00:00.000Z",
              currency: "PHP",
              id: "refund_2",
              notes: "Finance approved",
              orderId: "order_1",
              orderSnapshotId: "snapshot_1",
              previousStatus: "REFUND_PENDING",
              reason: "Approved by support",
              referenceId: null,
              status: "REFUND_APPROVED",
              statusLabel: "Refund approved",
              targetLabel: "Frozen Linen Shirt - Size: Small",
              targetType: "ITEM",
              updatedAt: "2026-07-08T04:00:00.000Z",
            },
            {
              actorId: "admin_1",
              amountCentavos: 3998,
              createdAt: "2026-07-08T03:00:00.000Z",
              currency: "PHP",
              id: "refund_1",
              notes: null,
              orderId: "order_1",
              orderSnapshotId: "snapshot_1",
              previousStatus: null,
              reason: "Damaged item",
              referenceId: null,
              status: "REFUND_PENDING",
              statusLabel: "Refund pending",
              targetLabel: "Frozen Linen Shirt - Size: Small",
              targetType: "ITEM",
              updatedAt: "2026-07-08T03:00:00.000Z",
            },
          ],
        },
        orderId: "order_1",
      })
    );

    expect(markup).toContain("Refund history");
    expect(markup).toContain("Refund approved");
    expect(markup).toContain("Amount PHP 39.98");
    expect(markup).toContain("Reference ID");
    expect(markup).toContain("Required for sent refund");
    expect(markup).toContain("Mark sent");
    expect(markup).not.toContain("Approve refund");
    expect(markup).not.toContain("Decline refund");
    expect(markup).not.toContain("Mark failed");
    expect(markup).not.toMatch(
      /REFUND_PENDING|REFUND_APPROVED|REFUND_DECLINED|REFUND_SENT|REFUND_FAILED/
    );
  });

  it("keeps remaining purchased items returnable after one item return request", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminOrderDetailDashboard, {
        autoLoad: false,
        initialLoadState: "ready",
        initialOrder: {
          ...order,
          fulfillment: {
            kind: "fulfillment",
            label: "Delivered",
            updatedAt: "2026-07-08T02:00:00.000Z",
            value: "DELIVERED",
          },
          itemCount: 2,
          items: [
            {
              ...order.items[0],
              productName: "Perfume EDP",
              snapshotId: "snapshot_1",
              variantLabel: "100ml",
            },
            {
              imageR2Key: null,
              lineTotalCentavos: 40000,
              productName: "T-shirt 300 GSM",
              productSlug: "t-shirt-300-gsm",
              quantity: 1,
              snapshotId: "snapshot_2",
              unitPriceCentavos: 40000,
              variantLabel: "SM",
              variantOptions: [{ group: "Size", name: "SM" }],
            },
          ],
          return: {
            kind: "return",
            label: "Return requested",
            updatedAt: "2026-07-08T03:00:00.000Z",
            value: "RETURN_REQUESTED",
          },
          returnHistory: [
            {
              actorId: "admin_1",
              amountCentavos: 0,
              createdAt: "2026-07-08T03:00:00.000Z",
              currency: "PHP",
              id: "return_1",
              notes: null,
              orderId: "order_1",
              orderSnapshotId: "snapshot_1",
              previousStatus: null,
              reason: "Wrong item",
              referenceId: null,
              status: "RETURN_REQUESTED",
              statusLabel: "Return requested",
              targetLabel: "Perfume EDP - 100ml",
              targetType: "ITEM",
              updatedAt: "2026-07-08T03:00:00.000Z",
            },
          ],
          totalQuantity: 2,
        },
        orderId: "order_1",
      })
    );

    expect(markup).toContain(
      "Choose another purchased item to create a separate return request."
    );
    expect(markup).toContain("T-shirt 300 GSM - SM");
    expect(markup).not.toContain('<option value="snapshot_1">Perfume EDP');
    expect(markup).toContain("Record return request");
    expect(markup).toContain("Approve return");
    expect(markup).toContain("Decline return");
    expect(markup).toContain("Cancel return");
    expect(markup).not.toContain(
      "All purchased items already have return records."
    );
    expect(markup).not.toContain(
      "Return request already covers whole order. Use return history actions below."
    );
  });

  it("renders disabled fulfillment reason when payment is not paid", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminOrderDetailDashboard, {
        autoLoad: false,
        initialLoadState: "ready",
        initialOrder: {
          ...order,
          payment: {
            kind: "payment",
            label: "Payment pending",
            updatedAt: "2026-07-08T01:00:00.000Z",
            value: "PAYMENT_PENDING",
          },
        },
        orderId: "order_1",
      })
    );

    expect(markup).toContain("Fulfillment locked until payment is paid.");
    expect(markup).not.toContain("Start processing");
    expect(markup).not.toContain("Cancel order");
  });

  it("renders detail loading and not-found states", () => {
    const loadingMarkup = renderToStaticMarkup(
      createElement(AdminOrderDetailDashboard, {
        autoLoad: false,
        initialLoadState: "loading",
        orderId: "order_1",
      })
    );
    const notFoundMarkup = renderToStaticMarkup(
      createElement(AdminOrderDetailDashboard, {
        autoLoad: false,
        initialLoadState: "not-found",
        orderId: "missing",
      })
    );

    expect(loadingMarkup).toContain("Loading order detail");
    expect(notFoundMarkup).toContain("Order not found");
    expect(notFoundMarkup).toContain("Back to orders");
  });
});
