import {
  tboxInventoryAvailabilityData,
  tboxProductVariantData,
  tboxProductVariantRouteParams,
  tboxUpdateInventoryStateBody,
  tboxUpdateStockBody,
} from "@/domain/products/schemas";
import { openApiErrorResponses, tboxApiSuccess } from "@/lib/typebox/api";
import {
  InventoryController,
  type InventoryServiceLike,
} from "@/server/controllers/InventoryController";
import type {
  RequestActorContext,
  RequestContextDecorations,
} from "@/server/context/request-context";
import { rbacGuard } from "@/server/middleware/rbac";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createProductRepositories } from "@/server/repositories/ProductRepository";
import { createVariantRepositories } from "@/server/repositories/VariantRepository";
import { InventoryService } from "@/server/services/InventoryService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

export type InventoryControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
};

export type InventoryRoutesOptions = {
  controllerFactory?: (
    input: InventoryControllerFactoryInput
  ) => InventoryController;
};

function createRuntimeController(
  input: InventoryControllerFactoryInput
): InventoryController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const productRepositories = createProductRepositories(db as D1Database);
  const variantRepositories = createVariantRepositories(db as D1Database);
  const service = new InventoryService({
    productRepository: productRepositories.repository,
    variantRepository: variantRepositories.variantRepository,
  });

  return new InventoryController(service);
}

function getController(
  input: InventoryControllerFactoryInput,
  options: InventoryRoutesOptions
): InventoryController {
  return options.controllerFactory?.(input) ?? createRuntimeController(input);
}

function adminActor(
  actor: RequestActorContext | undefined
): Parameters<InventoryServiceLike["updateStockQuantity"]>[0]["actor"] {
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

const inventoryAuth = {
  mode: "required",
  roles: ["ADMIN"],
} as const;

const inventoryReadErrors = [
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  "VALIDATION_FAILED",
  "RESOURCE_NOT_FOUND",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

const inventoryWriteErrors = [
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

export function inventoryRoutes(
  app: AnyElysia,
  options: InventoryRoutesOptions = {}
) {
  return app
    .patch(
      "/admin/products/:productId/variants/:variantId/stock",
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
        const result = await controller.updateStockQuantity({
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
        body: tboxUpdateStockBody,
        detail: routeDetail({
          summary: "Update variant stock quantity",
          description:
            "Updates variant stock quantity and keeps inventory state consistent for public availability output.",
          tags: ["Products"],
          auth: inventoryAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...inventoryWriteErrors],
        }),
        transform: rbacGuard(inventoryAuth),
        response: {
          200: tboxApiSuccess(tboxProductVariantData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .patch(
      "/admin/products/:productId/variants/:variantId/inventory-state",
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
        const result = await controller.updateInventoryState({
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
        body: tboxUpdateInventoryStateBody,
        detail: routeDetail({
          summary: "Update variant inventory state",
          description:
            "Updates inventory state with consistency validation for stock quantity and preorder handling.",
          tags: ["Products"],
          auth: inventoryAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...inventoryWriteErrors],
        }),
        transform: rbacGuard(inventoryAuth),
        response: {
          200: tboxApiSuccess(tboxProductVariantData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .get(
      "/products/:productId/variants/:variantId/availability",
      async (ctx) => {
        const { request, set, runtimeEnv, requestId, params } =
          ctx as typeof ctx & {
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
            params: { productId: string; variantId: string };
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.getAvailability({
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
          summary: "Get variant availability",
          description:
            "Returns customer-safe availability label for one variant without exposing raw stock counts.",
          tags: ["Products"],
          rateLimitClass: "public-read",
          errorCodes: [...inventoryReadErrors],
        }),
        response: {
          200: tboxApiSuccess(tboxInventoryAvailabilityData),
          ...openApiErrorResponses([400, 404, 500, 503]),
        },
      }
    );
}
