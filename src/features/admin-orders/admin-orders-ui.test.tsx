import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminOrderDetailDashboard } from "./components/AdminOrderDetailDashboard";
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
      unitPriceCentavos: 1999,
      variantLabel: "Size: Small",
      variantOptions: [{ group: "Size", name: "Small" }],
    },
  ],
  orderId: "order_1",
  orderNumber: "JRW-2026-ORDER1",
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

  it("renders detail lanes, timeline, snapshot items, contact, shipping, and no mutation controls", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminOrderDetailDashboard, {
        autoLoad: false,
        initialLoadState: "ready",
        initialOrder: order,
        orderId: "order_1",
      })
    );

    expect(markup).toContain("Read-only order truth");
    expect(markup).toContain("Payment, fulfillment, return, refund");
    expect(markup).toContain("Payment confirmed");
    expect(markup).toContain("Order placed");
    expect(markup).toContain("Frozen Linen Shirt");
    expect(markup).toContain(
      'src="/assets/products/frozen-linen-shirt/front.webp"'
    );
    expect(markup).toContain("Size: Small");
    expect(markup).toContain("Nina Reyes");
    expect(markup).toContain("nina@example.test");
    expect(markup).toContain("09171234567");
    expect(markup).toContain("12 Sampaguita Street");
    expect(markup).not.toContain("Mark shipped");
    expect(markup).not.toContain("Cancel order");
    expect(markup).not.toContain("Approve refund");
    expect(markup).not.toContain("Return requested");
    expect(markup).not.toContain(">Snapshot<");
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
