import { t } from "elysia";
import { validatePasswordPepper } from "@/domain/auth/super-admin-seed";
import { hashSessionToken } from "@/lib/crypto/session-token";
import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import { SESSION_COOKIE_NAME } from "@/server/auth/session-cookie";
import type { OperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import {
  AuthController,
  type AuthCookieInstruction,
} from "@/server/controllers/AuthController";
import { createAuthRepositories } from "@/server/repositories/AuthRepository";
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

const tboxSessionCookie = t.Cookie({
  [SESSION_COOKIE_NAME]: t.Optional(t.String()),
});

export type AuthControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
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

function createRuntimeController(
  input: AuthControllerFactoryInput,
  options: AuthRoutesOptions
): AuthController {
  const db = input.runtimeEnv?.DB;
  const pepper = validatePasswordPepper(
    getRuntimePasswordPepper(input.runtimeEnv)
  );

  if (!db || !pepper.ok) {
    throw new GeneralError({}, "INTERNAL_ERROR");
  }

  const repositories = createAuthRepositories(db as D1Database);
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
  return options.controllerFactory?.(input) ?? createRuntimeController(input, options);
}

function getSessionCookieValue(
  cookie: Record<string, { value: unknown }>
): string | undefined {
  const value = cookie[SESSION_COOKIE_NAME]?.value;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function shouldSecureCookie(request: Request): boolean {
  const url = new URL(request.url);
  const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);

  return !(url.protocol === "http:" && localHostnames.has(url.hostname));
}

function secondsUntil(expiresAt: string, now = new Date()): number {
  return Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1000)
  );
}

function applyCookieInstruction(
  cookie: Record<string, { set: (config: Record<string, unknown>) => unknown }>,
  request: Request,
  instruction: AuthCookieInstruction | undefined
): void {
  if (!instruction) return;

  const baseCookie = {
    httpOnly: true,
    secure: shouldSecureCookie(request),
    sameSite: "lax",
    path: "/",
  };

  if (instruction.kind === "set") {
    cookie[SESSION_COOKIE_NAME]?.set({
      ...baseCookie,
      value: instruction.token,
      expires: new Date(instruction.expiresAt),
      maxAge: secondsUntil(instruction.expiresAt),
    });
    return;
  }

  cookie[SESSION_COOKIE_NAME]?.set({
    ...baseCookie,
    value: "",
    expires: new Date(0),
    maxAge: 0,
  });
}

async function sourceIpHash(request: Request): Promise<string | undefined> {
  const sourceIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return sourceIp ? hashSessionToken(`ip:${sourceIp}`) : undefined;
}

export function authRoutes(app: AnyElysia, options: AuthRoutesOptions = {}) {
  return app
    .post(
      "/auth/sessions",
      async (ctx) => {
        const { request, set, cookie, runtimeEnv, body, requestId } =
          ctx as typeof ctx &
          RequestContextDecorations & {
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
            cookie: Record<string, { set: (config: Record<string, unknown>) => unknown }>;
            body: { email: string; password: string };
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.createSession({
          body,
          requestId,
          sourceIpHash: await sourceIpHash(request),
        });

        set.status = result.status;
        applyCookieInstruction(cookie, request, result.cookie);

        return result.body as never;
      },
      {
        body: tboxSignInBody,
        cookie: tboxSessionCookie,
        detail: routeDetail({
          summary: "Create auth session",
          description:
            "Authenticates email/password credentials and creates an HttpOnly server-side session cookie.",
          tags: ["Auth"],
          auth: { mode: "public", roles: ["PROSPECT"] },
          rateLimitClass: "auth-password",
          errorCodes: [
            "VALIDATION_FAILED",
            "AUTHENTICATION",
            "ACCOUNT_SUSPENDED",
            "EMAIL_NOT_VERIFIED",
            "ADMIN_APPROVAL_REQUIRED",
            "RATE_LIMITED",
            "INTERNAL_ERROR",
          ],
        }),
        response: {
          200: tboxApiSuccess(tboxSignInData),
          ...openApiErrorResponses([400, 401, 403, 429, 500]),
        },
      }
    )
    .delete(
      "/auth/sessions/current",
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
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.deleteCurrentSession({
          sessionToken: getSessionCookieValue(cookie),
          requestId,
        });

        set.status = result.status;
        applyCookieInstruction(cookie, request, result.cookie);

        return result.body as never;
      },
      {
        cookie: tboxSessionCookie,
        detail: routeDetail({
          summary: "Delete current auth session",
          description:
            "Invalidates the current server-side session when present and clears the browser session cookie.",
          tags: ["Auth"],
          auth: { mode: "optional", roles: ["PROSPECT", "CUSTOMER", "ADMIN", "SUPER_ADMIN"] },
          rateLimitClass: "auth-password",
          errorCodes: ["AUTHENTICATION", "INTERNAL_ERROR"],
        }),
        response: {
          200: tboxApiSuccess(tboxSignOutData),
          ...openApiErrorResponses([401, 500]),
        },
      }
    )
    .get(
      "/auth/session",
      async (ctx) => {
        const { request, set, cookie, runtimeEnv, requestId } =
          ctx as typeof ctx &
          RequestContextDecorations & {
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
            cookie: Record<string, { value: unknown }>;
          };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.getCurrentSession({
          sessionToken: getSessionCookieValue(cookie),
          requestId,
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        cookie: tboxSessionCookie,
        detail: routeDetail({
          summary: "Inspect current auth session",
          description:
            "Returns the current actor/session summary when the session cookie maps to an active server-side session.",
          tags: ["Auth"],
          auth: { mode: "optional", roles: ["PROSPECT", "CUSTOMER", "ADMIN", "SUPER_ADMIN"] },
          rateLimitClass: "public-read",
          errorCodes: ["AUTH_REQUIRED", "INTERNAL_ERROR"],
        }),
        response: {
          200: tboxApiSuccess(tboxSessionInspectionData),
          ...openApiErrorResponses([401, 500]),
        },
      }
    );
}
