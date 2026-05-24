import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  confirmAdminPasswordReset,
  createAdminSession,
  deleteCurrentAdminSession,
  requestAdminPasswordReset,
} from "../api";
import {
  AdminPasswordResetConfirmPanel,
  AdminPasswordResetRequestPanel,
} from "./AdminPasswordResetPanels";
import { AdminSignInPanel } from "./AdminSignInPanel";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("admin auth UI", () => {
  it("renders sign-in and recovery entry without admin registration affordance", () => {
    const signInMarkup = renderToStaticMarkup(createElement(AdminSignInPanel));

    expect(signInMarkup).toContain("Sign in to JRW admin");
    expect(signInMarkup).toContain("Admin accounts are created by Super Admin.");
    expect(signInMarkup).toContain("Forgot password");
    expect(signInMarkup).toContain("bg-brand-content");
    expect(signInMarkup).toContain("text-brand-surface");
    expect(signInMarkup).not.toContain("Need admin access");
    expect(signInMarkup).not.toContain("/admin/register");
  });

  it("renders admin password reset request and confirmation states", () => {
    const requestMarkup = renderToStaticMarkup(
      createElement(AdminPasswordResetRequestPanel)
    );
    const confirmMarkup = renderToStaticMarkup(
      createElement(AdminPasswordResetConfirmPanel, { token: "" })
    );

    expect(requestMarkup).toContain("Reset admin password");
    expect(requestMarkup).toContain("Send reset link");
    expect(confirmMarkup).toContain("Set new admin password");
    expect(confirmMarkup).toContain("Reset token is missing");
  });

  it("submits admin sign-in request shape and hides raw auth errors", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return jsonResponse(
        { error: { code: "PROVIDER_UNAVAILABLE", message: "raw provider dump" } },
        401
      );
    };

    const result = await createAdminSession(
      { email: "admin@example.com", password: "secret" },
      fetcher
    );

    expect(calls[0]?.input).toBe("/api/admin/auth/sessions");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.credentials).toBe("include");
    expect(calls[0]?.init?.body).toBe(
      JSON.stringify({ email: "admin@example.com", password: "secret" })
    );
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.message).toBe(
      "Sign in failed. Check credentials and account status."
    );
  });

  it("submits logout and admin password reset API request shapes", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return jsonResponse({ data: { accepted: true, cleared: true, reset: true, revoked: true } });
    };

    await deleteCurrentAdminSession(fetcher);
    await requestAdminPasswordReset({ email: "admin@example.com" }, fetcher);
    await confirmAdminPasswordReset(
      { password: "new-password", token: "reset-token" },
      fetcher
    );

    expect(calls[0]?.input).toBe("/api/admin/auth/sessions/current");
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(calls[1]?.input).toBe("/api/admin/auth/password-resets");
    expect(calls[1]?.init?.body).toBe(
      JSON.stringify({ email: "admin@example.com" })
    );
    expect(calls[2]?.input).toBe(
      "/api/admin/auth/password-resets/confirmations"
    );
    expect(calls[2]?.init?.body).toBe(
      JSON.stringify({ password: "new-password", token: "reset-token" })
    );
  });
});
