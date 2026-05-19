import { describe, expect, it } from "vitest";
import { Result } from "@/utils/general/result";
import { GeneralError } from "@/utils/general/error";
import { GoogleOAuthController } from "@/server/controllers/GoogleOAuthController";
import type { GoogleOAuthServiceLike } from "@/server/controllers/GoogleOAuthController";
import { createApp } from "@/server/app";

function createController(
  service: Partial<GoogleOAuthServiceLike>
): GoogleOAuthController {
  return new GoogleOAuthController(service as GoogleOAuthServiceLike);
}

describe("google oauth routes", () => {
  it("documents Google OAuth redirects with OpenAPI metadata", async () => {
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

    const start = body.paths?.["/api/oauth/google/sessions"]?.get;
    const callback = body.paths?.["/api/oauth/google/callback"]?.get;

    expect(start?.summary).toBe("Start Google OAuth session");
    expect(callback?.summary).toBe("Handle Google OAuth callback");
    expect(start?.tags).toContain("Auth");
    expect(start?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT", "CUSTOMER"],
    });
    expect(start?.["x-rate-limit-class"]).toBe("oauth-login");
    expect(callback?.["x-error-codes"]).toEqual(
      expect.arrayContaining([
        "VALIDATION_FAILED",
        "AUTHENTICATION",
        "AUTH_FORBIDDEN",
        "CONFLICT_STATE",
        "PROVIDER_UNAVAILABLE",
      ])
    );
  });

  it("redirects to Google when starting a session", async () => {
    const app = createApp({
      routes: {
        googleOAuth: {
          controllerFactory: () =>
            createController({
              startSession: async () =>
                Result.okay({
                  redirectUrl:
                    "https://accounts.google.com/o/oauth2/v2/auth?state=raw-state",
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/oauth/google/sessions?returnTo=/checkout", {
        headers: { "x-request-id": "req_start" },
      })
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("accounts.google.com");
    await expect(response.text()).resolves.toBe("");
  });

  it("sets secure HttpOnly session cookie on successful callback redirect", async () => {
    const app = createApp({
      routes: {
        googleOAuth: {
          controllerFactory: () =>
            createController({
              handleCallback: async () =>
                Result.okay({
                  actor: {
                    id: "customer_1",
                    role: "CUSTOMER",
                    accountStatus: {
                      status: "ACTIVE",
                      emailVerified: true,
                      approved: true,
                    },
                  },
                  session: {
                    token: "raw-session-token",
                    expiresAt: "2026-05-22T00:00:00.000Z",
                  },
                  redirectPath: "/checkout",
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/oauth/google/callback?state=raw-state&code=authorization-code",
        { headers: { "x-request-id": "req_callback" } }
      )
    );
    const setCookie = response.headers.get("set-cookie");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/checkout");
    expect(setCookie).toContain("jrw_customer_session=raw-session-token");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    await expect(response.text()).resolves.toBe("");
  });

  it("accepts Google callback query extras and ignores them", async () => {
    const app = createApp({
      routes: {
        googleOAuth: {
          controllerFactory: () =>
            createController({
              handleCallback: async () =>
                Result.okay({
                  actor: {
                    id: "customer_1",
                    role: "CUSTOMER",
                    accountStatus: {
                      status: "ACTIVE",
                      emailVerified: true,
                      approved: true,
                    },
                  },
                  session: {
                    token: "raw-session-token",
                    expiresAt: "2026-05-22T00:00:00.000Z",
                  },
                  redirectPath: "/checkout",
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/oauth/google/callback?state=raw-state&iss=https%3A%2F%2Faccounts.google.com&code=authorization-code&scope=email+profile+openid&authuser=0&prompt=consent",
        { headers: { "x-request-id": "req_callback" } }
      )
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/checkout");
  });

  it("returns safe standard error envelope on callback failure", async () => {
    const app = createApp({
      routes: {
        googleOAuth: {
          controllerFactory: () =>
            createController({
              handleCallback: async () =>
                Result.error(
                  new GeneralError(
                    {
                      reason: "ADMIN_EMAIL_COLLISION",
                      token: "raw-id-token",
                    },
                    "AUTHENTICATION"
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/oauth/google/callback?state=raw-state&code=bad",
        { headers: { "x-request-id": "req_callback" } }
      )
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      error: {
        code: "AUTHENTICATION",
        details: { requestId: "req_callback" },
      },
    });
    expect(JSON.stringify(body)).not.toContain("raw-id-token");
    expect(JSON.stringify(body)).not.toContain("ADMIN_EMAIL_COLLISION");
  });
});
