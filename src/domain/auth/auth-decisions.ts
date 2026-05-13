import type { ActiveUserRole } from "./roles";
import type { ErrorCodeType } from "@/utils/general/error";

export type AuthActorKind = "ADMIN" | "CUSTOMER";
export type AccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type SessionStatus = "ACTIVE" | "REVOKED";

export type CredentialFailureReason =
  | "UNKNOWN_ACCOUNT"
  | "WRONG_PASSWORD"
  | "UNSUPPORTED_PASSWORD_HASH"
  | "PASSWORD_CREDENTIAL_MISSING";

export type AccountEligibilityInput = {
  actorKind: AuthActorKind;
  status: AccountStatus;
  hasPasswordCredential: boolean;
  isOwner?: boolean;
  emailVerifiedAt?: string | null;
  approvedAt?: string | null;
};

export type SessionStateInput = {
  status: SessionStatus;
  expiresAt: string;
  revokedAt?: string | null;
};

export type CredentialFailureDecision = {
  ok: false;
  code: Extract<ErrorCodeType, "AUTHENTICATION">;
  reason: CredentialFailureReason;
};

export type AccountEligibilityDecision =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: Extract<
        ErrorCodeType,
        | "AUTHENTICATION"
        | "AUTH_FORBIDDEN"
        | "ACCOUNT_SUSPENDED"
        | "EMAIL_NOT_VERIFIED"
        | "ADMIN_APPROVAL_REQUIRED"
      >;
      reason:
        | "PASSWORD_CREDENTIAL_MISSING"
        | "INACTIVE"
        | "SUSPENDED"
        | "EMAIL_NOT_VERIFIED"
        | "ADMIN_APPROVAL_REQUIRED";
    };

export type SessionStateDecision =
  | {
      active: true;
    }
  | {
      active: false;
      reason: "MISSING" | "EXPIRED" | "REVOKED";
    };

export function deriveActorRole(input: {
  actorKind: AuthActorKind;
  isOwner?: boolean;
}): ActiveUserRole {
  if (input.actorKind === "CUSTOMER") {
    return "CUSTOMER";
  }

  return input.isOwner ? "SUPER_ADMIN" : "ADMIN";
}

export function evaluateCredentialFailure(
  reason: CredentialFailureReason
): CredentialFailureDecision {
  return {
    ok: false,
    code: "AUTHENTICATION",
    reason,
  };
}

export function evaluateAccountEligibility(
  input: AccountEligibilityInput
): AccountEligibilityDecision {
  if (!input.hasPasswordCredential) {
    return {
      ok: false,
      code: "AUTHENTICATION",
      reason: "PASSWORD_CREDENTIAL_MISSING",
    };
  }

  if (input.status === "SUSPENDED") {
    return {
      ok: false,
      code: "ACCOUNT_SUSPENDED",
      reason: "SUSPENDED",
    };
  }

  if (input.status === "INACTIVE") {
    return {
      ok: false,
      code: "AUTH_FORBIDDEN",
      reason: "INACTIVE",
    };
  }

  if (input.actorKind === "CUSTOMER" && !input.emailVerifiedAt) {
    return {
      ok: false,
      code: "EMAIL_NOT_VERIFIED",
      reason: "EMAIL_NOT_VERIFIED",
    };
  }

  if (
    input.actorKind === "ADMIN" &&
    !input.isOwner &&
    (!input.emailVerifiedAt || !input.approvedAt)
  ) {
    return {
      ok: false,
      code: !input.emailVerifiedAt
        ? "EMAIL_NOT_VERIFIED"
        : "ADMIN_APPROVAL_REQUIRED",
      reason: !input.emailVerifiedAt
        ? "EMAIL_NOT_VERIFIED"
        : "ADMIN_APPROVAL_REQUIRED",
    };
  }

  return { ok: true };
}

export function evaluateSessionState(
  session: SessionStateInput | undefined,
  now = new Date()
): SessionStateDecision {
  if (!session) {
    return {
      active: false,
      reason: "MISSING",
    };
  }

  if (session.status === "REVOKED" || session.revokedAt) {
    return {
      active: false,
      reason: "REVOKED",
    };
  }

  if (new Date(session.expiresAt).getTime() <= now.getTime()) {
    return {
      active: false,
      reason: "EXPIRED",
    };
  }

  return { active: true };
}
