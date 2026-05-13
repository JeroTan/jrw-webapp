import {
  createOperationalLogEvent,
  noopOperationalLogger,
  type OperationalLogger,
} from "@/adapter/infrastructure/logging/operational-log";
import {
  createEmailVerificationCredential,
  hashEmailVerificationToken,
  type EmailVerificationCredential,
} from "@/domain/auth/email-verification-token";
import {
  createCustomerPasswordCredential,
  evaluateEmailVerificationTokenState,
  evaluateRegistrationAccountState,
  type CustomerProfilePatch,
  validateCustomerProfileUpdate,
  validateCustomerRegistration,
} from "@/domain/customers/customer-account";
import type {
  CustomerVerificationEmailInput,
  CustomerVerificationEmailNotifier,
} from "@/domain/notifications/customer-verification-email";
import { hashSessionToken } from "@/lib/crypto/session-token";
import { GeneralError, type ErrorCodeType } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import type { AuthRateLimiter, AuthRateLimitInput } from "./AuthService";

export type CustomerAccountRecord = {
  id: string;
  email: string;
  passwordHash: string | null;
  passwordSalt: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  emailVerifiedAt: string | null;
  avatarUrl: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  streetAddress: string | null;
  barangay: string | null;
  cityProvince: string | null;
  postalCode: string | null;
  emailMarketingOptIn: boolean;
};

export type EmailVerificationTokenRecord = {
  id: string;
  customerId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
};

export type CreateCustomerRecordInput = {
  email: string;
  passwordHash: string;
  passwordSalt: string;
  profile: CustomerProfilePatch & {
    emailMarketingOptIn: boolean;
  };
  createdAt: string;
};

export type CreateEmailVerificationTokenInput = {
  customerId: string;
  tokenHash: string;
  expiresAt: string;
  requestId: string;
  sourceHash?: string;
  createdAt: string;
};

export type MarkEmailVerifiedInput = {
  customerId: string;
  tokenHash: string;
  verifiedAt: string;
  usedAt: string;
};

export type UpdateCustomerProfileInput = {
  customerId: string;
  profile: CustomerProfilePatch;
  updatedAt: string;
};

export type CustomerAccountRepository = {
  findCustomerByEmail(email: string): Promise<CustomerAccountRecord | null>;
  findCustomerById(customerId: string): Promise<CustomerAccountRecord | null>;
  createCustomer(input: CreateCustomerRecordInput): Promise<CustomerAccountRecord>;
  createEmailVerificationToken(
    input: CreateEmailVerificationTokenInput
  ): Promise<EmailVerificationTokenRecord>;
  findVerificationTokenByHash(
    tokenHash: string
  ): Promise<EmailVerificationTokenRecord | null>;
  markEmailVerifiedAndTokenUsed(input: MarkEmailVerifiedInput): Promise<boolean>;
  updateCustomerProfile(
    input: UpdateCustomerProfileInput
  ): Promise<CustomerAccountRecord | null>;
};

export type {
  CustomerVerificationEmailInput,
  CustomerVerificationEmailNotifier,
};

export type CustomerActorInput = {
  authenticated: boolean;
  role: string;
  actorId?: string;
};

export type CustomerProfileDto = {
  id: string;
  email: string;
  role: "CUSTOMER";
  emailVerified: boolean;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  streetAddress: string | null;
  barangay: string | null;
  cityProvince: string | null;
  postalCode: string | null;
  avatarUrl: string | null;
  emailMarketingOptIn: boolean;
};

export type RegisterCustomerResult = {
  customer: CustomerProfileDto;
  verificationEmail: {
    sent: boolean;
  };
};

export type VerifyEmailResult = {
  verified: true;
};

export type RegisterCustomerInput = Record<string, unknown> & {
  requestId: string;
  sourceIpHash?: string;
};

export type VerifyEmailInput = {
  token: unknown;
  requestId: string;
};

export type GetCustomerProfileInput = {
  actor: CustomerActorInput | undefined;
  requestId: string;
};

export type UpdateCustomerProfileServiceInput = {
  actor: CustomerActorInput | undefined;
  requestId: string;
  profile: Record<string, unknown>;
};

export type CustomerAccountServiceOptions = {
  repository: CustomerAccountRepository;
  verificationEmails: CustomerVerificationEmailNotifier;
  passwordPepper: string;
  operationalLogger?: OperationalLogger;
  rateLimiter?: AuthRateLimiter;
  rateLimitWindowSeconds?: number;
  rateLimitMaxAttempts?: number;
  now?: () => Date;
  createVerificationCredential?: () => Promise<EmailVerificationCredential>;
};

const EMAIL_TOKEN_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const EMAIL_TOKEN_RATE_LIMIT_MAX_ATTEMPTS = 3;

const noopRateLimiter: AuthRateLimiter = {
  isLimited: async () => false,
  recordFailure: async () => undefined,
  reset: async () => undefined,
};

function serviceError(code: ErrorCodeType): GeneralError<Record<string, never>> {
  return new GeneralError({}, code);
}

function toCustomerProfileDto(record: CustomerAccountRecord): CustomerProfileDto {
  return {
    id: record.id,
    email: record.email,
    role: "CUSTOMER",
    emailVerified: Boolean(record.emailVerifiedAt),
    displayName: record.displayName,
    firstName: record.firstName,
    lastName: record.lastName,
    phone: record.phone,
    streetAddress: record.streetAddress,
    barangay: record.barangay,
    cityProvince: record.cityProvince,
    postalCode: record.postalCode,
    avatarUrl: record.avatarUrl,
    emailMarketingOptIn: record.emailMarketingOptIn,
  };
}

function requireCustomerActor(
  actor: CustomerActorInput | undefined
): AppResult<{ customerId: string }> {
  if (!actor?.authenticated) {
    return Result.error(serviceError("AUTH_REQUIRED"));
  }

  if (actor.role !== "CUSTOMER") {
    return Result.error(serviceError("AUTH_FORBIDDEN"));
  }

  if (!actor.actorId) {
    return Result.error(serviceError("AUTH_REQUIRED"));
  }

  return Result.okay({ customerId: actor.actorId });
}

export class CustomerAccountService {
  private readonly repository: CustomerAccountRepository;
  private readonly verificationEmails: CustomerVerificationEmailNotifier;
  private readonly passwordPepper: string;
  private readonly operationalLogger: OperationalLogger;
  private readonly rateLimiter: AuthRateLimiter;
  private readonly rateLimitWindowSeconds: number;
  private readonly rateLimitMaxAttempts: number;
  private readonly now: () => Date;
  private readonly createVerificationCredential: () => Promise<EmailVerificationCredential>;

  constructor(options: CustomerAccountServiceOptions) {
    this.repository = options.repository;
    this.verificationEmails = options.verificationEmails;
    this.passwordPepper = options.passwordPepper;
    this.operationalLogger = options.operationalLogger ?? noopOperationalLogger;
    this.rateLimiter = options.rateLimiter ?? noopRateLimiter;
    this.rateLimitWindowSeconds =
      options.rateLimitWindowSeconds ?? EMAIL_TOKEN_RATE_LIMIT_WINDOW_SECONDS;
    this.rateLimitMaxAttempts =
      options.rateLimitMaxAttempts ?? EMAIL_TOKEN_RATE_LIMIT_MAX_ATTEMPTS;
    this.now = options.now ?? (() => new Date());
    this.createVerificationCredential =
      options.createVerificationCredential ??
      (() => createEmailVerificationCredential({ now: this.now() }));
  }

  private recordFailure(input: {
    requestId: string;
    errorCode: ErrorCodeType;
    customerId?: string;
    targetResourceId: string;
    details?: Record<string, unknown>;
  }): void {
    try {
      this.operationalLogger.record(
        createOperationalLogEvent({
          requestId: input.requestId,
          errorCode: input.errorCode,
          actorRole: "CUSTOMER",
          safeActorId: input.customerId,
          targetResourceId: input.targetResourceId,
          details: input.details,
        })
      );
    } catch {
      // Logging must not change customer account outcomes.
    }
  }

  private async rateLimitInput(input: {
    email: string;
    sourceIpHash?: string;
  }): Promise<AuthRateLimitInput> {
    return {
      scopeHash: await hashSessionToken(
        `email-token:${input.email}:${input.sourceIpHash ?? "unknown-source"}`
      ),
      now: this.now(),
      windowSeconds: this.rateLimitWindowSeconds,
      maxAttempts: this.rateLimitMaxAttempts,
    };
  }

  async registerCustomer(
    input: RegisterCustomerInput
  ): Promise<AppResult<RegisterCustomerResult>> {
    const validation = validateCustomerRegistration(input);

    if (!validation.ok) {
      return Result.error(serviceError("VALIDATION_FAILED"));
    }

    const rateLimit = await this.rateLimitInput({
      email: validation.value.email,
      sourceIpHash: input.sourceIpHash,
    });

    if (await this.rateLimiter.isLimited(rateLimit)) {
      return Result.error(serviceError("RATE_LIMITED"));
    }

    const existingCustomer = await this.repository.findCustomerByEmail(
      validation.value.email
    );
    const registrationDecision = evaluateRegistrationAccountState({
      existingCustomerId: existingCustomer?.id ?? null,
    });

    if (!registrationDecision.ok) {
      return Result.error(serviceError(registrationDecision.code));
    }

    const passwordCredential = await createCustomerPasswordCredential({
      password: validation.value.password,
      pepper: this.passwordPepper,
    });
    const createdAt = this.now().toISOString();
    const customer = await this.repository.createCustomer({
      email: validation.value.email,
      passwordHash: passwordCredential.passwordHash,
      passwordSalt: passwordCredential.passwordSalt,
      profile: validation.value.profile,
      createdAt,
    });
    const verificationCredential = await this.createVerificationCredential();

    await this.repository.createEmailVerificationToken({
      customerId: customer.id,
      tokenHash: verificationCredential.tokenHash,
      expiresAt: verificationCredential.expiresAt,
      requestId: input.requestId,
      sourceHash: input.sourceIpHash,
      createdAt,
    });
    await this.rateLimiter.recordFailure(rateLimit);

    const sendResult = await this.verificationEmails.sendVerificationEmail({
      toEmail: customer.email,
      token: verificationCredential.token,
      expiresAt: verificationCredential.expiresAt,
      requestId: input.requestId,
    });

    if (!sendResult.ok) {
      this.recordFailure({
        requestId: input.requestId,
        errorCode: "PROVIDER_UNAVAILABLE",
        customerId: customer.id,
        targetResourceId: "customer-verification-email",
        details: { providerError: sendResult.error },
      });

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }

    return Result.okay({
      customer: toCustomerProfileDto(customer),
      verificationEmail: {
        sent: true,
      },
    });
  }

  async verifyEmail(
    input: VerifyEmailInput
  ): Promise<AppResult<VerifyEmailResult>> {
    if (typeof input.token !== "string" || input.token.trim().length === 0) {
      return Result.error(serviceError("VALIDATION_FAILED"));
    }

    const tokenHash = await hashEmailVerificationToken(input.token.trim());
    const tokenRecord =
      await this.repository.findVerificationTokenByHash(tokenHash);
    const decision = evaluateEmailVerificationTokenState({
      record: tokenRecord,
      now: this.now(),
    });

    if (!decision.ok) {
      return Result.error(serviceError(decision.code));
    }

    const customer = await this.repository.findCustomerById(decision.customerId);

    if (!customer) {
      return Result.error(serviceError("RESOURCE_NOT_FOUND"));
    }

    const usedAt = this.now().toISOString();
    const consumed = await this.repository.markEmailVerifiedAndTokenUsed({
      customerId: customer.id,
      tokenHash,
      verifiedAt: usedAt,
      usedAt,
    });

    if (!consumed) {
      return Result.error(serviceError("CONFLICT_STATE"));
    }

    return Result.okay({ verified: true });
  }

  async getProfile(
    input: GetCustomerProfileInput
  ): Promise<AppResult<CustomerProfileDto>> {
    const actor = requireCustomerActor(input.actor);

    if (actor.error) {
      return actor;
    }

    const customer = await this.repository.findCustomerById(
      actor.content.customerId
    );

    if (!customer) {
      return Result.error(serviceError("RESOURCE_NOT_FOUND"));
    }

    return Result.okay(toCustomerProfileDto(customer));
  }

  async updateProfile(
    input: UpdateCustomerProfileServiceInput
  ): Promise<AppResult<CustomerProfileDto>> {
    const actor = requireCustomerActor(input.actor);

    if (actor.error) {
      return actor;
    }

    const validation = validateCustomerProfileUpdate(input.profile);

    if (!validation.ok) {
      return Result.error(serviceError("VALIDATION_FAILED"));
    }

    const updated = await this.repository.updateCustomerProfile({
      customerId: actor.content.customerId,
      profile: validation.value,
      updatedAt: this.now().toISOString(),
    });

    if (!updated) {
      return Result.error(serviceError("RESOURCE_NOT_FOUND"));
    }

    return Result.okay(toCustomerProfileDto(updated));
  }
}
