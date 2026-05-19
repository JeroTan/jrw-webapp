import { t } from "elysia";
import { validatePasswordPepper } from "@/domain/auth/super-admin-seed";
import {
  OWNERSHIP_TRANSFER_CONFIRMATION_MAX_LENGTH,
  OWNERSHIP_TRANSFER_PASSWORD_MAX_LENGTH,
} from "@/domain/admins/ownership-transfer";
import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import {
  SESSION_COOKIE_NAME,
  applySessionCookieInstruction,
  type SessionCookieJar,
} from "@/server/auth/session-cookie";
import {
  OwnershipTransferController,
  type OwnershipTransferServiceLike,
} from "@/server/controllers/OwnershipTransferController";
import type {
  RequestActorContext,
  RequestContextDecorations,
} from "@/server/context/request-context";
import { rbacGuard } from "@/server/middleware/rbac";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createOwnershipTransferRepositories } from "@/server/repositories/OwnershipTransferRepository";
import { OwnershipTransferService } from "@/server/services/OwnershipTransferService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

const tboxAdminStatus = t.Union([
  t.Literal("ACTIVE"),
  t.Literal("INACTIVE"),
  t.Literal("SUSPENDED"),
]);

const tboxOwnershipRole = t.Union([
  t.Literal("ADMIN"),
  t.Literal("SUPER_ADMIN"),
]);

const tboxOwnershipCandidate = t.Object({
  id: t.String(),
  email: t.String({ format: "email" }),
  role: tboxOwnershipRole,
  status: tboxAdminStatus,
  isOwner: t.Boolean(),
  emailVerified: t.Boolean(),
  approved: t.Boolean(),
  dashboardEligible: t.Boolean(),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

const tboxOwnershipAccount = t.Object({
  id: t.String(),
  email: t.String({ format: "email" }),
  role: tboxOwnershipRole,
  status: tboxAdminStatus,
  isOwner: t.Boolean(),
  emailVerified: t.Boolean(),
  approved: t.Boolean(),
  updatedAt: t.String({ format: "date-time" }),
});

const tboxOwnershipCandidatesData = t.Object({
  candidates: t.Array(tboxOwnershipCandidate),
});

const tboxOwnershipTransferData = t.Object({
  previousOwner: tboxOwnershipAccount,
  newOwner: tboxOwnershipAccount,
  revokedSessionCount: t.Number({ minimum: 0 }),
  revokedActorIds: t.Array(t.String()),
  auditLogId: t.String(),
  sessionRefreshRequired: t.Boolean(),
});

const tboxOwnershipTransferBody = t.Object(
  {
    targetAdminId: t.String({ minLength: 1, maxLength: 128 }),
    confirmationPhrase: t.String({
      minLength: 1,
      maxLength: OWNERSHIP_TRANSFER_CONFIRMATION_MAX_LENGTH,
    }),
    password: t.String({
      minLength: 1,
      maxLength: OWNERSHIP_TRANSFER_PASSWORD_MAX_LENGTH,
    }),
  },
  { additionalProperties: false }
);

const tboxSessionCookie = t.Cookie({
  [SESSION_COOKIE_NAME]: t.Optional(t.String()),
});

export type OwnershipTransferControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
};

export type OwnerGovernanceRoutesOptions = {
  controllerFactory?: (
    input: OwnershipTransferControllerFactoryInput
  ) => OwnershipTransferController;
};

function getRuntimePasswordPepper(
  runtimeEnv: (Partial<Env> & Record<string, unknown>) | undefined
): string | undefined {
  const passwordPepper = runtimeEnv?.PASSWORD_PEPPER;

  if (typeof passwordPepper === "string") return passwordPepper;
  return undefined;
}

function createRuntimeController(
  input: OwnershipTransferControllerFactoryInput
): OwnershipTransferController {
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

  const repositories = createOwnershipTransferRepositories(db as D1Database);
  const service = new OwnershipTransferService({
    ...repositories,
    passwordPepper: pepper.pepper,
  });

  return new OwnershipTransferController(service);
}

function getController(
  input: OwnershipTransferControllerFactoryInput,
  options: OwnerGovernanceRoutesOptions
): OwnershipTransferController {
  return options.controllerFactory?.(input) ?? createRuntimeController(input);
}

function ownerActor(
  actor: RequestActorContext | undefined
): Parameters<OwnershipTransferServiceLike["listCandidates"]>[0]["actor"] {
  return actor
    ? {
        authenticated: actor.authenticated,
        role: actor.role,
        actorId: actor.actorId,
      }
    : undefined;
}

const ownerGovernanceAuth = {
  mode: "required",
  roles: ["SUPER_ADMIN"],
} as const;

const rbacEligibilityErrors = [
  "ACCOUNT_SUSPENDED",
  "EMAIL_NOT_VERIFIED",
  "ADMIN_APPROVAL_REQUIRED",
] as const;

const ownerGovernanceErrors = [
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  ...rbacEligibilityErrors,
  "VALIDATION_FAILED",
  "RESOURCE_NOT_FOUND",
  "CONFLICT_STATE",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export function ownerGovernanceRoutes(
  app: AnyElysia,
  options: OwnerGovernanceRoutesOptions = {}
) {
  return app
    .get(
      "/admin/owner/ownership-transfer/candidates",
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
        const result = await controller.listCandidates({
          actor: ownerActor(requestContext.actor),
          requestId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        detail: routeDetail({
          summary: "List ownership transfer candidates",
          description:
            `Returns eligible active approved verified Admin accounts for owner-only ownership transfer governance.

**Path:** \`GET /admin/owner/ownership-transfer/candidates\`

**Authentication:** Required — \`SUPER_ADMIN\` role only. Caller must be the current platform owner (\`isOwner: true\`).

**Request:** No body required.

**Response (200):**
- \`data.candidates\` (array): Array of eligible admin accounts that can receive ownership.
  - \`id\` (string): Admin account UUID.
  - \`email\` (string): Admin email address.
  - \`role\` (string): Admin role — \`ADMIN\` or \`SUPER_ADMIN\`.
  - \`status\` (string): Account status — must be \`ACTIVE\` to be eligible.
  - \`isOwner\` (boolean): Whether this account currently holds ownership (always false for candidates).
  - \`emailVerified\` (boolean): Whether the email has been verified.
  - \`approved\` (boolean): Whether the account has been approved.
  - \`dashboardEligible\` (boolean): Whether the account can access the admin dashboard.
  - \`createdAt\` (string, ISO 8601): Account creation timestamp.
  - \`updatedAt\` (string, ISO 8601): Account last update timestamp.

**Eligibility Criteria:** Candidates must be ACTIVE, email verified, approved, and not the current owner.`,
          tags: ["Owner Governance"],
          auth: ownerGovernanceAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...ownerGovernanceErrors],
        }),
        transform: rbacGuard(ownerGovernanceAuth),
        response: {
          200: tboxApiSuccess(tboxOwnershipCandidatesData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    )
    .post(
      "/admin/owner/ownership-transfer",
      async (ctx) => {
        const {
          request,
          set,
          cookie,
          runtimeEnv,
          requestContext,
          requestId,
          body,
        } = ctx as typeof ctx &
          RequestContextDecorations & {
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
            cookie: Record<
              string,
              { set: (config: Record<string, unknown>) => unknown }
            >;
            body: Record<string, unknown>;
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.submitTransfer({
          actor: ownerActor(requestContext.actor),
          requestId,
          body,
        });

        set.status = result.status;
        applySessionCookieInstruction(
          cookie as SessionCookieJar,
          request,
          result.cookie
        );

        return result.body as never;
      },
      {
        body: tboxOwnershipTransferBody,
        cookie: tboxSessionCookie,
        detail: routeDetail({
          summary: "Transfer platform ownership",
          description:
            `Transfers unique Super Admin ownership after exact confirmation phrase and current owner password re-entry.

**Path:** \`POST /admin/owner/ownership-transfer\`

**Authentication:** Required — \`SUPER_ADMIN\` role only. Caller must be the current platform owner (\`isOwner: true\`).

**Request Body:**
- \`targetAdminId\` (string, required): The UUID of the admin account to transfer ownership to (1-128 characters). Must be an eligible candidate from the candidates endpoint.
- \`confirmationPhrase\` (string, required): Exact confirmation phrase required to authorize the transfer. Must match the platform's expected phrase verbatim.
- \`password\` (string, required): Current owner's password to re-authenticate the transfer (1-128 characters).

**Response (200):**
- \`data.previousOwner.id\` (string): The previous owner's admin account UUID.
- \`data.previousOwner.email\` (string): Previous owner's email address.
- \`data.previousOwner.role\` (string): Previous owner's role — now demoted to \`ADMIN\`.
- \`data.previousOwner.status\` (string): Previous owner's account status.
- \`data.previousOwner.isOwner\` (boolean): Now \`false\`.
- \`data.previousOwner.emailVerified\` (boolean): Email verification status.
- \`data.previousOwner.approved\` (boolean): Approval status.
- \`data.previousOwner.updatedAt\` (string, ISO 8601): Last update timestamp.
- \`data.newOwner.id\` (string): The new owner's admin account UUID.
- \`data.newOwner.email\` (string): New owner's email address.
- \`data.newOwner.role\` (string): New owner's role — promoted to \`SUPER_ADMIN\`.
- \`data.newOwner.status\` (string): New owner's account status.
- \`data.newOwner.isOwner\` (boolean): Now \`true\`.
- \`data.newOwner.emailVerified\` (boolean): Email verification status.
- \`data.newOwner.approved\` (boolean): Approval status.
- \`data.newOwner.updatedAt\` (string, ISO 8601): Last update timestamp.
- \`data.revokedSessionCount\` (number): Number of active sessions revoked during the transfer.
- \`data.revokedActorIds\` (array of strings): List of admin account UUIDs whose sessions were revoked.
- \`data.auditLogId\` (string): The audit log entry UUID for this transfer event.
- \`data.sessionRefreshRequired\` (boolean): Whether the current session needs to be refreshed.

**Side Effects:**
- Transfers ownership from current owner to target admin.
- Revokes all active sessions for both previous and new owner.
- Creates an immutable audit log entry.
- Sets a new session cookie for the new owner.

**Warning:** This is a critical governance operation. The confirmation phrase and password must both be correct.`,
          tags: ["Owner Governance"],
          auth: ownerGovernanceAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...ownerGovernanceErrors],
        }),
        transform: rbacGuard(ownerGovernanceAuth),
        response: {
          200: tboxApiSuccess(tboxOwnershipTransferData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
      }
    );
}
