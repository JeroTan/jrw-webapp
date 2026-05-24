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

const tboxPublicCatalogRecoveryLink = t.Object({
  href: t.String(),
  label: t.String(),
});

const tboxPublicCatalogGalleryItem = t.Object({
  alt: t.String(),
  height: t.Union([t.Number(), t.Null()]),
  id: t.String(),
  isPrimary: t.Boolean(),
  name: t.Union([t.String(), t.Null()]),
  src: t.String(),
  width: t.Union([t.Number(), t.Null()]),
});

const tboxPublicCatalogVariantOption = t.Object({
  group: t.String(),
  name: t.String(),
});

const tboxPublicCatalogDetailVariant = t.Object({
  availability: tboxPublicCatalogAvailability,
  disabled: t.Boolean(),
  id: t.String(),
  imageSrc: t.Optional(t.String()),
  label: t.String(),
  optionValues: t.Array(tboxPublicCatalogVariantOption),
  priceCentavos: t.Number(),
  priceLabel: t.String(),
  productId: t.String(),
  selected: t.Boolean(),
  unavailableReason: t.Optional(t.String()),
});

const tboxPublicCatalogActionState = t.Object({
  disabled: t.Boolean(),
  label: t.String(),
  reason: t.Optional(t.String()),
});

const tboxPublicCatalogDetailMetadata = t.Object({
  availabilityText: t.String(),
  canonicalPath: t.String(),
  description: t.String(),
  imageAlt: t.Optional(t.String()),
  imageSrc: t.Optional(t.String()),
  robots: t.Union([t.Literal("index,follow"), t.Literal("noindex,nofollow")]),
  title: t.String(),
});

const tboxPublicCatalogProductDetailSummary = t.Object({
  availability: tboxPublicCatalogAvailability,
  brandName: t.Union([t.String(), t.Null()]),
  categories: t.Array(tboxPublicCatalogCategoryOption),
  description: t.String(),
  id: t.String(),
  name: t.String(),
  priceCentavos: t.Union([t.Number(), t.Null()]),
  priceLabel: t.String(),
  primaryImage: t.Union([tboxPublicCatalogGalleryItem, t.Null()]),
  slug: t.String(),
  summary: t.Union([t.String(), t.Null()]),
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
    page: t.Optional(t.Numeric({ minimum: 1, multipleOf: 1, default: 1 })),
    pageSize: t.Optional(
      t.Numeric({ minimum: 1, maximum: 100, multipleOf: 1, default: 20 })
    ),
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

const tboxPublicCatalogDetailParams = t.Object({
  slug: t.String({ minLength: 1 }),
});

const tboxPublicCatalogDetailData = t.Object({
  action: tboxPublicCatalogActionState,
  gallery: t.Array(tboxPublicCatalogGalleryItem),
  metadata: tboxPublicCatalogDetailMetadata,
  product: tboxPublicCatalogProductDetailSummary,
  recoveryLinks: t.Array(tboxPublicCatalogRecoveryLink),
  selectedVariantId: t.Union([t.String(), t.Null()]),
  variants: t.Array(tboxPublicCatalogDetailVariant),
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
                page?: number | string;
                pageSize?: number | string;
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
      "/storefront/catalog/products/:slug",
      async (ctx) => {
        const { params, request, requestId, runtimeEnv, set } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              params: {
                slug: string;
              };
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
            };
        const controller = getController(
          { request, requestId, runtimeEnv },
          options
        );
        const result = await controller.getProductDetail({
          requestId,
          slug: params.slug,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        detail: routeDetail({
          summary: "Read public product detail",
          description:
            "Returns customer-safe storefront detail for one published product, including gallery, variants, availability, numeric display price data, and metadata fields. Brand membership is not required because only published public storefront fields are exposed.",
          tags: ["Public Catalog"],
          auth: publicCatalogAuth,
          rateLimitClass: "public-read",
          errorCodes: [...publicCatalogErrors],
        }),
        params: tboxPublicCatalogDetailParams,
        response: {
          200: tboxApiSuccess(tboxPublicCatalogDetailData),
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
