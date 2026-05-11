import { DEFAULT_ERROR_MESSAGE, type ErrorCodeType } from "@/utils/general/error";
import type { ApiError } from "./response";

const internalOnlyCodes = new Set<ErrorCodeType>([
  "UNKNOWN",
  "INTERNAL_SERVER_ERROR",
  "INTERNAL_ERROR",
  "PACKAGE_ERROR",
  "PROCESSING_ERROR",
]);

export function publicErrorMessage(code: ErrorCodeType, message?: string): string {
  if (internalOnlyCodes.has(code)) {
    return DEFAULT_ERROR_MESSAGE[code];
  }

  if (code === "FORBIDDEN" || code === "UNAUTHORIZED" || code === "AUTHENTICATION") {
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
    case "VALIDATION":
    case "BAD_REQUEST":
    case "INPUT_ERROR":
    case "REQUEST_ERROR":
      return 400;
    case "AUTHENTICATION":
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "PAYLOAD_TOO_LARGE":
      return 413;
    case "UNSUPPORTED_MEDIA_TYPE":
      return 415;
    case "TOO_MANY_REQUESTS":
      return 429;
    default:
      return 500;
  }
}
