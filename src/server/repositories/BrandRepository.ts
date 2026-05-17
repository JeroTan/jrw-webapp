import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import { createId } from "@paralleldrive/cuid2";
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
  archivedAt: string | null;
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

export type CreateBrandWithOwnerMembershipInput = {
  brand: CreateBrandInput;
  membership: Omit<CreateBrandMembershipInput, "brandId">;
};

export type CreateBrandWithOwnerMembershipResult = {
  brand: BrandRecord;
  membership: BrandMembershipRecord;
};

export type UpdateBrandInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  updatedAt: string;
};

export type BrandRepository = {
  createBrand(input: CreateBrandInput, adminId: string): Promise<BrandRecord>;
  createBrandMembership(
    input: CreateBrandMembershipInput
  ): Promise<BrandMembershipRecord>;
  createBrandWithOwnerMembership(
    input: CreateBrandWithOwnerMembershipInput,
    adminId: string
  ): Promise<CreateBrandWithOwnerMembershipResult>;
  updateBrand(brandId: string, input: UpdateBrandInput): Promise<BrandRecord>;
  archiveBrand(brandId: string, timestamp: string): Promise<BrandRecord>;
  findBrandBySlug(slug: string): Promise<BrandRecord | null>;
  findBrandByName(name: string): Promise<BrandRecord | null>;
  findArchivedBrandByName(name: string): Promise<BrandRecord | null>;
  findBrandById(brandId: string): Promise<BrandRecord | null>;
  findBrandByIdIncludingArchived(brandId: string): Promise<BrandRecord | null>;
  findBrandByNameExcluding(
    brandId: string,
    name: string
  ): Promise<BrandRecord | null>;
  findArchivedBrandByNameExcluding(
    brandId: string,
    name: string
  ): Promise<BrandRecord | null>;
  findBrandBySlugExcluding(
    brandId: string,
    slug: string
  ): Promise<BrandRecord | null>;
  findMembershipByBrandAndAdmin(
    brandId: string,
    adminId: string
  ): Promise<BrandMembershipRecord | null>;
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
    archivedAt: row.archived_at,
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

  async createBrand(
    input: CreateBrandInput,
    adminId: string
  ): Promise<BrandRecord> {
    const brandId = createId();
    const [brand] = await this.db
      .insert(brands)
      .values({
        id: brandId,
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
    const membershipId = createId();
    const [membership] = await this.db
      .insert(brand_memberships)
      .values({
        id: membershipId,
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

  async createBrandWithOwnerMembership(
    input: CreateBrandWithOwnerMembershipInput,
    adminId: string
  ): Promise<CreateBrandWithOwnerMembershipResult> {
    const brandId = createId();
    const membershipId = createId();
    const [brandRows, membershipRows] = await this.db.batch([
      this.db
        .insert(brands)
        .values({
          id: brandId,
          name: input.brand.name,
          slug: input.brand.slug,
          description: input.brand.description,
          status: input.brand.status,
          created_by_admin_id: adminId,
          archived_at:
            input.brand.status === "ARCHIVED" ? input.brand.createdAt : null,
          created_at: input.brand.createdAt,
          updated_at: input.brand.updatedAt,
        })
        .returning(),
      this.db
        .insert(brand_memberships)
        .values({
          id: membershipId,
          brand_id: brandId,
          admin_id: input.membership.adminId,
          role: input.membership.role,
          status: input.membership.status,
          invited_by_admin_id: input.membership.invitedByAdminId,
          created_at: input.membership.createdAt,
          updated_at: input.membership.updatedAt,
        })
        .returning(),
    ]);

    return {
      brand: brandDtoFromRow(brandRows[0]),
      membership: brandMembershipDtoFromRow(membershipRows[0]),
    };
  }

  async updateBrand(brandId: string, input: UpdateBrandInput): Promise<BrandRecord> {
    const [brand] = await this.db
      .update(brands)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        updated_at: input.updatedAt,
      })
      .where(eq(brands.id, brandId))
      .returning();

    if (!brand) {
      throw new Error("D1_ERROR: brand not found for update");
    }

    return brandDtoFromRow(brand);
  }

  async archiveBrand(brandId: string, timestamp: string): Promise<BrandRecord> {
    const [brand] = await this.db
      .update(brands)
      .set({
        status: "ARCHIVED",
        archived_at: timestamp,
        updated_at: timestamp,
      })
      .where(eq(brands.id, brandId))
      .returning();

    if (!brand) {
      throw new Error("D1_ERROR: brand not found for archive");
    }

    return brandDtoFromRow(brand);
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

  async findBrandById(brandId: string): Promise<BrandRecord | null> {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(and(eq(brands.id, brandId), ne(brands.status, "ARCHIVED")))
      .limit(1);

    return brand ? brandDtoFromRow(brand) : null;
  }

  async findBrandByIdIncludingArchived(
    brandId: string
  ): Promise<BrandRecord | null> {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(eq(brands.id, brandId))
      .limit(1);

    return brand ? brandDtoFromRow(brand) : null;
  }

  async findBrandByNameExcluding(
    brandId: string,
    name: string
  ): Promise<BrandRecord | null> {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(
        and(
          sql`lower(${brands.name}) = ${normalizeLookup(name)}`,
          ne(brands.id, brandId),
          ne(brands.status, "ARCHIVED")
        )
      )
      .limit(1);

    return brand ? brandDtoFromRow(brand) : null;
  }

  async findArchivedBrandByNameExcluding(
    brandId: string,
    name: string
  ): Promise<BrandRecord | null> {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(
        and(
          sql`lower(${brands.name}) = ${normalizeLookup(name)}`,
          ne(brands.id, brandId),
          eq(brands.status, "ARCHIVED")
        )
      )
      .limit(1);

    return brand ? brandDtoFromRow(brand) : null;
  }

  async findBrandBySlugExcluding(
    brandId: string,
    slug: string
  ): Promise<BrandRecord | null> {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(
        and(
          sql`lower(${brands.slug}) = ${normalizeLookup(slug)}`,
          ne(brands.id, brandId),
          ne(brands.status, "ARCHIVED")
        )
      )
      .limit(1);

    return brand ? brandDtoFromRow(brand) : null;
  }

  async findMembershipByBrandAndAdmin(
    brandId: string,
    adminId: string
  ): Promise<BrandMembershipRecord | null> {
    const [membership] = await this.db
      .select()
      .from(brand_memberships)
      .where(
        and(
          eq(brand_memberships.brand_id, brandId),
          eq(brand_memberships.admin_id, adminId)
        )
      )
      .limit(1);

    return membership ? brandMembershipDtoFromRow(membership) : null;
  }
}

export function createBrandRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleBrandRepository(db),
  };
}
