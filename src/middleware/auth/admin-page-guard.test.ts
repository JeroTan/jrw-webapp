import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";

import { createAdminPageGuard } from "./admin-page-guard";

function contextFor(url: string, headers?: HeadersInit): APIContext {
  return {
    locals: {},
    request: new Request(url, { headers }),
    url: new URL(url),
  } as APIContext;
}

function expectResponse(response: Response | void): Response {
  expect(response).toBeInstanceOf(Response);
  return response as Response;
}

describe("admin page guard middleware", () => {
  it("redirects protected admin pages before rendering when session is missing", async () => {
    const next = vi.fn(async () => new Response("dashboard"));
    const guard = createAdminPageGuard({
      inspectSession: async () => ({
        authenticated: false,
        reason: "missing_session",
      }),
    });

    const response = expectResponse(
      await guard(contextFor("https://jrw.test/admin"), next)
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://jrw.test/admin/sign-in?returnTo=%2Fadmin"
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(next).not.toHaveBeenCalled();
  });

  it("does not inspect session for admin auth pages", async () => {
    const inspectSession = vi.fn();
    const next = vi.fn(async () => new Response("sign in"));
    const guard = createAdminPageGuard({ inspectSession });

    const response = expectResponse(
      await guard(contextFor("https://jrw.test/admin/sign-in"), next)
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("sign in");
    expect(inspectSession).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows authenticated Admin pages and stores actor in locals", async () => {
    const next = vi.fn(async () => new Response("dashboard"));
    const context = contextFor("https://jrw.test/admin/products", {
      cookie: "jrw_admin_session=token",
      "x-request-id": "req_page",
    });
    const guard = createAdminPageGuard({
      inspectSession: async () => ({
        actor: { id: "admin_1", role: "ADMIN" },
        authenticated: true,
      }),
    });

    const response = expectResponse(await guard(context, next));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("vary")).toBe("cookie");
    expect(response.headers.get("x-request-id")).toBe("req_page");
    expect(context.locals.adminActor).toEqual({
      id: "admin_1",
      role: "ADMIN",
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("redirects non-owner Admin away from owner-only pages", async () => {
    const next = vi.fn(async () => new Response("owner"));
    const guard = createAdminPageGuard({
      inspectSession: async () => ({
        actor: { id: "admin_1", role: "ADMIN" },
        authenticated: true,
      }),
    });

    const response = expectResponse(
      await guard(contextFor("https://jrw.test/admin/owner/transfer"), next)
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://jrw.test/admin");
    expect(next).not.toHaveBeenCalled();
  });
});
