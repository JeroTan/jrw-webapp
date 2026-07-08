import { describe, expect, it } from "vitest";
import type { OperationalLogEvent } from "@/adapter/infrastructure/logging/operational-log";
import { hashEmailVerificationToken } from "@/domain/auth/email-verification-token";
import { verifyPassword } from "@/lib/crypto/password";
import type { AuthRateLimiter, AuthRateLimitInput } from "./AuthService";
import {
  backfillCustomerProfileFromCheckoutDetails,
  CustomerAccountService,
  type CustomerAccountRecord,
  type CustomerAccountRepository,
  type CustomerVerificationEmailNotifier,
  type EmailVerificationTokenRecord,
} from "./CustomerAccountService";

class FakeCustomerRepository implements CustomerAccountRepository {
  customers: CustomerAccountRecord[] = [];
  tokens: EmailVerificationTokenRecord[] = [];
  readonly createdTokens: EmailVerificationTokenRecord[] = [];

  async findCustomerByEmail(email: string) {
    return (
      this.customers.find(
        (customer) => customer.email.toLowerCase() === email
      ) ?? null
    );
  }

  async findCustomerById(customerId: string) {
    return (
      this.customers.find((customer) => customer.id === customerId) ?? null
    );
  }

  async createCustomer(
    input: Parameters<CustomerAccountRepository["createCustomer"]>[0]
  ) {
    const customer: CustomerAccountRecord = {
      id: `customer_${this.customers.length + 1}`,
      email: input.email,
      passwordHash: input.passwordHash,
      passwordSalt: input.passwordSalt,
      status: "ACTIVE",
      emailVerifiedAt: null,
      displayName: input.profile.displayName ?? null,
      firstName: input.profile.firstName ?? null,
      lastName: input.profile.lastName ?? null,
      phone: input.profile.phone ?? null,
      streetAddress: input.profile.streetAddress ?? null,
      barangay: input.profile.barangay ?? null,
      cityProvince: input.profile.cityProvince ?? null,
      postalCode: input.profile.postalCode ?? null,
      avatarUrl: null,
      emailMarketingOptIn: input.profile.emailMarketingOptIn,
    };
    this.customers.push(customer);
    return customer;
  }

  async createEmailVerificationToken(
    input: Parameters<
      CustomerAccountRepository["createEmailVerificationToken"]
    >[0]
  ) {
    const token: EmailVerificationTokenRecord = {
      id: `evt_${this.tokens.length + 1}`,
      customerId: input.customerId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
    };
    this.tokens.push(token);
    this.createdTokens.push(token);
    return token;
  }

  async findVerificationTokenByHash(tokenHash: string) {
    return this.tokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async markEmailVerifiedAndTokenUsed(
    input: Parameters<
      CustomerAccountRepository["markEmailVerifiedAndTokenUsed"]
    >[0]
  ) {
    const token = this.tokens.find(
      (entry) =>
        entry.tokenHash === input.tokenHash &&
        entry.usedAt === null &&
        new Date(entry.expiresAt).getTime() > new Date(input.usedAt).getTime()
    );
    const customer = token
      ? this.customers.find((entry) => entry.id === token.customerId)
      : undefined;

    if (!token || !customer) return false;

    token.usedAt = input.usedAt;
    customer.emailVerifiedAt = input.verifiedAt;
    return true;
  }

  async updateCustomerProfile(
    input: Parameters<CustomerAccountRepository["updateCustomerProfile"]>[0]
  ) {
    const customer = this.customers.find(
      (entry) => entry.id === input.customerId
    );
    if (!customer) return null;

    Object.assign(customer, input.profile);
    return customer;
  }
}

class FakeRateLimiter implements AuthRateLimiter {
  attempts = 0;
  limited = false;
  lastInput?: AuthRateLimitInput;

  async isLimited(input: AuthRateLimitInput) {
    this.lastInput = input;
    return this.limited;
  }

  async recordFailure(input: AuthRateLimitInput) {
    this.lastInput = input;
    this.attempts += 1;
  }

  async reset() {
    return;
  }
}

function createNotifier(
  options: {
    fail?: boolean;
    sent?: Parameters<
      CustomerVerificationEmailNotifier["sendVerificationEmail"]
    >[0][];
  } = {}
): CustomerVerificationEmailNotifier {
  return {
    sendVerificationEmail: async (input) => {
      options.sent?.push(input);
      return options.fail
        ? {
            ok: false,
            error: new Error("provider leaked raw-token and phone 0917"),
          }
        : { ok: true };
    },
  };
}

function createService(
  input: {
    repository?: FakeCustomerRepository;
    notifier?: CustomerVerificationEmailNotifier;
    rateLimiter?: AuthRateLimiter;
    logs?: OperationalLogEvent[];
  } = {}
) {
  return new CustomerAccountService({
    repository: input.repository ?? new FakeCustomerRepository(),
    verificationEmails: input.notifier ?? createNotifier(),
    rateLimiter: input.rateLimiter,
    passwordPepper: "test-pepper-value",
    now: () => new Date("2026-05-13T00:00:00.000Z"),
    operationalLogger: input.logs
      ? { record: (event) => input.logs?.push(event) }
      : undefined,
    createVerificationCredential: async () => ({
      token: "raw-verification-token",
      tokenHash: await hashEmailVerificationToken("raw-verification-token"),
      expiresAt: "2026-05-14T00:00:00.000Z",
    }),
  });
}

describe("CustomerAccountService", () => {
  it("registers a customer with normalized email, PBKDF2 credential, hashed token, and verification email", async () => {
    const repository = new FakeCustomerRepository();
    const rateLimiter = new FakeRateLimiter();
    const sent: Parameters<
      CustomerVerificationEmailNotifier["sendVerificationEmail"]
    >[0][] = [];
    const service = createService({
      repository,
      notifier: createNotifier({ sent }),
      rateLimiter,
    });

    const result = await service.registerCustomer({
      email: " Buyer@Example.TEST ",
      password: "correct horse battery staple",
      displayName: "  JRW Buyer  ",
      phone: " 0917 123 4567 ",
      requestId: "req_register",
      sourceIpHash: "source_hash",
    });

    expect(result.error).toBeNull();
    expect(result.content?.customer.email).toBe("buyer@example.test");
    expect(result.content?.customer.role).toBe("CUSTOMER");
    expect(result.content?.customer.emailVerified).toBe(false);
    expect(repository.customers[0]?.passwordHash).toMatch(/^pbkdf2-sha256\$/);
    await expect(
      verifyPassword(
        "correct horse battery staple",
        "test-pepper-value",
        repository.customers[0]?.passwordHash ?? "",
        repository.customers[0]?.passwordSalt ?? ""
      )
    ).resolves.toBe(true);
    expect(repository.createdTokens[0]?.tokenHash).not.toBe(
      "raw-verification-token"
    );
    expect(sent[0]).toMatchObject({
      toEmail: "buyer@example.test",
      token: "raw-verification-token",
      expiresAt: "2026-05-14T00:00:00.000Z",
      requestId: "req_register",
    });
    expect(rateLimiter.attempts).toBe(1);
    expect(rateLimiter.lastInput).toMatchObject({
      windowSeconds: 60 * 60,
      maxAttempts: 3,
    });
    expect(rateLimiter.lastInput?.scopeHash).not.toContain(
      "buyer@example.test"
    );
    expect(rateLimiter.lastInput?.scopeHash).not.toContain("source_hash");
    expect(JSON.stringify(result.content)).not.toContain(
      "raw-verification-token"
    );
    expect(JSON.stringify(result.content)).not.toContain(
      repository.customers[0]?.passwordHash ?? ""
    );
  });

  it("rejects duplicate, invalid, and rate-limited registration safely", async () => {
    const repository = new FakeCustomerRepository();
    repository.customers.push({
      id: "customer_1",
      email: "buyer@example.test",
      passwordHash: "hash",
      passwordSalt: "salt",
      status: "ACTIVE",
      emailVerifiedAt: null,
      displayName: null,
      firstName: null,
      lastName: null,
      phone: null,
      streetAddress: null,
      barangay: null,
      cityProvince: null,
      postalCode: null,
      avatarUrl: null,
      emailMarketingOptIn: false,
    });
    const limited = new FakeRateLimiter();
    limited.limited = true;
    const service = createService({ repository });

    await expect(
      service.registerCustomer({
        email: "BUYER@example.test",
        password: "correct horse battery staple",
        requestId: "req_duplicate",
      })
    ).resolves.toMatchObject({ error: { code: "CONFLICT_STATE" } });
    await expect(
      service.registerCustomer({
        email: "bad-email",
        password: "short",
        requestId: "req_invalid",
      })
    ).resolves.toMatchObject({ error: { code: "VALIDATION_FAILED" } });
    await expect(
      createService({ repository, rateLimiter: limited }).registerCustomer({
        email: "new@example.test",
        password: "correct horse battery staple",
        requestId: "req_limited",
      })
    ).resolves.toMatchObject({ error: { code: "RATE_LIMITED" } });
  });

  it("keeps unverified account recoverable and logs safely when verification email provider fails", async () => {
    const repository = new FakeCustomerRepository();
    const logs: OperationalLogEvent[] = [];
    const service = createService({
      repository,
      notifier: createNotifier({ fail: true }),
      logs,
    });

    const result = await service.registerCustomer({
      email: "buyer@example.test",
      password: "correct horse battery staple",
      phone: "0917 123 4567",
      streetAddress: "123 Sample St",
      requestId: "req_provider",
    });

    expect(result.error?.code).toBe("PROVIDER_UNAVAILABLE");
    expect(repository.customers).toHaveLength(1);
    expect(repository.createdTokens).toHaveLength(1);
    expect(JSON.stringify(logs)).not.toContain("buyer@example.test");
    expect(JSON.stringify(logs)).not.toContain("raw-verification-token");
    expect(JSON.stringify(logs)).not.toContain("0917");
    expect(JSON.stringify(logs)).not.toContain("123 Sample");
  });

  it("verifies a valid token once and rejects invalid, expired, and reused tokens", async () => {
    const repository = new FakeCustomerRepository();
    repository.customers.push({
      id: "customer_1",
      email: "buyer@example.test",
      passwordHash: "hash",
      passwordSalt: "salt",
      status: "ACTIVE",
      emailVerifiedAt: null,
      displayName: null,
      firstName: null,
      lastName: null,
      phone: null,
      streetAddress: null,
      barangay: null,
      cityProvince: null,
      postalCode: null,
      avatarUrl: null,
      emailMarketingOptIn: false,
    });
    repository.tokens.push({
      id: "evt_1",
      customerId: "customer_1",
      tokenHash: await hashEmailVerificationToken("raw-token"),
      expiresAt: "2026-05-14T00:00:00.000Z",
      usedAt: null,
    });
    repository.tokens.push({
      id: "evt_2",
      customerId: "customer_1",
      tokenHash: await hashEmailVerificationToken("expired-token"),
      expiresAt: "2026-05-12T00:00:00.000Z",
      usedAt: null,
    });
    const service = createService({ repository });

    await expect(
      service.verifyEmail({ token: "missing", requestId: "req_missing" })
    ).resolves.toMatchObject({ error: { code: "RESOURCE_NOT_FOUND" } });
    await expect(
      service.verifyEmail({ token: "expired-token", requestId: "req_expired" })
    ).resolves.toMatchObject({ error: { code: "CONFLICT_STATE" } });

    const verified = await service.verifyEmail({
      token: "raw-token",
      requestId: "req_verify",
    });

    expect(verified.error).toBeNull();
    expect(verified.content).toEqual({ verified: true });
    expect(repository.customers[0]?.emailVerifiedAt).toBe(
      "2026-05-13T00:00:00.000Z"
    );
    await expect(
      service.verifyEmail({ token: "raw-token", requestId: "req_reuse" })
    ).resolves.toMatchObject({ error: { code: "CONFLICT_STATE" } });
  });

  it("reads and updates only authenticated customer profile fields", async () => {
    const repository = new FakeCustomerRepository();
    repository.customers.push({
      id: "customer_1",
      email: "buyer@example.test",
      passwordHash: "hash",
      passwordSalt: "salt",
      status: "ACTIVE",
      emailVerifiedAt: "2026-05-13T00:00:00.000Z",
      displayName: "Buyer",
      firstName: null,
      lastName: null,
      phone: null,
      streetAddress: null,
      barangay: null,
      cityProvince: null,
      postalCode: null,
      avatarUrl: null,
      emailMarketingOptIn: false,
    });
    const service = createService({ repository });

    await expect(
      service.getProfile({
        actor: { authenticated: false, role: "PROSPECT" },
        requestId: "req_missing",
      })
    ).resolves.toMatchObject({ error: { code: "AUTH_REQUIRED" } });
    await expect(
      service.getProfile({
        actor: { authenticated: true, role: "ADMIN", actorId: "admin_1" },
        requestId: "req_forbidden",
      })
    ).resolves.toMatchObject({ error: { code: "AUTH_FORBIDDEN" } });

    const update = await service.updateProfile({
      actor: { authenticated: true, role: "CUSTOMER", actorId: "customer_1" },
      requestId: "req_update",
      profile: {
        displayName: "  New Buyer  ",
        phone: "0917 123 4567",
        role: "ADMIN",
      },
    });

    expect(update.error).toBeNull();
    expect(update.content?.displayName).toBe("New Buyer");
    expect(update.content?.role).toBe("CUSTOMER");
  });

  it("backfills blank profile fields from checkout details without overwriting saved values", async () => {
    const repository = new FakeCustomerRepository();
    repository.customers.push({
      id: "customer_1",
      email: "buyer@example.test",
      passwordHash: "hash",
      passwordSalt: "salt",
      status: "ACTIVE",
      emailVerifiedAt: "2026-05-13T00:00:00.000Z",
      displayName: "Saved Buyer",
      firstName: null,
      lastName: null,
      phone: "0999 000 0000",
      streetAddress: null,
      barangay: null,
      cityProvince: null,
      postalCode: null,
      avatarUrl: null,
      emailMarketingOptIn: false,
    });

    const updated = await backfillCustomerProfileFromCheckoutDetails({
      customerId: "customer_1",
      details: {
        barangay: "Barangay 456",
        cityProvince: "Quezon City",
        email: "buyer@example.test",
        firstName: "Nina",
        fullName: "Nina Reyes",
        lastName: "Reyes",
        phone: "+63 917 555 1212",
        postalCode: "1100",
        privacyAcknowledged: true,
        streetAddress: "12 Sampaguita Street",
      },
      repository,
      updatedAt: "2026-07-08T09:00:00.000Z",
    });

    expect(updated).toMatchObject({
      displayName: "Saved Buyer",
      firstName: "Nina",
      lastName: "Reyes",
      phone: "0999 000 0000",
      streetAddress: "12 Sampaguita Street",
      barangay: "Barangay 456",
      cityProvince: "Quezon City",
      postalCode: "1100",
    });
  });
});
