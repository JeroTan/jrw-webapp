import { describe, expect, it } from "vitest";
import { createApp } from "@/server/app";
import { InventoryController } from "@/server/controllers/InventoryController";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";
import type { RequestActorContext } from "@/server/context/request-context";
import type { InventoryService } from "@/server/services/InventoryService";
import type { ProductVariantRecord } from "@/domain/products/types";

function createController(service: Partial<InventoryService>) {
  return new InventoryController(service as InventoryService);
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

function variantRecord(
  overrides: Partial<ProductVariantRecord> = {}
): ProductVariantRecord {
  return {
    id: "var_1",
    productId: "prod_1",
    name: "Small / Black",
    sku: "SKU-S-BLK",
    priceCentavos: 1999,
    stock: 10,
    isPreorder: false,
    expectedRelease: null,
    variationChain: [
      { group: "Size", name: "Small" },
      { group: "Color", name: "Black" },
    ],
    status: "ACTIVE",
    hasAvailableStock: true,
    inventoryState: "IN_STOCK",
    stockVersion: 0,
    availability: "Available",
    ...overrides,
  };
}

describe("inventory routes", () => {
  it("documents inventory endpoints with auth metadata and error codes", async () => {
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

    const updateStock =
      body.paths?.["/api/admin/products/{productId}/variants/{variantId}/stock"]?.patch;
    const updateState =
      body.paths?.[
        "/api/admin/products/{productId}/variants/{variantId}/inventory-state"
      ]?.patch;
    const availability =
      body.paths?.["/api/products/{productId}/variants/{variantId}/availability"]?.get;

    expect(updateStock?.summary).toBe("Update variant stock quantity");
    expect(updateStock?.tags).toContain("Products");
    expect(updateStock?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(updateStock?.["x-rate-limit-class"]).toBe("admin-write");
    expect(updateStock?.["x-error-codes"]).toEqual(
      expect.arrayContaining([
        "AUTH_REQUIRED",
        "AUTH_FORBIDDEN",
        "VALIDATION_FAILED",
        "RESOURCE_NOT_FOUND",
        "CONFLICT_STATE",
      ])
    );
    expect(updateStock?.responses).toHaveProperty("200");

    expect(updateState?.summary).toBe("Update variant inventory state");
    expect(updateState?.responses).toHaveProperty("200");

    expect(availability?.summary).toBe("Get variant availability");
    expect(availability?.["x-auth"]).toBeUndefined();
    expect(availability?.["x-rate-limit-class"]).toBe("public-read");
    expect(availability?.responses).toHaveProperty("200");
  });

  it("updates stock with standard success envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        inventory: {
          controllerFactory: () =>
            createController({
              updateStockQuantity: async () =>
                Result.okay({
                  variant: variantRecord({
                    stock: 0,
                    inventoryState: "OUT_OF_STOCK",
                    availability: "Unavailable",
                    hasAvailableStock: false,
                  }),
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/admin/products/prod_1/variants/var_1/stock",
        {
          method: "PATCH",
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "content-type": "application/json",
            "x-request-id": "req_inventory_stock_success",
          },
          body: JSON.stringify({ quantity: 0 }),
        }
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        variant: {
          id: "var_1",
          stock: 0,
          inventoryState: "OUT_OF_STOCK",
        },
      },
      meta: { requestId: "req_inventory_stock_success" },
    });
  });

  it("updates inventory state with standard success envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        inventory: {
          controllerFactory: () =>
            createController({
              updateInventoryState: async () =>
                Result.okay({
                  variant: variantRecord({
                    stock: 4,
                    inventoryState: "LOW_STOCK",
                    availability: "Low Stock",
                    hasAvailableStock: true,
                  }),
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/admin/products/prod_1/variants/var_1/inventory-state",
        {
          method: "PATCH",
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "content-type": "application/json",
            "x-request-id": "req_inventory_state_success",
          },
          body: JSON.stringify({ state: "LOW_STOCK" }),
        }
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        variant: {
          id: "var_1",
          inventoryState: "LOW_STOCK",
        },
      },
      meta: { requestId: "req_inventory_state_success" },
    });
  });

  it("returns public availability without auth", async () => {
    const app = createApp({
      routes: {
        inventory: {
          controllerFactory: () =>
            createController({
              getAvailability: async () =>
                Result.okay({
                  availability: {
                    productId: "prod_1",
                    variantId: "var_1",
                    label: "Available",
                    inStock: true,
                  },
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/products/prod_1/variants/var_1/availability",
        {
          headers: {
            "x-request-id": "req_inventory_public_read",
          },
        }
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        availability: {
          label: "Available",
          inStock: true,
        },
      },
    });
  });

  it("denies non-admin for stock mutation endpoints", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => ({
          ...adminContext,
          role: "CUSTOMER",
          actorId: "customer_1",
          safeActorId: "customer_1",
        }),
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/admin/products/prod_1/variants/var_1/stock",
        {
          method: "PATCH",
          headers: {
            cookie: "jrw_customer_session=customer-token",
            "content-type": "application/json",
            "x-request-id": "req_inventory_non_admin_denied",
          },
          body: JSON.stringify({ quantity: 4 }),
        }
      )
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: {
          requestId: "req_inventory_non_admin_denied",
        },
      },
    });
  });

  it("returns conflict envelope for permission denial", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        inventory: {
          controllerFactory: () =>
            createController({
              updateStockQuantity: async () =>
                Result.error(
                  new GeneralError(
                    { reason: "BRAND_MEMBERSHIP_REQUIRED" },
                    "AUTH_FORBIDDEN"
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/admin/products/prod_1/variants/var_1/stock",
        {
          method: "PATCH",
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "content-type": "application/json",
            "x-request-id": "req_inventory_brand_denied",
          },
          body: JSON.stringify({ quantity: 9 }),
        }
      )
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: {
          requestId: "req_inventory_brand_denied",
          reason: "BRAND_MEMBERSHIP_REQUIRED",
        },
      },
    });
  });

  it("rejects invalid stock payload through route schema", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/admin/products/prod_1/variants/var_1/stock",
        {
          method: "PATCH",
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "content-type": "application/json",
            "x-request-id": "req_inventory_invalid_payload",
          },
          body: JSON.stringify({ quantity: -1 }),
        }
      )
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: {
          requestId: "req_inventory_invalid_payload",
        },
      },
    });
  });
});
