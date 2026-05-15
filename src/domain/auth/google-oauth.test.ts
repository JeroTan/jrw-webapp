import { describe, expect, it } from "vitest";
import {
  createGoogleOAuthCredential,
  evaluateGoogleOAuthLinkDecision,
  evaluateOAuthStateRecord,
  googleProfileUpdatesForEmptyFields,
  hashGoogleOAuthMaterial,
  normalizeOAuthReturnPath,
  type GoogleOAuthCustomerRecord,
} from "./google-oauth";

function customer(
  overrides: Partial<GoogleOAuthCustomerRecord> = {}
): GoogleOAuthCustomerRecord {
  return {
    id: "customer_1",
    email: "buyer@example.test",
    status: "ACTIVE",
    emailVerifiedAt: null,
    displayName: "Local Name",
    firstName: "Local",
    lastName: "",
    avatarUrl: null,
    ...overrides,
  };
}

describe("google oauth domain decisions", () => {
  it("creates high-entropy state and nonce credentials with 10-minute max TTL", async () => {
    const credential = await createGoogleOAuthCredential({
      now: new Date("2026-05-15T00:00:00.000Z"),
      ttlSeconds: 60 * 60,
    });

    expect(credential.state.length).toBeGreaterThanOrEqual(40);
    expect(credential.nonce.length).toBeGreaterThanOrEqual(40);
    expect(credential.stateHash).toHaveLength(64);
    expect(credential.nonceHash).toHaveLength(64);
    expect(credential.stateHash).not.toBe(credential.state);
    expect(credential.nonceHash).not.toBe(credential.nonce);
    expect(credential.expiresAt).toBe("2026-05-15T00:10:00.000Z");
  });

  it("normalizes only same-origin relative return paths", () => {
    expect(normalizeOAuthReturnPath("/account/orders?tab=open")).toBe(
      "/account/orders?tab=open"
    );
    expect(normalizeOAuthReturnPath(undefined)).toBe("/");
    expect(normalizeOAuthReturnPath("https://evil.example/path")).toBe("/");
    expect(normalizeOAuthReturnPath("//evil.example/path")).toBe("/");
    expect(normalizeOAuthReturnPath("javascript:alert(1)")).toBe("/");
    expect(normalizeOAuthReturnPath("/safe\npath")).toBe("/");
  });

  it("validates OAuth state as present, unexpired, and unused", async () => {
    const now = new Date("2026-05-15T00:00:00.000Z");
    const stateHash = await hashGoogleOAuthMaterial("raw-state");

    expect(evaluateOAuthStateRecord({ record: null, now })).toEqual({
      ok: false,
      code: "RESOURCE_NOT_FOUND",
      reason: "MISSING",
    });
    expect(
      evaluateOAuthStateRecord({
        record: {
          id: "state_1",
          provider: "GOOGLE",
          stateHash,
          nonceHash: "nonce-hash",
          redirectPath: "/account",
          expiresAt: "2026-05-14T00:00:00.000Z",
          usedAt: null,
        },
        now,
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "EXPIRED",
    });
    expect(
      evaluateOAuthStateRecord({
        record: {
          id: "state_1",
          provider: "GOOGLE",
          stateHash,
          nonceHash: "nonce-hash",
          redirectPath: "/account",
          expiresAt: "2026-05-16T00:00:00.000Z",
          usedAt: "2026-05-15T00:00:00.000Z",
        },
        now,
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "USED",
    });
  });

  it("allows linked customers, safe auto-link, and new customer creation only for verified Google email", () => {
    const identity = {
      sub: "google-sub-1",
      email: "buyer@example.test",
      emailVerified: true,
      name: "Google Buyer",
    };

    expect(
      evaluateGoogleOAuthLinkDecision({
        identity,
        providerLink: { customerId: "customer_1", customer: customer() },
        customerByEmail: customer(),
        adminEmailExists: false,
      })
    ).toMatchObject({ action: "sign-in-linked", customerId: "customer_1" });
    expect(
      evaluateGoogleOAuthLinkDecision({
        identity,
        providerLink: null,
        customerByEmail: customer(),
        adminEmailExists: false,
      })
    ).toMatchObject({ action: "link-existing-customer" });
    expect(
      evaluateGoogleOAuthLinkDecision({
        identity,
        providerLink: null,
        customerByEmail: null,
        adminEmailExists: false,
      })
    ).toMatchObject({ action: "create-customer" });
    expect(
      evaluateGoogleOAuthLinkDecision({
        identity: { ...identity, emailVerified: false },
        providerLink: null,
        customerByEmail: null,
        adminEmailExists: false,
      })
    ).toMatchObject({ ok: false, code: "AUTHENTICATION" });
  });

  it("rejects unsafe admin collisions, provider/customer mismatch, and inactive customers", () => {
    const identity = {
      sub: "google-sub-1",
      email: "buyer@example.test",
      emailVerified: true,
    };

    expect(
      evaluateGoogleOAuthLinkDecision({
        identity,
        providerLink: null,
        customerByEmail: customer(),
        adminEmailExists: true,
      })
    ).toMatchObject({ ok: false, code: "AUTH_FORBIDDEN" });
    expect(
      evaluateGoogleOAuthLinkDecision({
        identity,
        providerLink: {
          customerId: "customer_2",
          customer: customer({ id: "customer_2" }),
        },
        customerByEmail: customer({ id: "customer_1" }),
        adminEmailExists: false,
      })
    ).toMatchObject({ ok: false, code: "CONFLICT_STATE" });
    expect(
      evaluateGoogleOAuthLinkDecision({
        identity,
        providerLink: null,
        customerByEmail: customer({ status: "SUSPENDED" }),
        adminEmailExists: false,
      })
    ).toMatchObject({ ok: false, code: "ACCOUNT_SUSPENDED" });
  });

  it("fills only empty local profile fields from Google claims", () => {
    expect(
      googleProfileUpdatesForEmptyFields({
        customer: customer({
          displayName: "Local Name",
          firstName: "",
          lastName: null,
          avatarUrl: null,
        }),
        identity: {
          sub: "google-sub-1",
          email: "buyer@example.test",
          emailVerified: true,
          name: "Google Buyer",
          givenName: "Google",
          familyName: "Buyer",
          picture: "https://example.test/avatar.png",
        },
      })
    ).toEqual({
      firstName: "Google",
      lastName: "Buyer",
      avatarUrl: "https://example.test/avatar.png",
      emailVerifiedAt: expect.any(String),
    });
  });
});
