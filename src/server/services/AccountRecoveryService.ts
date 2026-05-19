import {
  createOperationalLogEvent,
  noopOperationalLogger,
  type OperationalLogger,
} from "@/adapter/infrastructure/logging/operational-log";
import {
  createEmailVerificationCredential,
  type EmailVerificationCredential,
} from "@/domain/auth/email-verification-token";
import {
  evaluateEmailVerificationResendState,
  evaluatePasswordResetRequestState,
  evaluatePasswordResetTokenState,
  validateRecoveryEmail,
  validateResetConfirmation,
  type PasswordResetTokenRecord as DomainPasswordResetTokenRecord,
  type RecoveryAccountRecord as DomainRecoveryAccountRecord,
  type RecoveryActorKind,
} from "@/domain/auth/account-recovery";
import {
  createPasswordResetCredential,
  hashPasswordResetToken,
  type PasswordResetCredential,
} from "@/domain/auth/password-reset-token";
import { createCustomerPasswordCredential } from "@/domain/customers/customer-account";
import type { AccountEmailNotifier } from "@/domain/notifications/account-emails";
import { hashSessionToken } from "@/lib/crypto/session-token";
import { GeneralError, type ErrorCodeType } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import type { AuthRateLimiter, AuthRateLimitInput } from "./AuthService";

export type RecoveryAccountRecord = DomainRecoveryAccountRecord & {
  passwordHash: string | null;
  passwordSalt: string | null;
};

export type AccountRecoveryLookup = {
  admin: RecoveryAccountRecord | null;
  customer: RecoveryAccountRecord | null;
};

export type PasswordResetTokenRecord = DomainPasswordResetTokenRecord;

export type RecoveryEmailVerificationTokenRecord = {
  id: string;
  customerId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
};

export type CreatePasswordResetTokenInput = {
  actorKind: RecoveryActorKind;
  actorId: string;
  tokenHash: string;
  expiresAt: string;
  requestId: string;
  sourceHash?: string;
  createdAt: string;
};

export type CreateRecoveryEmailVerificationTokenInput = {
  customerId: string;
  tokenHash: string;
  expiresAt: string;
  requestId: string;
  sourceHash?: string;
  createdAt: string;
};

export type ConsumePasswordResetTokenInput = {
  tokenHash: string;
  actorKind: RecoveryActorKind;
  actorId: string;
  passwordHash: string;
  passwordSalt: string;
  usedAt: string;
};

export type AccountRecoveryRepository = {
  findAccountsByEmail(email: string): Promise<AccountRecoveryLookup>;
  createPasswordResetToken(
    input: CreatePasswordResetTokenInput
  ): Promise<PasswordResetTokenRecord | null>;
  createEmailVerificationToken(
    input: CreateRecoveryEmailVerificationTokenInput
  ): Promise<RecoveryEmailVerificationTokenRecord | null>;
  findPasswordResetTokenByHash(
    tokenHash: string
  ): Promise<PasswordResetTokenRecord | null>;
  consumePasswordResetToken(
    input: ConsumePasswordResetTokenInput
  ): Promise<boolean>;
};

export type RecoveryAcceptedResult = {
  accepted: true;
};

export type PasswordResetConfirmedResult = {
  reset: true;
};

export type RequestPasswordResetInput = {
  email: unknown;
  requestId: string;
  sourceIpHash?: string;
};

export type ConfirmPasswordResetInput = {
  token: unknown;
  password: unknown;
  requestId: string;
  sourceIpHash?: string;
};

export type RequestEmailVerificationInput = {
  email: unknown;
  requestId: string;
  sourceIpHash?: string;
};

export type AccountRecoveryServiceOptions = {
  repository: AccountRecoveryRepository;
  accountEmails: AccountEmailNotifier;
  passwordPepper: string;
  operationalLogger?: OperationalLogger;
  rateLimiter?: AuthRateLimiter;
  rateLimitWindowSeconds?: number;
  rateLimitMaxAttempts?: number;
  confirmRateLimitWindowSeconds?: number;
  confirmRateLimitMaxAttempts?: number;
  now?: () => Date;
  createResetCredential?: () => Promise<PasswordResetCredential>;
  createVerificationCredential?: () => Promise<EmailVerificationCredential>;
  realm?: RecoveryActorKind | "BOTH";
};

export type { AccountEmailNotifier };

const EMAIL_TOKEN_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const EMAIL_TOKEN_RATE_LIMIT_MAX_ATTEMPTS = 3;
const CONFIRM_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const CONFIRM_RATE_LIMIT_MAX_ATTEMPTS = 3;
const ACCEPTED_RESULT: RecoveryAcceptedResult = { accepted: true };

const noopRateLimiter: AuthRateLimiter = {
  isLimited: async () => false,
  recordFailure: async () => undefined,
  reset: async () => undefined,
};

function serviceError(
  code: ErrorCodeType
): GeneralError<Record<string, never>> {
  return new GeneralError({}, code);
}

function storageError(operation: string): GeneralError<{
  reason: "account_recovery_storage_unavailable";
  operation: string;
}> {
  return new GeneralError(
    {
      reason: "account_recovery_storage_unavailable",
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

export class AccountRecoveryService {
  private readonly repository: AccountRecoveryRepository;
  private readonly accountEmails: AccountEmailNotifier;
  private readonly passwordPepper: string;
  private readonly operationalLogger: OperationalLogger;
  private readonly rateLimiter: AuthRateLimiter;
  private readonly rateLimitWindowSeconds: number;
  private readonly rateLimitMaxAttempts: number;
  private readonly confirmRateLimitWindowSeconds: number;
  private readonly confirmRateLimitMaxAttempts: number;
  private readonly now: () => Date;
  private readonly createResetCredential: () => Promise<PasswordResetCredential>;
  private readonly createVerificationCredential: () => Promise<EmailVerificationCredential>;
  private readonly realm: RecoveryActorKind | "BOTH";

  constructor(options: AccountRecoveryServiceOptions) {
    this.repository = options.repository;
    this.accountEmails = options.accountEmails;
    this.passwordPepper = options.passwordPepper;
    this.operationalLogger = options.operationalLogger ?? noopOperationalLogger;
    this.rateLimiter = options.rateLimiter ?? noopRateLimiter;
    this.rateLimitWindowSeconds =
      options.rateLimitWindowSeconds ?? EMAIL_TOKEN_RATE_LIMIT_WINDOW_SECONDS;
    this.rateLimitMaxAttempts =
      options.rateLimitMaxAttempts ?? EMAIL_TOKEN_RATE_LIMIT_MAX_ATTEMPTS;
    this.confirmRateLimitWindowSeconds =
      options.confirmRateLimitWindowSeconds ??
      CONFIRM_RATE_LIMIT_WINDOW_SECONDS;
    this.confirmRateLimitMaxAttempts =
      options.confirmRateLimitMaxAttempts ?? CONFIRM_RATE_LIMIT_MAX_ATTEMPTS;
    this.now = options.now ?? (() => new Date());
    this.createResetCredential =
      options.createResetCredential ??
      (() => createPasswordResetCredential({ now: this.now() }));
    this.createVerificationCredential =
      options.createVerificationCredential ??
      (() => createEmailVerificationCredential({ now: this.now() }));
    this.realm = options.realm ?? "BOTH";
  }

  private log(input: {
    requestId: string;
    errorCode?: ErrorCodeType;
    actorRole?: "ADMIN" | "CUSTOMER" | "PROSPECT";
    safeActorId?: string;
    targetResourceId: string;
    details?: Record<string, unknown>;
  }): void {
    try {
      this.operationalLogger.record(
        createOperationalLogEvent({
          requestId: input.requestId,
          errorCode: input.errorCode,
          actorRole: input.actorRole,
          safeActorId: input.safeActorId,
          targetResourceId: input.targetResourceId,
          details: input.details,
        })
      );
    } catch {
      // Logging must not change account recovery outcomes.
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
      targetResourceId: "account-recovery-storage",
      details: {
        reason: "account_recovery_storage_unavailable",
        operation,
        cause,
      },
    });

    return Result.error(storageError(operation));
  }

  private async emailRateLimitInput(input: {
    email: string;
    sourceIpHash?: string;
  }): Promise<AuthRateLimitInput> {
    return {
      scopeHash: await hashSessionToken(`email-token:${input.email}`),
      now: this.now(),
      windowSeconds: this.rateLimitWindowSeconds,
      maxAttempts: this.rateLimitMaxAttempts,
    };
  }

  private async confirmRateLimitInput(input: {
    tokenHash: string;
    sourceIpHash?: string;
  }): Promise<AuthRateLimitInput> {
    return {
      scopeHash: await hashSessionToken(
        `email-token:reset-confirm:${input.tokenHash}:${
          input.sourceIpHash ?? "unknown-source"
        }`
      ),
      now: this.now(),
      windowSeconds: this.confirmRateLimitWindowSeconds,
      maxAttempts: this.confirmRateLimitMaxAttempts,
    };
  }

  private async consumeAcceptedAttempt(
    rateLimit: AuthRateLimitInput
  ): Promise<boolean> {
    if (this.rateLimiter.consumeAttempt) {
      return this.rateLimiter.consumeAttempt(rateLimit);
    }

    if (await this.rateLimiter.isLimited(rateLimit)) {
      return false;
    }

    await this.rateLimiter.recordFailure(rateLimit);
    return true;
  }

  private logNonTokenDecision(input: {
    requestId: string;
    targetResourceId: string;
    reason: string;
  }): void {
    this.log({
      requestId: input.requestId,
      targetResourceId: input.targetResourceId,
      details: {
        reason: input.reason,
      },
    });
  }

  private lookupForRealm(lookup: AccountRecoveryLookup): AccountRecoveryLookup {
    if (this.realm === "ADMIN") {
      return { admin: lookup.admin, customer: null };
    }

    if (this.realm === "CUSTOMER") {
      return { admin: null, customer: lookup.customer };
    }

    return lookup;
  }

  async requestPasswordReset(
    input: RequestPasswordResetInput
  ): Promise<AppResult<RecoveryAcceptedResult>> {
    const validation = validateRecoveryEmail(input.email);

    if (!validation.ok) {
      return Result.error(serviceError(validation.code));
    }

    try {
      const rateLimit = await this.emailRateLimitInput({
        email: validation.value.email,
        sourceIpHash: input.sourceIpHash,
      });

      if (!(await this.consumeAcceptedAttempt(rateLimit))) {
        return Result.error(serviceError("RATE_LIMITED"));
      }

      const lookup = await this.repository.findAccountsByEmail(
        validation.value.email
      );
      const decision = evaluatePasswordResetRequestState(
        this.lookupForRealm(lookup)
      );

      if (decision.action === "accept-without-token") {
        this.logNonTokenDecision({
          requestId: input.requestId,
          targetResourceId: "password-reset-request",
          reason: decision.reason,
        });
        return Result.okay(ACCEPTED_RESULT);
      }

      const createdAt = this.now().toISOString();
      const credential = await this.createResetCredential();
      const token = await this.repository.createPasswordResetToken({
        actorKind: decision.account.actorKind,
        actorId: decision.account.id,
        tokenHash: credential.tokenHash,
        expiresAt: credential.expiresAt,
        requestId: input.requestId,
        sourceHash: input.sourceIpHash,
        createdAt,
      });

      if (!token) {
        this.logNonTokenDecision({
          requestId: input.requestId,
          targetResourceId: "password-reset-request",
          reason: "ACCOUNT_MISSING_AT_TOKEN_CREATE",
        });
        return Result.okay(ACCEPTED_RESULT);
      }

      const sendResult = await this.accountEmails.sendPasswordResetEmail({
        toEmail: decision.account.email,
        token: credential.token,
        expiresAt: credential.expiresAt,
        requestId: input.requestId,
      });

      if (!sendResult.ok) {
        this.log({
          requestId: input.requestId,
          errorCode: "PROVIDER_UNAVAILABLE",
          actorRole: decision.account.actorKind,
          safeActorId: decision.account.id,
          targetResourceId: "password-reset-email",
          details: {
            providerError: sendResult.error,
          },
        });
      }

      return Result.okay(ACCEPTED_RESULT);
    } catch (error) {
      if (isStorageError(error)) {
        return this.storageFailure(
          "request-password-reset",
          input.requestId,
          error
        );
      }

      throw error;
    }
  }

  async confirmPasswordReset(
    input: ConfirmPasswordResetInput
  ): Promise<AppResult<PasswordResetConfirmedResult>> {
    const validation = validateResetConfirmation({
      token: input.token,
      password: input.password,
    });

    if (!validation.ok) {
      return Result.error(serviceError(validation.code));
    }

    try {
      const tokenHash = await hashPasswordResetToken(validation.value.token);
      const rateLimit = await this.confirmRateLimitInput({
        tokenHash,
        sourceIpHash: input.sourceIpHash,
      });

      if (await this.rateLimiter.isLimited(rateLimit)) {
        return Result.error(serviceError("RATE_LIMITED"));
      }

      const tokenRecord =
        await this.repository.findPasswordResetTokenByHash(tokenHash);
      const decision = evaluatePasswordResetTokenState({
        record: tokenRecord,
        now: this.now(),
      });

      if (
        !decision.ok ||
        (this.realm !== "BOTH" && decision.actorKind !== this.realm)
      ) {
        await this.rateLimiter.recordFailure(rateLimit);
        return Result.error(
          serviceError(decision.ok ? "RESOURCE_NOT_FOUND" : decision.code)
        );
      }

      const passwordCredential = await createCustomerPasswordCredential({
        password: validation.value.password,
        pepper: this.passwordPepper,
      });
      const usedAt = this.now().toISOString();
      const consumed = await this.repository.consumePasswordResetToken({
        tokenHash,
        actorKind: decision.actorKind,
        actorId: decision.actorId,
        passwordHash: passwordCredential.passwordHash,
        passwordSalt: passwordCredential.passwordSalt,
        usedAt,
      });

      if (!consumed) {
        await this.rateLimiter.recordFailure(rateLimit);
        return Result.error(serviceError("CONFLICT_STATE"));
      }

      await this.rateLimiter.reset({ scopeHash: rateLimit.scopeHash });
      return Result.okay({ reset: true });
    } catch (error) {
      if (isStorageError(error)) {
        return this.storageFailure(
          "confirm-password-reset",
          input.requestId,
          error
        );
      }

      throw error;
    }
  }

  async requestEmailVerification(
    input: RequestEmailVerificationInput
  ): Promise<AppResult<RecoveryAcceptedResult>> {
    const validation = validateRecoveryEmail(input.email);

    if (!validation.ok) {
      return Result.error(serviceError(validation.code));
    }

    try {
      const rateLimit = await this.emailRateLimitInput({
        email: validation.value.email,
        sourceIpHash: input.sourceIpHash,
      });

      if (!(await this.consumeAcceptedAttempt(rateLimit))) {
        return Result.error(serviceError("RATE_LIMITED"));
      }

      const lookup = await this.repository.findAccountsByEmail(
        validation.value.email
      );
      const decision = evaluateEmailVerificationResendState(
        this.lookupForRealm(lookup)
      );

      if (decision.action === "accept-without-token") {
        this.logNonTokenDecision({
          requestId: input.requestId,
          targetResourceId: "email-verification-request",
          reason: decision.reason,
        });
        return Result.okay(ACCEPTED_RESULT);
      }

      const credential = await this.createVerificationCredential();
      const token = await this.repository.createEmailVerificationToken({
        customerId: decision.customerId,
        tokenHash: credential.tokenHash,
        expiresAt: credential.expiresAt,
        requestId: input.requestId,
        sourceHash: input.sourceIpHash,
        createdAt: this.now().toISOString(),
      });

      if (!token) {
        this.logNonTokenDecision({
          requestId: input.requestId,
          targetResourceId: "email-verification-request",
          reason: "CUSTOMER_MISSING_AT_TOKEN_CREATE",
        });
        return Result.okay(ACCEPTED_RESULT);
      }

      const sendResult = await this.accountEmails.sendVerificationEmail({
        toEmail: decision.email,
        token: credential.token,
        expiresAt: credential.expiresAt,
        requestId: input.requestId,
      });

      if (!sendResult.ok) {
        this.log({
          requestId: input.requestId,
          errorCode: "PROVIDER_UNAVAILABLE",
          actorRole: "CUSTOMER",
          safeActorId: decision.customerId,
          targetResourceId: "customer-verification-email",
          details: {
            providerError: sendResult.error,
          },
        });
      }

      return Result.okay(ACCEPTED_RESULT);
    } catch (error) {
      if (isStorageError(error)) {
        return this.storageFailure(
          "request-email-verification",
          input.requestId,
          error
        );
      }

      throw error;
    }
  }
}
