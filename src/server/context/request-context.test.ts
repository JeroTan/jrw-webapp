import { Elysia } from "elysia";
import { describe, expect, it } from "vitest";
import {
  createRequestContextPlugin,
  type RequestContextDecorations,
} from "./request-context";

describe("request context plugin", () => {
  it("creates anonymous Prospect actor context when session cookie is missing", async () => {
    const app = new Elysia()
      .use(createRequestContextPlugin())
      .get("/ctx", (ctx) => {
        const { requestContext } = ctx as typeof ctx & RequestContextDecorations;
        return {
          requestId: requestContext.requestId,
          actor: requestContext.actor,
        };
      });

    const response = await app.handle(
      new Request("https://jrw.test/ctx", {
        headers: { "x-request-id": "req_test" },
      })
    );

    await expect(response.json()).resolves.toEqual({
      requestId: "req_test",
      actor: {
        authenticated: false,
        role: "PROSPECT",
        eligibility: {
          active: false,
          emailVerified: false,
          approved: false,
        },
      },
    });
    expect(response.headers.get("x-request-id")).toBe("req_test");
  });

  it("derives actor context from session cookie per request", async () => {
    const app = new Elysia()
      .use(
        createRequestContextPlugin({
          resolveActorFromSession: async ({ sessionToken }) =>
            sessionToken === "admin-token"
              ? {
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
                }
              : undefined,
        })
      )
      .get("/ctx", (ctx) => {
        const { requestContext } = ctx as typeof ctx & RequestContextDecorations;
        return requestContext.actor;
      });

    const adminResponse = await app.handle(
      new Request("https://jrw.test/ctx", {
        headers: {
          cookie: "jrw_session=admin-token",
          "x-request-id": "req_admin",
        },
      })
    );
    const anonymousResponse = await app.handle(
      new Request("https://jrw.test/ctx", {
        headers: { "x-request-id": "req_anon" },
      })
    );

    await expect(adminResponse.json()).resolves.toMatchObject({
      authenticated: true,
      role: "ADMIN",
      actorId: "admin_1",
      accountStatus: { status: "ACTIVE" },
    });
    await expect(anonymousResponse.json()).resolves.toMatchObject({
      authenticated: false,
      role: "PROSPECT",
    });
  });

  it("treats malformed session cookies as anonymous instead of failing request context", async () => {
    const app = new Elysia()
      .use(createRequestContextPlugin())
      .get("/ctx", (ctx) => {
        const { requestContext } = ctx as typeof ctx & RequestContextDecorations;
        return requestContext.actor;
      });

    const response = await app.handle(
      new Request("https://jrw.test/ctx", {
        headers: {
          cookie: "jrw_session=%E0%A4%A",
          "x-request-id": "req_bad_cookie",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      authenticated: false,
      role: "PROSPECT",
    });
    expect(response.headers.get("x-request-id")).toBe("req_bad_cookie");
  });
});
