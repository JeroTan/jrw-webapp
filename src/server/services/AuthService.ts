import {
  createOperationalLogEvent,
  noopOperationalLogger,
  type OperationalLogger,
} from "@/adapter/infrastructure/logging/operational-log";
import {
  deriveActorRole,
  evaluateAccountEligibility,
  evaluateCredentialFailure,
  evaluateSessionState,
  type AccountStatus,
  type AuthActorKind,
  type SessionStatus,
} from "@/domain/auth/auth-decisions";
import {
  verifyPasswordCredential,
  verifyPasswordCredentialTimingDummy,
} from "@/domain/auth/password-credentials";
import { createSessionCredential } from "@/domain/auth/session-credentials";
import { hashSessionToken } from "@/lib/crypto/session-token";
import { GeneralError, type ErrorCodeType } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

export type AuthAccountRecord = {
  actorKind: AuthActorKind;
  id: string;
  email: string;
  passwordHash: string | null;
  passwordSalt: string | null;
  status: AccountStatus;
  isOwner?: boolean;
  emailVerifiedAt?: string | null;
  approvedAt?: string | null;
};

export type AuthSessionRecord = {
  id: string;
  tokenHash: string;
  actorKind: AuthActorKind;
  actorId: string;
  status: SessionStatus;
  expiresAt: string;
  revokedAt: string | null;
};

export type CreateSessionInput = {
  tokenHash: string;
  actorKind: AuthActorKind;
  actorId: string;
  expiresAt: string;
  requestId?: string;
  sourceIpHash?: string;
};

export type AuthAccountRepository = {
  findByEmail(email: string): Promise<AuthAccountRecord | null>;
  findByActor(
    actorKind: AuthActorKind,
    actorId: string
  ): Promise<AuthAccountRecord | null>;
};

export type AuthSessionRepository = {
  createSession(input: CreateSessionInput): Promise<AuthSessionRecord>;
  findByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null>;
  revokeByTokenHash(tokenHash: string, revokedAt: string): Promise<boolean>;
  touchSession(sessionId: string, lastUsedAt: string): Promise<void>;
};

export type AuthRateLimitInput = {
  scopeHash: string;
  now: Date;
  windowSeconds: number;
  maxAttempts: number;
};

export type AuthRateLimiter = {
  isLimited(input: AuthRateLimitInput): Promise<boolean>;
  recordFailure(input: AuthRateLimitInput): Promise<void>;
  consumeAttempt?(input: AuthRateLimitInput): Promise<boolean>;
  reset(input: Pick<AuthRateLimitInput, "scopeHash">): Promise<void>;
};

export type AuthenticatedActor = {
  id: string;
  role: ReturnType<typeof deriveActorRole>;
  accountStatus: {
    status: AccountStatus;
    emailVerified: boolean;
    approved: boolean;
  };
};

export type SignInResult = {
  actor: AuthenticatedActor;
  session: {
    token: string;
    expiresAt: string;
  };
};

export type SignOutResult = {
  cleared: true;
  revoked: boolean;
};

export type SessionInspectionResult = {
  authenticated: boolean;
  actor: AuthenticatedActor | null;
  session: {
    expiresAt: string;
  } | null;
};

export type AuthServiceOptions = {
  accounts: AuthAccountRepository;
  sessions: AuthSessionRepository;
  passwordPepper: string;
  operationalLogger?: OperationalLogger;
  rateLimiter?: AuthRateLimiter;
  sessionTtlSeconds?: number;
  rateLimitWindowSeconds?: number;
  rateLimitMaxAttempts?: number;
  now?: () => Date;
};

export type SignInInput = {
  email: string;
  password: string;
  requestId: string;
  sourceIpHash?: string;
};

export type SignOutInput = {
  sessionToken?: string;
  requestId: string;
};

export type InspectSessionInput = {
  sessionToken?: string;
  requestId: string;
};

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60 * 15;
const DEFAULT_RATE_LIMIT_MAX_ATTEMPTS = 5;

const noopRateLimiter: AuthRateLimiter = {
  isLimited: async () => false,
  recordFailure: async () => undefined,
  reset: async () => undefined,
};

function authError(code: ErrorCodeType): GeneralError<Record<string, never>> {
  return new GeneralError({}, code);
}

function authStorageError(operation: string): GeneralError<{
  reason: "auth_storage_unavailable";
  operation: string;
}> {
  return new GeneralError(
    {
      reason: "auth_storage_unavailable",
      operation,
    },
    "PROVIDER_UNAVAILABLE"
  );
}

function isAuthStorageError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return /D1_|SQLITE_|database|no such table|no such column|prepare|execute|query/i.test(
    error.message
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toIsoAfterSeconds(now: Date, seconds: number): string {
  return new Date(now.getTime() + seconds * 1000).toISOString();
}

function actorFromAccount(account: AuthAccountRecord): AuthenticatedActor {
  return {
    id: account.id,
    role: deriveActorRole({
      actorKind: account.actorKind,
      isOwner: account.isOwner,
    }),
    accountStatus: {
      status: account.status,
      emailVerified: Boolean(account.emailVerifiedAt),
      approved: Boolean(account.isOwner || account.approvedAt),
    },
  };
}

function anonymousSession(): SessionInspectionResult {
  return {
    authenticated: false,
    actor: null,
    session: null,
  };
}

function sessionAccountEligible(account: AuthAccountRecord): boolean {
  if (account.status !== "ACTIVE") {
    return false;
  }

  if (account.actorKind === "CUSTOMER") {
    return Boolean(account.emailVerifiedAt);
  }

  if (account.isOwner) {
    return true;
  }

  return Boolean(account.emailVerifiedAt && account.approvedAt);
}

export class AuthService {
  private readonly accounts: AuthAccountRepository;
  private readonly sessions: AuthSessionRepository;
  private readonly passwordPepper: string;
  private readonly operationalLogger: OperationalLogger;
  private readonly rateLimiter: AuthRateLimiter;
  private readonly sessionTtlSeconds: number;
  private readonly rateLimitWindowSeconds: number;
  private readonly rateLimitMaxAttempts: number;
  private readonly now: () => Date;

  constructor(options: AuthServiceOptions) {
    this.accounts = options.accounts;
    this.sessions = options.sessions;
    this.passwordPepper = options.passwordPepper;
    this.operationalLogger = options.operationalLogger ?? noopOperationalLogger;
    this.rateLimiter = options.rateLimiter ?? noopRateLimiter;
    this.sessionTtlSeconds =
      options.sessionTtlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
    this.rateLimitWindowSeconds =
      options.rateLimitWindowSeconds ?? DEFAULT_RATE_LIMIT_WINDOW_SECONDS;
    this.rateLimitMaxAttempts =
      options.rateLimitMaxAttempts ?? DEFAULT_RATE_LIMIT_MAX_ATTEMPTS;
    this.now = options.now ?? (() => new Date());
  }

  private recordAuthFailure(input: {
    requestId: string;
    errorCode: ErrorCodeType;
    account?: AuthAccountRecord;
  }): void {
    try {
      const actor = input.account ? actorFromAccount(input.account) : undefined;

      this.operationalLogger.record(
        createOperationalLogEvent({
          requestId: input.requestId,
          errorCode: input.errorCode,
          actorRole: actor?.role,
          safeActorId: actor?.id,
          targetResourceId: "auth-session",
        })
      );
    } catch {
      // Logging must not change authentication outcomes.
    }
  }

  private authFailure(
    code: ErrorCodeType,
    requestId: string,
    account?: AuthAccountRecord
  ) {
    this.recordAuthFailure({
      requestId,
      errorCode: code,
      account,
    });

    return Result.error(authError(code));
  }

  private authStorageFailure(
    operation: string,
    requestId: string,
    cause: unknown
  ) {
    try {
      this.operationalLogger.record(
        createOperationalLogEvent({
          requestId,
          errorCode: "PROVIDER_UNAVAILABLE",
          targetResourceId: "auth-storage",
          details: {
            reason: "auth_storage_unavailable",
            operation,
            cause,
          },
        })
      );
    } catch {
      // Logging must not change authentication outcomes.
    }

    return Result.error(authStorageError(operation));
  }

  private async rateLimitInput(
    input: SignInInput
  ): Promise<AuthRateLimitInput> {
    const sourceHash = input.sourceIpHash ?? "unknown-source";
    const scopeHash = await hashSessionToken(
      `auth-password:${normalizeEmail(input.email)}:${sourceHash}`
    );

    return {
      scopeHash,
      now: this.now(),
      windowSeconds: this.rateLimitWindowSeconds,
      maxAttempts: this.rateLimitMaxAttempts,
    };
  }

  private async credentialFailure(
    code: ErrorCodeType,
    requestId: string,
    rateLimit: AuthRateLimitInput,
    account?: AuthAccountRecord
  ) {
    await this.rateLimiter.recordFailure(rateLimit);
    return this.authFailure(code, requestId, account);
  }

  private async signInWithStorage(
    input: SignInInput
  ): Promise<AppResult<SignInResult>> {
    const rateLimit = await this.rateLimitInput(input);

    if (await this.rateLimiter.isLimited(rateLimit)) {
      return this.authFailure("RATE_LIMITED", input.requestId);
    }

    const account = await this.accounts.findByEmail(
      normalizeEmail(input.email)
    );

    if (!account) {
      await verifyPasswordCredentialTimingDummy({
        password: input.password,
        pepper: this.passwordPepper,
      });
      return this.credentialFailure(
        evaluateCredentialFailure("UNKNOWN_ACCOUNT").code,
        input.requestId,
        rateLimit
      );
    }

    const credential = await verifyPasswordCredential({
      password: input.password,
      pepper: this.passwordPepper,
      passwordHash: account.passwordHash,
      passwordSalt: account.passwordSalt,
    });

    if (!credential.ok) {
      return this.credentialFailure(
        credential.code,
        input.requestId,
        rateLimit,
        account
      );
    }

    const eligibility = evaluateAccountEligibility({
      actorKind: account.actorKind,
      status: account.status,
      hasPasswordCredential: Boolean(
        account.passwordHash && account.passwordSalt
      ),
      isOwner: account.isOwner,
      emailVerifiedAt: account.emailVerifiedAt,
      approvedAt: account.approvedAt,
    });

    if (!eligibility.ok) {
      return this.authFailure(eligibility.code, input.requestId, account);
    }

    await this.rateLimiter.reset({ scopeHash: rateLimit.scopeHash });

    const issuedAt = this.now();
    const expiresAt = toIsoAfterSeconds(issuedAt, this.sessionTtlSeconds);
    const credentialPair = await createSessionCredential();

    await this.sessions.createSession({
      tokenHash: credentialPair.tokenHash,
      actorKind: account.actorKind,
      actorId: account.id,
      expiresAt,
      requestId: input.requestId,
      sourceIpHash: input.sourceIpHash,
    });

    return Result.okay({
      actor: actorFromAccount(account),
      session: {
        token: credentialPair.sessionToken,
        expiresAt,
      },
    });
  }

  async signIn(input: SignInInput): Promise<AppResult<SignInResult>> {
    try {
      return await this.signInWithStorage(input);
    } catch (error) {
      if (isAuthStorageError(error)) {
        return this.authStorageFailure("sign-in", input.requestId, error);
      }

      throw error;
    }
  }

  private async signOutWithStorage(
    input: SignOutInput
  ): Promise<AppResult<SignOutResult>> {
    if (!input.sessionToken) {
      return Result.okay({
        cleared: true,
        revoked: false,
      });
    }

    const tokenHash = await hashSessionToken(input.sessionToken);
    const revoked = await this.sessions.revokeByTokenHash(
      tokenHash,
      this.now().toISOString()
    );

    return Result.okay({
      cleared: true,
      revoked,
    });
  }

  async signOut(input: SignOutInput): Promise<AppResult<SignOutResult>> {
    try {
      return await this.signOutWithStorage(input);
    } catch (error) {
      if (isAuthStorageError(error)) {
        return this.authStorageFailure("sign-out", input.requestId, error);
      }

      throw error;
    }
  }

  private async inspectSessionWithStorage(
    input: InspectSessionInput
  ): Promise<AppResult<SessionInspectionResult>> {
    if (!input.sessionToken) {
      return Result.okay(anonymousSession());
    }

    const tokenHash = await hashSessionToken(input.sessionToken);
    const session = await this.sessions.findByTokenHash(tokenHash);
    const sessionState = evaluateSessionState(
      session
        ? {
            status: session.status,
            expiresAt: session.expiresAt,
            revokedAt: session.revokedAt,
          }
        : undefined,
      this.now()
    );

    if (!sessionState.active || !session) {
      return Result.okay(anonymousSession());
    }

    const account = await this.accounts.findByActor(
      session.actorKind,
      session.actorId
    );

    if (!account || !sessionAccountEligible(account)) {
      return Result.okay(anonymousSession());
    }

    await this.sessions.touchSession(session.id, this.now().toISOString());

    return Result.okay({
      authenticated: true,
      actor: actorFromAccount(account),
      session: {
        expiresAt: session.expiresAt,
      },
    });
  }

  async inspectSession(
    input: InspectSessionInput
  ): Promise<AppResult<SessionInspectionResult>> {
    try {
      return await this.inspectSessionWithStorage(input);
    } catch (error) {
      if (isAuthStorageError(error)) {
        return this.authStorageFailure(
          "inspect-session",
          input.requestId,
          error
        );
      }

      throw error;
    }
  }
}
