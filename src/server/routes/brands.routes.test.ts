import { describe, expect, it } from "vitest";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";
import { createApp } from "@/server/app";
import { BrandController } from "@/server/controllers/BrandController";
import type { RequestActorContext } from "@/server/context/request-context";
import type { BrandService } from "@/server/services/BrandService";

const now = "2026-05-17T21:45:00.000Z";

function createController(service: Partial<BrandService>) {
  return new BrandController(service as BrandService);
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

describe("brands routes", () => {
  it("documents brand write endpoints with auth metadata and error codes", async () => {
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
            tags?: string[];
            summary?: string;
            "x-auth"?: { mode?: string; roles?: string[] };
            "x-rate-limit-class"?: string;
            "x-error-codes"?: string[];
            responses?: Record<string, unknown>;
          }
        >
      >;
    };

    const post = body.paths?.["/api/brands"]?.post;
    const patch = body.paths?.["/api/brands/{id}"]?.patch;
    const archive = body.paths?.["/api/brands/{id}/archive"]?.post;

    expect(post?.summary).toBe("Create brand");
    expect(post?.tags).toContain("Brands");
    expect(post?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(post?.["x-rate-limit-class"]).toBe("admin-write");
    expect(post?.["x-error-codes"]).toEqual(
      expect.arrayContaining([
        "AUTH_REQUIRED",
        "AUTH_FORBIDDEN",
        "VALIDATION_FAILED",
        "CONFLICT_STATE",
        "PROVIDER_UNAVAILABLE",
      ])
    );
    expect(post?.responses).toHaveProperty("503");

    expect(patch?.summary).toBe("Update brand");
    expect(patch?.tags).toContain("Brands");
    expect(patch?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(patch?.["x-rate-limit-class"]).toBe("admin-write");
    expect(patch?.responses).toHaveProperty("409");

    expect(archive?.summary).toBe("Archive brand");
    expect(archive?.tags).toContain("Brands");
    expect(archive?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(archive?.["x-rate-limit-class"]).toBe("admin-write");
    expect(archive?.responses).toHaveProperty("503");
  });

  it("creates brand for admin actor with standard success envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              createBrand: async () =>
                Result.okay({
                  brand: {
                    id: "brand_1",
                    name: "JRW Lifestyle",
                    slug: "jrw-lifestyle",
                    description: "Catalog team",
                    status: "ACTIVE",
                    archivedAt: null,
                    createdAt: now,
                    updatedAt: now,
                  },
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands", {
        method: "POST",
        headers: {
          cookie: "jrw_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_brand_create_success",
        },
        body: JSON.stringify({
          name: "JRW Lifestyle",
          description: "Catalog team",
        }),
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        brand: {
          id: "brand_1",
          slug: "jrw-lifestyle",
          status: "ACTIVE",
        },
      },
      meta: { requestId: "req_brand_create_success" },
    });
  });

  it("denies anonymous and customer before controller execution", async () => {
    const cases = [
      {
        name: "anonymous",
        headers: { "x-request-id": "req_brand_anonymous" },
        requestContext: undefined,
        expectedCode: "AUTH_REQUIRED",
        expectedStatus: 401,
      },
      {
        name: "customer",
        headers: {
          "x-request-id": "req_brand_customer",
          cookie: "jrw_session=customer-token",
        },
        requestContext: customerContext,
        expectedCode: "AUTH_FORBIDDEN",
        expectedStatus: 403,
      },
    ] as const;

    for (const testCase of cases) {
      let controllerCalls = 0;
      const app = createApp({
        requestContext: {
          resolveActorFromSession: async () => testCase.requestContext,
        },
        routes: {
          brands: {
            controllerFactory: () => {
              controllerCalls += 1;
              return createController({
                createBrand: async () =>
                  Result.okay({
                    brand: {
                      id: "brand_1",
                      name: "JRW Lifestyle",
                      slug: "jrw-lifestyle",
                      description: null,
                      status: "ACTIVE",
                      archivedAt: null,
                      createdAt: now,
                      updatedAt: now,
                    },
                  }),
              });
            },
          },
        },
      });

      const response = await app.handle(
        new Request(`https://jrw.test/api/brands?case=${testCase.name}`, {
          method: "POST",
          headers: {
            ...testCase.headers,
            "content-type": "application/json",
          },
          body: JSON.stringify({ name: "JRW Lifestyle" }),
        })
      );

      expect(response.status).toBe(testCase.expectedStatus);
      await expect(response.json()).resolves.toMatchObject({
        error: {
          code: testCase.expectedCode,
          details: { requestId: testCase.headers["x-request-id"] },
        },
      });
      expect(controllerCalls).toBe(0);
    }
  });

  it("returns request ID in error envelope for service failures", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              createBrand: async () =>
                Result.error(
                  new GeneralError(
                    { reason: "DUPLICATE_NAME" },
                    "CONFLICT_STATE"
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands", {
        method: "POST",
        headers: {
          cookie: "jrw_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_brand_conflict",
        },
        body: JSON.stringify({ name: "JRW Lifestyle" }),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT_STATE",
        details: {
          requestId: "req_brand_conflict",
        },
      },
    });
  });

  it("updates brand for admin actor with standard success envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              updateBrand: async () =>
                Result.okay({
                  brand: {
                    id: "brand_1",
                    name: "JRW Lifestyle Updated",
                    slug: "jrw-lifestyle-updated",
                    description: "Updated catalog group",
                    status: "ACTIVE",
                    archivedAt: null,
                    createdAt: now,
                    updatedAt: now,
                  },
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1", {
        method: "PATCH",
        headers: {
          cookie: "jrw_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_brand_update_success",
        },
        body: JSON.stringify({
          description: "Updated catalog group",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        brand: {
          id: "brand_1",
          slug: "jrw-lifestyle-updated",
          status: "ACTIVE",
        },
      },
      meta: { requestId: "req_brand_update_success" },
    });
  });

  it("denies anonymous update before controller execution", async () => {
    let controllerCalls = 0;
    const app = createApp({
      routes: {
        brands: {
          controllerFactory: () => {
            controllerCalls += 1;
            return createController({
              updateBrand: async () =>
                Result.okay({
                  brand: {
                    id: "brand_1",
                    name: "JRW Lifestyle Updated",
                    slug: "jrw-lifestyle-updated",
                    description: null,
                    status: "ACTIVE",
                    archivedAt: null,
                    createdAt: now,
                    updatedAt: now,
                  },
                }),
            });
          },
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_brand_update_anonymous",
        },
        body: JSON.stringify({ description: "Denied" }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_REQUIRED",
        details: { requestId: "req_brand_update_anonymous" },
      },
    });
    expect(controllerCalls).toBe(0);
  });

  it("returns request ID in update error envelope for service denial", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              updateBrand: async () =>
                Result.error(new GeneralError({}, "AUTH_FORBIDDEN")),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1", {
        method: "PATCH",
        headers: {
          cookie: "jrw_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_brand_update_forbidden",
        },
        body: JSON.stringify({ description: "Denied" }),
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: {
          requestId: "req_brand_update_forbidden",
        },
      },
    });
  });

  it("archives brand for admin actor with standard success envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              archiveBrand: async () =>
                Result.okay({
                  brand: {
                    id: "brand_1",
                    name: "JRW Lifestyle",
                    slug: "jrw-lifestyle",
                    description: "Catalog team",
                    status: "ARCHIVED",
                    archivedAt: now,
                    createdAt: now,
                    updatedAt: now,
                  },
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1/archive", {
        method: "POST",
        headers: {
          cookie: "jrw_session=admin-token",
          "x-request-id": "req_brand_archive_success",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        brand: {
          id: "brand_1",
          status: "ARCHIVED",
        },
      },
      meta: { requestId: "req_brand_archive_success" },
    });
  });

  it("returns request ID in archive error envelope for service denial", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              archiveBrand: async () =>
                Result.error(
                  new GeneralError(
                    { reason: "ALREADY_ARCHIVED" },
                    "CONFLICT_STATE"
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1/archive", {
        method: "POST",
        headers: {
          cookie: "jrw_session=admin-token",
          "x-request-id": "req_brand_archive_conflict",
        },
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT_STATE",
        details: {
          requestId: "req_brand_archive_conflict",
        },
      },
    });
  });
});
