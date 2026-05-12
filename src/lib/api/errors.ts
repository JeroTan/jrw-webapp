import { DEFAULT_ERROR_MESSAGE, type ErrorCodeType } from "@/utils/general/error";
import type { ApiError } from "./response";

const internalOnlyCodes = new Set<ErrorCodeType>([
  "UNKNOWN",
  "INTERNAL_SERVER_ERROR",
  "INTERNAL_ERROR",
  "PACKAGE_ERROR",
  "PROCESSING_ERROR",
  "PROVIDER_UNAVAILABLE",
  "PAYMENT_FAILED",
  "WEBHOOK_INVALID_SIGNATURE",
]);

export function publicErrorMessage(code: ErrorCodeType, message?: string): string {
  if (internalOnlyCodes.has(code)) {
    return DEFAULT_ERROR_MESSAGE[code];
  }

  if (
    code === "FORBIDDEN" ||
    code === "UNAUTHORIZED" ||
    code === "AUTHENTICATION" ||
    code === "AUTH_REQUIRED" ||
    code === "AUTH_FORBIDDEN"
  ) {
    return DEFAULT_ERROR_MESSAGE[code];
  }

  return message ?? DEFAULT_ERROR_MESSAGE[code];
}

export function forbiddenApiError<D = unknown>(details?: D): ApiError<D> {
  return details === undefined
    ? { error: { code: "FORBIDDEN", message: DEFAULT_ERROR_MESSAGE.FORBIDDEN } }
    : { error: { code: "FORBIDDEN", message: DEFAULT_ERROR_MESSAGE.FORBIDDEN, details } };
}

export function errorCodeToHttpStatus(code: ErrorCodeType): number {
  switch (code) {
    case "VALIDATION_FAILED":
    case "VALIDATION":
    case "BAD_REQUEST":
    case "INPUT_ERROR":
    case "REQUEST_ERROR":
      return 400;
    case "AUTH_REQUIRED":
    case "WEBHOOK_INVALID_SIGNATURE":
    case "AUTHENTICATION":
    case "UNAUTHORIZED":
      return 401;
    case "AUTH_FORBIDDEN":
    case "EMAIL_NOT_VERIFIED":
    case "ADMIN_APPROVAL_REQUIRED":
    case "ACCOUNT_SUSPENDED":
    case "BRAND_MEMBERSHIP_REQUIRED":
    case "FORBIDDEN":
      return 403;
    case "RESOURCE_NOT_FOUND":
    case "NOT_FOUND":
      return 404;
    case "PAYMENT_REQUIRED":
    case "PAYMENT_FAILED":
      return 402;
    case "CONFLICT_STATE":
    case "IDEMPOTENCY_CONFLICT":
    case "INVENTORY_UNAVAILABLE":
    case "CONFLICT":
      return 409;
    case "PAYLOAD_TOO_LARGE":
      return 413;
    case "UNSUPPORTED_MEDIA_TYPE":
      return 415;
    case "RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
      return 429;
    case "PROVIDER_UNAVAILABLE":
      return 503;
    default:
      return 500;
  }
}
