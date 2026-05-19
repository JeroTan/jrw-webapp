import {
  createOperationalLogEvent,
  noopOperationalLogger,
  type OperationalLogger,
} from "@/adapter/infrastructure/logging/operational-log";
import {
  GOOGLE_OAUTH_PROVIDER,
  createGoogleOAuthCredential,
  evaluateGoogleOAuthLinkDecision,
  evaluateOAuthStateRecord,
  googleProfileUpdatesForEmptyFields,
  hashGoogleOAuthMaterial,
  normalizeOAuthReturnPath,
  type GoogleOAuthCredential,
  type GoogleOAuthCustomerRecord,
  type GoogleOAuthIdentity,
  type GoogleOAuthProvider,
  type GoogleOAuthProviderLinkRecord as DomainGoogleOAuthProviderLinkRecord,
  type GoogleOAuthStateRecord,
} from "@/domain/auth/google-oauth";
import {
  createSessionCredential,
  type SessionCredential,
} from "@/domain/auth/session-credentials";
import { hashSessionToken } from "@/lib/crypto/session-token";
import { GeneralError, type ErrorCodeType } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import type {
  AuthRateLimiter,
  AuthRateLimitInput,
  AuthenticatedActor,
} from "./AuthService";

export type GoogleOAuthProviderLinkRecord =
  DomainGoogleOAuthProviderLinkRecord & {
    provider: GoogleOAuthProvider;
    providerUserId: string;
  };

export type CreateOAuthStateInput = {
  provider: GoogleOAuthProvider;
  stateHash: string;
  nonceHash: string;
  redirectPath: string;
  expiresAt: string;
  requestId: string;
  sourceHash?: string;
  createdAt: string;
};

export type LinkGoogleCustomerSessionInput = {
  customerId: string;
  provider: GoogleOAuthProvider;
  providerUserId: string;
  providerMetadata: Record<string, unknown>;
  profileUpdates: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    emailVerifiedAt?: string;
  };
  sessionTokenHash: string;
  sessionExpiresAt: string;
  requestId: string;
  sourceHash?: string;
  createdAt: string;
};

export type CreateGoogleCustomerLinkSessionInput = {
  email: string;
  emailVerifiedAt: string;
  provider: GoogleOAuthProvider;
  providerUserId: string;
  providerMetadata: Record<string, unknown>;
  profile: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  sessionTokenHash: string;
  sessionExpiresAt: string;
  requestId: string;
  sourceHash?: string;
  createdAt: string;
};

type GoogleOAuthSessionCreationInput = {
  sessionTokenHash: string;
  sessionExpiresAt: string;
  requestId: string;
  sourceHash?: string;
  createdAt: string;
};

export type GoogleOAuthRepository = {
  createOAuthState(
    input: CreateOAuthStateInput
  ): Promise<GoogleOAuthStateRecord>;
  findOAuthStateByHash(input: {
    provider: GoogleOAuthProvider;
    stateHash: string;
  }): Promise<GoogleOAuthStateRecord | null>;
  consumeOAuthState(input: {
    provider: GoogleOAuthProvider;
    stateHash: string;
    usedAt: string;
  }): Promise<boolean>;
  findProviderLink(input: {
    provider: GoogleOAuthProvider;
    providerUserId: string;
  }): Promise<GoogleOAuthProviderLinkRecord | null>;
  findCustomerByEmail(email: string): Promise<GoogleOAuthCustomerRecord | null>;
  createSessionForCustomer(input: {
    customerId: string;
    sessionTokenHash: string;
    sessionExpiresAt: string;
    requestId: string;
    sourceHash?: string;
    createdAt: string;
  }): Promise<boolean>;
  linkCustomerAndCreateSession(
    input: LinkGoogleCustomerSessionInput
  ): Promise<GoogleOAuthCustomerRecord | null>;
  createCustomerLinkAndSession(
    input: CreateGoogleCustomerLinkSessionInput
  ): Promise<GoogleOAuthCustomerRecord | null>;
};

export type GoogleOAuthProviderPort = {
  createAuthorizationUrl(input: { state: string; nonce: string }): string;
  exchangeCodeForIdentity(input: {
    code: string;
    expectedNonceHash: string;
  }): Promise<AppResult<GoogleOAuthIdentity>>;
};

export type GoogleOAuthServiceOptions = {
  repository: GoogleOAuthRepository;
  provider: GoogleOAuthProviderPort;
  operationalLogger?: OperationalLogger;
  rateLimiter?: AuthRateLimiter;
  now?: () => Date;
  createOAuthCredential?: () => Promise<GoogleOAuthCredential>;
  createSessionCredential?: () => Promise<SessionCredential>;
  stateTtlSeconds?: number;
  sessionTtlSeconds?: number;
  rateLimitWindowSeconds?: number;
  rateLimitMaxAttempts?: number;
};

export type StartGoogleOAuthInput = {
  returnTo?: unknown;
  requestId: string;
  sourceIpHash?: string;
};

export type HandleGoogleOAuthCallbackInput = {
  code?: unknown;
  state?: unknown;
  providerError?: unknown;
  requestId: string;
  sourceIpHash?: string;
};

export type GoogleOAuthStartResult = {
  redirectUrl: string;
};

export type GoogleOAuthSessionResult = {
  actor: AuthenticatedActor;
  session: {
    token: string;
    expiresAt: string;
  };
  redirectPath: string;
};

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60 * 15;
const DEFAULT_RATE_LIMIT_MAX_ATTEMPTS = 10;

const noopRateLimiter: AuthRateLimiter = {
  isLimited: async () => false,
  recordFailure: async () => undefined,
  reset: async () => undefined,
};

function serviceError(
  code: ErrorCodeType,
  reason?: string
): GeneralError<Record<string, unknown>> {
  return new GeneralError(reason ? { reason } : {}, code);
}

function storageError(operation: string) {
  return new GeneralError(
    {
      reason: "google_oauth_storage_unavailable",
      operation,
    },
    "PROVIDER_UNAVAILABLE"
  );
}

function isStorageError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return /D1_|SQLITE_|database|no such table|no such column|prepare|execute|query/i.test(
    error.message
  );
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return /UNIQUE constraint failed|SQLITE_CONSTRAINT|D1_.*constraint/i.test(
    error.message
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toIsoAfterSeconds(now: Date, seconds: number): string {
  return new Date(now.getTime() + seconds * 1000).toISOString();
}

function actorFromCustomer(
  customer: GoogleOAuthCustomerRecord
): AuthenticatedActor {
  return {
    id: customer.id,
    role: "CUSTOMER",
    accountStatus: {
      status: customer.status,
      emailVerified: Boolean(customer.emailVerifiedAt),
      approved: true,
    },
  };
}

function profileFromIdentity(identity: GoogleOAuthIdentity) {
  return {
    displayName: identity.name,
    firstName: identity.givenName,
    lastName: identity.familyName,
    avatarUrl: identity.picture,
  };
}

function safeProviderMetadata(identity: GoogleOAuthIdentity) {
  return {
    sub: identity.sub,
    normalizedEmail: normalizeEmail(identity.email),
    email_verified: identity.emailVerified,
    ...(identity.name ? { name: identity.name } : {}),
    ...(identity.picture ? { picture: identity.picture } : {}),
  };
}

export class GoogleOAuthService {
  private readonly repository: GoogleOAuthRepository;
  private readonly provider: GoogleOAuthProviderPort;
  private readonly operationalLogger: OperationalLogger;
  private readonly rateLimiter: AuthRateLimiter;
  private readonly now: () => Date;
  private readonly createOAuthCredential: () => Promise<GoogleOAuthCredential>;
  private readonly createSessionCredential: () => Promise<SessionCredential>;
  private readonly sessionTtlSeconds: number;
  private readonly rateLimitWindowSeconds: number;
  private readonly rateLimitMaxAttempts: number;

  constructor(options: GoogleOAuthServiceOptions) {
    this.repository = options.repository;
    this.provider = options.provider;
    this.operationalLogger = options.operationalLogger ?? noopOperationalLogger;
    this.rateLimiter = options.rateLimiter ?? noopRateLimiter;
    this.now = options.now ?? (() => new Date());
    this.createOAuthCredential =
      options.createOAuthCredential ??
      (() =>
        createGoogleOAuthCredential({
          now: this.now(),
          ttlSeconds: options.stateTtlSeconds,
        }));
    this.createSessionCredential =
      options.createSessionCredential ?? createSessionCredential;
    this.sessionTtlSeconds =
      options.sessionTtlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
    this.rateLimitWindowSeconds =
      options.rateLimitWindowSeconds ?? DEFAULT_RATE_LIMIT_WINDOW_SECONDS;
    this.rateLimitMaxAttempts =
      options.rateLimitMaxAttempts ?? DEFAULT_RATE_LIMIT_MAX_ATTEMPTS;
  }

  private log(input: {
    requestId: string;
    errorCode?: ErrorCodeType;
    safeActorId?: string;
    targetResourceId: string;
    details?: Record<string, unknown>;
  }): void {
    try {
      this.operationalLogger.record(
        createOperationalLogEvent({
          requestId: input.requestId,
          actorRole: input.safeActorId ? "CUSTOMER" : "PROSPECT",
          safeActorId: input.safeActorId,
          errorCode: input.errorCode,
          targetResourceId: input.targetResourceId,
          details: input.details,
        })
      );
    } catch {
      // Logging must not change OAuth outcomes.
    }
  }

  private storageFailure(
    operation: string,
    requestId: string,
    cause: unknown
  ): AppResult<never> {
    this.log({
      requestId,
      errorCode: "PROVIDER_UNAVAILABLE",
      targetResourceId: "google-oauth-storage",
      details: {
        reason: "google_oauth_storage_unavailable",
        operation,
        cause,
      },
    });

    return Result.error(storageError(operation));
  }

  private providerFailure(
    requestId: string,
    error: GeneralError<unknown>
  ): AppResult<never> {
    const code =
      error.code === "PROVIDER_UNAVAILABLE"
        ? "PROVIDER_UNAVAILABLE"
        : "AUTHENTICATION";

    this.log({
      requestId,
      errorCode: code,
      targetResourceId: "google-oauth-provider",
      details: {
        reason: "google_provider_failed",
        providerError: error,
      },
    });

    return Result.error(serviceError(code, "google_provider_failed"));
  }

  private async rateLimitInput(
    input: StartGoogleOAuthInput
  ): Promise<AuthRateLimitInput> {
    return {
      scopeHash: await hashSessionToken(
        `oauth-login:${input.sourceIpHash ?? "unknown-source"}`
      ),
      now: this.now(),
      windowSeconds: this.rateLimitWindowSeconds,
      maxAttempts: this.rateLimitMaxAttempts,
    };
  }

  private async consumeAttempt(input: StartGoogleOAuthInput): Promise<boolean> {
    const rateLimit = await this.rateLimitInput(input);

    if (this.rateLimiter.consumeAttempt) {
      return this.rateLimiter.consumeAttempt(rateLimit);
    }

    if (await this.rateLimiter.isLimited(rateLimit)) {
      return false;
    }

    await this.rateLimiter.recordFailure(rateLimit);
    return true;
  }

  private async recoverConcurrentProviderLink(input: {
    identity: GoogleOAuthIdentity;
    session: GoogleOAuthSessionCreationInput;
  }): Promise<GoogleOAuthCustomerRecord | null> {
    const normalizedEmail = normalizeEmail(input.identity.email);
    const [providerLink, customerByEmail] = await Promise.all([
      this.repository.findProviderLink({
        provider: GOOGLE_OAUTH_PROVIDER,
        providerUserId: input.identity.sub,
      }),
      this.repository.findCustomerByEmail(normalizedEmail),
    ]);
    const decision = evaluateGoogleOAuthLinkDecision({
      identity: input.identity,
      providerLink,
      customerByEmail,
    });

    if (!decision.ok || decision.action !== "sign-in-linked") {
      return null;
    }

    const created = await this.repository.createSessionForCustomer({
      customerId: decision.customerId,
      ...input.session,
    });

    return created ? decision.customer : null;
  }

  async startSession(
    input: StartGoogleOAuthInput
  ): Promise<AppResult<GoogleOAuthStartResult>> {
    try {
      if (!(await this.consumeAttempt(input))) {
        return Result.error(serviceError("RATE_LIMITED"));
      }

      const redirectPath = normalizeOAuthReturnPath(input.returnTo);
      const credential = await this.createOAuthCredential();
      const createdAt = this.now().toISOString();

      await this.repository.createOAuthState({
        provider: GOOGLE_OAUTH_PROVIDER,
        stateHash: credential.stateHash,
        nonceHash: credential.nonceHash,
        redirectPath,
        expiresAt: credential.expiresAt,
        requestId: input.requestId,
        sourceHash: input.sourceIpHash,
        createdAt,
      });

      return Result.okay({
        redirectUrl: this.provider.createAuthorizationUrl({
          state: credential.state,
          nonce: credential.nonce,
        }),
      });
    } catch (error) {
      if (isStorageError(error)) {
        return this.storageFailure(
          "start-google-oauth",
          input.requestId,
          error
        );
      }

      throw error;
    }
  }

  private validateCallbackInput(
    input: HandleGoogleOAuthCallbackInput
  ):
    | { ok: true; state: string; code: string }
    | { ok: false; code: ErrorCodeType; reason: string } {
    if (typeof input.providerError === "string" && input.providerError) {
      return {
        ok: false,
        code: "AUTHENTICATION",
        reason: "google_provider_error",
      };
    }

    if (typeof input.state !== "string" || input.state.length === 0) {
      return { ok: false, code: "VALIDATION_FAILED", reason: "state_missing" };
    }

    if (typeof input.code !== "string" || input.code.length === 0) {
      return { ok: false, code: "VALIDATION_FAILED", reason: "code_missing" };
    }

    return {
      ok: true,
      state: input.state,
      code: input.code,
    };
  }

  async handleCallback(
    input: HandleGoogleOAuthCallbackInput
  ): Promise<AppResult<GoogleOAuthSessionResult>> {
    const validation = this.validateCallbackInput(input);
    if (!validation.ok) {
      this.log({
        requestId: input.requestId,
        errorCode: validation.code,
        targetResourceId: "google-oauth-callback",
        details: { reason: validation.reason },
      });
      return Result.error(serviceError(validation.code, validation.reason));
    }

    try {
      const stateHash = await hashGoogleOAuthMaterial(validation.state);
      const now = this.now();
      const stateRecord = await this.repository.findOAuthStateByHash({
        provider: GOOGLE_OAUTH_PROVIDER,
        stateHash,
      });
      const stateDecision = evaluateOAuthStateRecord({
        record: stateRecord,
        now,
        sourceHash: input.sourceIpHash,
      });

      if (!stateDecision.ok) {
        return Result.error(
          serviceError(stateDecision.code, stateDecision.reason)
        );
      }

      const consumed = await this.repository.consumeOAuthState({
        provider: GOOGLE_OAUTH_PROVIDER,
        stateHash,
        usedAt: now.toISOString(),
      });

      if (!consumed) {
        return Result.error(serviceError("CONFLICT_STATE", "STATE_REUSED"));
      }

      const identityResult = await this.provider.exchangeCodeForIdentity({
        code: validation.code,
        expectedNonceHash: stateDecision.record.nonceHash,
      });

      if (identityResult.error) {
        return this.providerFailure(input.requestId, identityResult.error);
      }

      const identity = identityResult.content;
      const normalizedEmail = normalizeEmail(identity.email);
      const [providerLink, customerByEmail] = await Promise.all([
        this.repository.findProviderLink({
          provider: GOOGLE_OAUTH_PROVIDER,
          providerUserId: identity.sub,
        }),
        this.repository.findCustomerByEmail(normalizedEmail),
      ]);
      const decision = evaluateGoogleOAuthLinkDecision({
        identity,
        providerLink,
        customerByEmail,
      });

      if (!decision.ok) {
        this.log({
          requestId: input.requestId,
          errorCode: decision.code,
          safeActorId:
            providerLink?.customerId ?? customerByEmail?.id ?? undefined,
          targetResourceId: "google-oauth-link",
          details: { reason: decision.reason },
        });
        return Result.error(serviceError(decision.code, decision.reason));
      }

      const sessionCredential = await this.createSessionCredential();
      const issuedAt = this.now();
      const sessionExpiresAt = toIsoAfterSeconds(
        issuedAt,
        this.sessionTtlSeconds
      );
      const providerMetadata = safeProviderMetadata(identity);
      const baseSessionInput = {
        sessionTokenHash: sessionCredential.tokenHash,
        sessionExpiresAt,
        requestId: input.requestId,
        sourceHash: input.sourceIpHash,
        createdAt: issuedAt.toISOString(),
      };
      let customer: GoogleOAuthCustomerRecord | null;

      try {
        if (decision.action === "sign-in-linked") {
          const created = await this.repository.createSessionForCustomer({
            customerId: decision.customerId,
            ...baseSessionInput,
          });
          customer = created ? decision.customer : null;
        } else if (decision.action === "link-existing-customer") {
          customer = await this.repository.linkCustomerAndCreateSession({
            customerId: decision.customerId,
            provider: GOOGLE_OAUTH_PROVIDER,
            providerUserId: identity.sub,
            providerMetadata,
            profileUpdates: googleProfileUpdatesForEmptyFields({
              customer: decision.customer,
              identity,
              now: issuedAt,
            }),
            ...baseSessionInput,
          });
        } else {
          customer = await this.repository.createCustomerLinkAndSession({
            email: normalizedEmail,
            emailVerifiedAt: issuedAt.toISOString(),
            provider: GOOGLE_OAUTH_PROVIDER,
            providerUserId: identity.sub,
            providerMetadata,
            profile: profileFromIdentity(identity),
            ...baseSessionInput,
          });
        }
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        customer = await this.recoverConcurrentProviderLink({
          identity,
          session: baseSessionInput,
        });
      }

      if (!customer) {
        return Result.error(
          serviceError("CONFLICT_STATE", "GOOGLE_LINK_SESSION_CONFLICT")
        );
      }

      return Result.okay({
        actor: actorFromCustomer(customer),
        session: {
          token: sessionCredential.sessionToken,
          expiresAt: sessionExpiresAt,
        },
        redirectPath: stateDecision.record.redirectPath,
      });
    } catch (error) {
      if (isStorageError(error)) {
        return this.storageFailure(
          "handle-google-oauth-callback",
          input.requestId,
          error
        );
      }

      throw error;
    }
  }
}
