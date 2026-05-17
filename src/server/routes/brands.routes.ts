import { t } from "elysia";
import { createAccountEmailNotifier } from "@/adapter/infrastructure/resend/CustomerVerificationEmailNotifier";
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
  archivedAt: t.Nullable(t.String({ format: "date-time" })),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

const tboxBrandCreateData = t.Object({
  brand: tboxBrand,
});

const tboxBrandMembershipRole = t.Union([t.Literal("OWNER"), t.Literal("MEMBER")]);
const tboxBrandMembershipStatus = t.Union([
  t.Literal("ACTIVE"),
  t.Literal("PENDING"),
  t.Literal("REVOKED"),
]);

const tboxBrandInvitation = t.Object({
  id: t.String(),
  brandId: t.String(),
  adminId: t.String(),
  role: tboxBrandMembershipRole,
  status: tboxBrandMembershipStatus,
  invitedByAdminId: t.Nullable(t.String()),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

const tboxBrandInviteData = t.Object({
  invitation: tboxBrandInvitation,
});

const tboxBrandIdParams = t.Object(
  {
    id: t.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false }
);

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

const tboxUpdateBrandBody = t.Object(
  {
    name: t.Optional(t.String({ minLength: 2, maxLength: 120 })),
    slug: t.Optional(
      t.String({
        minLength: 2,
        maxLength: 120,
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      })
    ),
    description: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
  },
  { additionalProperties: false, minProperties: 1 }
);

const tboxInviteBrandBody = t.Object(
  {
    adminId: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
    email: t.Optional(t.String({ format: "email", minLength: 3, maxLength: 254 })),
  },
  { additionalProperties: false, minProperties: 1 }
);

export type BrandControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
};

export type BrandRoutesOptions = {
  controllerFactory?: (input: BrandControllerFactoryInput) => BrandController;
};

function cleanBoolean(value: unknown): boolean {
  return typeof value === "string" && /^(1|true|yes|on)$/i.test(value.trim());
}

function brandInvitationEmailsEnabled(
  runtimeEnv: (Partial<Env> & Record<string, unknown>) | undefined
): boolean {
  return (
    cleanBoolean(runtimeEnv?.BRAND_INVITATION_EMAILS_ENABLED) ||
    cleanBoolean(runtimeEnv?.ACCOUNT_EMAILS_ENABLED)
  );
}

function brandInvitationActionUrl(
  runtimeEnv: (Partial<Env> & Record<string, unknown>) | undefined
): string | null {
  const value =
    runtimeEnv?.BRAND_INVITATION_ACTION_URL ??
    runtimeEnv?.ADMIN_ACTION_URL ??
    runtimeEnv?.ADMIN_APP_URL ??
    runtimeEnv?.APP_BASE_URL;

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

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
    accountEmails: createAccountEmailNotifier(input.runtimeEnv ?? {}, {
      requestUrl: input.request.url,
    }),
    invitationEmailsEnabled: brandInvitationEmailsEnabled(input.runtimeEnv),
    brandInvitationActionUrl: brandInvitationActionUrl(input.runtimeEnv),
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

const brandUpdateErrors = [
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

const brandArchiveErrors = [...brandUpdateErrors] as const;
const brandInviteErrors = [...brandUpdateErrors] as const;

export function brandsRoutes(
  app: AnyElysia,
  options: BrandRoutesOptions = {}
) {
  return app
    .post(
      "/brands",
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
    )
    .patch(
      "/brands/:id",
      async (ctx) => {
        const {
          request,
          set,
          runtimeEnv,
          requestContext,
          requestId,
          body,
          params,
        } = ctx as typeof ctx &
          RequestContextDecorations & {
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
            body: Record<string, unknown>;
            params: { id: string };
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.updateBrand({
          actor: adminActor(requestContext.actor),
          requestId,
          brandId: params.id,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxBrandIdParams,
        body: tboxUpdateBrandBody,
        detail: routeDetail({
          summary: "Update brand",
          description:
            "Updates allowed brand fields for an active brand catalog collaboration group.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...brandUpdateErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandCreateData),
          ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
        },
      }
    )
    .post(
      "/brands/:id/invite",
      async (ctx) => {
        const {
          request,
          set,
          runtimeEnv,
          requestContext,
          requestId,
          body,
          params,
        } = ctx as typeof ctx &
          RequestContextDecorations & {
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
            body: Record<string, unknown>;
            params: { id: string };
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.inviteAdminToBrand({
          actor: adminActor(requestContext.actor),
          requestId,
          brandId: params.id,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxBrandIdParams,
        body: tboxInviteBrandBody,
        detail: routeDetail({
          summary: "Invite brand admin",
          description:
            "Creates a pending brand membership invitation for an existing eligible admin account.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...brandInviteErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          201: tboxApiSuccess(tboxBrandInviteData),
          ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
        },
      }
    )
    .post(
      "/brands/:id/archive",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { id: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.archiveBrand({
          actor: adminActor(requestContext.actor),
          requestId,
          brandId: params.id,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxBrandIdParams,
        detail: routeDetail({
          summary: "Archive brand",
          description:
            "Archives brand as irreversible MVP soft-delete while preserving historical references.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...brandArchiveErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandCreateData),
          ...openApiErrorResponses([401, 403, 409, 500, 503]),
        },
      }
    );
}
