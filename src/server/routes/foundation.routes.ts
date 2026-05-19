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
          `Reports canonical JRW API ownership and planned route groups without exposing legacy mock endpoints.

**Path:** \`GET /\`

**Authentication:** Public — no authentication required.

**Request:** No parameters required.

**Response (200):**
- \`data.name\` (string): Always \`"jrw-webapp-api"\` — identifies this as the JRW production API.
- \`data.routeGroups\` (array of strings): List of canonical route group identifiers that define the API surface:
  - \`admin-auth\`: Admin login, session management, and password recovery.
  - \`customer-auth\`: Customer login, session management, OAuth, and password recovery.
  - \`customers\`: Customer registration, profile, and email verification.
  - \`owner-governance\`: Platform ownership transfer and candidate listing.
  - \`brands\`: Brand CRUD, membership, invitations, and product scoping.
  - \`products\`: Product catalog, variants, pricing, and inventory (planned).
  - \`checkout\`: Cart validation, inventory reservation, and payment handoff (planned).
  - \`payments\`: PayMongo payment state and webhook reconciliation (planned).
  - \`webhooks\`: External provider webhook endpoints (planned).
  - \`orders\`: Customer order status and admin fulfillment operations (planned).
  - \`returns-refunds\`: Manual return and refund recording (planned).
  - \`assets\`: Product asset metadata and R2-backed media (planned).
  - \`audit\`: Sensitive action and activity history (planned).

**Note:** Route groups marked as "(planned)" are not yet implemented. This endpoint serves as API discovery and version identification.`,
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
