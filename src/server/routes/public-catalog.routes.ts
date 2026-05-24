import { t } from "elysia";
import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import { PublicCatalogController } from "@/server/controllers/PublicCatalogController";
import type { RequestContextDecorations } from "@/server/context/request-context";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createPublicCatalogRepositories } from "@/server/repositories/PublicCatalogRepository";
import { PublicCatalogService } from "@/server/services/PublicCatalogService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

export type PublicCatalogControllerFactoryInput = {
  request: Request;
  requestId: string;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
};

export type PublicCatalogRoutesOptions = {
  controllerFactory?: (
    input: PublicCatalogControllerFactoryInput
  ) => PublicCatalogController;
};

const tboxPublicCatalogTone = t.Union([
  t.Literal("info"),
  t.Literal("success"),
  t.Literal("warning"),
  t.Literal("error"),
]);

const tboxPublicCatalogAvailability = t.Object({
  inStock: t.Boolean(),
  label: t.String(),
  tone: tboxPublicCatalogTone,
});

const tboxPublicCatalogQuickAction = t.Object({
  disabled: t.Boolean(),
  hint: t.Optional(t.String()),
  href: t.String(),
  label: t.String(),
});

const tboxPublicCatalogProductCard = t.Object({
  availability: tboxPublicCatalogAvailability,
  brandName: t.Union([t.String(), t.Null()]),
  categoryName: t.Optional(t.String()),
  href: t.String(),
  id: t.String(),
  imageAlt: t.String(),
  imageSrc: t.Optional(t.String()),
  name: t.String(),
  priceLabel: t.String(),
  quickAction: tboxPublicCatalogQuickAction,
});

const tboxPublicCatalogCategoryOption = t.Object({
  href: t.String(),
  id: t.String(),
  name: t.String(),
  slug: t.String(),
});

const tboxPublicCatalogPagination = t.Object({
  page: t.Number(),
  pageSize: t.Number(),
  totalItems: t.Number(),
  totalPages: t.Number(),
});

const tboxPublicCatalogQuery = t.Object(
  {
    category: t.Optional(t.String()),
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
    q: t.Optional(t.String()),
    sort: t.Optional(t.Literal("new")),
  },
  { additionalProperties: false }
);

const tboxPublicCatalogQueryData = t.Object({
  category: t.Optional(t.String()),
  page: t.Number(),
  pageSize: t.Number(),
  q: t.String(),
  sort: t.Literal("new"),
});

const tboxPublicCatalogEmptyState = t.Object({
  actionHref: t.Optional(t.String()),
  actionLabel: t.Optional(t.String()),
  message: t.String(),
  title: t.String(),
});

const tboxPublicCatalogData = t.Object({
  emptyState: t.Union([tboxPublicCatalogEmptyState, t.Null()]),
  items: t.Array(tboxPublicCatalogProductCard),
  pagination: tboxPublicCatalogPagination,
  query: tboxPublicCatalogQueryData,
  selectedCategory: t.Union([tboxPublicCatalogCategoryOption, t.Null()]),
});

const tboxPublicCatalogCategoryListData = t.Object({
  items: t.Array(tboxPublicCatalogCategoryOption),
});

function createRuntimeController(
  input: PublicCatalogControllerFactoryInput
): PublicCatalogController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const repositories = createPublicCatalogRepositories(db as D1Database);
  const service = new PublicCatalogService({
    ...repositories,
  });

  return new PublicCatalogController(service);
}

function getController(
  input: PublicCatalogControllerFactoryInput,
  options: PublicCatalogRoutesOptions
): PublicCatalogController {
  return options.controllerFactory?.(input) ?? createRuntimeController(input);
}

const publicCatalogAuth = {
  mode: "public",
  roles: ["PROSPECT"],
} as const;

const publicCatalogErrors = [
  "VALIDATION_FAILED",
  "RESOURCE_NOT_FOUND",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export function publicCatalogRoutes(
  app: AnyElysia,
  options: PublicCatalogRoutesOptions = {}
) {
  return app
    .get(
      "/storefront/catalog",
      async (ctx) => {
        const { query, request, requestId, runtimeEnv, set } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              query: {
                category?: string;
                page?: number;
                pageSize?: number;
                q?: string;
                sort?: "new";
              };
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
            };
        const controller = getController(
          { request, requestId, runtimeEnv },
          options
        );
        const result = await controller.listCatalog({
          query,
          requestId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        detail: routeDetail({
          summary: "Browse public catalog",
          description:
            "Lists published JRW products for storefront browsing with search, category filtering, and pagination.",
          tags: ["Public Catalog"],
          auth: publicCatalogAuth,
          rateLimitClass: "public-read",
          errorCodes: [...publicCatalogErrors],
        }),
        query: tboxPublicCatalogQuery,
        response: {
          200: tboxApiSuccess(tboxPublicCatalogData),
          ...openApiErrorResponses([400, 404, 500, 503]),
        },
      }
    )
    .get(
      "/storefront/catalog/categories",
      async (ctx) => {
        const { request, requestId, runtimeEnv, set } = ctx as typeof ctx &
          RequestContextDecorations & {
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
          };
        const controller = getController(
          { request, requestId, runtimeEnv },
          options
        );
        const result = await controller.listCategories({
          requestId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        detail: routeDetail({
          summary: "List public catalog categories",
          description:
            "Lists active visible categories for storefront browsing and recovery flows.",
          tags: ["Public Catalog"],
          auth: publicCatalogAuth,
          rateLimitClass: "public-read",
          errorCodes: ["PROVIDER_UNAVAILABLE", "INTERNAL_ERROR"],
        }),
        response: {
          200: tboxApiSuccess(tboxPublicCatalogCategoryListData),
          ...openApiErrorResponses([500, 503]),
        },
      }
    );
}
