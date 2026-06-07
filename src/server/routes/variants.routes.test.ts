import { describe, expect, it } from "vitest";
import { createApp } from "@/server/app";
import { VariantController } from "@/server/controllers/VariantController";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";
import type { ProductVariantRecord } from "@/domain/products/types";
import type { RequestActorContext } from "@/server/context/request-context";
import type { VariantService } from "@/server/services/VariantService";

function createController(service: Partial<VariantService>) {
  return new VariantController(service as VariantService);
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

function variantRecord(
  overrides: Partial<ProductVariantRecord> = {}
): ProductVariantRecord {
  return {
    id: "var_1",
    productId: "prod_1",
    name: "Small / Black",
    sku: "SKU-S-BLK",
    priceCentavos: 1999,
    isPreorder: false,
    expectedRelease: null,
    variationChain: [
      { group: "Size", name: "Small" },
      { group: "Color", name: "Black" },
    ],
    status: "ACTIVE",
    hasAvailableStock: true,
    stock: 10,
    inventoryState: "IN_STOCK",
    stockVersion: 0,
    availability: "Available",
    ...overrides,
  };
}

describe("variants routes", () => {
  it("documents variant endpoints with auth metadata and error codes", async () => {
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

    const list = body.paths?.["/api/admin/products/{productId}/variants"]?.get;
    const create =
      body.paths?.["/api/admin/products/{productId}/variants"]?.post;
    const detail =
      body.paths?.["/api/admin/products/{productId}/variants/{variantId}"]?.get;
    const update =
      body.paths?.["/api/admin/products/{productId}/variants/{variantId}"]
        ?.patch;
    const archive =
      body.paths?.[
        "/api/admin/products/{productId}/variants/{variantId}/archive"
      ]?.post;

    expect(list?.summary).toBe("List product variants");
    expect(list?.tags).toContain("Products");
    expect(list?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN"],
    });
    expect(list?.["x-rate-limit-class"]).toBe("admin-read");
    expect(list?.["x-error-codes"]).toEqual(
      expect.arrayContaining([
        "AUTH_REQUIRED",
        "AUTH_FORBIDDEN",
        "VALIDATION_FAILED",
        "RESOURCE_NOT_FOUND",
        "CONFLICT_STATE",
        "PROVIDER_UNAVAILABLE",
      ])
    );
    expect(list?.responses).toHaveProperty("200");

    expect(create?.summary).toBe("Create product variant");
    expect(create?.["x-rate-limit-class"]).toBe("admin-write");
    expect(create?.responses).toHaveProperty("201");

    expect(detail?.summary).toBe("Get product variant");
    expect(detail?.responses).toHaveProperty("200");

    expect(update?.summary).toBe("Update product variant");
    expect(update?.responses).toHaveProperty("200");

    expect(archive?.summary).toBe("Archive product variant");
    expect(archive?.responses).toHaveProperty("200");
  });

  it("lists variants with standard success envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        variants: {
          controllerFactory: () =>
            createController({
              listProductVariants: async () =>
                Result.okay({
                  items: [variantRecord()],
                  page: 1,
                  pageSize: 20,
                  totalItems: 1,
                  totalPages: 1,
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/variants", {
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_variant_list_success",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        items: [
          {
            id: "var_1",
            sku: "SKU-S-BLK",
          },
        ],
      },
      meta: {
        requestId: "req_variant_list_success",
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    });
  });

  it("creates, updates, and archives variants with stable envelopes", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        variants: {
          controllerFactory: () =>
            createController({
              createVariant: async () =>
                Result.okay({
                  variant: variantRecord({ id: "var_new", sku: "SKU-NEW" }),
                }),
              updateVariant: async () =>
                Result.okay({
                  variant: variantRecord({
                    id: "var_1",
                    priceCentavos: 2599,
                  }),
                }),
              archiveVariant: async () =>
                Result.okay({
                  variant: variantRecord({
                    id: "var_1",
                    status: "ARCHIVED",
                    hasAvailableStock: false,
                  }),
                }),
            }),
        },
      },
    });

    const created = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/variants", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_variant_create_success",
        },
        body: JSON.stringify({
          name: "Small / Black",
          sku: "SKU-NEW",
          priceCentavos: 1999,
          variationChain: [{ group: "Size", name: "Small" }],
        }),
      })
    );

    expect(created.status).toBe(201);
    await expect(created.json()).resolves.toMatchObject({
      data: {
        variant: {
          id: "var_new",
          sku: "SKU-NEW",
        },
      },
      meta: { requestId: "req_variant_create_success" },
    });

    const updated = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/variants/var_1", {
        method: "PATCH",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_variant_update_success",
        },
        body: JSON.stringify({
          priceCentavos: 2599,
        }),
      })
    );

    expect(updated.status).toBe(200);
    await expect(updated.json()).resolves.toMatchObject({
      data: {
        variant: {
          id: "var_1",
          priceCentavos: 2599,
        },
      },
      meta: { requestId: "req_variant_update_success" },
    });

    const archived = await app.handle(
      new Request(
        "https://jrw.test/api/admin/products/prod_1/variants/var_1/archive",
        {
          method: "POST",
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "content-type": "application/json",
            "x-request-id": "req_variant_archive_success",
          },
          body: JSON.stringify({}),
        }
      )
    );

    expect(archived.status).toBe(200);
    await expect(archived.json()).resolves.toMatchObject({
      data: {
        variant: {
          id: "var_1",
          status: "ARCHIVED",
        },
      },
      meta: { requestId: "req_variant_archive_success" },
    });
  });

  it("returns conflict envelope for duplicate option combination", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        variants: {
          controllerFactory: () =>
            createController({
              createVariant: async () =>
                Result.error(
                  new GeneralError(
                    { reason: "DUPLICATE_OPTION_COMBINATION" },
                    "CONFLICT_STATE"
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/variants", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_variant_duplicate_combo",
        },
        body: JSON.stringify({
          name: "Duplicate",
          sku: "SKU-DUP",
          priceCentavos: 1999,
          variationChain: [{ group: "Size", name: "Small" }],
        }),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT_STATE",
        details: {
          requestId: "req_variant_duplicate_combo",
          reason: "DUPLICATE_OPTION_COMBINATION",
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
        variants: {
          controllerFactory: () => {
            controllerCalls += 1;
            return createController({
              listProductVariants: async () =>
                Result.okay({
                  items: [variantRecord()],
                  page: 1,
                  pageSize: 20,
                  totalItems: 1,
                  totalPages: 1,
                }),
            });
          },
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/variants", {
        headers: {
          cookie: "jrw_customer_session=customer-token",
          "x-request-id": "req_variant_non_admin_denied",
        },
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: {
          requestId: "req_variant_non_admin_denied",
        },
      },
    });
    expect(controllerCalls).toBe(0);
  });
});
