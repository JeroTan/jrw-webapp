import { t } from "elysia";
import type { AuthActorKind } from "@/domain/auth/auth-decisions";
import { validatePasswordPepper } from "@/domain/auth/super-admin-seed";
import { hashSessionToken } from "@/lib/crypto/session-token";
import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import {
  ADMIN_SESSION_COOKIE_NAME,
  CUSTOMER_SESSION_COOKIE_NAME,
  applySessionCookieInstruction,
  getSessionCookieValue,
  type SessionCookieJar,
  type SessionCookieName,
} from "@/server/auth/session-cookie";
import type { OperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import { AuthController } from "@/server/controllers/AuthController";
import { createAdminAuthRepositories } from "@/server/repositories/AdminAuthRepository";
import { createCustomerAuthRepositories } from "@/server/repositories/CustomerAuthRepository";
import { AuthService } from "@/server/services/AuthService";
import type { RequestContextDecorations } from "@/server/context/request-context";
import { routeDetail } from "@/server/openapi/route-metadata";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const tboxRole = t.Union([
  t.Literal("SUPER_ADMIN"),
  t.Literal("ADMIN"),
  t.Literal("CUSTOMER"),
  t.Literal("PROSPECT"),
]);

const tboxAccountStatus = t.Object({
  status: t.Union([
    t.Literal("ACTIVE"),
    t.Literal("INACTIVE"),
    t.Literal("SUSPENDED"),
  ]),
  emailVerified: t.Boolean(),
  approved: t.Boolean(),
});

const tboxAuthenticatedActor = t.Object({
  id: t.String(),
  role: tboxRole,
  accountStatus: tboxAccountStatus,
});

const tboxSessionSummary = t.Object({
  expiresAt: t.String({ format: "date-time" }),
});

const tboxSignInBody = t.Object({
  email: t.String({ format: "email", minLength: 3, maxLength: 254 }),
  password: t.String({ minLength: 1, maxLength: 1024 }),
});

const tboxSignInData = t.Object({
  actor: tboxAuthenticatedActor,
  session: tboxSessionSummary,
});

const tboxSignOutData = t.Object({
  cleared: t.Boolean(),
  revoked: t.Boolean(),
});

const tboxSessionInspectionData = t.Object({
  authenticated: t.Boolean(),
  actor: t.Nullable(tboxAuthenticatedActor),
  session: t.Nullable(tboxSessionSummary),
});

export type AuthRealm = "admin" | "customer";

type AuthRealmConfig = {
  realm: AuthRealm;
  actorKind: AuthActorKind;
  basePath: string;
  cookieName: SessionCookieName;
  tag: string;
  label: string;
  optionalRoles: Array<"PROSPECT" | "CUSTOMER" | "ADMIN" | "SUPER_ADMIN">;
};

const AUTH_REALMS: AuthRealmConfig[] = [
  {
    realm: "admin",
    actorKind: "ADMIN",
    basePath: "/admin/auth",
    cookieName: ADMIN_SESSION_COOKIE_NAME,
    tag: "Admin Auth",
    label: "admin",
    optionalRoles: ["PROSPECT", "ADMIN", "SUPER_ADMIN"],
  },
  {
    realm: "customer",
    actorKind: "CUSTOMER",
    basePath: "/customer/auth",
    cookieName: CUSTOMER_SESSION_COOKIE_NAME,
    tag: "Customer Auth",
    label: "customer",
    optionalRoles: ["PROSPECT", "CUSTOMER"],
  },
];

function tboxSessionCookie(cookieName: SessionCookieName) {
  return t.Cookie({
    [cookieName]: t.Optional(t.String()),
  });
}

export type AuthControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
  realm: AuthRealm;
};

export type AuthRoutesOptions = {
  controllerFactory?: (input: AuthControllerFactoryInput) => AuthController;
  operationalLogger?: OperationalLogger;
};

function getRuntimePasswordPepper(
  runtimeEnv: (Partial<Env> & Record<string, unknown>) | undefined
): string | undefined {
  const passwordPepper = runtimeEnv?.PASSWORD_PEPPER;

  if (typeof passwordPepper === "string") return passwordPepper;
  return undefined;
}

function repositoriesForRealm(realm: AuthRealm, db: D1Database) {
  return realm === "admin"
    ? createAdminAuthRepositories(db)
    : createCustomerAuthRepositories(db);
}

function createRuntimeController(
  input: AuthControllerFactoryInput,
  options: AuthRoutesOptions
): AuthController {
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

  const repositories = repositoriesForRealm(input.realm, db as D1Database);
  const service = new AuthService({
    ...repositories,
    passwordPepper: pepper.pepper,
    operationalLogger: options.operationalLogger,
    sessionTtlSeconds: SESSION_TTL_SECONDS,
  });

  return new AuthController(service);
}

function getController(
  input: AuthControllerFactoryInput,
  options: AuthRoutesOptions
): AuthController {
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

function registerRealmAuthRoutes(
  app: AnyElysia,
  config: AuthRealmConfig,
  options: AuthRoutesOptions
) {
  return app
    .post(
      `${config.basePath}/sessions`,
      async (ctx) => {
        const { request, set, cookie, runtimeEnv, body, requestId } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              cookie: Record<
                string,
                { set: (config: Record<string, unknown>) => unknown }
              >;
              body: { email: string; password: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId, realm: config.realm },
          options
        );
        const result = await controller.createSession({
          body,
          requestId,
          sourceIpHash: await sourceIpHash(request),
        });

        set.status = result.status;
        applySessionCookieInstruction(
          cookie as SessionCookieJar,
          request,
          result.cookie,
          config.cookieName
        );

        return result.body as never;
      },
      {
        body: tboxSignInBody,
        cookie: tboxSessionCookie(config.cookieName),
        detail: routeDetail({
          summary: `Create ${config.label} auth session`,
          description: `Authenticates ${config.label} email/password credentials and creates an HttpOnly ${config.label} session cookie.`,
          tags: [config.tag],
          auth: { mode: "public", roles: ["PROSPECT"] },
          rateLimitClass: "auth-password",
          errorCodes: [
            "VALIDATION_FAILED",
            "AUTHENTICATION",
            "ACCOUNT_SUSPENDED",
            "EMAIL_NOT_VERIFIED",
            "ADMIN_APPROVAL_REQUIRED",
            "RATE_LIMITED",
            "PROVIDER_UNAVAILABLE",
            "INTERNAL_ERROR",
          ],
        }),
        response: {
          200: tboxApiSuccess(tboxSignInData),
          ...openApiErrorResponses([400, 401, 403, 429, 500, 503]),
        },
      }
    )
    .delete(
      `${config.basePath}/sessions/current`,
      async (ctx) => {
        const { request, set, cookie, runtimeEnv, requestId } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              cookie: Record<
                string,
                {
                  value: unknown;
                  set: (config: Record<string, unknown>) => unknown;
                }
              >;
            };
        const controller = getController(
          { request, runtimeEnv, requestId, realm: config.realm },
          options
        );
        const result = await controller.deleteCurrentSession({
          sessionToken: getSessionCookieValue(cookie, config.cookieName),
          requestId,
        });

        set.status = result.status;
        applySessionCookieInstruction(
          cookie as SessionCookieJar,
          request,
          result.cookie,
          config.cookieName
        );

        return result.body as never;
      },
      {
        cookie: tboxSessionCookie(config.cookieName),
        detail: routeDetail({
          summary: `Delete current ${config.label} auth session`,
          description: `Invalidates the current ${config.label} server-side session when present and clears the ${config.label} session cookie.`,
          tags: [config.tag],
          auth: {
            mode: "optional",
            roles: config.optionalRoles,
          },
          rateLimitClass: "auth-password",
          errorCodes: [
            "AUTHENTICATION",
            "PROVIDER_UNAVAILABLE",
            "INTERNAL_ERROR",
          ],
        }),
        response: {
          200: tboxApiSuccess(tboxSignOutData),
          ...openApiErrorResponses([401, 500, 503]),
        },
      }
    )
    .get(
      `${config.basePath}/session`,
      async (ctx) => {
        const { request, set, cookie, runtimeEnv, requestId } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              cookie: Record<string, { value: unknown }>;
            };
        const controller = getController(
          { request, runtimeEnv, requestId, realm: config.realm },
          options
        );
        const result = await controller.getCurrentSession({
          sessionToken: getSessionCookieValue(cookie, config.cookieName),
          requestId,
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        cookie: tboxSessionCookie(config.cookieName),
        detail: routeDetail({
          summary: `Inspect current ${config.label} auth session`,
          description: `Returns the current ${config.label} actor/session summary when the ${config.label} cookie maps to an active server-side session.`,
          tags: [config.tag],
          auth: {
            mode: "optional",
            roles: config.optionalRoles,
          },
          rateLimitClass: "public-read",
          errorCodes: [
            "AUTH_REQUIRED",
            "PROVIDER_UNAVAILABLE",
            "INTERNAL_ERROR",
          ],
        }),
        response: {
          200: tboxApiSuccess(tboxSessionInspectionData),
          ...openApiErrorResponses([401, 500, 503]),
        },
      }
    );
}

export function authRoutes(app: AnyElysia, options: AuthRoutesOptions = {}) {
  return AUTH_REALMS.reduce(
    (routes, config) => registerRealmAuthRoutes(routes, config, options),
    app
  );
}
