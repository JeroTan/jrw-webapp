import { describe, expect, it } from "vitest";
import type { AuditEvent } from "@/domain/audit/events";
import type {
  BrandRepository,
  BrandRecord,
} from "@/server/repositories/BrandRepository";
import { BrandService, type BrandActorInput } from "./BrandService";

const now = "2026-05-17T21:30:00.000Z";

function brandRecord(overrides: Partial<BrandRecord> = {}): BrandRecord {
  return {
    id: "brand_1",
    name: "JRW Lifestyle",
    slug: "jrw-lifestyle",
    description: "Catalog team",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function adminActor(overrides: Partial<BrandActorInput> = {}): BrandActorInput {
  return {
    authenticated: true,
    role: "ADMIN",
    actorId: "admin_1",
    accountStatus: {
      status: "ACTIVE" as const,
      emailVerified: true,
      approved: true,
    },
    eligibility: {
      active: true,
      emailVerified: true,
      approved: true,
    },
    ...overrides,
  };
}

class RepoStub implements BrandRepository {
  existingBySlug: BrandRecord | null = null;
  existingByName: BrandRecord | null = null;
  existingArchivedByName: BrandRecord | null = null;
  createBrandError: Error | null = null;
  createdMembershipCount = 0;

  async createBrand(): Promise<BrandRecord> {
    if (this.createBrandError) {
      throw this.createBrandError;
    }
    return brandRecord();
  }

  async createBrandMembership() {
    this.createdMembershipCount += 1;
    return {
      id: "bm_1",
      brandId: "brand_1",
      adminId: "admin_1",
      role: "OWNER" as const,
      status: "ACTIVE" as const,
      invitedByAdminId: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async createBrandWithOwnerMembership() {
    const brand = await this.createBrand();
    const membership = await this.createBrandMembership();

    return { brand, membership };
  }

  async findBrandBySlug() {
    return this.existingBySlug;
  }

  async findBrandByName() {
    return this.existingByName;
  }

  async findArchivedBrandByName() {
    return this.existingArchivedByName;
  }
}

describe("BrandService", () => {
  it("allows active approved ADMIN and SUPER_ADMIN to create brand", async () => {
    const repo = new RepoStub();
    const published: AuditEvent[] = [];
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
      auditPublisher: {
        publish: async (event) => {
          published.push(event);
        },
      },
    });

    const adminResult = await service.createBrand({
      actor: adminActor(),
      requestId: "req_admin_create_brand",
      body: {
        name: "JRW Lifestyle",
        description: "Catalog team",
      },
    });

    const superAdminResult = await service.createBrand({
      actor: adminActor({ role: "SUPER_ADMIN", actorId: "admin_owner" }),
      requestId: "req_super_admin_create_brand",
      body: {
        name: "JRW Lifestyle 2",
        slug: "jrw-lifestyle-2",
      },
    });

    expect(adminResult.error).toBeNull();
    expect(superAdminResult.error).toBeNull();
    expect(repo.createdMembershipCount).toBe(2);
    expect(published).toHaveLength(2);
    expect(published[0]).toMatchObject({
      action: "brand.created",
      requestId: "req_admin_create_brand",
      target: {
        entity: "brand",
      },
    });
  });

  it("denies customer, prospect, suspended admin, and unapproved admin", async () => {
    const service = new BrandService({
      repository: new RepoStub(),
      now: () => new Date(now),
    });

    const customer = await service.createBrand({
      actor: adminActor({ role: "CUSTOMER", actorId: "customer_1" }),
      requestId: "req_customer_denied",
      body: { name: "JRW Lifestyle" },
    });
    const prospect = await service.createBrand({
      actor: adminActor({ role: "PROSPECT", actorId: "prospect_1" }),
      requestId: "req_prospect_denied",
      body: { name: "JRW Lifestyle" },
    });
    const suspendedAdmin = await service.createBrand({
      actor: adminActor({
        accountStatus: {
          status: "SUSPENDED",
          emailVerified: true,
          approved: true,
        },
        eligibility: {
          active: false,
          emailVerified: true,
          approved: true,
        },
      }),
      requestId: "req_suspended_denied",
      body: { name: "JRW Lifestyle" },
    });
    const unapprovedAdmin = await service.createBrand({
      actor: adminActor({
        accountStatus: {
          status: "ACTIVE",
          emailVerified: true,
          approved: false,
        },
        eligibility: {
          active: true,
          emailVerified: true,
          approved: false,
        },
      }),
      requestId: "req_unapproved_denied",
      body: { name: "JRW Lifestyle" },
    });

    expect(customer.error?.code).toBe("AUTH_FORBIDDEN");
    expect(prospect.error?.code).toBe("AUTH_FORBIDDEN");
    expect(suspendedAdmin.error?.code).toBe("ACCOUNT_SUSPENDED");
    expect(unapprovedAdmin.error?.code).toBe("ADMIN_APPROVAL_REQUIRED");
  });

  it("maps validation and uniqueness conflicts to stable codes", async () => {
    const repo = new RepoStub();
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const invalid = await service.createBrand({
      actor: adminActor(),
      requestId: "req_invalid_brand",
      body: { name: "", slug: "Invalid Slug" },
    });
    expect(invalid.error?.code).toBe("VALIDATION_FAILED");

    repo.existingByName = brandRecord();
    const duplicateName = await service.createBrand({
      actor: adminActor(),
      requestId: "req_duplicate_name",
      body: { name: "JRW Lifestyle" },
    });
    expect(duplicateName.error?.code).toBe("CONFLICT_STATE");

    repo.existingByName = null;
    repo.existingBySlug = brandRecord();
    const duplicateSlug = await service.createBrand({
      actor: adminActor(),
      requestId: "req_duplicate_slug",
      body: { name: "JRW Lifestyle", slug: "jrw-lifestyle" },
    });
    expect(duplicateSlug.error?.code).toBe("CONFLICT_STATE");

    repo.existingBySlug = null;
    repo.existingArchivedByName = brandRecord({ status: "ARCHIVED" });
    const archivedNameConflict = await service.createBrand({
      actor: adminActor(),
      requestId: "req_archived_conflict",
      body: { name: "JRW Lifestyle" },
    });
    expect(archivedNameConflict.error?.code).toBe("CONFLICT_STATE");
  });

  it("maps repository failure to PROVIDER_UNAVAILABLE", async () => {
    const repo = new RepoStub();
    repo.createBrandError = new Error("SQLITE_ERROR: database unavailable");
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const result = await service.createBrand({
      actor: adminActor(),
      requestId: "req_provider_down",
      body: { name: "JRW Lifestyle" },
    });

    expect(result.error?.code).toBe("PROVIDER_UNAVAILABLE");
  });

  it("emits safe audit details without secret fields", async () => {
    const published: AuditEvent[] = [];
    const service = new BrandService({
      repository: new RepoStub(),
      now: () => new Date(now),
      auditPublisher: {
        publish: async (event) => {
          published.push(event);
        },
      },
    });

    const result = await service.createBrand({
      actor: adminActor(),
      requestId: "req_audit_safety",
      body: {
        name: "JRW Lifestyle",
        description: "safe",
      },
    });

    expect(result.error).toBeNull();
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({
      action: "brand.created",
      entity: "brand",
      safeDetails: {
        name: "JRW Lifestyle",
        slug: "jrw-lifestyle",
        requestId: "req_audit_safety",
      },
    });
    const serialized = JSON.stringify(published[0]);
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("token");
  });
});
