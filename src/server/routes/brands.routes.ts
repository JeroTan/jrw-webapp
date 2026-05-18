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

const tboxBrandMembershipData = t.Object({
  membership: tboxBrandInvitation,
});

const tboxBrandProduct = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.String(),
  brandId: t.Nullable(t.String()),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

const tboxBrandProductsListData = t.Object({
  items: t.Array(tboxBrandProduct),
  page: t.Number(),
  pageSize: t.Number(),
  totalItems: t.Number(),
  totalPages: t.Number(),
});

const tboxBrandMutationGuardData = t.Object({
  allowed: t.Literal(true),
  brandless: t.Boolean(),
  reassignment: t.Boolean(),
  productId: t.Nullable(t.String()),
  sourceBrandId: t.Nullable(t.String()),
  targetBrandId: t.Nullable(t.String()),
});

const tboxBrandListData = t.Object({
  items: t.Array(tboxBrand),
  page: t.Number(),
  pageSize: t.Number(),
  totalItems: t.Number(),
  totalPages: t.Number(),
});

const tboxBrandIdParams = t.Object(
  {
    id: t.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false }
);

const tboxBrandJoinAdminParams = t.Object(
  {
    id: t.String({ minLength: 1, maxLength: 128 }),
    adminId: t.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false }
);

const tboxBrandProductGuardParams = t.Object(
  {
    id: t.String({ minLength: 1, maxLength: 128 }),
    productId: t.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false }
);

const tboxBrandProductIdParams = t.Object(
  {
    productId: t.String({ minLength: 1, maxLength: 128 }),
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

const tboxBrandListQuery = t.Object(
  {
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
    status: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
  },
  { additionalProperties: false }
);

const tboxReassignGuardBody = t.Object(
  {
    targetBrandId: t.String({ minLength: 1, maxLength: 128 }),
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
const brandJoinErrors = [...brandUpdateErrors] as const;
const brandReadErrors = [
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
const brandMutationGuardErrors = [...brandReadErrors] as const;

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
      "/brands/:id/accept",
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
        const result = await controller.acceptBrandInvitation({
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
          summary: "Accept brand invitation",
          description:
            "Accepts pending invitation for current admin and activates brand membership.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...brandJoinErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandMembershipData),
          ...openApiErrorResponses([401, 403, 409, 500, 503]),
        },
      }
    )
    .post(
      "/brands/:id/join",
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
        const result = await controller.requestBrandJoin({
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
          summary: "Request brand join",
          description:
            "Creates pending brand join request for current admin when no active or pending membership exists.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...brandJoinErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          201: tboxApiSuccess(tboxBrandMembershipData),
          ...openApiErrorResponses([401, 403, 409, 500, 503]),
        },
      }
    )
    .post(
      "/brands/:id/join/:adminId/approve",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { id: string; adminId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.approveBrandJoinRequest({
          actor: adminActor(requestContext.actor),
          requestId,
          brandId: params.id,
          adminId: params.adminId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxBrandJoinAdminParams,
        detail: routeDetail({
          summary: "Approve brand join request",
          description:
            "Approves pending brand join request for target admin and activates membership.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...brandJoinErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandMembershipData),
          ...openApiErrorResponses([401, 403, 409, 500, 503]),
        },
      }
    )
    .post(
      "/brands/:id/join/:adminId/reject",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { id: string; adminId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.rejectBrandJoinRequest({
          actor: adminActor(requestContext.actor),
          requestId,
          brandId: params.id,
          adminId: params.adminId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxBrandJoinAdminParams,
        detail: routeDetail({
          summary: "Reject brand join request",
          description:
            "Rejects pending brand join request for target admin and revokes pending membership.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...brandJoinErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandMembershipData),
          ...openApiErrorResponses([401, 403, 409, 500, 503]),
        },
      }
    )
    .post(
      "/brands/:id/products/guard",
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
        const result = await controller.guardBrandProductCreate({
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
          summary: "Guard brand product create",
          description:
            "Checks brand membership and brand status before allowing create product flow in requested brand scope.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...brandMutationGuardErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandMutationGuardData),
          ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
        },
      }
    )
    .post(
      "/brands/:id/products/:productId/guard",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { id: string; productId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.guardBrandProductUpdate({
          actor: adminActor(requestContext.actor),
          requestId,
          brandId: params.id,
          productId: params.productId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxBrandProductGuardParams,
        detail: routeDetail({
          summary: "Guard brand product update",
          description:
            "Checks membership and product-brand association before allowing update flow in requested brand scope.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...brandMutationGuardErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandMutationGuardData),
          ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
        },
      }
    )
    .post(
      "/brands/products/:productId/reassign/guard",
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
        const result = await controller.guardBrandProductReassignment({
          actor: adminActor(requestContext.actor),
          requestId,
          productId: params.productId,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxBrandProductIdParams,
        body: tboxReassignGuardBody,
        detail: routeDetail({
          summary: "Guard brand product reassignment",
          description:
            "Checks source and target brand permissions before allowing product brand reassignment flow.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...brandMutationGuardErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandMutationGuardData),
          ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
        },
      }
    )
    .post(
      "/brands/products/brandless/guard",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.guardBrandlessProductMutation({
          actor: adminActor(requestContext.actor),
          requestId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        detail: routeDetail({
          summary: "Guard brandless product mutation",
          description:
            "Checks authenticated admin permission before allowing brandless product mutation flow.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...brandMutationGuardErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandMutationGuardData),
          ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
        },
      }
    )
    .get(
      "/brands/:id/products",
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
            params: { id: string };
            query: { page?: number; pageSize?: number; status?: string };
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.listBrandScopedProducts({
          actor: adminActor(requestContext.actor),
          requestId,
          brandId: params.id,
          query,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxBrandIdParams,
        query: tboxBrandListQuery,
        detail: routeDetail({
          summary: "List brand scoped products",
          description:
            "Lists products assigned to requested brand for authorized brand members and super admin.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...brandReadErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandProductsListData),
          ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
        },
      }
    )
    .get(
      "/brands/products/brandless",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, query } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              query: { page?: number; pageSize?: number; status?: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.listBrandlessProducts({
          actor: adminActor(requestContext.actor),
          requestId,
          query,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        query: tboxBrandListQuery,
        detail: routeDetail({
          summary: "List brandless products",
          description:
            "Lists products without brand assignment for authenticated catalog admins.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...brandReadErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandProductsListData),
          ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
        },
      }
    )
    .get(
      "/brands/me",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, query } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              query: { page?: number; pageSize?: number; status?: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.listAdminBrands({
          actor: adminActor(requestContext.actor),
          requestId,
          query,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        query: tboxBrandListQuery,
        detail: routeDetail({
          summary: "List my brands",
          description:
            "Lists brands where current admin has active membership in catalog collaboration.",
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...brandReadErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandListData),
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
