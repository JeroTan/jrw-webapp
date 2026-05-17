import { describe, expect, it } from "vitest";
import {
  buildOwnershipTransferConfirmationPhrase,
  evaluateOwnershipTransferTarget,
  isEligibleOwnershipTransferTarget,
  validateOwnershipTransferConfirmationPhrase,
  validateOwnershipTransferSubmissionShape,
} from "./ownership-transfer";

const now = "2026-05-17T12:08:00.000Z";

const eligibleTarget = {
  id: "admin_target",
  email: " Target.Admin@Example.TEST ",
  role: "ADMIN" as const,
  status: "ACTIVE" as const,
  isOwner: false,
  emailVerifiedAt: now,
  approvedAt: now,
};

describe("ownership transfer domain rules", () => {
  it("allows only active approved verified non-owner Admin targets", () => {
    expect(isEligibleOwnershipTransferTarget(eligibleTarget)).toBe(true);
    expect(evaluateOwnershipTransferTarget(eligibleTarget)).toEqual({
      ok: true,
      normalizedEmail: "target.admin@example.test",
    });

    expect(
      evaluateOwnershipTransferTarget({
        ...eligibleTarget,
        status: "SUSPENDED",
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "TARGET_NOT_ACTIVE",
    });

    expect(
      evaluateOwnershipTransferTarget({
        ...eligibleTarget,
        status: "INACTIVE",
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "TARGET_NOT_ACTIVE",
    });
  });

  it("rejects unverified, unapproved, current owner, and wrong-role targets", () => {
    expect(
      evaluateOwnershipTransferTarget({
        ...eligibleTarget,
        emailVerifiedAt: null,
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "TARGET_EMAIL_NOT_VERIFIED",
    });

    expect(
      evaluateOwnershipTransferTarget({
        ...eligibleTarget,
        approvedAt: null,
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "TARGET_NOT_APPROVED",
    });

    expect(
      evaluateOwnershipTransferTarget({
        ...eligibleTarget,
        role: "SUPER_ADMIN",
        isOwner: true,
      })
    ).toEqual({
      ok: false,
      code: "AUTH_FORBIDDEN",
      reason: "TARGET_IS_OWNER",
    });

    expect(
      evaluateOwnershipTransferTarget({
        ...eligibleTarget,
        role: "CUSTOMER",
      })
    ).toEqual({
      ok: false,
      code: "AUTH_FORBIDDEN",
      reason: "TARGET_NOT_ADMIN",
    });
  });

  it("builds exact confirmation phrase using normalized target email", () => {
    expect(buildOwnershipTransferConfirmationPhrase(eligibleTarget)).toBe(
      "TRANSFER OWNERSHIP TO target.admin@example.test"
    );

    expect(
      validateOwnershipTransferConfirmationPhrase({
        confirmationPhrase:
          "  TRANSFER OWNERSHIP TO target.admin@example.test  ",
        targetEmail: eligibleTarget.email,
      })
    ).toEqual({
      ok: true,
      expectedPhrase: "TRANSFER OWNERSHIP TO target.admin@example.test",
    });
  });

  it("rejects phrase mismatch and phrase for different target", () => {
    expect(
      validateOwnershipTransferConfirmationPhrase({
        confirmationPhrase: "transfer ownership to target.admin@example.test",
        targetEmail: eligibleTarget.email,
      })
    ).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      reason: "CONFIRMATION_PHRASE_MISMATCH",
    });

    expect(
      validateOwnershipTransferConfirmationPhrase({
        confirmationPhrase: "TRANSFER OWNERSHIP TO other.admin@example.test",
        targetEmail: eligibleTarget.email,
      })
    ).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      reason: "CONFIRMATION_PHRASE_MISMATCH",
    });
  });

  it("validates submission shape with stable safe error codes", () => {
    expect(
      validateOwnershipTransferSubmissionShape({
        targetAdminId: " admin_target ",
        confirmationPhrase: "TRANSFER OWNERSHIP TO target.admin@example.test",
        password: "correct horse battery staple",
      })
    ).toEqual({
      ok: true,
      value: {
        targetAdminId: "admin_target",
        confirmationPhrase: "TRANSFER OWNERSHIP TO target.admin@example.test",
        password: "correct horse battery staple",
      },
    });

    expect(
      validateOwnershipTransferSubmissionShape({
        targetAdminId: "",
        confirmationPhrase: "",
        password: "",
      })
    ).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      reasons: [
        "targetAdminId:required",
        "confirmationPhrase:required",
        "password:required",
      ],
    });
  });
});
