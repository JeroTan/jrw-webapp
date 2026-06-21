import { AuthService } from "@/server/services/AuthService";
import { createCustomerAuthRepositories } from "@/server/repositories/CustomerAuthRepository";

import { CUSTOMER_SESSION_COOKIE_NAME } from "./session-cookie";

export type CustomerPageSessionActor = {
  id: string;
  role: "CUSTOMER";
};

export type CustomerPageSessionInspection =
  | { actor: CustomerPageSessionActor; authenticated: true }
  | {
      authenticated: false;
      reason: "invalid_session" | "missing_db" | "missing_session";
    };

export type CustomerPageSessionInput = {
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

export async function inspectCustomerPageSession({
  request,
  requestId,
  runtimeEnv,
}: CustomerPageSessionInput): Promise<CustomerPageSessionInspection> {
  const sessionToken = readCookie(
    request.headers,
    CUSTOMER_SESSION_COOKIE_NAME
  );
  if (!sessionToken) {
    return { authenticated: false, reason: "missing_session" };
  }

  if (!runtimeEnv?.DB) {
    return { authenticated: false, reason: "missing_db" };
  }

  const service = new AuthService({
    ...createCustomerAuthRepositories(runtimeEnv.DB as D1Database),
    passwordPepper: "unused-page-session-pepper",
  });
  const inspection = await service.inspectSession({ sessionToken, requestId });

  if (
    inspection.error ||
    !inspection.content.authenticated ||
    !inspection.content.actor ||
    inspection.content.actor.role !== "CUSTOMER"
  ) {
    return { authenticated: false, reason: "invalid_session" };
  }

  return {
    actor: {
      id: inspection.content.actor.id,
      role: "CUSTOMER",
    },
    authenticated: true,
  };
}
