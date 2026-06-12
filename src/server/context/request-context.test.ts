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

  it("derives actor context from admin session cookie on admin-routed requests", async () => {
    const app = new Elysia()
      .use(
        createRequestContextPlugin({
          resolveActorFromSession: async ({ sessionToken, sessionRealm }) =>
            sessionToken === "admin-token" && sessionRealm === "ADMIN"
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
          cookie: "jrw_admin_session=admin-token",
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
          cookie: "jrw_admin_session=%E0%A4%A",
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

  it("uses customer cookie only for customer-routed requests", async () => {
    let observedToken: string | undefined;
    let observedRealm: string | undefined;
    const app = new Elysia()
      .use(
        createRequestContextPlugin({
          resolveActorFromSession: async ({ sessionToken, sessionRealm }) => {
            observedToken = sessionToken;
            observedRealm = sessionRealm;
            return undefined;
          },
        })
      )
      .get("/api/customers/me", (ctx) => {
        const { requestContext } = ctx as typeof ctx & RequestContextDecorations;
        return requestContext.actor;
      });

    const response = await app.handle(
      new Request("https://jrw.test/api/customers/me", {
        headers: {
          cookie: "jrw_admin_session=admin-token; jrw_customer_session=customer-token",
          "x-request-id": "req_customer_realm",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      authenticated: false,
      role: "PROSPECT",
    });
    expect(observedToken).toBe("customer-token");
    expect(observedRealm).toBe("CUSTOMER");
  });

  it("uses customer cookie for checkout-routed requests and ignores admin cookie", async () => {
    let observedToken: string | undefined;
    let observedRealm: string | undefined;
    const app = new Elysia()
      .use(
        createRequestContextPlugin({
          resolveActorFromSession: async ({ sessionToken, sessionRealm }) => {
            observedToken = sessionToken;
            observedRealm = sessionRealm;
            return undefined;
          },
        })
      )
      .post("/api/checkout/details", (ctx) => {
        const { requestContext } = ctx as typeof ctx & RequestContextDecorations;
        return requestContext.actor;
      });

    const response = await app.handle(
      new Request("https://jrw.test/api/checkout/details", {
        method: "POST",
        headers: {
          cookie:
            "jrw_admin_session=admin-token; jrw_customer_session=customer-token",
          "x-request-id": "req_checkout_realm",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      authenticated: false,
      role: "PROSPECT",
    });
    expect(observedToken).toBe("customer-token");
    expect(observedRealm).toBe("CUSTOMER");
  });
});
