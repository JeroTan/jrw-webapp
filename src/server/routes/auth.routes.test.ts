import { describe, expect, it } from "vitest";
import { Result } from "@/utils/general/result";
import { AuthController } from "@/server/controllers/AuthController";
import type { AuthService } from "@/server/services/AuthService";
import { createApp } from "@/server/app";

function createController(service: Partial<AuthService>): AuthController {
  return new AuthController(service as AuthService);
}

describe("auth routes", () => {
  it("documents realm-specific auth endpoints with OpenAPI metadata", async () => {
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

    const adminCreate = body.paths?.["/api/admin/auth/sessions"]?.post;
    const customerCreate = body.paths?.["/api/customer/auth/sessions"]?.post;
    const adminDelete =
      body.paths?.["/api/admin/auth/sessions/current"]?.delete;
    const customerInspect =
      body.paths?.["/api/customer/auth/session"]?.get;

    expect(body.paths?.["/api/auth/sessions"]).toBeUndefined();
    expect(adminCreate?.summary).toBe("Create admin auth session");
    expect(adminCreate?.tags).toContain("Admin Auth");
    expect(adminCreate?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(adminCreate?.["x-rate-limit-class"]).toBe("auth-password");
    expect(adminCreate?.["x-error-codes"]).toContain("RATE_LIMITED");
    expect(adminCreate?.responses).toHaveProperty("503");
    expect(customerCreate?.summary).toBe("Create customer auth session");
    expect(customerCreate?.tags).toContain("Customer Auth");
    expect(adminDelete?.["x-auth"]?.roles).toEqual([
      "PROSPECT",
      "ADMIN",
      "SUPER_ADMIN",
    ]);
    expect(customerInspect?.["x-auth"]?.roles).toEqual([
      "PROSPECT",
      "CUSTOMER",
    ]);
  });

  it("creates admin session and sets admin cookie", async () => {
    const app = createApp({
      routes: {
        auth: {
          controllerFactory: ({ realm }) => {
            expect(realm).toBe("admin");
            return createController({
              signIn: async () =>
                Result.okay({
                  actor: {
                    id: "admin_1",
                    role: "SUPER_ADMIN",
                    accountStatus: {
                      status: "ACTIVE",
                      emailVerified: true,
                      approved: true,
                    },
                  },
                  session: {
                    token: "raw-session-token",
                    expiresAt: "2026-05-14T00:00:00.000Z",
                  },
                }),
            });
          },
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/auth/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_test",
        },
        body: JSON.stringify({
          email: "owner@example.test",
          password: "correct horse battery staple",
        }),
      })
    );
    const body = await response.json();
    const setCookie = response.headers.get("set-cookie");

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: {
        actor: { id: "admin_1", role: "SUPER_ADMIN" },
        session: { expiresAt: "2026-05-14T00:00:00.000Z" },
      },
      meta: { requestId: "req_test" },
    });
    expect(JSON.stringify(body)).not.toContain("raw-session-token");
    expect(setCookie).toContain("jrw_admin_session=raw-session-token");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
  });

  it("creates customer session and sets customer cookie", async () => {
    const app = createApp({
      routes: {
        auth: {
          controllerFactory: ({ realm }) => {
            expect(realm).toBe("customer");
            return createController({
              signIn: async () =>
                Result.okay({
                  actor: {
                    id: "customer_1",
                    role: "CUSTOMER",
                    accountStatus: {
                      status: "ACTIVE",
                      emailVerified: true,
                      approved: false,
                    },
                  },
                  session: {
                    token: "raw-customer-token",
                    expiresAt: "2026-05-14T00:00:00.000Z",
                  },
                }),
            });
          },
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/customer/auth/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_customer",
        },
        body: JSON.stringify({
          email: "customer@example.test",
          password: "correct horse battery staple",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      "jrw_customer_session=raw-customer-token"
    );
  });

  it("clears only realm cookie when deleting current session", async () => {
    const app = createApp({
      routes: {
        auth: {
          controllerFactory: () =>
            createController({
              signOut: async () => Result.okay({ cleared: true, revoked: true }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/auth/sessions/current", {
        method: "DELETE",
        headers: {
          cookie: "jrw_admin_session=raw-session-token",
          "x-request-id": "req_test",
        },
      })
    );
    const body = await response.json();
    const setCookie = response.headers.get("set-cookie");

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: { cleared: true, revoked: true },
      meta: { code: "SUCCESS", requestId: "req_test" },
    });
    expect(setCookie).toContain("jrw_admin_session=");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("HttpOnly");
  });

  it("does not inspect cross-realm cookie on customer session endpoint", async () => {
    let observedSessionToken: string | undefined;
    const app = createApp({
      routes: {
        auth: {
          controllerFactory: () =>
            createController({
              inspectSession: async (input) => {
                observedSessionToken = input.sessionToken;
                return Result.okay({
                  authenticated: false,
                  actor: null,
                  session: null,
                });
              },
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/customer/auth/session", {
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_cross",
        },
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      data: {
        authenticated: false,
        actor: null,
        session: null,
      },
    });
    expect(observedSessionToken).toBeUndefined();
  });
});
