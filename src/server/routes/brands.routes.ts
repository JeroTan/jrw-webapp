import { t } from "elysia";
import { createAccountEmailNotifier } from "@/adapter/infrastructure/resend/CustomerVerificationEmailNotifier";
import {
  PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES,
  PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
} from "@/domain/products/schemas";
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
import { R2ImageRepository } from "@/server/repositories/ImageRepository";
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
  imageSrc: t.Optional(t.Nullable(t.String())),
  imageAlt: t.Optional(t.Nullable(t.String())),
  status: tboxBrandStatus,
  archivedAt: t.Nullable(t.String({ format: "date-time" })),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

const tboxBrandCreateData = t.Object({
  brand: tboxBrand,
});

const tboxBrandMembershipRole = t.Union([
  t.Literal("OWNER"),
  t.Literal("MEMBER"),
]);
const tboxBrandMembershipStatus = t.Union([
  t.Literal("ACTIVE"),
  t.Literal("PENDING"),
  t.Literal("REVOKED"),
]);

const tboxBrandInvitation = t.Object({
  id: t.String(),
  brandId: t.String(),
  adminId: t.String(),
  adminEmail: t.Optional(t.String()),
  role: tboxBrandMembershipRole,
  status: tboxBrandMembershipStatus,
  invitedByAdminId: t.Nullable(t.String()),
  invitedByLabel: t.Optional(t.String()),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

const tboxBrandInviteData = t.Object({
  invitation: tboxBrandInvitation,
});

const tboxBrandMembershipData = t.Object({
  membership: tboxBrandInvitation,
});

const tboxBrandMembershipListData = t.Object({
  items: t.Array(tboxBrandInvitation),
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

const tboxUploadBrandImageBody = t.Object(
  {
    image: t.File({
      type: [...PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES],
      maxSize: PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
      minSize: 1,
    }),
    name: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 255 }))),
  },
  { additionalProperties: false }
);

const tboxInviteBrandBody = t.Object(
  {
    adminId: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
    email: t.Optional(
      t.String({ format: "email", minLength: 3, maxLength: 254 })
    ),
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
  const storage = input.runtimeEnv?.STORAGE;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const imageRepository = storage
    ? new R2ImageRepository({
        bucket: storage as R2Bucket,
        publicBaseUrl:
          typeof input.runtimeEnv?.R2_PUBLIC_URL === "string"
            ? input.runtimeEnv.R2_PUBLIC_URL
            : undefined,
      })
    : undefined;
  const repositories = createBrandRepositories(db as D1Database);
  const service = new BrandService({
    ...repositories,
    imageRepository,
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
  roles: ["ADMIN"],
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

export function brandsRoutes(app: AnyElysia, options: BrandRoutesOptions = {}) {
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
          description: `Creates a brand as JRW catalog collaboration group and auto-creates OWNER membership for the creator.

**Path:** \`POST /brands\`

**Authentication:** Required — \`ADMIN\` role. Account must be active, email verified, and approved.

**Request Body:**
- \`name\` (string, required): Brand display name (2-120 characters).
- \`slug\` (string, optional): URL-safe brand identifier. Must be lowercase alphanumeric with hyphens only (pattern: \`^[a-z0-9]+(?:-[a-z0-9]+)*$\`). If omitted, auto-generated from name.
- \`description\` (string, optional): Brand description (max 500 characters).

**Response (201):**
- \`data.brand.id\` (string): The newly created brand UUID.
- \`data.brand.name\` (string): Brand display name.
- \`data.brand.slug\` (string): URL-safe brand identifier.
- \`data.brand.description\` (string or null): Brand description.
- \`data.brand.status\` (string): Brand status — \`ACTIVE\` or \`ARCHIVED\`.
- \`data.brand.archivedAt\` (string or null): ISO 8601 timestamp when brand was archived (null if active).
- \`data.brand.createdAt\` (string, ISO 8601): Brand creation timestamp.
- \`data.brand.updatedAt\` (string, ISO 8601): Brand last update timestamp.`,
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
          description: `Updates allowed brand fields for an active brand catalog collaboration group.

**Path:** \`PATCH /brands/:id\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand to update (1-128 characters).

**Authentication:** Required — \`ADMIN\` role. Caller must be a member of the brand.

**Request Body (at least one field required):**
- \`name\` (string, optional): New brand display name (2-120 characters).
- \`slug\` (string, optional): New URL-safe brand identifier. Must be lowercase alphanumeric with hyphens only.
- \`description\` (string or null, optional): New brand description (max 500 characters). Pass \`null\` to clear.

**Response (200):**
- \`data.brand.id\` (string): The updated brand UUID.
- \`data.brand.name\` (string): Updated brand display name.
- \`data.brand.slug\` (string): Updated URL-safe brand identifier.
- \`data.brand.description\` (string or null): Updated brand description.
- \`data.brand.status\` (string): Brand status — \`ACTIVE\` or \`ARCHIVED\`.
- \`data.brand.archivedAt\` (string or null): ISO 8601 timestamp when brand was archived.
- \`data.brand.createdAt\` (string, ISO 8601): Brand creation timestamp.
- \`data.brand.updatedAt\` (string, ISO 8601): Brand last update timestamp.`,
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
      "/brands/:id/image",
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
            body: { image: File; name?: string | null };
            params: { id: string };
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.uploadBrandImage({
          actor: adminActor(requestContext.actor),
          requestId,
          brandId: params.id,
          file: body.image,
          name: body.name,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxBrandIdParams,
        body: tboxUploadBrandImageBody,
        detail: routeDetail({
          summary: "Upload brand image",
          description: `Uploads JPEG, PNG, or WEBP image to R2 and saves it as optional brand image metadata.

**Path:** \`POST /brands/:id/image\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand to update (1-128 characters).

**Authentication:** Required — \`ADMIN\` role. Caller must be an active brand member.

**Request Body:** Multipart form data with \`image\` file and optional \`name\` alt text.

**Response (200):**
- \`data.brand.imageSrc\` (string or null): Public image URL.
- \`data.brand.imageAlt\` (string or null): Image alt text.`,
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...brandUpdateErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandCreateData),
          ...openApiErrorResponses([400, 401, 403, 409, 413, 415, 500, 503]),
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
          description: `Creates a pending brand membership invitation for an existing eligible admin account.

**Path:** \`POST /brands/:id/invite\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand to invite an admin to (1-128 characters).

**Authentication:** Required — \`ADMIN\` role. Caller must be an active brand member.

**Request Body (at least one field required):**
- \`adminId\` (string, optional): The UUID of the existing admin account to invite (1-128 characters). Either \`adminId\` or \`email\` must be provided.
- \`email\` (string, optional): The email address of the admin to invite. Must match an existing eligible admin account.

**Response (201):**
- \`data.invitation.id\` (string): The brand membership invitation UUID.
- \`data.invitation.brandId\` (string): The brand UUID this invitation is for.
- \`data.invitation.adminId\` (string): The invited admin account UUID.
- \`data.invitation.role\` (string): Membership role — \`OWNER\` or \`MEMBER\`.
- \`data.invitation.status\` (string): Invitation status — \`ACTIVE\`, \`PENDING\`, or \`REVOKED\`.
- \`data.invitation.invitedByAdminId\` (string or null): The admin UUID who sent this invitation.
- \`data.invitation.createdAt\` (string, ISO 8601): Invitation creation timestamp.
- \`data.invitation.updatedAt\` (string, ISO 8601): Invitation last update timestamp.`,
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
          description: `Accepts pending invitation for current admin and activates brand membership.

**Path:** \`POST /brands/:id/accept\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand whose invitation to accept (1-128 characters).

**Authentication:** Required — \`ADMIN\` role. The calling admin must have a pending invitation for this brand.

**Request:** No body required.

**Response (200):**
- \`data.membership.id\` (string): The brand membership UUID.
- \`data.membership.brandId\` (string): The brand UUID.
- \`data.membership.adminId\` (string): The admin account UUID.
- \`data.membership.role\` (string): Membership role — \`OWNER\` or \`MEMBER\`.
- \`data.membership.status\` (string): Updated membership status — now \`ACTIVE\`.
- \`data.membership.invitedByAdminId\` (string or null): The admin UUID who sent the original invitation.
- \`data.membership.createdAt\` (string, ISO 8601): Membership creation timestamp.
- \`data.membership.updatedAt\` (string, ISO 8601): Membership last update timestamp.`,
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
          description: `Creates pending brand join request for current admin when no active or pending membership exists.

**Path:** \`POST /brands/:id/join\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand to request joining (1-128 characters).

**Authentication:** Required — \`ADMIN\` role. Caller must NOT have an existing active or pending membership for this brand.

**Request:** No body required.

**Response (201):**
- \`data.membership.id\` (string): The brand membership/join request UUID.
- \`data.membership.brandId\` (string): The brand UUID.
- \`data.membership.adminId\` (string): The requesting admin account UUID.
- \`data.membership.role\` (string): Requested membership role — \`MEMBER\`.
- \`data.membership.status\` (string): Join request status — \`PENDING\` awaiting approval.
- \`data.membership.invitedByAdminId\` (string or null): Null for join requests (no inviter).
- \`data.membership.createdAt\` (string, ISO 8601): Join request creation timestamp.
- \`data.membership.updatedAt\` (string, ISO 8601): Join request last update timestamp.`,
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
          description: `Approves pending brand join request for target admin and activates membership.

**Path:** \`POST /brands/:id/join/:adminId/approve\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand (1-128 characters).
- \`adminId\` (string, required): The UUID of the admin whose join request to approve (1-128 characters).

**Authentication:** Required — \`ADMIN\` role. Caller must be an active brand member.

**Request:** No body required.

**Response (200):**
- \`data.membership.id\` (string): The brand membership UUID.
- \`data.membership.brandId\` (string): The brand UUID.
- \`data.membership.adminId\` (string): The approved admin account UUID.
- \`data.membership.role\` (string): Membership role — now \`MEMBER\`.
- \`data.membership.status\` (string): Updated membership status — now \`ACTIVE\`.
- \`data.membership.invitedByAdminId\` (string or null): Null for join requests.
- \`data.membership.createdAt\` (string, ISO 8601): Membership creation timestamp.
- \`data.membership.updatedAt\` (string, ISO 8601): Membership last update timestamp.`,
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
          description: `Rejects pending brand join request for target admin and revokes pending membership.

**Path:** \`POST /brands/:id/join/:adminId/reject\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand (1-128 characters).
- \`adminId\` (string, required): The UUID of the admin whose join request to reject (1-128 characters).

**Authentication:** Required — \`ADMIN\` role. Caller must be an active brand member.

**Request:** No body required.

**Response (200):**
- \`data.membership.id\` (string): The brand membership UUID.
- \`data.membership.brandId\` (string): The brand UUID.
- \`data.membership.adminId\` (string): The rejected admin account UUID.
- \`data.membership.role\` (string): Membership role.
- \`data.membership.status\` (string): Updated membership status — now \`REVOKED\`.
- \`data.membership.invitedByAdminId\` (string or null): Null for join requests.
- \`data.membership.createdAt\` (string, ISO 8601): Membership creation timestamp.
- \`data.membership.updatedAt\` (string, ISO 8601): Membership last update timestamp.`,
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
          description: `Checks brand membership and brand status before allowing create product flow in requested brand scope. Returns permission verdict without creating a product.

**Path:** \`POST /brands/:id/products/guard\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand scope to check product creation permission for (1-128 characters).

**Authentication:** Required — \`ADMIN\` role.

**Request:** No body required.

**Response (200):**
- \`data.allowed\` (boolean): Always \`true\` when the guard passes (caller has permission).
- \`data.brandless\` (boolean): Whether the product would be created without brand assignment.
- \`data.reassignment\` (boolean): Whether this is a product reassignment scenario.
- \`data.productId\` (string or null): Product UUID if applicable (null for new product creation).
- \`data.sourceBrandId\` (string or null): Source brand UUID for reassignment scenarios.
- \`data.targetBrandId\` (string or null): Target brand UUID — the \`id\` from the path parameter.`,
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
          description: `Checks membership and product-brand association before allowing update flow in requested brand scope. Returns permission verdict without modifying the product.

**Path:** \`POST /brands/:id/products/:productId/guard\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand scope to check product update permission for (1-128 characters).
- \`productId\` (string, required): The UUID of the product to check update permission for (1-128 characters).

**Authentication:** Required — \`ADMIN\` role. Caller must be a member of the brand.

**Request:** No body required.

**Response (200):**
- \`data.allowed\` (boolean): Always \`true\` when the guard passes (caller has permission).
- \`data.brandless\` (boolean): Whether the product is currently brandless.
- \`data.reassignment\` (boolean): Whether this involves a brand reassignment.
- \`data.productId\` (string or null): The product UUID from the path.
- \`data.sourceBrandId\` (string or null): The product's current brand UUID.
- \`data.targetBrandId\` (string or null): The target brand UUID from the path.`,
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
          description: `Checks source and target brand permissions before allowing product brand reassignment flow. Returns permission verdict without reassigning the product.

**Path:** \`POST /brands/products/:productId/reassign/guard\`

**Path Parameters:**
- \`productId\` (string, required): The UUID of the product to check reassignment permission for (1-128 characters).

**Authentication:** Required — \`ADMIN\` role.

**Request Body:**
- \`targetBrandId\` (string, required): The UUID of the brand to reassign the product to (1-128 characters).

**Response (200):**
- \`data.allowed\` (boolean): Always \`true\` when the guard passes (caller has permission).
- \`data.brandless\` (boolean): Whether the product is currently brandless.
- \`data.reassignment\` (boolean): Always \`true\` for this endpoint.
- \`data.productId\` (string or null): The product UUID from the path.
- \`data.sourceBrandId\` (string or null): The product's current brand UUID.
- \`data.targetBrandId\` (string or null): The target brand UUID from the request body.`,
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
          description: `Checks authenticated admin permission before allowing brandless product mutation flow. Returns permission verdict without creating or modifying a product.

**Path:** \`POST /brands/products/brandless/guard\`

**Authentication:** Required — \`ADMIN\` role.

**Request:** No body required.

**Response (200):**
- \`data.allowed\` (boolean): Always \`true\` when the guard passes (caller has permission).
- \`data.brandless\` (boolean): Always \`true\` for this endpoint (brandless product scope).
- \`data.reassignment\` (boolean): Whether this involves a brand reassignment.
- \`data.productId\` (string or null): Product UUID if applicable.
- \`data.sourceBrandId\` (string or null): Source brand UUID (null for brandless).
- \`data.targetBrandId\` (string or null): Target brand UUID (null for brandless).`,
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
          description: `Lists products assigned to requested brand for authorized brand members and super admin.

**Path:** \`GET /brands/:id/products\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand to list products for (1-128 characters).

**Query Parameters:**
- \`page\` (number, optional): Page number for pagination (default: 1, minimum: 1).
- \`pageSize\` (number, optional): Items per page (default: 20, min: 1, max: 100).
- \`status\` (string, optional): Filter by product status (1-64 characters).

**Authentication:** Required — \`ADMIN\` role. Caller must be a member of the brand.

**Response (200):**
- \`data.items\` (array): Array of product objects.
  - \`id\` (string): Product UUID.
  - \`name\` (string): Product name.
  - \`description\` (string): Product description.
  - \`brandId\` (string or null): The brand UUID this product belongs to.
  - \`createdAt\` (string, ISO 8601): Product creation timestamp.
  - \`updatedAt\` (string, ISO 8601): Product last update timestamp.
- \`data.page\` (number): Current page number.
- \`data.pageSize\` (number): Items per page.
- \`data.totalItems\` (number): Total number of products matching the filter.
- \`data.totalPages\` (number): Total number of pages.`,
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
          description: `Lists products without brand assignment for authenticated catalog admins.

**Path:** \`GET /brands/products/brandless\`

**Query Parameters:**
- \`page\` (number, optional): Page number for pagination (default: 1, minimum: 1).
- \`pageSize\` (number, optional): Items per page (default: 20, min: 1, max: 100).
- \`status\` (string, optional): Filter by product status (1-64 characters).

**Authentication:** Required — \`ADMIN\` role.

**Response (200):**
- \`data.items\` (array): Array of brandless product objects.
  - \`id\` (string): Product UUID.
  - \`name\` (string): Product name.
  - \`description\` (string): Product description.
  - \`brandId\` (string or null): Always \`null\` for brandless products.
  - \`createdAt\` (string, ISO 8601): Product creation timestamp.
  - \`updatedAt\` (string, ISO 8601): Product last update timestamp.
- \`data.page\` (number): Current page number.
- \`data.pageSize\` (number): Items per page.
- \`data.totalItems\` (number): Total number of brandless products.
- \`data.totalPages\` (number): Total number of pages.`,
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
          description: `Lists brands where current admin has active membership in catalog collaboration.

**Path:** \`GET /brands/me\`

**Query Parameters:**
- \`page\` (number, optional): Page number for pagination (default: 1, minimum: 1).
- \`pageSize\` (number, optional): Items per page (default: 20, min: 1, max: 100).
- \`status\` (string, optional): Filter by brand status — \`ACTIVE\` or \`ARCHIVED\` (1-64 characters).

**Authentication:** Required — \`ADMIN\` role.

**Response (200):**
- \`data.items\` (array): Array of brand objects where the caller is a member.
  - \`id\` (string): Brand UUID.
  - \`name\` (string): Brand display name.
  - \`slug\` (string): URL-safe brand identifier.
  - \`description\` (string or null): Brand description.
  - \`status\` (string): Brand status — \`ACTIVE\` or \`ARCHIVED\`.
  - \`archivedAt\` (string or null): ISO 8601 timestamp when brand was archived.
  - \`createdAt\` (string, ISO 8601): Brand creation timestamp.
  - \`updatedAt\` (string, ISO 8601): Brand last update timestamp.
- \`data.page\` (number): Current page number.
- \`data.pageSize\` (number): Items per page.
- \`data.totalItems\` (number): Total number of brands the caller is a member of.
- \`data.totalPages\` (number): Total number of pages.`,
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
    .get(
      "/brands/:id",
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
        const result = await controller.getBrandDetail({
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
          summary: "Get brand detail",
          description: `Returns one brand for an authorized brand member or elevated admin.

**Path:** \`GET /brands/:id\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand to load (1-128 characters).

**Authentication:** Required â€” \`ADMIN\` role. Caller must be an active brand member.

**Response (200):**
- \`data.brand.id\` (string): Brand UUID.
- \`data.brand.name\` (string): Brand display name.
- \`data.brand.slug\` (string): URL-safe brand identifier.
- \`data.brand.description\` (string or null): Brand description.
- \`data.brand.status\` (string): Brand status â€” \`ACTIVE\` or \`ARCHIVED\`.
- \`data.brand.archivedAt\` (string or null): ISO 8601 timestamp when brand was archived.
- \`data.brand.createdAt\` (string, ISO 8601): Brand creation timestamp.
- \`data.brand.updatedAt\` (string, ISO 8601): Brand last update timestamp.`,
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...brandReadErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandCreateData),
          ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
        },
      }
    )
    .get(
      "/brands/:id/members",
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
        const result = await controller.listBrandMembers({
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
          summary: "List brand members",
          description: `Lists member records for one brand, including active and pending states.

**Path:** \`GET /brands/:id/members\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand to inspect (1-128 characters).

**Authentication:** Required â€” \`ADMIN\` role. Caller must be an active brand member.

**Response (200):**
- \`data.items\` (array): Brand member records for this brand.
  - \`id\` (string): Membership UUID.
  - \`brandId\` (string): Brand UUID.
  - \`adminId\` (string): Admin UUID.
  - \`adminEmail\` (string, optional): Admin email when available.
  - \`role\` (string): Membership role â€” \`OWNER\` or \`MEMBER\`.
  - \`status\` (string): Membership status â€” \`ACTIVE\`, \`PENDING\`, or \`REVOKED\`.
  - \`invitedByAdminId\` (string or null): Admin UUID who sent invite, or null for self-requested membership.
  - \`invitedByLabel\` (string, optional): Email label for inviter when available.
  - \`createdAt\` (string, ISO 8601): Membership creation timestamp.
  - \`updatedAt\` (string, ISO 8601): Membership last update timestamp.`,
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...brandReadErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandMembershipListData),
          ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
        },
      }
    )
    .get(
      "/brands/:id/invites",
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
        const result = await controller.listBrandInvites({
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
          summary: "List brand invites",
          description: `Lists invite records sent for one brand.

**Path:** \`GET /brands/:id/invites\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand to inspect (1-128 characters).

**Authentication:** Required â€” \`ADMIN\` role. Caller must be an active brand member.

**Response (200):**
- \`data.items\` (array): Invite records for this brand with invitee and inviter details when available.`,
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...brandReadErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandMembershipListData),
          ...openApiErrorResponses([400, 401, 403, 409, 500, 503]),
        },
      }
    )
    .get(
      "/brands/:id/join-requests",
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
        const result = await controller.listBrandJoinRequests({
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
          summary: "List brand join requests",
          description: `Lists join requests sent for one brand.

**Path:** \`GET /brands/:id/join-requests\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand to inspect (1-128 characters).

**Authentication:** Required â€” \`ADMIN\` role. Caller must be an active brand member.

**Response (200):**
- \`data.items\` (array): Join request records for this brand with requester details when available.`,
          tags: ["Brands"],
          auth: brandCreateAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...brandReadErrors],
        }),
        transform: rbacGuard(brandCreateAuth),
        response: {
          200: tboxApiSuccess(tboxBrandMembershipListData),
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
          description: `Archives brand as irreversible MVP soft-delete while preserving historical references.

**Path:** \`POST /brands/:id/archive\`

**Path Parameters:**
- \`id\` (string, required): The UUID of the brand to archive (1-128 characters).

**Authentication:** Required — \`ADMIN\` role. Caller must be an active brand member.

**Request:** No body required.

**Response (200):**
- \`data.brand.id\` (string): The archived brand UUID.
- \`data.brand.name\` (string): Brand display name.
- \`data.brand.slug\` (string): URL-safe brand identifier.
- \`data.brand.description\` (string or null): Brand description.
- \`data.brand.status\` (string): Now \`ARCHIVED\`.
- \`data.brand.archivedAt\` (string, ISO 8601): Timestamp when brand was archived.
- \`data.brand.createdAt\` (string, ISO 8601): Brand creation timestamp.
- \`data.brand.updatedAt\` (string, ISO 8601): Brand last update timestamp.

**Warning:** Archiving is irreversible. Historical product references are preserved but the brand is removed from active catalogs.`,
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
