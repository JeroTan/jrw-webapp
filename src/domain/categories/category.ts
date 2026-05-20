import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import {
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_NAME_MIN_LENGTH,
  CATEGORY_SLUG_MAX_LENGTH,
  CATEGORY_SLUG_MIN_LENGTH,
  isCategoryStatus,
} from "./schemas";
import type {
  CategoryListQuery,
  CategoryListQueryInput,
  CategoryStatus,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_SLUG_SUFFIX_ATTEMPTS = 10_000;

export type CategoryCreateDraft = {
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isVisible: boolean;
  status: CategoryStatus;
};

export type CategoryUpdateDraft = {
  name?: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
};

function cleanText(value: string): string {
  return value.trim();
}

function isInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value)
  );
}

function isPositiveInteger(value: unknown): value is number {
  return isInteger(value) && value > 0;
}

function hasOwnField(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

export function slugifyCategoryText(value: string): string {
  const normalized = cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length > 0 ? normalized : "category";
}

export function normalizeCategorySlug(value: string): string {
  return slugifyCategoryText(value);
}

function isValidCategorySlug(value: string): boolean {
  return (
    value.length >= CATEGORY_SLUG_MIN_LENGTH &&
    value.length <= CATEGORY_SLUG_MAX_LENGTH &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

function validationError(reasons: string[]) {
  return Result.error(new GeneralError({ reasons }, "VALIDATION_FAILED"));
}

export function resolveUniqueCategorySlug(
  baseSlug: string,
  existingSlugs: Iterable<string>
): string {
  const normalizedBase = normalizeCategorySlug(baseSlug).slice(
    0,
    CATEGORY_SLUG_MAX_LENGTH
  );
  const used = new Set(
    Array.from(existingSlugs, (value) => normalizeCategorySlug(value))
  );

  if (!used.has(normalizedBase)) {
    return normalizedBase;
  }

  for (let suffix = 1; suffix < MAX_SLUG_SUFFIX_ATTEMPTS; suffix += 1) {
    const suffixToken = `-${suffix}`;
    const maxBaseLength = CATEGORY_SLUG_MAX_LENGTH - suffixToken.length;
    const candidateBase = normalizedBase.slice(0, maxBaseLength);
    const candidate = `${candidateBase}${suffixToken}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  return `${Date.now()}`.slice(0, CATEGORY_SLUG_MAX_LENGTH);
}

export function createCategoryDraft(
  input: CreateCategoryInput
): AppResult<CategoryCreateDraft, { reasons: string[] }> {
  const reasons: string[] = [];
  const name = cleanText(input.name ?? "");

  if (name.length < CATEGORY_NAME_MIN_LENGTH || name.length > CATEGORY_NAME_MAX_LENGTH) {
    reasons.push("name:invalid_length");
  }

  const requestedSlug =
    typeof input.slug === "string" && cleanText(input.slug).length > 0
      ? normalizeCategorySlug(input.slug)
      : slugifyCategoryText(name);

  if (!isValidCategorySlug(requestedSlug)) {
    reasons.push("slug:invalid_format");
  }

  if (input.sortOrder !== undefined && !isInteger(input.sortOrder)) {
    reasons.push("sortOrder:invalid_type");
  }

  if (
    typeof input.description === "string" &&
    cleanText(input.description).length > CATEGORY_DESCRIPTION_MAX_LENGTH
  ) {
    reasons.push("description:too_long");
  }

  if (input.isVisible !== undefined && typeof input.isVisible !== "boolean") {
    reasons.push("isVisible:invalid_type");
  }

  if (reasons.length > 0) {
    return validationError(reasons);
  }

  return Result.okay({
    name,
    slug: requestedSlug,
    description:
      typeof input.description === "string"
        ? cleanText(input.description) || null
        : input.description ?? null,
    sortOrder: input.sortOrder ?? 0,
    isVisible: input.isVisible ?? true,
    status: "ACTIVE",
  });
}

export function updateCategoryDraft(
  input: UpdateCategoryInput
): AppResult<CategoryUpdateDraft, { reasons: string[] }> {
  const reasons: string[] = [];
  const patch: CategoryUpdateDraft = {};
  const record = input as Record<string, unknown>;

  if (hasOwnField(record, "name")) {
    const value = cleanText(String(input.name ?? ""));
    if (
      value.length < CATEGORY_NAME_MIN_LENGTH ||
      value.length > CATEGORY_NAME_MAX_LENGTH
    ) {
      reasons.push("name:invalid_length");
    } else {
      patch.name = value;
    }
  }

  if (hasOwnField(record, "slug")) {
    const value = normalizeCategorySlug(String(input.slug ?? ""));
    if (!isValidCategorySlug(value)) {
      reasons.push("slug:invalid_format");
    } else {
      patch.slug = value;
    }
  }

  if (hasOwnField(record, "description")) {
    if (input.description === null) {
      patch.description = null;
    } else if (typeof input.description === "string") {
      const value = cleanText(input.description);
      if (value.length > CATEGORY_DESCRIPTION_MAX_LENGTH) {
        reasons.push("description:too_long");
      } else {
        patch.description = value || null;
      }
    } else {
      reasons.push("description:invalid_type");
    }
  }

  if (hasOwnField(record, "sortOrder")) {
    if (!isInteger(input.sortOrder)) {
      reasons.push("sortOrder:invalid_type");
    } else {
      patch.sortOrder = input.sortOrder;
    }
  }

  if (hasOwnField(record, "isVisible")) {
    if (typeof input.isVisible !== "boolean") {
      reasons.push("isVisible:invalid_type");
    } else {
      patch.isVisible = input.isVisible;
    }
  }

  if (Object.keys(patch).length === 0) {
    reasons.push("patch:required");
  }

  if (reasons.length > 0) {
    return validationError(reasons);
  }

  return Result.okay(patch);
}

function parseIsVisible(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

export function normalizeCategoryListQuery(
  query: CategoryListQueryInput
): AppResult<CategoryListQuery, { reasons: string[] }> {
  const reasons: string[] = [];
  const page = isPositiveInteger(query.page) ? query.page : DEFAULT_PAGE;
  const requestedPageSize = isPositiveInteger(query.pageSize)
    ? query.pageSize
    : DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
  let status: CategoryStatus | undefined;

  if (query.status !== undefined) {
    if (typeof query.status !== "string" || !isCategoryStatus(query.status)) {
      reasons.push("status:invalid_value");
    } else {
      status = query.status;
    }
  }

  let isVisible: boolean | undefined;
  if (query.isVisible !== undefined) {
    const parsed = parseIsVisible(query.isVisible);
    if (parsed === null) {
      reasons.push("isVisible:invalid_value");
    } else {
      isVisible = parsed;
    }
  }

  if (reasons.length > 0) {
    return validationError(reasons);
  }

  return Result.okay({
    page,
    pageSize,
    ...(status ? { status } : {}),
    ...(isVisible === undefined ? {} : { isVisible }),
  });
}

export function archiveCategoryTransition(input: {
  currentStatus: string;
  updatedAt: string;
}): AppResult<{ status: "ARCHIVED"; updatedAt: string }, { reason: string }> {
  if (!isCategoryStatus(input.currentStatus)) {
    return Result.error(
      new GeneralError({ reason: "INVALID_STATUS" }, "VALIDATION_FAILED")
    );
  }

  if (input.currentStatus === "ARCHIVED") {
    return Result.error(
      new GeneralError({ reason: "ALREADY_ARCHIVED" }, "CONFLICT_STATE")
    );
  }

  return Result.okay({
    status: "ARCHIVED",
    updatedAt: input.updatedAt,
  });
}

