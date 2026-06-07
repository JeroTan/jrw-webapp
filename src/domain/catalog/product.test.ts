import { describe, expect, it } from "vitest";
import { listBrandScopedProducts } from "./product";

const activeBrand = {
  id: "brand_1",
  status: "ACTIVE" as const,
};

describe("listBrandScopedProducts", () => {
  it("allows active brand member admin", () => {
    const result = listBrandScopedProducts({
      actor: {
        authenticated: true,
        role: "ADMIN",
        actorId: "admin_1",
      },
      brandId: "brand_1",
      brand: activeBrand,
      membership: {
        adminId: "admin_1",
        role: "MEMBER",
        status: "ACTIVE",
      },
      page: 2,
      pageSize: 50,
    });

    expect(result.error).toBeNull();
    if (result.error) {
      throw result.error;
    }

    expect(result.content).toMatchObject({
      brandId: "brand_1",
      page: 2,
      pageSize: 50,
    });
  });

  it("denies Super Admin brand-scoped product listing", () => {
    const result = listBrandScopedProducts({
      actor: {
        authenticated: true,
        role: "SUPER_ADMIN",
        actorId: "admin_owner",
      },
      brandId: "brand_1",
      brand: activeBrand,
      membership: null,
    });

    expect(result.error?.code).toBe("AUTH_FORBIDDEN");
    expect(result.error?.data).toMatchObject({
      reason: "BRAND_MEMBERSHIP_REQUIRED",
    });
  });

  it("blocks archived brand", () => {
    const result = listBrandScopedProducts({
      actor: {
        authenticated: true,
        role: "ADMIN",
        actorId: "admin_1",
      },
      brandId: "brand_1",
      brand: {
        id: "brand_1",
        status: "ARCHIVED",
      },
      membership: {
        adminId: "admin_1",
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toMatchObject({ reason: "BRAND_ARCHIVED" });
  });

  it("blocks unknown brand", () => {
    const result = listBrandScopedProducts({
      actor: {
        authenticated: true,
        role: "ADMIN",
        actorId: "admin_1",
      },
      brandId: "brand_missing",
      brand: null,
      membership: null,
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toMatchObject({ reason: "BRAND_NOT_FOUND" });
  });

  it("blocks non-member admin", () => {
    const result = listBrandScopedProducts({
      actor: {
        authenticated: true,
        role: "ADMIN",
        actorId: "admin_1",
      },
      brandId: "brand_1",
      brand: activeBrand,
      membership: null,
    });

    expect(result.error?.code).toBe("AUTH_FORBIDDEN");
    expect(result.error?.data).toMatchObject({
      reason: "BRAND_MEMBERSHIP_REQUIRED",
    });
  });
});
