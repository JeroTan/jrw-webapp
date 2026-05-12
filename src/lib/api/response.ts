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
  exposeErrorDetails?: boolean;
};

export type ApiErrorDetails = Record<string, unknown>;

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
  if (!requestId) {
    return details && typeof details === "object" && !Array.isArray(details)
      ? (details as ApiErrorDetails)
      : details === undefined
        ? undefined
        : { details };
  }

  if (details === undefined) {
    return { requestId };
  }

  if (details && typeof details === "object" && !Array.isArray(details)) {
    return { ...(details as ApiErrorDetails), requestId };
  }

  return { requestId, details };
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
): ApiResponse<T, D> {
  if (result.error === null) {
    return apiSuccess(result.content, options.meta);
  }

  const error = result.error;
  if (error instanceof GeneralError) {
    return options.exposeErrorDetails
      ? apiError(error.code, publicErrorMessage(error.code, error.message), error.data)
      : apiError(error.code, publicErrorMessage(error.code, error.message));
  }

  return apiError("UNKNOWN", "An unknown error occurred.");
}
