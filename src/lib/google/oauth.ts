import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from "jose";
import {
  hashGoogleOAuthMaterial,
  type GoogleOAuthIdentity,
} from "@/domain/auth/google-oauth";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_CALLBACK_PATH = "/api/oauth/google/callback";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  jwksUrl?: string;
};

export type GoogleAuthorizationUrlInput = GoogleOAuthConfig & {
  state: string;
  nonce: string;
};

export type ExchangeGoogleAuthorizationCodeInput = GoogleOAuthConfig & {
  code: string;
  fetch?: typeof fetch;
};

export type GoogleTokenExchangeResult = {
  idToken: string;
};

export type VerifyGoogleIdTokenInput = {
  idToken: string;
  clientId: string;
  expectedNonceHash: string;
  jwks?: JWTVerifyGetKey;
  jwksUrl?: string;
};

export type GoogleOAuthProviderClient = {
  createAuthorizationUrl(input: { state: string; nonce: string }): string;
  exchangeCodeForIdentity(input: {
    code: string;
    expectedNonceHash: string;
  }): Promise<AppResult<GoogleOAuthIdentity>>;
};

function providerUnavailable(reason: string, status?: number) {
  return new GeneralError(
    {
      reason,
      ...(status ? { status } : {}),
    },
    "PROVIDER_UNAVAILABLE"
  );
}

function authenticationFailure(reason: string) {
  return new GeneralError({ reason }, "AUTHENTICATION");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringFromRecord(
  value: Record<string, unknown>,
  key: string
): string | undefined {
  const entry = value[key];
  return typeof entry === "string" && entry.length > 0 ? entry : undefined;
}

function booleanFromRecord(value: Record<string, unknown>, key: string): boolean {
  return value[key] === true;
}

function isLikelyJwksProviderError(error: unknown): boolean {
  const name =
    error instanceof Error
      ? error.name
      : isRecord(error) && typeof error.name === "string"
        ? error.name
        : "";
  const code =
    isRecord(error) && typeof error.code === "string" ? error.code : "";

  return (
    error instanceof TypeError ||
    name === "AbortError" ||
    name === "JWKSTimeout" ||
    code === "ERR_JWKS_TIMEOUT" ||
    code === "ERR_JWKS_FETCH_FAILED"
  );
}

function envString(
  env: (Partial<Env> & Record<string, unknown>) | undefined,
  key: string
): string | undefined {
  const value = env?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function validatedAbsoluteUrl(value: string): string | undefined {
  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
}

export function buildGoogleAuthorizationUrl(
  input: GoogleAuthorizationUrlInput
): string {
  const url = new URL(
    input.authorizationEndpoint ?? GOOGLE_AUTHORIZATION_ENDPOINT
  );

  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("access_type", "online");

  return url.toString();
}

export async function exchangeGoogleAuthorizationCode(
  input: ExchangeGoogleAuthorizationCodeInput
): Promise<AppResult<GoogleTokenExchangeResult>> {
  const fetchFn = input.fetch ?? fetch;
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code: input.code,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
  });

  try {
    const response = await fetchFn(
      new Request(input.tokenEndpoint ?? GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      })
    );

    if (!response.ok) {
      return Result.error(
        providerUnavailable("google_token_exchange_failed", response.status)
      );
    }

    const payload = (await response.json()) as unknown;
    if (!isRecord(payload)) {
      return Result.error(
        providerUnavailable("google_token_response_malformed")
      );
    }

    const idToken = stringFromRecord(payload, "id_token");
    if (!idToken) {
      return Result.error(
        providerUnavailable("google_id_token_missing")
      );
    }

    return Result.okay({ idToken });
  } catch {
    return Result.error(
      providerUnavailable("google_token_exchange_unavailable")
    );
  }
}

export async function verifyGoogleIdToken(
  input: VerifyGoogleIdTokenInput
): Promise<AppResult<GoogleOAuthIdentity>> {
  const jwks =
    input.jwks ??
    createRemoteJWKSet(new URL(input.jwksUrl ?? GOOGLE_JWKS_URL));

  try {
    const { payload } = await jwtVerify(input.idToken, jwks, {
      issuer: GOOGLE_ISSUERS,
      audience: input.clientId,
    });

    const sub = typeof payload.sub === "string" ? payload.sub : undefined;
    const email = typeof payload.email === "string" ? payload.email : undefined;
    const nonce = typeof payload.nonce === "string" ? payload.nonce : undefined;

    if (!sub) {
      return Result.error(authenticationFailure("google_sub_missing"));
    }

    if (!email) {
      return Result.error(authenticationFailure("google_email_missing"));
    }

    if (typeof payload.exp !== "number") {
      return Result.error(authenticationFailure("google_exp_missing"));
    }

    if (payload.email_verified !== true) {
      return Result.error(authenticationFailure("google_email_unverified"));
    }

    if (!nonce) {
      return Result.error(authenticationFailure("google_nonce_missing"));
    }

    const nonceHash = await hashGoogleOAuthMaterial(nonce);
    if (nonceHash !== input.expectedNonceHash) {
      return Result.error(authenticationFailure("google_nonce_mismatch"));
    }

    return Result.okay({
      sub,
      email,
      emailVerified: booleanFromRecord(payload, "email_verified"),
      name: stringFromRecord(payload, "name"),
      givenName: stringFromRecord(payload, "given_name"),
      familyName: stringFromRecord(payload, "family_name"),
      picture: stringFromRecord(payload, "picture"),
    });
  } catch (error) {
    return Result.error(
      isLikelyJwksProviderError(error)
        ? providerUnavailable("google_jwks_unavailable")
        : authenticationFailure("google_id_token_invalid")
    );
  }
}

export class GoogleOAuthClient implements GoogleOAuthProviderClient {
  constructor(
    private readonly config: GoogleOAuthConfig,
    private readonly fetchFn: typeof fetch = fetch
  ) {}

  createAuthorizationUrl(input: { state: string; nonce: string }): string {
    return buildGoogleAuthorizationUrl({
      ...this.config,
      state: input.state,
      nonce: input.nonce,
    });
  }

  async exchangeCodeForIdentity(input: {
    code: string;
    expectedNonceHash: string;
  }): Promise<AppResult<GoogleOAuthIdentity>> {
    const tokenResult = await exchangeGoogleAuthorizationCode({
      ...this.config,
      code: input.code,
      fetch: this.fetchFn,
    });

    if (tokenResult.error) return tokenResult;

    return verifyGoogleIdToken({
      idToken: tokenResult.content.idToken,
      clientId: this.config.clientId,
      expectedNonceHash: input.expectedNonceHash,
      jwksUrl: this.config.jwksUrl,
    });
  }
}

export function resolveGoogleOAuthConfig(
  env: (Partial<Env> & Record<string, unknown>) | undefined
): AppResult<GoogleOAuthConfig> {
  const clientId = envString(env, "GOOGLE_CLIENT_ID");
  const clientSecret = envString(env, "GOOGLE_CLIENT_SECRET");
  const explicitRedirectUri = envString(env, "GOOGLE_REDIRECT_URI");
  const appBaseUrl =
    envString(env, "APP_BASE_URL") ?? envString(env, "PUBLIC_APP_BASE_URL");
  const redirectUri =
    explicitRedirectUri ??
    (appBaseUrl ? new URL(GOOGLE_CALLBACK_PATH, appBaseUrl).toString() : undefined);

  if (!clientId || !clientSecret || !redirectUri) {
    return Result.error(providerUnavailable("google_oauth_config_missing"));
  }

  const validatedRedirectUri = validatedAbsoluteUrl(redirectUri);
  if (!validatedRedirectUri) {
    return Result.error(providerUnavailable("google_redirect_uri_invalid"));
  }

  return Result.okay({
    clientId,
    clientSecret,
    redirectUri: validatedRedirectUri,
  });
}

export function createGoogleOAuthClientFromEnv(
  env: (Partial<Env> & Record<string, unknown>) | undefined,
  input: { requestUrl?: string; fetch?: typeof fetch } = {}
): AppResult<GoogleOAuthClient> {
  const config = resolveGoogleOAuthConfig(env);

  return config.error
    ? config
    : Result.okay(new GoogleOAuthClient(config.content, input.fetch));
}
