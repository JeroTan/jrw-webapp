import { describe, expect, it } from "vitest";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";
import { createApp } from "@/server/app";
import { CategoryController } from "@/server/controllers/CategoryController";
import type { RequestActorContext } from "@/server/context/request-context";
import type { CategoryRecord } from "@/domain/categories/types";
import type { CategoryService } from "@/server/services/CategoryService";

const now = "2026-05-20T06:30:00.000Z";

function createController(service: Partial<CategoryService>) {
  return new CategoryController(service as CategoryService);
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

function categoryRecord(overrides: Partial<CategoryRecord> = {}): CategoryRecord {
  return {
    id: "cat_1",
    name: "Home Decor",
    slug: "home-decor",
    description: "Lifestyle picks",
    sortOrder: 10,
    isVisible: true,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    linkedProductCount: 2,
    ...overrides,
  };
}

describe("categories routes", () => {
  it("documents category endpoints with auth metadata and error codes", async () => {
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

    const list = body.paths?.["/api/admin/categories"]?.get;
    const create = body.paths?.["/api/admin/categories"]?.post;
    const detail = body.paths?.["/api/admin/categories/{categoryId}"]?.get;
    const update = body.paths?.["/api/admin/categories/{categoryId}"]?.patch;
    const archive = body.paths?.["/api/admin/categories/{categoryId}"]?.delete;

    expect(list?.summary).toBe("List categories");
    expect(list?.tags).toContain("Categories");
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

    expect(create?.summary).toBe("Create category");
    expect(create?.["x-rate-limit-class"]).toBe("admin-write");
    expect(create?.responses).toHaveProperty("201");

    expect(detail?.summary).toBe("Get category detail");
    expect(detail?.responses).toHaveProperty("200");

    expect(update?.summary).toBe("Update category");
    expect(update?.responses).toHaveProperty("200");

    expect(archive?.summary).toBe("Archive category");
    expect(archive?.responses).toHaveProperty("200");
  });

  it("creates category with standard success envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        categories: {
          controllerFactory: () =>
            createController({
              createCategory: async () =>
                Result.okay({
                  category: categoryRecord(),
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/categories", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_category_create_success",
        },
        body: JSON.stringify({
          name: "Home Decor",
          description: "Lifestyle picks",
          sortOrder: 10,
          isVisible: true,
        }),
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        category: {
          id: "cat_1",
          slug: "home-decor",
          status: "ACTIVE",
        },
      },
      meta: { requestId: "req_category_create_success" },
    });
  });

  it("lists categories with pagination envelope metadata", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        categories: {
          controllerFactory: () =>
            createController({
              listCategories: async () =>
                Result.okay({
                  items: [categoryRecord()],
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
        "https://jrw.test/api/admin/categories?page=1&pageSize=20&status=ACTIVE&isVisible=true",
        {
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "x-request-id": "req_category_list_success",
          },
        }
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        items: [expect.objectContaining({ id: "cat_1" })],
      },
      meta: {
        requestId: "req_category_list_success",
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    });
  });

  it("updates and archives categories with standard envelopes", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        categories: {
          controllerFactory: () =>
            createController({
              updateCategory: async () =>
                Result.okay({
                  category: categoryRecord({
                    name: "Updated Home Decor",
                    slug: "updated-home-decor",
                    isVisible: false,
                  }),
                }),
              archiveCategory: async () =>
                Result.okay({
                  category: categoryRecord({
                    status: "ARCHIVED",
                    isVisible: false,
                  }),
                }),
            }),
        },
      },
    });

    const updateResponse = await app.handle(
      new Request("https://jrw.test/api/admin/categories/cat_1", {
        method: "PATCH",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_category_update_success",
        },
        body: JSON.stringify({
          name: "Updated Home Decor",
          slug: "updated-home-decor",
          isVisible: false,
        }),
      })
    );

    expect(updateResponse.status).toBe(200);
    await expect(updateResponse.json()).resolves.toMatchObject({
      data: {
        category: {
          name: "Updated Home Decor",
          slug: "updated-home-decor",
          isVisible: false,
        },
      },
      meta: { requestId: "req_category_update_success" },
    });

    const archiveResponse = await app.handle(
      new Request("https://jrw.test/api/admin/categories/cat_1", {
        method: "DELETE",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_category_archive_success",
        },
      })
    );

    expect(archiveResponse.status).toBe(200);
    await expect(archiveResponse.json()).resolves.toMatchObject({
      data: {
        category: {
          id: "cat_1",
          status: "ARCHIVED",
        },
      },
      meta: { requestId: "req_category_archive_success" },
    });
  });

  it("returns conflict envelope when slug already exists", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        categories: {
          controllerFactory: () =>
            createController({
              createCategory: async () =>
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
      new Request("https://jrw.test/api/admin/categories", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_category_duplicate_slug",
        },
        body: JSON.stringify({
          name: "Duplicate",
          slug: "home-decor",
        }),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT_STATE",
        details: {
          requestId: "req_category_duplicate_slug",
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
        categories: {
          controllerFactory: () => {
            controllerCalls += 1;
            return createController({
              createCategory: async () =>
                Result.okay({
                  category: categoryRecord(),
                }),
            });
          },
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/categories", {
        method: "POST",
        headers: {
          cookie: "jrw_customer_session=customer-token",
          "content-type": "application/json",
          "x-request-id": "req_category_non_admin_denied",
        },
        body: JSON.stringify({
          name: "Denied Category",
        }),
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: {
          requestId: "req_category_non_admin_denied",
        },
      },
    });
    expect(controllerCalls).toBe(0);
  });

  it("returns validation envelope for invalid create payload", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/categories", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_category_invalid_payload",
        },
        body: JSON.stringify({
          description: "Missing required name",
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: {
          requestId: "req_category_invalid_payload",
        },
      },
    });
  });
});
