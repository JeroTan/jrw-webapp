import type { ErrorCodeType } from "@/utils/general/error";

export const REVIEWED_OWNER_CREDENTIAL_REPLACEMENT_CONFIRMATION =
  "REVIEWED_OWNER_CREDENTIAL_REPLACEMENT";

export const REVIEWED_PRODUCTION_SUPER_ADMIN_SEED_CONFIRMATION =
  "REVIEWED_PRODUCTION_SUPER_ADMIN_SEED";

export const SUPER_ADMIN_SEED_TARGET_ENVS = [
  "development",
  "production",
] as const;

export type SuperAdminSeedTargetEnv =
  (typeof SUPER_ADMIN_SEED_TARGET_ENVS)[number];

export type SuperAdminSeedOperation =
  | "create-owner"
  | "replace-owner-credentials"
  | "dethrone-and-create-owner"
  | "no-op";

export type SuperAdminSeedConflictReason =
  | "INVALID_OWNER_COUNT"
  | "INVALID_TARGET_ENV"
  | "OWNER_ALREADY_EXISTS"
  | "MULTIPLE_OWNERS_EXIST"
  | "PRODUCTION_REVIEW_REQUIRED";

export type SuperAdminSeedDecision =
  | {
      ok: true;
      operation: SuperAdminSeedOperation;
      warnings: readonly string[];
    }
  | {
      ok: false;
      code: Extract<ErrorCodeType, "VALIDATION_FAILED" | "CONFLICT_STATE">;
      reason: SuperAdminSeedConflictReason;
      message: string;
    };

export type SuperAdminSeedCredentialValidation =
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

export type PasswordPepperValidation =
  | {
      ok: true;
      pepper: string;
    }
  | {
      ok: false;
      code: Extract<ErrorCodeType, "VALIDATION_FAILED">;
      message: string;
    };

export type SuperAdminSeedSqlInput = {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  operation: SuperAdminSeedOperation;
};

function isTargetEnv(value: unknown): value is SuperAdminSeedTargetEnv {
  return (
    typeof value === "string" &&
    SUPER_ADMIN_SEED_TARGET_ENVS.includes(value as SuperAdminSeedTargetEnv)
  );
}

function hasReviewedProductionConfirmation(value: string | undefined): boolean {
  return value === REVIEWED_PRODUCTION_SUPER_ADMIN_SEED_CONFIRMATION;
}

export function decideSuperAdminSeedOperation(input: {
  ownerCount: number;
  targetEnv?: string;
  currentOwnerEmail?: string;
  seedEmail?: string;
  replaceOwnerCredentialsConfirmation?: string;
  productionSeedConfirmation?: string;
}): SuperAdminSeedDecision {
  const targetEnv = input.targetEnv ?? "development";

  if (!Number.isInteger(input.ownerCount) || input.ownerCount < 0) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      reason: "INVALID_OWNER_COUNT",
      message: "Owner count must be a non-negative integer.",
    };
  }

  if (!isTargetEnv(targetEnv)) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      reason: "INVALID_TARGET_ENV",
      message: "Super Admin seed target environment is invalid.",
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
        "Production Super Admin seed requires reviewed production confirmation.",
    };
  }

  if (input.ownerCount > 1) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "MULTIPLE_OWNERS_EXIST",
      message:
        "Multiple Super Admin owners already exist. Manual remediation required before seeding.",
    };
  }

  if (input.ownerCount === 1) {
    const currentEmail = input.currentOwnerEmail?.trim().toLowerCase();
    const newEmail = input.seedEmail?.trim().toLowerCase();
    const isSameEmail = currentEmail && newEmail && currentEmail === newEmail;

    if (isSameEmail) {
      return {
        ok: true,
        operation: "no-op",
        warnings: [
          "Seed email matches current owner. No changes needed.",
        ],
      };
    }

    return {
      ok: true,
      operation: "dethrone-and-create-owner",
      warnings: [
        `Current owner (${currentEmail ?? "unknown"}) will be demoted to ADMIN.`,
        `New owner will be created with seed email (${newEmail ?? "unknown"}).`,
      ],
    };
  }

  return {
    ok: true,
    operation: "create-owner",
    warnings: [],
  };
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function validateSuperAdminSeedCredentials(input: {
  email?: string;
  password?: string;
}): SuperAdminSeedCredentialValidation {
  const email = input.email?.trim().toLowerCase();
  const password = input.password;
  const passwordForValidation = password?.trim();
  const emailIsValid = Boolean(
    email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
  const passwordIsValid = Boolean(
    password && passwordForValidation && passwordForValidation.length >= 16
  );

  if (
    !email ||
    !password ||
    !emailIsValid ||
    !passwordIsValid
  ) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: "Super Admin seed credentials are missing or invalid.",
    };
  }

  return {
    ok: true,
    email,
    password,
  };
}

export function validatePasswordPepper(
  pepper: string | undefined
): PasswordPepperValidation {
  const normalizedPepper = pepper?.trim();

  if (
    !normalizedPepper ||
    normalizedPepper.length < 16
  ) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: "Password pepper is missing or invalid.",
    };
  }

  return {
    ok: true,
    pepper: normalizedPepper,
  };
}

export function buildOwnerCountSql(): string {
  return "SELECT COUNT(*) AS owner_count FROM admins WHERE is_owner <> 0;";
}

export function buildSuperAdminSeedSql(input: SuperAdminSeedSqlInput): string {
  if (input.operation === "replace-owner-credentials") {
    return [
      "UPDATE admins",
      `SET email = ${sqlString(input.email)},`,
      `password_hash = ${sqlString(input.passwordHash)},`,
      `password_salt = ${sqlString(input.passwordSalt)},`,
      "status = 'ACTIVE',",
      "email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),",
      "approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),",
      "updated_at = CURRENT_TIMESTAMP",
      "WHERE is_owner <> 0;",
    ].join(" ");
  }

  if (input.operation === "dethrone-and-create-owner") {
    return [
      "UPDATE admins SET is_owner = 0, updated_at = CURRENT_TIMESTAMP WHERE is_owner <> 0;",
      "INSERT INTO admins (id, email, password_hash, password_salt, is_owner, status, email_verified_at, approved_at, updated_at)",
      "VALUES (",
      [
        sqlString(input.id),
        sqlString(input.email),
        sqlString(input.passwordHash),
        sqlString(input.passwordSalt),
        "1",
        "'ACTIVE'",
        "CURRENT_TIMESTAMP",
        "CURRENT_TIMESTAMP",
        "CURRENT_TIMESTAMP",
      ].join(", "),
      ");",
    ].join(" ");
  }

  return [
    "INSERT INTO admins (id, email, password_hash, password_salt, is_owner, status, email_verified_at, approved_at)",
    "VALUES (",
    [
      sqlString(input.id),
      sqlString(input.email),
      sqlString(input.passwordHash),
      sqlString(input.passwordSalt),
      "1",
      "'ACTIVE'",
      "CURRENT_TIMESTAMP",
      "CURRENT_TIMESTAMP",
    ].join(", "),
    ")",
    "ON CONFLICT (email) DO UPDATE SET",
    "password_hash = excluded.password_hash,",
    "password_salt = excluded.password_salt,",
    "is_owner = 1,",
    "status = 'ACTIVE',",
    "email_verified_at = CURRENT_TIMESTAMP,",
    "approved_at = CURRENT_TIMESTAMP,",
    "updated_at = CURRENT_TIMESTAMP",
    "WHERE NOT EXISTS (SELECT 1 FROM admins WHERE is_owner <> 0);",
  ].join(" ");
}

export function buildSeededOwnerCountSql(email: string): string {
  return [
    "SELECT COUNT(*) AS owner_count FROM admins",
    `WHERE is_owner <> 0 AND email = ${sqlString(email)};`,
  ].join(" ");
}

export function maskEmailForOperator(email: string): string {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return "[invalid-email]";
  }

  const visibleLocal = localPart.slice(0, 2);
  return `${visibleLocal}***@${domain}`;
}
