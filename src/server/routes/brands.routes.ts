import { t } from "elysia";
import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import {
  BrandController,
  type BrandServiceLike,
} from "@/server/controllers/BrandController";
import type {
  RequestActorContext,
  RequestContextDecorations,
} from "@/server/context/request-context";
import { rbacGuard } from "@/server/middleware/rbac";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createBrandRepositories } from "@/server/repositories/BrandRepository";
import { BrandService } from "@/server/services/BrandService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

const tboxBrandStatus = t.Union([t.Literal("ACTIVE"), t.Literal("ARCHIVED")]);

const tboxBrand = t.Object({
  id: t.String(),
  name: t.String({ minLength: 2, maxLength: 120 }),
  slug: t.String({ minLength: 2, maxLength: 120 }),
  description: t.Nullable(t.String({ maxLength: 500 })),
  status: tboxBrandStatus,
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

const tboxBrandCreateData = t.Object({
  brand: tboxBrand,
});

const tboxCreateBrandBody = t.Object(
  {
    name: t.String({ minLength: 2, maxLength: 120 }),
    slug: t.Optional(
      t.String({
        minLength: 2,
        maxLength: 120,
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      })
    ),
    description: t.Optional(t.String({ maxLength: 500 })),
  },
  { additionalProperties: false }
);

export type BrandControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
};

export type BrandRoutesOptions = {
  controllerFactory?: (input: BrandControllerFactoryInput) => BrandController;
};

function createRuntimeController(
  input: BrandControllerFactoryInput
): BrandController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const repositories = createBrandRepositories(db as D1Database);
  const service = new BrandService({
    ...repositories,
  });

  return new BrandController(service);
}

function getController(
  input: BrandControllerFactoryInput,
  options: BrandRoutesOptions
): BrandController {
  return options.controllerFactory?.(input) ?? createRuntimeController(input);
}

function adminActor(
  actor: RequestActorContext | undefined
): Parameters<BrandServiceLike["createBrand"]>[0]["actor"] {
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

const brandCreateAuth = {
  mode: "required",
  roles: ["ADMIN", "SUPER_ADMIN"],
} as const;

const brandCreateErrors = [
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  "ACCOUNT_SUSPENDED",
  "EMAIL_NOT_VERIFIED",
  "ADMIN_APPROVAL_REQUIRED",
  "VALIDATION_FAILED",
  "CONFLICT_STATE",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export function brandsRoutes(
  app: AnyElysia,
  options: BrandRoutesOptions = {}
) {
  return app.post(
    "/brands",
    async (ctx) => {
      const { request, set, runtimeEnv, requestContext, requestId, body } =
        ctx as typeof ctx &
          RequestContextDecorations & {
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
            body: Record<string, unknown>;
          };
      const controller = getController({ request, runtimeEnv, requestId }, options);
      const result = await controller.createBrand({
        actor: adminActor(requestContext.actor),
        requestId,
        body,
      });

      set.status = result.status;
      return result.body as never;
    },
    {
      body: tboxCreateBrandBody,
      detail: routeDetail({
        summary: "Create brand",
        description:
          "Creates a brand as JRW catalog collaboration group and auto-creates OWNER membership for the creator.",
        tags: ["Brands"],
        auth: brandCreateAuth,
        rateLimitClass: "admin-write",
        errorCodes: [...brandCreateErrors],
      }),
      transform: rbacGuard(brandCreateAuth),
      response: {
        201: tboxApiSuccess(tboxBrandCreateData),
        ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
      },
    }
  );
}
