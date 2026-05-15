import { describe, expect, it } from "vitest";
import {
  evaluateEmailVerificationResendState,
  evaluatePasswordResetRequestState,
  evaluatePasswordResetTokenState,
  validateRecoveryEmail,
  validateResetConfirmation,
  type RecoveryAccountRecord,
} from "./account-recovery";

function account(
  overrides: Partial<RecoveryAccountRecord> = {}
): RecoveryAccountRecord {
  return {
    actorKind: "CUSTOMER",
    id: "customer_1",
    email: "buyer@example.test",
    status: "ACTIVE",
    emailVerifiedAt: "2026-05-14T00:00:00.000Z",
    isOwner: false,
    approvedAt: null,
    ...overrides,
  };
}

describe("account recovery domain decisions", () => {
  it("validates public email and reset confirmation inputs", () => {
    expect(validateRecoveryEmail(" Buyer@Example.TEST ").value).toEqual({
      email: "buyer@example.test",
    });
    expect(validateRecoveryEmail("not-email")).toMatchObject({
      ok: false,
      code: "VALIDATION_FAILED",
    });
    expect(
      validateResetConfirmation({
        token: " raw-token ",
        password: "correct horse battery staple",
      }).value
    ).toEqual({
      token: "raw-token",
      password: "correct horse battery staple",
    });
    expect(
      validateResetConfirmation({ token: "raw-token", password: "short" })
    ).toMatchObject({ ok: false, code: "VALIDATION_FAILED" });
  });

  it("creates password reset tokens only for one eligible account", () => {
    expect(
      evaluatePasswordResetRequestState({
        admin: null,
        customer: account(),
      })
    ).toMatchObject({ action: "create-token", account: { id: "customer_1" } });
    expect(
      evaluatePasswordResetRequestState({
        admin: account({ actorKind: "ADMIN", id: "admin_1", isOwner: true }),
        customer: account(),
      })
    ).toEqual({ action: "accept-without-token", reason: "AMBIGUOUS" });
    expect(
      evaluatePasswordResetRequestState({
        admin: null,
        customer: account({ emailVerifiedAt: null }),
      })
    ).toEqual({ action: "accept-without-token", reason: "INELIGIBLE" });
    expect(
      evaluatePasswordResetRequestState({
        admin: null,
        customer: null,
      })
    ).toEqual({ action: "accept-without-token", reason: "MISSING" });
  });

  it("resends verification only for active unverified customers without admin collision", () => {
    expect(
      evaluateEmailVerificationResendState({
        admin: null,
        customer: account({ emailVerifiedAt: null }),
      })
    ).toMatchObject({ action: "create-token", customerId: "customer_1" });
    expect(
      evaluateEmailVerificationResendState({
        admin: null,
        customer: account(),
      })
    ).toEqual({ action: "accept-without-token", reason: "ALREADY_VERIFIED" });
    expect(
      evaluateEmailVerificationResendState({
        admin: account({ actorKind: "ADMIN", id: "admin_1" }),
        customer: account({ emailVerifiedAt: null }),
      })
    ).toEqual({ action: "accept-without-token", reason: "AMBIGUOUS" });
  });

  it("rejects invalid, expired, and used reset tokens safely", () => {
    const now = new Date("2026-05-15T00:00:00.000Z");

    expect(evaluatePasswordResetTokenState({ record: null, now })).toEqual({
      ok: false,
      code: "RESOURCE_NOT_FOUND",
      reason: "INVALID",
    });
    expect(
      evaluatePasswordResetTokenState({
        record: {
          id: "prt_1",
          actorKind: "CUSTOMER",
          actorId: "customer_1",
          tokenHash: "hash",
          expiresAt: "2026-05-14T00:00:00.000Z",
          usedAt: null,
        },
        now,
      })
    ).toEqual({ ok: false, code: "CONFLICT_STATE", reason: "EXPIRED" });
    expect(
      evaluatePasswordResetTokenState({
        record: {
          id: "prt_1",
          actorKind: "CUSTOMER",
          actorId: "customer_1",
          tokenHash: "hash",
          expiresAt: "2026-05-16T00:00:00.000Z",
          usedAt: "2026-05-15T00:00:00.000Z",
        },
        now,
      })
    ).toEqual({ ok: false, code: "CONFLICT_STATE", reason: "USED" });
  });
});
