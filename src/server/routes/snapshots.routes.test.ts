import { describe, expect, it } from "vitest";
import { createApp } from "@/server/app";
import { SnapshotController } from "@/server/controllers/SnapshotController";
import type { BuiltOrderSnapshot, OrderSnapshot } from "@/domain/snapshots/types";
import type { RequestActorContext } from "@/server/context/request-context";
import type { SnapshotService } from "@/server/services/SnapshotService";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";

const now = "2026-05-21T12:00:00.000Z";

function createController(service: Partial<SnapshotService>) {
  return new SnapshotController(service as SnapshotService);
}

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

function snapshotRecord(overrides: Partial<OrderSnapshot> = {}): OrderSnapshot {
  return {
    id: "snap_1",
    orderId: "order_1",
    productId: "prod_1",
    productName: "Desk Lamp",
    productSlug: "desk-lamp",
    variantId: "var_1",
    variantLabel: "Small",
    variantOptions: [{ group: "Size", name: "Small" }],
    priceCentavos: 1999,
    quantity: 2,
    imageReference: "products/prod_1/variant.png",
    snapshotTimestamp: now,
    ...overrides,
  };
}

function builtSnapshotRecord(
  overrides: Partial<BuiltOrderSnapshot> = {}
): BuiltOrderSnapshot {
  return {
    productId: "prod_1",
    productName: "Desk Lamp",
    productSlug: "desk-lamp",
    variantId: "var_1",
    variantLabel: "Small",
    variantOptions: [{ group: "Size", name: "Small" }],
    priceCentavos: 1999,
    quantity: 2,
    imageReference: "products/prod_1/variant.png",
    snapshotTimestamp: now,
    ...overrides,
  };
}

describe("snapshots routes", () => {
  it("documents snapshot endpoints with admin auth metadata and error codes", async () => {
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
            tags?: string[];
            "x-auth"?: { mode?: string; roles?: string[] };
            "x-rate-limit-class"?: string;
            "x-error-codes"?: string[];
            responses?: Record<string, unknown>;
          }
        >
      >;
    };

    const build = body.paths?.["/api/admin/snapshots/build"]?.post;
    const read = body.paths?.["/api/admin/snapshots/{snapshotId}"]?.get;
    const byOrder =
      body.paths?.["/api/admin/orders/{orderId}/snapshots"]?.get;

    expect(build?.summary).toBe("Build product snapshot");
    expect(build?.tags).toContain("Snapshots");
    expect(build?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(build?.["x-rate-limit-class"]).toBe("admin-write");
    expect(build?.["x-error-codes"]).toEqual(
      expect.arrayContaining([
        "AUTH_REQUIRED",
        "AUTH_FORBIDDEN",
        "VALIDATION_FAILED",
        "RESOURCE_NOT_FOUND",
        "PROVIDER_UNAVAILABLE",
      ])
    );
    expect(build?.responses).toHaveProperty("200");
    expect(read?.summary).toBe("Read product snapshot");
    expect(read?.responses).toHaveProperty("200");
    expect(byOrder?.summary).toBe("List order snapshots");
    expect(byOrder?.responses).toHaveProperty("200");
  });

  it("builds snapshot with standard success envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        snapshots: {
          controllerFactory: () =>
            createController({
              buildSnapshot: async () =>
                Result.okay({ snapshot: builtSnapshotRecord() }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/snapshots/build", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_snapshot_build",
        },
        body: JSON.stringify({
          productId: "prod_1",
          variantId: "var_1",
          quantity: 2,
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        snapshot: {
          productId: "prod_1",
          variantId: "var_1",
          priceCentavos: 1999,
          imageReference: "products/prod_1/variant.png",
        },
      },
      meta: { requestId: "req_snapshot_build" },
    });
  });

  it("reads stored snapshots by id and order id", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        snapshots: {
          controllerFactory: () =>
            createController({
              getSnapshot: async () =>
                Result.okay({ snapshot: snapshotRecord() }),
              listOrderSnapshots: async () =>
                Result.okay({ items: [snapshotRecord()] }),
            }),
        },
      },
    });

    const read = await app.handle(
      new Request("https://jrw.test/api/admin/snapshots/snap_1", {
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_snapshot_read",
        },
      })
    );
    const byOrder = await app.handle(
      new Request("https://jrw.test/api/admin/orders/order_1/snapshots", {
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_snapshot_by_order",
        },
      })
    );

    expect(read.status).toBe(200);
    await expect(read.json()).resolves.toMatchObject({
      data: { snapshot: { id: "snap_1" } },
      meta: { requestId: "req_snapshot_read" },
    });
    expect(byOrder.status).toBe(200);
    await expect(byOrder.json()).resolves.toMatchObject({
      data: { items: [{ id: "snap_1" }] },
      meta: { requestId: "req_snapshot_by_order" },
    });
  });

  it("returns not found envelope for missing snapshot", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        snapshots: {
          controllerFactory: () =>
            createController({
              getSnapshot: async () =>
                Result.error(
                  new GeneralError(
                    { reason: "SNAPSHOT_NOT_FOUND" },
                    "RESOURCE_NOT_FOUND"
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/snapshots/missing", {
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_snapshot_missing",
        },
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "RESOURCE_NOT_FOUND",
        details: {
          requestId: "req_snapshot_missing",
          reason: "SNAPSHOT_NOT_FOUND",
        },
      },
    });
  });

  it("denies non-admin before controller execution", async () => {
    let controllerCalls = 0;
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => customerContext,
      },
      routes: {
        snapshots: {
          controllerFactory: () => {
            controllerCalls += 1;
            return createController({
              buildSnapshot: async () =>
                Result.okay({ snapshot: builtSnapshotRecord() }),
            });
          },
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/snapshots/build", {
        method: "POST",
        headers: {
          cookie: "jrw_customer_session=customer-token",
          "content-type": "application/json",
          "x-request-id": "req_snapshot_non_admin",
        },
        body: JSON.stringify({
          productId: "prod_1",
          variantId: "var_1",
          quantity: 2,
        }),
      })
    );

    expect(response.status).toBe(403);
    expect(controllerCalls).toBe(0);
  });

  it("rejects invalid snapshot build data", async () => {
    let controllerCalls = 0;
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        snapshots: {
          controllerFactory: () => {
            controllerCalls += 1;
            return createController({});
          },
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/snapshots/build", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_snapshot_invalid",
        },
        body: JSON.stringify({
          productId: "prod_1",
          variantId: "var_1",
          quantity: 0,
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(controllerCalls).toBe(0);
  });
});
