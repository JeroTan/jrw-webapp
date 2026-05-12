import { t } from "elysia";
import { apiSuccessWithRequestId } from "@/lib/api/response";
import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import type { RequestContextDecorations } from "@/server/context/request-context";
import { routeDetail } from "@/server/openapi/route-metadata";
import type Elysia from "elysia";
import { serverRouteGroups } from "./route-groups";

export function foundationRoutes(app: Elysia) {
  return app.get(
    "/",
    (ctx) => {
      const { requestId } = ctx as typeof ctx & RequestContextDecorations;

      return apiSuccessWithRequestId(
        {
          name: "jrw-webapp-api" as const,
          routeGroups: [...serverRouteGroups],
        },
        requestId,
        { code: "SUCCESS" },
      );
    },
    {
      detail: routeDetail({
        summary: "API foundation",
        description:
          "Reports canonical JRW API ownership and planned route groups without exposing legacy mock endpoints.",
        tags: ["Foundation"],
        auth: { mode: "public", roles: ["PROSPECT"] },
        rateLimitClass: "public-read",
        errorCodes: ["INTERNAL_ERROR"],
      }),
      response: {
        200: tboxApiSuccess(
          t.Object({
            name: t.Literal("jrw-webapp-api"),
            routeGroups: t.Array(t.String()),
          }),
        ),
        ...openApiErrorResponses([500]),
      },
    },
  );
}
