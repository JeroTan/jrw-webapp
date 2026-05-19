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
  it("documents brand read and write endpoints with auth metadata and error codes", async () => {
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
    const invite = body.paths?.["/api/brands/{id}/invite"]?.post;
    const accept = body.paths?.["/api/brands/{id}/accept"]?.post;
    const join = body.paths?.["/api/brands/{id}/join"]?.post;
    const approve = body.paths?.["/api/brands/{id}/join/{adminId}/approve"]?.post;
    const reject = body.paths?.["/api/brands/{id}/join/{adminId}/reject"]?.post;
    const guardCreate = body.paths?.["/api/brands/{id}/products/guard"]?.post;
    const guardUpdate =
      body.paths?.["/api/brands/{id}/products/{productId}/guard"]?.post;
    const guardReassign =
      body.paths?.["/api/brands/products/{productId}/reassign/guard"]?.post;
    const guardBrandless =
      body.paths?.["/api/brands/products/brandless/guard"]?.post;
    const archive = body.paths?.["/api/brands/{id}/archive"]?.post;
    const listBrandProducts = body.paths?.["/api/brands/{id}/products"]?.get;
    const listBrandless = body.paths?.["/api/brands/products/brandless"]?.get;
    const listMine = body.paths?.["/api/brands/me"]?.get;

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

    expect(invite?.summary).toBe("Invite brand admin");
    expect(invite?.tags).toContain("Brands");
    expect(invite?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(invite?.["x-rate-limit-class"]).toBe("admin-write");
    expect(invite?.["x-error-codes"]).toEqual(
      expect.arrayContaining([
        "AUTH_REQUIRED",
        "AUTH_FORBIDDEN",
        "VALIDATION_FAILED",
        "CONFLICT_STATE",
        "PROVIDER_UNAVAILABLE",
      ])
    );
    expect(invite?.responses).toHaveProperty("409");

    expect(accept?.summary).toBe("Accept brand invitation");
    expect(accept?.tags).toContain("Brands");
    expect(accept?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(accept?.["x-rate-limit-class"]).toBe("admin-write");
    expect(accept?.responses).toHaveProperty("409");

    expect(join?.summary).toBe("Request brand join");
    expect(join?.tags).toContain("Brands");
    expect(join?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(join?.["x-rate-limit-class"]).toBe("admin-write");
    expect(join?.responses).toHaveProperty("409");

    expect(approve?.summary).toBe("Approve brand join request");
    expect(approve?.tags).toContain("Brands");
    expect(approve?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(approve?.["x-rate-limit-class"]).toBe("admin-write");
    expect(approve?.responses).toHaveProperty("409");

    expect(reject?.summary).toBe("Reject brand join request");
    expect(reject?.tags).toContain("Brands");
    expect(reject?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(reject?.["x-rate-limit-class"]).toBe("admin-write");
    expect(reject?.responses).toHaveProperty("409");

    expect(guardCreate?.summary).toBe("Guard brand product create");
    expect(guardCreate?.tags).toContain("Brands");
    expect(guardCreate?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(guardCreate?.["x-rate-limit-class"]).toBe("admin-write");
    expect(guardCreate?.responses).toHaveProperty("200");

    expect(guardUpdate?.summary).toBe("Guard brand product update");
    expect(guardUpdate?.tags).toContain("Brands");
    expect(guardUpdate?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(guardUpdate?.["x-rate-limit-class"]).toBe("admin-write");
    expect(guardUpdate?.responses).toHaveProperty("200");

    expect(guardReassign?.summary).toBe("Guard brand product reassignment");
    expect(guardReassign?.tags).toContain("Brands");
    expect(guardReassign?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(guardReassign?.["x-rate-limit-class"]).toBe("admin-write");
    expect(guardReassign?.responses).toHaveProperty("200");

    expect(guardBrandless?.summary).toBe("Guard brandless product mutation");
    expect(guardBrandless?.tags).toContain("Brands");
    expect(guardBrandless?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(guardBrandless?.["x-rate-limit-class"]).toBe("admin-write");
    expect(guardBrandless?.responses).toHaveProperty("200");

    expect(archive?.summary).toBe("Archive brand");
    expect(archive?.tags).toContain("Brands");
    expect(archive?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(archive?.["x-rate-limit-class"]).toBe("admin-write");
    expect(archive?.responses).toHaveProperty("503");

    expect(listBrandProducts?.summary).toBe("List brand scoped products");
    expect(listBrandProducts?.tags).toContain("Brands");
    expect(listBrandProducts?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(listBrandProducts?.["x-rate-limit-class"]).toBe("admin-read");
    expect(listBrandProducts?.["x-error-codes"]).toEqual(
      expect.arrayContaining([
        "AUTH_REQUIRED",
        "AUTH_FORBIDDEN",
        "ACCOUNT_SUSPENDED",
        "EMAIL_NOT_VERIFIED",
        "ADMIN_APPROVAL_REQUIRED",
        "CONFLICT_STATE",
        "PROVIDER_UNAVAILABLE",
      ])
    );
    expect(listBrandProducts?.responses).toHaveProperty("200");

    expect(listBrandless?.summary).toBe("List brandless products");
    expect(listBrandless?.tags).toContain("Brands");
    expect(listBrandless?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(listBrandless?.["x-rate-limit-class"]).toBe("admin-read");
    expect(listBrandless?.responses).toHaveProperty("200");

    expect(listMine?.summary).toBe("List my brands");
    expect(listMine?.tags).toContain("Brands");
    expect(listMine?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(listMine?.["x-rate-limit-class"]).toBe("admin-read");
    expect(listMine?.responses).toHaveProperty("200");
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
          cookie: "jrw_admin_session=admin-token",
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

  it("denies anonymous invite before controller execution", async () => {
    let controllerCalls = 0;
    const app = createApp({
      routes: {
        brands: {
          controllerFactory: () => {
            controllerCalls += 1;
            return createController({
              inviteAdminToBrand: async () =>
                Result.okay({
                  invitation: {
                    id: "bm_1",
                    brandId: "brand_1",
                    adminId: "admin_2",
                    role: "MEMBER",
                    status: "PENDING",
                    invitedByAdminId: "admin_1",
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
      new Request("https://jrw.test/api/brands/brand_1/invite", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_brand_invite_anonymous",
        },
        body: JSON.stringify({ adminId: "admin_2" }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_REQUIRED",
        details: { requestId: "req_brand_invite_anonymous" },
      },
    });
    expect(controllerCalls).toBe(0);
  });

  it("returns non-member invite denial with request ID envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              inviteAdminToBrand: async () =>
                Result.error(new GeneralError({}, "AUTH_FORBIDDEN")),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1/invite", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_brand_invite_non_member",
        },
        body: JSON.stringify({ adminId: "admin_2" }),
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: { requestId: "req_brand_invite_non_member" },
      },
    });
  });

  it("invites brand admin with safe membership envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              inviteAdminToBrand: async () =>
                Result.okay({
                  invitation: {
                    id: "bm_1",
                    brandId: "brand_1",
                    adminId: "admin_2",
                    role: "MEMBER",
                    status: "PENDING",
                    invitedByAdminId: "admin_1",
                    createdAt: now,
                    updatedAt: now,
                  },
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1/invite", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_brand_invite_success",
        },
        body: JSON.stringify({ adminId: "admin_2" }),
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        invitation: {
          id: "bm_1",
          brandId: "brand_1",
          adminId: "admin_2",
          role: "MEMBER",
          status: "PENDING",
        },
      },
      meta: { requestId: "req_brand_invite_success" },
    });
  });

  it("returns 409 envelope for duplicate invite conflict", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              inviteAdminToBrand: async () =>
                Result.error(
                  new GeneralError(
                    { reason: "DUPLICATE_PENDING_INVITATION" },
                    "CONFLICT_STATE"
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1/invite", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_brand_invite_conflict",
        },
        body: JSON.stringify({ adminId: "admin_2" }),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT_STATE",
        details: {
          requestId: "req_brand_invite_conflict",
        },
      },
    });
  });

  it("denies anonymous accept/join/approve/reject before controller execution", async () => {
    const cases = [
      {
        url: "https://jrw.test/api/brands/brand_1/accept",
        requestId: "req_brand_accept_anonymous",
      },
      {
        url: "https://jrw.test/api/brands/brand_1/join",
        requestId: "req_brand_join_anonymous",
      },
      {
        url: "https://jrw.test/api/brands/brand_1/join/admin_2/approve",
        requestId: "req_brand_approve_anonymous",
      },
      {
        url: "https://jrw.test/api/brands/brand_1/join/admin_2/reject",
        requestId: "req_brand_reject_anonymous",
      },
    ] as const;

    for (const testCase of cases) {
      let controllerCalls = 0;
      const app = createApp({
        routes: {
          brands: {
            controllerFactory: () => {
              controllerCalls += 1;
              return createController({
                requestBrandJoin: async () =>
                  Result.okay({
                    membership: {
                      id: "bm_1",
                      brandId: "brand_1",
                      adminId: "admin_2",
                      role: "MEMBER",
                      status: "PENDING",
                      invitedByAdminId: null,
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
        new Request(testCase.url, {
          method: "POST",
          headers: {
            "x-request-id": testCase.requestId,
          },
        })
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        error: {
          code: "AUTH_REQUIRED",
          details: { requestId: testCase.requestId },
        },
      });
      expect(controllerCalls).toBe(0);
    }
  });

  it("accepts brand invitation with standard success envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              acceptBrandInvitation: async () =>
                Result.okay({
                  membership: {
                    id: "bm_1",
                    brandId: "brand_1",
                    adminId: "admin_1",
                    role: "MEMBER",
                    status: "ACTIVE",
                    invitedByAdminId: "admin_owner",
                    createdAt: now,
                    updatedAt: now,
                  },
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1/accept", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_brand_accept_success",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        membership: {
          id: "bm_1",
          brandId: "brand_1",
          adminId: "admin_1",
          status: "ACTIVE",
        },
      },
      meta: { requestId: "req_brand_accept_success" },
    });
  });

  it("creates brand join request with standard success envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              requestBrandJoin: async () =>
                Result.okay({
                  membership: {
                    id: "bm_2",
                    brandId: "brand_1",
                    adminId: "admin_1",
                    role: "MEMBER",
                    status: "PENDING",
                    invitedByAdminId: null,
                    createdAt: now,
                    updatedAt: now,
                  },
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1/join", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_brand_join_success",
        },
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        membership: {
          id: "bm_2",
          brandId: "brand_1",
          adminId: "admin_1",
          status: "PENDING",
        },
      },
      meta: { requestId: "req_brand_join_success" },
    });
  });

  it("approves brand join request and returns forbidden for unauthorized approver", async () => {
    const successApp = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              approveBrandJoinRequest: async () =>
                Result.okay({
                  membership: {
                    id: "bm_3",
                    brandId: "brand_1",
                    adminId: "admin_2",
                    role: "MEMBER",
                    status: "ACTIVE",
                    invitedByAdminId: null,
                    createdAt: now,
                    updatedAt: now,
                  },
                }),
            }),
        },
      },
    });

    const success = await successApp.handle(
      new Request("https://jrw.test/api/brands/brand_1/join/admin_2/approve", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_brand_approve_success",
        },
      })
    );

    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toMatchObject({
      data: {
        membership: {
          adminId: "admin_2",
          status: "ACTIVE",
        },
      },
      meta: { requestId: "req_brand_approve_success" },
    });

    const forbiddenApp = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              approveBrandJoinRequest: async () =>
                Result.error(new GeneralError({}, "AUTH_FORBIDDEN")),
            }),
        },
      },
    });

    const forbidden = await forbiddenApp.handle(
      new Request("https://jrw.test/api/brands/brand_1/join/admin_2/approve", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_brand_approve_forbidden",
        },
      })
    );

    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: { requestId: "req_brand_approve_forbidden" },
      },
    });
  });

  it("rejects join request with standard success envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              rejectBrandJoinRequest: async () =>
                Result.okay({
                  membership: {
                    id: "bm_4",
                    brandId: "brand_1",
                    adminId: "admin_2",
                    role: "MEMBER",
                    status: "REVOKED",
                    invitedByAdminId: null,
                    createdAt: now,
                    updatedAt: now,
                  },
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1/join/admin_2/reject", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_brand_reject_success",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        membership: {
          adminId: "admin_2",
          status: "REVOKED",
        },
      },
      meta: { requestId: "req_brand_reject_success" },
    });
  });

  it("returns 409 envelope for duplicate join request conflict", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              requestBrandJoin: async () =>
                Result.error(
                  new GeneralError(
                    { reason: "DUPLICATE_PENDING_REQUEST" },
                    "CONFLICT_STATE"
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1/join", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_brand_join_conflict",
        },
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT_STATE",
        details: {
          requestId: "req_brand_join_conflict",
        },
      },
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
          cookie: "jrw_customer_session=customer-token",
        },
        requestContext: customerContext,
        expectedCode: "AUTH_REQUIRED",
        expectedStatus: 401,
      },
    ] as const;

    for (const testCase of cases) {
      let controllerCalls = 0;
      const app = createApp({
        requestContext: {
          resolveActorFromSession: async ({ sessionToken }) =>
            sessionToken ? testCase.requestContext : undefined,
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
          cookie: "jrw_admin_session=admin-token",
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
          cookie: "jrw_admin_session=admin-token",
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

  it("accepts null description in update payload", async () => {
    let receivedBody: Record<string, unknown> | null = null;
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              updateBrand: async (input) => {
                receivedBody = input.body;
                return Result.okay({
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
                });
              },
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1", {
        method: "PATCH",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_brand_update_clear_description",
        },
        body: JSON.stringify({
          description: null,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(receivedBody).toEqual({ description: null });
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
          cookie: "jrw_admin_session=admin-token",
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
          cookie: "jrw_admin_session=admin-token",
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
          cookie: "jrw_admin_session=admin-token",
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

  it("denies anonymous mutation guard routes before controller execution", async () => {
    const cases: Array<{
      url: string;
      requestId: string;
      body?: Record<string, string>;
    }> = [
      {
        url: "https://jrw.test/api/brands/brand_1/products/guard",
        requestId: "req_guard_create_anonymous",
      },
      {
        url: "https://jrw.test/api/brands/brand_1/products/product_1/guard",
        requestId: "req_guard_update_anonymous",
      },
      {
        url: "https://jrw.test/api/brands/products/product_1/reassign/guard",
        requestId: "req_guard_reassign_anonymous",
        body: { targetBrandId: "brand_2" },
      },
      {
        url: "https://jrw.test/api/brands/products/brandless/guard",
        requestId: "req_guard_brandless_anonymous",
      },
    ];

    for (const testCase of cases) {
      let controllerCalls = 0;
      const app = createApp({
        routes: {
          brands: {
            controllerFactory: () => {
              controllerCalls += 1;
              return createController({
                guardBrandProductCreate: async () =>
                  Result.okay({
                    allowed: true,
                    brandless: false,
                    reassignment: false,
                    productId: null,
                    sourceBrandId: null,
                    targetBrandId: "brand_1",
                  }),
              });
            },
          },
        },
      });

      const response = await app.handle(
        new Request(testCase.url, {
          method: "POST",
          headers: {
            "x-request-id": testCase.requestId,
            ...(testCase.body ? { "content-type": "application/json" } : {}),
          },
          ...(testCase.body ? { body: JSON.stringify(testCase.body) } : {}),
        })
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        error: {
          code: "AUTH_REQUIRED",
          details: { requestId: testCase.requestId },
        },
      });
      expect(controllerCalls).toBe(0);
    }
  });

  it("returns success envelopes for mutation guard routes", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              guardBrandProductCreate: async () =>
                Result.okay({
                  allowed: true,
                  brandless: false,
                  reassignment: false,
                  productId: null,
                  sourceBrandId: null,
                  targetBrandId: "brand_1",
                }),
              guardBrandProductUpdate: async () =>
                Result.okay({
                  allowed: true,
                  brandless: false,
                  reassignment: false,
                  productId: "product_1",
                  sourceBrandId: "brand_1",
                  targetBrandId: "brand_1",
                }),
              guardBrandProductReassignment: async () =>
                Result.okay({
                  allowed: true,
                  brandless: false,
                  reassignment: true,
                  productId: "product_1",
                  sourceBrandId: "brand_1",
                  targetBrandId: "brand_2",
                }),
              guardBrandlessProductMutation: async () =>
                Result.okay({
                  allowed: true,
                  brandless: true,
                  reassignment: false,
                  productId: null,
                  sourceBrandId: null,
                  targetBrandId: null,
                }),
            }),
        },
      },
    });

    const createGuard = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1/products/guard", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_guard_create_success",
        },
      })
    );
    expect(createGuard.status).toBe(200);
    await expect(createGuard.json()).resolves.toMatchObject({
      data: {
        allowed: true,
        targetBrandId: "brand_1",
      },
      meta: { requestId: "req_guard_create_success" },
    });

    const updateGuard = await app.handle(
      new Request(
        "https://jrw.test/api/brands/brand_1/products/product_1/guard",
        {
          method: "POST",
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "x-request-id": "req_guard_update_success",
          },
        }
      )
    );
    expect(updateGuard.status).toBe(200);
    await expect(updateGuard.json()).resolves.toMatchObject({
      data: {
        allowed: true,
        productId: "product_1",
      },
      meta: { requestId: "req_guard_update_success" },
    });

    const reassignGuard = await app.handle(
      new Request(
        "https://jrw.test/api/brands/products/product_1/reassign/guard",
        {
          method: "POST",
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "content-type": "application/json",
            "x-request-id": "req_guard_reassign_success",
          },
          body: JSON.stringify({ targetBrandId: "brand_2" }),
        }
      )
    );
    expect(reassignGuard.status).toBe(200);
    await expect(reassignGuard.json()).resolves.toMatchObject({
      data: {
        allowed: true,
        reassignment: true,
        targetBrandId: "brand_2",
      },
      meta: { requestId: "req_guard_reassign_success" },
    });

    const brandlessGuard = await app.handle(
      new Request("https://jrw.test/api/brands/products/brandless/guard", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_guard_brandless_success",
        },
      })
    );
    expect(brandlessGuard.status).toBe(200);
    await expect(brandlessGuard.json()).resolves.toMatchObject({
      data: {
        allowed: true,
        brandless: true,
      },
      meta: { requestId: "req_guard_brandless_success" },
    });
  });

  it("returns request-id envelope for mutation guard failures and validates reassignment payload", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              guardBrandProductCreate: async () =>
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

    const denied = await app.handle(
      new Request("https://jrw.test/api/brands/brand_2/products/guard", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_guard_create_forbidden",
        },
      })
    );
    expect(denied.status).toBe(403);
    await expect(denied.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: {
          requestId: "req_guard_create_forbidden",
        },
      },
    });

    const invalidPayload = await app.handle(
      new Request("https://jrw.test/api/brands/products/product_1/reassign/guard", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_guard_reassign_invalid_body",
        },
        body: JSON.stringify({}),
      })
    );
    expect(invalidPayload.status).toBe(400);
    await expect(invalidPayload.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: {
          requestId: "req_guard_reassign_invalid_body",
        },
      },
    });
  });

  it("denies anonymous brand-scope list before controller execution", async () => {
    let controllerCalls = 0;
    const app = createApp({
      routes: {
        brands: {
          controllerFactory: () => {
            controllerCalls += 1;
            return createController({
              listBrandScopedProducts: async () =>
                Result.okay({
                  items: [],
                  page: 1,
                  pageSize: 20,
                  totalItems: 0,
                  totalPages: 0,
                }),
            });
          },
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/brands/brand_1/products", {
        method: "GET",
        headers: {
          "x-request-id": "req_brand_products_anonymous",
        },
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_REQUIRED",
        details: { requestId: "req_brand_products_anonymous" },
      },
    });
    expect(controllerCalls).toBe(0);
  });

  it("lists brand-scoped products with request-id envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              listBrandScopedProducts: async () =>
                Result.okay({
                  items: [
                    {
                      id: "product_1",
                      name: "Scoped Product 1",
                      description: "scoped",
                      brandId: "brand_1",
                      createdAt: now,
                      updatedAt: now,
                    },
                  ],
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
        "https://jrw.test/api/brands/brand_1/products?page=1&pageSize=20",
        {
          method: "GET",
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "x-request-id": "req_brand_products_success",
          },
        }
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        items: [expect.objectContaining({ brandId: "brand_1" })],
      },
      meta: {
        requestId: "req_brand_products_success",
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    });
  });

  it("lists brandless products and my brands with stable envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              listBrandlessProducts: async () =>
                Result.okay({
                  items: [
                    {
                      id: "product_2",
                      name: "Brandless Product 1",
                      description: "brandless",
                      brandId: null,
                      createdAt: now,
                      updatedAt: now,
                    },
                  ],
                  page: 1,
                  pageSize: 20,
                  totalItems: 1,
                  totalPages: 1,
                }),
              listAdminBrands: async () =>
                Result.okay({
                  items: [
                    {
                      id: "brand_1",
                      name: "JRW Lifestyle",
                      slug: "jrw-lifestyle",
                      description: "Catalog team",
                      status: "ACTIVE",
                      archivedAt: null,
                      createdAt: now,
                      updatedAt: now,
                    },
                  ],
                  page: 1,
                  pageSize: 20,
                  totalItems: 1,
                  totalPages: 1,
                }),
            }),
        },
      },
    });

    const brandlessResponse = await app.handle(
      new Request("https://jrw.test/api/brands/products/brandless", {
        method: "GET",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_brandless_success",
        },
      })
    );
    expect(brandlessResponse.status).toBe(200);
    await expect(brandlessResponse.json()).resolves.toMatchObject({
      data: {
        items: [expect.objectContaining({ brandId: null })],
      },
      meta: { requestId: "req_brandless_success" },
    });

    const mineResponse = await app.handle(
      new Request("https://jrw.test/api/brands/me", {
        method: "GET",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_my_brands_success",
        },
      })
    );
    expect(mineResponse.status).toBe(200);
    await expect(mineResponse.json()).resolves.toMatchObject({
      data: {
        items: [expect.objectContaining({ id: "brand_1" })],
      },
      meta: { requestId: "req_my_brands_success" },
    });
  });

  it("returns forbidden envelope for non-member scoped list", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        brands: {
          controllerFactory: () =>
            createController({
              listBrandScopedProducts: async () =>
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
      new Request("https://jrw.test/api/brands/brand_2/products", {
        method: "GET",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_brand_products_forbidden",
        },
      })
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: {
          requestId: "req_brand_products_forbidden",
        },
      },
    });
  });
});
