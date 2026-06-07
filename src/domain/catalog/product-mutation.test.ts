import { describe, expect, it } from "vitest";
import {
  requireBrandMembershipForMutation,
  validateBrandlessProductMutation,
} from "./product";

const activeBrand = {
  id: "brand_1",
  status: "ACTIVE" as const,
};

const archivedBrand = {
  id: "brand_1",
  status: "ARCHIVED" as const,
};

const activeMembership = {
  adminId: "admin_1",
  role: "MEMBER" as const,
  status: "ACTIVE" as const,
};

describe("requireBrandMembershipForMutation", () => {
  it("allows member create mutation in target brand", () => {
    const result = requireBrandMembershipForMutation({
      actor: {
        authenticated: true,
        role: "ADMIN",
        actorId: "admin_1",
      },
      targetBrandId: "brand_1",
      targetBrand: activeBrand,
      targetMembership: activeMembership,
    });

    expect(result.error).toBeNull();
    if (result.error) {
      throw result.error;
    }

    expect(result.content).toMatchObject({
      targetBrandId: "brand_1",
      sourceBrandId: null,
      reassignment: false,
    });
  });

  it("allows member edit mutation when source and target are same brand", () => {
    const result = requireBrandMembershipForMutation({
      actor: {
        authenticated: true,
        role: "ADMIN",
        actorId: "admin_1",
      },
      targetBrandId: "brand_1",
      sourceBrandId: "brand_1",
      targetBrand: activeBrand,
      sourceBrand: activeBrand,
      targetMembership: activeMembership,
      sourceMembership: activeMembership,
    });

    expect(result.error).toBeNull();
    if (result.error) {
      throw result.error;
    }

    expect(result.content).toMatchObject({
      targetBrandId: "brand_1",
      sourceBrandId: "brand_1",
      reassignment: false,
    });
  });

  it("denies non-member create mutation", () => {
    const result = requireBrandMembershipForMutation({
      actor: {
        authenticated: true,
        role: "ADMIN",
        actorId: "admin_1",
      },
      targetBrandId: "brand_1",
      targetBrand: activeBrand,
      targetMembership: null,
    });

    expect(result.error?.code).toBe("AUTH_FORBIDDEN");
    expect(result.error?.data).toMatchObject({
      reason: "BRAND_MEMBERSHIP_REQUIRED",
    });
  });

  it("denies non-member edit mutation", () => {
    const result = requireBrandMembershipForMutation({
      actor: {
        authenticated: true,
        role: "ADMIN",
        actorId: "admin_2",
      },
      targetBrandId: "brand_1",
      sourceBrandId: "brand_1",
      targetBrand: activeBrand,
      sourceBrand: activeBrand,
      targetMembership: null,
      sourceMembership: null,
    });

    expect(result.error?.code).toBe("AUTH_FORBIDDEN");
    expect(result.error?.data).toMatchObject({
      reason: "BRAND_MEMBERSHIP_REQUIRED",
    });
  });

  it("requires source and target permissions for reassignment", () => {
    const sourceDenied = requireBrandMembershipForMutation({
      actor: {
        authenticated: true,
        role: "ADMIN",
        actorId: "admin_1",
      },
      targetBrandId: "brand_2",
      sourceBrandId: "brand_1",
      targetBrand: {
        id: "brand_2",
        status: "ACTIVE",
      },
      sourceBrand: activeBrand,
      targetMembership: {
        adminId: "admin_1",
        role: "MEMBER",
        status: "ACTIVE",
      },
      sourceMembership: null,
    });

    expect(sourceDenied.error?.code).toBe("AUTH_FORBIDDEN");
    expect(sourceDenied.error?.data).toMatchObject({
      reason: "SOURCE_BRAND_PERMISSION_REQUIRED",
    });

    const targetDenied = requireBrandMembershipForMutation({
      actor: {
        authenticated: true,
        role: "ADMIN",
        actorId: "admin_1",
      },
      targetBrandId: "brand_2",
      sourceBrandId: "brand_1",
      targetBrand: {
        id: "brand_2",
        status: "ACTIVE",
      },
      sourceBrand: activeBrand,
      targetMembership: null,
      sourceMembership: activeMembership,
    });

    expect(targetDenied.error?.code).toBe("AUTH_FORBIDDEN");
    expect(targetDenied.error?.data).toMatchObject({
      reason: "TARGET_BRAND_PERMISSION_REQUIRED",
    });

    const allowed = requireBrandMembershipForMutation({
      actor: {
        authenticated: true,
        role: "ADMIN",
        actorId: "admin_1",
      },
      targetBrandId: "brand_2",
      sourceBrandId: "brand_1",
      targetBrand: {
        id: "brand_2",
        status: "ACTIVE",
      },
      sourceBrand: activeBrand,
      targetMembership: {
        adminId: "admin_1",
        role: "MEMBER",
        status: "ACTIVE",
      },
      sourceMembership: activeMembership,
    });

    expect(allowed.error).toBeNull();
    if (allowed.error) {
      throw allowed.error;
    }

    expect(allowed.content).toMatchObject({
      sourceBrandId: "brand_1",
      targetBrandId: "brand_2",
      reassignment: true,
    });
  });

  it("denies Super Admin catalog mutation", () => {
    const result = requireBrandMembershipForMutation({
      actor: {
        authenticated: true,
        role: "SUPER_ADMIN",
        actorId: "admin_owner",
      },
      targetBrandId: "brand_1",
      targetBrand: activeBrand,
      targetMembership: null,
    });

    expect(result.error?.code).toBe("AUTH_FORBIDDEN");
    expect(result.error?.data).toMatchObject({
      reason: "BRAND_MEMBERSHIP_REQUIRED",
    });
  });

  it("denies mutation on archived brand", () => {
    const result = requireBrandMembershipForMutation({
      actor: {
        authenticated: true,
        role: "ADMIN",
        actorId: "admin_1",
      },
      targetBrandId: "brand_1",
      targetBrand: archivedBrand,
      targetMembership: activeMembership,
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toMatchObject({
      reason: "BRAND_ARCHIVED",
    });
  });
});

describe("validateBrandlessProductMutation", () => {
  it("allows brandless mutation for authenticated admin", () => {
    const result = validateBrandlessProductMutation({
      actor: {
        authenticated: true,
        role: "ADMIN",
        actorId: "admin_1",
      },
    });

    expect(result.error).toBeNull();
  });
});
