import type { RouteAuthMetadata as RouteAuthMetadataInput } from "@/domain/auth/rbac";
import type { ErrorCodeType } from "@/utils/general/error";

export type {
  RouteAuthMetadata,
  RouteAuthMode,
  RouteRole,
} from "@/domain/auth/rbac";

export type RouteRateLimitClass =
  | "none"
  | "public-read"
  | "auth-password"
  | "oauth-login"
  | "email-token"
  | "customer-write"
  | "checkout-payment"
  | "admin-write"
  | "asset-upload"
  | "webhook";

export type RouteDetailInput = {
  summary: string;
  description: string;
  tags: readonly string[];
  auth?: RouteAuthMetadataInput;
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
    ...(input.rateLimitClass
      ? { "x-rate-limit-class": input.rateLimitClass }
      : {}),
    ...(input.errorCodes ? { "x-error-codes": input.errorCodes } : {}),
  };
}
