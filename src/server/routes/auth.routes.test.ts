import { describe, expect, it } from "vitest";
import { Result } from "@/utils/general/result";
import { AuthController } from "@/server/controllers/AuthController";
import type { AuthService } from "@/server/services/AuthService";
import { createApp } from "@/server/app";

function createController(service: Partial<AuthService>): AuthController {
  return new AuthController(service as AuthService);
}

describe("auth routes", () => {
  it("documents auth endpoints with OpenAPI metadata", async () => {
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

    const createSession = body.paths?.["/api/auth/sessions"]?.post;
    const deleteSession =
      body.paths?.["/api/auth/sessions/current"]?.delete;
    const inspectSession = body.paths?.["/api/auth/session"]?.get;

    expect(createSession?.summary).toBe("Create auth session");
    expect(createSession?.tags).toContain("Auth");
    expect(createSession?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(createSession?.["x-rate-limit-class"]).toBe("auth-password");
    expect(createSession?.["x-error-codes"]).toContain("RATE_LIMITED");
    expect(deleteSession?.["x-auth"]?.mode).toBe("optional");
    expect(inspectSession?.["x-rate-limit-class"]).toBe("public-read");
  });

  it("creates a session and sets a secure HttpOnly cookie", async () => {
    const app = createApp({
      routes: {
        auth: {
          controllerFactory: () =>
            createController({
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
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/auth/sessions", {
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
    expect(setCookie).toContain("jrw_session=raw-session-token");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
  });

  it("clears cookie when deleting current session", async () => {
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
      new Request("https://jrw.test/api/auth/sessions/current", {
        method: "DELETE",
        headers: {
          cookie: "jrw_session=raw-session-token",
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
    expect(setCookie).toContain("jrw_session=");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("HttpOnly");
  });

  it("returns anonymous session when no active session exists", async () => {
    const app = createApp({
      routes: {
        auth: {
          controllerFactory: () =>
            createController({
              inspectSession: async () =>
                Result.okay({
                  authenticated: false,
                  actor: null,
                  session: null,
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/auth/session", {
        headers: { "x-request-id": "req_test" },
      })
    );

    await expect(response.json()).resolves.toEqual({
      data: {
        authenticated: false,
        actor: null,
        session: null,
      },
      meta: { code: "SUCCESS", requestId: "req_test" },
    });
  });
});
