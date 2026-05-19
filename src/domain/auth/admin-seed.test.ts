import { describe, expect, it } from "vitest";
import {
  buildAdminSeedSql,
  buildSeededAdminCountSql,
  buildSeededOwnerEmailConflictSql,
  decideAdminSeedOperation,
  validateAdminSeedCredentials,
} from "./admin-seed";

describe("admin seed decision", () => {
  it("plans approved non-owner admin insert when no matching admin exists", () => {
    expect(
      decideAdminSeedOperation({
        adminCount: 0,
        ownerEmailConflictCount: 0,
        targetEnv: "development",
      })
    ).toEqual({
      ok: true,
      operation: "create-admin",
      warnings: [],
    });
  });

  it("refreshes an existing non-owner admin without owner promotion", () => {
    expect(
      decideAdminSeedOperation({
        adminCount: 1,
        ownerEmailConflictCount: 0,
        targetEnv: "development",
      })
    ).toEqual({
      ok: true,
      operation: "update-admin-credentials",
      warnings: [
        "Existing non-owner Admin found. Password and active approval state will be refreshed.",
      ],
    });
  });

  it("refuses to seed when email belongs to the owner", () => {
    expect(
      decideAdminSeedOperation({
        adminCount: 0,
        ownerEmailConflictCount: 1,
        targetEnv: "development",
      })
    ).toMatchObject({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "OWNER_EMAIL_CONFLICT",
    });
  });

  it("fails closed for production unless reviewed confirmation exists", () => {
    expect(
      decideAdminSeedOperation({
        adminCount: 0,
        ownerEmailConflictCount: 0,
        targetEnv: "production",
      })
    ).toMatchObject({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "PRODUCTION_REVIEW_REQUIRED",
    });

    expect(
      decideAdminSeedOperation({
        adminCount: 0,
        ownerEmailConflictCount: 0,
        targetEnv: "production",
        productionSeedConfirmation: "REVIEWED_PRODUCTION_ADMIN_SEED",
      })
    ).toMatchObject({
      ok: true,
      operation: "create-admin",
    });
  });

  it("validates credentials without rejecting example addresses", () => {
    const password = "  correct horse battery staple  ";

    expect(
      validateAdminSeedCredentials({
        email: "Admin@Example.Test",
        password,
      })
    ).toEqual({
      ok: true,
      email: "admin@example.test",
      password,
    });

    expect(
      validateAdminSeedCredentials({
        email: "not-an-email",
        password: "some-long-enough-password-value",
      })
    ).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      message: "Admin seed credentials are missing or invalid.",
    });
  });

  it("builds non-owner upsert SQL and owner conflict checks safely", () => {
    expect(buildSeededAdminCountSql("admin'o@example.test")).toBe(
      "SELECT COUNT(*) AS admin_count FROM admins WHERE is_owner = 0 AND email = 'admin''o@example.test';"
    );
    expect(buildSeededOwnerEmailConflictSql("admin'o@example.test")).toBe(
      "SELECT COUNT(*) AS owner_count FROM admins WHERE is_owner <> 0 AND email = 'admin''o@example.test';"
    );
    expect(
      buildAdminSeedSql({
        id: "admin_1",
        email: "admin@example.test",
        passwordHash: "hash'value",
        passwordSalt: "salt'value",
      })
    ).toContain(
      "is_owner = 0, status = 'ACTIVE', email_verified_at = CURRENT_TIMESTAMP, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE admins.is_owner = 0;"
    );
  });
});
