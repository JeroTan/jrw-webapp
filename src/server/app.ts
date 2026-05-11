import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { astroBridgeDecorations } from "@/lib/elysia/astroBridgeContext";
import { apiError } from "@/lib/api/response";
import {
  assetsRoutes,
  auditRoutes,
  authRoutes,
  customerOrderingRoutes,
  foundationRoutes,
  menuRoutes,
  ordersRoutes,
  platformAdminRoutes,
  restaurantAdminRoutes,
  seatingQrRoutes,
  subscriptionsAdsRoutes,
} from "@/server/routes"; // This is just direct copy from my other project but you get the format

export function createApp() {
  return new Elysia({
    prefix: "/api",
    adapter: CloudflareAdapter,
    aot: false,
    normalize: true,
  })
    .use(
      openapi({
        documentation: {
          info: {
            title: "QR Resto Hub API",
            version: "1.0.0",
            description: "Internal API contract for QR Resto Hub.",
          },
        },
      })
    )
    .onError(({ code, set }) => {
      if (code === "VALIDATION") {
        set.status = 400;
        return apiError("VALIDATION", "The request contains invalid data.");
      }

      set.status = 500;
      return apiError(
        "INTERNAL_SERVER_ERROR",
        "An internal server error occurred."
      );
    })
    .use(astroBridgeDecorations)
    .use(foundationRoutes)
    .use(authRoutes)
    .use(platformAdminRoutes)
    .use(restaurantAdminRoutes)
    .use(menuRoutes)
    .use(seatingQrRoutes)
    .use(customerOrderingRoutes)
    .use(ordersRoutes)
    .use(subscriptionsAdsRoutes)
    .use(assetsRoutes)
    .use(auditRoutes);
}

export type App = ReturnType<typeof createApp>;
