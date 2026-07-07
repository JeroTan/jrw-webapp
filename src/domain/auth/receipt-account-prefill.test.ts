import { describe, expect, it } from "vitest";
import {
  createReceiptAccountPrefillToken,
  parseReceiptAccountPrefillToken,
  RECEIPT_ACCOUNT_PREFILL_PURPOSE,
} from "./receipt-account-prefill";

describe("receipt account prefill token", () => {
  it("signs checkout context without embedding email", async () => {
    const token = await createReceiptAccountPrefillToken({
      attemptId: "attempt_1",
      paymentId: "payment_1",
      secretKey: "test-secret",
    });

    expect(token).toEqual(expect.any(String));
    expect(token).not.toContain("nina@example.com");
    await expect(
      parseReceiptAccountPrefillToken({
        secretKey: "test-secret",
        token: token ?? "",
      })
    ).resolves.toMatchObject({
      attemptId: "attempt_1",
      paymentId: "payment_1",
      purpose: RECEIPT_ACCOUNT_PREFILL_PURPOSE,
    });
  });

  it("rejects invalid or wrong-secret context", async () => {
    await expect(
      parseReceiptAccountPrefillToken({
        secretKey: "test-secret",
        token: "not-a-jwt",
      })
    ).resolves.toBeNull();

    const token = await createReceiptAccountPrefillToken({
      attemptId: "attempt_1",
      paymentId: "payment_1",
      secretKey: "test-secret",
    });

    await expect(
      parseReceiptAccountPrefillToken({
        secretKey: "other-secret",
        token: token ?? "",
      })
    ).resolves.toBeNull();
  });
});
