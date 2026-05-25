import type { MiddlewareHandler } from "astro";
import type { DashboardRole } from "@/components/layout";
import {
  inspectAdminPageSession,
  type AdminPageSessionInput,
  type AdminPageSessionInspection,
} from "@/server/auth/admin-page-session";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "@/utils/request-id";

type RuntimeEnv = Partial<Env> & Record<string, unknown>;

export type AdminPageGuardOptions = {
  getRuntimeEnv?: () => RuntimeEnv | undefined;
  inspectSession?: (
    input: AdminPageSessionInput
  ) => Promise<AdminPageSessionInspection>;
};

const ADMIN_AUTH_PATHS = new Set([
  "/admin/sign-in",
  "/admin/password-reset",
  "/admin/password-reset/confirm",
]);

function isAdminPage(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminAuthPage(pathname: string): boolean {
  return ADMIN_AUTH_PATHS.has(pathname);
}

function requiredRole(pathname: string): DashboardRole {
  if (pathname.startsWith("/admin/accounts")) return "SUPER_ADMIN";
  if (pathname.startsWith("/admin/owner")) return "SUPER_ADMIN";
  return "ADMIN";
}

function hasRole(actorRole: DashboardRole, required: DashboardRole): boolean {
  if (required === "SUPER_ADMIN") return actorRole === "SUPER_ADMIN";
  return actorRole === "ADMIN" || actorRole === "SUPER_ADMIN";
}

function redirectResponse(target: URL, requestId: string): Response {
  return new Response(null, {
    headers: {
      "cache-control": "no-store",
      location: target.toString(),
      [REQUEST_ID_HEADER]: requestId,
      vary: "cookie",
    },
    status: 302,
  });
}

function redirectToSignIn(url: URL, requestId: string): Response {
  const target = new URL("/admin/sign-in", url);
  const returnTo = `${url.pathname}${url.search}`;

  if (returnTo !== "/admin/sign-in") {
    target.searchParams.set("returnTo", returnTo);
  }

  return redirectResponse(target, requestId);
}

function withAdminPageHeaders(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  headers.set(REQUEST_ID_HEADER, requestId);
  headers.set("vary", "cookie");

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export function createAdminPageGuard({
  getRuntimeEnv,
  inspectSession = inspectAdminPageSession,
}: AdminPageGuardOptions = {}): MiddlewareHandler {
  return async (context, next) => {
    const { request, url } = context;
    const pathname = url.pathname;

    if (!isAdminPage(pathname) || isAdminAuthPage(pathname)) {
      return next();
    }

    const requestId = getOrCreateRequestId(request.headers);
    const session = await inspectSession({
      request,
      requestId,
      runtimeEnv: getRuntimeEnv?.(),
    });

    if (!session.authenticated) {
      return redirectToSignIn(url, requestId);
    }

    if (!hasRole(session.actor.role, requiredRole(pathname))) {
      return redirectResponse(new URL("/admin", url), requestId);
    }

    context.locals.adminActor = session.actor;

    return withAdminPageHeaders(await next(), requestId);
  };
}
