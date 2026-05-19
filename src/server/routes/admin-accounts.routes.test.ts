import { describe, expect, it } from "vitest";
import type { AccountEmailNotifier } from "@/domain/notifications/account-emails";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";
import { createApp } from "@/server/app";
import { AdminAccountController } from "@/server/controllers/AdminAccountController";
import type { RequestActorContext } from "@/server/context/request-context";
import type {
  AdminAccountRecord,
  AdminAccountRepository,
} from "@/server/repositories/AdminAccountRepository";
import type {
  AdminAccountDto,
} from "@/server/services/AdminAccountService";
import { AdminAccountService } from "@/server/services/AdminAccountService";

function adminDto(overrides: Partial<AdminAccountDto> = {}): AdminAccountDto {
  return {
    id: "admin_1",
    email: "ops@example.test",
    role: "ADMIN",
    status: "ACTIVE",
    isOwner: false,
    emailVerified: true,
    approved: true,
    dashboardEligible: true,
    suspensionReason: null,
    rejectionReason: null,
    createdAt: "2026-05-16T12:33:19.000Z",
    updatedAt: "2026-05-16T12:33:19.000Z",
    ...overrides,
  };
}

function createController(
  service: Partial<AdminAccountService>
): AdminAccountController {
  return new AdminAccountController(service as AdminAccountService);
}

function deniedStatus(code: string): number {
  return code === "AUTH_REQUIRED" ? 401 : 403;
}

const sqliteTimestamp = "2026-05-16 12:33:19";
const publicTimestamp = "2026-05-16T12:33:19.000Z";

const noopEmails = {
  sendVerificationEmail: async () => ({ ok: true }),
  sendPasswordResetEmail: async () => ({ ok: true }),
  sendAdminInvitationEmail: async () => ({ ok: true }),
  sendAdminApprovalEmail: async () => ({ ok: true }),
  sendAdminRejectionEmail: async () => ({ ok: true }),
  sendBrandInvitationEmail: async () => ({ ok: true }),
} satisfies AccountEmailNotifier;

function readonlyAdminRepository(
  records: AdminAccountRecord[]
): AdminAccountRepository {
  return {
    listAdminAccounts: async () => records,
    findAdminAccountById: async (adminAccountId) =>
      records.find((record) => record.id === adminAccountId) ?? null,
    findAdminAccountByEmail: async (email) =>
      records.find(
        (record) => record.email.toLowerCase() === email.toLowerCase()
      ) ?? null,
    createAdminAccount: async () => {
      throw new Error("Unexpected createAdminAccount call.");
    },
    updateAdminAccount: async () => {
      throw new Error("Unexpected updateAdminAccount call.");
    },
    approveAdminAccount: async () => {
      throw new Error("Unexpected approveAdminAccount call.");
    },
    rejectAdminAccount: async () => {
      throw new Error("Unexpected rejectAdminAccount call.");
    },
    suspendAdminAccount: async () => {
      throw new Error("Unexpected suspendAdminAccount call.");
    },
    reactivateAdminAccount: async () => {
      throw new Error("Unexpected reactivateAdminAccount call.");
    },
  };
}

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

const prospectContext = {
  authenticated: true,
  role: "PROSPECT",
  actorId: "prospect_1",
  safeActorId: "prospect_1",
  eligibility: {
    active: true,
    emailVerified: true,
    approved: true,
  },
} satisfies RequestActorContext;

describe("admin account routes", () => {
  it("documents Admin account endpoints with auth, schemas, errors, and rate-limit metadata", async () => {
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
          }
        >
      >;
    };

    const list = body.paths?.["/api/admin-accounts"]?.get;
    const create = body.paths?.["/api/admin-accounts"]?.post;
    const detail = body.paths?.["/api/admin-accounts/{adminAccountId}"]?.get;
    const update = body.paths?.["/api/admin-accounts/{adminAccountId}"]?.patch;
    const approvals =
      body.paths?.["/api/admin-accounts/{adminAccountId}/approvals"]?.post;
    const suspensions =
      body.paths?.["/api/admin-accounts/{adminAccountId}/suspensions"]?.post;
    const reactivations =
      body.paths?.["/api/admin-accounts/{adminAccountId}/suspensions"]?.delete;

    for (const operation of [
      list,
      create,
      detail,
      update,
      approvals,
      suspensions,
      reactivations,
    ]) {
      expect(operation?.tags).toContain("Admin Accounts");
      expect(operation?.["x-auth"]).toEqual({
        mode: "required",
        roles: ["SUPER_ADMIN"],
      });
      expect(operation?.["x-rate-limit-class"]).toBe("admin-write");
      expect(operation?.["x-error-codes"]).toEqual(
        expect.arrayContaining([
          "AUTH_REQUIRED",
          "AUTH_FORBIDDEN",
          "ACCOUNT_SUSPENDED",
          "EMAIL_NOT_VERIFIED",
          "ADMIN_APPROVAL_REQUIRED",
        ])
      );
    }
    expect(create?.summary).toBe("Create Admin account");
    expect(approvals?.["x-error-codes"]).toEqual(
      expect.arrayContaining(["CONFLICT_STATE", "PROVIDER_UNAVAILABLE"])
    );
  });

  it("creates, lists, updates, suspends, and reactivates Admin accounts through controller boundary", async () => {
    const calls: string[] = [];
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => ownerContext,
      },
      routes: {
        adminAccounts: {
          controllerFactory: () =>
            createController({
              createAdminAccount: async () => {
                calls.push("create");
                return Result.okay({
                  admin: adminDto(),
                  invitationEmail: { sent: true },
                });
              },
              listAdminAccounts: async () => {
                calls.push("list");
                return Result.okay({ admins: [adminDto()] });
              },
              updateAdminAccount: async () => {
                calls.push("update");
                return Result.okay({
                  admin: adminDto({ email: "newops@example.test" }),
                });
              },
              suspendAdminAccount: async () => {
                calls.push("suspend");
                return Result.okay({
                  admin: adminDto({
                    status: "SUSPENDED",
                    dashboardEligible: false,
                    suspensionReason: "Policy review",
                  }),
                });
              },
              reactivateAdminAccount: async () => {
                calls.push("reactivate");
                return Result.okay({ admin: adminDto() });
              },
            }),
        },
      },
    });

    const baseHeaders = {
      cookie: "jrw_admin_session=owner-token",
      "content-type": "application/json",
    };
    const createResponse = await app.handle(
      new Request("https://jrw.test/api/admin-accounts", {
        method: "POST",
        headers: { ...baseHeaders, "x-request-id": "req_create" },
        body: JSON.stringify({
          email: "ops@example.test",
          password: "correct horse battery staple",
          sendInvitationEmail: true,
        }),
      })
    );
    const listResponse = await app.handle(
      new Request("https://jrw.test/api/admin-accounts", {
        headers: {
          cookie: "jrw_admin_session=owner-token",
          "x-request-id": "req_list",
        },
      })
    );
    const patchResponse = await app.handle(
      new Request("https://jrw.test/api/admin-accounts/admin_1", {
        method: "PATCH",
        headers: { ...baseHeaders, "x-request-id": "req_patch" },
        body: JSON.stringify({ email: "newops@example.test" }),
      })
    );
    const suspendResponse = await app.handle(
      new Request("https://jrw.test/api/admin-accounts/admin_1/suspensions", {
        method: "POST",
        headers: { ...baseHeaders, "x-request-id": "req_suspend" },
        body: JSON.stringify({ reason: "Policy review" }),
      })
    );
    const reactivateResponse = await app.handle(
      new Request("https://jrw.test/api/admin-accounts/admin_1/suspensions", {
        method: "DELETE",
        headers: {
          cookie: "jrw_admin_session=owner-token",
          "x-request-id": "req_reactivate",
        },
      })
    );

    expect(createResponse.status).toBe(201);
    await expect(createResponse.json()).resolves.toMatchObject({
      data: {
        admin: { id: "admin_1", role: "ADMIN" },
        invitationEmail: { sent: true },
      },
      meta: { requestId: "req_create" },
    });
    await expect(listResponse.json()).resolves.toMatchObject({
      data: { admins: [{ email: "ops@example.test" }] },
      meta: { requestId: "req_list" },
    });
    await expect(patchResponse.json()).resolves.toMatchObject({
      data: { admin: { email: "newops@example.test" } },
      meta: { requestId: "req_patch" },
    });
    await expect(suspendResponse.json()).resolves.toMatchObject({
      data: { admin: { status: "SUSPENDED", dashboardEligible: false } },
      meta: { requestId: "req_suspend" },
    });
    await expect(reactivateResponse.json()).resolves.toMatchObject({
      data: { admin: { status: "ACTIVE", dashboardEligible: true } },
      meta: { requestId: "req_reactivate" },
    });
    expect(calls).toEqual([
      "create",
      "list",
      "update",
      "suspend",
      "reactivate",
    ]);
  });

  it("returns safe email conflict details when Admin creation email is already used in Admin realm", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => ownerContext,
      },
      routes: {
        adminAccounts: {
          controllerFactory: () =>
            createController({
              createAdminAccount: async () =>
                Result.error(
                  new GeneralError(
                    {
                      reason: "ADMIN_EMAIL_ALREADY_EXISTS",
                      field: "email",
                      existingAccountKind: "ADMIN",
                    },
                    "CONFLICT_STATE",
                    "An Admin account already uses this email."
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin-accounts", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=owner-token",
          "content-type": "application/json",
          "x-request-id": "req_email_conflict",
        },
        body: JSON.stringify({
          email: "jerowe.tan99@gmail.com",
          password: "@Bamu760346@",
          sendInvitationEmail: true,
        }),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT_STATE",
        message: "An Admin account already uses this email.",
        details: {
          reason: "ADMIN_EMAIL_ALREADY_EXISTS",
          field: "email",
          existingAccountKind: "ADMIN",
          requestId: "req_email_conflict",
        },
      },
    });
  });

  it("lists Admin accounts when D1 returns SQLite CURRENT_TIMESTAMP strings", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => ownerContext,
      },
      routes: {
        adminAccounts: {
          controllerFactory: () =>
            new AdminAccountController(
              new AdminAccountService({
                repository: readonlyAdminRepository([
                  {
                    id: "owner_1",
                    email: "owner@example.test",
                    role: "SUPER_ADMIN",
                    status: "ACTIVE",
                    isOwner: true,
                    emailVerifiedAt: sqliteTimestamp,
                    approvedAt: sqliteTimestamp,
                    suspensionReason: null,
                    rejectionReason: null,
                    createdAt: sqliteTimestamp,
                    updatedAt: sqliteTimestamp,
                  },
                ]),
                accountEmails: noopEmails,
                passwordPepper: "test-pepper-value",
              })
            ),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin-accounts", {
        headers: {
          cookie: "jrw_admin_session=owner-token",
          "x-request-id": "req_sqlite_timestamps",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        admins: [
          {
            id: "owner_1",
            role: "SUPER_ADMIN",
            createdAt: publicTimestamp,
            updatedAt: publicTimestamp,
          },
        ],
      },
      meta: { requestId: "req_sqlite_timestamps" },
    });
  });

  it("rejects role/owner mutation fields before controller execution", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => ownerContext,
      },
      routes: {
        adminAccounts: {
          controllerFactory: () =>
            createController({
              updateAdminAccount: async () =>
                Result.okay({ admin: adminDto({ role: "SUPER_ADMIN" }) }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin-accounts/admin_1", {
        method: "PATCH",
        headers: {
          cookie: "jrw_admin_session=owner-token",
          "content-type": "application/json",
          "x-request-id": "req_bad_admin_patch",
        },
        body: JSON.stringify({
          email: "ops@example.test",
          role: "SUPER_ADMIN",
          isOwner: true,
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: { requestId: "req_bad_admin_patch" },
      },
    });
  });

  it("denies anonymous, Admin, Customer, and Prospect contexts before Admin controller execution", async () => {
    const cases = [
      {
        name: "anonymous",
        expectedCode: "AUTH_REQUIRED",
        requestContext: undefined,
        headers: { "x-request-id": "req_admin_anonymous" },
      },
      {
        name: "admin",
        expectedCode: "AUTH_FORBIDDEN",
        requestContext: adminContext,
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_admin_role",
        },
      },
      {
        name: "customer",
        expectedCode: "AUTH_REQUIRED",
        requestContext: customerContext,
        headers: {
          cookie: "jrw_customer_session=customer-token",
          "x-request-id": "req_admin_customer",
        },
      },
      {
        name: "prospect",
        expectedCode: "AUTH_FORBIDDEN",
        requestContext: prospectContext,
        headers: {
          cookie: "jrw_admin_session=prospect-token",
          "x-request-id": "req_admin_prospect",
        },
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
          adminAccounts: {
            controllerFactory: () => {
              controllerFactoryCalls += 1;
              return createController({
                listAdminAccounts: async () =>
                  Result.okay({ admins: [adminDto()] }),
                createAdminAccount: async () =>
                  Result.okay({
                    admin: adminDto(),
                    invitationEmail: { sent: false },
                  }),
              });
            },
          },
        },
      });

      const listResponse = await app.handle(
        new Request(
          `https://jrw.test/api/admin-accounts?case=${testCase.name}`,
          {
            headers: testCase.headers,
          }
        )
      );
      const createResponse = await app.handle(
        new Request(
          `https://jrw.test/api/admin-accounts?case=${testCase.name}`,
          {
            method: "POST",
            headers: {
              ...testCase.headers,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              email: "ops@example.test",
              password: "correct horse battery staple",
            }),
          }
        )
      );
      const invalidCreateResponse = await app.handle(
        new Request(
          `https://jrw.test/api/admin-accounts?case=${testCase.name}&invalid=1`,
          {
            method: "POST",
            headers: {
              ...testCase.headers,
              "content-type": "application/json",
            },
            body: JSON.stringify({ role: "SUPER_ADMIN" }),
          }
        )
      );

      expect(listResponse.status).toBe(deniedStatus(testCase.expectedCode));
      expect(createResponse.status).toBe(deniedStatus(testCase.expectedCode));
      expect(invalidCreateResponse.status).toBe(
        deniedStatus(testCase.expectedCode)
      );
      await expect(listResponse.json()).resolves.toMatchObject({
        error: { code: testCase.expectedCode },
      });
      await expect(createResponse.json()).resolves.toMatchObject({
        error: { code: testCase.expectedCode },
      });
      await expect(invalidCreateResponse.json()).resolves.toMatchObject({
        error: { code: testCase.expectedCode },
      });
      expect(controllerFactoryCalls).toBe(0);
    }
  });
});
