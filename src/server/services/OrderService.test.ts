import { describe, expect, it } from "vitest";
import type { RefundStatus } from "@/domain/orders/refund-transitions";
import type { ReturnStatus } from "@/domain/orders/return-transitions";
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
    getAdminReturnTransitionSubject: async (input) => {
      calls.push(`return-subject:${input.orderIdOrNumber}`);
      return null;
    },
    getAdminRefundTransitionSubject: async (input) => {
      calls.push(`refund-subject:${input.orderIdOrNumber}`);
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
            snapshotId: "snapshot_1",
            unitPriceCentavos: 1999,
            variantLabel: "Size: Small",
            variantOptions: [{ group: "Size", name: "Small" }],
          },
        ],
        refundHistory: [],
        returnHistory: [],
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
    recordAdminOrderRefund: async () => ({ decision: "missing-order" }),
    recordAdminOrderReturn: async () => ({ decision: "missing-order" }),
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
            items: snapshotItems.map((item) => ({
              ...item,
              snapshotId: "snapshot_1",
            })),
            refundHistory: [],
            returnHistory: [],
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
          items: snapshotItems.map((item) => ({
            ...item,
            snapshotId: "snapshot_1",
          })),
          refundHistory: [],
          returnHistory: [],
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

  it("records Admin returns, keeps payment and fulfillment lanes unchanged, and publishes safe audit", async () => {
    const repository = repositoryStub({
      getAdminReturnTransitionSubject: async (input) => {
        repository.calls.push(`return-subject:${input.orderIdOrNumber}`);
        return {
          currency: "PHP" as const,
          currentReturnStatus: null,
          currentReturnUpdatedAt: null,
          fulfillmentStatus: "DELIVERED",
          items: [
            {
              ...snapshotItems[0],
              snapshotId: "snapshot_1",
            },
          ],
          orderId: "order_1",
          orderNumber: "JRW-2026-ORDER1",
          paymentStatus: "PAYMENT_PAID",
          totalCentavos: 1999,
          updatedAt: "2026-07-08T01:00:00.000Z",
        };
      },
      recordAdminOrderReturn: async (input) => {
        repository.calls.push(
          `record-return:${input.orderId}:${input.targetType}:${input.orderSnapshotId}:${input.targetStatus}`
        );
        return {
          decision: "recorded" as const,
          order: {
            ...adminListResult.items[0],
            fulfillment: {
              kind: "fulfillment" as const,
              label: "Delivered",
              updatedAt: "2026-07-08T01:00:00.000Z",
              value: "DELIVERED",
            },
            return: {
              kind: "return" as const,
              label: "Return requested",
              updatedAt: "2026-07-08T04:00:00.000Z",
              value: "RETURN_REQUESTED",
            },
            contact: {
              checkoutEmail: "nina@example.test",
              fullName: "Nina Reyes",
              phone: "09171234567",
            },
            items: [{ ...snapshotItems[0], snapshotId: "snapshot_1" }],
            refundHistory: [],
            returnHistory: [],
            shippingAddress: {
              barangay: "Poblacion",
              cityProvince: "Makati",
              postalCode: "1200",
              shippingType: "STANDARD",
              streetAddress: "12 Sampaguita Street",
            },
          },
          returnRecord: {
            actorId: "admin_1",
            amountCentavos: 500,
            createdAt: "2026-07-08T04:00:00.000Z",
            currency: "PHP" as const,
            id: "return_1",
            notes: "Inspected.",
            orderId: "order_1",
            orderSnapshotId: "snapshot_1",
            previousStatus: null,
            reason: "Wrong size",
            referenceId: "RET-1",
            requestId: "req_return",
            status: "RETURN_REQUESTED" as ReturnStatus,
            statusLabel: "Return requested",
            targetLabel: "Frozen Linen Shirt - Size: Small",
            targetType: "ITEM" as const,
            updatedAt: "2026-07-08T04:00:00.000Z",
          },
        };
      },
    });
    const auditEvents: unknown[] = [];
    const service = new OrderService({
      auditPublisher: {
        publish: async (event) => void auditEvents.push(event),
      },
      now: () => "2026-07-08T04:00:00.000Z",
      repository,
    });

    const result = await service.recordAdminOrderReturn({
      actor: adminActor,
      amountCentavos: 500,
      notes: "Inspected.",
      orderIdOrNumber: "JRW-2026-ORDER1",
      orderSnapshotId: "snapshot_1",
      reason: "Wrong size",
      referenceId: "RET-1",
      requestId: "req_return",
      targetStatus: "RETURN_REQUESTED",
      targetType: "ITEM",
    });

    expect(result).toMatchObject({
      content: {
        allowedNextStatuses: [
          "RETURN_APPROVED",
          "RETURN_REJECTED",
          "RETURN_CANCELLED",
        ],
        order: {
          fulfillment: { value: "DELIVERED" },
          payment: { value: "PAYMENT_PAID" },
          return: { value: "RETURN_REQUESTED" },
        },
        returnRecord: {
          reason: "Wrong size",
          status: "RETURN_REQUESTED",
          targetType: "ITEM",
        },
      },
    });
    expect(repository.calls).toEqual([
      "return-subject:JRW-2026-ORDER1",
      "record-return:order_1:ITEM:snapshot_1:RETURN_REQUESTED",
    ]);
    expect(JSON.stringify(auditEvents)).toContain(
      "refund-return.return_recorded"
    );
    expect(JSON.stringify(auditEvents)).not.toMatch(/Inspected|RET-1/);
  });

  it("records a return request for a remaining item when another item already has a return", async () => {
    const repository = repositoryStub({
      getAdminReturnTransitionSubject: async (input) => {
        repository.calls.push(`return-subject:${input.orderIdOrNumber}`);
        return {
          currency: "PHP" as const,
          currentReturnStatus: "RETURN_REQUESTED" as ReturnStatus,
          currentReturnUpdatedAt: "2026-07-08T03:00:00.000Z",
          fulfillmentStatus: "DELIVERED",
          items: [
            {
              ...snapshotItems[0],
              snapshotId: "snapshot_1",
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
          orderId: "order_1",
          orderNumber: "JRW-2026-ORDER1",
          paymentStatus: "PAYMENT_PAID",
          returnHistory: [
            {
              actorId: "admin_1",
              amountCentavos: null,
              createdAt: "2026-07-08T03:00:00.000Z",
              currency: "PHP" as const,
              id: "return_1",
              notes: null,
              orderId: "order_1",
              orderSnapshotId: "snapshot_1",
              previousStatus: null,
              reason: "Wrong item",
              referenceId: null,
              requestId: "req_return_1",
              status: "RETURN_REQUESTED" as ReturnStatus,
              statusLabel: "Return requested",
              targetLabel: "Frozen Linen Shirt - Size: Small",
              targetType: "ITEM" as const,
              updatedAt: "2026-07-08T03:00:00.000Z",
            },
          ],
          totalCentavos: 41999,
          updatedAt: "2026-07-08T03:00:00.000Z",
        };
      },
      recordAdminOrderReturn: async (input) => {
        repository.calls.push(
          `record-return:${input.orderSnapshotId}:${input.expectedReturnStatus ?? "null"}`
        );
        return {
          decision: "recorded" as const,
          order: {
            ...adminListResult.items[0],
            fulfillment: {
              kind: "fulfillment" as const,
              label: "Delivered",
              updatedAt: "2026-07-08T01:00:00.000Z",
              value: "DELIVERED",
            },
            return: {
              kind: "return" as const,
              label: "Return requested",
              updatedAt: "2026-07-08T04:00:00.000Z",
              value: "RETURN_REQUESTED",
            },
            contact: {
              checkoutEmail: "nina@example.test",
              fullName: "Nina Reyes",
              phone: "09171234567",
            },
            items: [
              { ...snapshotItems[0], snapshotId: "snapshot_1" },
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
            refundHistory: [],
            returnHistory: [],
            shippingAddress: {
              barangay: "Poblacion",
              cityProvince: "Makati",
              postalCode: "1200",
              shippingType: "STANDARD",
              streetAddress: "12 Sampaguita Street",
            },
          },
          returnRecord: {
            actorId: "admin_1",
            amountCentavos: null,
            createdAt: "2026-07-08T04:00:00.000Z",
            currency: "PHP" as const,
            id: "return_2",
            notes: null,
            orderId: "order_1",
            orderSnapshotId: "snapshot_2",
            previousStatus: null,
            reason: "Second item issue",
            referenceId: null,
            requestId: "req_return_2",
            status: "RETURN_REQUESTED" as ReturnStatus,
            statusLabel: "Return requested",
            targetLabel: "T-shirt 300 GSM - SM",
            targetType: "ITEM" as const,
            updatedAt: "2026-07-08T04:00:00.000Z",
          },
        };
      },
    });
    const service = new OrderService({ repository });

    const result = await service.recordAdminOrderReturn({
      actor: adminActor,
      orderIdOrNumber: "JRW-2026-ORDER1",
      orderSnapshotId: "snapshot_2",
      reason: "Second item issue",
      requestId: "req_return_2",
      targetStatus: "RETURN_REQUESTED",
      targetType: "ITEM",
    });

    expect(result.error).toBeNull();
    expect(result.content?.returnRecord).toMatchObject({
      orderSnapshotId: "snapshot_2",
      previousStatus: null,
      status: "RETURN_REQUESTED",
    });
    expect(repository.calls).toEqual([
      "return-subject:JRW-2026-ORDER1",
      "record-return:snapshot_2:null",
    ]);
  });

  it("records Admin refunds, keeps other lanes unchanged, and publishes safe audit", async () => {
    const repository = repositoryStub({
      getAdminRefundTransitionSubject: async (input) => {
        repository.calls.push(`refund-subject:${input.orderIdOrNumber}`);
        return {
          currency: "PHP" as const,
          currentRefundStatus: null,
          currentRefundUpdatedAt: null,
          fulfillmentStatus: "CANCELLED",
          items: [
            {
              ...snapshotItems[0],
              lineTotalCentavos: 1999,
              snapshotId: "snapshot_1",
            },
          ],
          orderId: "order_1",
          orderNumber: "JRW-2026-ORDER1",
          paymentStatus: "PAYMENT_PAID",
          refundHistory: [],
          returnHistory: [],
          totalCentavos: 1999,
          updatedAt: "2026-07-08T01:00:00.000Z",
        };
      },
      recordAdminOrderRefund: async (input) => {
        repository.calls.push(
          `record-refund:${input.orderId}:${input.targetType}:${input.orderSnapshotId}:${input.targetStatus}:${input.amountCentavos}`
        );
        return {
          decision: "recorded" as const,
          order: {
            ...adminListResult.items[0],
            fulfillment: {
              kind: "fulfillment" as const,
              label: "Cancelled",
              updatedAt: "2026-07-08T01:00:00.000Z",
              value: "CANCELLED",
            },
            refund: {
              kind: "refund" as const,
              label: "Refund pending",
              updatedAt: "2026-07-08T04:00:00.000Z",
              value: "REFUND_PENDING",
            },
            contact: {
              checkoutEmail: "nina@example.test",
              fullName: "Nina Reyes",
              phone: "09171234567",
            },
            items: [{ ...snapshotItems[0], snapshotId: "snapshot_1" }],
            refundHistory: [],
            returnHistory: [],
            shippingAddress: {
              barangay: "Poblacion",
              cityProvince: "Makati",
              postalCode: "1200",
              shippingType: "STANDARD",
              streetAddress: "12 Sampaguita Street",
            },
          },
          refundRecord: {
            actorId: "admin_1",
            amountCentavos: 1999,
            createdAt: "2026-07-08T04:00:00.000Z",
            currency: "PHP" as const,
            id: "refund_1",
            notes: "Manual refund reviewed.",
            orderId: "order_1",
            orderSnapshotId: "snapshot_1",
            previousStatus: null,
            reason: "Paid cancellation",
            referenceId: "RF-1",
            status: "REFUND_PENDING" as RefundStatus,
            statusLabel: "Refund pending",
            targetLabel: "Frozen Linen Shirt - Size: Small",
            targetType: "ITEM" as const,
            updatedAt: "2026-07-08T04:00:00.000Z",
          },
        };
      },
    });
    const auditEvents: unknown[] = [];
    const service = new OrderService({
      auditPublisher: {
        publish: async (event) => void auditEvents.push(event),
      },
      now: () => "2026-07-08T04:00:00.000Z",
      repository,
    });

    const result = await service.recordAdminOrderRefund({
      actor: adminActor,
      amountCentavos: 1999,
      notes: "Manual refund reviewed.",
      orderIdOrNumber: "JRW-2026-ORDER1",
      orderSnapshotId: "snapshot_1",
      reason: "Paid cancellation",
      referenceId: "RF-1",
      requestId: "req_refund",
      targetStatus: "REFUND_PENDING",
      targetType: "ITEM",
    });

    expect(result).toMatchObject({
      content: {
        allowedNextStatuses: [
          "REFUND_APPROVED",
          "REFUND_DECLINED",
          "REFUND_FAILED",
        ],
        order: {
          fulfillment: { value: "CANCELLED" },
          payment: { value: "PAYMENT_PAID" },
          refund: { value: "REFUND_PENDING" },
        },
        refundRecord: {
          amountCentavos: 1999,
          reason: "Paid cancellation",
          status: "REFUND_PENDING",
          targetType: "ITEM",
        },
      },
    });
    expect(repository.calls).toEqual([
      "refund-subject:JRW-2026-ORDER1",
      "record-refund:order_1:ITEM:snapshot_1:REFUND_PENDING:1999",
    ]);
    expect(JSON.stringify(auditEvents)).toContain(
      "refund-return.refund_recorded"
    );
    expect(JSON.stringify(auditEvents)).not.toMatch(/Manual refund|RF-1/);
  });

  it("validates refund body, paid gate, amount caps, sent reference, aliases, and stale transitions", async () => {
    const subject = {
      currency: "PHP" as const,
      currentRefundStatus: null,
      currentRefundUpdatedAt: null,
      fulfillmentStatus: "CANCELLED",
      items: [{ ...snapshotItems[0], snapshotId: "snapshot_1" }],
      orderId: "order_1",
      orderNumber: "JRW-2026-ORDER1",
      paymentStatus: "PAYMENT_PAID",
      refundHistory: [],
      returnHistory: [],
      totalCentavos: 1999,
      updatedAt: "2026-07-08T01:00:00.000Z",
    };
    const unpaid = await new OrderService({
      repository: repositoryStub({
        getAdminRefundTransitionSubject: async () => ({
          ...subject,
          paymentStatus: "PAYMENT_PENDING",
        }),
      }),
    }).recordAdminOrderRefund({
      actor: adminActor,
      amountCentavos: 1999,
      orderIdOrNumber: "order_1",
      reason: "Paid cancellation",
      requestId: "req_unpaid_refund",
      targetStatus: "REFUND_PENDING",
      targetType: "ORDER",
    });
    const overCap = await new OrderService({
      repository: repositoryStub({
        getAdminRefundTransitionSubject: async () => subject,
      }),
    }).recordAdminOrderRefund({
      actor: adminActor,
      amountCentavos: 2000,
      orderIdOrNumber: "order_1",
      reason: "Too high",
      requestId: "req_overcap_refund",
      targetStatus: "REFUND_PENDING",
      targetType: "ORDER",
    });
    const missingReference = await new OrderService({
      repository: repositoryStub({
        getAdminRefundTransitionSubject: async () => ({
          ...subject,
          currentRefundStatus: "REFUND_APPROVED" as RefundStatus,
          refundHistory: [
            {
              actorId: "admin_1",
              amountCentavos: 1999,
              createdAt: "2026-07-08T03:00:00.000Z",
              currency: "PHP" as const,
              id: "refund_1",
              notes: null,
              orderId: "order_1",
              orderSnapshotId: null,
              previousStatus: null,
              reason: "Approved",
              referenceId: null,
              status: "REFUND_APPROVED" as RefundStatus,
              statusLabel: "Refund approved",
              targetLabel: "Entire order",
              targetType: "ORDER" as const,
              updatedAt: "2026-07-08T03:00:00.000Z",
            },
          ],
        }),
      }),
    }).recordAdminOrderRefund({
      actor: adminActor,
      amountCentavos: 1999,
      orderIdOrNumber: "order_1",
      reason: "Sent",
      requestId: "req_sent_missing_reference",
      targetStatus: "REFUND_SENT",
      targetType: "ORDER",
    });
    const alias = await new OrderService({
      repository: repositoryStub(),
    }).recordAdminOrderRefund({
      actor: adminActor,
      amountCentavos: 1999,
      orderIdOrNumber: "order_1",
      reason: "Alias",
      requestId: "req_alias_refund",
      targetStatus: "REFUND_REQUESTED",
      targetType: "ORDER",
    });
    const stale = await new OrderService({
      repository: repositoryStub({
        getAdminRefundTransitionSubject: async () => subject,
        recordAdminOrderRefund: async () => ({
          currentRefundStatus: "REFUND_APPROVED" as RefundStatus,
          decision: "stale" as const,
          orderId: "order_1",
          reason: "STALE_REFUND_STATUS" as const,
        }),
      }),
    }).recordAdminOrderRefund({
      actor: adminActor,
      amountCentavos: 1999,
      orderIdOrNumber: "order_1",
      reason: "Pending",
      requestId: "req_stale_refund",
      targetStatus: "REFUND_PENDING",
      targetType: "ORDER",
    });
    const invalid = await new OrderService({
      repository: repositoryStub(),
    }).recordAdminOrderRefund({
      actor: adminActor,
      amountCentavos: 0,
      orderIdOrNumber: " ",
      reason: " ",
      requestId: "req_invalid_refund",
      targetStatus: "REFUND_NOT_REQUESTED",
      targetType: "ITEM",
    });

    expect(unpaid.error).toMatchObject({
      code: "CONFLICT_STATE",
      data: { reason: "PAYMENT_NOT_PAID" },
    });
    expect(overCap.error).toMatchObject({
      code: "CONFLICT_STATE",
      data: { maxAmountCentavos: 1999, reason: "AMOUNT_EXCEEDS_TARGET" },
    });
    expect(missingReference.error).toMatchObject({
      code: "CONFLICT_STATE",
      data: { reason: "MISSING_REFUND_REFERENCE" },
    });
    expect(alias.error).toMatchObject({
      code: "VALIDATION_FAILED",
      data: { reason: "LEGACY_REFUND_STATUS_ALIAS" },
    });
    expect(stale.error).toMatchObject({
      code: "CONFLICT_STATE",
      data: { reason: "STALE_REFUND_STATUS" },
    });
    expect(invalid.error).toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  it.each([
    [{ authenticated: false, role: "PROSPECT" }, "AUTH_REQUIRED"],
    [customerActor, "AUTH_FORBIDDEN"],
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
  ])("denies invalid Admin return actor %j", async (actor, expectedCode) => {
    const repository = repositoryStub();
    const service = new OrderService({ repository });

    const result = await service.recordAdminOrderReturn({
      actor,
      orderIdOrNumber: "order_1",
      reason: "Wrong size",
      requestId: "req_return_denied",
      targetStatus: "RETURN_REQUESTED",
      targetType: "ORDER",
    });

    expect(result.error?.code).toBe(expectedCode);
    expect(repository.calls).toEqual([]);
  });

  it("validates return body, paid/delivered gates, stale transitions, and audit failure safety", async () => {
    const subject = {
      currency: "PHP" as const,
      currentReturnStatus: null,
      currentReturnUpdatedAt: null,
      fulfillmentStatus: "SHIPPED",
      items: [{ ...snapshotItems[0], snapshotId: "snapshot_1" }],
      orderId: "order_1",
      orderNumber: "JRW-2026-ORDER1",
      paymentStatus: "PAYMENT_PAID",
      totalCentavos: 1999,
      updatedAt: "2026-07-08T01:00:00.000Z",
    };
    const unpaid = await new OrderService({
      repository: repositoryStub({
        getAdminReturnTransitionSubject: async () => ({
          ...subject,
          fulfillmentStatus: "DELIVERED",
          paymentStatus: "PAYMENT_PENDING",
        }),
      }),
    }).recordAdminOrderReturn({
      actor: adminActor,
      orderIdOrNumber: "order_1",
      reason: "Wrong size",
      requestId: "req_unpaid_return",
      targetStatus: "RETURN_REQUESTED",
      targetType: "ORDER",
    });
    const notDelivered = await new OrderService({
      repository: repositoryStub({
        getAdminReturnTransitionSubject: async () => subject,
      }),
    }).recordAdminOrderReturn({
      actor: adminActor,
      orderIdOrNumber: "order_1",
      reason: "Wrong size",
      requestId: "req_not_delivered_return",
      targetStatus: "RETURN_REQUESTED",
      targetType: "ORDER",
    });
    const stale = await new OrderService({
      repository: repositoryStub({
        getAdminReturnTransitionSubject: async () => ({
          ...subject,
          currentReturnStatus: "RETURN_REQUESTED" as ReturnStatus,
          fulfillmentStatus: "DELIVERED",
          returnHistory: [
            {
              actorId: "admin_1",
              amountCentavos: null,
              createdAt: "2026-07-08T03:00:00.000Z",
              currency: "PHP" as const,
              id: "return_1",
              notes: null,
              orderId: "order_1",
              orderSnapshotId: null,
              previousStatus: null,
              reason: "Wrong size",
              referenceId: null,
              requestId: "req_return_1",
              status: "RETURN_REQUESTED" as ReturnStatus,
              statusLabel: "Return requested",
              targetLabel: "Entire order",
              targetType: "ORDER" as const,
              updatedAt: "2026-07-08T03:00:00.000Z",
            },
          ],
        }),
        recordAdminOrderReturn: async () => ({
          currentReturnStatus: "RETURN_APPROVED" as ReturnStatus,
          decision: "stale" as const,
          orderId: "order_1",
          reason: "STALE_RETURN_STATUS" as const,
        }),
      }),
    }).recordAdminOrderReturn({
      actor: adminActor,
      orderIdOrNumber: "order_1",
      reason: "Approved",
      requestId: "req_stale_return",
      targetStatus: "RETURN_APPROVED",
      targetType: "ORDER",
    });
    const invalid = await new OrderService({
      repository: repositoryStub(),
    }).recordAdminOrderReturn({
      actor: adminActor,
      amountCentavos: -1,
      orderIdOrNumber: " ",
      reason: " ",
      requestId: "req_invalid_return",
      targetStatus: "RETURN_NOT_REQUESTED",
      targetType: "ITEM",
    });

    expect(unpaid.error).toMatchObject({
      code: "CONFLICT_STATE",
      data: { reason: "PAYMENT_NOT_PAID" },
    });
    expect(notDelivered.error).toMatchObject({
      code: "CONFLICT_STATE",
      data: { reason: "FULFILLMENT_NOT_DELIVERED" },
    });
    expect(stale.error).toMatchObject({
      code: "CONFLICT_STATE",
      data: { reason: "STALE_RETURN_STATUS" },
    });
    expect(invalid.error).toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });
});
