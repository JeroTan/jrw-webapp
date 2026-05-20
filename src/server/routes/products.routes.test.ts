import { describe, expect, it } from "vitest";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";
import { createApp } from "@/server/app";
import { ProductController } from "@/server/controllers/ProductController";
import type { RequestActorContext } from "@/server/context/request-context";
import type { ProductRecord } from "@/domain/products/types";
import { ProductService } from "@/server/services/ProductService";

const now = "2026-05-20T11:00:00.000Z";

function createController(service: Partial<ProductService>) {
  return new ProductController(service as ProductService);
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

function productRecord(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: "prod_1",
    name: "Desk Lamp",
    slug: "desk-lamp",
    summary: "Metal lamp",
    description: "Compact lamp with matte finish.",
    status: "DRAFT",
    brandId: null,
    brandName: null,
    linkedCategoryCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("products routes", () => {
  it("documents product endpoints with auth metadata and error codes", async () => {
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

    const list = body.paths?.["/api/admin/products"]?.get;
    const create = body.paths?.["/api/admin/products"]?.post;
    const detail = body.paths?.["/api/admin/products/{productId}"]?.get;
    const update = body.paths?.["/api/admin/products/{productId}"]?.patch;

    expect(list?.summary).toBe("List products");
    expect(list?.tags).toContain("Products");
    expect(list?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
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

    expect(create?.summary).toBe("Create product");
    expect(create?.["x-rate-limit-class"]).toBe("admin-write");
    expect(create?.responses).toHaveProperty("201");

    expect(detail?.summary).toBe("Get product detail");
    expect(detail?.responses).toHaveProperty("200");

    expect(update?.summary).toBe("Update product identity");
    expect(update?.responses).toHaveProperty("200");
  });

  it("creates product with standard success envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              createProduct: async () =>
                Result.okay({
                  product: productRecord(),
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_create_success",
        },
        body: JSON.stringify({
          name: "Desk Lamp",
          description: "Compact lamp with matte finish.",
        }),
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        product: {
          id: "prod_1",
          slug: "desk-lamp",
          status: "DRAFT",
        },
      },
      meta: { requestId: "req_product_create_success" },
    });
  });

  it("lists products with pagination envelope metadata", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              listProducts: async () =>
                Result.okay({
                  items: [productRecord()],
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
      new Request(
        "https://jrw.test/api/admin/products?page=1&pageSize=20&status=DRAFT&search=lamp",
        {
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "x-request-id": "req_product_list_success",
          },
        }
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        items: [expect.objectContaining({ id: "prod_1" })],
      },
      meta: {
        requestId: "req_product_list_success",
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    });
  });

  it("updates product identity with standard envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              updateProduct: async () =>
                Result.okay({
                  product: productRecord({
                    name: "Desk Lamp v2",
                    slug: "desk-lamp-v2",
                  }),
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1", {
        method: "PATCH",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_update_success",
        },
        body: JSON.stringify({
          name: "Desk Lamp v2",
          slug: "desk-lamp-v2",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        product: {
          name: "Desk Lamp v2",
          slug: "desk-lamp-v2",
        },
      },
      meta: { requestId: "req_product_update_success" },
    });
  });

  it("returns conflict envelope for duplicate slug", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              createProduct: async () =>
                Result.error(
                  new GeneralError(
                    { reason: "DUPLICATE_SLUG" },
                    "CONFLICT_STATE"
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_duplicate_slug",
        },
        body: JSON.stringify({
          name: "Duplicate",
          slug: "desk-lamp",
          description: "Duplicate slug attempt.",
        }),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT_STATE",
        details: {
          requestId: "req_product_duplicate_slug",
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
        products: {
          controllerFactory: () => {
            controllerCalls += 1;
            return createController({
              createProduct: async () =>
                Result.okay({
                  product: productRecord(),
                }),
            });
          },
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products", {
        method: "POST",
        headers: {
          cookie: "jrw_customer_session=customer-token",
          "content-type": "application/json",
          "x-request-id": "req_product_non_admin_denied",
        },
        body: JSON.stringify({
          name: "Denied Product",
          description: "Should not pass.",
        }),
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: {
          requestId: "req_product_non_admin_denied",
        },
      },
    });
    expect(controllerCalls).toBe(0);
  });

  it("returns validation envelope for invalid payload", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_invalid_payload",
        },
        body: JSON.stringify({
          description: "Missing required product name",
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: {
          requestId: "req_product_invalid_payload",
        },
      },
    });
  });
});
