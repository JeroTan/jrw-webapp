import { describe, expect, it } from "vitest";
import {
  ACTIVE_USER_ROLES,
  DEPRECATED_USER_ROLE_ALIASES,
  isActiveUserRole,
  normalizeUserRole,
} from "./roles";

describe("user role domain", () => {
  it("defines only current active user roles", () => {
    expect(ACTIVE_USER_ROLES).toEqual([
      "SUPER_ADMIN",
      "ADMIN",
      "CUSTOMER",
      "PROSPECT",
    ]);
    expect(ACTIVE_USER_ROLES).not.toContain("STORE_ADMIN");
  });

  it("keeps STORE_ADMIN as deprecated input alias only", () => {
    expect(DEPRECATED_USER_ROLE_ALIASES).toEqual({
      STORE_ADMIN: "ADMIN",
    });
    expect(normalizeUserRole("STORE_ADMIN")).toEqual({
      ok: true,
      role: "ADMIN",
    });
  });

  it("normalizes active roles without exposing aliases as active roles", () => {
    for (const role of ACTIVE_USER_ROLES) {
      expect(isActiveUserRole(role)).toBe(true);
      expect(normalizeUserRole(role)).toEqual({
        ok: true,
        role,
      });
    }

    expect(isActiveUserRole("STORE_ADMIN")).toBe(false);
  });

  it("rejects unknown roles with a stable safe error code", () => {
    expect(normalizeUserRole("OWNER")).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
    });
  });
});
