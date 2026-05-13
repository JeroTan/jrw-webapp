import { describe, expect, it } from "vitest";
import {
  REVIEWED_OWNER_CREDENTIAL_REPLACEMENT_CONFIRMATION,
  REVIEWED_PRODUCTION_SUPER_ADMIN_SEED_CONFIRMATION,
  decideSuperAdminSeedOperation,
  validateSuperAdminSeedCredentials,
} from "./super-admin-seed";

describe("super admin seed decision", () => {
  it("plans one owner insert when no owner exists", () => {
    expect(
      decideSuperAdminSeedOperation({
        ownerCount: 0,
        targetEnv: "development",
      })
    ).toEqual({
      ok: true,
      operation: "create-owner",
      warnings: [],
    });
  });

  it("refuses default credential replacement when an owner already exists", () => {
    expect(
      decideSuperAdminSeedOperation({
        ownerCount: 1,
        targetEnv: "development",
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "OWNER_ALREADY_EXISTS",
      message:
        "Super Admin owner already exists. Refusing credential replacement without reviewed confirmation.",
    });
  });

  it("allows credential replacement only with reviewed confirmation", () => {
    expect(
      decideSuperAdminSeedOperation({
        ownerCount: 1,
        targetEnv: "development",
        replaceOwnerCredentialsConfirmation:
          REVIEWED_OWNER_CREDENTIAL_REPLACEMENT_CONFIRMATION,
      })
    ).toEqual({
      ok: true,
      operation: "replace-owner-credentials",
      warnings: [
        "Reviewed owner credential replacement enabled. Existing owner credentials will be replaced.",
      ],
    });
  });

  it("fails closed for production unless reviewed production confirmation exists", () => {
    expect(
      decideSuperAdminSeedOperation({
        ownerCount: 0,
        targetEnv: "production",
      })
    ).toMatchObject({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "PRODUCTION_REVIEW_REQUIRED",
    });

    expect(
      decideSuperAdminSeedOperation({
        ownerCount: 0,
        targetEnv: "production",
        productionSeedConfirmation:
          REVIEWED_PRODUCTION_SUPER_ADMIN_SEED_CONFIRMATION,
      })
    ).toMatchObject({
      ok: true,
      operation: "create-owner",
    });
  });

  it("validates credentials without returning secret material", () => {
    const password = "correct horse battery staple";

    expect(
      validateSuperAdminSeedCredentials({
        email: "owner@example.test",
        password,
      })
    ).toEqual({
      ok: true,
      email: "owner@example.test",
      password,
    });

    const invalid = validateSuperAdminSeedCredentials({
      email: "owner@example.test",
      password: "replace-with-a-long-random-initial-password",
    });

    expect(invalid).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      message: "Super Admin seed credentials are missing or invalid.",
    });
    expect(JSON.stringify(invalid)).not.toContain(
      "replace-with-a-long-random-initial-password"
    );
  });

  it("rejects multiple owners as state conflict", () => {
    expect(
      decideSuperAdminSeedOperation({
        ownerCount: 2,
        targetEnv: "development",
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "MULTIPLE_OWNERS_EXIST",
      message:
        "Multiple Super Admin owners already exist. Manual remediation required before seeding.",
    });
  });
});
