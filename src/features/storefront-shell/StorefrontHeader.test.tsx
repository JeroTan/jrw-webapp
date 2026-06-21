import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { StorefrontHeader } from "./StorefrontHeader";
import {
  completeCustomerSignOut,
  StorefrontAuthNav,
} from "./components/Navigation/StorefrontAuthNav";
import { StorefrontPublicNav } from "./components/Navigation/StorefrontPublicNav";

describe("StorefrontHeader Customer navigation", () => {
  it("shows sign-in and registration actions for Prospect state", () => {
    const markup = renderToStaticMarkup(createElement(StorefrontPublicNav));

    expect(markup).toContain('href="/account/sign-in"');
    expect(markup).toContain("SIGN IN");
    expect(markup).toContain('href="/account/register"');
    expect(markup).toContain("REGISTER");
  });

  it("shows account, future orders, and sign-out without PII for Customer state", () => {
    const markup = renderToStaticMarkup(createElement(StorefrontAuthNav));

    expect(markup).toContain('href="/account/profile"');
    expect(markup).toContain("ACCOUNT");
    expect(markup).toContain('href="/account/orders"');
    expect(markup).toContain("ORDERS");
    expect(markup).toContain("SIGN OUT");
    expect(markup).not.toMatch(/[\w.+-]+@[\w.-]+/);
    expect(markup).not.toMatch(/phone|address|session|provider/i);
  });

  it("clears Customer session before returning navigation to public state", async () => {
    const signOut = vi.fn(async () => ({ cleared: true, revoked: true }));
    const navigate = vi.fn();

    await completeCustomerSignOut(signOut, navigate);

    expect(signOut).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("does not navigate when Customer sign-out fails", async () => {
    const signOut = vi.fn(async () => {
      throw new Error("offline");
    });
    const navigate = vi.fn();

    await expect(completeCustomerSignOut(signOut, navigate)).rejects.toThrow(
      "offline"
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("keeps account actions inside mobile menu and preserves cart, search, and store nav", () => {
    const markup = renderToStaticMarkup(createElement(StorefrontHeader));

    expect(markup).toContain("Open cart, 0 items");
    expect(markup).toContain("storefront-mobile-search");
    expect(markup).toContain('aria-label="Storefront navigation"');
    expect(markup).toMatch(
      /storefront-mobile-search[\s\S]*aria-label="Customer account"/
    );
  });
});
