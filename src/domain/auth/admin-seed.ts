import type { ErrorCodeType } from "@/utils/general/error";

export const REVIEWED_PRODUCTION_ADMIN_SEED_CONFIRMATION =
  "REVIEWED_PRODUCTION_ADMIN_SEED";

export const ADMIN_SEED_TARGET_ENVS = ["development", "production"] as const;

export type AdminSeedTargetEnv = (typeof ADMIN_SEED_TARGET_ENVS)[number];

export type AdminSeedOperation = "create-admin" | "update-admin-credentials";

export type AdminSeedConflictReason =
  | "INVALID_ADMIN_COUNT"
  | "INVALID_OWNER_CONFLICT_COUNT"
  | "INVALID_TARGET_ENV"
  | "OWNER_EMAIL_CONFLICT"
  | "PRODUCTION_REVIEW_REQUIRED";

export type AdminSeedDecision =
  | {
      ok: true;
      operation: AdminSeedOperation;
      warnings: readonly string[];
    }
  | {
      ok: false;
      code: Extract<ErrorCodeType, "VALIDATION_FAILED" | "CONFLICT_STATE">;
      reason: AdminSeedConflictReason;
      message: string;
    };

export type AdminSeedCredentialValidation =
  | {
      ok: true;
      email: string;
      password: string;
    }
  | {
      ok: false;
      code: Extract<ErrorCodeType, "VALIDATION_FAILED">;
      message: string;
    };

export type AdminSeedSqlInput = {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
};

function isTargetEnv(value: unknown): value is AdminSeedTargetEnv {
  return (
    typeof value === "string" &&
    ADMIN_SEED_TARGET_ENVS.includes(value as AdminSeedTargetEnv)
  );
}

function hasReviewedProductionConfirmation(value: string | undefined): boolean {
  return value === REVIEWED_PRODUCTION_ADMIN_SEED_CONFIRMATION;
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function decideAdminSeedOperation(input: {
  adminCount: number;
  ownerEmailConflictCount: number;
  targetEnv?: string;
  productionSeedConfirmation?: string;
}): AdminSeedDecision {
  const targetEnv = input.targetEnv ?? "development";

  if (!Number.isInteger(input.adminCount) || input.adminCount < 0) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      reason: "INVALID_ADMIN_COUNT",
      message: "Admin seed account count must be a non-negative integer.",
    };
  }

  if (
    !Number.isInteger(input.ownerEmailConflictCount) ||
    input.ownerEmailConflictCount < 0
  ) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      reason: "INVALID_OWNER_CONFLICT_COUNT",
      message:
        "Admin seed owner conflict count must be a non-negative integer.",
    };
  }

  if (!isTargetEnv(targetEnv)) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      reason: "INVALID_TARGET_ENV",
      message: "Admin seed target environment is invalid.",
    };
  }

  if (
    targetEnv === "production" &&
    !hasReviewedProductionConfirmation(input.productionSeedConfirmation)
  ) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "PRODUCTION_REVIEW_REQUIRED",
      message:
        "Production Admin seed requires reviewed production confirmation.",
    };
  }

  if (input.ownerEmailConflictCount > 0) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "OWNER_EMAIL_CONFLICT",
      message:
        "Admin seed email belongs to the current Super Admin owner. Use a different SEED_ADMIN_EMAIL.",
    };
  }

  if (input.adminCount > 0) {
    return {
      ok: true,
      operation: "update-admin-credentials",
      warnings: [
        "Existing non-owner Admin found. Password and active approval state will be refreshed.",
      ],
    };
  }

  return {
    ok: true,
    operation: "create-admin",
    warnings: [],
  };
}

export function validateAdminSeedCredentials(input: {
  email?: string;
  password?: string;
}): AdminSeedCredentialValidation {
  const email = input.email?.trim().toLowerCase();
  const password = input.password;
  const passwordForValidation = password?.trim();
  const emailIsValid = Boolean(
    email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
  const passwordIsValid = Boolean(
    password && passwordForValidation && passwordForValidation.length >= 16
  );

  if (!email || !password || !emailIsValid || !passwordIsValid) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: "Admin seed credentials are missing or invalid.",
    };
  }

  return {
    ok: true,
    email,
    password,
  };
}

export function buildAdminSeedSql(input: AdminSeedSqlInput): string {
  return [
    "INSERT INTO admins (id, email, password_hash, password_salt, is_owner, status, email_verified_at, approved_at)",
    "VALUES (",
    [
      sqlString(input.id),
      sqlString(input.email),
      sqlString(input.passwordHash),
      sqlString(input.passwordSalt),
      "0",
      "'ACTIVE'",
      "CURRENT_TIMESTAMP",
      "CURRENT_TIMESTAMP",
    ].join(", "),
    ")",
    "ON CONFLICT (email) DO UPDATE SET",
    "password_hash = excluded.password_hash,",
    "password_salt = excluded.password_salt,",
    "is_owner = 0,",
    "status = 'ACTIVE',",
    "email_verified_at = CURRENT_TIMESTAMP,",
    "approved_at = CURRENT_TIMESTAMP,",
    "updated_at = CURRENT_TIMESTAMP",
    "WHERE admins.is_owner = 0;",
  ].join(" ");
}

export function buildSeededAdminCountSql(email: string): string {
  return [
    "SELECT COUNT(*) AS admin_count FROM admins",
    `WHERE is_owner = 0 AND email = ${sqlString(email)};`,
  ].join(" ");
}

export function buildSeededOwnerEmailConflictSql(email: string): string {
  return [
    "SELECT COUNT(*) AS owner_count FROM admins",
    `WHERE is_owner <> 0 AND email = ${sqlString(email)};`,
  ].join(" ");
}
