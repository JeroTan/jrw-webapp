import { describe, expect, it } from "vitest";
import type { OperationalLogEvent } from "@/adapter/infrastructure/logging/operational-log";
import { hashPassword } from "@/lib/crypto/password";
import { hashSessionToken } from "@/lib/crypto/session-token";
import {
  AuthService,
  type AuthAccountRecord,
  type AuthAccountRepository,
  type AuthSessionRecord,
  type AuthSessionRepository,
  type AuthRateLimiter,
} from "./AuthService";

class FakeAccountRepository implements AuthAccountRepository {
  constructor(private readonly accounts: AuthAccountRecord[]) {}

  async findByEmail(email: string) {
    return this.accounts.find((account) => account.email === email) ?? null;
  }

  async findByActor(
    actorKind: AuthAccountRecord["actorKind"],
    actorId: string
  ) {
    return (
      this.accounts.find(
        (account) => account.actorKind === actorKind && account.id === actorId
      ) ?? null
    );
  }
}

class FailingAccountRepository implements AuthAccountRepository {
  async findByEmail(): Promise<AuthAccountRecord | null> {
    throw new Error("D1_ERROR: no such table: auth_rate_limits");
  }

  async findByActor(): Promise<AuthAccountRecord | null> {
    throw new Error("D1_ERROR: no such table: sessions");
  }
}

class FakeSessionRepository implements AuthSessionRepository {
  readonly createdSessions: AuthSessionRecord[] = [];
  readonly revokedTokenHashes: string[] = [];

  constructor(private readonly sessions: AuthSessionRecord[] = []) {}

  async createSession(
    input: Parameters<AuthSessionRepository["createSession"]>[0]
  ) {
    const session: AuthSessionRecord = {
      id: `session_${this.createdSessions.length + 1}`,
      tokenHash: input.tokenHash,
      actorKind: input.actorKind,
      actorId: input.actorId,
      status: "ACTIVE",
      expiresAt: input.expiresAt,
      revokedAt: null,
    };
    this.createdSessions.push(session);
    this.sessions.push(session);
    return session;
  }

  async findByTokenHash(tokenHash: string) {
    return (
      this.sessions.find((session) => session.tokenHash === tokenHash) ?? null
    );
  }

  async revokeByTokenHash(tokenHash: string) {
    this.revokedTokenHashes.push(tokenHash);
    return true;
  }

  async touchSession() {
    return;
  }
}

class FakeRateLimiter implements AuthRateLimiter {
  attempts = 0;
  resets = 0;

  async isLimited() {
    return this.attempts >= 5;
  }

  async recordFailure() {
    this.attempts += 1;
  }

  async reset() {
    this.resets += 1;
    this.attempts = 0;
  }
}

async function createAccount(
  overrides: Partial<AuthAccountRecord> = {}
): Promise<AuthAccountRecord> {
  const pepper = "test-pepper-value";
  const password = await hashPassword("correct horse battery staple", pepper, {
    iterations: 1,
    saltBytes: 4,
  });

  return {
    actorKind: "ADMIN",
    id: "admin_1",
    email: "owner@example.test",
    passwordHash: password.passwordHash,
    passwordSalt: password.passwordSalt,
    status: "ACTIVE",
    isOwner: true,
    emailVerifiedAt: null,
    approvedAt: null,
    ...overrides,
  };
}

describe("AuthService", () => {
  it("creates a server-side session for valid owner credentials", async () => {
    const account = await createAccount();
    const sessions = new FakeSessionRepository();
    const service = new AuthService({
      accounts: new FakeAccountRepository([account]),
      sessions,
      passwordPepper: "test-pepper-value",
      sessionTtlSeconds: 60,
      now: () => new Date("2026-05-13T00:00:00.000Z"),
    });

    const result = await service.signIn({
      email: "OWNER@EXAMPLE.TEST",
      password: "correct horse battery staple",
      requestId: "req_test",
    });

    expect(result.error).toBeNull();
    expect(result.content?.actor).toEqual({
      id: "admin_1",
      role: "SUPER_ADMIN",
      accountStatus: {
        status: "ACTIVE",
        emailVerified: false,
        approved: true,
      },
    });
    expect(result.content?.session.expiresAt).toBe("2026-05-13T00:01:00.000Z");
    expect(result.content?.session.token).toEqual(expect.any(String));
    expect(sessions.createdSessions[0]?.tokenHash).not.toBe(
      result.content?.session.token
    );
  });

  it("uses generic authentication failure for unknown email and wrong password", async () => {
    const account = await createAccount();
    const service = new AuthService({
      accounts: new FakeAccountRepository([account]),
      sessions: new FakeSessionRepository(),
      passwordPepper: "test-pepper-value",
    });

    const unknown = await service.signIn({
      email: "missing@example.test",
      password: "correct horse battery staple",
      requestId: "req_test",
    });
    const wrong = await service.signIn({
      email: "owner@example.test",
      password: "wrong password",
      requestId: "req_test",
    });

    expect(unknown.error?.code).toBe("AUTHENTICATION");
    expect(wrong.error?.code).toBe("AUTHENTICATION");
    expect(unknown.error?.message).toBe(wrong.error?.message);
  });

  it("logs safe auth failures without raw credentials or hashes", async () => {
    const account = await createAccount();
    const events: OperationalLogEvent[] = [];
    const service = new AuthService({
      accounts: new FakeAccountRepository([account]),
      sessions: new FakeSessionRepository(),
      passwordPepper: "test-pepper-value",
      operationalLogger: {
        record: (event) => events.push(event),
      },
    });

    const result = await service.signIn({
      email: "owner@example.test",
      password: "wrong password",
      requestId: "req_test",
    });

    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      requestId: "req_test",
      errorCode: "AUTHENTICATION",
      actorRole: "SUPER_ADMIN",
      safeActorId: "admin_1",
      targetResourceId: "auth-session",
    });
    expect(JSON.stringify(events)).not.toContain("wrong password");
    expect(JSON.stringify(events)).not.toContain(account.passwordHash);
    expect(JSON.stringify(events)).not.toContain(account.passwordSalt ?? "");
  });

  it("maps storage/schema failures to safe provider-unavailable errors", async () => {
    const events: OperationalLogEvent[] = [];
    const service = new AuthService({
      accounts: new FailingAccountRepository(),
      sessions: new FakeSessionRepository(),
      passwordPepper: "test-pepper-value",
      operationalLogger: {
        record: (event) => events.push(event),
      },
    });

    const result = await service.signIn({
      email: "owner@example.test",
      password: "correct horse battery staple",
      requestId: "req_storage",
    });

    expect(result.error?.code).toBe("PROVIDER_UNAVAILABLE");
    expect(result.error?.data).toEqual({
      reason: "auth_storage_unavailable",
      operation: "sign-in",
    });
    expect(events[0]).toMatchObject({
      requestId: "req_storage",
      errorCode: "PROVIDER_UNAVAILABLE",
      targetResourceId: "auth-storage",
      details: {
        reason: "auth_storage_unavailable",
        operation: "sign-in",
      },
    });
    expect(JSON.stringify(events)).not.toContain("no such table");
  });

  it("denies suspended and inactive accounts without creating sessions", async () => {
    const account = await createAccount({ status: "SUSPENDED" });
    const inactiveAccount = await createAccount({
      id: "admin_inactive",
      email: "inactive@example.test",
      status: "INACTIVE",
    });
    const sessions = new FakeSessionRepository();
    const service = new AuthService({
      accounts: new FakeAccountRepository([account, inactiveAccount]),
      sessions,
      passwordPepper: "test-pepper-value",
    });

    const result = await service.signIn({
      email: "owner@example.test",
      password: "correct horse battery staple",
      requestId: "req_test",
    });

    expect(result.error?.code).toBe("ACCOUNT_SUSPENDED");
    await expect(
      service.signIn({
        email: "inactive@example.test",
        password: "correct horse battery staple",
        requestId: "req_test",
      })
    ).resolves.toMatchObject({
      error: { code: "AUTH_FORBIDDEN" },
    });
    expect(sessions.createdSessions).toHaveLength(0);
  });

  it("blocks unverified customer sign-in and allows same PBKDF2 credential after verification", async () => {
    const unverifiedCustomer = await createAccount({
      actorKind: "CUSTOMER",
      id: "customer_1",
      email: "buyer@example.test",
      isOwner: false,
      emailVerifiedAt: null,
      approvedAt: null,
    });
    const verifiedCustomer = await createAccount({
      actorKind: "CUSTOMER",
      id: "customer_2",
      email: "verified@example.test",
      isOwner: false,
      emailVerifiedAt: "2026-05-13T00:00:00.000Z",
      approvedAt: null,
    });
    const sessions = new FakeSessionRepository();
    const service = new AuthService({
      accounts: new FakeAccountRepository([
        unverifiedCustomer,
        verifiedCustomer,
      ]),
      sessions,
      passwordPepper: "test-pepper-value",
      now: () => new Date("2026-05-13T00:00:00.000Z"),
    });

    await expect(
      service.signIn({
        email: "buyer@example.test",
        password: "correct horse battery staple",
        requestId: "req_unverified",
      })
    ).resolves.toMatchObject({ error: { code: "EMAIL_NOT_VERIFIED" } });

    const verified = await service.signIn({
      email: "verified@example.test",
      password: "correct horse battery staple",
      requestId: "req_verified",
    });

    expect(verified.error).toBeNull();
    expect(verified.content?.actor).toMatchObject({
      id: "customer_2",
      role: "CUSTOMER",
      accountStatus: {
        emailVerified: true,
      },
    });
    expect(sessions.createdSessions).toHaveLength(1);
  });

  it("rate limits after five failed credential attempts", async () => {
    const account = await createAccount();
    const rateLimiter = new FakeRateLimiter();
    const service = new AuthService({
      accounts: new FakeAccountRepository([account]),
      sessions: new FakeSessionRepository(),
      passwordPepper: "test-pepper-value",
      rateLimiter,
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await service.signIn({
        email: "owner@example.test",
        password: "wrong password",
        requestId: `req_${attempt}`,
        sourceIpHash: "source_ip_hash",
      });
      expect(result.error?.code).toBe("AUTHENTICATION");
    }

    const limited = await service.signIn({
      email: "owner@example.test",
      password: "wrong password",
      requestId: "req_limited",
      sourceIpHash: "source_ip_hash",
    });

    expect(limited.error?.code).toBe("RATE_LIMITED");
    expect(rateLimiter.attempts).toBe(5);
  });

  it("resets failed-attempt bucket after successful sign-in", async () => {
    const account = await createAccount();
    const rateLimiter = new FakeRateLimiter();
    rateLimiter.attempts = 4;
    const service = new AuthService({
      accounts: new FakeAccountRepository([account]),
      sessions: new FakeSessionRepository(),
      passwordPepper: "test-pepper-value",
      rateLimiter,
    });

    const result = await service.signIn({
      email: "owner@example.test",
      password: "correct horse battery staple",
      requestId: "req_success",
      sourceIpHash: "source_ip_hash",
    });

    expect(result.error).toBeNull();
    expect(rateLimiter.resets).toBe(1);
    expect(rateLimiter.attempts).toBe(0);
  });

  it("revokes session by hashing cookie token", async () => {
    const sessions = new FakeSessionRepository();
    const service = new AuthService({
      accounts: new FakeAccountRepository([]),
      sessions,
      passwordPepper: "test-pepper-value",
    });

    const result = await service.signOut({
      sessionToken: "raw-cookie-token",
      requestId: "req_test",
    });

    expect(result.error).toBeNull();
    expect(result.content).toEqual({ cleared: true, revoked: true });
    await expect(hashSessionToken("raw-cookie-token")).resolves.toBe(
      sessions.revokedTokenHashes[0]
    );
  });

  it("inspects missing, expired, and active sessions", async () => {
    const account = await createAccount();
    const activeTokenHash = await hashSessionToken("active-token");
    const expiredTokenHash = await hashSessionToken("expired-token");
    const revokedTokenHash = await hashSessionToken("revoked-token");
    const service = new AuthService({
      accounts: new FakeAccountRepository([account]),
      sessions: new FakeSessionRepository([
        {
          id: "session_active",
          tokenHash: activeTokenHash,
          actorKind: "ADMIN",
          actorId: "admin_1",
          status: "ACTIVE",
          expiresAt: "2026-05-14T00:00:00.000Z",
          revokedAt: null,
        },
        {
          id: "session_expired",
          tokenHash: expiredTokenHash,
          actorKind: "ADMIN",
          actorId: "admin_1",
          status: "ACTIVE",
          expiresAt: "2026-05-12T00:00:00.000Z",
          revokedAt: null,
        },
        {
          id: "session_revoked",
          tokenHash: revokedTokenHash,
          actorKind: "ADMIN",
          actorId: "admin_1",
          status: "REVOKED",
          expiresAt: "2026-05-14T00:00:00.000Z",
          revokedAt: "2026-05-12T00:00:00.000Z",
        },
      ]),
      passwordPepper: "test-pepper-value",
      now: () => new Date("2026-05-13T00:00:00.000Z"),
    });

    await expect(
      service.inspectSession({ requestId: "req_test" })
    ).resolves.toMatchObject({
      content: { authenticated: false, actor: null, session: null },
    });
    await expect(
      service.inspectSession({
        sessionToken: "expired-token",
        requestId: "req_test",
      })
    ).resolves.toMatchObject({
      content: { authenticated: false, actor: null, session: null },
    });
    await expect(
      service.inspectSession({
        sessionToken: "revoked-token",
        requestId: "req_test",
      })
    ).resolves.toMatchObject({
      content: { authenticated: false, actor: null, session: null },
    });
    await expect(
      service.inspectSession({
        sessionToken: "active-token",
        requestId: "req_test",
      })
    ).resolves.toMatchObject({
      content: {
        authenticated: true,
        actor: { id: "admin_1", role: "SUPER_ADMIN" },
      },
    });
  });

  it("treats unapproved Admin dashboard sessions as anonymous", async () => {
    const unapprovedAdmin = await createAccount({
      id: "admin_unapproved",
      email: "pending-admin@example.test",
      isOwner: false,
      emailVerifiedAt: "2026-05-13T00:00:00.000Z",
      approvedAt: null,
    });
    const tokenHash = await hashSessionToken("pending-admin-token");
    const service = new AuthService({
      accounts: new FakeAccountRepository([unapprovedAdmin]),
      sessions: new FakeSessionRepository([
        {
          id: "session_pending",
          tokenHash,
          actorKind: "ADMIN",
          actorId: "admin_unapproved",
          status: "ACTIVE",
          expiresAt: "2026-05-14T00:00:00.000Z",
          revokedAt: null,
        },
      ]),
      passwordPepper: "test-pepper-value",
      now: () => new Date("2026-05-13T00:00:00.000Z"),
    });

    await expect(
      service.inspectSession({
        sessionToken: "pending-admin-token",
        requestId: "req_pending_admin",
      })
    ).resolves.toMatchObject({
      content: { authenticated: false, actor: null, session: null },
    });
  });
});
