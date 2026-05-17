import { describe, expect, it } from "vitest";
import {
  evaluateRouteAccess,
  type RbacActorContext,
  type RouteAuthMetadata,
} from "./rbac";

const requiredSuperAdmin = {
  mode: "required",
  roles: ["SUPER_ADMIN"],
} as const satisfies RouteAuthMetadata;

const requiredAdmin = {
  mode: "required",
  roles: ["ADMIN"],
} as const satisfies RouteAuthMetadata;

const requiredCustomer = {
  mode: "required",
  roles: ["CUSTOMER"],
} as const satisfies RouteAuthMetadata;

const publicProspect = {
  mode: "public",
  roles: ["PROSPECT"],
} as const satisfies RouteAuthMetadata;

function actor(overrides: Partial<RbacActorContext> = {}): RbacActorContext {
  return {
    authenticated: true,
    actorId: "actor_1",
    role: "CUSTOMER",
    eligibility: {
      active: true,
      emailVerified: true,
      approved: true,
    },
    ...overrides,
  };
}

describe("RBAC route policy", () => {
  it("allows public and optional routes for anonymous Prospect context", () => {
    expect(evaluateRouteAccess({ auth: publicProspect })).toEqual({
      allowed: true,
      actorRole: "PROSPECT",
    });
    expect(
      evaluateRouteAccess({
        auth: { mode: "optional", roles: ["PROSPECT", "CUSTOMER"] },
        actor: actor({ authenticated: false, role: "PROSPECT" }),
      })
    ).toEqual({ allowed: true, actorRole: "PROSPECT" });
  });

  it("returns AUTH_REQUIRED for missing, anonymous, or invalid sessions on required routes", () => {
    expect(evaluateRouteAccess({ auth: requiredSuperAdmin })).toMatchObject({
      allowed: false,
      code: "AUTH_REQUIRED",
    });
    expect(
      evaluateRouteAccess({
        auth: requiredSuperAdmin,
        actor: actor({ authenticated: false, role: "PROSPECT" }),
      })
    ).toMatchObject({ allowed: false, code: "AUTH_REQUIRED" });
    expect(
      evaluateRouteAccess({
        auth: requiredSuperAdmin,
        actor: actor({ role: "UNKNOWN" }),
      })
    ).toMatchObject({ allowed: false, code: "AUTH_REQUIRED" });
  });

  it("enforces exact role matches without implicit hierarchy", () => {
    expect(
      evaluateRouteAccess({
        auth: requiredSuperAdmin,
        actor: actor({ role: "SUPER_ADMIN" }),
      })
    ).toMatchObject({ allowed: true, actorRole: "SUPER_ADMIN" });
    expect(
      evaluateRouteAccess({
        auth: requiredSuperAdmin,
        actor: actor({ role: "ADMIN" }),
      })
    ).toMatchObject({ allowed: false, code: "AUTH_FORBIDDEN" });
    expect(
      evaluateRouteAccess({
        auth: requiredAdmin,
        actor: actor({ role: "SUPER_ADMIN" }),
      })
    ).toMatchObject({ allowed: false, code: "AUTH_FORBIDDEN" });
    expect(
      evaluateRouteAccess({
        auth: requiredCustomer,
        actor: actor({ role: "ADMIN" }),
      })
    ).toMatchObject({ allowed: false, code: "AUTH_FORBIDDEN" });
  });

  it("requires actor identity and configured roles for required routes", () => {
    expect(
      evaluateRouteAccess({
        auth: requiredCustomer,
        actor: actor({ actorId: undefined }),
      })
    ).toMatchObject({
      allowed: false,
      code: "AUTH_REQUIRED",
      reason: "MISSING_ACTOR_ID",
    });
    expect(
      evaluateRouteAccess({
        auth: { mode: "required", roles: [] } as unknown as RouteAuthMetadata,
        actor: actor({ role: "CUSTOMER" }),
      })
    ).toMatchObject({
      allowed: false,
      code: "AUTH_FORBIDDEN",
      reason: "REQUIRED_ROLES_NOT_CONFIGURED",
    });
  });

  it("allows explicit fallback only when route metadata lists each role", () => {
    expect(
      evaluateRouteAccess({
        auth: { mode: "required", roles: ["CUSTOMER", "SUPER_ADMIN"] },
        actor: actor({ role: "SUPER_ADMIN" }),
      })
    ).toMatchObject({ allowed: true, actorRole: "SUPER_ADMIN" });
  });

  it("normalizes STORE_ADMIN as ADMIN without adding a separate permission branch", () => {
    expect(
      evaluateRouteAccess({
        auth: requiredAdmin,
        actor: actor({ role: "STORE_ADMIN" as never }),
      })
    ).toMatchObject({ allowed: true, actorRole: "ADMIN" });
    expect(
      evaluateRouteAccess({
        auth: requiredSuperAdmin,
        actor: actor({ role: "STORE_ADMIN" as never }),
      })
    ).toMatchObject({ allowed: false, code: "AUTH_FORBIDDEN" });
  });

  it("returns safest specific denial for allowed-role actors with ineligible account state", () => {
    expect(
      evaluateRouteAccess({
        auth: requiredAdmin,
        actor: actor({
          role: "ADMIN",
          accountStatus: {
            status: "SUSPENDED",
            emailVerified: true,
            approved: true,
          },
          eligibility: { active: false, emailVerified: true, approved: true },
        }),
      })
    ).toMatchObject({ allowed: false, code: "ACCOUNT_SUSPENDED" });
    expect(
      evaluateRouteAccess({
        auth: requiredCustomer,
        actor: actor({
          role: "CUSTOMER",
          eligibility: { active: true, emailVerified: false, approved: true },
        }),
      })
    ).toMatchObject({ allowed: false, code: "EMAIL_NOT_VERIFIED" });
    expect(
      evaluateRouteAccess({
        auth: requiredAdmin,
        actor: actor({
          role: "ADMIN",
          eligibility: { active: true, emailVerified: true, approved: false },
        }),
      })
    ).toMatchObject({ allowed: false, code: "ADMIN_APPROVAL_REQUIRED" });
    expect(
      evaluateRouteAccess({
        auth: requiredSuperAdmin,
        actor: actor({
          role: "SUPER_ADMIN",
          eligibility: { active: true, emailVerified: true, approved: false },
        }),
      })
    ).toMatchObject({ allowed: false, code: "ADMIN_APPROVAL_REQUIRED" });
  });
});
