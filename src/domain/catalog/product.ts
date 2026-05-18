import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type BrandScopeRole = "ADMIN" | "SUPER_ADMIN" | "CUSTOMER" | "PROSPECT";
type BrandMembershipRole = "OWNER" | "MEMBER";
type BrandMembershipStatus = "ACTIVE" | "PENDING" | "REVOKED";
type BrandStatus = "ACTIVE" | "ARCHIVED";

export type ListBrandScopedProductsInput = {
  actor: {
    authenticated: boolean;
    role: BrandScopeRole;
    actorId?: string | null;
  };
  brandId: string;
  brand: {
    id: string;
    status: BrandStatus;
  } | null;
  membership: {
    adminId: string;
    role: BrandMembershipRole;
    status: BrandMembershipStatus;
  } | null;
  page?: number;
  pageSize?: number;
  status?: string;
};

export type ListBrandScopedProductsFailureReason =
  | "BRAND_NOT_FOUND"
  | "BRAND_MEMBERSHIP_REQUIRED"
  | "BRAND_ARCHIVED";

export type ListBrandScopedProductsResult = {
  brandId: string;
  page: number;
  pageSize: number;
  status?: string;
};

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

function normalizedStatus(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isActiveBrandMember(
  membership: ListBrandScopedProductsInput["membership"]
): membership is NonNullable<ListBrandScopedProductsInput["membership"]> {
  if (!membership) {
    return false;
  }

  if (membership.status !== "ACTIVE") {
    return false;
  }

  return membership.role === "OWNER" || membership.role === "MEMBER";
}

export function listBrandScopedProducts(
  input: ListBrandScopedProductsInput
): AppResult<
  ListBrandScopedProductsResult,
  { reason?: ListBrandScopedProductsFailureReason }
> {
  if (!input.actor.authenticated || !input.actor.actorId) {
    return Result.error(new GeneralError({}, "AUTH_REQUIRED"));
  }

  if (input.actor.role !== "ADMIN" && input.actor.role !== "SUPER_ADMIN") {
    return Result.error(
      new GeneralError(
        { reason: "BRAND_MEMBERSHIP_REQUIRED" },
        "AUTH_FORBIDDEN"
      )
    );
  }

  if (!input.brand || input.brand.id !== input.brandId) {
    return Result.error(
      new GeneralError({ reason: "BRAND_NOT_FOUND" }, "CONFLICT_STATE")
    );
  }

  if (input.brand.status === "ARCHIVED") {
    return Result.error(
      new GeneralError({ reason: "BRAND_ARCHIVED" }, "CONFLICT_STATE")
    );
  }

  if (
    input.actor.role !== "SUPER_ADMIN" &&
    !isActiveBrandMember(input.membership)
  ) {
    return Result.error(
      new GeneralError(
        { reason: "BRAND_MEMBERSHIP_REQUIRED" },
        "AUTH_FORBIDDEN"
      )
    );
  }

  const page = normalizePage(input.page);
  const pageSize = normalizePageSize(input.pageSize);

  return Result.okay({
    brandId: input.brandId,
    page,
    pageSize,
    ...(normalizedStatus(input.status)
      ? { status: normalizedStatus(input.status) }
      : {}),
  });
}
