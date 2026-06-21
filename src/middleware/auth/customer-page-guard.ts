import type { MiddlewareHandler } from "astro";
import { sanitizeCustomerReturnTo } from "@/domain/auth/customer-account-navigation";
import {
  inspectCustomerPageSession,
  type CustomerPageSessionInput,
  type CustomerPageSessionInspection,
} from "@/server/auth/customer-page-session";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "@/utils/request-id";

type RuntimeEnv = Partial<Env> & Record<string, unknown>;

export type CustomerPageGuardOptions = {
  getRuntimeEnv?: () => RuntimeEnv | undefined;
  inspectSession?: (
    input: CustomerPageSessionInput
  ) => Promise<CustomerPageSessionInspection>;
};

const CUSTOMER_AUTH_PATHS = new Set(["/account/sign-in", "/account/register"]);

function isCustomerProtectedPage(pathname: string): boolean {
  return (
    pathname === "/account/profile" ||
    pathname.startsWith("/account/profile/") ||
    pathname === "/account/orders" ||
    pathname.startsWith("/account/orders/")
  );
}

function isCustomerAccountEntry(pathname: string): boolean {
  return pathname === "/account" || CUSTOMER_AUTH_PATHS.has(pathname);
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
  const target = new URL("/account/sign-in", url);
  const returnTo = sanitizeCustomerReturnTo(`${url.pathname}${url.search}`);

  if (returnTo) {
    target.searchParams.set("returnTo", returnTo);
  }

  return redirectResponse(target, requestId);
}

function authenticatedDestination(url: URL): string {
  const returnTo = sanitizeCustomerReturnTo(url.searchParams.get("returnTo"));
  if (!returnTo) return "/account/profile";

  const pathname = new URL(returnTo, url).pathname;
  return CUSTOMER_AUTH_PATHS.has(pathname) ? "/account/profile" : returnTo;
}

function withCustomerPageHeaders(
  response: Response,
  requestId: string
): Response {
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

export function createCustomerPageGuard({
  getRuntimeEnv,
  inspectSession = inspectCustomerPageSession,
}: CustomerPageGuardOptions = {}): MiddlewareHandler {
  return async (context, next) => {
    const { request, url } = context;
    const pathname = url.pathname;
    const protectedPage = isCustomerProtectedPage(pathname);
    const accountEntry = isCustomerAccountEntry(pathname);

    if (!protectedPage && !accountEntry) {
      return next();
    }

    const requestId = getOrCreateRequestId(request.headers);
    const session = await inspectSession({
      request,
      requestId,
      runtimeEnv: getRuntimeEnv?.(),
    });

    if (!session.authenticated) {
      if (protectedPage) {
        return redirectToSignIn(url, requestId);
      }
      return withCustomerPageHeaders(await next(), requestId);
    }

    if (accountEntry) {
      return redirectResponse(
        new URL(authenticatedDestination(url), url),
        requestId
      );
    }

    context.locals.customerActor = session.actor;
    return withCustomerPageHeaders(await next(), requestId);
  };
}
