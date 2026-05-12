import type { ErrorCodeType } from "@/utils/general/error";

export type RouteAuthMode = "public" | "optional" | "required";

export type RouteRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CUSTOMER"
  | "PROSPECT"
  | "SYSTEM";

export type RouteAuthMetadata = {
  mode: RouteAuthMode;
  roles?: readonly RouteRole[];
};

export type RouteRateLimitClass =
  | "none"
  | "public-read"
  | "auth-password"
  | "email-token"
  | "checkout-payment"
  | "admin-write"
  | "asset-upload"
  | "webhook";

export type RouteDetailInput = {
  summary: string;
  description: string;
  tags: readonly string[];
  auth?: RouteAuthMetadata;
  rateLimitClass?: RouteRateLimitClass;
  errorCodes?: readonly ErrorCodeType[];
  deprecated?: boolean;
};

export function routeDetail(input: RouteDetailInput) {
  return {
    summary: input.summary,
    description: input.description,
    tags: [...input.tags],
    ...(input.deprecated === undefined ? {} : { deprecated: input.deprecated }),
    ...(input.auth ? { "x-auth": input.auth } : {}),
    ...(input.rateLimitClass ? { "x-rate-limit-class": input.rateLimitClass } : {}),
    ...(input.errorCodes ? { "x-error-codes": input.errorCodes } : {}),
  };
}
