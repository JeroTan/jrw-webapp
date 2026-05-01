export class LogicError<T> {
  constructor(
    public data: T,
    public code: LogicErrorCodeType
  ) {}
}

export const LOGIC_ERROR_CODE = [
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

export type LogicErrorCodeType = (typeof LOGIC_ERROR_CODE)[number];
