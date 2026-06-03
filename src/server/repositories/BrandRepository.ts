import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import { createId } from "@paralleldrive/cuid2";
import {
  brandMembershipRoleValues,
  brandMembershipStatusValues,
  brands,
  brandStatusValues,
  brand_memberships,
  products,
} from "@/domain/schema/catalog";
import { accountStatusValues, admins } from "@/domain/schema/identity";
import { toApiDateTime, toNullableApiDateTime } from "@/lib/api/date-time";
import { and, desc, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm";

type BrandStatusValue = (typeof brandStatusValues)[number];
type BrandMembershipRoleValue = (typeof brandMembershipRoleValues)[number];
type BrandMembershipStatusValue = (typeof brandMembershipStatusValues)[number];
type BrandAdminStatusValue = (typeof accountStatusValues)[number];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type BrandRowLike = {
  [key: string]: unknown;
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_id?: string | null;
  image_r2_key?: string | null;
  image_alt?: string | null;
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

type BrandAdminRowLike = {
  [key: string]: unknown;
  id: string;
  email: string;
  is_owner: boolean;
  status: BrandAdminStatusValue;
  email_verified_at: string | null;
  approved_at: string | null;
};

type ProductRowLike = {
  [key: string]: unknown;
  id: string;
  name: string;
  description: string;
  brand: string | null;
  brand_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BrandRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageSrc?: string | null;
  imageAlt?: string | null;
  status: BrandStatusValue;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BrandMembershipRecord = {
  id: string;
  brandId: string;
  adminId: string;
  adminEmail?: string;
  role: BrandMembershipRoleValue;
  status: BrandMembershipStatusValue;
  invitedByAdminId: string | null;
  invitedByLabel?: string;
  createdAt: string;
  updatedAt: string;
};

export type BrandAdminRecord = {
  id: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
  status: BrandAdminStatusValue;
  emailVerifiedAt: string | null;
  approvedAt: string | null;
};

export type BrandScopedProductRecord = {
  id: string;
  name: string;
  description: string;
  brandId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductBrandLookup = Pick<BrandRecord, "id" | "name" | "slug">;
export type ProductBrandAssignmentRecord = {
  productId: string;
  brandId: string | null;
};

export type ProductListQueryOptions = {
  page?: number;
  pageSize?: number;
  status?: string;
};

export type BrandScopedProductListResult = {
  items: BrandScopedProductRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type CreateBrandInput = {
  name: string;
  slug: string;
  description: string | null;
  imageId?: string | null;
  imageR2Key?: string | null;
  imageAlt?: string | null;
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
  imageId?: string | null;
  imageR2Key?: string | null;
  imageAlt?: string | null;
  updatedAt: string;
};

export type UpdateBrandImageInput = {
  imageId: string;
  imageR2Key: string;
  imageAlt: string | null;
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
  updateBrandImage(
    brandId: string,
    input: UpdateBrandImageInput
  ): Promise<BrandRecord>;
  archiveBrand(brandId: string, timestamp: string): Promise<BrandRecord>;
  findBrandBySlug(slug: string): Promise<BrandRecord | null>;
  findBrandByName(name: string): Promise<BrandRecord | null>;
  findArchivedBrandByName(name: string): Promise<BrandRecord | null>;
  findBrandById(brandId: string): Promise<BrandRecord | null>;
  findBrandByIdIncludingArchived(brandId: string): Promise<BrandRecord | null>;
  findBrandByIdForMutation(brandId: string): Promise<BrandRecord | null>;
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
  findMembershipForMutation(
    brandId: string,
    adminId: string
  ): Promise<BrandMembershipRecord | null>;
  findProductBrandAssignment(
    productId: string
  ): Promise<ProductBrandAssignmentRecord | null>;
  updateMembershipStatus(
    membershipId: string,
    brandId: string,
    adminId: string,
    newStatus: BrandMembershipStatusValue,
    newRole?: BrandMembershipRoleValue
  ): Promise<BrandMembershipRecord | null>;
  findPendingInvitationByAdminAndBrand(
    adminId: string,
    brandId: string
  ): Promise<BrandMembershipRecord | null>;
  findPendingJoinRequestByAdminAndBrand(
    adminId: string,
    brandId: string
  ): Promise<BrandMembershipRecord | null>;
  findBrandMemberships(brandId: string): Promise<BrandMembershipRecord[]>;
  findBrandInvitations(brandId: string): Promise<BrandMembershipRecord[]>;
  findBrandJoinRequests(brandId: string): Promise<BrandMembershipRecord[]>;
  findActiveBrandMembers(brandId: string): Promise<BrandMembershipRecord[]>;
  findProductsByBrand(
    brand: ProductBrandLookup,
    options?: ProductListQueryOptions
  ): Promise<BrandScopedProductListResult>;
  findBrandlessProducts(
    options?: ProductListQueryOptions
  ): Promise<BrandScopedProductListResult>;
  findBrandsByAdmin(adminId: string): Promise<BrandRecord[]>;
  findAdminById(adminId: string): Promise<BrandAdminRecord | null>;
  findAdminByEmail(email: string): Promise<BrandAdminRecord | null>;
};

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

function adminDtoFromRow(row: BrandAdminRowLike): BrandAdminRecord {
  return {
    id: row.id,
    email: row.email,
    role: row.is_owner ? "SUPER_ADMIN" : "ADMIN",
    status: row.status,
    emailVerifiedAt: row.email_verified_at,
    approvedAt: row.approved_at,
  };
}

export function brandDtoFromRow(row: BrandRowLike): BrandRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageSrc:
      typeof row.image_id === "string" && row.image_id.trim().length > 0
        ? row.image_id
        : null,
    imageAlt:
      typeof row.image_alt === "string" && row.image_alt.trim().length > 0
        ? row.image_alt
        : null,
    status: row.status,
    archivedAt: toNullableApiDateTime(row.archived_at),
    createdAt: toApiDateTime(row.created_at),
    updatedAt: toApiDateTime(row.updated_at),
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
    createdAt: toApiDateTime(row.created_at),
    updatedAt: toApiDateTime(row.updated_at),
  };
}

function productDtoFromRow(
  row: ProductRowLike,
  brandIdOverride?: string | null
): BrandScopedProductRecord {
  const fkBrandId =
    typeof row.brand_id === "string" && row.brand_id.trim().length > 0
      ? row.brand_id.trim()
      : null;
  const legacyBrandId =
    typeof row.brand === "string" && row.brand.trim().length > 0
      ? row.brand.trim()
      : null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    brandId:
      brandIdOverride === undefined
        ? (fkBrandId ?? legacyBrandId)
        : brandIdOverride,
    createdAt: toApiDateTime(row.created_at),
    updatedAt: toApiDateTime(row.updated_at),
  };
}

function validPositiveInteger(value: number | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  );
}

function normalizePage(value: number | undefined): number {
  return validPositiveInteger(value) ? value : DEFAULT_PAGE;
}

function normalizePageSize(value: number | undefined): number {
  const pageSize = validPositiveInteger(value) ? value : DEFAULT_PAGE_SIZE;
  return Math.min(pageSize, MAX_PAGE_SIZE);
}

function productBrandScopeClause(brand: ProductBrandLookup) {
  return (
    or(
      eq(products.brand_id, brand.id),
      sql`trim(${products.brand}) = ${brand.id.trim()}`,
      sql`lower(trim(${products.brand})) = ${normalizeLookup(brand.name)}`,
      sql`lower(trim(${products.brand})) = ${normalizeLookup(brand.slug)}`
    ) ?? sql`0 = 1`
  );
}

function productBrandlessClause() {
  return (
    and(
      isNull(products.brand_id),
      sql`trim(coalesce(${products.brand}, '')) = ''`
    ) ?? sql`0 = 1`
  );
}

export class DrizzleBrandRepository implements BrandRepository {
  constructor(private readonly db: AppDb) {}

  private brandDtoFromRow(row: BrandRowLike): BrandRecord {
    return brandDtoFromRow(row);
  }

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
        image_id: input.imageId ?? null,
        image_r2_key: input.imageR2Key ?? null,
        image_alt: input.imageAlt ?? null,
        status: input.status,
        created_by_admin_id: adminId,
        archived_at: input.status === "ARCHIVED" ? input.createdAt : null,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
      })
      .returning();

    return this.brandDtoFromRow(brand);
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
          image_id: input.brand.imageId ?? null,
          image_r2_key: input.brand.imageR2Key ?? null,
          image_alt: input.brand.imageAlt ?? null,
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
      brand: this.brandDtoFromRow(brandRows[0]),
      membership: brandMembershipDtoFromRow(membershipRows[0]),
    };
  }

  async updateBrand(
    brandId: string,
    input: UpdateBrandInput
  ): Promise<BrandRecord> {
    const [brand] = await this.db
      .update(brands)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.imageId !== undefined ? { image_id: input.imageId } : {}),
        ...(input.imageR2Key !== undefined
          ? { image_r2_key: input.imageR2Key }
          : {}),
        ...(input.imageAlt !== undefined ? { image_alt: input.imageAlt } : {}),
        updated_at: input.updatedAt,
      })
      .where(eq(brands.id, brandId))
      .returning();

    if (!brand) {
      throw new Error("D1_ERROR: brand not found for update");
    }

    return this.brandDtoFromRow(brand);
  }

  async updateBrandImage(
    brandId: string,
    input: UpdateBrandImageInput
  ): Promise<BrandRecord> {
    const [brand] = await this.db
      .update(brands)
      .set({
        image_id: input.imageId,
        image_r2_key: input.imageR2Key,
        image_alt: input.imageAlt,
        updated_at: input.updatedAt,
      })
      .where(eq(brands.id, brandId))
      .returning();

    if (!brand) {
      throw new Error("D1_ERROR: brand not found for image update");
    }

    return this.brandDtoFromRow(brand);
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

    return this.brandDtoFromRow(brand);
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

    return brand ? this.brandDtoFromRow(brand) : null;
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

    return brand ? this.brandDtoFromRow(brand) : null;
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

    return brand ? this.brandDtoFromRow(brand) : null;
  }

  async findBrandById(brandId: string): Promise<BrandRecord | null> {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(and(eq(brands.id, brandId), ne(brands.status, "ARCHIVED")))
      .limit(1);

    return brand ? this.brandDtoFromRow(brand) : null;
  }

  async findBrandByIdIncludingArchived(
    brandId: string
  ): Promise<BrandRecord | null> {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(eq(brands.id, brandId))
      .limit(1);

    return brand ? this.brandDtoFromRow(brand) : null;
  }

  async findBrandByIdForMutation(brandId: string): Promise<BrandRecord | null> {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(eq(brands.id, brandId))
      .limit(1);

    return brand ? this.brandDtoFromRow(brand) : null;
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

    return brand ? this.brandDtoFromRow(brand) : null;
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

    return brand ? this.brandDtoFromRow(brand) : null;
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

    return brand ? this.brandDtoFromRow(brand) : null;
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

  async findMembershipForMutation(
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

  async findProductBrandAssignment(
    productId: string
  ): Promise<ProductBrandAssignmentRecord | null> {
    const [product] = await this.db
      .select({
        id: products.id,
        brandId: products.brand_id,
        brand: products.brand,
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return null;
    }

    const fkBrandId =
      typeof product.brandId === "string" && product.brandId.trim().length > 0
        ? product.brandId.trim()
        : null;
    const legacyBrandId =
      typeof product.brand === "string" && product.brand.trim().length > 0
        ? product.brand.trim()
        : null;

    return {
      productId: product.id,
      brandId: fkBrandId ?? legacyBrandId,
    };
  }

  async updateMembershipStatus(
    membershipId: string,
    brandId: string,
    adminId: string,
    newStatus: BrandMembershipStatusValue,
    newRole?: BrandMembershipRoleValue
  ): Promise<BrandMembershipRecord | null> {
    const [membership] = await this.db
      .update(brand_memberships)
      .set({
        status: newStatus,
        ...(newRole ? { role: newRole } : {}),
        updated_at: new Date().toISOString(),
      })
      .where(
        and(
          eq(brand_memberships.id, membershipId),
          eq(brand_memberships.brand_id, brandId),
          eq(brand_memberships.admin_id, adminId),
          eq(brand_memberships.status, "PENDING")
        )
      )
      .returning();

    return membership ? brandMembershipDtoFromRow(membership) : null;
  }

  async findPendingInvitationByAdminAndBrand(
    adminId: string,
    brandId: string
  ): Promise<BrandMembershipRecord | null> {
    const [membership] = await this.db
      .select()
      .from(brand_memberships)
      .where(
        and(
          eq(brand_memberships.admin_id, adminId),
          eq(brand_memberships.brand_id, brandId),
          eq(brand_memberships.status, "PENDING"),
          isNotNull(brand_memberships.invited_by_admin_id)
        )
      )
      .limit(1);

    return membership ? brandMembershipDtoFromRow(membership) : null;
  }

  async findPendingJoinRequestByAdminAndBrand(
    adminId: string,
    brandId: string
  ): Promise<BrandMembershipRecord | null> {
    const [membership] = await this.db
      .select()
      .from(brand_memberships)
      .where(
        and(
          eq(brand_memberships.admin_id, adminId),
          eq(brand_memberships.brand_id, brandId),
          eq(brand_memberships.status, "PENDING"),
          isNull(brand_memberships.invited_by_admin_id)
        )
      )
      .limit(1);

    return membership ? brandMembershipDtoFromRow(membership) : null;
  }

  async findBrandMemberships(
    brandId: string
  ): Promise<BrandMembershipRecord[]> {
    const memberships = await this.db
      .select()
      .from(brand_memberships)
      .where(eq(brand_memberships.brand_id, brandId))
      .orderBy(desc(brand_memberships.updated_at), desc(brand_memberships.id));

    return memberships.map(brandMembershipDtoFromRow);
  }

  async findBrandInvitations(
    brandId: string
  ): Promise<BrandMembershipRecord[]> {
    const memberships = await this.db
      .select()
      .from(brand_memberships)
      .where(
        and(
          eq(brand_memberships.brand_id, brandId),
          isNotNull(brand_memberships.invited_by_admin_id)
        )
      )
      .orderBy(desc(brand_memberships.updated_at), desc(brand_memberships.id));

    return memberships.map(brandMembershipDtoFromRow);
  }

  async findBrandJoinRequests(
    brandId: string
  ): Promise<BrandMembershipRecord[]> {
    const memberships = await this.db
      .select()
      .from(brand_memberships)
      .where(
        and(
          eq(brand_memberships.brand_id, brandId),
          eq(brand_memberships.role, "MEMBER"),
          isNull(brand_memberships.invited_by_admin_id)
        )
      )
      .orderBy(desc(brand_memberships.updated_at), desc(brand_memberships.id));

    return memberships.map(brandMembershipDtoFromRow);
  }

  async findActiveBrandMembers(
    brandId: string
  ): Promise<BrandMembershipRecord[]> {
    const memberships = await this.db
      .select()
      .from(brand_memberships)
      .where(
        and(
          eq(brand_memberships.brand_id, brandId),
          eq(brand_memberships.status, "ACTIVE")
        )
      );

    return memberships.map(brandMembershipDtoFromRow);
  }

  async findProductsByBrand(
    brand: ProductBrandLookup,
    options: ProductListQueryOptions = {}
  ): Promise<BrandScopedProductListResult> {
    const page = normalizePage(options.page);
    const pageSize = normalizePageSize(options.pageSize);
    const offset = (page - 1) * pageSize;
    const whereClause = productBrandScopeClause(brand);

    const [totalResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);
    const totalItems = Number(totalResult?.count ?? 0);

    const rows = await this.db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.updated_at), desc(products.id))
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows.map((row) => productDtoFromRow(row, brand.id)),
      page,
      pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize),
    };
  }

  async findBrandlessProducts(
    options: ProductListQueryOptions = {}
  ): Promise<BrandScopedProductListResult> {
    const page = normalizePage(options.page);
    const pageSize = normalizePageSize(options.pageSize);
    const offset = (page - 1) * pageSize;
    const whereClause = productBrandlessClause();

    const [totalResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);
    const totalItems = Number(totalResult?.count ?? 0);

    const rows = await this.db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.updated_at), desc(products.id))
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows.map((row) => productDtoFromRow(row, null)),
      page,
      pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize),
    };
  }

  async findBrandsByAdmin(adminId: string): Promise<BrandRecord[]> {
    const rows = await this.db
      .select({ brand: brands })
      .from(brands)
      .innerJoin(
        brand_memberships,
        and(
          eq(brand_memberships.brand_id, brands.id),
          eq(brand_memberships.admin_id, adminId),
          eq(brand_memberships.status, "ACTIVE")
        )
      )
      .where(eq(brands.status, "ACTIVE"))
      .orderBy(desc(brands.updated_at), desc(brands.id));

    return rows.map((row) => this.brandDtoFromRow(row.brand));
  }

  async findAdminById(adminId: string): Promise<BrandAdminRecord | null> {
    const [admin] = await this.db
      .select()
      .from(admins)
      .where(eq(admins.id, adminId))
      .limit(1);

    return admin ? adminDtoFromRow(admin) : null;
  }

  async findAdminByEmail(email: string): Promise<BrandAdminRecord | null> {
    const [admin] = await this.db
      .select()
      .from(admins)
      .where(sql`lower(${admins.email}) = ${normalizeLookup(email)}`)
      .limit(1);

    return admin ? adminDtoFromRow(admin) : null;
  }
}

export function createBrandRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleBrandRepository(db),
  };
}
