import { describe, expect, it } from "vitest";
import type { CustomerOrderListResult } from "@/server/repositories/OrderRepository";
import { OrderService, type CustomerOrderRepositoryLike } from "./OrderService";

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

const listResult: CustomerOrderListResult = {
  items: [
    {
      createdAt: "2026-07-08T01:00:00.000Z",
      currency: "PHP",
      ...lanes,
      itemCount: 1,
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

function repositoryStub(
  overrides: Partial<CustomerOrderRepositoryLike> = {}
): CustomerOrderRepositoryLike & { calls: string[] } {
  const calls: string[] = [];

  return {
    calls,
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
});
