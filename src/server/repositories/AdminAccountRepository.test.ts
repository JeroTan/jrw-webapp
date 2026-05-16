import { describe, expect, it } from "vitest";
import {
  adminAccountRecordFromRow,
  adminSessionRevocationValues,
} from "./AdminAccountRepository";

describe("AdminAccountRepository helpers", () => {
  it("maps admin rows to safe records without secrets or provider internals", () => {
    const record = adminAccountRecordFromRow({
      id: "admin_1",
      email: "ops@example.test",
      password_hash: "pbkdf2-secret-hash",
      password_salt: "secret-salt",
      is_owner: false,
      status: "ACTIVE",
      email_verified_at: "2026-05-16T00:00:00.000Z",
      approved_at: "2026-05-16T00:00:00.000Z",
      suspension_reason: null,
      rejection_reason: null,
      created_at: "2026-05-16T00:00:00.000Z",
      updated_at: "2026-05-16T00:00:00.000Z",
      reset_token_hash: "reset-secret",
      provider_metadata: { token: "provider-secret" },
    });

    expect(record).toEqual({
      id: "admin_1",
      email: "ops@example.test",
      role: "ADMIN",
      status: "ACTIVE",
      isOwner: false,
      emailVerifiedAt: "2026-05-16T00:00:00.000Z",
      approvedAt: "2026-05-16T00:00:00.000Z",
      suspensionReason: null,
      rejectionReason: null,
      createdAt: "2026-05-16T00:00:00.000Z",
      updatedAt: "2026-05-16T00:00:00.000Z",
    });
    expect(JSON.stringify(record)).not.toContain("pbkdf2-secret-hash");
    expect(JSON.stringify(record)).not.toContain("secret-salt");
    expect(JSON.stringify(record)).not.toContain("reset-secret");
    expect(JSON.stringify(record)).not.toContain("provider-secret");
  });

  it("builds target-only dashboard session invalidation values", () => {
    expect(
      adminSessionRevocationValues({
        targetAdminId: "admin_1",
        revokedAt: "2026-05-16T12:33:19.000Z",
      })
    ).toEqual({
      actorKind: "ADMIN",
      actorId: "admin_1",
      status: "REVOKED",
      revokedAt: "2026-05-16T12:33:19.000Z",
      updatedAt: "2026-05-16T12:33:19.000Z",
    });
  });
});
