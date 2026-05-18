import { describe, expect, it } from "vitest";
import {
  buildOwnerCountSql,
  buildSeededOwnerCountSql,
  buildSuperAdminSeedSql,
  decideSuperAdminSeedOperation,
  validatePasswordPepper,
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

  it("chooses dethrone-and-create when seed email differs from current owner", () => {
    expect(
      decideSuperAdminSeedOperation({
        ownerCount: 1,
        targetEnv: "development",
        currentOwnerEmail: "old-owner@example.test",
        seedEmail: "new-owner@example.test",
      })
    ).toEqual({
      ok: true,
      operation: "dethrone-and-create-owner",
      warnings: [
        "Current owner (old-owner@example.test) will be demoted to ADMIN.",
        "New owner will be created with seed email (new-owner@example.test).",
      ],
    });
  });

  it("chooses no-op when seed email matches current owner", () => {
    expect(
      decideSuperAdminSeedOperation({
        ownerCount: 1,
        targetEnv: "development",
        currentOwnerEmail: "owner@example.test",
        seedEmail: "owner@example.test",
      })
    ).toEqual({
      ok: true,
      operation: "no-op",
      warnings: [
        "Seed email matches current owner. No changes needed.",
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
        productionSeedConfirmation: "REVIEWED_PRODUCTION_SUPER_ADMIN_SEED",
      })
    ).toMatchObject({
      ok: true,
      operation: "create-owner",
    });
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

  it("validates credentials with email format and password length only", () => {
    const password = "  correct horse battery staple  ";

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

    // Invalid email format
    expect(
      validateSuperAdminSeedCredentials({
        email: "not-an-email",
        password: "some-long-enough-password-value",
      })
    ).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      message: "Super Admin seed credentials are missing or invalid.",
    });

    // Password too short
    expect(
      validateSuperAdminSeedCredentials({
        email: "owner@example.test",
        password: "short",
      })
    ).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      message: "Super Admin seed credentials are missing or invalid.",
    });
  });

  it("requires a pepper with minimum length without echoing it", () => {
    expect(validatePasswordPepper("secret-pepper-value")).toEqual({
      ok: true,
      pepper: "secret-pepper-value",
    });

    const invalid = validatePasswordPepper("short");

    expect(invalid).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      message: "Password pepper is missing or invalid.",
    });
    expect(JSON.stringify(invalid)).not.toContain("short");
  });

  it("uses non-zero owner checks and safe no-owner upsert SQL", () => {
    expect(buildOwnerCountSql()).toBe(
      "SELECT COUNT(*) AS owner_count FROM admins WHERE is_owner <> 0;"
    );
    expect(buildSeededOwnerCountSql("owner'o@example.test")).toBe(
      "SELECT COUNT(*) AS owner_count FROM admins WHERE is_owner <> 0 AND email = 'owner''o@example.test';"
    );
    expect(
      buildSuperAdminSeedSql({
        id: "admin_1",
        email: "owner@example.test",
        passwordHash: "hash'value",
        passwordSalt: "salt'value",
        operation: "create-owner",
      })
    ).toContain(
      "ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash, password_salt = excluded.password_salt, is_owner = 1, status = 'ACTIVE', email_verified_at = CURRENT_TIMESTAMP, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM admins WHERE is_owner <> 0);"
    );
    expect(
      buildSuperAdminSeedSql({
        id: "unused",
        email: "owner@example.test",
        passwordHash: "hash",
        passwordSalt: "salt",
        operation: "replace-owner-credentials",
      })
    ).toContain(
      "password_salt = 'salt', status = 'ACTIVE', email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP), approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE is_owner <> 0;"
    );
    expect(
      buildSuperAdminSeedSql({
        id: "new_owner_1",
        email: "new-owner@example.test",
        passwordHash: "hash",
        passwordSalt: "salt",
        operation: "dethrone-and-create-owner",
      })
    ).toContain(
      "UPDATE admins SET is_owner = 0, updated_at = CURRENT_TIMESTAMP WHERE is_owner <> 0;"
    );
    expect(
      buildSuperAdminSeedSql({
        id: "new_owner_1",
        email: "new-owner@example.test",
        passwordHash: "hash",
        passwordSalt: "salt",
        operation: "dethrone-and-create-owner",
      })
    ).toContain(
      "INSERT INTO admins (id, email, password_hash, password_salt, is_owner, status, email_verified_at, approved_at, updated_at)"
    );
  });
});
