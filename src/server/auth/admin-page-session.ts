import type { DashboardRole } from "@/components/layout";
import { AuthService } from "@/server/services/AuthService";
import { createAdminAuthRepositories } from "@/server/repositories/AdminAuthRepository";

import { ADMIN_SESSION_COOKIE_NAME } from "./session-cookie";

export type AdminPageSessionActor = {
  id: string;
  role: DashboardRole;
};

export type AdminPageSessionInspection =
  | { actor: AdminPageSessionActor; authenticated: true }
  | {
      authenticated: false;
      reason: "invalid_session" | "missing_db" | "missing_session";
    };

export type AdminPageSessionInput = {
  request: Request;
  requestId: string;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
};

function readCookie(headers: Headers, cookieName: string): string | undefined {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return undefined;

  for (const cookiePart of cookieHeader.split(";")) {
    const [name, ...valueParts] = cookiePart.trim().split("=");
    if (name !== cookieName) continue;

    const value = valueParts.join("=");
    try {
      return value ? decodeURIComponent(value) : undefined;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function isDashboardRole(role: string): role is DashboardRole {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function inspectAdminPageSession({
  request,
  requestId,
  runtimeEnv,
}: AdminPageSessionInput): Promise<AdminPageSessionInspection> {
  const sessionToken = readCookie(request.headers, ADMIN_SESSION_COOKIE_NAME);
  if (!sessionToken) {
    return { authenticated: false, reason: "missing_session" };
  }

  if (!runtimeEnv?.DB) {
    return { authenticated: false, reason: "missing_db" };
  }

  const service = new AuthService({
    ...createAdminAuthRepositories(runtimeEnv.DB as D1Database),
    passwordPepper: "unused-page-session-pepper",
  });
  const inspection = await service.inspectSession({ sessionToken, requestId });

  if (
    inspection.error ||
    !inspection.content.authenticated ||
    !inspection.content.actor ||
    !isDashboardRole(inspection.content.actor.role)
  ) {
    return { authenticated: false, reason: "invalid_session" };
  }

  return {
    actor: {
      id: inspection.content.actor.id,
      role: inspection.content.actor.role,
    },
    authenticated: true,
  };
}
