import type { ActiveUserRole } from "@/domain/auth/roles";
import type { AccountStatus } from "@/domain/auth/auth-decisions";
import type { ErrorCodeType } from "@/utils/general/error";

export type AdminAccountRole = Extract<ActiveUserRole, "ADMIN" | "SUPER_ADMIN">;

export type AdminAccountRecord = {
  id: string;
  email: string;
  role: AdminAccountRole;
  status: AccountStatus;
  isOwner: boolean;
  emailVerifiedAt?: string | null;
  approvedAt?: string | null;
  suspensionReason?: string | null;
  rejectionReason?: string | null;
};

export type AdminLifecycleActor = {
  authenticated: boolean;
  role: string;
};

export type AdminValidationError = {
  ok: false;
  code: Extract<ErrorCodeType, "VALIDATION_FAILED">;
  reasons: string[];
};

export type AdminActorDecision =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: Extract<ErrorCodeType, "AUTH_REQUIRED" | "AUTH_FORBIDDEN">;
      reason: "AUTH_REQUIRED" | "SUPER_ADMIN_REQUIRED";
    };

export type AdminTransitionDecision =
  | {
      ok: true;
      patch: AdminLifecyclePatch;
    }
  | {
      ok: false;
      code: Extract<
        ErrorCodeType,
        "AUTH_FORBIDDEN" | "CONFLICT_STATE" | "VALIDATION_FAILED"
      >;
      reason:
        | "OWNER_IMMUTABLE"
        | "ALREADY_APPROVED"
        | "NOT_VERIFIED"
        | "ALREADY_REJECTED"
        | "ALREADY_SUSPENDED"
        | "NOT_ACTIVE"
        | "NOT_SUSPENDED_OR_INACTIVE"
        | "reason:too_long";
    };

type AdminTransitionErrorCode = Extract<
  ErrorCodeType,
  "AUTH_FORBIDDEN" | "CONFLICT_STATE" | "VALIDATION_FAILED"
>;

type AdminTransitionErrorReason =
  | "OWNER_IMMUTABLE"
  | "ALREADY_APPROVED"
  | "NOT_VERIFIED"
  | "ALREADY_REJECTED"
  | "ALREADY_SUSPENDED"
  | "NOT_ACTIVE"
  | "NOT_SUSPENDED_OR_INACTIVE"
  | "reason:too_long";

export type AdminAccountCreateValue = {
  email: string;
  password: string;
  sendInvitationEmail: boolean;
};

export type AdminAccountUpdateValue = {
  email?: string;
};

export type AdminCreationDefaults = {
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: "ADMIN";
  isOwner: false;
  status: "ACTIVE";
  emailVerifiedAt: string;
  approvedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminLifecyclePatch = {
  status?: AccountStatus;
  approvedAt?: string | null;
  suspensionReason?: string | null;
  rejectionReason?: string | null;
  updatedAt: string;
  revokeDashboardSessions?: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 1024;
const EMAIL_MAX_LENGTH = 254;
const REASON_MAX_LENGTH = 240;

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validationError(reasons: string[]): AdminValidationError {
  return {
    ok: false,
    code: "VALIDATION_FAILED",
    reasons,
  };
}

function cleanOptionalReason(reason: string | null | undefined):
  | {
      ok: true;
      value: string | null;
    }
  | {
      ok: false;
      reason: "reason:too_long";
    } {
  if (reason === undefined || reason === null) {
    return { ok: true, value: null };
  }

  const value = reason.trim();
  if (value.length === 0) {
    return { ok: true, value: null };
  }

  if (value.length > REASON_MAX_LENGTH) {
    return { ok: false, reason: "reason:too_long" };
  }

  return { ok: true, value };
}

function isOwnerAccount(account: AdminAccountRecord): boolean {
  return account.isOwner || account.role === "SUPER_ADMIN";
}

function transitionError(
  code: AdminTransitionErrorCode,
  reason: AdminTransitionErrorReason
): AdminTransitionDecision {
  return {
    ok: false,
    code,
    reason,
  };
}

export function validateAdminAccountCreate(
  input: Record<string, unknown>
):
  | {
      ok: true;
      value: AdminAccountCreateValue;
    }
  | AdminValidationError {
  const reasons: string[] = [];
  const email =
    typeof input.email === "string" ? normalizeAdminEmail(input.email) : "";
  const password = typeof input.password === "string" ? input.password : "";
  const sendInvitationEmail =
    typeof input.sendInvitationEmail === "boolean"
      ? input.sendInvitationEmail
      : false;

  if (!EMAIL_PATTERN.test(email) || email.length > EMAIL_MAX_LENGTH) {
    reasons.push("email:format");
  }

  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    reasons.push("password:length");
  }

  if (reasons.length > 0) {
    return validationError(reasons);
  }

  return {
    ok: true,
    value: {
      email,
      password,
      sendInvitationEmail,
    },
  };
}

export function validateAdminAccountUpdate(
  input: Record<string, unknown>
):
  | {
      ok: true;
      value: AdminAccountUpdateValue;
    }
  | AdminValidationError {
  const reasons: string[] = [];
  const value: AdminAccountUpdateValue = {};

  if (input.email !== undefined && input.email !== null) {
    const email =
      typeof input.email === "string" ? normalizeAdminEmail(input.email) : "";

    if (!EMAIL_PATTERN.test(email) || email.length > EMAIL_MAX_LENGTH) {
      reasons.push("email:format");
    } else {
      value.email = email;
    }
  }

  if (reasons.length > 0) {
    return validationError(reasons);
  }

  if (Object.keys(value).length === 0) {
    return validationError(["admin:empty"]);
  }

  return {
    ok: true,
    value,
  };
}

export function evaluateAdminLifecycleActor(
  actor: AdminLifecycleActor | undefined
): AdminActorDecision {
  if (!actor?.authenticated) {
    return {
      ok: false,
      code: "AUTH_REQUIRED",
      reason: "AUTH_REQUIRED",
    };
  }

  if (actor.role !== "SUPER_ADMIN") {
    return {
      ok: false,
      code: "AUTH_FORBIDDEN",
      reason: "SUPER_ADMIN_REQUIRED",
    };
  }

  return { ok: true };
}

export function applyAdminCreationDefaults(input: {
  email: string;
  passwordHash: string;
  passwordSalt: string;
  now: string;
}): AdminCreationDefaults {
  return {
    email: normalizeAdminEmail(input.email),
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    role: "ADMIN",
    isOwner: false,
    status: "ACTIVE",
    emailVerifiedAt: input.now,
    approvedAt: input.now,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function applyAdminApproval(input: {
  account: AdminAccountRecord;
  now: string;
}): AdminTransitionDecision {
  if (isOwnerAccount(input.account)) {
    return transitionError("AUTH_FORBIDDEN", "OWNER_IMMUTABLE");
  }

  if (!input.account.emailVerifiedAt) {
    return transitionError("CONFLICT_STATE", "NOT_VERIFIED");
  }

  if (input.account.approvedAt) {
    return transitionError("CONFLICT_STATE", "ALREADY_APPROVED");
  }

  return {
    ok: true,
    patch: {
      status: "ACTIVE",
      approvedAt: input.now,
      rejectionReason: null,
      updatedAt: input.now,
    },
  };
}

export function applyAdminRejection(input: {
  account: AdminAccountRecord;
  reason?: string | null;
  now: string;
}): AdminTransitionDecision {
  if (isOwnerAccount(input.account)) {
    return transitionError("AUTH_FORBIDDEN", "OWNER_IMMUTABLE");
  }

  const reason = cleanOptionalReason(input.reason);
  if (!reason.ok) {
    return transitionError("VALIDATION_FAILED", reason.reason);
  }

  if (input.account.status === "INACTIVE" && input.account.rejectionReason) {
    return transitionError("CONFLICT_STATE", "ALREADY_REJECTED");
  }

  return {
    ok: true,
    patch: {
      status: "INACTIVE",
      approvedAt: null,
      rejectionReason: reason.value,
      updatedAt: input.now,
      revokeDashboardSessions: true,
    },
  };
}

export function applyAdminSuspension(input: {
  account: AdminAccountRecord;
  reason?: string | null;
  now: string;
}): AdminTransitionDecision {
  if (isOwnerAccount(input.account)) {
    return transitionError("AUTH_FORBIDDEN", "OWNER_IMMUTABLE");
  }

  const reason = cleanOptionalReason(input.reason);
  if (!reason.ok) {
    return transitionError("VALIDATION_FAILED", reason.reason);
  }

  if (input.account.status === "SUSPENDED") {
    return transitionError("CONFLICT_STATE", "ALREADY_SUSPENDED");
  }

  if (input.account.status !== "ACTIVE") {
    return transitionError("CONFLICT_STATE", "NOT_ACTIVE");
  }

  return {
    ok: true,
    patch: {
      status: "SUSPENDED",
      suspensionReason: reason.value,
      updatedAt: input.now,
      revokeDashboardSessions: true,
    },
  };
}

export function applyAdminReactivation(input: {
  account: AdminAccountRecord;
  now: string;
}): AdminTransitionDecision {
  if (isOwnerAccount(input.account)) {
    return transitionError("AUTH_FORBIDDEN", "OWNER_IMMUTABLE");
  }

  if (
    input.account.status !== "SUSPENDED" &&
    input.account.status !== "INACTIVE"
  ) {
    return transitionError("CONFLICT_STATE", "NOT_SUSPENDED_OR_INACTIVE");
  }

  return {
    ok: true,
    patch: {
      status: "ACTIVE",
      suspensionReason: null,
      rejectionReason: null,
      updatedAt: input.now,
    },
  };
}
