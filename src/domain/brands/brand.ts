import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

const BRAND_NAME_MIN_LENGTH = 2;
const BRAND_NAME_MAX_LENGTH = 120;
const BRAND_SLUG_MIN_LENGTH = 2;
const BRAND_SLUG_MAX_LENGTH = 120;
const BRAND_DESCRIPTION_MAX_LENGTH = 500;
const BRAND_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BrandCreateInput = {
  name: string;
  slug?: string | null;
  description?: string | null;
};

export type BrandCreateDraft = {
  name: string;
  slug: string;
  description: string | null;
};

export type BrandCreationResult = AppResult<
  BrandCreateDraft,
  { reasons: string[] }
>;

export type BrandConflictInput = {
  existingByName: { id: string; name: string } | null;
  existingBySlug: { id: string; slug: string } | null;
  existingArchivedByName: { id: string; name: string } | null;
};

export type BrandConflictDecision =
  | { ok: true }
  | {
      ok: false;
      code: "CONFLICT_STATE";
      reason: "DUPLICATE_NAME" | "DUPLICATE_SLUG" | "ARCHIVED_NAME_CONFLICT";
    };

type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; code: "VALIDATION_FAILED"; reasons: string[] };

function cleanText(value: string): string {
  return value.trim();
}

function validationError(reasons: string[]): ValidationResult {
  return {
    ok: false,
    code: "VALIDATION_FAILED",
    reasons,
  };
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateBrandName(name: string): ValidationResult {
  const value = cleanText(name);

  if (!value.length) {
    return validationError(["name:required"]);
  }

  if (
    value.length < BRAND_NAME_MIN_LENGTH ||
    value.length > BRAND_NAME_MAX_LENGTH
  ) {
    return validationError(["name:length"]);
  }

  return { ok: true, value };
}

export function validateBrandSlug(slug: string): ValidationResult {
  const value = cleanText(slug);

  if (!value.length) {
    return validationError(["slug:required"]);
  }

  if (
    value.length < BRAND_SLUG_MIN_LENGTH ||
    value.length > BRAND_SLUG_MAX_LENGTH
  ) {
    return validationError(["slug:length"]);
  }

  if (!BRAND_SLUG_PATTERN.test(value)) {
    return validationError(["slug:format"]);
  }

  return { ok: true, value };
}

export function detectBrandCreateConflict(
  input: BrandConflictInput
): BrandConflictDecision {
  if (input.existingArchivedByName) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "ARCHIVED_NAME_CONFLICT",
    };
  }

  if (input.existingByName) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "DUPLICATE_NAME",
    };
  }

  if (input.existingBySlug) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "DUPLICATE_SLUG",
    };
  }

  return { ok: true };
}

export function createBrand(input: BrandCreateInput): BrandCreationResult {
  const name = validateBrandName(input.name);
  if (!name.ok) {
    return Result.error(new GeneralError({ reasons: name.reasons }, name.code));
  }

  const rawSlug =
    typeof input.slug === "string" && input.slug.trim().length > 0
      ? input.slug
      : generateSlug(name.value);
  const slug = validateBrandSlug(rawSlug);
  if (!slug.ok) {
    return Result.error(new GeneralError({ reasons: slug.reasons }, slug.code));
  }

  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  if (description.length > BRAND_DESCRIPTION_MAX_LENGTH) {
    return Result.error(
      new GeneralError(
        { reasons: ["description:length"] },
        "VALIDATION_FAILED"
      )
    );
  }

  return Result.okay({
    name: name.value,
    slug: slug.value,
    description: description.length ? description : null,
  });
}
