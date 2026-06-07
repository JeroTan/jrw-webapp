import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import {
  tboxCategoryData,
  tboxCategoryIdParams,
  tboxCategoryListData,
  tboxCategoryListQuery,
  tboxCreateCategoryBody,
  tboxUpdateCategoryBody,
} from "@/domain/categories/schemas";
import {
  CategoryController,
  type CategoryServiceLike,
} from "@/server/controllers/CategoryController";
import type {
  RequestActorContext,
  RequestContextDecorations,
} from "@/server/context/request-context";
import { rbacGuard } from "@/server/middleware/rbac";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createCategoryRepositories } from "@/server/repositories/CategoryRepository";
import { CategoryService } from "@/server/services/CategoryService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

export type CategoryControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
};

export type CategoryRoutesOptions = {
  controllerFactory?: (
    input: CategoryControllerFactoryInput
  ) => CategoryController;
};

function createRuntimeController(
  input: CategoryControllerFactoryInput
): CategoryController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const repositories = createCategoryRepositories(db as D1Database);
  const service = new CategoryService({
    ...repositories,
  });

  return new CategoryController(service);
}

function getController(
  input: CategoryControllerFactoryInput,
  options: CategoryRoutesOptions
): CategoryController {
  return options.controllerFactory?.(input) ?? createRuntimeController(input);
}

function adminActor(
  actor: RequestActorContext | undefined
): Parameters<CategoryServiceLike["createCategory"]>[0]["actor"] {
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

const categoryAuth = {
  mode: "required",
  roles: ["ADMIN"],
} as const;

const categoryReadErrors = [
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

const categoryWriteErrors = [...categoryReadErrors] as const;

export function categoriesRoutes(
  app: AnyElysia,
  options: CategoryRoutesOptions = {}
) {
  return app
    .get(
      "/admin/categories",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, query } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              query: {
                page?: number;
                pageSize?: number;
                status?: string;
                isVisible?: boolean | string;
              };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.listCategories({
          actor: adminActor(requestContext.actor),
          requestId,
          query,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        query: tboxCategoryListQuery,
        detail: routeDetail({
          summary: "List categories",
          description:
            "Lists admin product categories with pagination and optional status/visibility filters.",
          tags: ["Categories"],
          auth: categoryAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...categoryReadErrors],
        }),
        transform: rbacGuard(categoryAuth),
        response: {
          200: tboxApiSuccess(tboxCategoryListData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .post(
      "/admin/categories",
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
        const result = await controller.createCategory({
          actor: adminActor(requestContext.actor),
          requestId,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        body: tboxCreateCategoryBody,
        detail: routeDetail({
          summary: "Create category",
          description:
            "Creates a product category for admin catalog organization. Slug auto-increments on conflicts.",
          tags: ["Categories"],
          auth: categoryAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...categoryWriteErrors],
        }),
        transform: rbacGuard(categoryAuth),
        response: {
          201: tboxApiSuccess(tboxCategoryData),
          ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
        },
      }
    )
    .get(
      "/admin/categories/:categoryId",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { categoryId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.getCategory({
          actor: adminActor(requestContext.actor),
          requestId,
          categoryId: params.categoryId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxCategoryIdParams,
        detail: routeDetail({
          summary: "Get category detail",
          description: "Loads one category, including archived records.",
          tags: ["Categories"],
          auth: categoryAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...categoryReadErrors],
        }),
        transform: rbacGuard(categoryAuth),
        response: {
          200: tboxApiSuccess(tboxCategoryData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .patch(
      "/admin/categories/:categoryId",
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
            params: { categoryId: string };
            body: Record<string, unknown>;
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.updateCategory({
          actor: adminActor(requestContext.actor),
          requestId,
          categoryId: params.categoryId,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxCategoryIdParams,
        body: tboxUpdateCategoryBody,
        detail: routeDetail({
          summary: "Update category",
          description:
            "Updates category name, slug, description, sort order, and visibility.",
          tags: ["Categories"],
          auth: categoryAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...categoryWriteErrors],
        }),
        transform: rbacGuard(categoryAuth),
        response: {
          200: tboxApiSuccess(tboxCategoryData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .delete(
      "/admin/categories/:categoryId",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { categoryId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.archiveCategory({
          actor: adminActor(requestContext.actor),
          requestId,
          categoryId: params.categoryId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxCategoryIdParams,
        detail: routeDetail({
          summary: "Archive category",
          description:
            "Soft-archives category while preserving linked product and order history references.",
          tags: ["Categories"],
          auth: categoryAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...categoryWriteErrors],
        }),
        transform: rbacGuard(categoryAuth),
        response: {
          200: tboxApiSuccess(tboxCategoryData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    );
}
