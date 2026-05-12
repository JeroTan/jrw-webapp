import { GeneralError, type ErrorCodeType } from "@/utils/general/error";
import type { AppResult } from "@/utils/general/result";
import type { SuccessCodeType } from "@/utils/general/success";
import { publicErrorMessage } from "./errors";

export type ApiMeta = {
  code?: SuccessCodeType;
  requestId?: string;
  [key: string]: unknown;
};

export type ApiSuccess<T, M extends ApiMeta = ApiMeta> = {
  data: T;
  meta: M;
};

export type ApiError<D = unknown> = {
  error: {
    code: ErrorCodeType;
    message: string;
    details?: D;
  };
};

export type ApiResponse<T, D = unknown, M extends ApiMeta = ApiMeta> =
  | ApiSuccess<T, M>
  | ApiError<D>;

export type ResultToApiOptions = {
  meta?: ApiMeta;
  requestId?: string;
  exposeErrorDetails?: boolean;
};

export type ApiErrorDetails = Record<string, unknown>;
export const REDACTED_API_ERROR_DETAIL = "[REDACTED]";

const sensitiveErrorDetailKeyPatterns = [
  /password/i,
  /passphrase/i,
  /hash/i,
  /jwt/i,
  /token/i,
  /secret/i,
  /cookie/i,
  /authorization/i,
  /signature/i,
  /session/i,
  /email/i,
  /paymongo/i,
  /provider.*payload/i,
  /raw.*provider/i,
  /provider.*response/i,
  /payment.*payload/i,
  /payment.*response/i,
  /raw.*payment/i,
  /raw.*payload/i,
  /card/i,
  /pepper/i,
  /stack/i,
  /phone/i,
  /address/i,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shouldRedactErrorDetailKey(key: string): boolean {
  return sensitiveErrorDetailKeyPatterns.some((pattern) => pattern.test(key));
}

function shouldRedactErrorDetailString(value: string): boolean {
  return (
    /^Bearer\s+/i.test(value) ||
    /^(sk|pk)_(test|live)_/i.test(value) ||
    /^ya29\./i.test(value) ||
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value) ||
    /\b(password|secret|token|jwt|cookie|paymongo|raw payment|provider payload|stack)\b/i.test(
      value,
    )
  );
}

function sanitizeApiErrorDetailValue(
  value: unknown,
  key = "",
  seen = new WeakSet<object>(),
): unknown {
  if (key && shouldRedactErrorDetailKey(key)) {
    return REDACTED_API_ERROR_DETAIL;
  }

  if (value instanceof GeneralError) {
    return {
      code: value.code,
      message: REDACTED_API_ERROR_DETAIL,
      data: REDACTED_API_ERROR_DETAIL,
    };
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: REDACTED_API_ERROR_DETAIL,
      stack: REDACTED_API_ERROR_DETAIL,
    };
  }

  if (typeof value === "string") {
    return shouldRedactErrorDetailString(value) ? REDACTED_API_ERROR_DETAIL : value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return REDACTED_API_ERROR_DETAIL;
    }

    seen.add(value);
    return value.map((item) => sanitizeApiErrorDetailValue(item, "", seen));
  }

  if (isRecord(value)) {
    if (seen.has(value)) {
      return REDACTED_API_ERROR_DETAIL;
    }

    seen.add(value);
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeApiErrorDetailValue(entryValue, entryKey, seen),
      ]),
    );
  }

  return value;
}

export function sanitizeApiErrorDetails(details?: unknown): ApiErrorDetails | undefined {
  if (details === undefined) {
    return undefined;
  }

  const sanitized = sanitizeApiErrorDetailValue(details);

  return isRecord(sanitized) ? sanitized : { details: sanitized };
}

export function apiSuccess<T, M extends ApiMeta = ApiMeta>(
  data: T,
  meta = {} as M,
): ApiSuccess<T, M> {
  return { data, meta };
}

export function apiError<D = unknown>(
  code: ErrorCodeType,
  message: string,
  details?: D,
): ApiError<D> {
  return details === undefined
    ? { error: { code, message } }
    : { error: { code, message, details } };
}

export function withRequestIdMeta(meta: ApiMeta = {}, requestId?: string): ApiMeta {
  return requestId ? { ...meta, requestId } : meta;
}

export function withRequestIdDetails(
  details?: unknown,
  requestId?: string,
): ApiErrorDetails | undefined {
  const safeDetails = sanitizeApiErrorDetails(details);

  if (!requestId) {
    return safeDetails;
  }

  return { ...(safeDetails ?? {}), requestId };
}

export function apiSuccessWithRequestId<T>(
  data: T,
  requestId?: string,
  meta: ApiMeta = {},
): ApiSuccess<T> {
  return apiSuccess(data, withRequestIdMeta(meta, requestId));
}

export function apiErrorWithRequestId(
  code: ErrorCodeType,
  message: string,
  requestId?: string,
  details?: unknown,
): ApiError<ApiErrorDetails> {
  return apiError(code, message, withRequestIdDetails(details, requestId));
}

export function resultToApiResponse<T, D = unknown>(
  result: AppResult<T, D>,
  options: ResultToApiOptions = {},
): ApiResponse<T, ApiErrorDetails> {
  if (result.error === null) {
    return apiSuccess(result.content, withRequestIdMeta(options.meta, options.requestId));
  }

  const error = result.error;
  if (error instanceof GeneralError) {
    return options.exposeErrorDetails
      ? apiErrorWithRequestId(
          error.code,
          publicErrorMessage(error.code, error.message),
          options.requestId,
          error.data,
        )
      : apiErrorWithRequestId(
          error.code,
          publicErrorMessage(error.code, error.message),
          options.requestId,
        );
  }

  return apiErrorWithRequestId("UNKNOWN", "An unknown error occurred.", options.requestId);
}
