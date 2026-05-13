import { describe, expect, it } from "vitest";
import { verifyPassword } from "@/lib/crypto/password";
import {
  createCustomerPasswordCredential,
  evaluateEmailVerificationTokenState,
  evaluateRegistrationAccountState,
  normalizeCustomerEmail,
  validateCustomerProfileUpdate,
  validateCustomerRegistration,
} from "./customer-account";

describe("customer account domain helpers", () => {
  it("normalizes customer emails and rejects case-insensitive duplicates safely", () => {
    expect(normalizeCustomerEmail("  Customer@Example.TEST ")).toBe(
      "customer@example.test"
    );

    expect(
      evaluateRegistrationAccountState({
        existingCustomerId: "customer_1",
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "DUPLICATE_EMAIL",
    });

    expect(evaluateRegistrationAccountState({ existingCustomerId: null })).toEqual({
      ok: true,
    });
  });

  it("creates PBKDF2 customer password credentials through approved crypto helper", async () => {
    const credential = await createCustomerPasswordCredential({
      password: "correct horse battery staple",
      pepper: "test-pepper-value",
      hashOptions: {
        iterations: 1,
        saltBytes: 4,
      },
    });

    expect(credential.passwordHash).toMatch(/^pbkdf2-sha256\$/);
    expect(credential.passwordSalt).toEqual(expect.any(String));
    await expect(
      verifyPassword(
        "correct horse battery staple",
        "test-pepper-value",
        credential.passwordHash,
        credential.passwordSalt
      )
    ).resolves.toBe(true);
  });

  it("validates and trims registration profile fields", () => {
    const result = validateCustomerRegistration({
      email: " Buyer@Example.TEST ",
      password: "correct horse battery staple",
      displayName: "  JRW Buyer  ",
      firstName: "  Juan  ",
      lastName: "  Buyer  ",
      phone: " +63 917 123 4567 ",
      streetAddress: "  123 Sample St  ",
      barangay: "  Barangay 1  ",
      cityProvince: "  Cebu City  ",
      postalCode: "  6000  ",
      emailMarketingOptIn: true,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        email: "buyer@example.test",
        password: "correct horse battery staple",
        profile: {
          displayName: "JRW Buyer",
          firstName: "Juan",
          lastName: "Buyer",
          phone: "+63 917 123 4567",
          streetAddress: "123 Sample St",
          barangay: "Barangay 1",
          cityProvince: "Cebu City",
          postalCode: "6000",
          emailMarketingOptIn: true,
        },
      },
    });
  });

  it("rejects invalid registration and profile input", () => {
    expect(
      validateCustomerRegistration({
        email: "bad-email",
        password: "short",
      })
    ).toMatchObject({
      ok: false,
      code: "VALIDATION_FAILED",
    });

    expect(
      validateCustomerProfileUpdate({
        displayName: "",
        phone: "not a phone number!!!",
      })
    ).toMatchObject({
      ok: false,
      code: "VALIDATION_FAILED",
    });
  });

  it("evaluates verification token states without exposing token internals", () => {
    const now = new Date("2026-05-13T00:00:00.000Z");

    expect(evaluateEmailVerificationTokenState({ record: null, now })).toEqual({
      ok: false,
      code: "RESOURCE_NOT_FOUND",
      reason: "INVALID",
    });
    expect(
      evaluateEmailVerificationTokenState({
        record: {
          customerId: "customer_1",
          expiresAt: "2026-05-14T00:00:00.000Z",
          usedAt: "2026-05-13T00:00:00.000Z",
        },
        now,
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "USED",
    });
    expect(
      evaluateEmailVerificationTokenState({
        record: {
          customerId: "customer_1",
          expiresAt: "2026-05-12T23:59:59.000Z",
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
      evaluateEmailVerificationTokenState({
        record: {
          customerId: "customer_1",
          expiresAt: "2026-05-14T00:00:00.000Z",
          usedAt: null,
        },
        now,
      })
    ).toEqual({
      ok: true,
      customerId: "customer_1",
    });
  });

  it("normalizes profile updates and drops unsupported fields", () => {
    const result = validateCustomerProfileUpdate({
      displayName: "  New Name  ",
      phone: " 0917 123 4567 ",
      streetAddress: "  New street  ",
      emailMarketingOptIn: false,
      role: "ADMIN",
      emailVerifiedAt: "2026-05-13T00:00:00.000Z",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        displayName: "New Name",
        phone: "0917 123 4567",
        streetAddress: "New street",
        emailMarketingOptIn: false,
      },
    });
  });
});
