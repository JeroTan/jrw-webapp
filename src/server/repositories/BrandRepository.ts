import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  brandMembershipRoleValues,
  brandMembershipStatusValues,
  brands,
  brandStatusValues,
  brand_memberships,
} from "@/domain/schema/catalog";
import { and, eq, ne, sql } from "drizzle-orm";

type BrandStatusValue = (typeof brandStatusValues)[number];
type BrandMembershipRoleValue = (typeof brandMembershipRoleValues)[number];
type BrandMembershipStatusValue = (typeof brandMembershipStatusValues)[number];

type BrandRowLike = {
  [key: string]: unknown;
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: BrandStatusValue;
  created_by_admin_id: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type BrandMembershipRowLike = {
  [key: string]: unknown;
  id: string;
  brand_id: string;
  admin_id: string;
  role: BrandMembershipRoleValue;
  status: BrandMembershipStatusValue;
  invited_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BrandRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: BrandStatusValue;
  createdAt: string;
  updatedAt: string;
};

export type BrandMembershipRecord = {
  id: string;
  brandId: string;
  adminId: string;
  role: BrandMembershipRoleValue;
  status: BrandMembershipStatusValue;
  invitedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateBrandInput = {
  name: string;
  slug: string;
  description: string | null;
  status: BrandStatusValue;
  createdAt: string;
  updatedAt: string;
};

export type CreateBrandMembershipInput = {
  brandId: string;
  adminId: string;
  role: BrandMembershipRoleValue;
  status: BrandMembershipStatusValue;
  invitedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BrandRepository = {
  createBrand(input: CreateBrandInput, adminId: string): Promise<BrandRecord>;
  createBrandMembership(
    input: CreateBrandMembershipInput
  ): Promise<BrandMembershipRecord>;
  findBrandBySlug(slug: string): Promise<BrandRecord | null>;
  findBrandByName(name: string): Promise<BrandRecord | null>;
  findArchivedBrandByName(name: string): Promise<BrandRecord | null>;
};

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

export function brandDtoFromRow(row: BrandRowLike): BrandRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function brandMembershipDtoFromRow(
  row: BrandMembershipRowLike
): BrandMembershipRecord {
  return {
    id: row.id,
    brandId: row.brand_id,
    adminId: row.admin_id,
    role: row.role,
    status: row.status,
    invitedByAdminId: row.invited_by_admin_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DrizzleBrandRepository implements BrandRepository {
  constructor(private readonly db: AppDb) {}

  async createBrand(input: CreateBrandInput, adminId: string): Promise<BrandRecord> {
    const [brand] = await this.db
      .insert(brands)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        status: input.status,
        created_by_admin_id: adminId,
        archived_at: input.status === "ARCHIVED" ? input.createdAt : null,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
      })
      .returning();

    return brandDtoFromRow(brand);
  }

  async createBrandMembership(
    input: CreateBrandMembershipInput
  ): Promise<BrandMembershipRecord> {
    const [membership] = await this.db
      .insert(brand_memberships)
      .values({
        brand_id: input.brandId,
        admin_id: input.adminId,
        role: input.role,
        status: input.status,
        invited_by_admin_id: input.invitedByAdminId,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
      })
      .returning();

    return brandMembershipDtoFromRow(membership);
  }

  async findBrandBySlug(slug: string): Promise<BrandRecord | null> {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(
        and(
          sql`lower(${brands.slug}) = ${normalizeLookup(slug)}`,
          ne(brands.status, "ARCHIVED")
        )
      )
      .limit(1);

    return brand ? brandDtoFromRow(brand) : null;
  }

  async findBrandByName(name: string): Promise<BrandRecord | null> {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(
        and(
          sql`lower(${brands.name}) = ${normalizeLookup(name)}`,
          ne(brands.status, "ARCHIVED")
        )
      )
      .limit(1);

    return brand ? brandDtoFromRow(brand) : null;
  }

  async findArchivedBrandByName(name: string): Promise<BrandRecord | null> {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(
        and(
          sql`lower(${brands.name}) = ${normalizeLookup(name)}`,
          eq(brands.status, "ARCHIVED")
        )
      )
      .limit(1);

    return brand ? brandDtoFromRow(brand) : null;
  }
}

export function createBrandRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleBrandRepository(db),
  };
}
