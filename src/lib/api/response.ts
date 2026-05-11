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
