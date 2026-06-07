import {
  tboxProductIdParams,
  tboxProductImageData,
  tboxProductImageListData,
  tboxProductImageRouteParams,
  tboxUpdateImageOrderBody,
  tboxUploadProductImageBody,
} from "@/domain/products/schemas";
import { openApiErrorResponses, tboxApiSuccess } from "@/lib/typebox/api";
import {
  ImageController,
  type ImageServiceLike,
} from "@/server/controllers/ImageController";
import type {
  RequestActorContext,
  RequestContextDecorations,
} from "@/server/context/request-context";
import { rbacGuard } from "@/server/middleware/rbac";
import { routeDetail } from "@/server/openapi/route-metadata";
import { R2ImageRepository } from "@/server/repositories/ImageRepository";
import { createPhotoRepositories } from "@/server/repositories/PhotoRepository";
import { createProductRepositories } from "@/server/repositories/ProductRepository";
import { ImageService } from "@/server/services/ImageService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

export type ImageControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
};

export type ImageRoutesOptions = {
  controllerFactory?: (input: ImageControllerFactoryInput) => ImageController;
};

function createRuntimeController(
  input: ImageControllerFactoryInput
): ImageController {
  const db = input.runtimeEnv?.DB;
  const storage = input.runtimeEnv?.STORAGE;

  if (!db || !storage) {
    throw new GeneralError(
      { reason: !db ? "missing_db_binding" : "missing_storage_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const imageRepository = new R2ImageRepository({
    bucket: storage as R2Bucket,
    publicBaseUrl:
      typeof input.runtimeEnv?.R2_PUBLIC_URL === "string"
        ? input.runtimeEnv.R2_PUBLIC_URL
        : undefined,
  });
  const productRepositories = createProductRepositories(db as D1Database);
  const photoRepositories = createPhotoRepositories(db as D1Database, {
    resolvePublicUrl: (key) => imageRepository.getPublicUrl(key),
  });
  const service = new ImageService({
    productRepository: productRepositories.repository,
    photoRepository: photoRepositories.photoRepository,
    imageRepository,
  });

  return new ImageController(service);
}

function getController(
  input: ImageControllerFactoryInput,
  options: ImageRoutesOptions
): ImageController {
  return options.controllerFactory?.(input) ?? createRuntimeController(input);
}

function adminActor(
  actor: RequestActorContext | undefined
): Parameters<ImageServiceLike["uploadImage"]>[0]["actor"] {
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

const imageAuth = {
  mode: "required",
  roles: ["ADMIN"],
} as const;

const imageReadErrors = [
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  "ACCOUNT_SUSPENDED",
  "EMAIL_NOT_VERIFIED",
  "ADMIN_APPROVAL_REQUIRED",
  "VALIDATION_FAILED",
  "RESOURCE_NOT_FOUND",
  "CONFLICT_STATE",
  "PROVIDER_UNAVAILABLE",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "INTERNAL_ERROR",
] as const;

const imageWriteErrors = [...imageReadErrors] as const;

export function imagesRoutes(app: AnyElysia, options: ImageRoutesOptions = {}) {
  return app
    .get(
      "/admin/products/:productId/images",
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
        const result = await controller.listProductImages({
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
          summary: "List product images",
          description:
            "Lists product images ordered for catalog display with safe metadata and R2-backed URLs.",
          tags: ["Products"],
          auth: imageAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...imageReadErrors],
        }),
        transform: rbacGuard(imageAuth),
        response: {
          200: tboxApiSuccess(tboxProductImageListData),
          ...openApiErrorResponses([
            400, 401, 403, 404, 409, 413, 415, 500, 503,
          ]),
        },
      }
    )
    .post(
      "/admin/products/:productId/images",
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
            body: { image: File; name?: string | null };
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.uploadImage({
          actor: adminActor(requestContext.actor),
          requestId,
          productId: params.productId,
          file: body.image,
          name: body.name,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxProductIdParams,
        body: tboxUploadProductImageBody,
        detail: routeDetail({
          summary: "Upload product image",
          description:
            "Uploads JPEG, PNG, or WEBP image to R2 and links it to product with stable photo reference.",
          tags: ["Products"],
          auth: imageAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...imageWriteErrors],
        }),
        transform: rbacGuard(imageAuth),
        response: {
          201: tboxApiSuccess(tboxProductImageData),
          ...openApiErrorResponses([
            400, 401, 403, 404, 409, 413, 415, 500, 503,
          ]),
        },
      }
    )
    .patch(
      "/admin/products/:productId/images/:photoId/order",
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
            params: { productId: string; photoId: string };
            body: Record<string, unknown>;
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.updateImageOrder({
          actor: adminActor(requestContext.actor),
          requestId,
          productId: params.productId,
          photoId: params.photoId,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxProductImageRouteParams,
        body: tboxUpdateImageOrderBody,
        detail: routeDetail({
          summary: "Update product image order",
          description:
            "Updates one image sort order within product image list while keeping stable historical image references.",
          tags: ["Products"],
          auth: imageAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...imageWriteErrors],
        }),
        transform: rbacGuard(imageAuth),
        response: {
          200: tboxApiSuccess(tboxProductImageData),
          ...openApiErrorResponses([
            400, 401, 403, 404, 409, 413, 415, 500, 503,
          ]),
        },
      }
    )
    .patch(
      "/admin/products/:productId/images/:photoId/primary",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { productId: string; photoId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.setPrimaryImage({
          actor: adminActor(requestContext.actor),
          requestId,
          productId: params.productId,
          photoId: params.photoId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxProductImageRouteParams,
        detail: routeDetail({
          summary: "Set primary product image",
          description:
            "Sets selected image as primary catalog image for product while preserving all existing image references.",
          tags: ["Products"],
          auth: imageAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...imageWriteErrors],
        }),
        transform: rbacGuard(imageAuth),
        response: {
          200: tboxApiSuccess(tboxProductImageData),
          ...openApiErrorResponses([
            400, 401, 403, 404, 409, 413, 415, 500, 503,
          ]),
        },
      }
    )
    .delete(
      "/admin/products/:productId/images/:photoId",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { productId: string; photoId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.removeImage({
          actor: adminActor(requestContext.actor),
          requestId,
          productId: params.productId,
          photoId: params.photoId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxProductImageRouteParams,
        detail: routeDetail({
          summary: "Remove product image from catalog",
          description:
            "Soft-removes image association from current product catalog while preserving historical snapshot references.",
          tags: ["Products"],
          auth: imageAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...imageWriteErrors],
        }),
        transform: rbacGuard(imageAuth),
        response: {
          200: tboxApiSuccess(tboxProductImageData),
          ...openApiErrorResponses([
            400, 401, 403, 404, 409, 413, 415, 500, 503,
          ]),
        },
      }
    );
}
