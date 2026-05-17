import { Elysia } from "elysia";
import { describe, expect, it } from "vitest";
import { apiSuccessWithRequestId } from "@/lib/api/response";
import {
  buildRequestContext,
  type RequestActorContext,
} from "@/server/context/request-context";
import { GeneralError } from "@/utils/general/error";
import { rbacGuard } from "./rbac";

function adminActor(
  overrides: Partial<RequestActorContext> = {}
): RequestActorContext {
  return {
    authenticated: true,
    role: "ADMIN",
    actorId: "admin_1",
    safeActorId: "admin_1",
    accountStatus: {
      status: "ACTIVE",
      emailVerified: true,
      approved: true,
    },
    eligibility: {
      active: true,
      emailVerified: true,
      approved: true,
    },
    ...overrides,
  };
}

function deniedStatus(code: string): number {
  return code === "AUTH_REQUIRED" ? 401 : 403;
}

describe("RBAC middleware guard", () => {
  it("denies before the route handler executes and preserves request ID envelope", async () => {
    let handlerCalls = 0;
    const app = new Elysia({ prefix: "/api", aot: false })
      .onError(({ error, set, request }) => {
        const requestId = request.headers.get("x-request-id") ?? "generated";
        set.status = 401;
        return {
          error: {
            code: error instanceof GeneralError ? error.code : "UNKNOWN",
            message: "denied",
            details: { requestId },
          },
        };
      })
      .derive({ as: "scoped" }, ({ request }) => ({
        requestContext: buildRequestContext(request.headers),
        requestId: request.headers.get("x-request-id") ?? "generated",
      }))
      .get(
        "/owner-only",
        ({ requestId }) => {
          handlerCalls += 1;
          return apiSuccessWithRequestId({ ok: true }, requestId);
        },
        {
          transform: rbacGuard({
            mode: "required",
            roles: ["SUPER_ADMIN"],
          }),
        }
      );

    const response = await app.handle(
      new Request("https://jrw.test/api/owner-only", {
        headers: { "x-request-id": "req_guard_denied" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      error: {
        code: "AUTH_REQUIRED",
        details: { requestId: "req_guard_denied" },
      },
    });
    expect(JSON.stringify(body)).not.toContain("MISSING_AUTHENTICATED_ACTOR");
    expect(handlerCalls).toBe(0);
  });

  it("allows required ADMIN only for active verified approved Admin actor", async () => {
    let handlerCalls = 0;
    const app = new Elysia({ prefix: "/api", aot: false })
      .derive({ as: "scoped" }, ({ request }) => ({
        requestContext: buildRequestContext(
          request.headers,
          adminActor(),
          "req_admin"
        ),
        requestId: "req_admin",
      }))
      .get(
        "/admin-only",
        ({ requestId }) => {
          handlerCalls += 1;
          return apiSuccessWithRequestId({ ok: true }, requestId);
        },
        {
          transform: rbacGuard({
            mode: "required",
            roles: ["ADMIN"],
          }),
        }
      );

    const response = await app.handle(
      new Request("https://jrw.test/api/admin-only")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { ok: true },
      meta: { requestId: "req_admin" },
    });
    expect(handlerCalls).toBe(1);
  });

  it("denies required ADMIN before handler for anonymous, wrong role, and ineligible Admin states", async () => {
    const cases: Array<{
      name: string;
      actor?: RequestActorContext;
      expectedCode: string;
    }> = [
      {
        name: "anonymous",
        actor: undefined,
        expectedCode: "AUTH_REQUIRED",
      },
      {
        name: "customer",
        actor: adminActor({ role: "CUSTOMER", actorId: "customer_1" }),
        expectedCode: "AUTH_FORBIDDEN",
      },
      {
        name: "prospect",
        actor: adminActor({ role: "PROSPECT", actorId: "prospect_1" }),
        expectedCode: "AUTH_FORBIDDEN",
      },
      {
        name: "suspended-admin",
        actor: adminActor({
          accountStatus: {
            status: "SUSPENDED",
            emailVerified: true,
            approved: true,
          },
          eligibility: { active: false, emailVerified: true, approved: true },
        }),
        expectedCode: "ACCOUNT_SUSPENDED",
      },
      {
        name: "unverified-admin",
        actor: adminActor({
          accountStatus: {
            status: "ACTIVE",
            emailVerified: false,
            approved: true,
          },
          eligibility: { active: true, emailVerified: false, approved: true },
        }),
        expectedCode: "EMAIL_NOT_VERIFIED",
      },
      {
        name: "unapproved-admin",
        actor: adminActor({
          accountStatus: {
            status: "ACTIVE",
            emailVerified: true,
            approved: false,
          },
          eligibility: { active: true, emailVerified: true, approved: false },
        }),
        expectedCode: "ADMIN_APPROVAL_REQUIRED",
      },
    ];

    for (const testCase of cases) {
      let handlerCalls = 0;
      const app = new Elysia({ prefix: "/api", aot: false })
        .onError(({ error, set, request }) => {
          const code = error instanceof GeneralError ? error.code : "UNKNOWN";
          const requestId = request.headers.get("x-request-id") ?? "generated";
          set.status = deniedStatus(code);
          return {
            error: {
              code,
              message: "denied",
              details: { requestId },
            },
          };
        })
        .derive({ as: "scoped" }, ({ request }) => ({
          requestContext: buildRequestContext(
            request.headers,
            testCase.actor,
            `req_${testCase.name}`
          ),
          requestId: `req_${testCase.name}`,
        }))
        .get(
          "/admin-only",
          ({ requestId }) => {
            handlerCalls += 1;
            return apiSuccessWithRequestId({ ok: true }, requestId);
          },
          {
            transform: rbacGuard({
              mode: "required",
              roles: ["ADMIN"],
            }),
          }
        );

      const response = await app.handle(
        new Request(`https://jrw.test/api/admin-only?case=${testCase.name}`, {
          headers: { "x-request-id": `req_${testCase.name}` },
        })
      );
      const body = await response.json();

      expect(response.status).toBe(deniedStatus(testCase.expectedCode));
      expect(body).toMatchObject({
        error: {
          code: testCase.expectedCode,
          details: { requestId: `req_${testCase.name}` },
        },
      });
      expect(handlerCalls).toBe(0);
    }
  });
});
