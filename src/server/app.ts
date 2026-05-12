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
import { requestContextPlugin, setRequestIdResponseHeader } from "@/server/context/request-context";
import { corsMiddleware } from "@/server/middleware/cors";
import { openApiDocumentation } from "@/server/openapi/documentation";
import { serverRoutes } from "@/server/routes";
import type { ErrorCodeType } from "@/utils/general/error";
import { getOrCreateRequestId } from "@/utils/request-id";

export type CreateAppOptions = {
  operationalLogger?: OperationalLogger;
};

function mapElysiaErrorCode(code: string): ErrorCodeType {
  switch (code) {
    case "VALIDATION":
      return "VALIDATION_FAILED";
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

export function createApp(options: CreateAppOptions = {}) {
  const operationalLogger = options.operationalLogger ?? consoleOperationalLogger;

  return new Elysia({
    prefix: "/api",
    adapter: CloudflareAdapter,
    aot: false,
    normalize: true,
  })
    .use(
      openapi({
        documentation: openApiDocumentation,
      }),
    )
    .use(corsMiddleware())
    .onError(({ code, error, request, set }) => {
      const requestId = getOrCreateRequestId(request.headers);
      const errorCode = mapElysiaErrorCode(String(code));

      set.status = errorCodeToHttpStatus(errorCode);
      setRequestIdResponseHeader(set, requestId);

      if (shouldLogOperationalFailure(errorCode)) {
        operationalLogger.record(
          createOperationalLogEvent({
            requestId,
            errorCode,
            details: {
              elysiaCode: code,
              error,
            },
          }),
        );
      }

      return apiErrorWithRequestId(errorCode, publicErrorMessage(errorCode), requestId);
    })
    .use(astroBridgeDecorations)
    .use(requestContextPlugin)
    .use(serverRoutes);
}

export type App = ReturnType<typeof createApp>;
