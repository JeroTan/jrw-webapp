export type BrandStatus = "ACTIVE" | "ARCHIVED";
export type BrandMembershipRole = "OWNER" | "MEMBER";
export type BrandMembershipStatus = "ACTIVE" | "PENDING" | "REVOKED";

export type BrandRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: BrandStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BrandListResult = {
  items: BrandRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type BrandMembershipRecord = {
  id: string;
  brandId: string;
  adminId: string;
  adminEmail?: string;
  role: BrandMembershipRole;
  status: BrandMembershipStatus;
  invitedByAdminId: string | null;
  invitedByLabel?: string;
  createdAt: string;
  updatedAt: string;
};

export type BrandMembershipListResult = {
  items: BrandMembershipRecord[];
};

export type BrandInviteRecord = BrandMembershipRecord;

export type BrandJoinRequestRecord = BrandMembershipRecord;

export type BrandProductRecord = {
  id: string;
  name: string;
  description: string;
  brandId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BrandProductListResult = {
  items: BrandProductRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type BrandActionPermissions = {
  canApproveJoinRequests: boolean;
  canArchiveBrand: boolean;
  canInviteMembers: boolean;
  reason: string;
};

export type AuthenticatedActor = {
  id: string;
  role: "SUPER_ADMIN" | "ADMIN" | "CUSTOMER" | "PROSPECT";
  accountStatus: {
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    emailVerified: boolean;
    approved: boolean;
  };
};

