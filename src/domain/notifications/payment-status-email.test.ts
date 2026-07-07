import { describe, expect, it } from "vitest";
import { paymentStatusEmailSubject } from "./payment-status-email";

describe("payment status email domain", () => {
  it("uses safe status-specific subjects without provider details", () => {
    expect(
      paymentStatusEmailSubject({
        paymentStatusLabel: "Payment expired",
        referenceLabel: "payment_1",
      })
    ).toBe("JRW payment update: Payment expired");
    expect(
      paymentStatusEmailSubject({
        paymentStatusLabel: "Payment cancelled",
        referenceLabel: "cs_test_secret",
      })
    ).not.toContain("cs_test_secret");
  });
});
