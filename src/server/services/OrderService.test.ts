import { describe, expect, it } from "vitest";
import type {
  AdminOrderListResult,
  CustomerOrderListResult,
  FulfillmentEmailStatus,
  OrderFulfillmentEventRecord,
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
    claimFulfillmentStatusEmail: async () => false,
    getAdminFulfillmentTransitionSubject: async (input) => {
      calls.push(`subject:${input.orderIdOrNumber}`);
      return null;
    },
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
    getFulfillmentStatusEmail: async () => null,
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
    markFulfillmentStatusEmailFailed: async () => undefined,
    markFulfillmentStatusEmailSent: async () => undefined,
    transitionAdminOrderFulfillment: async () => ({
      decision: "missing-order",
    }),
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

const transitionEvent: OrderFulfillmentEventRecord = {
  actorId: "admin_1",
  createdAt: "2026-07-08T02:00:00.000Z",
  emailLastAttemptAt: null,
  emailMessageId: null,
  emailSentAt: null,
  emailStatus: "PENDING",
  eventId: "fulfillment_event_1",
  newFulfillmentStatus: "PROCESSING",
  oldFulfillmentStatus: "ORDER_PLACED",
  orderId: "order_1",
  requestId: "req_fulfillment",
  updatedAt: "2026-07-08T02:00:00.000Z",
};

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

  it("updates Admin fulfillment, sends email, and publishes audit without changing payment lane", async () => {
    const repository = repositoryStub({
      claimFulfillmentStatusEmail: async (input) => {
        repository.calls.push(`claim-email:${input.eventId}`);
        return true;
      },
      getFulfillmentStatusEmail: async (eventId) => {
        repository.calls.push(`email:${eventId}`);
        return {
          currency: "PHP" as const,
          fulfillmentStatusLabel: "Processing",
          items: [
            { amountCentavos: 1999, name: "Frozen Linen Shirt", quantity: 1 },
          ],
          orderNumber: "JRW-2026-ORDER1",
          statusUrl: "/account/orders/JRW-2026-ORDER1",
          toEmail: "nina@example.test",
          totalCentavos: 1999,
        };
      },
      getAdminFulfillmentTransitionSubject: async (input) => {
        repository.calls.push(`subject:${input.orderIdOrNumber}`);
        return {
          checkoutEmail: "nina@example.test",
          currency: "PHP" as const,
          fulfillmentStatus: "ORDER_PLACED",
          items: snapshotItems,
          orderId: "order_1",
          orderNumber: "JRW-2026-ORDER1",
          paymentStatus: "PAYMENT_PAID",
          totalCentavos: 1999,
          updatedAt: "2026-07-08T01:00:00.000Z",
        };
      },
      markFulfillmentStatusEmailSent: async (input) => {
        repository.calls.push(`sent:${input.eventId}:${input.messageId}`);
      },
      transitionAdminOrderFulfillment: async (input) => {
        repository.calls.push(
          `transition:${input.orderId}:${input.expectedFulfillmentStatus}:${input.targetStatus}`
        );
        return {
          decision: "transitioned" as const,
          event: transitionEvent,
          order: {
            ...adminListResult.items[0],
            fulfillment: {
              kind: "fulfillment" as const,
              label: "Processing",
              updatedAt: "2026-07-08T02:00:00.000Z",
              value: "PROCESSING",
            },
            contact: {
              checkoutEmail: "nina@example.test",
              fullName: "Nina Reyes",
              phone: "09171234567",
            },
            items: snapshotItems,
            payment: lanes.payment,
            shippingAddress: {
              barangay: "Poblacion",
              cityProvince: "Makati",
              postalCode: "1200",
              shippingType: "STANDARD",
              streetAddress: "12 Sampaguita Street",
            },
          },
        };
      },
    });
    const auditEvents: unknown[] = [];
    const service = new OrderService({
      auditPublisher: {
        publish: async (event) => void auditEvents.push(event),
      },
      emailNotifier: {
        sendFulfillmentStatusEmail: async () => ({
          ok: true,
          messageId: "email_1",
        }),
      },
      now: () => "2026-07-08T02:00:00.000Z",
      repository,
    });

    const result = await service.updateAdminOrderFulfillment({
      actor: adminActor,
      orderIdOrNumber: "JRW-2026-ORDER1",
      requestId: "req_fulfillment",
      targetStatus: "PROCESSING",
    });

    expect(result).toMatchObject({
      content: {
        email: { status: "SENT" satisfies FulfillmentEmailStatus },
        order: {
          fulfillment: { value: "PROCESSING" },
          payment: { value: "PAYMENT_PAID" },
        },
        transition: {
          newStatus: "PROCESSING",
          oldStatus: "ORDER_PLACED",
        },
      },
    });
    expect(repository.calls).toEqual([
      "subject:JRW-2026-ORDER1",
      "transition:order_1:ORDER_PLACED:PROCESSING",
      "claim-email:fulfillment_event_1",
      "email:fulfillment_event_1",
      "sent:fulfillment_event_1:email_1",
    ]);
    expect(JSON.stringify(auditEvents)).toContain("order.status_changed");
  });

  it("returns conflict for unpaid and stale fulfillment transitions", async () => {
    const unpaidRepository = repositoryStub({
      getAdminFulfillmentTransitionSubject: async () => ({
        checkoutEmail: "nina@example.test",
        currency: "PHP" as const,
        fulfillmentStatus: "ORDER_PLACED",
        items: snapshotItems,
        orderId: "order_1",
        orderNumber: "JRW-2026-ORDER1",
        paymentStatus: "PAYMENT_PENDING",
        totalCentavos: 1999,
        updatedAt: "2026-07-08T01:00:00.000Z",
      }),
    });
    const staleRepository = repositoryStub({
      getAdminFulfillmentTransitionSubject: async () => ({
        checkoutEmail: "nina@example.test",
        currency: "PHP" as const,
        fulfillmentStatus: "ORDER_PLACED",
        items: snapshotItems,
        orderId: "order_1",
        orderNumber: "JRW-2026-ORDER1",
        paymentStatus: "PAYMENT_PAID",
        totalCentavos: 1999,
        updatedAt: "2026-07-08T01:00:00.000Z",
      }),
      transitionAdminOrderFulfillment: async () => ({
        currentFulfillmentStatus: "PROCESSING",
        decision: "stale" as const,
        orderId: "order_1",
      }),
    });

    const unpaid = await new OrderService({
      repository: unpaidRepository,
    }).updateAdminOrderFulfillment({
      actor: adminActor,
      orderIdOrNumber: "order_1",
      requestId: "req_unpaid",
      targetStatus: "PROCESSING",
    });
    const stale = await new OrderService({
      repository: staleRepository,
    }).updateAdminOrderFulfillment({
      actor: adminActor,
      orderIdOrNumber: "order_1",
      requestId: "req_stale",
      targetStatus: "PROCESSING",
    });

    expect(unpaid.error).toMatchObject({
      code: "CONFLICT_STATE",
      data: { reason: "PAYMENT_NOT_PAID" },
    });
    expect(stale.error).toMatchObject({
      code: "CONFLICT_STATE",
      data: { reason: "STALE_FULFILLMENT_STATUS" },
    });
  });

  it("keeps fulfillment success when email or audit fails and marks email failed", async () => {
    const logs: unknown[] = [];
    const repository = repositoryStub({
      claimFulfillmentStatusEmail: async () => true,
      getFulfillmentStatusEmail: async () => ({
        currency: "PHP" as const,
        fulfillmentStatusLabel: "Processing",
        items: [],
        orderNumber: "JRW-2026-ORDER1",
        statusUrl: "/account/orders/JRW-2026-ORDER1",
        toEmail: "nina@example.test",
        totalCentavos: 1999,
      }),
      getAdminFulfillmentTransitionSubject: async () => ({
        checkoutEmail: "nina@example.test",
        currency: "PHP" as const,
        fulfillmentStatus: "ORDER_PLACED",
        items: snapshotItems,
        orderId: "order_1",
        orderNumber: "JRW-2026-ORDER1",
        paymentStatus: "PAYMENT_PAID",
        totalCentavos: 1999,
        updatedAt: "2026-07-08T01:00:00.000Z",
      }),
      markFulfillmentStatusEmailFailed: async (input) => {
        repository.calls.push(`failed:${input.eventId}`);
      },
      transitionAdminOrderFulfillment: async () => ({
        decision: "transitioned" as const,
        event: transitionEvent,
        order: {
          ...adminListResult.items[0],
          contact: {
            checkoutEmail: "nina@example.test",
            fullName: "Nina Reyes",
            phone: "09171234567",
          },
          items: snapshotItems,
          shippingAddress: {
            barangay: "Poblacion",
            cityProvince: "Makati",
            postalCode: "1200",
            shippingType: "STANDARD",
            streetAddress: "12 Sampaguita Street",
          },
        },
      }),
    });

    const result = await new OrderService({
      auditPublisher: {
        publish: async () => {
          throw new Error("audit down");
        },
      },
      emailNotifier: {
        sendFulfillmentStatusEmail: async () => ({ ok: false }),
      },
      operationalLogger: { record: (event) => void logs.push(event) },
      repository,
    }).updateAdminOrderFulfillment({
      actor: adminActor,
      orderIdOrNumber: "order_1",
      requestId: "req_email_failed",
      targetStatus: "PROCESSING",
    });

    expect(result).toMatchObject({
      content: {
        email: { status: "FAILED" },
        transition: { eventId: "fulfillment_event_1" },
      },
    });
    expect(repository.calls).toContain("failed:fulfillment_event_1");
    expect(JSON.stringify(logs)).toContain("fulfillment.email_failed");
  });
});
