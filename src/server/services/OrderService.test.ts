import { describe, expect, it } from "vitest";
import type {
  AdminOrderListResult,
  CustomerOrderListResult,
} from "@/server/repositories/OrderRepository";
import { OrderService, type OrderRepositoryLike } from "./OrderService";

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

const snapshotItems = [
  {
    imageR2Key: null,
    lineTotalCentavos: 1999,
    productName: "Frozen Linen Shirt",
    productSlug: "frozen-linen-shirt",
    quantity: 1,
    unitPriceCentavos: 1999,
    variantLabel: "Size: Small",
    variantOptions: [{ group: "Size", name: "Small" }],
  },
];

const listResult: CustomerOrderListResult = {
  items: [
    {
      createdAt: "2026-07-08T01:00:00.000Z",
      currency: "PHP",
      ...lanes,
      itemCount: 1,
      items: snapshotItems,
      orderId: "order_1",
      orderNumber: "JRW-2026-ORDER1",
      subtotalCentavos: 1999,
      totalCentavos: 1999,
      totalQuantity: 1,
      updatedAt: "2026-07-08T01:00:00.000Z",
    },
  ],
  pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
};

const adminListResult: AdminOrderListResult = {
  items: [
    {
      ...listResult.items[0],
      checkoutEmailMasked: "n***@example.test",
      customerKind: "CUSTOMER",
      customerLabel: "Nina R.",
    },
  ],
  pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
};

function repositoryStub(
  overrides: Partial<OrderRepositoryLike> = {}
): OrderRepositoryLike & { calls: string[] } {
  const calls: string[] = [];

  return {
    calls,
    getAdminOrderDetail: async (input) => {
      calls.push(`admin-detail:${input.orderIdOrNumber}`);
      return {
        ...adminListResult.items[0],
        contact: {
          checkoutEmail: "nina@example.test",
          fullName: "Nina Reyes",
          phone: "09171234567",
        },
        items: [
          {
            imageR2Key: null,
            lineTotalCentavos: 1999,
            productName: "Frozen Linen Shirt",
            productSlug: "frozen-linen-shirt",
            quantity: 1,
            unitPriceCentavos: 1999,
            variantLabel: "Size: Small",
            variantOptions: [{ group: "Size", name: "Small" }],
          },
        ],
        shippingAddress: {
          barangay: "Poblacion",
          cityProvince: "Makati",
          postalCode: "1200",
          shippingType: "STANDARD",
          streetAddress: "12 Sampaguita Street",
        },
      };
    },
    getCustomerOrderDetail: async (input) => {
      calls.push(`detail:${input.customerId}:${input.orderIdOrNumber}`);
      return {
        ...listResult.items[0],
        items: [
          {
            imageR2Key: null,
            lineTotalCentavos: 1999,
            productName: "Frozen Linen Shirt",
            productSlug: "frozen-linen-shirt",
            quantity: 1,
            unitPriceCentavos: 1999,
            variantLabel: "Size: Small",
            variantOptions: [{ group: "Size", name: "Small" }],
          },
        ],
      };
    },
    listCustomerOrders: async (input) => {
      calls.push(`list:${input.customerId}:${input.page}:${input.pageSize}`);
      return listResult;
    },
    listAdminOrders: async (input) => {
      calls.push(
        `admin-list:${input.page}:${input.pageSize}:${input.search}:${input.paymentStatus}:${input.fulfillmentStatus}`
      );
      return adminListResult;
    },
    ...overrides,
  };
}

const customerActor = {
  authenticated: true,
  role: "CUSTOMER",
  actorId: "customer_1",
  accountStatus: {
    approved: true,
    emailVerified: true,
    status: "ACTIVE",
  },
  eligibility: {
    active: true,
    approved: true,
    emailVerified: true,
  },
} as const;

const adminActor = {
  authenticated: true,
  role: "ADMIN",
  actorId: "admin_1",
  accountStatus: {
    approved: true,
    emailVerified: true,
    status: "ACTIVE",
  },
  eligibility: {
    active: true,
    approved: true,
    emailVerified: true,
  },
} as const;

describe("order service", () => {
  it("lists and gets orders for the authenticated active Customer actor", async () => {
    const repository = repositoryStub();
    const service = new OrderService({ repository });

    await expect(
      service.listCustomerOrders({
        actor: customerActor,
        page: 1,
        pageSize: 20,
        requestId: "req_list",
      })
    ).resolves.toMatchObject({ content: { items: [{ orderId: "order_1" }] } });
    await expect(
      service.getCustomerOrderDetail({
        actor: customerActor,
        orderIdOrNumber: "JRW-2026-ORDER1",
        requestId: "req_detail",
      })
    ).resolves.toMatchObject({
      content: { items: [{ productName: "Frozen Linen Shirt" }] },
    });
    expect(repository.calls).toEqual([
      "list:customer_1:1:20",
      "detail:customer_1:JRW-2026-ORDER1",
    ]);
  });

  it.each([
    [{ authenticated: false, role: "PROSPECT" }, "AUTH_REQUIRED"],
    [
      { authenticated: true, role: "ADMIN", actorId: "admin_1" },
      "AUTH_FORBIDDEN",
    ],
    [
      {
        ...customerActor,
        accountStatus: {
          approved: true,
          emailVerified: true,
          status: "SUSPENDED" as const,
        },
      },
      "ACCOUNT_SUSPENDED",
    ],
    [
      {
        ...customerActor,
        accountStatus: {
          approved: true,
          emailVerified: false,
          status: "ACTIVE" as const,
        },
      },
      "EMAIL_NOT_VERIFIED",
    ],
  ])("denies invalid actor %j", async (actor, expectedCode) => {
    const repository = repositoryStub();
    const service = new OrderService({ repository });

    const result = await service.listCustomerOrders({
      actor,
      requestId: "req_denied",
    });

    expect(result.error?.code).toBe(expectedCode);
    expect(repository.calls).toEqual([]);
  });

  it("returns not found for unknown or cross-customer detail", async () => {
    const repository = repositoryStub({
      getCustomerOrderDetail: async () => null,
    });
    const service = new OrderService({ repository });
    const result = await service.getCustomerOrderDetail({
      actor: customerActor,
      orderIdOrNumber: "order_2",
      requestId: "req_cross_customer",
    });

    expect(result.error?.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("lists and gets orders for active approved Admin actors", async () => {
    const repository = repositoryStub();
    const service = new OrderService({ repository });

    await expect(
      service.listAdminOrders({
        actor: adminActor,
        fulfillmentStatus: "ORDER_PLACED",
        page: 1,
        pageSize: 20,
        paymentStatus: "PAYMENT_PAID",
        requestId: "req_admin_list",
        search: "JRW-2026",
      })
    ).resolves.toMatchObject({
      content: {
        items: [
          {
            checkoutEmailMasked: "n***@example.test",
            customerLabel: "Nina R.",
            orderId: "order_1",
          },
        ],
      },
    });
    await expect(
      service.getAdminOrderDetail({
        actor: adminActor,
        orderIdOrNumber: "JRW-2026-ORDER1",
        requestId: "req_admin_detail",
      })
    ).resolves.toMatchObject({
      content: {
        contact: { checkoutEmail: "nina@example.test" },
        items: [{ productName: "Frozen Linen Shirt" }],
        shippingAddress: { streetAddress: "12 Sampaguita Street" },
      },
    });
    expect(repository.calls).toEqual([
      "admin-list:1:20:JRW-2026:PAYMENT_PAID:ORDER_PLACED",
      "admin-detail:JRW-2026-ORDER1",
    ]);
  });

  it.each([
    [{ authenticated: false, role: "PROSPECT" }, "AUTH_REQUIRED"],
    [customerActor, "AUTH_FORBIDDEN"],
    [
      { authenticated: true, role: "PROSPECT", actorId: "prospect_1" },
      "AUTH_FORBIDDEN",
    ],
    [
      { authenticated: true, role: "SUPER_ADMIN", actorId: "owner_1" },
      "AUTH_FORBIDDEN",
    ],
    [
      {
        ...adminActor,
        accountStatus: {
          approved: true,
          emailVerified: true,
          status: "SUSPENDED" as const,
        },
      },
      "ACCOUNT_SUSPENDED",
    ],
    [
      {
        ...adminActor,
        accountStatus: {
          approved: true,
          emailVerified: true,
          status: "INACTIVE" as const,
        },
      },
      "AUTH_FORBIDDEN",
    ],
    [
      {
        ...adminActor,
        accountStatus: {
          approved: true,
          emailVerified: false,
          status: "ACTIVE" as const,
        },
        eligibility: {
          active: true,
          approved: true,
          emailVerified: false,
        },
      },
      "EMAIL_NOT_VERIFIED",
    ],
    [
      {
        ...adminActor,
        accountStatus: {
          approved: false,
          emailVerified: true,
          status: "ACTIVE" as const,
        },
        eligibility: {
          active: true,
          approved: false,
          emailVerified: true,
        },
      },
      "ADMIN_APPROVAL_REQUIRED",
    ],
  ])("denies invalid Admin actor %j", async (actor, expectedCode) => {
    const repository = repositoryStub();
    const service = new OrderService({ repository });

    const result = await service.listAdminOrders({
      actor,
      requestId: "req_admin_denied",
    });

    expect(result.error?.code).toBe(expectedCode);
    expect(repository.calls).toEqual([]);
  });

  it("validates and not-founds Admin detail requests", async () => {
    const repository = repositoryStub({
      getAdminOrderDetail: async (input) => {
        repository.calls.push(`admin-detail:${input.orderIdOrNumber}`);
        return null;
      },
    });
    const service = new OrderService({ repository });

    await expect(
      service.getAdminOrderDetail({
        actor: adminActor,
        orderIdOrNumber: " ",
        requestId: "req_admin_blank",
      })
    ).resolves.toMatchObject({ error: { code: "VALIDATION_FAILED" } });
    expect(repository.calls).toEqual([]);

    await expect(
      service.getAdminOrderDetail({
        actor: adminActor,
        orderIdOrNumber: "missing",
        requestId: "req_admin_missing",
      })
    ).resolves.toMatchObject({ error: { code: "RESOURCE_NOT_FOUND" } });
    expect(repository.calls).toEqual(["admin-detail:missing"]);
  });
});
