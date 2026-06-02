import {
  tboxArchiveProductVariantBody,
  tboxCreateProductVariantBody,
  tboxProductIdParams,
  tboxProductVariantData,
  tboxProductVariantListData,
  tboxProductVariantRouteParams,
  tboxUpdateProductVariantBody,
  tboxVariantListQuery,
} from "@/domain/products/schemas";
import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import {
  VariantController,
  type VariantServiceLike,
} from "@/server/controllers/VariantController";
import type {
  RequestActorContext,
  RequestContextDecorations,
} from "@/server/context/request-context";
import { rbacGuard } from "@/server/middleware/rbac";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createProductRepositories } from "@/server/repositories/ProductRepository";
import { createPhotoRepositories } from "@/server/repositories/PhotoRepository";
import { createVariantRepositories } from "@/server/repositories/VariantRepository";
import { VariantService } from "@/server/services/VariantService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

export type VariantControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
};

export type VariantRoutesOptions = {
  controllerFactory?: (
    input: VariantControllerFactoryInput
  ) => VariantController;
};

function createRuntimeController(
  input: VariantControllerFactoryInput
): VariantController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const productRepositories = createProductRepositories(db as D1Database);
  const photoRepositories = createPhotoRepositories(db as D1Database);
  const variantRepositories = createVariantRepositories(db as D1Database);
  const service = new VariantService({
    photoRepository: photoRepositories.photoRepository,
    productRepository: productRepositories.repository,
    variantRepository: variantRepositories.variantRepository,
  });

  return new VariantController(service);
}

function getController(
  input: VariantControllerFactoryInput,
  options: VariantRoutesOptions
): VariantController {
  return options.controllerFactory?.(input) ?? createRuntimeController(input);
}

function adminActor(
  actor: RequestActorContext | undefined
): Parameters<VariantServiceLike["createVariant"]>[0]["actor"] {
  return actor
    ? {
        authenticated: actor.authenticated,
        role: actor.role,
        actorId: actor.actorId,
        safeActorId: actor.safeActorId,
        accountStatus: actor.accountStatus,
        eligibility: actor.eligibility,
      }
    : undefined;
}

const variantAuth = {
  mode: "required",
  roles: ["ADMIN", "SUPER_ADMIN"],
} as const;

const variantReadErrors = [
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

const variantWriteErrors = [...variantReadErrors] as const;

export function variantsRoutes(
  app: AnyElysia,
  options: VariantRoutesOptions = {}
) {
  return app
    .get(
      "/admin/products/:productId/variants",
      async (ctx) => {
        const {
          request,
          set,
          runtimeEnv,
          requestContext,
          requestId,
          params,
          query,
        } = ctx as typeof ctx &
          RequestContextDecorations & {
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
            params: { productId: string };
            query: {
              page?: number;
              pageSize?: number;
            };
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.listProductVariants({
          actor: adminActor(requestContext.actor),
          requestId,
          productId: params.productId,
          query,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxProductIdParams,
        query: tboxVariantListQuery,
        detail: routeDetail({
          summary: "List product variants",
          description:
            "Lists variants for one product with status and price stored as integer centavos.",
          tags: ["Products"],
          auth: variantAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...variantReadErrors],
        }),
        transform: rbacGuard(variantAuth),
        response: {
          200: tboxApiSuccess(tboxProductVariantListData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .post(
      "/admin/products/:productId/variants",
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
        const result = await controller.createVariant({
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
        body: tboxCreateProductVariantBody,
        detail: routeDetail({
          summary: "Create product variant",
          description:
            "Creates one variant under product with unique SKU and unique option combination for that product.",
          tags: ["Products"],
          auth: variantAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...variantWriteErrors],
        }),
        transform: rbacGuard(variantAuth),
        response: {
          201: tboxApiSuccess(tboxProductVariantData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .get(
      "/admin/products/:productId/variants/:variantId",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { productId: string; variantId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.getVariant({
          actor: adminActor(requestContext.actor),
          requestId,
          productId: params.productId,
          variantId: params.variantId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxProductVariantRouteParams,
        detail: routeDetail({
          summary: "Get product variant",
          description:
            "Loads one variant detail for admin management, including price in integer centavos.",
          tags: ["Products"],
          auth: variantAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...variantReadErrors],
        }),
        transform: rbacGuard(variantAuth),
        response: {
          200: tboxApiSuccess(tboxProductVariantData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .patch(
      "/admin/products/:productId/variants/:variantId",
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
            params: { productId: string; variantId: string };
            body: Record<string, unknown>;
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.updateVariant({
          actor: adminActor(requestContext.actor),
          requestId,
          productId: params.productId,
          variantId: params.variantId,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxProductVariantRouteParams,
        body: tboxUpdateProductVariantBody,
        detail: routeDetail({
          summary: "Update product variant",
          description:
            "Updates variant option metadata, SKU, and centavos price under product scope.",
          tags: ["Products"],
          auth: variantAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...variantWriteErrors],
        }),
        transform: rbacGuard(variantAuth),
        response: {
          200: tboxApiSuccess(tboxProductVariantData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .post(
      "/admin/products/:productId/variants/:variantId/archive",
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
            params: { productId: string; variantId: string };
            body: Record<string, unknown>;
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.archiveVariant({
          actor: adminActor(requestContext.actor),
          requestId,
          productId: params.productId,
          variantId: params.variantId,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxProductVariantRouteParams,
        body: tboxArchiveProductVariantBody,
        detail: routeDetail({
          summary: "Archive product variant",
          description:
            "Archives variant with soft status transition while preserving historical references.",
          tags: ["Products"],
          auth: variantAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...variantWriteErrors],
        }),
        transform: rbacGuard(variantAuth),
        response: {
          200: tboxApiSuccess(tboxProductVariantData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    );
}
