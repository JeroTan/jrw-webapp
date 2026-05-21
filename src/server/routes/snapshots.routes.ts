import { SnapshotBuilder } from "@/domain/snapshots/snapshot-builder";
import {
  tboxBuiltOrderSnapshotData,
  tboxOrderIdParams,
  tboxOrderSnapshotData,
  tboxOrderSnapshotListData,
  tboxSnapshotBuildBody,
  tboxSnapshotIdParams,
} from "@/lib/typebox/snapshots";
import { openApiErrorResponses, tboxApiSuccess } from "@/lib/typebox/api";
import {
  SnapshotController,
  type SnapshotServiceLike,
} from "@/server/controllers/SnapshotController";
import type {
  RequestActorContext,
  RequestContextDecorations,
} from "@/server/context/request-context";
import { rbacGuard } from "@/server/middleware/rbac";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createPhotoRepositories } from "@/server/repositories/PhotoRepository";
import { createProductRepositories } from "@/server/repositories/ProductRepository";
import { createSnapshotRepositories } from "@/server/repositories/SnapshotRepository";
import { createVariantRepositories } from "@/server/repositories/VariantRepository";
import { SnapshotService } from "@/server/services/SnapshotService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

export type SnapshotControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
};

export type SnapshotRoutesOptions = {
  controllerFactory?: (
    input: SnapshotControllerFactoryInput
  ) => SnapshotController;
};

function createRuntimeController(
  input: SnapshotControllerFactoryInput
): SnapshotController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const productRepositories = createProductRepositories(db as D1Database);
  const variantRepositories = createVariantRepositories(db as D1Database);
  const photoRepositories = createPhotoRepositories(db as D1Database);
  const snapshotRepositories = createSnapshotRepositories(db as D1Database);
  const builder = new SnapshotBuilder({
    productRepository: productRepositories.repository,
    variantRepository: variantRepositories.variantRepository,
    photoRepository: photoRepositories.photoRepository,
  });
  const service = new SnapshotService({
    builder,
    productRepository: productRepositories.repository,
    snapshotRepository: snapshotRepositories.snapshotRepository,
  });

  return new SnapshotController(service);
}

function getController(
  input: SnapshotControllerFactoryInput,
  options: SnapshotRoutesOptions
): SnapshotController {
  return options.controllerFactory?.(input) ?? createRuntimeController(input);
}

function adminActor(
  actor: RequestActorContext | undefined
): Parameters<SnapshotServiceLike["buildSnapshot"]>[0]["actor"] {
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

const snapshotAuth = {
  mode: "required",
  roles: ["ADMIN", "SUPER_ADMIN"],
} as const;

const snapshotErrors = [
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  "ACCOUNT_SUSPENDED",
  "EMAIL_NOT_VERIFIED",
  "ADMIN_APPROVAL_REQUIRED",
  "VALIDATION_FAILED",
  "RESOURCE_NOT_FOUND",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export function snapshotsRoutes(
  app: AnyElysia,
  options: SnapshotRoutesOptions = {}
) {
  return app
    .post(
      "/admin/snapshots/build",
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
        const result = await controller.buildSnapshot({
          actor: adminActor(requestContext.actor),
          requestId,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        body: tboxSnapshotBuildBody,
        detail: routeDetail({
          summary: "Build product snapshot",
          description:
            "Builds a purchase-time product snapshot for future order flows without exposing customer-facing write endpoints.",
          tags: ["Snapshots"],
          auth: snapshotAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...snapshotErrors],
        }),
        transform: rbacGuard(snapshotAuth),
        response: {
          200: tboxApiSuccess(tboxBuiltOrderSnapshotData),
          ...openApiErrorResponses([400, 401, 403, 404, 500, 503]),
        },
      }
    )
    .get(
      "/admin/snapshots/:snapshotId",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { snapshotId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.getSnapshot({
          actor: adminActor(requestContext.actor),
          requestId,
          snapshotId: params.snapshotId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxSnapshotIdParams,
        detail: routeDetail({
          summary: "Read product snapshot",
          description:
            "Reads a stored immutable product snapshot for admin order-history validation.",
          tags: ["Snapshots"],
          auth: snapshotAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...snapshotErrors],
        }),
        transform: rbacGuard(snapshotAuth),
        response: {
          200: tboxApiSuccess(tboxOrderSnapshotData),
          ...openApiErrorResponses([400, 401, 403, 404, 500, 503]),
        },
      }
    )
    .get(
      "/admin/orders/:orderId/snapshots",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { orderId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.listOrderSnapshots({
          actor: adminActor(requestContext.actor),
          requestId,
          orderId: params.orderId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxOrderIdParams,
        detail: routeDetail({
          summary: "List order snapshots",
          description:
            "Lists immutable product snapshots captured for one order.",
          tags: ["Snapshots"],
          auth: snapshotAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...snapshotErrors],
        }),
        transform: rbacGuard(snapshotAuth),
        response: {
          200: tboxApiSuccess(tboxOrderSnapshotListData),
          ...openApiErrorResponses([400, 401, 403, 404, 500, 503]),
        },
      }
    );
}
