import { t } from "elysia";
import { apiSuccess } from "@/lib/api/response";
import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import type Elysia from "elysia";
import { serverRouteGroups } from "./route-groups";

export function foundationRoutes(app: Elysia) {
  return app.get(
    "/",
    () =>
      apiSuccess(
        {
          name: "jrw-webapp-api" as const,
          routeGroups: [...serverRouteGroups],
        },
        { code: "SUCCESS" },
      ),
    {
      detail: {
        summary: "API foundation",
        description:
          "Reports canonical JRW API ownership and planned route groups without exposing legacy mock endpoints.",
        tags: ["Foundation"],
      },
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
