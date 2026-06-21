import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";

import { createCustomerPageGuard } from "./customer-page-guard";

function contextFor(url: string, headers?: HeadersInit): APIContext {
  return {
    locals: {},
    request: new Request(url, { headers }),
    url: new URL(url),
  } as APIContext;
}

function responseFrom(value: Response | void): Response {
  expect(value).toBeInstanceOf(Response);
  return value as Response;
}

const customerSession = {
  actor: { id: "customer_1", role: "CUSTOMER" as const },
  authenticated: true as const,
};

describe("Customer page guard middleware", () => {
  it.each([
    ["/account/profile", "https://jrw.test/account/sign-in"],
    [
      "/account/orders",
      `https://jrw.test/account/sign-in?returnTo=${encodeURIComponent("/account/orders")}`,
    ],
    [
      "/account/orders/ORD-1",
      `https://jrw.test/account/sign-in?returnTo=${encodeURIComponent("/account/orders/ORD-1")}`,
    ],
  ])(
    "redirects unauthenticated protected page %s before rendering",
    async (pathname, expectedLocation) => {
      const next = vi.fn(async () => new Response("protected UI"));
      const guard = createCustomerPageGuard({
        inspectSession: async () => ({
          authenticated: false,
          reason: "missing_session",
        }),
      });

      const response = responseFrom(
        await guard(contextFor(`https://jrw.test${pathname}`), next)
      );

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(expectedLocation);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(next).not.toHaveBeenCalled();
    }
  );

  it("redirects authenticated Customer away from auth page to safe returnTo", async () => {
    const next = vi.fn(async () => new Response("sign in"));
    const guard = createCustomerPageGuard({
      inspectSession: async () => customerSession,
    });

    const response = responseFrom(
      await guard(
        contextFor(
          "https://jrw.test/account/sign-in?returnTo=%2Faccount%2Forders%3Ftab%3Dopen"
        ),
        next
      )
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://jrw.test/account/orders?tab=open"
    );
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    "https://evil.test/path",
    "//evil.test/path",
    "/admin/accounts",
    "/api/customers/me",
    "/account/sign-in",
    "/account/register",
    "/account/profile%0A",
  ])(
    "redirects unsafe authenticated returnTo %s to profile",
    async (returnTo) => {
      const guard = createCustomerPageGuard({
        inspectSession: async () => customerSession,
      });

      const response = responseFrom(
        await guard(
          contextFor(
            `https://jrw.test/account/register?returnTo=${encodeURIComponent(returnTo)}`
          ),
          vi.fn(async () => new Response("register"))
        )
      );

      expect(response.headers.get("location")).toBe(
        "https://jrw.test/account/profile"
      );
    }
  );

  it("redirects authenticated Customer account landing to profile", async () => {
    const guard = createCustomerPageGuard({
      inspectSession: async () => customerSession,
    });

    const response = responseFrom(
      await guard(
        contextFor("https://jrw.test/account"),
        vi.fn(async () => new Response("landing"))
      )
    );

    expect(response.headers.get("location")).toBe(
      "https://jrw.test/account/profile"
    );
  });

  it("stores Customer actor in locals and renders protected page", async () => {
    const context = contextFor("https://jrw.test/account/profile", {
      cookie: "jrw_customer_session=token",
      "x-request-id": "req_customer_page",
    });
    const next = vi.fn(async () => new Response("profile"));
    const guard = createCustomerPageGuard({
      inspectSession: async () => customerSession,
    });

    const response = responseFrom(await guard(context, next));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("vary")).toBe("cookie");
    expect(context.locals.customerActor).toEqual(customerSession.actor);
    expect(next).toHaveBeenCalledOnce();
  });

  it("never inspects Customer session or gates guest checkout", async () => {
    const inspectSession = vi.fn();
    const next = vi.fn(async () => new Response("checkout"));
    const guard = createCustomerPageGuard({ inspectSession });

    const response = responseFrom(
      await guard(contextFor("https://jrw.test/checkout/details"), next)
    );

    expect(response.status).toBe(200);
    expect(inspectSession).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});
