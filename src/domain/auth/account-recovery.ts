import type { ErrorCodeType } from "@/utils/general/error";

export type RecoveryActorKind = "ADMIN" | "CUSTOMER";
export type RecoveryAccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type RecoveryAccountRecord = {
  actorKind: RecoveryActorKind;
  id: string;
  email: string;
  status: RecoveryAccountStatus;
  emailVerifiedAt: string | null;
  isOwner?: boolean;
  approvedAt?: string | null;
};

export type RecoveryAccountLookup = {
  admin: RecoveryAccountRecord | null;
  customer: RecoveryAccountRecord | null;
};

export type PasswordResetTokenRecord = {
  id: string;
  actorKind: RecoveryActorKind;
  actorId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
};

export type RecoveryEmailValidation =
  | {
      ok: true;
      value: { email: string };
      code?: never;
      reasons?: never;
    }
  | {
      ok: false;
      value?: never;
      code: Extract<ErrorCodeType, "VALIDATION_FAILED">;
      reasons: string[];
    };

export type ResetConfirmationValidation =
  | {
      ok: true;
      value: {
        token: string;
        password: string;
      };
      code?: never;
      reasons?: never;
    }
  | {
      ok: false;
      value?: never;
      code: Extract<ErrorCodeType, "VALIDATION_FAILED">;
      reasons: string[];
    };

export type PasswordResetRequestDecision =
  | {
      action: "create-token";
      account: RecoveryAccountRecord;
    }
  | {
      action: "accept-without-token";
      reason: "MISSING" | "AMBIGUOUS" | "INELIGIBLE";
    };

export type VerificationResendDecision =
  | {
      action: "create-token";
      customerId: string;
      email: string;
    }
  | {
      action: "accept-without-token";
      reason: "MISSING" | "AMBIGUOUS" | "INELIGIBLE" | "ALREADY_VERIFIED";
    };

export type PasswordResetTokenDecision =
  | {
      ok: true;
      actorKind: RecoveryActorKind;
      actorId: string;
    }
  | {
      ok: false;
      code: Extract<ErrorCodeType, "RESOURCE_NOT_FOUND" | "CONFLICT_STATE">;
      reason: "INVALID" | "USED" | "EXPIRED";
    };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 1024;

function validationError(reasons: string[]): RecoveryEmailValidation {
  return {
    ok: false,
    code: "VALIDATION_FAILED",
    reasons,
  };
}

function confirmationValidationError(
  reasons: string[]
): ResetConfirmationValidation {
  return {
    ok: false,
    code: "VALIDATION_FAILED",
    reasons,
  };
}

export function normalizeRecoveryEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateRecoveryEmail(email: unknown): RecoveryEmailValidation {
  const normalized = typeof email === "string" ? normalizeRecoveryEmail(email) : "";

  if (!EMAIL_PATTERN.test(normalized) || normalized.length > 254) {
    return validationError(["email:format"]);
  }

  return {
    ok: true,
    value: {
      email: normalized,
    },
  };
}

export function validateResetConfirmation(input: {
  token: unknown;
  password: unknown;
}): ResetConfirmationValidation {
  const reasons: string[] = [];
  const token = typeof input.token === "string" ? input.token.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (token.length === 0 || token.length > 2048) {
    reasons.push("token:format");
  }

  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    reasons.push("password:length");
  }

  if (reasons.length > 0) {
    return confirmationValidationError(reasons);
  }

  return {
    ok: true,
    value: {
      token,
      password,
    },
  };
}

function eligibleForPasswordReset(account: RecoveryAccountRecord): boolean {
  if (account.status !== "ACTIVE" || !account.emailVerifiedAt) {
    return false;
  }

  if (account.actorKind === "ADMIN") {
    return Boolean(account.isOwner || account.approvedAt);
  }

  return true;
}

export function evaluatePasswordResetRequestState(
  lookup: RecoveryAccountLookup
): PasswordResetRequestDecision {
  if (lookup.admin && lookup.customer) {
    return { action: "accept-without-token", reason: "AMBIGUOUS" };
  }

  const account = lookup.admin ?? lookup.customer;

  if (!account) {
    return { action: "accept-without-token", reason: "MISSING" };
  }

  if (!eligibleForPasswordReset(account)) {
    return { action: "accept-without-token", reason: "INELIGIBLE" };
  }

  return {
    action: "create-token",
    account,
  };
}

export function evaluateEmailVerificationResendState(
  lookup: RecoveryAccountLookup
): VerificationResendDecision {
  if (lookup.admin && lookup.customer) {
    return { action: "accept-without-token", reason: "AMBIGUOUS" };
  }

  if (!lookup.customer) {
    return { action: "accept-without-token", reason: "MISSING" };
  }

  if (lookup.customer.status !== "ACTIVE") {
    return { action: "accept-without-token", reason: "INELIGIBLE" };
  }

  if (lookup.customer.emailVerifiedAt) {
    return { action: "accept-without-token", reason: "ALREADY_VERIFIED" };
  }

  return {
    action: "create-token",
    customerId: lookup.customer.id,
    email: lookup.customer.email,
  };
}

export function evaluatePasswordResetTokenState(input: {
  record: PasswordResetTokenRecord | null;
  now?: Date;
}): PasswordResetTokenDecision {
  const now = input.now ?? new Date();

  if (!input.record) {
    return {
      ok: false,
      code: "RESOURCE_NOT_FOUND",
      reason: "INVALID",
    };
  }

  if (input.record.usedAt) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "USED",
    };
  }

  const expiryTime = new Date(input.record.expiresAt).getTime();
  if (!Number.isFinite(expiryTime) || expiryTime <= now.getTime()) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "EXPIRED",
    };
  }

  return {
    ok: true,
    actorKind: input.record.actorKind,
    actorId: input.record.actorId,
  };
}
