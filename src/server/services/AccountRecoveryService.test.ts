import { describe, expect, it } from "vitest";
import type { OperationalLogEvent } from "@/adapter/infrastructure/logging/operational-log";
import { hashEmailVerificationToken } from "@/domain/auth/email-verification-token";
import { hashPasswordResetToken } from "@/domain/auth/password-reset-token";
import { verifyPassword } from "@/lib/crypto/password";
import type { AuthRateLimiter, AuthRateLimitInput } from "./AuthService";
import {
  AccountRecoveryService,
  type AccountEmailNotifier,
  type AccountRecoveryLookup,
  type AccountRecoveryRepository,
  type PasswordResetTokenRecord,
  type RecoveryAccountRecord,
  type RecoveryEmailVerificationTokenRecord,
} from "./AccountRecoveryService";

class FakeRecoveryRepository implements AccountRecoveryRepository {
  admins: RecoveryAccountRecord[] = [];
  customers: RecoveryAccountRecord[] = [];
  resetTokens: PasswordResetTokenRecord[] = [];
  verificationTokens: RecoveryEmailVerificationTokenRecord[] = [];
  createdResetTokens: PasswordResetTokenRecord[] = [];
  createdVerificationTokens: RecoveryEmailVerificationTokenRecord[] = [];

  async findAccountsByEmail(email: string): Promise<AccountRecoveryLookup> {
    return {
      admin:
        this.admins.find((entry) => entry.email.toLowerCase() === email) ??
        null,
      customer:
        this.customers.find((entry) => entry.email.toLowerCase() === email) ??
        null,
    };
  }

  async createPasswordResetToken(
    input: Parameters<AccountRecoveryRepository["createPasswordResetToken"]>[0]
  ) {
    const account = [...this.admins, ...this.customers].find(
      (entry) =>
        entry.actorKind === input.actorKind && entry.id === input.actorId
    );

    if (!account) return null;

    const token: PasswordResetTokenRecord = {
      id: `prt_${this.resetTokens.length + 1}`,
      actorKind: input.actorKind,
      actorId: input.actorId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
    };
    this.resetTokens.push(token);
    this.createdResetTokens.push(token);
    return token;
  }

  async createEmailVerificationToken(
    input: Parameters<
      AccountRecoveryRepository["createEmailVerificationToken"]
    >[0]
  ) {
    const customer = this.customers.find(
      (entry) => entry.id === input.customerId
    );
    if (!customer) return null;

    const token: RecoveryEmailVerificationTokenRecord = {
      id: `evt_${this.verificationTokens.length + 1}`,
      customerId: input.customerId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
    };
    this.verificationTokens.push(token);
    this.createdVerificationTokens.push(token);
    return token;
  }

  async findPasswordResetTokenByHash(tokenHash: string) {
    return (
      this.resetTokens.find((token) => token.tokenHash === tokenHash) ?? null
    );
  }

  async consumePasswordResetToken(
    input: Parameters<AccountRecoveryRepository["consumePasswordResetToken"]>[0]
  ) {
    const token = this.resetTokens.find(
      (entry) =>
        entry.tokenHash === input.tokenHash &&
        entry.actorKind === input.actorKind &&
        entry.actorId === input.actorId &&
        entry.usedAt === null &&
        new Date(entry.expiresAt).getTime() > new Date(input.usedAt).getTime()
    );
    const accounts = input.actorKind === "ADMIN" ? this.admins : this.customers;
    const account = accounts.find((entry) => entry.id === input.actorId);

    if (!token || !account) return false;

    token.usedAt = input.usedAt;
    account.passwordHash = input.passwordHash;
    account.passwordSalt = input.passwordSalt;
    return true;
  }
}

class FakeRateLimiter implements AuthRateLimiter {
  attempts = 0;
  limited = false;
  lastInput?: AuthRateLimitInput;
  inputs: AuthRateLimitInput[] = [];

  async isLimited(input: AuthRateLimitInput) {
    this.lastInput = input;
    this.inputs.push(input);
    return this.limited;
  }

  async recordFailure(input: AuthRateLimitInput) {
    this.lastInput = input;
    this.inputs.push(input);
    this.attempts += 1;
  }

  async consumeAttempt(input: AuthRateLimitInput) {
    this.lastInput = input;
    this.inputs.push(input);
    if (this.limited) return false;
    this.attempts += 1;
    return true;
  }

  async reset() {
    return;
  }
}

function account(overrides: Partial<RecoveryAccountRecord> = {}) {
  return {
    actorKind: "CUSTOMER" as const,
    id: "customer_1",
    email: "buyer@example.test",
    passwordHash: "old-hash",
    passwordSalt: "old-salt",
    status: "ACTIVE" as const,
    emailVerifiedAt: "2026-05-14T00:00:00.000Z",
    approvedAt: null,
    isOwner: false,
    ...overrides,
  };
}

function createNotifier(
  options: {
    failReset?: boolean;
    failVerification?: boolean;
    resetSent?: Parameters<AccountEmailNotifier["sendPasswordResetEmail"]>[0][];
    verificationSent?: Parameters<
      AccountEmailNotifier["sendVerificationEmail"]
    >[0][];
  } = {}
): AccountEmailNotifier {
  return {
    sendPasswordResetEmail: async (input) => {
      options.resetSent?.push(input);
      return options.failReset
        ? {
            ok: false,
            error: {
              name: "validation_error",
              message: "Domain not verified for buyer@example.test",
              statusCode: 403,
            },
          }
        : { ok: true };
    },
    sendVerificationEmail: async (input) => {
      options.verificationSent?.push(input);
      return options.failVerification
        ? { ok: false, error: new Error("provider raw-token password 0917") }
        : { ok: true };
    },
    sendAdminInvitationEmail: async () => ({ ok: true }),
    sendAdminApprovalEmail: async () => ({ ok: true }),
    sendAdminRejectionEmail: async () => ({ ok: true }),
    sendBrandInvitationEmail: async () => ({ ok: true }),
  };
}

function createService(
  input: {
    repository?: FakeRecoveryRepository;
    notifier?: AccountEmailNotifier;
    rateLimiter?: AuthRateLimiter;
    logs?: OperationalLogEvent[];
  } = {}
) {
  return new AccountRecoveryService({
    repository: input.repository ?? new FakeRecoveryRepository(),
    accountEmails: input.notifier ?? createNotifier(),
    rateLimiter: input.rateLimiter,
    passwordPepper: "test-pepper-value",
    now: () => new Date("2026-05-15T00:00:00.000Z"),
    operationalLogger: input.logs
      ? { record: (event) => input.logs?.push(event) }
      : undefined,
    createResetCredential: async () => ({
      token: "raw-reset-token",
      tokenHash: await hashPasswordResetToken("raw-reset-token"),
      expiresAt: "2026-05-15T00:30:00.000Z",
    }),
    createVerificationCredential: async () => ({
      token: "raw-verification-token",
      tokenHash: await hashEmailVerificationToken("raw-verification-token"),
      expiresAt: "2026-05-16T00:00:00.000Z",
    }),
  });
}

describe("AccountRecoveryService", () => {
  it("accepts password reset requests without enumeration and stores only hashed tokens", async () => {
    const repository = new FakeRecoveryRepository();
    repository.customers.push(account());
    const rateLimiter = new FakeRateLimiter();
    const resetSent: Parameters<
      AccountEmailNotifier["sendPasswordResetEmail"]
    >[0][] = [];
    const service = createService({
      repository,
      rateLimiter,
      notifier: createNotifier({ resetSent }),
    });

    const result = await service.requestPasswordReset({
      email: " Buyer@Example.TEST ",
      requestId: "req_reset",
      sourceIpHash: "source_hash",
    });

    expect(result).toMatchObject({ content: { accepted: true }, error: null });
    expect(repository.createdResetTokens).toHaveLength(1);
    expect(repository.createdResetTokens[0]).toMatchObject({
      actorKind: "CUSTOMER",
      actorId: "customer_1",
      expiresAt: "2026-05-15T00:30:00.000Z",
    });
    expect(repository.createdResetTokens[0]?.tokenHash).not.toBe(
      "raw-reset-token"
    );
    expect(resetSent[0]).toMatchObject({
      toEmail: "buyer@example.test",
      token: "raw-reset-token",
      requestId: "req_reset",
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
  });

  it("uses one email-token rate limit bucket across reset and verification sources", async () => {
    const repository = new FakeRecoveryRepository();
    repository.customers.push(account({ emailVerifiedAt: null }));
    const rateLimiter = new FakeRateLimiter();
    const service = createService({ repository, rateLimiter });

    await expect(
      service.requestPasswordReset({
        email: "buyer@example.test",
        requestId: "req_reset_one",
        sourceIpHash: "source_one",
      })
    ).resolves.toMatchObject({ content: { accepted: true }, error: null });
    await expect(
      service.requestEmailVerification({
        email: "buyer@example.test",
        requestId: "req_verify_two",
        sourceIpHash: "source_two",
      })
    ).resolves.toMatchObject({ content: { accepted: true }, error: null });

    expect(rateLimiter.inputs).toHaveLength(2);
    expect(rateLimiter.inputs[0]?.scopeHash).toBe(
      rateLimiter.inputs[1]?.scopeHash
    );
    expect(rateLimiter.attempts).toBe(2);
  });

  it("keeps missing, ineligible, ambiguous, and provider-failed reset requests publicly identical", async () => {
    const publicBodies: unknown[] = [];
    const logs: OperationalLogEvent[] = [];

    for (const scenario of [
      "missing",
      "ineligible",
      "ambiguous",
      "provider",
    ] as const) {
      const repository = new FakeRecoveryRepository();
      if (scenario === "ineligible") {
        repository.customers.push(account({ emailVerifiedAt: null }));
      }
      if (scenario === "ambiguous") {
        repository.customers.push(account());
        repository.admins.push(
          account({ actorKind: "ADMIN", id: "admin_1", isOwner: true })
        );
      }
      if (scenario === "provider") {
        repository.customers.push(account());
      }

      const service = createService({
        repository,
        logs,
        notifier: createNotifier({ failReset: scenario === "provider" }),
      });
      const result = await service.requestPasswordReset({
        email: "buyer@example.test",
        requestId: `req_${scenario}`,
      });

      expect(result.error).toBeNull();
      publicBodies.push(result.content);
      if (scenario !== "provider") {
        expect(repository.createdResetTokens).toHaveLength(0);
      }
    }

    expect(new Set(publicBodies.map((body) => JSON.stringify(body))).size).toBe(
      1
    );
    expect(JSON.stringify(logs)).not.toContain("buyer@example.test");
    expect(JSON.stringify(logs)).not.toContain("raw-reset-token");
    expect(JSON.stringify(logs)).not.toContain("0917");
  });

  it("confirms a valid reset once and never mutates password on invalid, expired, or reused tokens", async () => {
    const repository = new FakeRecoveryRepository();
    repository.customers.push(account());
    repository.resetTokens.push({
      id: "prt_valid",
      actorKind: "CUSTOMER",
      actorId: "customer_1",
      tokenHash: await hashPasswordResetToken("raw-valid-token"),
      expiresAt: "2026-05-15T00:30:00.000Z",
      usedAt: null,
    });
    repository.resetTokens.push({
      id: "prt_expired",
      actorKind: "CUSTOMER",
      actorId: "customer_1",
      tokenHash: await hashPasswordResetToken("raw-expired-token"),
      expiresAt: "2026-05-14T00:00:00.000Z",
      usedAt: null,
    });
    const service = createService({ repository });

    await expect(
      service.confirmPasswordReset({
        token: "missing",
        password: "new correct horse battery staple",
        requestId: "req_missing",
      })
    ).resolves.toMatchObject({ error: { code: "RESOURCE_NOT_FOUND" } });
    await expect(
      service.confirmPasswordReset({
        token: "raw-expired-token",
        password: "new correct horse battery staple",
        requestId: "req_expired",
      })
    ).resolves.toMatchObject({ error: { code: "CONFLICT_STATE" } });

    const result = await service.confirmPasswordReset({
      token: "raw-valid-token",
      password: "new correct horse battery staple",
      requestId: "req_confirm",
    });

    expect(result).toMatchObject({ content: { reset: true }, error: null });
    await expect(
      verifyPassword(
        "new correct horse battery staple",
        "test-pepper-value",
        repository.customers[0]?.passwordHash ?? "",
        repository.customers[0]?.passwordSalt ?? ""
      )
    ).resolves.toBe(true);
    await expect(
      service.confirmPasswordReset({
        token: "raw-valid-token",
        password: "another correct horse battery staple",
        requestId: "req_reuse",
      })
    ).resolves.toMatchObject({ error: { code: "CONFLICT_STATE" } });
  });

  it("resends verification only for eligible customers and still accepts provider failure", async () => {
    const repository = new FakeRecoveryRepository();
    repository.customers.push(account({ emailVerifiedAt: null }));
    const verificationSent: Parameters<
      AccountEmailNotifier["sendVerificationEmail"]
    >[0][] = [];
    const service = createService({
      repository,
      notifier: createNotifier({ verificationSent }),
    });

    const result = await service.requestEmailVerification({
      email: "buyer@example.test",
      requestId: "req_resend",
      sourceIpHash: "source_hash",
    });

    expect(result).toMatchObject({ content: { accepted: true }, error: null });
    expect(repository.createdVerificationTokens).toHaveLength(1);
    expect(repository.createdVerificationTokens[0]?.tokenHash).not.toBe(
      "raw-verification-token"
    );
    expect(verificationSent[0]).toMatchObject({
      toEmail: "buyer@example.test",
      token: "raw-verification-token",
    });

    const alreadyVerified = new FakeRecoveryRepository();
    alreadyVerified.customers.push(account());
    await expect(
      createService({ repository: alreadyVerified }).requestEmailVerification({
        email: "buyer@example.test",
        requestId: "req_already",
      })
    ).resolves.toMatchObject({ content: { accepted: true }, error: null });
    expect(alreadyVerified.createdVerificationTokens).toHaveLength(0);
  });

  it("rate-limits reset and verification requests before token creation", async () => {
    const repository = new FakeRecoveryRepository();
    repository.customers.push(account());
    const rateLimiter = new FakeRateLimiter();
    rateLimiter.limited = true;
    const service = createService({ repository, rateLimiter });

    await expect(
      service.requestPasswordReset({
        email: "buyer@example.test",
        requestId: "req_limited_reset",
      })
    ).resolves.toMatchObject({ error: { code: "RATE_LIMITED" } });
    await expect(
      service.requestEmailVerification({
        email: "buyer@example.test",
        requestId: "req_limited_verification",
      })
    ).resolves.toMatchObject({ error: { code: "RATE_LIMITED" } });
    expect(repository.createdResetTokens).toHaveLength(0);
    expect(repository.createdVerificationTokens).toHaveLength(0);
  });
});
