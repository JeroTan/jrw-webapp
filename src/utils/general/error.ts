export const ERROR_CODE = [
  "NOT_FOUND",
  "UNKNOWN",
  "VALIDATION",
  "AUTHENTICATION",
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "INTERNAL_SERVER_ERROR",
  "CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "TOO_MANY_REQUESTS",
  "INTERNAL_ERROR",
  "PACKAGE_ERROR",
  "INPUT_ERROR",
  "REQUEST_ERROR",
  "PROCESSING_ERROR",
  "UPLOAD_ERROR",
] as const;

export type ErrorCodeType = (typeof ERROR_CODE)[number];

export const DEFAULT_ERROR_MESSAGE: Record<ErrorCodeType, string> = {
  NOT_FOUND: "The requested resource was not found.",
  UNKNOWN: "An unknown error occurred.",
  VALIDATION: "The request contains invalid data.",
  AUTHENTICATION: "Authentication failed.",
  BAD_REQUEST: "The request is invalid.",
  UNAUTHORIZED: "Authentication is required.",
  FORBIDDEN: "You do not have permission to perform this action.",
  INTERNAL_SERVER_ERROR: "An internal server error occurred.",
  CONFLICT: "The request conflicts with the current state.",
  PAYLOAD_TOO_LARGE: "The request payload is too large.",
  UNSUPPORTED_MEDIA_TYPE: "The media type is not supported.",
  TOO_MANY_REQUESTS: "Too many requests. Please try again later.",
  INTERNAL_ERROR: "An internal error occurred.",
  PACKAGE_ERROR: "A package operation failed.",
  INPUT_ERROR: "The input is invalid.",
  REQUEST_ERROR: "The request could not be processed.",
  PROCESSING_ERROR: "Processing failed.",
  UPLOAD_ERROR: "The upload failed.",
};

export class GeneralError<T = unknown> {
  constructor(
    public data: T,
    public code: ErrorCodeType = "UNKNOWN",
    public message: string = DEFAULT_ERROR_MESSAGE[code],
  ) {}
}
