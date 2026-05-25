import { t } from "elysia";
import type { OperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import { createAccountEmailNotifier } from "@/adapter/infrastructure/resend/CustomerVerificationEmailNotifier";
import { validatePasswordPepper } from "@/domain/auth/super-admin-seed";
import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import {
  AdminAccountController,
  type AdminAccountServiceLike,
} from "@/server/controllers/AdminAccountController";
import type {
  RequestActorContext,
  RequestContextDecorations,
} from "@/server/context/request-context";
import { rbacGuard } from "@/server/middleware/rbac";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createAdminAccountRepositories } from "@/server/repositories/AdminAccountRepository";
import { AdminAccountService } from "@/server/services/AdminAccountService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

const tboxNullableString = t.Nullable(t.String());
const tboxAdminStatus = t.Union([
  t.Literal("ACTIVE"),
  t.Literal("INACTIVE"),
  t.Literal("SUSPENDED"),
]);

const tboxAdminAccount = t.Object({
  id: t.String(),
  email: t.String({ format: "email" }),
  role: t.Union([t.Literal("ADMIN"), t.Literal("SUPER_ADMIN")]),
  status: tboxAdminStatus,
  isOwner: t.Boolean(),
  emailVerified: t.Boolean(),
  approved: t.Boolean(),
  dashboardEligible: t.Boolean(),
  suspensionReason: tboxNullableString,
  rejectionReason: tboxNullableString,
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

const tboxAdminAccountListData = t.Object({
  admins: t.Array(tboxAdminAccount),
});

const tboxAdminAccountData = t.Object({
  admin: tboxAdminAccount,
});

const tboxCreateAdminAccountData = t.Object({
  admin: tboxAdminAccount,
  invitationEmail: t.Object({
    sent: t.Boolean(),
  }),
});

const tboxCreateAdminAccountBody = t.Object(
  {
    email: t.String({ format: "email", minLength: 3, maxLength: 254 }),
    password: t.String({ minLength: 8, maxLength: 1024 }),
    sendInvitationEmail: t.Optional(t.Boolean()),
  },
  { additionalProperties: false }
);

const tboxUpdateAdminAccountBody = t.Object(
  {
    email: t.Optional(
      t.String({ format: "email", minLength: 3, maxLength: 254 })
    ),
  },
  { additionalProperties: false }
);

const tboxApprovalBody = t.Object(
  {
    action: t.Union([t.Literal("approve"), t.Literal("reject")]),
    reason: t.Optional(t.String({ minLength: 1, maxLength: 240 })),
    sendRejectionEmail: t.Optional(t.Boolean()),
  },
  { additionalProperties: false }
);

const tboxSuspensionBody = t.Object(
  {
    reason: t.Optional(t.String({ minLength: 1, maxLength: 240 })),
  },
  { additionalProperties: false }
);

const tboxAdminAccountParams = t.Object({
  adminAccountId: t.String({ minLength: 1, maxLength: 128 }),
});

export type AdminAccountControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
};

export type AdminAccountRoutesOptions = {
  controllerFactory?: (
    input: AdminAccountControllerFactoryInput
  ) => AdminAccountController;
  operationalLogger?: OperationalLogger;
};

function getRuntimePasswordPepper(
  runtimeEnv: (Partial<Env> & Record<string, unknown>) | undefined
): string | undefined {
  const passwordPepper = runtimeEnv?.PASSWORD_PEPPER;

  if (typeof passwordPepper === "string") return passwordPepper;
  return undefined;
}

function cleanBoolean(value: unknown): boolean {
  return typeof value === "string" && /^(1|true|yes|on)$/i.test(value.trim());
}

function lifecycleEmailsEnabled(
  runtimeEnv: (Partial<Env> & Record<string, unknown>) | undefined
): boolean {
  return (
    cleanBoolean(runtimeEnv?.ADMIN_LIFECYCLE_EMAILS_ENABLED) ||
    cleanBoolean(runtimeEnv?.ACCOUNT_EMAILS_ENABLED)
  );
}

function adminActionUrl(
  runtimeEnv: (Partial<Env> & Record<string, unknown>) | undefined
): string | null {
  const value =
    runtimeEnv?.ADMIN_ACTION_URL ??
    runtimeEnv?.ADMIN_APP_URL ??
    runtimeEnv?.APP_BASE_URL;

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function createRuntimeController(
  input: AdminAccountControllerFactoryInput,
  _options: AdminAccountRoutesOptions
): AdminAccountController {
  const db = input.runtimeEnv?.DB;
  const pepper = validatePasswordPepper(
    getRuntimePasswordPepper(input.runtimeEnv)
  );

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  if (!pepper.ok) {
    throw new GeneralError(
      { reason: "invalid_password_pepper" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const repositories = createAdminAccountRepositories(db as D1Database);
  const service = new AdminAccountService({
    ...repositories,
    passwordPepper: pepper.pepper,
    accountEmails: createAccountEmailNotifier(input.runtimeEnv ?? {}, {
      requestUrl: input.request.url,
    }),
    lifecycleEmailsEnabled: lifecycleEmailsEnabled(input.runtimeEnv),
    adminActionUrl: adminActionUrl(input.runtimeEnv),
  });

  return new AdminAccountController(service);
}

function getController(
  input: AdminAccountControllerFactoryInput,
  options: AdminAccountRoutesOptions
): AdminAccountController {
  return (
    options.controllerFactory?.(input) ??
    createRuntimeController(input, options)
  );
}

function adminActor(
  actor: RequestActorContext | undefined
): Parameters<AdminAccountServiceLike["listAdminAccounts"]>[0]["actor"] {
  return actor
    ? {
        authenticated: actor.authenticated,
        role: actor.role,
        actorId: actor.actorId,
      }
    : undefined;
}

const adminAccountAuth = {
  mode: "required",
  roles: ["SUPER_ADMIN"],
} as const;

const rbacEligibilityErrors = [
  "ACCOUNT_SUSPENDED",
  "EMAIL_NOT_VERIFIED",
  "ADMIN_APPROVAL_REQUIRED",
] as const;

const adminErrors = [
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  ...rbacEligibilityErrors,
  "RESOURCE_NOT_FOUND",
  "INTERNAL_ERROR",
] as const;

const adminWriteErrors = [
  "VALIDATION_FAILED",
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  ...rbacEligibilityErrors,
  "RESOURCE_NOT_FOUND",
  "CONFLICT_STATE",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export function adminAccountRoutes(
  app: AnyElysia,
  options: AdminAccountRoutesOptions = {}
) {
  return app
    .get(
      "/admin-accounts",
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
        const result = await controller.listAdminAccounts({
          actor: adminActor(requestContext.actor),
          requestId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        detail: routeDetail({
          summary: "List Admin accounts",
          description:
            `Returns safe Admin account summaries for Super Admin governance.

**Path:** \`GET /admin-accounts\`

**Authentication:** Required — \`SUPER_ADMIN\` role only. Account must be active, email verified, and approved.

**Request:** No body required.

**Response (200):**
- \`data.admins\` (array): Array of admin account objects.
  - \`id\` (string): Admin account UUID.
  - \`email\` (string): Admin email address.
  - \`role\` (string): Admin role — \`ADMIN\` or \`SUPER_ADMIN\`.
  - \`status\` (string): Account status — \`ACTIVE\`, \`INACTIVE\`, or \`SUSPENDED\`.
  - \`isOwner\` (boolean): Whether this account holds platform ownership (only one can be true).
  - \`emailVerified\` (boolean): Whether the email has been verified.
  - \`approved\` (boolean): Whether the account has been approved.
  - \`dashboardEligible\` (boolean): Whether the account can access the admin dashboard.
  - \`suspensionReason\` (string or null): Reason for suspension if applicable.
  - \`rejectionReason\` (string or null): Reason for rejection if applicable.
  - \`createdAt\` (string, ISO 8601): Account creation timestamp.
  - \`updatedAt\` (string, ISO 8601): Account last update timestamp.`,
          tags: ["Admin Accounts"],
          auth: adminAccountAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...adminErrors],
        }),
        transform: rbacGuard(adminAccountAuth),
        response: {
          200: tboxApiSuccess(tboxAdminAccountListData),
          ...openApiErrorResponses([401, 403, 404, 500]),
        },
      }
    )
    .post(
      "/admin-accounts",
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
        const result = await controller.createAdminAccount({
          actor: adminActor(requestContext.actor),
          requestId,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        body: tboxCreateAdminAccountBody,
        detail: routeDetail({
          summary: "Create Admin account",
          description:
            `Creates a non-owner ADMIN account and optionally sends an invitation/setup notice through the account email boundary.

**Path:** \`POST /admin-accounts\`

**Authentication:** Required — \`SUPER_ADMIN\` role only.

**Request Body:**
- \`email\` (string, required): New admin email address (3-254 characters, valid email format).
- \`password\` (string, required): Initial password for the admin account (8-1024 characters).
- \`sendInvitationEmail\` (boolean, optional): Whether to send an invitation/setup email to the new admin (default: false).

**Response (201):**
- \`data.admin.id\` (string): The newly created admin account UUID.
- \`data.admin.email\` (string): Admin email address.
- \`data.admin.role\` (string): Always \`ADMIN\` (cannot create SUPER_ADMIN via this endpoint).
- \`data.admin.status\` (string): Initial account status — \`INACTIVE\` until approved.
- \`data.admin.isOwner\` (boolean): Always \`false\` (ownership cannot be transferred via this endpoint).
- \`data.admin.emailVerified\` (boolean): Whether the email has been verified.
- \`data.admin.approved\` (boolean): Whether the account has been approved.
- \`data.admin.dashboardEligible\` (boolean): Whether the account can access the admin dashboard.
- \`data.admin.suspensionReason\` (string or null): Null on creation.
- \`data.admin.rejectionReason\` (string or null): Null on creation.
- \`data.admin.createdAt\` (string, ISO 8601): Account creation timestamp.
- \`data.admin.updatedAt\` (string, ISO 8601): Account last update timestamp.
- \`data.invitationEmail.sent\` (boolean): Whether the invitation email was successfully sent.`,
          tags: ["Admin Accounts"],
          auth: adminAccountAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...adminWriteErrors],
        }),
        transform: rbacGuard(adminAccountAuth),
        response: {
          201: tboxApiSuccess(tboxCreateAdminAccountData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .get(
      "/admin-accounts/:adminAccountId",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { adminAccountId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.getAdminAccount({
          actor: adminActor(requestContext.actor),
          requestId,
          adminAccountId: params.adminAccountId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxAdminAccountParams,
        detail: routeDetail({
          summary: "Get Admin account",
          description:
            `Returns one safe Admin account summary for Super Admin governance.

**Path:** \`GET /admin-accounts/:adminAccountId\`

**Path Parameters:**
- \`adminAccountId\` (string, required): The UUID of the admin account to retrieve (1-128 characters).

**Authentication:** Required — \`SUPER_ADMIN\` role only.

**Request:** No body required.

**Response (200):**
- \`data.admin.id\` (string): Admin account UUID.
- \`data.admin.email\` (string): Admin email address.
- \`data.admin.role\` (string): Admin role — \`ADMIN\` or \`SUPER_ADMIN\`.
- \`data.admin.status\` (string): Account status — \`ACTIVE\`, \`INACTIVE\`, or \`SUSPENDED\`.
- \`data.admin.isOwner\` (boolean): Whether this account holds platform ownership.
- \`data.admin.emailVerified\` (boolean): Whether the email has been verified.
- \`data.admin.approved\` (boolean): Whether the account has been approved.
- \`data.admin.dashboardEligible\` (boolean): Whether the account can access the admin dashboard.
- \`data.admin.suspensionReason\` (string or null): Reason for suspension if applicable.
- \`data.admin.rejectionReason\` (string or null): Reason for rejection if applicable.
- \`data.admin.createdAt\` (string, ISO 8601): Account creation timestamp.
- \`data.admin.updatedAt\` (string, ISO 8601): Account last update timestamp.`,
          tags: ["Admin Accounts"],
          auth: adminAccountAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...adminErrors],
        }),
        transform: rbacGuard(adminAccountAuth),
        response: {
          200: tboxApiSuccess(tboxAdminAccountData),
          ...openApiErrorResponses([401, 403, 404, 500]),
        },
      }
    )
    .patch(
      "/admin-accounts/:adminAccountId",
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
            params: { adminAccountId: string };
            body: Record<string, unknown>;
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.updateAdminAccount({
          actor: adminActor(requestContext.actor),
          requestId,
          adminAccountId: params.adminAccountId,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxAdminAccountParams,
        body: tboxUpdateAdminAccountBody,
        detail: routeDetail({
          summary: "Update Admin account",
          description:
            `Updates editable safe Admin account fields. Role and ownership mutation are intentionally excluded.

**Path:** \`PATCH /admin-accounts/:adminAccountId\`

**Path Parameters:**
- \`adminAccountId\` (string, required): The UUID of the admin account to update (1-128 characters).

**Authentication:** Required — \`SUPER_ADMIN\` role only.

**Request Body (at least one field required):**
- \`email\` (string, optional): New email address for the admin account (3-254 characters, valid email format).

**Response (200):** Returns the updated admin account object with all fields (same schema as GET /admin-accounts/:adminAccountId).

**Note:** Role changes, ownership transfers, and password resets must use dedicated endpoints. This endpoint only allows email updates.`,
          tags: ["Admin Accounts"],
          auth: adminAccountAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...adminWriteErrors],
        }),
        transform: rbacGuard(adminAccountAuth),
        response: {
          200: tboxApiSuccess(tboxAdminAccountData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .post(
      "/admin-accounts/:adminAccountId/approvals",
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
            params: { adminAccountId: string };
            body: Record<string, unknown>;
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.decideAdminApproval({
          actor: adminActor(requestContext.actor),
          requestId,
          adminAccountId: params.adminAccountId,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxAdminAccountParams,
        body: tboxApprovalBody,
        detail: routeDetail({
          summary: "Approve or reject Admin account",
          description:
            `Approves or rejects a pending Admin account while preserving owner invariants.

**Path:** \`POST /admin-accounts/:adminAccountId/approvals\`

**Path Parameters:**
- \`adminAccountId\` (string, required): The UUID of the admin account to approve or reject (1-128 characters).

**Authentication:** Required — \`SUPER_ADMIN\` role only.

**Request Body:**
- \`action\` (string, required): The approval decision — \`approve\` or \`reject\`.
- \`reason\` (string, optional): Reason for rejection (1-240 characters). Required when action is \`reject\`, ignored for \`approve\`.
- \`sendRejectionEmail\` (boolean, optional): Whether to send a rejection notification email to the admin (default: false).

**Response (200):** Returns the updated admin account object with all fields.

**Behavior:**
- \`approve\`: Sets \`approved: true\`, making the account eligible for dashboard access (if email verified and active).
- \`reject\`: Sets \`approved: false\` and records the rejection reason. Account cannot sign in.`,
          tags: ["Admin Accounts"],
          auth: adminAccountAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...adminWriteErrors],
        }),
        transform: rbacGuard(adminAccountAuth),
        response: {
          200: tboxApiSuccess(tboxAdminAccountData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .post(
      "/admin-accounts/:adminAccountId/suspensions",
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
            params: { adminAccountId: string };
            body: Record<string, unknown>;
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.suspendAdminAccount({
          actor: adminActor(requestContext.actor),
          requestId,
          adminAccountId: params.adminAccountId,
          body,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxAdminAccountParams,
        body: tboxSuspensionBody,
        detail: routeDetail({
          summary: "Suspend Admin account",
          description:
            `Suspends a non-owner Admin account and revokes active dashboard-capable sessions.

**Path:** \`POST /admin-accounts/:adminAccountId/suspensions\`

**Path Parameters:**
- \`adminAccountId\` (string, required): The UUID of the admin account to suspend (1-128 characters).

**Authentication:** Required — \`SUPER_ADMIN\` role only.

**Request Body:**
- \`reason\` (string, optional): Reason for suspension (1-240 characters).

**Response (200):** Returns the updated admin account object with all fields.

**Behavior:**
- Sets account status to \`SUSPENDED\`.
- Records the suspension reason.
- Revokes all active dashboard-capable sessions for the suspended admin.
- Cannot suspend the platform owner account (returns 409 CONFLICT_STATE).`,
          tags: ["Admin Accounts"],
          auth: adminAccountAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...adminWriteErrors],
        }),
        transform: rbacGuard(adminAccountAuth),
        response: {
          200: tboxApiSuccess(tboxAdminAccountData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .delete(
      "/admin-accounts/:adminAccountId/suspensions",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              params: { adminAccountId: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.reactivateAdminAccount({
          actor: adminActor(requestContext.actor),
          requestId,
          adminAccountId: params.adminAccountId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        params: tboxAdminAccountParams,
        detail: routeDetail({
          summary: "Reactivate Admin account",
          description:
            `Reactivates a suspended or inactive non-owner Admin without changing role or ownership.

**Path:** \`DELETE /admin-accounts/:adminAccountId/suspensions\`

**Path Parameters:**
- \`adminAccountId\` (string, required): The UUID of the admin account to reactivate (1-128 characters).

**Authentication:** Required — \`SUPER_ADMIN\` role only.

**Request:** No body required.

**Response (200):** Returns the updated admin account object with all fields.

**Behavior:**
- Sets account status to \`ACTIVE\` (from \`SUSPENDED\` or \`INACTIVE\`).
- Clears the suspension reason.
- Does NOT change role, ownership, or approval status.
- Cannot reactivate the platform owner through this endpoint (returns 409 CONFLICT_STATE).`,
          tags: ["Admin Accounts"],
          auth: adminAccountAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...adminWriteErrors],
        }),
        transform: rbacGuard(adminAccountAuth),
        response: {
          200: tboxApiSuccess(tboxAdminAccountData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    );
}
