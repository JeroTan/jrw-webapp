import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import {
  consoleOperationalLogger,
  createOperationalLogEvent,
  shouldLogOperationalFailure,
  type OperationalLogger,
} from "@/adapter/infrastructure/logging/operational-log";
import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import { apiErrorWithRequestId } from "@/lib/api/response";
import { astroBridgeDecorations } from "@/lib/elysia/astroBridgeContext";
import {
  createRequestContextPlugin,
  setRequestIdResponseHeader,
  type RequestContextPluginOptions,
  type RequestContextDecorations,
} from "@/server/context/request-context";
import { corsMiddleware } from "@/server/middleware/cors";
import { openApiDocumentation } from "@/server/openapi/documentation";
import { serverRoutes, type ServerRoutesOptions } from "@/server/routes";
import {
  ERROR_CODE,
  GeneralError,
  type ErrorCodeType,
} from "@/utils/general/error";
import { getOrCreateRequestId } from "@/utils/request-id";

export type CreateAppOptions = {
  operationalLogger?: OperationalLogger;
  requestContext?: RequestContextPluginOptions;
  routes?: ServerRoutesOptions;
};

const knownErrorCodes = new Set<string>(ERROR_CODE);

function isErrorCodeType(value: unknown): value is ErrorCodeType {
  return typeof value === "string" && knownErrorCodes.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isResponseValidationError(error: unknown): boolean {
  return isRecord(error) && error.type === "response";
}

function mapHttpStatusToErrorCode(status: number): ErrorCodeType {
  switch (status) {
    case 400:
    case 422:
      return "VALIDATION_FAILED";
    case 401:
      return "AUTH_REQUIRED";
    case 402:
      return "PAYMENT_REQUIRED";
    case 403:
      return "AUTH_FORBIDDEN";
    case 404:
      return "RESOURCE_NOT_FOUND";
    case 409:
      return "CONFLICT_STATE";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 415:
      return "UNSUPPORTED_MEDIA_TYPE";
    case 429:
      return "RATE_LIMITED";
    case 503:
      return "PROVIDER_UNAVAILABLE";
    default:
      return "INTERNAL_ERROR";
  }
}

function mapElysiaErrorCode(code: unknown, error: unknown): ErrorCodeType {
  if (typeof code === "number") {
    return mapHttpStatusToErrorCode(code);
  }

  if (isErrorCodeType(code)) {
    switch (code) {
      case "VALIDATION":
        return isResponseValidationError(error)
          ? "INTERNAL_ERROR"
          : "VALIDATION_FAILED";
      case "NOT_FOUND":
        return "RESOURCE_NOT_FOUND";
      case "AUTHENTICATION":
      case "UNAUTHORIZED":
        return "AUTH_REQUIRED";
      case "FORBIDDEN":
        return "AUTH_FORBIDDEN";
      case "CONFLICT":
        return "CONFLICT_STATE";
      case "TOO_MANY_REQUESTS":
        return "RATE_LIMITED";
      case "INTERNAL_SERVER_ERROR":
        return "INTERNAL_ERROR";
      default:
        return code;
    }
  }

  switch (code) {
    case "VALIDATION":
      return isResponseValidationError(error)
        ? "INTERNAL_ERROR"
        : "VALIDATION_FAILED";
    case "NOT_FOUND":
      return "RESOURCE_NOT_FOUND";
    case "PARSE":
      return "BAD_REQUEST";
    case "INVALID_COOKIE_SIGNATURE":
      return "AUTH_REQUIRED";
    case "INVALID_FILE_TYPE":
      return "UNSUPPORTED_MEDIA_TYPE";
    default:
      return "INTERNAL_ERROR";
  }
}

function getErrorRequestId(
  context: { request: Request } & Partial<RequestContextDecorations>
): string {
  return (
    context.requestId ??
    context.requestContext?.requestId ??
    getOrCreateRequestId(context.request.headers)
  );
}

export function createApp(options: CreateAppOptions = {}) {
  const operationalLogger =
    options.operationalLogger ?? consoleOperationalLogger;
  const routes: ServerRoutesOptions = {
    ...options.routes,
    auth: {
      ...options.routes?.auth,
      operationalLogger:
        options.routes?.auth?.operationalLogger ?? operationalLogger,
    },
    accountRecovery: {
      ...options.routes?.accountRecovery,
      operationalLogger:
        options.routes?.accountRecovery?.operationalLogger ?? operationalLogger,
    },
    adminAccounts: {
      ...options.routes?.adminAccounts,
      operationalLogger:
        options.routes?.adminAccounts?.operationalLogger ?? operationalLogger,
    },
    ownerGovernance: {
      ...options.routes?.ownerGovernance,
    },
    brands: {
      ...options.routes?.brands,
    },
    categories: {
      ...options.routes?.categories,
    },
    checkout: {
      ...options.routes?.checkout,
      operationalLogger:
        options.routes?.checkout?.operationalLogger ?? operationalLogger,
    },
    paymentWebhooks: {
      ...options.routes?.paymentWebhooks,
      operationalLogger:
        options.routes?.paymentWebhooks?.operationalLogger ?? operationalLogger,
    },
    paymentReturns: {
      ...options.routes?.paymentReturns,
      operationalLogger:
        options.routes?.paymentReturns?.operationalLogger ?? operationalLogger,
    },
    products: {
      ...options.routes?.products,
    },
    images: {
      ...options.routes?.images,
    },
    inventory: {
      ...options.routes?.inventory,
    },
    variants: {
      ...options.routes?.variants,
    },
    snapshots: {
      ...options.routes?.snapshots,
    },
    publicBrands: {
      ...options.routes?.publicBrands,
    },
    publicCatalog: {
      ...options.routes?.publicCatalog,
    },
    customers: {
      ...options.routes?.customers,
      operationalLogger:
        options.routes?.customers?.operationalLogger ?? operationalLogger,
    },
    googleOAuth: {
      ...options.routes?.googleOAuth,
      operationalLogger:
        options.routes?.googleOAuth?.operationalLogger ?? operationalLogger,
    },
  };

  return new Elysia({
    prefix: "/api",
    adapter: CloudflareAdapter,
    aot: false,
    normalize: true,
  })
    .use(
      openapi({
        documentation: openApiDocumentation,
      })
    )
    .use(corsMiddleware())
    .onError((context) => {
      const { code, error, set } = context;
      const requestId = getErrorRequestId(context);
      const errorCode =
        error instanceof GeneralError
          ? error.code
          : mapElysiaErrorCode(code, error);
      const details =
        error instanceof GeneralError &&
        typeof error.data === "object" &&
        error.data !== null &&
        Object.keys(error.data).length > 0
          ? error.data
          : undefined;

      set.status = errorCodeToHttpStatus(errorCode);
      setRequestIdResponseHeader(set, requestId);

      if (shouldLogOperationalFailure(errorCode)) {
        try {
          operationalLogger.record(
            createOperationalLogEvent({
              requestId,
              errorCode,
              details: {
                elysiaCode: code,
                error,
              },
            })
          );
        } catch {
          // Logging must never mask the original safe error response.
        }
      }

      return apiErrorWithRequestId(
        errorCode,
        publicErrorMessage(
          errorCode,
          error instanceof GeneralError ? error.message : undefined
        ),
        requestId,
        details
      );
    })
    .use(astroBridgeDecorations)
    .use(createRequestContextPlugin(options.requestContext))
    .use((app) => serverRoutes(app, routes));
}

export type App = ReturnType<typeof createApp>;
