import { describe, expect, it } from "vitest";
import { Miniflare } from "miniflare";
import { Result } from "@/utils/general/result";
import {
  bindAstroBridgeDecorations,
  clearAstroBridgeDecorations,
} from "@/lib/elysia/astroBridgeContext";
import { createApp } from "@/server/app";
import { OwnershipTransferController } from "@/server/controllers/OwnershipTransferController";
import type { RequestActorContext } from "@/server/context/request-context";
import type {
  OwnershipTransferAccountDto,
  OwnershipTransferCandidateDto,
  OwnershipTransferService,
} from "@/server/services/OwnershipTransferService";

function candidateDto(
  overrides: Partial<OwnershipTransferCandidateDto> = {}
): OwnershipTransferCandidateDto {
  return {
    id: "admin_target",
    email: "target@example.test",
    role: "ADMIN",
    status: "ACTIVE",
    isOwner: false,
    emailVerified: true,
    approved: true,
    dashboardEligible: true,
    createdAt: "2026-05-17T12:31:00.000Z",
    updatedAt: "2026-05-17T12:31:00.000Z",
    ...overrides,
  };
}

function accountDto(
  overrides: Partial<OwnershipTransferAccountDto> = {}
): OwnershipTransferAccountDto {
  return {
    id: "admin_target",
    email: "target@example.test",
    role: "ADMIN",
    status: "ACTIVE",
    isOwner: false,
    emailVerified: true,
    approved: true,
    updatedAt: "2026-05-17T12:31:00.000Z",
    ...overrides,
  };
}

function createController(
  service: Partial<OwnershipTransferService>
): OwnershipTransferController {
  return new OwnershipTransferController(service as OwnershipTransferService);
}

function deniedStatus(code: string): number {
  return code === "AUTH_REQUIRED" ? 401 : 403;
}

const ownerContext = {
  authenticated: true,
  role: "SUPER_ADMIN",
  actorId: "admin_owner",
  safeActorId: "admin_owner",
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

async function createOwnershipCandidateD1() {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    d1Databases: ["DB"],
  });
  const d1 = await mf.getD1Database("DB");

  await d1
    .prepare(
      `CREATE TABLE admins (
        id text PRIMARY KEY NOT NULL,
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        password_salt text,
        is_owner integer DEFAULT 0 NOT NULL,
        status text DEFAULT 'ACTIVE' NOT NULL,
        email_verified_at text,
        approved_at text,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`
    )
    .run();

  await d1
    .prepare(
      `INSERT INTO admins (
        id, email, password_hash, password_salt, is_owner, status,
        email_verified_at, approved_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "admin_target",
      "target@example.test",
      "hash",
      "salt",
      0,
      "ACTIVE",
      "2026-05-17 12:31:00",
      "2026-05-17 12:31:00",
      "2026-05-17 12:31:00",
      "2026-05-17 12:31:00"
    )
    .run();

  return { d1, mf };
}

describe("owner governance routes", () => {
  it("documents ownership transfer endpoints with owner-only auth metadata", async () => {
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

    const candidates =
      body.paths?.["/api/admin/owner/ownership-transfer/candidates"]?.get;
    const transfer = body.paths?.["/api/admin/owner/ownership-transfer"]?.post;

    for (const operation of [candidates, transfer]) {
      expect(operation?.tags).toContain("Owner Governance");
      expect(operation?.["x-auth"]).toEqual({
        mode: "required",
        roles: ["SUPER_ADMIN"],
      });
      expect(operation?.["x-rate-limit-class"]).toBe("admin-write");
      expect(operation?.["x-error-codes"]).toEqual(
        expect.arrayContaining([
          "AUTH_REQUIRED",
          "AUTH_FORBIDDEN",
          "VALIDATION_FAILED",
          "RESOURCE_NOT_FOUND",
          "CONFLICT_STATE",
          "PROVIDER_UNAVAILABLE",
        ])
      );
      expect(operation?.responses).toHaveProperty("503");
    }
    expect(candidates?.summary).toBe("List ownership transfer candidates");
    expect(transfer?.summary).toBe("Transfer platform ownership");
  });

  it("lists candidates and transfers ownership through controller boundary", async () => {
    const calls: string[] = [];
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => ownerContext,
      },
      routes: {
        ownerGovernance: {
          controllerFactory: () =>
            createController({
              listCandidates: async () => {
                calls.push("list");
                return Result.okay({ candidates: [candidateDto()] });
              },
              submitTransfer: async () => {
                calls.push("transfer");
                return Result.okay({
                  previousOwner: accountDto({
                    id: "admin_owner",
                    email: "owner@example.test",
                    role: "ADMIN",
                    isOwner: false,
                  }),
                  newOwner: accountDto({
                    id: "admin_target",
                    role: "SUPER_ADMIN",
                    isOwner: true,
                  }),
                  revokedSessionCount: 2,
                  revokedActorIds: ["admin_owner", "admin_target"],
                  auditLogId: "audit_1",
                  sessionRefreshRequired: true,
                });
              },
            }),
        },
      },
    });

    const listResponse = await app.handle(
      new Request(
        "https://jrw.test/api/admin/owner/ownership-transfer/candidates",
        {
          headers: {
            cookie: "jrw_admin_session=owner-token",
            "x-request-id": "req_candidates",
          },
        }
      )
    );
    const transferResponse = await app.handle(
      new Request("https://jrw.test/api/admin/owner/ownership-transfer", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=owner-token",
          "content-type": "application/json",
          "x-request-id": "req_transfer",
        },
        body: JSON.stringify({
          targetAdminId: "admin_target",
          confirmationPhrase: "TRANSFER OWNERSHIP TO target@example.test",
          password: "correct horse battery staple",
        }),
      })
    );

    await expect(listResponse.json()).resolves.toMatchObject({
      data: {
        candidates: [
          {
            id: "admin_target",
            email: "target@example.test",
            dashboardEligible: true,
          },
        ],
      },
      meta: { requestId: "req_candidates" },
    });
    expect(transferResponse.status).toBe(200);
    await expect(transferResponse.json()).resolves.toMatchObject({
      data: {
        previousOwner: { id: "admin_owner", role: "ADMIN" },
        newOwner: { id: "admin_target", role: "SUPER_ADMIN" },
        revokedSessionCount: 2,
        sessionRefreshRequired: true,
      },
      meta: { requestId: "req_transfer" },
    });
    expect(transferResponse.headers.get("set-cookie")).toContain(
      "jrw_admin_session="
    );
    expect(transferResponse.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(calls).toEqual(["list", "transfer"]);
  });

  it(
    "lists runtime D1 candidates when timestamps use SQLite CURRENT_TIMESTAMP format",
    async () => {
      const { d1, mf } = await createOwnershipCandidateD1();
      const app = createApp({
        requestContext: {
          resolveActorFromSession: async () => ownerContext,
        },
      });
      const request = new Request(
        "https://jrw.test/api/admin/owner/ownership-transfer/candidates",
        {
          headers: {
            cookie: "jrw_admin_session=owner-token",
            "x-request-id": "req_sqlite_timestamp",
          },
        }
      );

      bindAstroBridgeDecorations(request, {
        runtimeEnv: {
          DB: d1,
          PASSWORD_PEPPER: "test-password-pepper-value",
        } as unknown as Partial<Env> & Record<string, unknown>,
      });

      try {
        const response = await app.handle(request);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
          data: {
            candidates: [
              {
                id: "admin_target",
                createdAt: "2026-05-17T12:31:00.000Z",
                updatedAt: "2026-05-17T12:31:00.000Z",
              },
            ],
          },
          meta: { requestId: "req_sqlite_timestamp" },
        });
      } finally {
        clearAstroBridgeDecorations(request);
        await mf.dispose();
      }
    },
    20_000
  );

  it("denies anonymous, Admin, Customer, and Prospect before controller execution", async () => {
    const cases = [
      {
        name: "anonymous",
        expectedCode: "AUTH_REQUIRED",
        requestContext: undefined,
        headers: { "x-request-id": "req_owner_anonymous" },
      },
      {
        name: "admin",
        expectedCode: "AUTH_FORBIDDEN",
        requestContext: adminContext,
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_owner_admin",
        },
      },
      {
        name: "customer",
        expectedCode: "AUTH_REQUIRED",
        requestContext: customerContext,
        headers: {
          cookie: "jrw_customer_session=customer-token",
          "x-request-id": "req_owner_customer",
        },
      },
      {
        name: "prospect",
        expectedCode: "AUTH_FORBIDDEN",
        requestContext: prospectContext,
        headers: {
          cookie: "jrw_admin_session=prospect-token",
          "x-request-id": "req_owner_prospect",
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
          ownerGovernance: {
            controllerFactory: () => {
              controllerFactoryCalls += 1;
              return createController({
                listCandidates: async () =>
                  Result.okay({ candidates: [candidateDto()] }),
                submitTransfer: async () =>
                  Result.okay({
                    previousOwner: accountDto(),
                    newOwner: accountDto(),
                    revokedSessionCount: 0,
                    revokedActorIds: [],
                    auditLogId: "audit_1",
                    sessionRefreshRequired: true,
                  }),
              });
            },
          },
        },
      });

      const listResponse = await app.handle(
        new Request(
          `https://jrw.test/api/admin/owner/ownership-transfer/candidates?case=${testCase.name}`,
          { headers: testCase.headers }
        )
      );
      const transferResponse = await app.handle(
        new Request(
          `https://jrw.test/api/admin/owner/ownership-transfer?case=${testCase.name}`,
          {
            method: "POST",
            headers: {
              ...testCase.headers,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              targetAdminId: "admin_target",
              confirmationPhrase: "TRANSFER OWNERSHIP TO target@example.test",
              password: "correct horse battery staple",
            }),
          }
        )
      );
      const invalidTransferResponse = await app.handle(
        new Request(
          `https://jrw.test/api/admin/owner/ownership-transfer?case=${testCase.name}&invalid=1`,
          {
            method: "POST",
            headers: {
              ...testCase.headers,
              "content-type": "application/json",
            },
            body: JSON.stringify({ targetAdminId: "" }),
          }
        )
      );

      expect(listResponse.status).toBe(deniedStatus(testCase.expectedCode));
      expect(transferResponse.status).toBe(deniedStatus(testCase.expectedCode));
      expect(invalidTransferResponse.status).toBe(
        deniedStatus(testCase.expectedCode)
      );
      await expect(listResponse.json()).resolves.toMatchObject({
        error: { code: testCase.expectedCode },
      });
      await expect(transferResponse.json()).resolves.toMatchObject({
        error: { code: testCase.expectedCode },
      });
      await expect(invalidTransferResponse.json()).resolves.toMatchObject({
        error: { code: testCase.expectedCode },
      });
      expect(controllerFactoryCalls).toBe(0);
    }
  });
});
