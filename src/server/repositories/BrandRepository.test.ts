import { Miniflare } from "miniflare";
import { describe, expect, it } from "vitest";
import { createDb } from "@/adapter/infrastructure/db/client";
import {
  brandDtoFromRow,
  DrizzleBrandRepository,
} from "./BrandRepository";

const now = "2026-05-17T21:10:00.000Z";

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

  return { d1, mf };
}

describe("BrandRepository", () => {
  it("maps brand rows to safe DTO shape", () => {
    const dto = brandDtoFromRow({
      id: "brand_1",
      name: "JRW Lifestyle",
      slug: "jrw-lifestyle",
      description: "Catalog team",
      status: "ACTIVE",
      created_by_admin_id: "admin_1",
      archived_at: null,
      created_at: now,
      updated_at: now,
    });

    expect(dto).toEqual({
      id: "brand_1",
      name: "JRW Lifestyle",
      slug: "jrw-lifestyle",
      description: "Catalog team",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
    expect(JSON.stringify(dto)).not.toContain("created_by_admin_id");
  });

  it("creates brand and owner membership in real D1", async () => {
    const { d1, mf } = await createBrandTestD1();

    try {
      const repository = new DrizzleBrandRepository(createDb(d1));
      const brand = await repository.createBrand(
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

      const membership = await repository.createBrandMembership({
        brandId: brand.id,
        adminId: "admin_1",
        role: "OWNER",
        status: "ACTIVE",
        invitedByAdminId: null,
        createdAt: now,
        updatedAt: now,
      });

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

      const archived = await repository.findArchivedBrandByName(
        "jrw lifestyle"
      );
      expect(archived?.id).toBe(brand.id);
      expect(archived?.status).toBe("ARCHIVED");
    } finally {
      await mf.dispose();
    }
  });
});
