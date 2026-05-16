import { describe, expect, it } from "vitest";
import {
  applyAdminApproval,
  applyAdminCreationDefaults,
  applyAdminReactivation,
  applyAdminRejection,
  applyAdminSuspension,
  evaluateAdminLifecycleActor,
  normalizeAdminEmail,
  validateAdminAccountCreate,
  validateAdminAccountUpdate,
} from "./admin-account";

const now = "2026-05-16T12:33:19.000Z";

const pendingAdmin = {
  id: "admin_1",
  email: "ops@example.test",
  role: "ADMIN" as const,
  status: "ACTIVE" as const,
  isOwner: false,
  emailVerifiedAt: now,
  approvedAt: null,
};

describe("admin account lifecycle domain decisions", () => {
  it("normalizes and validates create/update input without allowing role or owner mutation", () => {
    expect(normalizeAdminEmail("  Ops@Example.TEST ")).toBe("ops@example.test");

    expect(
      validateAdminAccountCreate({
        email: "  Ops@Example.TEST ",
        password: "correct horse battery staple",
        sendInvitationEmail: true,
        role: "SUPER_ADMIN",
        isOwner: true,
      })
    ).toEqual({
      ok: true,
      value: {
        email: "ops@example.test",
        password: "correct horse battery staple",
        sendInvitationEmail: true,
      },
    });

    expect(
      validateAdminAccountUpdate({
        email: "  NewOps@Example.TEST ",
        status: "SUSPENDED",
        approvedAt: now,
      })
    ).toEqual({
      ok: true,
      value: {
        email: "newops@example.test",
      },
    });

    expect(
      validateAdminAccountCreate({
        email: "bad-email",
        password: "short",
      })
    ).toMatchObject({
      ok: false,
      code: "VALIDATION_FAILED",
      reasons: expect.arrayContaining(["email:format", "password:length"]),
    });
  });

  it("allows only authenticated Super Admin actors to mutate admin accounts", () => {
    expect(
      evaluateAdminLifecycleActor({
        authenticated: false,
        role: "PROSPECT",
      })
    ).toEqual({
      ok: false,
      code: "AUTH_REQUIRED",
      reason: "AUTH_REQUIRED",
    });

    expect(
      evaluateAdminLifecycleActor({
        authenticated: true,
        role: "ADMIN",
      })
    ).toEqual({
      ok: false,
      code: "AUTH_FORBIDDEN",
      reason: "SUPER_ADMIN_REQUIRED",
    });

    expect(
      evaluateAdminLifecycleActor({
        authenticated: true,
        role: "SUPER_ADMIN",
      })
    ).toEqual({ ok: true });
  });

  it("creates admins as non-owner ADMIN accounts and keeps deprecated aliases out", () => {
    expect(
      applyAdminCreationDefaults({
        email: "ops@example.test",
        passwordHash: "hash",
        passwordSalt: "salt",
        now,
      })
    ).toEqual({
      email: "ops@example.test",
      passwordHash: "hash",
      passwordSalt: "salt",
      role: "ADMIN",
      isOwner: false,
      status: "ACTIVE",
      emailVerifiedAt: now,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  });

  it("approves, rejects, suspends, and reactivates non-owner admins with safe transition results", () => {
    expect(applyAdminApproval({ account: pendingAdmin, now })).toEqual({
      ok: true,
      patch: {
        status: "ACTIVE",
        approvedAt: now,
        rejectionReason: null,
        updatedAt: now,
      },
    });

    expect(
      applyAdminRejection({
        account: pendingAdmin,
        reason: "Missing employment verification",
        now,
      })
    ).toEqual({
      ok: true,
      patch: {
        status: "INACTIVE",
        approvedAt: null,
        rejectionReason: "Missing employment verification",
        updatedAt: now,
        revokeDashboardSessions: true,
      },
    });

    expect(
      applyAdminSuspension({
        account: { ...pendingAdmin, approvedAt: now },
        reason: "Policy review",
        now,
      })
    ).toEqual({
      ok: true,
      patch: {
        status: "SUSPENDED",
        suspensionReason: "Policy review",
        updatedAt: now,
        revokeDashboardSessions: true,
      },
    });

    expect(
      applyAdminReactivation({
        account: {
          ...pendingAdmin,
          status: "SUSPENDED",
          approvedAt: now,
        },
        now,
      })
    ).toEqual({
      ok: true,
      patch: {
        status: "ACTIVE",
        suspensionReason: null,
        rejectionReason: null,
        updatedAt: now,
      },
    });
  });

  it("denies owner mutation and invalid lifecycle transitions", () => {
    expect(
      applyAdminSuspension({
        account: {
          ...pendingAdmin,
          role: "SUPER_ADMIN" as const,
          isOwner: true,
          approvedAt: now,
        },
        reason: "Nope",
        now,
      })
    ).toEqual({
      ok: false,
      code: "AUTH_FORBIDDEN",
      reason: "OWNER_IMMUTABLE",
    });

    expect(
      applyAdminApproval({
        account: { ...pendingAdmin, approvedAt: now },
        now,
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "ALREADY_APPROVED",
    });

    expect(
      applyAdminReactivation({
        account: { ...pendingAdmin, approvedAt: now },
        now,
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "NOT_SUSPENDED_OR_INACTIVE",
    });
  });
});
