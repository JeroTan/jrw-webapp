import { Elysia } from "elysia";
import type { AccountStatus, AuthActorKind } from "@/domain/auth/auth-decisions";
import type { ActorRole } from "@/domain/auth/roles";
import {
  ADMIN_SESSION_COOKIE_NAME,
  CUSTOMER_SESSION_COOKIE_NAME,
} from "@/server/auth/session-cookie";
import { createAdminAuthRepositories } from "@/server/repositories/AdminAuthRepository";
import { createCustomerAuthRepositories } from "@/server/repositories/CustomerAuthRepository";
import { AuthService } from "@/server/services/AuthService";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "@/utils/request-id";

export type RequestActorContext = {
  authenticated: boolean;
  role: ActorRole;
  actorId?: string;
  safeActorId?: string;
  accountStatus?: {
    status: AccountStatus;
    emailVerified: boolean;
    approved: boolean;
  };
  eligibility: {
    active: boolean;
    emailVerified: boolean;
    approved: boolean;
  };
};

export type ServerRequestContext = {
  requestId: string;
  actor?: RequestActorContext;
};

export type RequestContextDecorations = {
  requestContext: ServerRequestContext;
  requestId: string;
};

export type SessionActorResolverInput = {
  request: Request;
  requestId: string;
  sessionToken?: string;
  sessionRealm: AuthActorKind;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
};

export type SessionActorResolver = (
  input: SessionActorResolverInput
) => Promise<RequestActorContext | undefined>;

export type RequestContextPluginOptions = {
  resolveActorFromSession?: SessionActorResolver;
};

export function anonymousActorContext(): RequestActorContext {
  return {
    authenticated: false,
    role: "PROSPECT",
    eligibility: {
      active: false,
      emailVerified: false,
      approved: false,
    },
  };
}

function parseCookieHeader(headers: Headers, cookieName: string): string | undefined {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return undefined;

  for (const cookiePart of cookieHeader.split(";")) {
    const [name, ...valueParts] = cookiePart.trim().split("=");
    if (name === cookieName) {
      const value = valueParts.join("=");
      try {
        return value ? decodeURIComponent(value) : undefined;
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

function sessionRealmForPath(pathname: string): AuthActorKind {
  if (
    pathname.startsWith("/api/customer/") ||
    pathname.startsWith("/api/customers") ||
    pathname.startsWith("/api/oauth/google") ||
    pathname.startsWith("/api/email-verifications")
  ) {
    return "CUSTOMER";
  }

  return "ADMIN";
}

function cookieNameForRealm(realm: AuthActorKind): string {
  return realm === "CUSTOMER"
    ? CUSTOMER_SESSION_COOKIE_NAME
    : ADMIN_SESSION_COOKIE_NAME;
}

function actorContextFromInspection(
  inspection: Awaited<ReturnType<AuthService["inspectSession"]>>["content"]
): RequestActorContext {
  if (!inspection?.authenticated || !inspection.actor) {
    return anonymousActorContext();
  }

  return {
    authenticated: true,
    role: inspection.actor.role,
    actorId: inspection.actor.id,
    safeActorId: inspection.actor.id,
    accountStatus: inspection.actor.accountStatus,
    eligibility: {
      active: inspection.actor.accountStatus.status === "ACTIVE",
      emailVerified: inspection.actor.accountStatus.emailVerified,
      approved: inspection.actor.accountStatus.approved,
    },
  };
}

async function defaultSessionActorResolver({
  sessionToken,
  sessionRealm,
  runtimeEnv,
  requestId,
}: SessionActorResolverInput): Promise<RequestActorContext | undefined> {
  if (!sessionToken || !runtimeEnv?.DB) {
    return anonymousActorContext();
  }

  const repositories =
    sessionRealm === "CUSTOMER"
      ? createCustomerAuthRepositories(runtimeEnv.DB as D1Database)
      : createAdminAuthRepositories(runtimeEnv.DB as D1Database);
  const service = new AuthService({
    ...repositories,
    passwordPepper: "unused-request-context-pepper",
  });
  const inspection = await service.inspectSession({ sessionToken, requestId });

  return inspection.error
    ? anonymousActorContext()
    : actorContextFromInspection(inspection.content);
}

export function buildRequestContext(
  headers: Headers,
  actor: RequestActorContext = anonymousActorContext(),
  requestId = getOrCreateRequestId(headers)
): ServerRequestContext {
  return {
    requestId,
    actor,
  };
}

export function setRequestIdResponseHeader(
  set: { headers: Record<string, string | number> },
  requestId: string
): void {
  set.headers[REQUEST_ID_HEADER] = requestId;
}

export function createRequestContextPlugin(
  options: RequestContextPluginOptions = {}
) {
  const resolveActorFromSession =
    options.resolveActorFromSession ?? defaultSessionActorResolver;

  return new Elysia({
    name: "request-context",
  }).derive({ as: "scoped" }, async (ctx) => {
    const { request, set } = ctx;
    const runtimeEnv = (
      ctx as typeof ctx & {
        runtimeEnv?: Partial<Env> & Record<string, unknown>;
      }
    ).runtimeEnv;
    const requestId = getOrCreateRequestId(request.headers);
    const sessionRealm = sessionRealmForPath(new URL(request.url).pathname);
    const sessionToken = parseCookieHeader(
      request.headers,
      cookieNameForRealm(sessionRealm)
    );
    const actor =
      (await resolveActorFromSession({
        request,
        requestId,
        sessionToken,
        sessionRealm,
        runtimeEnv,
      })) ?? anonymousActorContext();
    const requestContext = buildRequestContext(request.headers, actor, requestId);

    setRequestIdResponseHeader(set, requestId);

    return {
      requestContext,
      requestId: requestContext.requestId,
    };
  });
}

export const requestContextPlugin = createRequestContextPlugin();
