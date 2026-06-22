import { describe, expect, it, vi } from "vitest";

import { resolveCustomerHeaderAccountState } from "./customer-header-session";

describe("Customer header session state", () => {
  it("does not treat a stale Customer cookie as authenticated", async () => {
    const inspectSession = vi.fn(async () => ({
      authenticated: false as const,
      reason: "invalid_session" as const,
    }));

    await expect(
      resolveCustomerHeaderAccountState({
        inspectSession,
        request: new Request("https://jrw.test/products", {
          headers: {
            cookie: "jrw_customer_session=stale",
            "x-request-id": "req_header_stale",
          },
        }),
      })
    ).resolves.toBe("public");

    expect(inspectSession).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "req_header_stale" })
    );
  });

  it("uses authenticated state only after session inspection succeeds", async () => {
    await expect(
      resolveCustomerHeaderAccountState({
        inspectSession: async () => ({
          actor: { id: "customer_1", role: "CUSTOMER" },
          authenticated: true as const,
        }),
        request: new Request("https://jrw.test/products"),
      })
    ).resolves.toBe("authenticated");
  });
});
