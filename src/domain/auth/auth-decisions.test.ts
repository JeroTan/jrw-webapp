import { describe, expect, it } from "vitest";
import {
  deriveActorRole,
  evaluateAccountEligibility,
  evaluateCredentialFailure,
  evaluateSessionState,
} from "./auth-decisions";

describe("auth decision helpers", () => {
  it("derives active roles from actor kind and owner flag", () => {
    expect(deriveActorRole({ actorKind: "ADMIN", isOwner: true })).toBe(
      "SUPER_ADMIN"
    );
    expect(deriveActorRole({ actorKind: "ADMIN", isOwner: false })).toBe(
      "ADMIN"
    );
    expect(deriveActorRole({ actorKind: "CUSTOMER" })).toBe("CUSTOMER");
  });

  it("maps credential lookup and password failures to one safe public code", () => {
    expect(evaluateCredentialFailure("UNKNOWN_ACCOUNT")).toEqual({
      ok: false,
      code: "AUTHENTICATION",
      reason: "UNKNOWN_ACCOUNT",
    });
    expect(evaluateCredentialFailure("WRONG_PASSWORD")).toEqual({
      ok: false,
      code: "AUTHENTICATION",
      reason: "WRONG_PASSWORD",
    });
    expect(evaluateCredentialFailure("UNSUPPORTED_PASSWORD_HASH")).toEqual({
      ok: false,
      code: "AUTHENTICATION",
      reason: "UNSUPPORTED_PASSWORD_HASH",
    });
  });

  it("denies inactive, suspended, unverified, or unapproved accounts safely", () => {
    expect(
      evaluateAccountEligibility({
        actorKind: "ADMIN",
        status: "SUSPENDED",
        hasPasswordCredential: true,
        isOwner: true,
      })
    ).toMatchObject({ ok: false, code: "ACCOUNT_SUSPENDED" });

    expect(
      evaluateAccountEligibility({
        actorKind: "ADMIN",
        status: "INACTIVE",
        hasPasswordCredential: true,
        isOwner: true,
      })
    ).toMatchObject({ ok: false, code: "AUTH_FORBIDDEN" });

    expect(
      evaluateAccountEligibility({
        actorKind: "CUSTOMER",
        status: "ACTIVE",
        hasPasswordCredential: true,
      })
    ).toMatchObject({ ok: false, code: "EMAIL_NOT_VERIFIED" });

    expect(
      evaluateAccountEligibility({
        actorKind: "ADMIN",
        status: "ACTIVE",
        hasPasswordCredential: true,
        isOwner: false,
        emailVerifiedAt: "2026-05-13T00:00:00.000Z",
      })
    ).toMatchObject({ ok: false, code: "ADMIN_APPROVAL_REQUIRED" });
  });

  it("allows active eligible accounts with password credentials", () => {
    expect(
      evaluateAccountEligibility({
        actorKind: "ADMIN",
        status: "ACTIVE",
        hasPasswordCredential: true,
        isOwner: true,
      })
    ).toEqual({ ok: true });

    expect(
      evaluateAccountEligibility({
        actorKind: "CUSTOMER",
        status: "ACTIVE",
        hasPasswordCredential: true,
        emailVerifiedAt: "2026-05-13T00:00:00.000Z",
      })
    ).toEqual({ ok: true });
  });

  it("classifies missing, expired, revoked, and active sessions", () => {
    const now = new Date("2026-05-13T00:00:00.000Z");

    expect(evaluateSessionState(undefined, now)).toEqual({
      active: false,
      reason: "MISSING",
    });
    expect(
      evaluateSessionState(
        {
          status: "ACTIVE",
          expiresAt: "2026-05-12T23:59:59.000Z",
          revokedAt: null,
        },
        now
      )
    ).toEqual({ active: false, reason: "EXPIRED" });
    expect(
      evaluateSessionState(
        {
          status: "REVOKED",
          expiresAt: "2026-05-14T00:00:00.000Z",
          revokedAt: "2026-05-12T00:00:00.000Z",
        },
        now
      )
    ).toEqual({ active: false, reason: "REVOKED" });
    expect(
      evaluateSessionState(
        {
          status: "ACTIVE",
          expiresAt: "2026-05-14T00:00:00.000Z",
          revokedAt: null,
        },
        now
      )
    ).toEqual({ active: true });
  });
});
