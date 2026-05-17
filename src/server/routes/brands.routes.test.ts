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
  it("documents POST /api/brands with auth metadata and error codes", async () => {
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
});
