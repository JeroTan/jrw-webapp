import type { ErrorCodeType } from "@/utils/general/error";

export const ACTIVE_USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "CUSTOMER",
  "PROSPECT",
] as const;

export type ActiveUserRole = (typeof ACTIVE_USER_ROLES)[number];

export const DEPRECATED_USER_ROLE_ALIASES = {
  STORE_ADMIN: "ADMIN",
} as const satisfies Record<string, ActiveUserRole>;

export type DeprecatedUserRoleAlias = keyof typeof DEPRECATED_USER_ROLE_ALIASES;

export const SYSTEM_ACTOR_ROLES = ["SYSTEM", "UNKNOWN"] as const;

export type SystemActorRole = (typeof SYSTEM_ACTOR_ROLES)[number];

export type ActorRole = ActiveUserRole | SystemActorRole;

export type UserRoleNormalizationResult =
  | {
      ok: true;
      role: ActiveUserRole;
    }
  | {
      ok: false;
      code: Extract<ErrorCodeType, "VALIDATION_FAILED">;
    };

export function isActiveUserRole(value: unknown): value is ActiveUserRole {
  return (
    typeof value === "string" &&
    ACTIVE_USER_ROLES.includes(value as ActiveUserRole)
  );
}

export function isDeprecatedUserRoleAlias(
  value: unknown
): value is DeprecatedUserRoleAlias {
  return (
    typeof value === "string" &&
    Object.hasOwn(DEPRECATED_USER_ROLE_ALIASES, value)
  );
}

export function normalizeUserRole(value: unknown): UserRoleNormalizationResult {
  if (isActiveUserRole(value)) {
    return {
      ok: true,
      role: value,
    };
  }

  if (isDeprecatedUserRoleAlias(value)) {
    return {
      ok: true,
      role: DEPRECATED_USER_ROLE_ALIASES[value],
    };
  }

  return {
    ok: false,
    code: "VALIDATION_FAILED",
  };
}
