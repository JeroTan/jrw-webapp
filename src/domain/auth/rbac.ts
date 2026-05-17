import type { ErrorCodeType } from "@/utils/general/error";
import {
  normalizeUserRole,
  type ActiveUserRole,
  type ActorRole,
  type DeprecatedUserRoleAlias,
} from "./roles";

export type RouteAuthMode = "public" | "optional" | "required";
export type RouteRole = ActiveUserRole;
export type NonEmptyRouteRoles = readonly [RouteRole, ...RouteRole[]];

export type RouteAuthMetadata =
  | {
      mode: "required";
      roles: NonEmptyRouteRoles;
    }
  | {
      mode: Exclude<RouteAuthMode, "required">;
      roles?: readonly RouteRole[];
    };

export type RbacActorContext = {
  authenticated: boolean;
  role: ActorRole | DeprecatedUserRoleAlias;
  actorId?: string;
  accountStatus?: {
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    emailVerified: boolean;
    approved: boolean;
  };
  eligibility?: {
    active: boolean;
    emailVerified: boolean;
    approved: boolean;
  };
};

export type RouteAccessDecision =
  | {
      allowed: true;
      actorRole: ActiveUserRole;
    }
  | {
      allowed: false;
      code: Extract<
        ErrorCodeType,
        | "AUTH_REQUIRED"
        | "AUTH_FORBIDDEN"
        | "ACCOUNT_SUSPENDED"
        | "EMAIL_NOT_VERIFIED"
        | "ADMIN_APPROVAL_REQUIRED"
      >;
      reason:
        | "MISSING_AUTHENTICATED_ACTOR"
        | "INVALID_ACTOR_ROLE"
        | "MISSING_ACTOR_ID"
        | "ROLE_NOT_ALLOWED"
        | "REQUIRED_ROLES_NOT_CONFIGURED"
        | "ACCOUNT_SUSPENDED"
        | "ACCOUNT_INACTIVE"
        | "EMAIL_NOT_VERIFIED"
        | "ADMIN_APPROVAL_REQUIRED";
    };

export type EvaluateRouteAccessInput = {
  auth: RouteAuthMetadata;
  actor?: RbacActorContext;
};

function prospectDecision(): RouteAccessDecision {
  return {
    allowed: true,
    actorRole: "PROSPECT",
  };
}

function normalizeActorRole(
  actor: RbacActorContext | undefined
): ActiveUserRole | undefined {
  const normalized = normalizeUserRole(actor?.role);

  return normalized.ok ? normalized.role : undefined;
}

function hasActorIdentity(actor: RbacActorContext): boolean {
  return typeof actor.actorId === "string" && actor.actorId.trim().length > 0;
}

function accountStateDenial(
  actor: RbacActorContext,
  role: ActiveUserRole
): RouteAccessDecision | undefined {
  const emailVerified =
    actor.eligibility?.emailVerified ?? actor.accountStatus?.emailVerified;
  const approved = actor.eligibility?.approved ?? actor.accountStatus?.approved;

  if (actor.accountStatus?.status === "SUSPENDED") {
    return {
      allowed: false,
      code: "ACCOUNT_SUSPENDED",
      reason: "ACCOUNT_SUSPENDED",
    };
  }

  if (actor.accountStatus?.status === "INACTIVE") {
    return {
      allowed: false,
      code: "AUTH_FORBIDDEN",
      reason: "ACCOUNT_INACTIVE",
    };
  }

  if (actor.eligibility?.active === false) {
    return {
      allowed: false,
      code: "AUTH_FORBIDDEN",
      reason: "ACCOUNT_INACTIVE",
    };
  }

  if (emailVerified === false) {
    return {
      allowed: false,
      code: "EMAIL_NOT_VERIFIED",
      reason: "EMAIL_NOT_VERIFIED",
    };
  }

  if ((role === "ADMIN" || role === "SUPER_ADMIN") && approved === false) {
    return {
      allowed: false,
      code: "ADMIN_APPROVAL_REQUIRED",
      reason: "ADMIN_APPROVAL_REQUIRED",
    };
  }

  return undefined;
}

export function evaluateRouteAccess({
  auth,
  actor,
}: EvaluateRouteAccessInput): RouteAccessDecision {
  if (auth.mode === "public" || auth.mode === "optional") {
    const normalizedRole = normalizeActorRole(actor);

    return normalizedRole
      ? {
          allowed: true,
          actorRole: normalizedRole,
        }
      : prospectDecision();
  }

  if (!actor?.authenticated) {
    return {
      allowed: false,
      code: "AUTH_REQUIRED",
      reason: "MISSING_AUTHENTICATED_ACTOR",
    };
  }

  const normalizedRole = normalizeActorRole(actor);

  if (!normalizedRole) {
    return {
      allowed: false,
      code: "AUTH_REQUIRED",
      reason: "INVALID_ACTOR_ROLE",
    };
  }

  if (!hasActorIdentity(actor)) {
    return {
      allowed: false,
      code: "AUTH_REQUIRED",
      reason: "MISSING_ACTOR_ID",
    };
  }

  const requiredRoles = auth.roles ?? [];

  if (!requiredRoles.length) {
    return {
      allowed: false,
      code: "AUTH_FORBIDDEN",
      reason: "REQUIRED_ROLES_NOT_CONFIGURED",
    };
  }

  if (!requiredRoles.includes(normalizedRole)) {
    return {
      allowed: false,
      code: "AUTH_FORBIDDEN",
      reason: "ROLE_NOT_ALLOWED",
    };
  }

  const stateDenial = accountStateDenial(actor, normalizedRole);
  if (stateDenial) return stateDenial;

  return {
    allowed: true,
    actorRole: normalizedRole,
  };
}
