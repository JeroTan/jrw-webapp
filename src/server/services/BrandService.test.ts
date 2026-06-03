import { describe, expect, it } from "vitest";
import type { AuditEvent } from "@/domain/audit/events";
import type {
  ProductBrandLookup,
  BrandRepository,
  BrandRecord,
} from "@/server/repositories/BrandRepository";
import type {
  ImageRepository,
  UploadedImageMetadata,
} from "@/server/repositories/ImageRepository";
import { BrandService, type BrandActorInput } from "./BrandService";

const now = "2026-05-17T21:30:00.000Z";

function brandRecord(overrides: Partial<BrandRecord> = {}): BrandRecord {
  return {
    id: "brand_1",
    name: "JRW Lifestyle",
    slug: "jrw-lifestyle",
    description: "Catalog team",
    status: "ACTIVE",
    archivedAt: null,
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
  existingById: BrandRecord | null = brandRecord();
  existingByIdIncludingArchived: BrandRecord | null = brandRecord();
  createBrandError: Error | null = null;
  updateBrandError: Error | null = null;
  updateBrandImageError: Error | null = null;
  archiveBrandError: Error | null = null;
  createBrandMembershipError: Error | null = null;
  createdMembershipCount = 0;
  createdMembershipInputs: Array<Record<string, unknown>> = [];
  updateCalls: Array<Record<string, unknown>> = [];
  imageUpdateCalls: Array<Record<string, unknown>> = [];
  archiveCalls: Array<Record<string, unknown>> = [];
  listProductsError: Error | null = null;
  products: Array<{
    id: string;
    name: string;
    description: string;
    brandId: string | null;
    createdAt: string;
    updatedAt: string;
  }> = [
    {
      id: "product_1",
      name: "Scoped Product 1",
      description: "scoped product one",
      brandId: "brand_1",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "product_2",
      name: "Scoped Product 2",
      description: "scoped product two",
      brandId: "brand_2",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "product_3",
      name: "Brandless Product 1",
      description: "brandless product one",
      brandId: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
  brandById: Record<string, BrandRecord> = {
    brand_1: brandRecord(),
    brand_2: brandRecord({
      id: "brand_2",
      name: "JRW Home",
      slug: "jrw-home",
    }),
    brand_archived: brandRecord({
      id: "brand_archived",
      name: "JRW Archive",
      slug: "jrw-archive",
      status: "ARCHIVED",
      archivedAt: now,
    }),
  };
  membershipByAdminId: Record<
    string,
    {
      role: "OWNER" | "MEMBER";
      status: "ACTIVE" | "PENDING" | "REVOKED";
      invitedByAdminId: string | null;
    }
  > = {
    admin_1: { role: "OWNER", status: "ACTIVE", invitedByAdminId: null },
    admin_member: { role: "MEMBER", status: "ACTIVE", invitedByAdminId: null },
  };
  membershipByBrandAdminKey: Record<
    string,
    {
      role: "OWNER" | "MEMBER";
      status: "ACTIVE" | "PENDING" | "REVOKED";
      invitedByAdminId: string | null;
    }
  > = {};
  productBrandAssignmentByProductId: Record<string, string | null> = {
    product_1: "brand_1",
    product_2: "brand_2",
    product_3: null,
  };
  productBrandAssignmentLookups = 0;
  adminById: Record<
    string,
    {
      id: string;
      email: string;
      role: "ADMIN" | "SUPER_ADMIN";
      status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
      emailVerifiedAt: string | null;
      approvedAt: string | null;
    }
  > = {
    admin_1: {
      id: "admin_1",
      email: "owner@example.test",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: now,
      approvedAt: now,
    },
    admin_member: {
      id: "admin_member",
      email: "member@example.test",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: now,
      approvedAt: now,
    },
    admin_target: {
      id: "admin_target",
      email: "target@example.test",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: now,
      approvedAt: now,
    },
    admin_suspended: {
      id: "admin_suspended",
      email: "suspended@example.test",
      role: "ADMIN",
      status: "SUSPENDED",
      emailVerifiedAt: now,
      approvedAt: now,
    },
    admin_owner: {
      id: "admin_owner",
      email: "owner-root@example.test",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: now,
      approvedAt: now,
    },
  };

  async createBrand(): Promise<BrandRecord> {
    if (this.createBrandError) {
      throw this.createBrandError;
    }
    return brandRecord();
  }

  async createBrandMembership(input?: {
    brandId: string;
    adminId: string;
    role: "OWNER" | "MEMBER";
    status: "ACTIVE" | "PENDING" | "REVOKED";
    invitedByAdminId: string | null;
    createdAt: string;
    updatedAt: string;
  }) {
    if (this.createBrandMembershipError) {
      throw this.createBrandMembershipError;
    }

    this.createdMembershipCount += 1;
    this.createdMembershipInputs.push({ ...(input ?? {}) });

    if (!input) {
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

    return {
      id: "bm_1",
      brandId: input.brandId,
      adminId: input.adminId,
      role: input.role,
      status: input.status,
      invitedByAdminId: input.invitedByAdminId,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
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

  async updateBrand(brandId: string, input: Record<string, unknown>) {
    if (this.updateBrandError) {
      throw this.updateBrandError;
    }
    this.updateCalls.push({ brandId, ...input });
    return brandRecord({
      ...this.existingById,
      ...("name" in input ? { name: input.name as string } : {}),
      ...("slug" in input ? { slug: input.slug as string } : {}),
      ...("description" in input
        ? { description: input.description as string | null }
        : {}),
      updatedAt: (input.updatedAt as string) ?? now,
    });
  }

  async updateBrandImage(brandId: string, input: Record<string, unknown>) {
    if (this.updateBrandImageError) {
      throw this.updateBrandImageError;
    }

    this.imageUpdateCalls.push({ brandId, ...input });
    return brandRecord({
      ...this.existingById,
      imageSrc: input.imageId as string,
      imageAlt: input.imageAlt as string | null,
      updatedAt: (input.updatedAt as string) ?? now,
    });
  }

  async archiveBrand(brandId: string, timestamp: string) {
    if (this.archiveBrandError) {
      throw this.archiveBrandError;
    }
    this.archiveCalls.push({ brandId, timestamp });
    return brandRecord({
      ...this.existingByIdIncludingArchived,
      status: "ARCHIVED",
      archivedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async findBrandById(brandId: string) {
    if (this.existingById && this.existingById.id === brandId) {
      return this.existingById;
    }

    return this.brandById[brandId] ?? null;
  }

  async findBrandByIdIncludingArchived(brandId: string) {
    if (
      this.existingByIdIncludingArchived &&
      this.existingByIdIncludingArchived.id === brandId
    ) {
      return this.existingByIdIncludingArchived;
    }

    return this.brandById[brandId] ?? null;
  }

  async findBrandByNameExcluding() {
    return this.existingByName;
  }

  async findArchivedBrandByNameExcluding() {
    return this.existingArchivedByName;
  }

  async findBrandBySlugExcluding() {
    return this.existingBySlug;
  }

  async findMembershipByBrandAndAdmin(brandId: string, adminId: string) {
    const keyed = this.membershipByBrandAdminKey[`${brandId}:${adminId}`];
    const membership = keyed ?? this.membershipByAdminId[adminId];
    if (!membership) return null;

    return {
      id: `membership_${adminId}`,
      brandId,
      adminId,
      role: membership.role,
      status: membership.status,
      invitedByAdminId: membership.invitedByAdminId,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findBrandByIdForMutation(brandId: string) {
    return this.findBrandByIdIncludingArchived(brandId);
  }

  async findMembershipForMutation(brandId: string, adminId: string) {
    return this.findMembershipByBrandAndAdmin(brandId, adminId);
  }

  async findProductBrandAssignment(productId: string) {
    this.productBrandAssignmentLookups += 1;
    if (
      !Object.prototype.hasOwnProperty.call(
        this.productBrandAssignmentByProductId,
        productId
      )
    ) {
      return null;
    }

    return {
      productId,
      brandId: this.productBrandAssignmentByProductId[productId],
    };
  }

  async updateMembershipStatus(
    _membershipId: string,
    _brandId: string,
    adminId: string,
    newStatus: "ACTIVE" | "PENDING" | "REVOKED",
    newRole?: "OWNER" | "MEMBER"
  ) {
    const membership = this.membershipByAdminId[adminId];
    if (!membership || membership.status !== "PENDING") {
      return null;
    }

    this.membershipByAdminId[adminId] = {
      role: newRole ?? membership.role,
      status: newStatus,
      invitedByAdminId: membership.invitedByAdminId,
    };

    return {
      id: `membership_${adminId}`,
      brandId: "brand_1",
      adminId,
      role: this.membershipByAdminId[adminId].role,
      status: this.membershipByAdminId[adminId].status,
      invitedByAdminId: this.membershipByAdminId[adminId].invitedByAdminId,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findPendingInvitationByAdminAndBrand(
    _adminId: string,
    _brandId: string
  ) {
    const membership = this.membershipByAdminId[_adminId];
    if (
      !membership ||
      membership.status !== "PENDING" ||
      !membership.invitedByAdminId
    ) {
      return null;
    }

    return {
      id: `membership_${_adminId}`,
      brandId: "brand_1",
      adminId: _adminId,
      role: membership.role,
      status: membership.status,
      invitedByAdminId: membership.invitedByAdminId,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findPendingJoinRequestByAdminAndBrand(
    _adminId: string,
    _brandId: string
  ) {
    const membership = this.membershipByAdminId[_adminId];
    if (
      !membership ||
      membership.status !== "PENDING" ||
      membership.invitedByAdminId !== null
    ) {
      return null;
    }

    return {
      id: `membership_${_adminId}`,
      brandId: "brand_1",
      adminId: _adminId,
      role: membership.role,
      status: membership.status,
      invitedByAdminId: membership.invitedByAdminId,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findBrandMemberships(_brandId: string) {
    return Object.entries(this.membershipByAdminId).map(
      ([adminId, membership]) => ({
        id: `membership_${adminId}`,
        brandId: "brand_1",
        adminId,
        role: membership.role,
        status: membership.status,
        invitedByAdminId: membership.invitedByAdminId,
        createdAt: now,
        updatedAt: now,
      })
    );
  }

  async findBrandInvitations(_brandId: string) {
    return (await this.findBrandMemberships(_brandId)).filter(
      (membership) => membership.invitedByAdminId !== null
    );
  }

  async findBrandJoinRequests(_brandId: string) {
    return (await this.findBrandMemberships(_brandId)).filter(
      (membership) =>
        membership.role === "MEMBER" && membership.invitedByAdminId === null
    );
  }

  async findActiveBrandMembers(_brandId: string) {
    return Object.entries(this.membershipByAdminId)
      .filter(([, membership]) => membership.status === "ACTIVE")
      .map(([adminId, membership]) => ({
        id: `membership_${adminId}`,
        brandId: "brand_1",
        adminId,
        role: membership.role,
        status: membership.status,
        invitedByAdminId: membership.invitedByAdminId,
        createdAt: now,
        updatedAt: now,
      }));
  }

  async findProductsByBrand(
    brand: ProductBrandLookup,
    options?: { page?: number; pageSize?: number }
  ) {
    if (this.listProductsError) {
      throw this.listProductsError;
    }

    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const items = this.products
      .filter((product) => product.brandId === brand.id)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const totalItems = items.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
    const start = (page - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  async findBrandlessProducts(options?: { page?: number; pageSize?: number }) {
    if (this.listProductsError) {
      throw this.listProductsError;
    }

    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const items = this.products
      .filter((product) => product.brandId === null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const totalItems = items.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
    const start = (page - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  async findBrandsByAdmin(adminId: string) {
    const membership = this.membershipByAdminId[adminId];
    if (!membership || membership.status !== "ACTIVE") {
      return [];
    }

    return Object.values(this.brandById).filter(
      (brand) => brand.status === "ACTIVE"
    );
  }

  async findAdminById(adminId: string) {
    return this.adminById[adminId] ?? null;
  }

  async findAdminByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return (
      Object.values(this.adminById).find(
        (admin) => admin.email.toLowerCase() === normalized
      ) ?? null
    );
  }
}

class ImageRepoStub implements ImageRepository {
  uploadCalls: Array<{ file: File; key: string }> = [];
  deletedKeys: string[] = [];

  getPublicUrl(key: string): string {
    return `/assets/${key}`;
  }

  async upload(file: File, key: string): Promise<UploadedImageMetadata> {
    this.uploadCalls.push({ file, key });
    return {
      key,
      size: file.size,
      contentType: file.type,
      uploadedAt: now,
      etag: "etag_brand_image",
      url: this.getPublicUrl(key),
    };
  }

  async get(_key: string): Promise<R2ObjectBody | null> {
    return null;
  }

  async delete(key: string): Promise<void> {
    this.deletedKeys.push(key);
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

  it("loads brand detail and membership surfaces for active brand members", async () => {
    const repo = new RepoStub();
    repo.membershipByAdminId.admin_pending_invite = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: "admin_1",
    };
    repo.membershipByAdminId.admin_pending_request = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: null,
    };
    repo.adminById.admin_pending_invite = {
      id: "admin_pending_invite",
      email: "invitee@example.test",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: now,
      approvedAt: now,
    };
    repo.adminById.admin_pending_request = {
      id: "admin_pending_request",
      email: "requester@example.test",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: now,
      approvedAt: now,
    };
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const detail = await service.getBrandDetail({
      actor: adminActor({ actorId: "admin_member" }),
      requestId: "req_brand_detail",
      brandId: "brand_1",
    });
    const members = await service.listBrandMembers({
      actor: adminActor({ actorId: "admin_member" }),
      requestId: "req_brand_members",
      brandId: "brand_1",
    });
    const invites = await service.listBrandInvites({
      actor: adminActor({ actorId: "admin_member" }),
      requestId: "req_brand_invites",
      brandId: "brand_1",
    });
    const joinRequests = await service.listBrandJoinRequests({
      actor: adminActor({ actorId: "admin_member" }),
      requestId: "req_brand_join_requests",
      brandId: "brand_1",
    });

    expect(detail.error).toBeNull();
    expect(detail.content?.brand.id).toBe("brand_1");
    expect(members.error).toBeNull();
    expect(members.content?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adminId: "admin_member",
          adminEmail: "member@example.test",
        }),
        expect.objectContaining({
          adminId: "admin_pending_invite",
          adminEmail: "invitee@example.test",
        }),
      ])
    );
    expect(invites.content?.items).toEqual([
      expect.objectContaining({
        adminId: "admin_pending_invite",
        adminEmail: "invitee@example.test",
        invitedByLabel: "owner@example.test",
      }),
    ]);
    expect(joinRequests.content?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adminId: "admin_pending_request",
          adminEmail: "requester@example.test",
        }),
      ])
    );
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

  it("uploads optional brand image for active brand member", async () => {
    const repo = new RepoStub();
    const imageRepository = new ImageRepoStub();
    const published: AuditEvent[] = [];
    const service = new BrandService({
      repository: repo,
      imageRepository,
      now: () => new Date(now),
      auditPublisher: {
        publish: async (event) => {
          published.push(event);
        },
      },
    });

    const result = await service.uploadBrandImage({
      actor: adminActor(),
      requestId: "req_brand_image",
      brandId: "brand_1",
      file: new File(["brand"], "brand.jpg", { type: "image/jpeg" }),
      name: "JRW Lifestyle mark",
    });

    expect(result.error).toBeNull();
    expect(imageRepository.uploadCalls).toHaveLength(1);
    expect(imageRepository.uploadCalls[0].key).toMatch(
      /^brands\/brand_1\/.+\.jpg$/
    );
    expect(repo.imageUpdateCalls[0]).toMatchObject({
      brandId: "brand_1",
      imageAlt: "JRW Lifestyle mark",
    });
    expect(result.content?.brand).toMatchObject({
      imageAlt: "JRW Lifestyle mark",
    });
    expect(published[0]).toMatchObject({
      action: "brand.updated",
      target: { entity: "brand", entityId: "brand_1" },
    });
  });

  it("invites eligible admins for OWNER, MEMBER, and SUPER_ADMIN actor paths", async () => {
    const repo = new RepoStub();
    repo.adminById.admin_target_2 = {
      id: "admin_target_2",
      email: "target2@example.test",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: now,
      approvedAt: now,
    };
    repo.adminById.admin_target_3 = {
      id: "admin_target_3",
      email: "target3@example.test",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: now,
      approvedAt: now,
    };
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

    const ownerInvite = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_owner_invite",
      brandId: "brand_1",
      body: { adminId: "admin_target" },
    });
    const memberInvite = await service.inviteAdminToBrand({
      actor: adminActor({ actorId: "admin_member" }),
      requestId: "req_member_invite",
      brandId: "brand_1",
      body: { adminId: "admin_target_2" },
    });
    const superAdminInvite = await service.inviteAdminToBrand({
      actor: adminActor({ actorId: "admin_owner", role: "SUPER_ADMIN" }),
      requestId: "req_super_invite",
      brandId: "brand_1",
      body: { email: "target3@example.test" },
    });

    expect(ownerInvite.error).toBeNull();
    expect(memberInvite.error).toBeNull();
    expect(superAdminInvite.error).toBeNull();
    expect(repo.createdMembershipCount).toBe(3);
    expect(repo.createdMembershipInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adminId: "admin_target",
          role: "MEMBER",
          status: "PENDING",
          invitedByAdminId: "admin_1",
        }),
        expect.objectContaining({
          adminId: "admin_target_2",
          role: "MEMBER",
          status: "PENDING",
          invitedByAdminId: "admin_member",
        }),
        expect.objectContaining({
          adminId: "admin_target_3",
          role: "MEMBER",
          status: "PENDING",
          invitedByAdminId: "admin_owner",
        }),
      ])
    );
    expect(published).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "brand.member_invited",
          requestId: "req_owner_invite",
        }),
        expect.objectContaining({
          action: "brand.member_invited",
          requestId: "req_member_invite",
        }),
        expect.objectContaining({
          action: "brand.member_invited",
          requestId: "req_super_invite",
        }),
      ])
    );
  });

  it("denies invite for actor without active brand membership", async () => {
    const repo = new RepoStub();
    delete repo.membershipByAdminId.admin_1;
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const denied = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_invite_non_member",
      brandId: "brand_1",
      body: { adminId: "admin_target" },
    });

    expect(denied.error?.code).toBe("AUTH_FORBIDDEN");
  });

  it("rejects invite for suspended, inactive, unverified, unapproved, non-ADMIN role, and missing target", async () => {
    const repo = new RepoStub();
    repo.adminById.admin_inactive = {
      id: "admin_inactive",
      email: "inactive@example.test",
      role: "ADMIN",
      status: "INACTIVE",
      emailVerifiedAt: now,
      approvedAt: now,
    };
    repo.adminById.admin_unverified = {
      id: "admin_unverified",
      email: "unverified@example.test",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: null,
      approvedAt: now,
    };
    repo.adminById.admin_unapproved = {
      id: "admin_unapproved",
      email: "unapproved@example.test",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: now,
      approvedAt: null,
    };
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const suspended = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_invite_suspended",
      brandId: "brand_1",
      body: { adminId: "admin_suspended" },
    });
    const nonAdminRole = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_invite_super_admin_target",
      brandId: "brand_1",
      body: { adminId: "admin_owner" },
    });
    const inactive = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_invite_inactive_target",
      brandId: "brand_1",
      body: { adminId: "admin_inactive" },
    });
    const unverified = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_invite_unverified_target",
      brandId: "brand_1",
      body: { adminId: "admin_unverified" },
    });
    const unapproved = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_invite_unapproved_target",
      brandId: "brand_1",
      body: { adminId: "admin_unapproved" },
    });
    const missing = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_invite_missing_target",
      brandId: "brand_1",
      body: { adminId: "missing_admin" },
    });

    expect(suspended.error?.code).toBe("VALIDATION_FAILED");
    expect(suspended.error?.data).toMatchObject({
      reason: "TARGET_ADMIN_SUSPENDED",
    });
    expect(nonAdminRole.error?.code).toBe("VALIDATION_FAILED");
    expect(nonAdminRole.error?.data).toMatchObject({
      reason: "TARGET_ROLE_NOT_ADMIN",
    });
    expect(inactive.error?.code).toBe("VALIDATION_FAILED");
    expect(inactive.error?.data).toMatchObject({
      reason: "TARGET_ADMIN_INACTIVE",
    });
    expect(unverified.error?.code).toBe("VALIDATION_FAILED");
    expect(unverified.error?.data).toMatchObject({
      reason: "TARGET_EMAIL_NOT_VERIFIED",
    });
    expect(unapproved.error?.code).toBe("VALIDATION_FAILED");
    expect(unapproved.error?.data).toMatchObject({
      reason: "TARGET_ADMIN_NOT_APPROVED",
    });
    expect(missing.error?.code).toBe("VALIDATION_FAILED");
    expect(missing.error?.data).toMatchObject({
      reason: "TARGET_ADMIN_NOT_FOUND",
    });
  });

  it("returns conflict for duplicate active or pending invitation state", async () => {
    const repo = new RepoStub();
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    repo.membershipByAdminId.admin_target = {
      role: "MEMBER",
      status: "ACTIVE",
      invitedByAdminId: null,
    };
    const activeConflict = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_invite_active_conflict",
      brandId: "brand_1",
      body: { adminId: "admin_target" },
    });

    repo.membershipByAdminId.admin_target = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: "admin_1",
    };
    const pendingConflict = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_invite_pending_conflict",
      brandId: "brand_1",
      body: { adminId: "admin_target" },
    });

    expect(activeConflict.error?.code).toBe("CONFLICT_STATE");
    expect(activeConflict.error?.data).toMatchObject({
      reason: "DUPLICATE_ACTIVE_MEMBERSHIP",
    });
    expect(pendingConflict.error?.code).toBe("CONFLICT_STATE");
    expect(pendingConflict.error?.data).toMatchObject({
      reason: "DUPLICATE_PENDING_INVITATION",
    });
  });

  it("sends safe invitation email payload and emits audit without target email leakage", async () => {
    const repo = new RepoStub();
    const emails: Array<Record<string, unknown>> = [];
    const published: AuditEvent[] = [];
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
      invitationEmailsEnabled: true,
      brandInvitationActionUrl: "https://jrw.test/admin/brands/invitations",
      accountEmails: {
        sendVerificationEmail: async () => ({ ok: true }),
        sendPasswordResetEmail: async () => ({ ok: true }),
        sendAdminInvitationEmail: async () => ({ ok: true }),
        sendAdminApprovalEmail: async () => ({ ok: true }),
        sendAdminRejectionEmail: async () => ({ ok: true }),
        sendBrandInvitationEmail: async (input) => {
          emails.push({ ...input });
          return { ok: true };
        },
      },
      auditPublisher: {
        publish: async (event) => {
          published.push(event);
        },
      },
    });

    const result = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_invite_notify",
      brandId: "brand_1",
      body: { adminId: "admin_target" },
    });

    expect(result.error).toBeNull();
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({
      toEmail: "target@example.test",
      brandName: "JRW Lifestyle",
      invitedByDisplayName: "admin_1",
      requestId: "req_invite_notify",
    });
    expect(String(emails[0]?.actionUrl)).toContain("brandId=brand_1");
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({
      action: "brand.member_invited",
      safeDetails: {
        targetAdminId: "admin_target",
      },
    });
    expect(JSON.stringify(published[0])).not.toContain("target@example.test");
  });

  it("maps invite persistence failures to CONFLICT_STATE or PROVIDER_UNAVAILABLE", async () => {
    const repo = new RepoStub();
    repo.createBrandMembershipError = new Error(
      "SQLITE_CONSTRAINT: UNIQUE constraint failed: brand_memberships.brand_id, brand_memberships.admin_id"
    );
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const conflict = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_invite_unique_conflict",
      brandId: "brand_1",
      body: { adminId: "admin_target" },
    });
    expect(conflict.error?.code).toBe("CONFLICT_STATE");

    repo.createBrandMembershipError = new Error("D1_ERROR: write failed");
    repo.adminById.admin_target_2 = {
      id: "admin_target_2",
      email: "target2@example.test",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: now,
      approvedAt: now,
    };
    const unavailable = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_invite_provider_down",
      brandId: "brand_1",
      body: { adminId: "admin_target_2" },
    });
    expect(unavailable.error?.code).toBe("PROVIDER_UNAVAILABLE");
  });

  it("rejects mismatched adminId and email invite target payloads", async () => {
    const repo = new RepoStub();
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const result = await service.inviteAdminToBrand({
      actor: adminActor(),
      requestId: "req_invite_target_mismatch",
      brandId: "brand_1",
      body: {
        adminId: "admin_target",
        email: "member@example.test",
      },
    });

    expect(result.error?.code).toBe("VALIDATION_FAILED");
    expect(result.error?.data).toMatchObject({
      reasons: ["target:identifier_mismatch"],
    });
    expect(repo.createdMembershipCount).toBe(0);
  });

  it("accepts pending invitation and emits joined audit event", async () => {
    const repo = new RepoStub();
    repo.membershipByAdminId.admin_1 = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: "admin_owner",
    };
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

    const result = await service.acceptBrandInvitation({
      actor: adminActor(),
      requestId: "req_accept_invitation",
      brandId: "brand_1",
    });

    expect(result.error).toBeNull();
    if (result.error) throw result.error;
    expect(result.content.membership.status).toBe("ACTIVE");
    expect(published).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "brand.member_joined",
          requestId: "req_accept_invitation",
          safeDetails: expect.objectContaining({
            targetAdminId: "admin_1",
          }),
        }),
      ])
    );
  });

  it("denies accepting invitation for wrong actor and invalid invitation states", async () => {
    const wrongActorRepo = new RepoStub();
    wrongActorRepo.findMembershipByBrandAndAdmin = async () => ({
      id: "membership_admin_target",
      brandId: "brand_1",
      adminId: "admin_target",
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: "admin_owner",
      createdAt: now,
      updatedAt: now,
    });
    const wrongActorService = new BrandService({
      repository: wrongActorRepo,
      now: () => new Date(now),
    });
    const wrongActor = await wrongActorService.acceptBrandInvitation({
      actor: adminActor(),
      requestId: "req_accept_wrong_actor",
      brandId: "brand_1",
    });
    expect(wrongActor.error?.code).toBe("AUTH_FORBIDDEN");
    expect(wrongActor.error?.data).toMatchObject({
      reason: "INVITATION_NOT_FOR_ACTOR",
    });

    const acceptedRepo = new RepoStub();
    acceptedRepo.membershipByAdminId.admin_1 = {
      role: "MEMBER",
      status: "ACTIVE",
      invitedByAdminId: "admin_owner",
    };
    const acceptedService = new BrandService({
      repository: acceptedRepo,
      now: () => new Date(now),
    });
    const alreadyAccepted = await acceptedService.acceptBrandInvitation({
      actor: adminActor(),
      requestId: "req_accept_already_active",
      brandId: "brand_1",
    });
    expect(alreadyAccepted.error?.code).toBe("CONFLICT_STATE");
    expect(alreadyAccepted.error?.data).toMatchObject({
      reason: "INVITATION_NOT_PENDING",
    });

    const revokedRepo = new RepoStub();
    revokedRepo.membershipByAdminId.admin_1 = {
      role: "MEMBER",
      status: "REVOKED",
      invitedByAdminId: "admin_owner",
    };
    const revokedService = new BrandService({
      repository: revokedRepo,
      now: () => new Date(now),
    });
    const revoked = await revokedService.acceptBrandInvitation({
      actor: adminActor(),
      requestId: "req_accept_revoked",
      brandId: "brand_1",
    });
    expect(revoked.error?.code).toBe("VALIDATION_FAILED");
    expect(revoked.error?.data).toMatchObject({
      reason: "INVITATION_REVOKED",
    });

    const joinRequestRepo = new RepoStub();
    joinRequestRepo.membershipByAdminId.admin_1 = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: null,
    };
    const joinRequestService = new BrandService({
      repository: joinRequestRepo,
      now: () => new Date(now),
    });
    const joinRequestAccept = await joinRequestService.acceptBrandInvitation({
      actor: adminActor(),
      requestId: "req_accept_join_request_not_invitation",
      brandId: "brand_1",
    });
    expect(joinRequestAccept.error?.code).toBe("VALIDATION_FAILED");
    expect(joinRequestAccept.error?.data).toMatchObject({
      reason: "INVITATION_NOT_FOUND",
    });
  });

  it("creates join request and blocks duplicate active or pending membership", async () => {
    const repo = new RepoStub();
    delete repo.membershipByAdminId.admin_1;
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const success = await service.requestBrandJoin({
      actor: adminActor(),
      requestId: "req_join_success",
      brandId: "brand_1",
    });
    expect(success.error).toBeNull();
    if (success.error) throw success.error;
    expect(success.content.membership).toMatchObject({
      adminId: "admin_1",
      status: "PENDING",
      invitedByAdminId: null,
    });

    repo.membershipByAdminId.admin_1 = {
      role: "MEMBER",
      status: "ACTIVE",
      invitedByAdminId: null,
    };
    const duplicateActive = await service.requestBrandJoin({
      actor: adminActor(),
      requestId: "req_join_duplicate_active",
      brandId: "brand_1",
    });
    expect(duplicateActive.error?.code).toBe("CONFLICT_STATE");
    expect(duplicateActive.error?.data).toMatchObject({
      reason: "DUPLICATE_ACTIVE_MEMBERSHIP",
    });

    repo.membershipByAdminId.admin_1 = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: null,
    };
    const duplicatePending = await service.requestBrandJoin({
      actor: adminActor(),
      requestId: "req_join_duplicate_pending",
      brandId: "brand_1",
    });
    expect(duplicatePending.error?.code).toBe("CONFLICT_STATE");
    expect(duplicatePending.error?.data).toMatchObject({
      reason: "DUPLICATE_PENDING_REQUEST",
    });
  });

  it("approves join request for OWNER, MEMBER, and SUPER_ADMIN", async () => {
    const ownerRepo = new RepoStub();
    ownerRepo.membershipByAdminId.admin_target = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: null,
    };
    const ownerService = new BrandService({
      repository: ownerRepo,
      now: () => new Date(now),
    });
    const ownerApproved = await ownerService.approveBrandJoinRequest({
      actor: adminActor(),
      requestId: "req_approve_owner",
      brandId: "brand_1",
      adminId: "admin_target",
    });
    expect(ownerApproved.error).toBeNull();
    if (ownerApproved.error) throw ownerApproved.error;
    expect(ownerApproved.content.membership.status).toBe("ACTIVE");

    const memberRepo = new RepoStub();
    memberRepo.membershipByAdminId.admin_target = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: null,
    };
    memberRepo.membershipByAdminId.admin_member = {
      role: "MEMBER",
      status: "ACTIVE",
      invitedByAdminId: null,
    };
    const memberService = new BrandService({
      repository: memberRepo,
      now: () => new Date(now),
    });
    const memberApproved = await memberService.approveBrandJoinRequest({
      actor: adminActor({ actorId: "admin_member" }),
      requestId: "req_approve_member",
      brandId: "brand_1",
      adminId: "admin_target",
    });
    expect(memberApproved.error).toBeNull();
    if (memberApproved.error) throw memberApproved.error;
    expect(memberApproved.content.membership.status).toBe("ACTIVE");

    const superRepo = new RepoStub();
    superRepo.membershipByAdminId.admin_target = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: null,
    };
    const superService = new BrandService({
      repository: superRepo,
      now: () => new Date(now),
    });
    const superApproved = await superService.approveBrandJoinRequest({
      actor: adminActor({ actorId: "admin_owner", role: "SUPER_ADMIN" }),
      requestId: "req_approve_super",
      brandId: "brand_1",
      adminId: "admin_target",
    });
    expect(superApproved.error).toBeNull();
    if (superApproved.error) throw superApproved.error;
    expect(superApproved.content.membership.status).toBe("ACTIVE");
  });

  it("denies unauthorized approval and supports rejection flow", async () => {
    const unauthorizedRepo = new RepoStub();
    unauthorizedRepo.membershipByAdminId.admin_target = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: null,
    };
    delete unauthorizedRepo.membershipByAdminId.admin_1;
    const unauthorizedService = new BrandService({
      repository: unauthorizedRepo,
      now: () => new Date(now),
    });
    const unauthorized = await unauthorizedService.approveBrandJoinRequest({
      actor: adminActor(),
      requestId: "req_approve_unauthorized",
      brandId: "brand_1",
      adminId: "admin_target",
    });
    expect(unauthorized.error?.code).toBe("AUTH_FORBIDDEN");
    expect(unauthorized.error?.data).toMatchObject({
      reason: "APPROVER_NOT_AUTHORIZED",
    });

    const rejectRepo = new RepoStub();
    rejectRepo.membershipByAdminId.admin_target = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: null,
    };
    const rejectService = new BrandService({
      repository: rejectRepo,
      now: () => new Date(now),
    });
    const rejected = await rejectService.rejectBrandJoinRequest({
      actor: adminActor(),
      requestId: "req_reject_join_request",
      brandId: "brand_1",
      adminId: "admin_target",
    });
    expect(rejected.error).toBeNull();
    if (rejected.error) throw rejected.error;
    expect(rejected.content.membership.status).toBe("REVOKED");
  });

  it("does not treat pending invitation as join request during approve or reject", async () => {
    const repo = new RepoStub();
    repo.membershipByAdminId.admin_target = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: "admin_owner",
    };
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const approve = await service.approveBrandJoinRequest({
      actor: adminActor(),
      requestId: "req_approve_invitation_not_join_request",
      brandId: "brand_1",
      adminId: "admin_target",
    });
    expect(approve.error?.code).toBe("VALIDATION_FAILED");
    expect(approve.error?.data).toMatchObject({
      reason: "JOIN_REQUEST_NOT_FOUND",
    });

    const reject = await service.rejectBrandJoinRequest({
      actor: adminActor(),
      requestId: "req_reject_invitation_not_join_request",
      brandId: "brand_1",
      adminId: "admin_target",
    });
    expect(reject.error?.code).toBe("VALIDATION_FAILED");
    expect(reject.error?.data).toMatchObject({
      reason: "JOIN_REQUEST_NOT_FOUND",
    });
    expect(repo.membershipByAdminId.admin_target.status).toBe("PENDING");
  });

  it("maps join flow provider failures to PROVIDER_UNAVAILABLE", async () => {
    const joinRepo = new RepoStub();
    joinRepo.createBrandMembershipError = new Error("D1_ERROR: write failed");
    delete joinRepo.membershipByAdminId.admin_1;
    const joinService = new BrandService({
      repository: joinRepo,
      now: () => new Date(now),
    });
    const joinFailure = await joinService.requestBrandJoin({
      actor: adminActor(),
      requestId: "req_join_provider_failure",
      brandId: "brand_1",
    });
    expect(joinFailure.error?.code).toBe("PROVIDER_UNAVAILABLE");

    const acceptRepo = new RepoStub();
    acceptRepo.membershipByAdminId.admin_1 = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: "admin_owner",
    };
    acceptRepo.updateMembershipStatus = async () => {
      throw new Error("D1_ERROR: transition failed");
    };
    const acceptService = new BrandService({
      repository: acceptRepo,
      now: () => new Date(now),
    });
    const acceptFailure = await acceptService.acceptBrandInvitation({
      actor: adminActor(),
      requestId: "req_accept_provider_failure",
      brandId: "brand_1",
    });
    expect(acceptFailure.error?.code).toBe("PROVIDER_UNAVAILABLE");
  });

  it("emits audit events for join flow with safe details", async () => {
    const repo = new RepoStub();
    repo.membershipByAdminId.admin_1 = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: "admin_owner",
    };
    repo.membershipByAdminId.admin_target = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: null,
    };
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

    await service.acceptBrandInvitation({
      actor: adminActor(),
      requestId: "req_join_audit_accept",
      brandId: "brand_1",
    });

    delete repo.membershipByAdminId.admin_1;
    await service.requestBrandJoin({
      actor: adminActor(),
      requestId: "req_join_audit_request",
      brandId: "brand_1",
    });

    repo.membershipByAdminId.admin_target = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: null,
    };
    await service.approveBrandJoinRequest({
      actor: adminActor({ actorId: "admin_owner", role: "SUPER_ADMIN" }),
      requestId: "req_join_audit_approve",
      brandId: "brand_1",
      adminId: "admin_target",
    });

    repo.membershipByAdminId.admin_target = {
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: null,
    };
    await service.rejectBrandJoinRequest({
      actor: adminActor({ actorId: "admin_owner", role: "SUPER_ADMIN" }),
      requestId: "req_join_audit_reject",
      brandId: "brand_1",
      adminId: "admin_target",
    });

    expect(published).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "brand.member_joined" }),
        expect.objectContaining({
          action: "brand.member_removed",
          requestId: "req_join_audit_reject",
        }),
      ])
    );
    const serialized = JSON.stringify(published);
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("token");
  });

  it("updates brand for OWNER and MEMBER with safe audit event", async () => {
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

    const ownerUpdate = await service.updateBrand({
      actor: adminActor(),
      requestId: "req_owner_update",
      brandId: "brand_1",
      body: { description: "Owner update" },
    });
    const memberUpdate = await service.updateBrand({
      actor: adminActor({ actorId: "admin_member" }),
      requestId: "req_member_update",
      brandId: "brand_1",
      body: { slug: "jrw-updated-member" },
    });

    expect(ownerUpdate.error).toBeNull();
    expect(memberUpdate.error).toBeNull();
    expect(repo.updateCalls).toHaveLength(2);
    expect(published).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "brand.updated",
          requestId: "req_owner_update",
        }),
        expect.objectContaining({
          action: "brand.updated",
          requestId: "req_member_update",
        }),
      ])
    );
  });

  it("denies update for non-member or inactive membership", async () => {
    const repo = new RepoStub();
    delete repo.membershipByAdminId.admin_1;
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const nonMember = await service.updateBrand({
      actor: adminActor(),
      requestId: "req_non_member_update",
      brandId: "brand_1",
      body: { description: "Denied" },
    });
    expect(nonMember.error?.code).toBe("AUTH_FORBIDDEN");

    repo.membershipByAdminId.admin_1 = {
      role: "OWNER",
      status: "REVOKED",
      invitedByAdminId: null,
    };
    const revoked = await service.updateBrand({
      actor: adminActor(),
      requestId: "req_revoked_member_update",
      brandId: "brand_1",
      body: { description: "Denied" },
    });
    expect(revoked.error?.code).toBe("AUTH_FORBIDDEN");
  });

  it("maps update validation and conflict errors", async () => {
    const repo = new RepoStub();
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const invalid = await service.updateBrand({
      actor: adminActor(),
      requestId: "req_invalid_update",
      brandId: "brand_1",
      body: { slug: "Bad Slug" },
    });
    expect(invalid.error?.code).toBe("VALIDATION_FAILED");

    repo.existingByName = brandRecord({
      id: "brand_2",
      name: "JRW Lifestyle+",
    });
    const duplicateName = await service.updateBrand({
      actor: adminActor(),
      requestId: "req_duplicate_name_update",
      brandId: "brand_1",
      body: { name: "JRW Lifestyle+" },
    });
    expect(duplicateName.error?.code).toBe("CONFLICT_STATE");

    repo.existingByName = null;
    repo.existingBySlug = brandRecord({
      id: "brand_2",
      slug: "jrw-lifestyle-2",
    });
    const duplicateSlug = await service.updateBrand({
      actor: adminActor(),
      requestId: "req_duplicate_slug_update",
      brandId: "brand_1",
      body: { slug: "jrw-lifestyle-2" },
    });
    expect(duplicateSlug.error?.code).toBe("CONFLICT_STATE");

    repo.existingBySlug = null;
    repo.existingArchivedByName = brandRecord({
      id: "brand_9",
      name: "JRW Archived",
      status: "ARCHIVED",
      archivedAt: now,
    });
    const archivedNameConflict = await service.updateBrand({
      actor: adminActor(),
      requestId: "req_archived_name_update",
      brandId: "brand_1",
      body: { name: "JRW Archived" },
    });
    expect(archivedNameConflict.error?.code).toBe("CONFLICT_STATE");
  });

  it("rejects invalid update field types before persistence", async () => {
    const repo = new RepoStub();
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const invalidDescription = await service.updateBrand({
      actor: adminActor(),
      requestId: "req_invalid_description_type",
      brandId: "brand_1",
      body: { description: 42 },
    });

    expect(invalidDescription.error?.code).toBe("VALIDATION_FAILED");
    expect(invalidDescription.error?.data).toMatchObject({
      reasons: ["description:type"],
    });
    expect(repo.updateCalls).toHaveLength(0);
  });

  it("archives brand for OWNER and MEMBER", async () => {
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

    const ownerArchive = await service.archiveBrand({
      actor: adminActor(),
      requestId: "req_owner_archive",
      brandId: "brand_1",
    });
    repo.existingByIdIncludingArchived = brandRecord({ status: "ACTIVE" });
    const memberArchive = await service.archiveBrand({
      actor: adminActor({ actorId: "admin_member" }),
      requestId: "req_member_archive",
      brandId: "brand_1",
    });

    expect(ownerArchive.error).toBeNull();
    expect(memberArchive.error).toBeNull();
    expect(repo.archiveCalls).toHaveLength(2);
    expect(published).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "brand.archived" }),
      ])
    );
  });

  it("denies archive for non-member and rejects already archived brand", async () => {
    const repo = new RepoStub();
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    delete repo.membershipByAdminId.admin_1;
    const nonMember = await service.archiveBrand({
      actor: adminActor(),
      requestId: "req_non_member_archive",
      brandId: "brand_1",
    });
    expect(nonMember.error?.code).toBe("AUTH_FORBIDDEN");

    repo.membershipByAdminId.admin_1 = {
      role: "OWNER",
      status: "ACTIVE",
      invitedByAdminId: null,
    };
    repo.existingByIdIncludingArchived = brandRecord({
      status: "ARCHIVED",
      archivedAt: now,
    });
    const alreadyArchived = await service.archiveBrand({
      actor: adminActor(),
      requestId: "req_already_archived",
      brandId: "brand_1",
    });
    expect(alreadyArchived.error?.code).toBe("CONFLICT_STATE");
  });

  it("maps update and archive provider failures to PROVIDER_UNAVAILABLE", async () => {
    const repo = new RepoStub();
    repo.updateBrandError = new Error("SQLITE_ERROR: update failed");
    repo.archiveBrandError = new Error("D1_ERROR: archive failed");
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const update = await service.updateBrand({
      actor: adminActor(),
      requestId: "req_update_provider_failure",
      brandId: "brand_1",
      body: { description: "test" },
    });
    expect(update.error?.code).toBe("PROVIDER_UNAVAILABLE");

    const archive = await service.archiveBrand({
      actor: adminActor(),
      requestId: "req_archive_provider_failure",
      brandId: "brand_1",
    });
    expect(archive.error?.code).toBe("PROVIDER_UNAVAILABLE");
  });

  it("maps update unique constraint race to CONFLICT_STATE", async () => {
    const repo = new RepoStub();
    repo.updateBrandError = new Error(
      "SQLITE_CONSTRAINT: UNIQUE constraint failed: brands.slug"
    );
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const update = await service.updateBrand({
      actor: adminActor(),
      requestId: "req_update_unique_race",
      brandId: "brand_1",
      body: { slug: "jrw-lifestyle-2" },
    });

    expect(update.error?.code).toBe("CONFLICT_STATE");
  });

  it("lists brand-scoped products for member and super admin", async () => {
    const memberRepo = new RepoStub();
    const memberService = new BrandService({
      repository: memberRepo,
      now: () => new Date(now),
    });

    const memberResult = await memberService.listBrandScopedProducts({
      actor: adminActor(),
      requestId: "req_list_brand_member",
      brandId: "brand_1",
      query: { page: 1, pageSize: 1 },
    });
    expect(memberResult.error).toBeNull();
    if (memberResult.error) throw memberResult.error;
    expect(memberResult.content).toMatchObject({
      page: 1,
      pageSize: 1,
      totalItems: 1,
      totalPages: 1,
    });
    expect(memberResult.content.items[0]).toMatchObject({
      brandId: "brand_1",
    });

    const superRepo = new RepoStub();
    const superService = new BrandService({
      repository: superRepo,
      now: () => new Date(now),
    });
    const superResult = await superService.listBrandScopedProducts({
      actor: adminActor({
        role: "SUPER_ADMIN",
        actorId: "admin_owner",
      }),
      requestId: "req_list_brand_super",
      brandId: "brand_1",
      query: { page: 1, pageSize: 20 },
    });
    expect(superResult.error).toBeNull();
  });

  it("denies non-member scope and blocks archived brand visibility", async () => {
    const deniedRepo = new RepoStub();
    delete deniedRepo.membershipByAdminId.admin_1;
    const deniedService = new BrandService({
      repository: deniedRepo,
      now: () => new Date(now),
    });

    const denied = await deniedService.listBrandScopedProducts({
      actor: adminActor(),
      requestId: "req_list_brand_denied",
      brandId: "brand_1",
      query: {},
    });
    expect(denied.error?.code).toBe("AUTH_FORBIDDEN");
    expect(denied.error?.data).toMatchObject({
      reason: "BRAND_MEMBERSHIP_REQUIRED",
    });

    const archivedRepo = new RepoStub();
    const archivedService = new BrandService({
      repository: archivedRepo,
      now: () => new Date(now),
    });

    const archived = await archivedService.listBrandScopedProducts({
      actor: adminActor(),
      requestId: "req_list_brand_archived",
      brandId: "brand_archived",
      query: {},
    });
    expect(archived.error?.code).toBe("CONFLICT_STATE");
    expect(archived.error?.data).toMatchObject({
      reason: "BRAND_ARCHIVED",
    });
  });

  it("lists brandless products and admin brands with stable envelope payload", async () => {
    const repo = new RepoStub();
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const brandless = await service.listBrandlessProducts({
      actor: adminActor(),
      requestId: "req_list_brandless",
      query: { page: 1, pageSize: 20 },
    });
    expect(brandless.error).toBeNull();
    if (brandless.error) throw brandless.error;
    expect(brandless.content.totalItems).toBe(1);
    expect(brandless.content.items[0]).toMatchObject({
      brandId: null,
    });

    const myBrands = await service.listAdminBrands({
      actor: adminActor(),
      requestId: "req_list_admin_brands",
      query: { page: 1, pageSize: 20 },
    });
    expect(myBrands.error).toBeNull();
    if (myBrands.error) throw myBrands.error;
    expect(myBrands.content.totalItems).toBeGreaterThan(0);
    expect(myBrands.content.items[0]).toMatchObject({
      id: "brand_1",
      status: "ACTIVE",
    });
  });

  it("guards brand product create, update, reassignment, and brandless mutation flows", async () => {
    const repo = new RepoStub();
    repo.membershipByBrandAdminKey["brand_1:admin_1"] = {
      role: "MEMBER",
      status: "ACTIVE",
      invitedByAdminId: null,
    };
    repo.membershipByBrandAdminKey["brand_2:admin_1"] = {
      role: "MEMBER",
      status: "ACTIVE",
      invitedByAdminId: null,
    };

    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const createGuard = await service.guardBrandProductCreate({
      actor: adminActor(),
      requestId: "req_guard_create_member",
      brandId: "brand_1",
    });
    expect(createGuard.error).toBeNull();
    if (createGuard.error) throw createGuard.error;
    expect(createGuard.content).toMatchObject({
      allowed: true,
      targetBrandId: "brand_1",
      reassignment: false,
    });

    const updateGuard = await service.guardBrandProductUpdate({
      actor: adminActor(),
      requestId: "req_guard_update_member",
      brandId: "brand_1",
      productId: "product_1",
    });
    expect(updateGuard.error).toBeNull();
    if (updateGuard.error) throw updateGuard.error;
    expect(updateGuard.content).toMatchObject({
      allowed: true,
      productId: "product_1",
      sourceBrandId: "brand_1",
      targetBrandId: "brand_1",
      reassignment: false,
    });

    const reassignGuard = await service.guardBrandProductReassignment({
      actor: adminActor(),
      requestId: "req_guard_reassign_member",
      productId: "product_1",
      targetBrandId: "brand_2",
    });
    expect(reassignGuard.error).toBeNull();
    if (reassignGuard.error) throw reassignGuard.error;
    expect(reassignGuard.content).toMatchObject({
      allowed: true,
      productId: "product_1",
      sourceBrandId: "brand_1",
      targetBrandId: "brand_2",
      reassignment: true,
    });

    const brandlessGuard = await service.guardBrandlessProductMutation({
      actor: adminActor(),
      requestId: "req_guard_brandless_member",
    });
    expect(brandlessGuard.error).toBeNull();
    if (brandlessGuard.error) throw brandlessGuard.error;
    expect(brandlessGuard.content).toMatchObject({
      allowed: true,
      brandless: true,
    });

    const superService = new BrandService({
      repository: new RepoStub(),
      now: () => new Date(now),
    });
    const superGuard = await superService.guardBrandProductCreate({
      actor: adminActor({ role: "SUPER_ADMIN", actorId: "admin_owner" }),
      requestId: "req_guard_create_super",
      brandId: "brand_2",
    });
    expect(superGuard.error).toBeNull();
  });

  it("denies invalid mutation guard cases with stable reasons", async () => {
    const nonMemberRepo = new RepoStub();
    delete nonMemberRepo.membershipByAdminId.admin_1;
    const nonMemberService = new BrandService({
      repository: nonMemberRepo,
      now: () => new Date(now),
    });
    const createDenied = await nonMemberService.guardBrandProductCreate({
      actor: adminActor(),
      requestId: "req_guard_create_denied",
      brandId: "brand_1",
    });
    expect(createDenied.error?.code).toBe("AUTH_FORBIDDEN");
    expect(createDenied.error?.data).toMatchObject({
      reason: "BRAND_MEMBERSHIP_REQUIRED",
    });

    const archivedRepo = new RepoStub();
    const archivedService = new BrandService({
      repository: archivedRepo,
      now: () => new Date(now),
    });
    const archivedDenied = await archivedService.guardBrandProductCreate({
      actor: adminActor(),
      requestId: "req_guard_archived_brand",
      brandId: "brand_archived",
    });
    expect(archivedDenied.error?.code).toBe("CONFLICT_STATE");
    expect(archivedDenied.error?.data).toMatchObject({
      reason: "BRAND_ARCHIVED",
    });

    const mismatchRepo = new RepoStub();
    const mismatchService = new BrandService({
      repository: mismatchRepo,
      now: () => new Date(now),
    });
    const mismatchDenied = await mismatchService.guardBrandProductUpdate({
      actor: adminActor(),
      requestId: "req_guard_update_mismatch",
      brandId: "brand_1",
      productId: "product_2",
    });
    expect(mismatchDenied.error?.code).toBe("CONFLICT_STATE");
    expect(mismatchDenied.error?.data).toMatchObject({
      reason: "BRAND_MISMATCH",
    });

    const updateDeniedRepo = new RepoStub();
    delete updateDeniedRepo.membershipByAdminId.admin_1;
    const updateDeniedService = new BrandService({
      repository: updateDeniedRepo,
      now: () => new Date(now),
    });
    const updateDenied = await updateDeniedService.guardBrandProductUpdate({
      actor: adminActor(),
      requestId: "req_guard_update_denied",
      brandId: "brand_1",
      productId: "product_2",
    });
    expect(updateDenied.error?.code).toBe("AUTH_FORBIDDEN");
    expect(updateDenied.error?.data).toMatchObject({
      reason: "BRAND_MEMBERSHIP_REQUIRED",
    });
    expect(updateDeniedRepo.productBrandAssignmentLookups).toBe(0);

    const sourceDeniedRepo = new RepoStub();
    sourceDeniedRepo.membershipByBrandAdminKey["brand_2:admin_1"] = {
      role: "MEMBER",
      status: "ACTIVE",
      invitedByAdminId: null,
    };
    delete sourceDeniedRepo.membershipByAdminId.admin_1;
    const sourceDeniedService = new BrandService({
      repository: sourceDeniedRepo,
      now: () => new Date(now),
    });
    const sourceDenied =
      await sourceDeniedService.guardBrandProductReassignment({
        actor: adminActor(),
        requestId: "req_guard_reassign_source_denied",
        productId: "product_1",
        targetBrandId: "brand_2",
      });
    expect(sourceDenied.error?.code).toBe("AUTH_FORBIDDEN");
    expect(sourceDenied.error?.data).toMatchObject({
      reason: "SOURCE_BRAND_PERMISSION_REQUIRED",
    });

    const targetDeniedRepo = new RepoStub();
    targetDeniedRepo.membershipByBrandAdminKey["brand_1:admin_1"] = {
      role: "MEMBER",
      status: "ACTIVE",
      invitedByAdminId: null,
    };
    delete targetDeniedRepo.membershipByAdminId.admin_1;
    const targetDeniedService = new BrandService({
      repository: targetDeniedRepo,
      now: () => new Date(now),
    });
    const targetDenied =
      await targetDeniedService.guardBrandProductReassignment({
        actor: adminActor(),
        requestId: "req_guard_reassign_target_denied",
        productId: "product_1",
        targetBrandId: "brand_2",
      });
    expect(targetDenied.error?.code).toBe("AUTH_FORBIDDEN");
    expect(targetDenied.error?.data).toMatchObject({
      reason: "TARGET_BRAND_PERMISSION_REQUIRED",
    });
    expect(targetDeniedRepo.productBrandAssignmentLookups).toBe(0);
  });

  it("maps mutation guard lookup failures to PROVIDER_UNAVAILABLE", async () => {
    const createRepo = new RepoStub();
    createRepo.findBrandByIdForMutation = async () => {
      throw new Error("D1_ERROR: mutation brand lookup failed");
    };
    const createService = new BrandService({
      repository: createRepo,
      now: () => new Date(now),
    });
    const createFailure = await createService.guardBrandProductCreate({
      actor: adminActor(),
      requestId: "req_guard_provider_create",
      brandId: "brand_1",
    });
    expect(createFailure.error?.code).toBe("PROVIDER_UNAVAILABLE");

    const updateRepo = new RepoStub();
    updateRepo.findProductBrandAssignment = async () => {
      throw new Error("SQLITE_ERROR: mutation assignment lookup failed");
    };
    const updateService = new BrandService({
      repository: updateRepo,
      now: () => new Date(now),
    });
    const updateFailure = await updateService.guardBrandProductUpdate({
      actor: adminActor(),
      requestId: "req_guard_provider_update",
      brandId: "brand_1",
      productId: "product_1",
    });
    expect(updateFailure.error?.code).toBe("PROVIDER_UNAVAILABLE");
  });

  it("maps list provider failures to PROVIDER_UNAVAILABLE", async () => {
    const repo = new RepoStub();
    repo.listProductsError = new Error("D1_ERROR: list failed");
    const service = new BrandService({
      repository: repo,
      now: () => new Date(now),
    });

    const scoped = await service.listBrandScopedProducts({
      actor: adminActor(),
      requestId: "req_list_provider_scope",
      brandId: "brand_1",
      query: {},
    });
    expect(scoped.error?.code).toBe("PROVIDER_UNAVAILABLE");

    const brandless = await service.listBrandlessProducts({
      actor: adminActor(),
      requestId: "req_list_provider_brandless",
      query: {},
    });
    expect(brandless.error?.code).toBe("PROVIDER_UNAVAILABLE");
  });
});
