import { describe, expect, it } from "vitest";
import { createApp } from "@/server/app";
import type { RequestActorContext } from "@/server/context/request-context";
import { OrderController } from "@/server/controllers/OrderController";
import type { OrderServiceLike } from "@/server/controllers/OrderController";
import { Result } from "@/utils/general/result";

const customerContext = {
  authenticated: true,
  role: "CUSTOMER",
  actorId: "customer_1",
  safeActorId: "customer_1",
  accountStatus: {
    status: "ACTIVE" as const,
    emailVerified: true,
    approved: true,
  },
  eligibility: {
    active: true,
    emailVerified: true,
    approved: true,
  },
} satisfies RequestActorContext;

const adminContext = {
  authenticated: true,
  role: "ADMIN",
  actorId: "admin_1",
  safeActorId: "admin_1",
  accountStatus: {
    status: "ACTIVE" as const,
    emailVerified: true,
    approved: true,
  },
  eligibility: {
    active: true,
    emailVerified: true,
    approved: true,
  },
} satisfies RequestActorContext;

const ownerContext = {
  authenticated: true,
  role: "SUPER_ADMIN",
  actorId: "owner_1",
  safeActorId: "owner_1",
  accountStatus: {
    status: "ACTIVE" as const,
    emailVerified: true,
    approved: true,
  },
  eligibility: {
    active: true,
    emailVerified: true,
    approved: true,
  },
} satisfies RequestActorContext;

function orderListData() {
  return {
    items: [
      {
        createdAt: "2026-07-08T01:00:00.000Z",
        currency: "PHP" as const,
        fulfillment: {
          kind: "fulfillment" as const,
          label: "Order placed",
          updatedAt: "2026-07-08T01:00:00.000Z",
          value: "ORDER_PLACED",
        },
        itemCount: 1,
        orderId: "order_1",
        orderNumber: "JRW-2026-ORDER1",
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
        subtotalCentavos: 3998,
        totalCentavos: 3998,
        totalQuantity: 2,
        updatedAt: "2026-07-08T01:00:00.000Z",
      },
    ],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  };
}

function adminOrderListData() {
  return {
    items: [
      {
        ...orderListData().items[0],
        checkoutEmailMasked: "n***@example.test",
        customerKind: "CUSTOMER" as const,
        customerLabel: "Nina R.",
      },
    ],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  };
}

function createController(service: Partial<OrderServiceLike>): OrderController {
  return new OrderController(service as OrderServiceLike);
}

describe("order routes", () => {
  it("documents Customer order endpoints with OpenAPI metadata", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("https://jrw.test/api/openapi/json")
    );
    const body = (await response.json()) as {
      paths?: Record<
        string,
        Record<
          string,
          {
            summary?: string;
            description?: string;
            tags?: string[];
            "x-auth"?: { mode?: string; roles?: string[] };
            "x-rate-limit-class"?: string;
            "x-error-codes"?: string[];
          }
        >
      >;
    };

    const list = body.paths?.["/api/customer/orders"]?.get;
    const detail = body.paths?.["/api/customer/orders/{orderId}"]?.get;

    expect(list?.summary).toBe("List current customer orders");
    expect(list?.tags).toContain("Orders");
    expect(list?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["CUSTOMER"],
    });
    expect(list?.["x-rate-limit-class"]).toBe("public-read");
    expect(list?.["x-error-codes"]).toEqual(
      expect.arrayContaining(["AUTH_REQUIRED", "RESOURCE_NOT_FOUND"])
    );
    expect(list?.description).toContain("orders.customer_id");
    expect(list?.description).not.toMatch(/\?email=/i);
    expect(detail?.summary).toBe("Get current customer order detail");
    expect(detail?.description).toContain("snapshot");
    expect(detail?.description).toContain("not found");
  });

  it("documents Admin order endpoints with OpenAPI metadata", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("https://jrw.test/api/openapi/json")
    );
    const body = (await response.json()) as {
      paths?: Record<
        string,
        Record<
          string,
          {
            description?: string;
            parameters?: unknown[];
            summary?: string;
            tags?: string[];
            "x-auth"?: { mode?: string; roles?: string[] };
            "x-error-codes"?: string[];
            "x-rate-limit-class"?: string;
          }
        >
      >;
    };

    const list = body.paths?.["/api/admin/orders"]?.get;
    const detail = body.paths?.["/api/admin/orders/{orderId}"]?.get;

    expect(list?.summary).toBe("List Admin orders");
    expect(list?.tags).toContain("Orders");
    expect(list?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN"],
    });
    expect(list?.["x-rate-limit-class"]).toBe("admin-read");
    expect(list?.["x-error-codes"]).toEqual(
      expect.arrayContaining([
        "AUTH_REQUIRED",
        "AUTH_FORBIDDEN",
        "ADMIN_APPROVAL_REQUIRED",
        "PROVIDER_UNAVAILABLE",
      ])
    );
    expect(list?.description).toContain("created_at then id");
    expect(detail?.summary).toBe("Get Admin order detail");
    expect(detail?.description).toContain("order_snapshots");
    expect(detail?.description).toContain("excluding provider payloads");
  });

  it("returns signed-in customer order list/detail envelopes", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => customerContext,
      },
      routes: {
        orders: {
          controllerFactory: () =>
            createController({
              getCustomerOrderDetail: async () =>
                Result.okay({
                  ...orderListData().items[0],
                  items: [
                    {
                      imageR2Key: null,
                      lineTotalCentavos: 3998,
                      productName: "Frozen Linen Shirt",
                      productSlug: "frozen-linen-shirt",
                      quantity: 2,
                      unitPriceCentavos: 1999,
                      variantLabel: "Size: Small",
                      variantOptions: [{ group: "Size", name: "Small" }],
                    },
                  ],
                }),
              listCustomerOrders: async () => Result.okay(orderListData()),
            }),
        },
      },
    });

    const listResponse = await app.handle(
      new Request("https://jrw.test/api/customer/orders?page=1&pageSize=20", {
        headers: {
          cookie: "jrw_customer_session=test-session",
          "x-request-id": "req_orders_list",
        },
      })
    );
    const detailResponse = await app.handle(
      new Request("https://jrw.test/api/customer/orders/JRW-2026-ORDER1", {
        headers: {
          cookie: "jrw_customer_session=test-session",
          "x-request-id": "req_orders_detail",
        },
      })
    );
    const listBody = await listResponse.json();
    const detailBody = await detailResponse.json();

    expect(listResponse.status).toBe(200);
    expect(detailResponse.status).toBe(200);
    expect(listBody).toMatchObject({
      data: { items: [{ orderNumber: "JRW-2026-ORDER1" }] },
      meta: { requestId: "req_orders_list" },
    });
    expect(detailBody).toMatchObject({
      data: { items: [{ productName: "Frozen Linen Shirt" }] },
      meta: { requestId: "req_orders_detail" },
    });
    expect(JSON.stringify(detailBody)).not.toMatch(
      /checkout_url|providerCheckoutSession|PayMongo payload|nina@example|0917|street|token|secret|signature|card/i
    );
  });

  it("denies anonymous and Admin contexts before controller execution", async () => {
    const cases = [
      {
        expectedCode: "AUTH_REQUIRED",
        headers: { "x-request-id": "req_orders_anon" },
        requestContext: undefined,
      },
      {
        expectedCode: "AUTH_REQUIRED",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_orders_admin",
        },
        requestContext: adminContext,
      },
      {
        expectedCode: "AUTH_REQUIRED",
        headers: {
          cookie: "jrw_admin_session=owner-token",
          "x-request-id": "req_orders_owner",
        },
        requestContext: ownerContext,
      },
    ] as const;

    for (const testCase of cases) {
      let controllerFactoryCalls = 0;
      const app = createApp({
        requestContext: {
          resolveActorFromSession: async ({ sessionToken }) =>
            sessionToken ? testCase.requestContext : undefined,
        },
        routes: {
          orders: {
            controllerFactory: () => {
              controllerFactoryCalls += 1;
              return createController({
                listCustomerOrders: async () => Result.okay(orderListData()),
              });
            },
          },
        },
      });

      const response = await app.handle(
        new Request("https://jrw.test/api/customer/orders", {
          headers: testCase.headers,
        })
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: testCase.expectedCode },
      });
      expect(controllerFactoryCalls).toBe(0);
    }
  });

  it("rejects raw email lookup and unsupported query fields", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => customerContext,
      },
      routes: {
        orders: {
          controllerFactory: () =>
            createController({
              listCustomerOrders: async () => Result.okay(orderListData()),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/customer/orders?email=buyer@example.test",
        {
          headers: {
            cookie: "jrw_customer_session=test-session",
            "x-request-id": "req_orders_email_lookup",
          },
        }
      )
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_FAILED" },
    });
  });

  it("returns signed-in Admin order list/detail envelopes without provider internals", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        orders: {
          controllerFactory: () =>
            createController({
              getAdminOrderDetail: async () =>
                Result.okay({
                  ...adminOrderListData().items[0],
                  contact: {
                    checkoutEmail: "nina@example.test",
                    fullName: "Nina Reyes",
                    phone: "09171234567",
                  },
                  items: [
                    {
                      imageR2Key: null,
                      lineTotalCentavos: 3998,
                      productName: "Frozen Linen Shirt",
                      productSlug: "frozen-linen-shirt",
                      quantity: 2,
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
                }),
              listAdminOrders: async () => Result.okay(adminOrderListData()),
            }),
        },
      },
    });

    const listResponse = await app.handle(
      new Request(
        "https://jrw.test/api/admin/orders?page=1&pageSize=20&search=JRW",
        {
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "x-request-id": "req_admin_orders_list",
          },
        }
      )
    );
    const detailResponse = await app.handle(
      new Request("https://jrw.test/api/admin/orders/JRW-2026-ORDER1", {
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_admin_orders_detail",
        },
      })
    );
    const listBody = await listResponse.json();
    const detailBody = await detailResponse.json();

    expect(listResponse.status).toBe(200);
    expect(detailResponse.status).toBe(200);
    expect(listBody).toMatchObject({
      data: {
        items: [
          {
            checkoutEmailMasked: "n***@example.test",
            customerLabel: "Nina R.",
            orderNumber: "JRW-2026-ORDER1",
          },
        ],
      },
      meta: { requestId: "req_admin_orders_list" },
    });
    expect(detailBody).toMatchObject({
      data: {
        contact: { checkoutEmail: "nina@example.test" },
        items: [{ productName: "Frozen Linen Shirt" }],
        shippingAddress: { streetAddress: "12 Sampaguita Street" },
      },
      meta: { requestId: "req_admin_orders_detail" },
    });
    expect(JSON.stringify(listBody)).not.toMatch(
      /nina@example|0917|Sampaguita|checkout_url|provider|payment_1|reservation|request_id|message_id|token|secret|signature|card/i
    );
    expect(JSON.stringify(detailBody)).not.toMatch(
      /checkout_url|provider|payment_1|reservation_id|request_id|message_id|token|secret|signature|card/i
    );
  });

  it("denies anonymous, Customer, Prospect, and Super Admin before Admin controller execution", async () => {
    const prospectContext = {
      authenticated: true,
      role: "PROSPECT",
      actorId: "prospect_1",
      safeActorId: "prospect_1",
      accountStatus: {
        status: "ACTIVE" as const,
        emailVerified: true,
        approved: true,
      },
      eligibility: {
        active: true,
        emailVerified: true,
        approved: true,
      },
    } satisfies RequestActorContext;
    const cases = [
      {
        expectedCode: "AUTH_REQUIRED",
        expectedStatus: 401,
        headers: { "x-request-id": "req_admin_orders_anon" },
        requestContext: undefined,
      },
      {
        expectedCode: "AUTH_FORBIDDEN",
        expectedStatus: 403,
        headers: {
          cookie: "jrw_admin_session=customer-token",
          "x-request-id": "req_admin_orders_customer",
        },
        requestContext: customerContext,
      },
      {
        expectedCode: "AUTH_FORBIDDEN",
        expectedStatus: 403,
        headers: {
          cookie: "jrw_admin_session=prospect-token",
          "x-request-id": "req_admin_orders_prospect",
        },
        requestContext: prospectContext,
      },
      {
        expectedCode: "AUTH_FORBIDDEN",
        expectedStatus: 403,
        headers: {
          cookie: "jrw_admin_session=owner-token",
          "x-request-id": "req_admin_orders_owner",
        },
        requestContext: ownerContext,
      },
    ] as const;

    for (const testCase of cases) {
      let controllerFactoryCalls = 0;
      const app = createApp({
        requestContext: {
          resolveActorFromSession: async ({ sessionToken }) =>
            sessionToken ? testCase.requestContext : undefined,
        },
        routes: {
          orders: {
            controllerFactory: () => {
              controllerFactoryCalls += 1;
              return createController({
                listAdminOrders: async () => Result.okay(adminOrderListData()),
              });
            },
          },
        },
      });

      const response = await app.handle(
        new Request("https://jrw.test/api/admin/orders", {
          headers: testCase.headers,
        })
      );

      expect(response.status).toBe(testCase.expectedStatus);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: testCase.expectedCode },
      });
      expect(controllerFactoryCalls).toBe(0);
    }
  });

  it("rejects unsupported Admin order query fields", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        orders: {
          controllerFactory: () =>
            createController({
              listAdminOrders: async () => Result.okay(adminOrderListData()),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/orders?returnStatus=OPEN", {
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_admin_orders_invalid_query",
        },
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_FAILED" },
    });
  });
});
