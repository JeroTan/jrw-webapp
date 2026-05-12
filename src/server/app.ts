import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { apiError } from "@/lib/api/response";
import { astroBridgeDecorations } from "@/lib/elysia/astroBridgeContext";
import { corsMiddleware } from "@/server/middleware/cors";
import { openApiDocumentation } from "@/server/openapi/documentation";
import { serverRoutes } from "@/server/routes";
import { DEFAULT_ERROR_MESSAGE } from "@/utils/general/error";

export function createApp() {
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
    .onError(({ code, set }) => {
      switch (code) {
        case "VALIDATION":
          set.status = 400;
          return apiError("VALIDATION", DEFAULT_ERROR_MESSAGE.VALIDATION);
        case "NOT_FOUND":
          set.status = 404;
          return apiError("NOT_FOUND", DEFAULT_ERROR_MESSAGE.NOT_FOUND);
        case "PARSE":
          set.status = 400;
          return apiError("BAD_REQUEST", DEFAULT_ERROR_MESSAGE.BAD_REQUEST);
        case "INVALID_COOKIE_SIGNATURE":
          set.status = 401;
          return apiError("UNAUTHORIZED", DEFAULT_ERROR_MESSAGE.UNAUTHORIZED);
        case "INVALID_FILE_TYPE":
          set.status = 415;
          return apiError(
            "UNSUPPORTED_MEDIA_TYPE",
            DEFAULT_ERROR_MESSAGE.UNSUPPORTED_MEDIA_TYPE,
          );
        default:
          set.status = 500;
          return apiError(
            "INTERNAL_SERVER_ERROR",
            DEFAULT_ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
          );
      }
    })
    .use(astroBridgeDecorations)
    .use(serverRoutes);
}

export type App = ReturnType<typeof createApp>;
