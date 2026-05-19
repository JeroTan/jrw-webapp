import { t } from "elysia";
import type { OperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import type { RecoveryActorKind } from "@/domain/auth/account-recovery";
import { createAccountEmailNotifier } from "@/adapter/infrastructure/resend/CustomerVerificationEmailNotifier";
import { validatePasswordPepper } from "@/domain/auth/super-admin-seed";
import { hashSessionToken } from "@/lib/crypto/session-token";
import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import {
  AccountRecoveryController,
  type AccountRecoveryServiceLike,
} from "@/server/controllers/AccountRecoveryController";
import type { RequestContextDecorations } from "@/server/context/request-context";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createAdminAccountRecoveryRepositories } from "@/server/repositories/AdminAccountRecoveryRepository";
import { createCustomerAccountRecoveryRepositories } from "@/server/repositories/CustomerAccountRecoveryRepository";
import { AccountRecoveryService } from "@/server/services/AccountRecoveryService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

const tboxRecoveryEmailBody = t.Object(
  {
    email: t.String({ format: "email", minLength: 3, maxLength: 254 }),
  },
  { additionalProperties: false }
);

const tboxPasswordResetConfirmationBody = t.Object(
  {
    token: t.String({ minLength: 1, maxLength: 2048 }),
    password: t.String({ minLength: 8, maxLength: 1024 }),
  },
  { additionalProperties: false }
);

const tboxAcceptedData = t.Object({
  accepted: t.Boolean(),
});

const tboxPasswordResetData = t.Object({
  reset: t.Boolean(),
});

export type AccountRecoveryControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
  realm: RecoveryActorKind;
};

export type AccountRecoveryRoutesOptions = {
  controllerFactory?: (
    input: AccountRecoveryControllerFactoryInput
  ) => AccountRecoveryController;
  operationalLogger?: OperationalLogger;
};

function getRuntimePasswordPepper(
  runtimeEnv: (Partial<Env> & Record<string, unknown>) | undefined
): string | undefined {
  const passwordPepper = runtimeEnv?.PASSWORD_PEPPER;

  if (typeof passwordPepper === "string") return passwordPepper;
  return undefined;
}

function createRuntimeController(
  input: AccountRecoveryControllerFactoryInput,
  options: AccountRecoveryRoutesOptions
): AccountRecoveryController {
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

  const repositories =
    input.realm === "ADMIN"
      ? createAdminAccountRecoveryRepositories(db as D1Database)
      : createCustomerAccountRecoveryRepositories(db as D1Database);
  const service = new AccountRecoveryService({
    ...repositories,
    passwordPepper: pepper.pepper,
    accountEmails: createAccountEmailNotifier(input.runtimeEnv ?? {}, {
      requestUrl: input.request.url,
    }),
    operationalLogger: options.operationalLogger,
    realm: input.realm,
  });

  return new AccountRecoveryController(service);
}

function getController(
  input: AccountRecoveryControllerFactoryInput,
  options: AccountRecoveryRoutesOptions
): AccountRecoveryController {
  return (
    options.controllerFactory?.(input) ??
    createRuntimeController(input, options)
  );
}

async function sourceIpHash(request: Request): Promise<string | undefined> {
  const sourceIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return sourceIp ? hashSessionToken(`ip:${sourceIp}`) : undefined;
}

export function accountRecoveryRoutes(
  app: AnyElysia,
  options: AccountRecoveryRoutesOptions = {}
) {
  return registerPasswordResetRoutes(
    registerPasswordResetRoutes(app, "ADMIN", "/admin/auth", options),
    "CUSTOMER",
    "/customer/auth",
    options
  ).post(
    "/customer/auth/email-verifications/requests",
    async (ctx) => {
      const { request, set, runtimeEnv, body, requestId } = ctx as typeof ctx &
        RequestContextDecorations & {
          runtimeEnv?: Partial<Env> & Record<string, unknown>;
          body: { email?: unknown };
        };
      const controller = getController(
        { request, runtimeEnv, requestId, realm: "CUSTOMER" },
        options
      );
      const result = await controller.requestEmailVerification({
        body,
        requestId,
        sourceIpHash: await sourceIpHash(request),
      });

      set.status = result.status;

      return result.body as never;
    },
    {
      body: tboxRecoveryEmailBody,
      detail: routeDetail({
        summary: "Request customer verification email",
        description:
          "Accepts a customer verification resend request without revealing account existence or verification state.",
        tags: ["Customer Auth"],
        auth: { mode: "public", roles: ["PROSPECT", "CUSTOMER"] },
        rateLimitClass: "email-token",
        errorCodes: [
          "VALIDATION_FAILED",
          "RATE_LIMITED",
          "PROVIDER_UNAVAILABLE",
          "INTERNAL_ERROR",
        ],
      }),
      response: {
        202: tboxApiSuccess(tboxAcceptedData),
        ...openApiErrorResponses([400, 429, 500, 503]),
      },
    }
  );
}

function registerPasswordResetRoutes(
  app: AnyElysia,
  realm: RecoveryActorKind,
  basePath: "/admin/auth" | "/customer/auth",
  options: AccountRecoveryRoutesOptions
) {
  const label = realm === "ADMIN" ? "admin" : "customer";
  const tag = realm === "ADMIN" ? "Admin Auth" : "Customer Auth";

  return app
    .post(
      `${basePath}/password-resets`,
      async (ctx) => {
        const { request, set, runtimeEnv, body, requestId } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              body: { email?: unknown };
            };
        const controller = getController(
          { request, runtimeEnv, requestId, realm },
          options
        );
        const result = await controller.requestPasswordReset({
          body,
          requestId,
          sourceIpHash: await sourceIpHash(request),
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        body: tboxRecoveryEmailBody,
        detail: routeDetail({
          summary: `Request ${label} password reset`,
          description: `Accepts a ${label} password reset request and sends email only when eligible without revealing account existence.`,
          tags: [tag],
          auth: { mode: "public", roles: ["PROSPECT"] },
          rateLimitClass: "email-token",
          errorCodes: [
            "VALIDATION_FAILED",
            "RATE_LIMITED",
            "PROVIDER_UNAVAILABLE",
            "INTERNAL_ERROR",
          ],
        }),
        response: {
          202: tboxApiSuccess(tboxAcceptedData),
          ...openApiErrorResponses([400, 429, 500, 503]),
        },
      }
    )
    .post(
      `${basePath}/password-resets/confirmations`,
      async (ctx) => {
        const { request, set, runtimeEnv, body, requestId } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              body: { token?: unknown; password?: unknown };
            };
        const controller = getController(
          { request, runtimeEnv, requestId, realm },
          options
        );
        const result = await controller.confirmPasswordReset({
          body,
          requestId,
          sourceIpHash: await sourceIpHash(request),
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        body: tboxPasswordResetConfirmationBody,
        detail: routeDetail({
          summary: `Confirm ${label} password reset`,
          description: `Consumes a single-use ${label} password reset token and updates the password without issuing or revoking a session cookie.`,
          tags: [tag],
          auth: { mode: "public", roles: ["PROSPECT"] },
          rateLimitClass: "email-token",
          errorCodes: [
            "VALIDATION_FAILED",
            "RESOURCE_NOT_FOUND",
            "CONFLICT_STATE",
            "RATE_LIMITED",
            "PROVIDER_UNAVAILABLE",
            "INTERNAL_ERROR",
          ],
        }),
        response: {
          200: tboxApiSuccess(tboxPasswordResetData),
          ...openApiErrorResponses([400, 404, 409, 429, 500, 503]),
        },
      }
    );
}

export type { AccountRecoveryServiceLike };
