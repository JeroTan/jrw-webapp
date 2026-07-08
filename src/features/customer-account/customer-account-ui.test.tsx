import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
  ChevronDown: "svg",
  ChevronUp: "svg",
}));

import { AccountFormField } from "./components/AccountFormField";
import { AccountDashboardShell } from "./components/AccountDashboardShell";
import {
  CustomerRegisterPanel,
  CustomerRegistrationSuccess,
} from "./CustomerRegisterPanel";
import { CustomerOrderDetailView } from "./CustomerOrderDetailPanel";
import { CustomerOrdersView } from "./CustomerOrdersPanel";
import { CustomerSignInPanel } from "./CustomerSignInPanel";
import {
  CustomerAccountApiError,
  getCustomerOrder,
  getCustomerOrders,
  getCustomerRegistrationPrefill,
  getCustomerProfile,
  getGoogleOAuthStartHref,
  registerCustomer,
  sanitizeCustomerReturnTo,
  signInCustomer,
  updateCustomerProfile,
} from "./api";
import { customerAccountErrorMessage } from "./errors";
import { validateCustomerProfileForm } from "./profile-validation";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function customerProfile() {
  return {
    avatarUrl: null,
    barangay: "Poblacion",
    cityProvince: "Makati",
    displayName: "Nina",
    email: "nina@example.com",
    emailMarketingOptIn: false,
    emailVerified: true,
    firstName: "Nina",
    id: "customer_1",
    lastName: "Reyes",
    phone: "09171234567",
    postalCode: "1200",
    role: "CUSTOMER" as const,
    streetAddress: "1 Test Street",
  };
}

function customerOrderSummary() {
  const updatedAt = "2026-07-08T01:00:00.000Z";

  return {
    createdAt: updatedAt,
    currency: "PHP" as const,
    fulfillment: {
      kind: "fulfillment" as const,
      label: "Shipped",
      updatedAt,
      value: "SHIPPED",
    },
    itemCount: 1,
    orderId: "order_1",
    orderNumber: "JRW-2026-ORDER1",
    payment: {
      kind: "payment" as const,
      label: "Payment paid",
      updatedAt,
      value: "PAYMENT_PAID",
    },
    refund: {
      kind: "refund" as const,
      label: "No refund requested",
      updatedAt: null,
      value: "REFUND_NOT_REQUESTED",
    },
    return: {
      kind: "return" as const,
      label: "No return requested",
      updatedAt: null,
      value: "RETURN_NOT_REQUESTED",
    },
    subtotalCentavos: 3998,
    totalCentavos: 3998,
    totalQuantity: 2,
    updatedAt,
  };
}

function customerOrderDetail() {
  return {
    ...customerOrderSummary(),
    items: [
      {
        imageR2Key: null,
        lineTotalCentavos: 3998,
        productName: "Frozen Linen Shirt",
        productSlug: "frozen-linen-shirt",
        quantity: 2,
        unitPriceCentavos: 1999,
        variantLabel: "Size: Small",
        variantOptions: [{ group: "Size", name: "Small" }],
      },
    ],
  };
}

function featureFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? featureFiles(path) : [path];
  });
}

describe("customer account UI", () => {
  it("renders the customer account selector and desktop sidebar without the removed header chrome", () => {
    const markup = renderToStaticMarkup(
      createElement(AccountDashboardShell, {
        children: createElement("p", null, "Order history"),
        currentSection: "orders",
      })
    );

    expect(markup).toContain("Account space");
    expect(markup).toContain("<summary");
    expect(markup).toContain(">Orders</span>");
    expect(markup).toContain("grid lg:min-h-screen");
    expect(markup).not.toContain("grid min-h-screen lg:grid-cols");
    expect(markup).toContain('href="/account/profile"');
    expect(markup).toContain(">Profile</a>");
    expect(markup).toContain('href="/account/orders"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain(">Orders</a>");
    expect(markup).not.toContain("Storefront home");
    expect(markup).not.toContain(">Menu</button>");
    expect(markup).not.toContain(">Close</button>");
    expect(markup).not.toContain("Private workspace");
    expect(markup).not.toContain("Account workspace summary");
  });

  it("renders Customer sign-in and Google OAuth actions with a safe return path", () => {
    const markup = renderToStaticMarkup(
      createElement(CustomerSignInPanel, {
        returnTo: "/account/orders?tab=open",
      })
    );

    expect(markup).toContain("Welcome back.");
    expect(markup).toContain('type="email"');
    expect(markup).toContain('type="password"');
    expect(markup).toContain("Continue with Google");
    expect(markup).toContain(
      "/api/oauth/google/sessions?returnTo=%2Faccount%2Forders%3Ftab%3Dopen"
    );
  });

  it("preserves receipt account return target after registration success", () => {
    const markup = renderToStaticMarkup(
      createElement(CustomerRegistrationSuccess, {
        signInHref: "/account/sign-in?returnTo=%2Faccount%2Forders",
      })
    );

    expect(markup).toContain("Verify your email");
    expect(markup).toContain("/account/sign-in?returnTo=%2Faccount%2Forders");
  });

  it("renders registration privacy copy and a response-independent verification state", () => {
    const formMarkup = renderToStaticMarkup(
      createElement(CustomerRegisterPanel)
    );
    const successMarkup = renderToStaticMarkup(
      createElement(CustomerRegistrationSuccess)
    );

    expect(formMarkup).toContain("Create account.");
    expect(formMarkup).toContain("Use an email you can verify.");
    expect(formMarkup).toContain("Confirm password");
    expect(formMarkup).toContain("Send me JRW. updates and product notices.");
    expect(formMarkup).not.toContain("Display name");
    expect(successMarkup).toContain("Verify your email");
    expect(successMarkup).toContain("Open the verification email we sent");
    expect(successMarkup).not.toMatch(/token|session|provider/i);
  });

  it("uses existing sign-in and registration endpoints for success and safe failure", async () => {
    const signInFetcher = vi.fn(async () =>
      jsonResponse({
        data: {
          actor: {
            accountStatus: {
              approved: true,
              emailVerified: true,
              status: "ACTIVE",
            },
            id: "customer_1",
            role: "CUSTOMER",
          },
          session: { expiresAt: "2026-06-28T00:00:00.000Z" },
        },
      })
    );
    const registrationFetcher = vi.fn(async () =>
      jsonResponse(
        {
          data: {
            customer: customerProfile(),
            verificationEmail: { sent: true },
          },
        },
        201
      )
    );

    await expect(
      signInCustomer(
        { email: "nina@example.com", password: "password123" },
        signInFetcher as typeof fetch
      )
    ).resolves.toMatchObject({ actor: { role: "CUSTOMER" } });
    await expect(
      registerCustomer(
        {
          email: "nina@example.com",
          password: "password123",
        },
        registrationFetcher as typeof fetch
      )
    ).resolves.toMatchObject({ verificationEmail: { sent: true } });

    expect(signInFetcher).toHaveBeenCalledWith(
      "/api/customer/auth/sessions",
      expect.objectContaining({ method: "POST" })
    );
    expect(registrationFetcher).toHaveBeenCalledWith(
      "/api/customers",
      expect.objectContaining({ method: "POST" })
    );

    const failureFetcher = vi.fn(async () =>
      jsonResponse(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "database password_hash raw-session-token",
          },
        },
        500
      )
    );
    const rawFailure = await signInCustomer(
      { email: "nina@example.com", password: "wrong-password" },
      failureFetcher as typeof fetch
    ).catch((error: unknown) => error);

    expect(rawFailure).toBeInstanceOf(CustomerAccountApiError);
    expect(customerAccountErrorMessage("sign-in", rawFailure)).toBe(
      "We could not sign you in. Please try again."
    );
    expect(customerAccountErrorMessage("register", rawFailure)).not.toContain(
      "raw-session-token"
    );
  });

  it("loads receipt registration prefill without raw email in URL", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ data: { email: "nina@example.com" } }));

    await expect(
      getCustomerRegistrationPrefill(
        "signed.receipt.context",
        fetcher as typeof fetch
      )
    ).resolves.toEqual({ email: "nina@example.com" });

    expect(fetcher).toHaveBeenCalledWith(
      "/api/customers/registration-prefill?receiptContext=signed.receipt.context",
      expect.objectContaining({ credentials: "same-origin" })
    );
    expect(fetcher.mock.calls[0]?.[0]).not.toContain("nina@example.com");
  });

  it("loads and updates only allowed Customer profile fields", async () => {
    const profile = customerProfile();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: profile }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { ...profile, displayName: "Nina R." } })
      );

    await expect(getCustomerProfile(fetcher)).resolves.toEqual(profile);
    await expect(
      updateCustomerProfile(
        { displayName: "Nina R.", emailMarketingOptIn: true },
        fetcher
      )
    ).resolves.toMatchObject({ displayName: "Nina R." });

    expect(fetcher.mock.calls[0]).toEqual([
      "/api/customers/me",
      expect.objectContaining({ credentials: "same-origin" }),
    ]);
    expect(fetcher.mock.calls[1]).toEqual([
      "/api/customers/me",
      expect.objectContaining({
        body: JSON.stringify({
          displayName: "Nina R.",
          emailMarketingOptIn: true,
        }),
        method: "PATCH",
      }),
    ]);
  });

  it("loads customer orders without raw email lookup", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            items: [customerOrderSummary()],
            pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
          },
        })
      )
      .mockResolvedValueOnce(jsonResponse({ data: customerOrderDetail() }));

    await expect(
      getCustomerOrders({ page: 1, pageSize: 20 }, fetcher)
    ).resolves.toMatchObject({ items: [{ orderNumber: "JRW-2026-ORDER1" }] });
    await expect(
      getCustomerOrder("JRW-2026-ORDER1", fetcher)
    ).resolves.toMatchObject({
      items: [{ productName: "Frozen Linen Shirt" }],
    });

    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "/api/customer/orders?page=1&pageSize=20"
    );
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      "/api/customer/orders/JRW-2026-ORDER1"
    );
    expect(
      fetcher.mock.calls.map((call) => String(call[0])).join(" ")
    ).not.toMatch(/email=|nina@example|phone|address/i);
  });

  it("renders customer order list with safe lane labels and touch targets", () => {
    const markup = renderToStaticMarkup(
      createElement(CustomerOrdersView, {
        orders: [customerOrderSummary()],
        pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
      })
    );

    expect(markup).toContain("JRW-2026-ORDER1");
    expect(markup).toContain("Payment paid");
    expect(markup).toContain("Shipped");
    expect(markup).toContain("No return requested");
    expect(markup).toContain("No refund requested");
    expect(markup).toContain("PHP 39.98");
    expect(markup).toContain('href="/account/orders/order_1"');
    expect(markup).toContain("min-h-control-md");
    expect(markup).toContain("rounded-none");
    expect(markup).not.toMatch(
      /checkout_url|providerCheckoutSession|PayMongo payload|nina@example|0917|Sampaguita|token|secret|signature|card/i
    );
  });

  it("renders customer order pagination controls for older orders", () => {
    const markup = renderToStaticMarkup(
      createElement(CustomerOrdersView, {
        onPageChange: () => undefined,
        orders: [customerOrderSummary()],
        pagination: { page: 2, pageSize: 20, totalItems: 41, totalPages: 3 },
      })
    );

    expect(markup).toContain("Order pagination");
    expect(markup).toContain("Previous");
    expect(markup).toContain("Next");
    expect(markup).toContain("Page 2 of 3");
    expect(markup).toContain("min-h-control-md");
  });

  it("renders customer order detail from snapshot items with no-image fallback", () => {
    const markup = renderToStaticMarkup(
      createElement(CustomerOrderDetailView, { order: customerOrderDetail() })
    );

    expect(markup).toContain("Order truth timeline");
    expect(markup).toContain("Latest update first");
    expect(markup).toContain("Order status");
    expect(markup).toContain("Order placed");
    expect(markup).toContain("Payment confirmed");
    expect(markup).toContain("Your payment was received by JRW.");
    expect(markup).toContain("Frozen Linen Shirt");
    expect(markup).toContain("Size: Small");
    expect(markup).toContain("No image");
    expect(markup).not.toContain("Mutable Catalog Shirt");
    expect(markup).not.toMatch(
      /PAYMENT_PAID|ORDER_PLACED|RETURN_NOT_REQUESTED|REFUND_NOT_REQUESTED/
    );
    expect(markup).not.toMatch(
      /checkout_url|providerCheckoutSession|PayMongo payload|nina@example|0917|Sampaguita|token|secret|signature|card/i
    );
  });

  it("shows accessible field errors and validates profile values before save", () => {
    const fieldMarkup = renderToStaticMarkup(
      createElement(AccountFormField, {
        error: "Enter at least 7 characters.",
        id: "customer-profile-phone",
        label: "Phone",
        type: "tel",
      })
    );

    expect(fieldMarkup).toContain('aria-invalid="true"');
    expect(fieldMarkup).toContain(
      'aria-describedby="customer-profile-phone-error"'
    );
    expect(fieldMarkup).toContain("Enter at least 7 characters.");

    expect(
      validateCustomerProfileForm({
        barangay: "",
        cityProvince: "",
        displayName: "",
        emailMarketingOptIn: false,
        firstName: "",
        lastName: "",
        phone: "123",
        postalCode: "",
        streetAddress: "",
      })
    ).toEqual({ phone: "Enter at least 7 characters." });
  });

  it.each([
    ["/account/profile", undefined],
    ["/account/orders?tab=open#recent", "/account/orders?tab=open#recent"],
    ["https://evil.test/path", undefined],
    ["//evil.test/path", undefined],
    ["/\\evil.test/path", undefined],
    ["/account/profile\n", undefined],
    ["/%61dmin/accounts", undefined],
    ["/%2fadmin/accounts", undefined],
    ["/admin", undefined],
    ["/admin/accounts", undefined],
    ["/api/customers/me", undefined],
  ])("sanitizes Customer return path %s", (value, expected) => {
    expect(sanitizeCustomerReturnTo(value)).toBe(expected);
  });

  it("builds Google OAuth start URL only from a safe Customer return path", () => {
    expect(getGoogleOAuthStartHref("/admin/accounts")).toBe(
      "/api/oauth/google/sessions?returnTo=%2F"
    );
  });

  it("keeps Customer account feature outside Admin realm boundaries", () => {
    const root = dirname(fileURLToPath(import.meta.url));
    const source = featureFiles(root)
      .filter((path) => !path.endsWith(".test.tsx"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(source).not.toMatch(/\/api\/admin\/auth/);
    expect(source).not.toMatch(/Admin(?:Auth)?Repositor/);
    expect(source).not.toContain("jrw_admin_session");
    expect(source).not.toMatch(/SUPER_ADMIN/);
  });
});
