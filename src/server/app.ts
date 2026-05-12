import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { apiError } from "@/lib/api/response";
import { astroBridgeDecorations } from "@/lib/elysia/astroBridgeContext";
import { corsMiddleware } from "@/server/middleware/cors";
import { openApiDocumentation } from "@/server/openapi/documentation";
import { serverRoutes } from "@/server/routes";

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
      if (code === "VALIDATION") {
        set.status = 400;
        return apiError("VALIDATION", "The request contains invalid data.");
      }

      set.status = 500;
      return apiError(
        "INTERNAL_SERVER_ERROR",
        "An internal server error occurred.",
      );
    })
    .use(astroBridgeDecorations)
    .use(serverRoutes);
}

export type App = ReturnType<typeof createApp>;
