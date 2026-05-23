import { t } from "elysia";
import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import { PublicBrandController } from "@/server/controllers/PublicBrandController";
import type { RequestContextDecorations } from "@/server/context/request-context";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createPublicBrandRepositories } from "@/server/repositories/PublicBrandRepository";
import { PublicBrandService } from "@/server/services/PublicBrandService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

export type PublicBrandControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
};

export type PublicBrandRoutesOptions = {
  controllerFactory?: (
    input: PublicBrandControllerFactoryInput
  ) => PublicBrandController;
};

const tboxPublicBrandProductPreview = t.Object({
  href: t.String(),
  id: t.String(),
  imageAlt: t.String(),
  imageSrc: t.Optional(t.String()),
});

const tboxPublicBrandRow = t.Object({
  href: t.String(),
  id: t.String(),
  name: t.String(),
  productCount: t.Number(),
  products: t.Array(tboxPublicBrandProductPreview),
});

const tboxPublicBrandListData = t.Object({
  items: t.Array(tboxPublicBrandRow),
});

const tboxPublicBrandDetailData = t.Object({
  brand: tboxPublicBrandRow,
});

const tboxPublicBrandParams = t.Object(
  {
    slugOrId: t.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false }
);

function createRuntimeController(
  input: PublicBrandControllerFactoryInput
): PublicBrandController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const repositories = createPublicBrandRepositories(db as D1Database);
  const service = new PublicBrandService({
    ...repositories,
  });

  return new PublicBrandController(service);
}

function getController(
  input: PublicBrandControllerFactoryInput,
  options: PublicBrandRoutesOptions
): PublicBrandController {
  return options.controllerFactory?.(input) ?? createRuntimeController(input);
}

const publicBrandAuth = {
  mode: "public",
  roles: ["PROSPECT"],
} as const;

const publicBrandListErrors = [
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

const publicBrandDetailErrors = [
  "VALIDATION_FAILED",
  "RESOURCE_NOT_FOUND",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export function publicBrandRoutes(
  app: AnyElysia,
  options: PublicBrandRoutesOptions = {}
) {
  return app
    .get(
      "/storefront/brands",
      async (ctx) => {
        const { request, set, runtimeEnv, requestId } = ctx as typeof ctx &
          RequestContextDecorations & {
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.listBrands({ requestId });

        set.status = result.status;
        return result.body as never;
      },
      {
        detail: routeDetail({
          summary: "List public brands",
          description:
            "Lists active brands for public storefront browsing, with published product preview counts and image cards where available.",
          tags: ["Public Brands"],
          auth: publicBrandAuth,
          rateLimitClass: "public-read",
          errorCodes: [...publicBrandListErrors],
        }),
        response: {
          200: tboxApiSuccess(tboxPublicBrandListData),
          ...openApiErrorResponses([500, 503]),
        },
      }
    )
    .get(
      "/storefront/brands/:slugOrId",
      async (ctx) => {
        const { request, set, runtimeEnv, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { slugOrId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.getBrand({
          requestId,
          slugOrId: params.slugOrId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxPublicBrandParams,
        detail: routeDetail({
          summary: "Get public brand",
          description:
            "Loads one active brand for public storefront browsing by slug or id.",
          tags: ["Public Brands"],
          auth: publicBrandAuth,
          rateLimitClass: "public-read",
          errorCodes: [...publicBrandDetailErrors],
        }),
        response: {
          200: tboxApiSuccess(tboxPublicBrandDetailData),
          ...openApiErrorResponses([400, 404, 500, 503]),
        },
      }
    );
}
