import { describe, expect, it } from "vitest";
import { fulfillmentStatusEmailSubject } from "./fulfillment-status-email";

describe("fulfillment status email domain", () => {
  it("uses safe status-specific subjects without provider details", () => {
    expect(
      fulfillmentStatusEmailSubject({
        fulfillmentStatusLabel: "Shipped",
        orderNumber: "JRW-2026-ORDER1",
      })
    ).toBe("JRW order update: Shipped");
    expect(
      fulfillmentStatusEmailSubject({
        fulfillmentStatusLabel: "Delivered",
        orderNumber: "cs_test_secret",
      })
    ).not.toContain("cs_test_secret");
  });
});
