import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import {
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_DESCRIPTION_MIN_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
  PRODUCT_SLUG_MAX_LENGTH,
  PRODUCT_SLUG_MIN_LENGTH,
  PRODUCT_SUMMARY_MAX_LENGTH,
  isProductStatus,
} from "./schemas";
import type {
  CreateProductInput,
  ProductListQuery,
  ProductListQueryInput,
  ProductStatus,
  UpdateProductInput,
} from "./types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_SLUG_SUFFIX_ATTEMPTS = 10_000;

export type ProductCreateDraft = {
  name: string;
  slug: string;
  summary: string | null;
  description: string;
  status: ProductStatus;
};

export type ProductUpdateDraft = {
  name?: string;
  slug?: string;
  summary?: string | null;
  description?: string;
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

function validationError(reasons: string[]) {
  return Result.error(new GeneralError({ reasons }, "VALIDATION_FAILED"));
}

export function slugifyProductText(value: string): string {
  const normalized = cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length > 0 ? normalized : "product";
}

export function normalizeProductSlug(value: string): string {
  return slugifyProductText(value);
}

function isValidProductSlug(value: string): boolean {
  return (
    value.length >= PRODUCT_SLUG_MIN_LENGTH &&
    value.length <= PRODUCT_SLUG_MAX_LENGTH &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

export function resolveUniqueProductSlug(
  baseSlug: string,
  existingSlugs: Iterable<string>
): string {
  const normalizedBase = normalizeProductSlug(baseSlug).slice(
    0,
    PRODUCT_SLUG_MAX_LENGTH
  );
  const used = new Set(
    Array.from(existingSlugs, (value) => normalizeProductSlug(value))
  );

  if (!used.has(normalizedBase)) {
    return normalizedBase;
  }

  for (let suffix = 1; suffix < MAX_SLUG_SUFFIX_ATTEMPTS; suffix += 1) {
    const suffixToken = `-${suffix}`;
    const maxBaseLength = PRODUCT_SLUG_MAX_LENGTH - suffixToken.length;
    const candidateBase = normalizedBase.slice(0, maxBaseLength);
    const candidate = `${candidateBase}${suffixToken}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  return `${Date.now()}`.slice(0, PRODUCT_SLUG_MAX_LENGTH);
}

export function createProductDraft(
  input: CreateProductInput
): AppResult<ProductCreateDraft, { reasons: string[] }> {
  const reasons: string[] = [];
  const name = cleanText(input.name ?? "");
  const description = cleanText(input.description ?? "");

  if (name.length < PRODUCT_NAME_MIN_LENGTH || name.length > PRODUCT_NAME_MAX_LENGTH) {
    reasons.push("name:invalid_length");
  }

  if (
    description.length < PRODUCT_DESCRIPTION_MIN_LENGTH ||
    description.length > PRODUCT_DESCRIPTION_MAX_LENGTH
  ) {
    reasons.push("description:invalid_length");
  }

  const requestedSlug =
    typeof input.slug === "string" && cleanText(input.slug).length > 0
      ? normalizeProductSlug(input.slug)
      : slugifyProductText(name);
  if (!isValidProductSlug(requestedSlug)) {
    reasons.push("slug:invalid_format");
  }

  if (
    typeof input.summary === "string" &&
    cleanText(input.summary).length > PRODUCT_SUMMARY_MAX_LENGTH
  ) {
    reasons.push("summary:too_long");
  }

  if (reasons.length > 0) {
    return validationError(reasons);
  }

  return Result.okay({
    name,
    slug: requestedSlug,
    summary:
      typeof input.summary === "string" ? cleanText(input.summary) || null : null,
    description,
    status: "DRAFT",
  });
}

export function updateProductDraft(
  input: UpdateProductInput
): AppResult<ProductUpdateDraft, { reasons: string[] }> {
  const reasons: string[] = [];
  const patch: ProductUpdateDraft = {};
  const record = input as Record<string, unknown>;

  if (hasOwnField(record, "name")) {
    const value = cleanText(String(input.name ?? ""));
    if (
      value.length < PRODUCT_NAME_MIN_LENGTH ||
      value.length > PRODUCT_NAME_MAX_LENGTH
    ) {
      reasons.push("name:invalid_length");
    } else {
      patch.name = value;
    }
  }

  if (hasOwnField(record, "slug")) {
    const value = normalizeProductSlug(String(input.slug ?? ""));
    if (!isValidProductSlug(value)) {
      reasons.push("slug:invalid_format");
    } else {
      patch.slug = value;
    }
  }

  if (hasOwnField(record, "summary")) {
    if (input.summary === null) {
      patch.summary = null;
    } else if (typeof input.summary === "string") {
      const value = cleanText(input.summary);
      if (value.length > PRODUCT_SUMMARY_MAX_LENGTH) {
        reasons.push("summary:too_long");
      } else {
        patch.summary = value || null;
      }
    } else {
      reasons.push("summary:invalid_type");
    }
  }

  if (hasOwnField(record, "description")) {
    if (typeof input.description !== "string") {
      reasons.push("description:invalid_type");
    } else {
      const value = cleanText(input.description);
      if (
        value.length < PRODUCT_DESCRIPTION_MIN_LENGTH ||
        value.length > PRODUCT_DESCRIPTION_MAX_LENGTH
      ) {
        reasons.push("description:invalid_length");
      } else {
        patch.description = value;
      }
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

function parseBoolean(value: unknown): boolean | null {
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

function normalizedId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizedSearch(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeProductListQuery(
  query: ProductListQueryInput
): AppResult<ProductListQuery, { reasons: string[] }> {
  const reasons: string[] = [];
  const page = isPositiveInteger(query.page) ? query.page : DEFAULT_PAGE;
  const requestedPageSize = isPositiveInteger(query.pageSize)
    ? query.pageSize
    : DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
  let status: ProductStatus | undefined;

  if (query.status !== undefined) {
    if (typeof query.status !== "string" || !isProductStatus(query.status)) {
      reasons.push("status:invalid_value");
    } else {
      status = query.status;
    }
  }

  let includeArchived = false;
  if (query.includeArchived !== undefined) {
    const parsed = parseBoolean(query.includeArchived);
    if (parsed === null) {
      reasons.push("includeArchived:invalid_value");
    } else {
      includeArchived = parsed;
    }
  }

  if (reasons.length > 0) {
    return validationError(reasons);
  }

  const brandId = normalizedId(query.brandId);
  const categoryId = normalizedId(query.categoryId);
  const search = normalizedSearch(query.search);

  return Result.okay({
    page,
    pageSize,
    includeArchived,
    ...(status ? { status } : {}),
    ...(brandId ? { brandId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(search ? { search } : {}),
  });
}
