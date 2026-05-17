import type { AccountStatus } from "@/domain/auth/auth-decisions";
import type { ErrorCodeType } from "@/utils/general/error";
import { normalizeAdminEmail } from "./admin-account";

export const OWNERSHIP_TRANSFER_CONFIRMATION_PREFIX = "TRANSFER OWNERSHIP TO";
export const OWNERSHIP_TRANSFER_CONFIRMATION_MAX_LENGTH = 320;
export const OWNERSHIP_TRANSFER_PASSWORD_MAX_LENGTH = 1024;

export type OwnershipTransferTarget = {
  id: string;
  email: string;
  role: string;
  status: AccountStatus;
  isOwner: boolean;
  emailVerifiedAt?: string | null;
  approvedAt?: string | null;
};

export type OwnershipTransferTargetDecision =
  | {
      ok: true;
      normalizedEmail: string;
    }
  | {
      ok: false;
      code: Extract<ErrorCodeType, "AUTH_FORBIDDEN" | "CONFLICT_STATE">;
      reason:
        | "TARGET_NOT_ADMIN"
        | "TARGET_IS_OWNER"
        | "TARGET_NOT_ACTIVE"
        | "TARGET_EMAIL_NOT_VERIFIED"
        | "TARGET_NOT_APPROVED";
    };

export type OwnershipTransferConfirmationDecision =
  | {
      ok: true;
      expectedPhrase: string;
    }
  | {
      ok: false;
      code: Extract<ErrorCodeType, "VALIDATION_FAILED">;
      reason: "CONFIRMATION_PHRASE_MISMATCH";
    };

export type OwnershipTransferSubmissionValue = {
  targetAdminId: string;
  confirmationPhrase: string;
  password: string;
};

export type OwnershipTransferSubmissionDecision =
  | {
      ok: true;
      value: OwnershipTransferSubmissionValue;
    }
  | {
      ok: false;
      code: Extract<ErrorCodeType, "VALIDATION_FAILED">;
      reasons: string[];
    };

export function buildOwnershipTransferConfirmationPhrase(
  target: Pick<OwnershipTransferTarget, "email"> | string
): string {
  const email =
    typeof target === "string"
      ? normalizeAdminEmail(target)
      : normalizeAdminEmail(target.email);

  return `${OWNERSHIP_TRANSFER_CONFIRMATION_PREFIX} ${email}`;
}

export function evaluateOwnershipTransferTarget(
  target: OwnershipTransferTarget
): OwnershipTransferTargetDecision {
  if (target.isOwner || target.role === "SUPER_ADMIN") {
    return {
      ok: false,
      code: "AUTH_FORBIDDEN",
      reason: "TARGET_IS_OWNER",
    };
  }

  if (target.role !== "ADMIN") {
    return {
      ok: false,
      code: "AUTH_FORBIDDEN",
      reason: "TARGET_NOT_ADMIN",
    };
  }

  if (target.status !== "ACTIVE") {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "TARGET_NOT_ACTIVE",
    };
  }

  if (!target.emailVerifiedAt) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "TARGET_EMAIL_NOT_VERIFIED",
    };
  }

  if (!target.approvedAt) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "TARGET_NOT_APPROVED",
    };
  }

  return {
    ok: true,
    normalizedEmail: normalizeAdminEmail(target.email),
  };
}

export function isEligibleOwnershipTransferTarget(
  target: OwnershipTransferTarget
): boolean {
  return evaluateOwnershipTransferTarget(target).ok;
}

export function validateOwnershipTransferConfirmationPhrase(input: {
  confirmationPhrase: string;
  targetEmail: string;
}): OwnershipTransferConfirmationDecision {
  const expectedPhrase = buildOwnershipTransferConfirmationPhrase(
    input.targetEmail
  );

  if (input.confirmationPhrase.trim() !== expectedPhrase) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      reason: "CONFIRMATION_PHRASE_MISMATCH",
    };
  }

  return {
    ok: true,
    expectedPhrase,
  };
}

export function validateOwnershipTransferSubmissionShape(
  input: Record<string, unknown>
): OwnershipTransferSubmissionDecision {
  const reasons: string[] = [];
  const targetAdminId =
    typeof input.targetAdminId === "string" ? input.targetAdminId.trim() : "";
  const confirmationPhrase =
    typeof input.confirmationPhrase === "string"
      ? input.confirmationPhrase.trim()
      : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (targetAdminId.length === 0) {
    reasons.push("targetAdminId:required");
  }

  if (confirmationPhrase.length === 0) {
    reasons.push("confirmationPhrase:required");
  } else if (
    confirmationPhrase.length > OWNERSHIP_TRANSFER_CONFIRMATION_MAX_LENGTH
  ) {
    reasons.push("confirmationPhrase:too_long");
  }

  if (password.length === 0) {
    reasons.push("password:required");
  } else if (password.length > OWNERSHIP_TRANSFER_PASSWORD_MAX_LENGTH) {
    reasons.push("password:too_long");
  }

  if (reasons.length > 0) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      reasons,
    };
  }

  return {
    ok: true,
    value: {
      targetAdminId,
      confirmationPhrase,
      password,
    },
  };
}
