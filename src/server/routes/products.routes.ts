import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import {
  tboxCreateProductBody,
  tboxProductData,
  tboxProductIdParams,
  tboxProductListData,
  tboxProductListQuery,
  tboxUpdateProductBody,
} from "@/domain/products/schemas";
import {
  ProductController,
  type ProductServiceLike,
} from "@/server/controllers/ProductController";
import type {
  RequestActorContext,
  RequestContextDecorations,
} from "@/server/context/request-context";
import { rbacGuard } from "@/server/middleware/rbac";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createProductRepositories } from "@/server/repositories/ProductRepository";
import { ProductService } from "@/server/services/ProductService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

export type ProductControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
};

export type ProductRoutesOptions = {
  controllerFactory?: (input: ProductControllerFactoryInput) => ProductController;
};

function createRuntimeController(
  input: ProductControllerFactoryInput
): ProductController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const repositories = createProductRepositories(db as D1Database);
  const service = new ProductService({
    ...repositories,
  });

  return new ProductController(service);
}

function getController(
  input: ProductControllerFactoryInput,
  options: ProductRoutesOptions
): ProductController {
  return options.controllerFactory?.(input) ?? createRuntimeController(input);
}

function adminActor(
  actor: RequestActorContext | undefined
): Parameters<ProductServiceLike["createProduct"]>[0]["actor"] {
  return actor
    ? {
        authenticated: actor.authenticated,
        role: actor.role,
        actorId: actor.actorId,
        accountStatus: actor.accountStatus,
        eligibility: actor.eligibility,
      }
    : undefined;
}

const productAuth = {
  mode: "required",
  roles: ["ADMIN", "SUPER_ADMIN"],
} as const;

const productReadErrors = [
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  "ACCOUNT_SUSPENDED",
  "EMAIL_NOT_VERIFIED",
  "ADMIN_APPROVAL_REQUIRED",
  "VALIDATION_FAILED",
  "RESOURCE_NOT_FOUND",
  "CONFLICT_STATE",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

const productWriteErrors = [...productReadErrors] as const;

export function productsRoutes(
  app: AnyElysia,
  options: ProductRoutesOptions = {}
) {
  return app
    .get(
      "/admin/products",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, query } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              query: {
                page?: number;
                pageSize?: number;
                status?: string;
                brandId?: string;
                categoryId?: string;
                search?: string;
                includeArchived?: boolean | string;
              };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.listProducts({
          actor: adminActor(requestContext.actor),
          requestId,
          query,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        query: tboxProductListQuery,
        detail: routeDetail({
          summary: "List products",
          description:
            "Lists admin catalog products with pagination (default 20, max 100) and optional filters for status, brand, category, search, and archive state.",
          tags: ["Products"],
          auth: productAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...productReadErrors],
        }),
        transform: rbacGuard(productAuth),
        response: {
          200: tboxApiSuccess(tboxProductListData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .post(
      "/admin/products",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, body } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              body: Record<string, unknown>;
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.createProduct({
          actor: adminActor(requestContext.actor),
          requestId,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        body: tboxCreateProductBody,
        detail: routeDetail({
          summary: "Create product",
          description:
            "Creates product identity in DRAFT status. Slug auto-generates from name when omitted and must be unique.",
          tags: ["Products"],
          auth: productAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...productWriteErrors],
        }),
        transform: rbacGuard(productAuth),
        response: {
          201: tboxApiSuccess(tboxProductData),
          ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
        },
      }
    )
    .get(
      "/admin/products/:productId",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { productId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.getProduct({
          actor: adminActor(requestContext.actor),
          requestId,
          productId: params.productId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxProductIdParams,
        detail: routeDetail({
          summary: "Get product detail",
          description: "Loads one product identity record for admin management.",
          tags: ["Products"],
          auth: productAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...productReadErrors],
        }),
        transform: rbacGuard(productAuth),
        response: {
          200: tboxApiSuccess(tboxProductData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .patch(
      "/admin/products/:productId",
      async (ctx) => {
        const {
          request,
          set,
          runtimeEnv,
          requestContext,
          requestId,
          params,
          body,
        } = ctx as typeof ctx &
          RequestContextDecorations & {
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
            params: { productId: string };
            body: Record<string, unknown>;
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.updateProduct({
          actor: adminActor(requestContext.actor),
          requestId,
          productId: params.productId,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxProductIdParams,
        body: tboxUpdateProductBody,
        detail: routeDetail({
          summary: "Update product identity",
          description:
            "Updates product identity fields (name, slug, summary, description) without changing publish/archive status.",
          tags: ["Products"],
          auth: productAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...productWriteErrors],
        }),
        transform: rbacGuard(productAuth),
        response: {
          200: tboxApiSuccess(tboxProductData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    );
}
