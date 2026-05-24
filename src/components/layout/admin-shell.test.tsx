import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AdminShellForbidden,
  AdminShellLoading,
  DashboardShell,
} from "./DashboardShell";

describe("admin dashboard shell", () => {
  it("renders Direction 05 shell landmarks, navigation, role, brand scope, search, and logout", () => {
    const markup = renderToStaticMarkup(
      createElement(
        DashboardShell,
        {
          activeHref: "/admin/products",
          brandScopeLabel: "All brands",
          role: "ADMIN",
          userLabel: "Admin",
        },
        createElement("section", null, "Products work area")
      )
    );

    expect(markup).toContain("Skip to admin content");
    expect(markup).toContain('aria-label="Admin navigation"');
    expect(markup).toContain('id="admin-main"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("Products");
    expect(markup).toContain("All brands");
    expect(markup).toContain("Search admin");
    expect(markup).toContain("Sign out");
    expect(markup).toContain("border-transparent");
    expect(markup).toContain("bg-brand-content");
    expect(markup).not.toContain("Owner-only");
    expect(markup).not.toContain("Admin Accounts");
  });

  it("separates owner-only navigation for Super Admin", () => {
    const markup = renderToStaticMarkup(
      createElement(
        DashboardShell,
        { activeHref: "/admin/owner/transfer", role: "SUPER_ADMIN" },
        createElement("section", null, "Owner work area")
      )
    );

    expect(markup).toContain("Super Admin");
    expect(markup).toContain("Owner-only");
    expect(markup).toContain("Admin Accounts");
    expect(markup).toContain("Ownership Transfer");
    expect(markup).toContain("Owner Audit");
  });

  it("renders loading and safe forbidden states inside shell language", () => {
    const loadingMarkup = renderToStaticMarkup(createElement(AdminShellLoading));
    const forbiddenMarkup = renderToStaticMarkup(
      createElement(AdminShellForbidden, {
        message: "Super Admin permission required.",
      })
    );

    expect(loadingMarkup).toContain("Loading admin session");
    expect(forbiddenMarkup).toContain("Permission needed");
    expect(forbiddenMarkup).toContain("Super Admin permission required.");
    expect(forbiddenMarkup).not.toContain("stack");
    expect(forbiddenMarkup).not.toContain("provider");
  });
});
