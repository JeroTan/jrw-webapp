import { t } from "elysia";
import type { OperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import { hashSessionToken } from "@/lib/crypto/session-token";
import { createGoogleOAuthClientFromEnv } from "@/lib/google/oauth";
import { openApiErrorResponses } from "@/lib/typebox/api";
import {
  CUSTOMER_SESSION_COOKIE_NAME,
  applySessionCookieInstruction,
  type SessionCookieJar,
} from "@/server/auth/session-cookie";
import { GoogleOAuthController } from "@/server/controllers/GoogleOAuthController";
import type { RequestContextDecorations } from "@/server/context/request-context";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createGoogleOAuthRepositories } from "@/server/repositories/GoogleOAuthRepository";
import { GoogleOAuthService } from "@/server/services/GoogleOAuthService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

const tboxStartGoogleOAuthQuery = t.Object({
  returnTo: t.Optional(t.String({ minLength: 1, maxLength: 2048 })),
});

const tboxGoogleOAuthCallbackQuery = t.Object({
  code: t.Optional(t.String({ minLength: 1, maxLength: 4096 })),
  state: t.Optional(t.String({ minLength: 1, maxLength: 4096 })),
  error: t.Optional(t.String({ minLength: 1, maxLength: 1024 })),
  iss: t.Optional(t.String({ maxLength: 2048 })),
  scope: t.Optional(t.String({ maxLength: 4096 })),
  authuser: t.Optional(t.String({ maxLength: 128 })),
  prompt: t.Optional(t.String({ maxLength: 1024 })),
});

const tboxSessionCookie = t.Cookie({
  [CUSTOMER_SESSION_COOKIE_NAME]: t.Optional(t.String()),
});

export type GoogleOAuthControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
};

export type GoogleOAuthRoutesOptions = {
  controllerFactory?: (
    input: GoogleOAuthControllerFactoryInput
  ) => GoogleOAuthController;
  operationalLogger?: OperationalLogger;
};

function createRuntimeController(
  input: GoogleOAuthControllerFactoryInput,
  options: GoogleOAuthRoutesOptions
): GoogleOAuthController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const provider = createGoogleOAuthClientFromEnv(input.runtimeEnv, {
    requestUrl: input.request.url,
  });

  if (provider.error) {
    throw provider.error;
  }

  const repositories = createGoogleOAuthRepositories(db as D1Database);
  const service = new GoogleOAuthService({
    ...repositories,
    provider: provider.content,
    operationalLogger: options.operationalLogger,
  });

  return new GoogleOAuthController(service);
}

function getController(
  input: GoogleOAuthControllerFactoryInput,
  options: GoogleOAuthRoutesOptions
): GoogleOAuthController {
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

function applyRedirectResult(
  set: { status?: number | string; headers: Record<string, string | number> },
  result: { status: number; location?: string }
): void {
  set.status = result.status;
  if (result.location) {
    set.headers.location = result.location;
  }
}

export function googleOAuthRoutes(
  app: AnyElysia,
  options: GoogleOAuthRoutesOptions = {}
) {
  return app
    .get(
      "/oauth/google/sessions",
      async (ctx) => {
        const { request, set, runtimeEnv, query, requestId } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              query: { returnTo?: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.startSession({
          returnTo: query.returnTo,
          requestId,
          sourceIpHash: await sourceIpHash(request),
        });

        applyRedirectResult(set, result);

        return result.body as never;
      },
      {
        query: tboxStartGoogleOAuthQuery,
        detail: routeDetail({
          summary: "Start Google OAuth session",
          description:
            `Creates a hashed OAuth state/nonce record and redirects Prospect or Customer users to Google OAuth.

**Path:** \`GET /oauth/google/sessions\`

**Authentication:** Public — no authentication required.

**Query Parameters:**
- \`returnTo\` (string, optional): URL path to redirect back to after successful OAuth completion (1-2048 characters). Must be a relative path within the application domain.

**Response (302):** Redirects to Google's OAuth consent page. No JSON body.

**Flow:**
1. Client calls this endpoint (typically via browser navigation, not fetch).
2. Server generates a cryptographically secure state/nonce pair and stores it hashed in the database.
3. Server responds with a 302 redirect to Google's OAuth authorization URL.
4. User authenticates with Google and consents to the requested scopes.
5. Google redirects back to \`/oauth/google/callback\` with an authorization code.

**Security:** The state parameter prevents CSRF attacks. The nonce prevents replay attacks on the ID token.`,
          tags: ["Customer Auth"],
          auth: { mode: "public", roles: ["PROSPECT", "CUSTOMER"] },
          rateLimitClass: "oauth-login",
          errorCodes: [
            "VALIDATION_FAILED",
            "RATE_LIMITED",
            "PROVIDER_UNAVAILABLE",
            "INTERNAL_ERROR",
          ],
        }),
        response: {
          302: t.Void(),
          ...openApiErrorResponses([400, 429, 500, 503]),
        },
      }
    )
    .get(
      "/oauth/google/callback",
      async (ctx) => {
        const { request, set, cookie, runtimeEnv, query, requestId } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              cookie: SessionCookieJar;
              query: { code?: string; state?: string; error?: string };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.handleCallback({
          code: query.code,
          state: query.state,
          providerError: query.error,
          requestId,
          sourceIpHash: await sourceIpHash(request),
        });

        applyRedirectResult(set, result);
        applySessionCookieInstruction(
          cookie,
          request,
          result.cookie,
          CUSTOMER_SESSION_COOKIE_NAME
        );

        return result.body as never;
      },
      {
        query: tboxGoogleOAuthCallbackQuery,
        cookie: tboxSessionCookie,
        detail: routeDetail({
          summary: "Handle Google OAuth callback",
          description:
            `Validates Google OAuth state, verifies the ID token, links or creates a Customer account, sets an HttpOnly session cookie, and redirects safely.

**Path:** \`GET /oauth/google/callback\`

**Authentication:** Public — no authentication required. This endpoint is called by Google's OAuth redirect.

**Query Parameters (set by Google OAuth redirect):**
- \`code\` (string, optional): The authorization code from Google (1-4096 characters). Used to exchange for an ID token.
- \`state\` (string, optional): The OAuth state parameter to validate against the stored hashed state (1-4096 characters).
- \`error\` (string, optional): Error code from Google if the user denied consent or an error occurred.
- \`iss\` (string, optional): Issuer identifier from Google (max 2048 characters).
- \`scope\` (string, optional): Granted OAuth scopes (max 4096 characters).
- \`authuser\` (string, optional): Google account index for multi-login (max 128 characters).
- \`prompt\` (string, optional): Consent prompt status (max 1024 characters).

**Response (302):** Redirects to the application (either the \`returnTo\` URL from the start endpoint or the default landing page). No JSON body.

**Flow:**
1. Google redirects the user's browser to this endpoint with the authorization code and state.
2. Server validates the state parameter matches the stored hashed state/nonce record.
3. Server exchanges the authorization code for a Google ID token.
4. Server verifies the ID token signature, audience, and expiration.
5. Server looks up or creates a Customer account linked to the Google email.
6. Server creates a new session and sets the HttpOnly customer session cookie.
7. Server responds with a 302 redirect to the application.

**Side Effects:** Sets an HttpOnly session cookie (\`customer_session\`) on the response.

**Security:** The state parameter is validated to prevent CSRF. The ID token is verified cryptographically. Suspended accounts are rejected.`,
          tags: ["Customer Auth"],
          auth: { mode: "public", roles: ["PROSPECT", "CUSTOMER"] },
          rateLimitClass: "oauth-login",
          errorCodes: [
            "VALIDATION_FAILED",
            "AUTHENTICATION",
            "AUTH_FORBIDDEN",
            "ACCOUNT_SUSPENDED",
            "CONFLICT_STATE",
            "RATE_LIMITED",
            "PROVIDER_UNAVAILABLE",
            "INTERNAL_ERROR",
          ],
        }),
        response: {
          302: t.Void(),
          ...openApiErrorResponses([400, 401, 403, 409, 429, 500, 503]),
        },
      }
    );
}
