import type { ApiFailure } from "./api";

export function productActionErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof (error as ApiFailure).code !== "string"
  ) {
    return fallback;
  }

  const failure = error as ApiFailure;
  const reason =
    typeof failure.details === "object" &&
    failure.details !== null &&
    "reason" in failure.details &&
    typeof (failure.details as { reason?: unknown }).reason === "string"
      ? String((failure.details as { reason: string }).reason)
      : null;

  if (failure.code === "CONFLICT_STATE") {
    if (reason === "DUPLICATE_SLUG") {
      return "Slug is already in use.";
    }

    if (reason === "BRAND_MEMBERSHIP_REQUIRED") {
      return "You need active membership in selected brand.";
    }

    return "Product state conflicts with current data.";
  }

  if (failure.code === "VALIDATION_FAILED") {
    if (reason === "CATEGORY_NOT_ACTIVE") {
      return "Archived categories cannot be assigned to this product.";
    }
    if (reason === "INVALID_CATEGORY_IDS") {
      return "Selected categories are invalid. Refresh and try again.";
    }

    return "Product data is invalid. Check required fields and try again.";
  }

  if (failure.code === "AUTH_FORBIDDEN") {
    if (reason === "BRAND_MEMBERSHIP_REQUIRED") {
      return "You need active membership in selected brand.";
    }

    return "You do not have access to manage this product.";
  }

  return typeof failure.message === "string" &&
    failure.message.trim().length > 0
    ? failure.message
    : fallback;
}
