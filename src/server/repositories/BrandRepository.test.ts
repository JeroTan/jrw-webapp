import { Miniflare } from "miniflare";
import { describe, expect, it } from "vitest";
import { createDb } from "@/adapter/infrastructure/db/client";
import { brandDtoFromRow, DrizzleBrandRepository } from "./BrandRepository";

const now = "2026-05-17T21:10:00.000Z";
const sqliteNow = "2026-05-17 21:10:00";

async function createBrandTestD1() {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    d1Databases: ["DB"],
  });
  const d1 = await mf.getD1Database("DB");

  const schemaStatements = [
    `CREATE TABLE admins (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      password_salt text,
      is_owner integer DEFAULT 0 NOT NULL,
      status text DEFAULT 'ACTIVE' NOT NULL,
      email_verified_at text,
      approved_at text,
      suspension_reason text,
      rejection_reason text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE brands (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      slug text NOT NULL,
      description text,
      status text DEFAULT 'ACTIVE' NOT NULL,
      created_by_admin_id text NOT NULL,
      archived_at text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE UNIQUE INDEX brands_name_unique ON brands(name)`,
    `CREATE UNIQUE INDEX brands_slug_unique ON brands(slug)`,
    `CREATE TABLE brand_memberships (
      id text PRIMARY KEY NOT NULL,
      brand_id text NOT NULL,
      admin_id text NOT NULL,
      role text DEFAULT 'MEMBER' NOT NULL,
      status text DEFAULT 'ACTIVE' NOT NULL,
      invited_by_admin_id text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE UNIQUE INDEX uq_brand_memberships_brand_admin ON brand_memberships(brand_id, admin_id)`,
    `CREATE TABLE products (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      brand text,
      brand_id text,
      tags text DEFAULT '[]' NOT NULL,
      description text NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
  ];

  for (const statement of schemaStatements) {
    await d1.prepare(statement).run();
  }

  await d1
    .prepare(
      `INSERT INTO admins (
        id, email, password_hash, password_salt, is_owner, status,
        email_verified_at, approved_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "admin_1",
      "admin1@example.test",
      "hash",
      "salt",
      0,
      "ACTIVE",
      now,
      now,
      now,
      now
    )
    .run();

  await d1
    .prepare(
      `INSERT INTO admins (
        id, email, password_hash, password_salt, is_owner, status,
        email_verified_at, approved_at, suspension_reason, rejection_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "admin_owner",
      "owner@example.test",
      "hash",
      "salt",
      1,
      "ACTIVE",
      now,
      now,
      null,
      null,
      now,
      now
    )
    .run();

  return { d1, mf };
}

describe("BrandRepository", { timeout: 20_000 }, () => {
  it("maps brand rows to safe DTO shape", () => {
    const dto = brandDtoFromRow({
      id: "brand_1",
      name: "JRW Lifestyle",
      slug: "jrw-lifestyle",
      description: "Catalog team",
      status: "ARCHIVED",
      created_by_admin_id: "admin_1",
      archived_at: sqliteNow,
      created_at: sqliteNow,
      updated_at: sqliteNow,
    });

    expect(dto).toEqual({
      id: "brand_1",
      name: "JRW Lifestyle",
      slug: "jrw-lifestyle",
      description: "Catalog team",
      status: "ARCHIVED",
      archivedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    expect(JSON.stringify(dto)).not.toContain("created_by_admin_id");
  });

  it("creates brand and owner membership in real D1", async () => {
    const { d1, mf } = await createBrandTestD1();

    try {
      const repository = new DrizzleBrandRepository(createDb(d1));
      const { brand, membership } =
        await repository.createBrandWithOwnerMembership(
          {
            brand: {
              name: "JRW Lifestyle",
              slug: "jrw-lifestyle",
              description: "Catalog team",
              status: "ACTIVE",
              createdAt: now,
              updatedAt: now,
            },
            membership: {
              adminId: "admin_1",
              role: "OWNER",
              status: "ACTIVE",
              invitedByAdminId: null,
              createdAt: now,
              updatedAt: now,
            },
          },
          "admin_1"
        );

      expect(brand).toMatchObject({
        name: "JRW Lifestyle",
        slug: "jrw-lifestyle",
        status: "ACTIVE",
      });
      expect(JSON.stringify(brand)).not.toContain("created_by_admin_id");
      expect(membership).toMatchObject({
        brandId: brand.id,
        adminId: "admin_1",
        role: "OWNER",
        status: "ACTIVE",
      });

      const foundBySlug = await repository.findBrandBySlug("jrw-lifestyle");
      const foundByName = await repository.findBrandByName("jrw lifestyle");

      expect(foundBySlug?.id).toBe(brand.id);
      expect(foundByName?.id).toBe(brand.id);
    } finally {
      await mf.dispose();
    }
  });

  it("normalizes SQLite timestamps for brand, membership, and product API DTOs", async () => {
    const { d1, mf } = await createBrandTestD1();

    try {
      const repository = new DrizzleBrandRepository(createDb(d1));

      await d1
        .prepare(
          `INSERT INTO brands (
            id, name, slug, description, status, created_by_admin_id,
            archived_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "brand_sqlite",
          "SQLite Brand",
          "sqlite-brand",
          null,
          "ACTIVE",
          "admin_1",
          null,
          sqliteNow,
          sqliteNow
        )
        .run();
      await d1
        .prepare(
          `INSERT INTO brand_memberships (
            id, brand_id, admin_id, role, status, invited_by_admin_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "membership_sqlite",
          "brand_sqlite",
          "admin_owner",
          "MEMBER",
          "ACTIVE",
          "admin_1",
          sqliteNow,
          sqliteNow
        )
        .run();
      await d1
        .prepare(
          `INSERT INTO products (
            id, name, brand, brand_id, tags, description, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "product_sqlite",
          "SQLite Product",
          null,
          "brand_sqlite",
          "[]",
          "sqlite product",
          sqliteNow,
          sqliteNow
        )
        .run();

      const brand = await repository.findBrandById("brand_sqlite");
      const membership = await repository.findMembershipByBrandAndAdmin(
        "brand_sqlite",
        "admin_owner"
      );
      const products = await repository.findProductsByBrand(
        {
          id: "brand_sqlite",
          name: "SQLite Brand",
          slug: "sqlite-brand",
        },
        { page: 1, pageSize: 20 }
      );
      const brandsByAdmin = await repository.findBrandsByAdmin("admin_owner");

      expect(brand).toMatchObject({
        createdAt: now,
        updatedAt: now,
      });
      expect(membership).toMatchObject({
        createdAt: now,
        updatedAt: now,
      });
      expect(products.items[0]).toMatchObject({
        createdAt: now,
        updatedAt: now,
      });
      expect(brandsByAdmin[0]).toMatchObject({
        createdAt: now,
        updatedAt: now,
      });
    } finally {
      await mf.dispose();
    }
  });

  it("enforces unique name and slug constraints", async () => {
    const { d1, mf } = await createBrandTestD1();

    try {
      const repository = new DrizzleBrandRepository(createDb(d1));
      await repository.createBrand(
        {
          name: "JRW Lifestyle",
          slug: "jrw-lifestyle",
          description: null,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );

      await expect(
        repository.createBrand(
          {
            name: "JRW Lifestyle",
            slug: "jrw-lifestyle-2",
            description: null,
            status: "ACTIVE",
            createdAt: now,
            updatedAt: now,
          },
          "admin_1"
        )
      ).rejects.toThrow();

      await expect(
        repository.createBrand(
          {
            name: "JRW Lifestyle 2",
            slug: "jrw-lifestyle",
            description: null,
            status: "ACTIVE",
            createdAt: now,
            updatedAt: now,
          },
          "admin_1"
        )
      ).rejects.toThrow();
    } finally {
      await mf.dispose();
    }
  });

  it("finds archived brand by case-insensitive name", async () => {
    const { d1, mf } = await createBrandTestD1();

    try {
      const repository = new DrizzleBrandRepository(createDb(d1));
      const brand = await repository.createBrand(
        {
          name: "JRW Lifestyle",
          slug: "jrw-lifestyle",
          description: null,
          status: "ARCHIVED",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );

      const archived =
        await repository.findArchivedBrandByName("jrw lifestyle");
      expect(archived?.id).toBe(brand.id);
      expect(archived?.status).toBe("ARCHIVED");
    } finally {
      await mf.dispose();
    }
  });

  it("updates brand with full and partial payloads", async () => {
    const { d1, mf } = await createBrandTestD1();

    try {
      const repository = new DrizzleBrandRepository(createDb(d1));
      const created = await repository.createBrand(
        {
          name: "JRW Lifestyle",
          slug: "jrw-lifestyle",
          description: "Catalog team",
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );

      const full = await repository.updateBrand(created.id, {
        name: "JRW Lifestyle Updated",
        slug: "jrw-lifestyle-updated",
        description: "Updated catalog team",
        updatedAt: "2026-05-17T22:30:00.000Z",
      });

      expect(full).toMatchObject({
        id: created.id,
        name: "JRW Lifestyle Updated",
        slug: "jrw-lifestyle-updated",
        description: "Updated catalog team",
      });

      const partial = await repository.updateBrand(created.id, {
        description: null,
        updatedAt: "2026-05-17T22:35:00.000Z",
      });

      expect(partial).toMatchObject({
        id: created.id,
        name: "JRW Lifestyle Updated",
        slug: "jrw-lifestyle-updated",
        description: null,
      });
    } finally {
      await mf.dispose();
    }
  });

  it("archives brand and finds by id with and without archived visibility", async () => {
    const { d1, mf } = await createBrandTestD1();

    try {
      const repository = new DrizzleBrandRepository(createDb(d1));
      const created = await repository.createBrand(
        {
          name: "JRW Lifestyle",
          slug: "jrw-lifestyle",
          description: null,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );

      const byId = await repository.findBrandById(created.id);
      expect(byId?.id).toBe(created.id);

      const archived = await repository.archiveBrand(
        created.id,
        "2026-05-17T22:40:00.000Z"
      );
      expect(archived).toMatchObject({
        id: created.id,
        status: "ARCHIVED",
        archivedAt: "2026-05-17T22:40:00.000Z",
      });

      const activeLookup = await repository.findBrandById(created.id);
      expect(activeLookup).toBeNull();

      const includingArchived = await repository.findBrandByIdIncludingArchived(
        created.id
      );
      expect(includingArchived?.id).toBe(created.id);
      expect(includingArchived?.status).toBe("ARCHIVED");
    } finally {
      await mf.dispose();
    }
  });

  it("returns mutation guard lookups for brand, membership, and product brand assignment", async () => {
    const { d1, mf } = await createBrandTestD1();

    try {
      const repository = new DrizzleBrandRepository(createDb(d1));
      const activeBrand = await repository.createBrand(
        {
          name: "JRW Mutation Active",
          slug: "jrw-mutation-active",
          description: null,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );
      const archivedBrand = await repository.createBrand(
        {
          name: "JRW Mutation Archived",
          slug: "jrw-mutation-archived",
          description: null,
          status: "ARCHIVED",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );

      await repository.createBrandMembership({
        brandId: activeBrand.id,
        adminId: "admin_owner",
        role: "MEMBER",
        status: "ACTIVE",
        invitedByAdminId: "admin_1",
        createdAt: now,
        updatedAt: now,
      });

      await d1
        .prepare(
          `INSERT INTO products (
            id, name, brand, brand_id, tags, description, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "prod_mutation_scoped",
          "Mutation Scoped Product",
          null,
          activeBrand.id,
          "[]",
          "mutation scoped product",
          now,
          now
        )
        .run();

      await d1
        .prepare(
          `INSERT INTO products (
            id, name, brand, brand_id, tags, description, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "prod_mutation_brandless",
          "Mutation Brandless Product",
          "   ",
          null,
          "[]",
          "mutation brandless product",
          now,
          now
        )
        .run();

      const activeLookup = await repository.findBrandByIdForMutation(
        activeBrand.id
      );
      const archivedLookup = await repository.findBrandByIdForMutation(
        archivedBrand.id
      );
      const membershipLookup = await repository.findMembershipForMutation(
        activeBrand.id,
        "admin_owner"
      );
      const scopedAssignment = await repository.findProductBrandAssignment(
        "prod_mutation_scoped"
      );
      const brandlessAssignment = await repository.findProductBrandAssignment(
        "prod_mutation_brandless"
      );
      const missingAssignment =
        await repository.findProductBrandAssignment("prod_missing");

      expect(activeLookup).toMatchObject({
        id: activeBrand.id,
        status: "ACTIVE",
      });
      expect(archivedLookup).toMatchObject({
        id: archivedBrand.id,
        status: "ARCHIVED",
      });
      expect(membershipLookup).toMatchObject({
        brandId: activeBrand.id,
        adminId: "admin_owner",
        role: "MEMBER",
        status: "ACTIVE",
      });
      expect(scopedAssignment).toEqual({
        productId: "prod_mutation_scoped",
        brandId: activeBrand.id,
      });
      expect(brandlessAssignment).toEqual({
        productId: "prod_mutation_brandless",
        brandId: null,
      });
      expect(missingAssignment).toBeNull();
    } finally {
      await mf.dispose();
    }
  });

  it("checks uniqueness excluding current brand id", async () => {
    const { d1, mf } = await createBrandTestD1();

    try {
      const repository = new DrizzleBrandRepository(createDb(d1));
      const brandOne = await repository.createBrand(
        {
          name: "JRW Lifestyle",
          slug: "jrw-lifestyle",
          description: null,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );
      const brandTwo = await repository.createBrand(
        {
          name: "JRW Home",
          slug: "jrw-home",
          description: null,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );
      const selfByName = await repository.findBrandByNameExcluding(
        brandOne.id,
        "JRW Lifestyle"
      );
      expect(selfByName).toBeNull();

      const otherByName = await repository.findBrandByNameExcluding(
        brandOne.id,
        "JRW Home"
      );
      expect(otherByName?.id).toBe(brandTwo.id);

      const otherBySlug = await repository.findBrandBySlugExcluding(
        brandOne.id,
        "jrw-home"
      );
      expect(otherBySlug?.id).toBe(brandTwo.id);

      await repository.archiveBrand(brandTwo.id, "2026-05-17T22:50:00.000Z");

      const archivedByName = await repository.findArchivedBrandByNameExcluding(
        brandOne.id,
        "JRW Home"
      );
      expect(archivedByName?.id).toBe(brandTwo.id);
    } finally {
      await mf.dispose();
    }
  });

  it("creates pending invitation membership and resolves admin lookups", async () => {
    const { d1, mf } = await createBrandTestD1();

    try {
      const repository = new DrizzleBrandRepository(createDb(d1));
      const brand = await repository.createBrand(
        {
          name: "JRW Invite Test",
          slug: "jrw-invite-test",
          description: null,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );

      const pendingMembership = await repository.createBrandMembership({
        brandId: brand.id,
        adminId: "admin_owner",
        role: "MEMBER",
        status: "PENDING",
        invitedByAdminId: "admin_1",
        createdAt: now,
        updatedAt: now,
      });

      expect(pendingMembership).toMatchObject({
        brandId: brand.id,
        adminId: "admin_owner",
        status: "PENDING",
        invitedByAdminId: "admin_1",
      });

      const foundMembership = await repository.findMembershipByBrandAndAdmin(
        brand.id,
        "admin_owner"
      );
      expect(foundMembership?.status).toBe("PENDING");

      const targetAdmin = await repository.findAdminById("admin_1");
      expect(targetAdmin).toEqual({
        id: "admin_1",
        email: "admin1@example.test",
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: now,
        approvedAt: now,
      });

      const ownerAdmin =
        await repository.findAdminByEmail("OWNER@EXAMPLE.TEST");
      expect(ownerAdmin).toEqual({
        id: "admin_owner",
        email: "owner@example.test",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: now,
        approvedAt: now,
      });
    } finally {
      await mf.dispose();
    }
  });

  it("transitions pending memberships and resolves pending invitation/join request and active members", async () => {
    const { d1, mf } = await createBrandTestD1();

    try {
      const repository = new DrizzleBrandRepository(createDb(d1));
      const brand = await repository.createBrand(
        {
          name: "JRW Membership Flow",
          slug: "jrw-membership-flow",
          description: null,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );

      const invitationMembership = await repository.createBrandMembership({
        brandId: brand.id,
        adminId: "admin_owner",
        role: "MEMBER",
        status: "PENDING",
        invitedByAdminId: "admin_1",
        createdAt: now,
        updatedAt: now,
      });

      const joinRequestMembership = await repository.createBrandMembership({
        brandId: brand.id,
        adminId: "admin_1",
        role: "MEMBER",
        status: "PENDING",
        invitedByAdminId: null,
        createdAt: now,
        updatedAt: now,
      });

      const pendingInvitation =
        await repository.findPendingInvitationByAdminAndBrand(
          "admin_owner",
          brand.id
        );
      expect(pendingInvitation?.id).toBe(invitationMembership.id);

      const pendingJoinRequest =
        await repository.findPendingJoinRequestByAdminAndBrand(
          "admin_1",
          brand.id
        );
      expect(pendingJoinRequest?.id).toBe(joinRequestMembership.id);

      const brandMemberships = await repository.findBrandMemberships(brand.id);
      expect(brandMemberships).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: invitationMembership.id,
            adminId: "admin_owner",
            status: "PENDING",
          }),
          expect.objectContaining({
            id: joinRequestMembership.id,
            adminId: "admin_1",
            status: "PENDING",
          }),
        ])
      );

      const brandInvites = await repository.findBrandInvitations(brand.id);
      expect(brandInvites).toEqual([
        expect.objectContaining({
          id: invitationMembership.id,
          adminId: "admin_owner",
          invitedByAdminId: "admin_1",
        }),
      ]);

      const brandJoinRequests = await repository.findBrandJoinRequests(brand.id);
      expect(brandJoinRequests).toEqual([
        expect.objectContaining({
          id: joinRequestMembership.id,
          adminId: "admin_1",
          invitedByAdminId: null,
        }),
      ]);

      const activatedMembership = await repository.updateMembershipStatus(
        invitationMembership.id,
        brand.id,
        "admin_owner",
        "ACTIVE"
      );
      expect(activatedMembership?.status).toBe("ACTIVE");

      const revokedMembership = await repository.updateMembershipStatus(
        joinRequestMembership.id,
        brand.id,
        "admin_1",
        "REVOKED"
      );
      expect(revokedMembership?.status).toBe("REVOKED");

      const repeatTransition = await repository.updateMembershipStatus(
        invitationMembership.id,
        brand.id,
        "admin_owner",
        "ACTIVE"
      );
      expect(repeatTransition).toBeNull();

      const activeMembers = await repository.findActiveBrandMembers(brand.id);
      expect(activeMembers).toEqual([
        expect.objectContaining({
          id: invitationMembership.id,
          adminId: "admin_owner",
          status: "ACTIVE",
        }),
      ]);
    } finally {
      await mf.dispose();
    }
  });

  it("lists products by brand scope and brandless scope with pagination metadata", async () => {
    const { d1, mf } = await createBrandTestD1();

    try {
      const repository = new DrizzleBrandRepository(createDb(d1));
      const brand = await repository.createBrand(
        {
          name: "JRW Scope One",
          slug: "jrw-scope-one",
          description: null,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );

      await repository.createBrand(
        {
          name: "JRW Scope Two",
          slug: "jrw-scope-two",
          description: null,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );

      const insertProduct = d1.prepare(
        `INSERT INTO products (
          id, name, brand, brand_id, tags, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );

      await insertProduct
        .bind(
          "prod_brand_1",
          "Scoped Product One",
          null,
          brand.id,
          "[]",
          "scoped product one",
          now,
          "2026-05-17T21:14:00.000Z"
        )
        .run();
      await insertProduct
        .bind(
          "prod_brand_2",
          "Scoped Product Two",
          brand.name,
          null,
          "[]",
          "scoped product two",
          now,
          "2026-05-17T21:12:00.000Z"
        )
        .run();
      await insertProduct
        .bind(
          "prod_brand_3",
          "Scoped Product Three",
          brand.slug,
          null,
          "[]",
          "scoped product three",
          now,
          "2026-05-17T21:11:00.000Z"
        )
        .run();
      await insertProduct
        .bind(
          "prod_brandless_1",
          "Brandless Product One",
          null,
          null,
          "[]",
          "brandless product one",
          now,
          now
        )
        .run();
      await insertProduct
        .bind(
          "prod_brandless_2",
          "Brandless Product Two",
          null,
          null,
          "[]",
          "brandless product two",
          now,
          "2026-05-17T21:13:00.000Z"
        )
        .run();
      await insertProduct
        .bind(
          "prod_brandless_blank",
          "Brandless Product Blank",
          "",
          null,
          "[]",
          "brandless product blank",
          now,
          "2026-05-17T21:09:00.000Z"
        )
        .run();

      const scoped = await repository.findProductsByBrand(brand, {
        page: 1,
        pageSize: 1,
      });
      expect(scoped).toMatchObject({
        page: 1,
        pageSize: 1,
        totalItems: 3,
        totalPages: 3,
      });
      expect(scoped.items).toHaveLength(1);
      expect(scoped.items[0]).toMatchObject({
        id: "prod_brand_1",
        brandId: brand.id,
      });

      const brandless = await repository.findBrandlessProducts({
        page: 1,
        pageSize: 20,
      });
      expect(brandless).toMatchObject({
        page: 1,
        pageSize: 20,
        totalItems: 3,
        totalPages: 1,
      });
      expect(brandless.items).toHaveLength(3);
      expect(brandless.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "prod_brandless_blank",
            brandId: null,
          }),
        ])
      );
    } finally {
      await mf.dispose();
    }
  });

  it("lists only active membership brands for admin", async () => {
    const { d1, mf } = await createBrandTestD1();

    try {
      const repository = new DrizzleBrandRepository(createDb(d1));
      const activeBrand = await repository.createBrand(
        {
          name: "JRW Active Scope",
          slug: "jrw-active-scope",
          description: null,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );
      const pendingBrand = await repository.createBrand(
        {
          name: "JRW Pending Scope",
          slug: "jrw-pending-scope",
          description: null,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );
      const revokedBrand = await repository.createBrand(
        {
          name: "JRW Revoked Scope",
          slug: "jrw-revoked-scope",
          description: null,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
        "admin_1"
      );

      await repository.createBrandMembership({
        brandId: pendingBrand.id,
        adminId: "admin_owner",
        role: "MEMBER",
        status: "PENDING",
        invitedByAdminId: "admin_1",
        createdAt: now,
        updatedAt: now,
      });
      await repository.createBrandMembership({
        brandId: revokedBrand.id,
        adminId: "admin_owner",
        role: "MEMBER",
        status: "REVOKED",
        invitedByAdminId: "admin_1",
        createdAt: now,
        updatedAt: now,
      });
      await repository.createBrandMembership({
        brandId: activeBrand.id,
        adminId: "admin_owner",
        role: "MEMBER",
        status: "ACTIVE",
        invitedByAdminId: "admin_1",
        createdAt: now,
        updatedAt: now,
      });

      const brandsByAdmin = await repository.findBrandsByAdmin("admin_owner");

      expect(brandsByAdmin.map((brand) => brand.id)).toEqual([activeBrand.id]);
    } finally {
      await mf.dispose();
    }
  });
});
