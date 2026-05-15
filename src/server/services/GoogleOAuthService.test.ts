import { describe, expect, it } from "vitest";
import type { OperationalLogEvent } from "@/adapter/infrastructure/logging/operational-log";
import {
  GOOGLE_OAUTH_PROVIDER,
  hashGoogleOAuthMaterial,
  type GoogleOAuthCustomerRecord,
  type GoogleOAuthIdentity,
  type GoogleOAuthStateRecord,
} from "@/domain/auth/google-oauth";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import {
  GoogleOAuthService,
  type CreateGoogleCustomerLinkSessionInput,
  type GoogleOAuthProviderLinkRecord,
  type GoogleOAuthProviderPort,
  type GoogleOAuthRepository,
  type LinkGoogleCustomerSessionInput,
} from "./GoogleOAuthService";

class FakeGoogleOAuthRepository implements GoogleOAuthRepository {
  states: GoogleOAuthStateRecord[] = [];
  customers: GoogleOAuthCustomerRecord[] = [];
  providerLinks: GoogleOAuthProviderLinkRecord[] = [];
  operations: string[] = [];
  sessions: Array<{ customerId: string; tokenHash: string }> = [];
  createdStates: GoogleOAuthStateRecord[] = [];

  async createOAuthState(
    input: Parameters<GoogleOAuthRepository["createOAuthState"]>[0]
  ) {
    const record: GoogleOAuthStateRecord = {
      id: `state_${this.states.length + 1}`,
      provider: input.provider,
      stateHash: input.stateHash,
      nonceHash: input.nonceHash,
      redirectPath: input.redirectPath,
      expiresAt: input.expiresAt,
      usedAt: null,
    };
    this.states.push(record);
    this.createdStates.push(record);
    this.operations.push("create-state");
    return record;
  }

  async findOAuthStateByHash(input: {
    provider: typeof GOOGLE_OAUTH_PROVIDER;
    stateHash: string;
  }) {
    this.operations.push("find-state");
    return (
      this.states.find(
        (state) =>
          state.provider === input.provider && state.stateHash === input.stateHash
      ) ?? null
    );
  }

  async consumeOAuthState(input: {
    provider: typeof GOOGLE_OAUTH_PROVIDER;
    stateHash: string;
    usedAt: string;
  }) {
    this.operations.push("consume-state");
    const state = this.states.find(
      (entry) =>
        entry.provider === input.provider &&
        entry.stateHash === input.stateHash &&
        entry.usedAt === null &&
        new Date(entry.expiresAt).getTime() > new Date(input.usedAt).getTime()
    );
    if (!state) return false;

    state.usedAt = input.usedAt;
    return true;
  }

  async findProviderLink(input: {
    provider: typeof GOOGLE_OAUTH_PROVIDER;
    providerUserId: string;
  }) {
    this.operations.push("find-provider-link");
    return (
      this.providerLinks.find(
        (link) =>
          link.provider === input.provider &&
          link.providerUserId === input.providerUserId
      ) ?? null
    );
  }

  async findCustomerByEmail(email: string) {
    this.operations.push("find-customer");
    return (
      this.customers.find(
        (customer) => customer.email.toLowerCase() === email.toLowerCase()
      ) ?? null
    );
  }

  async adminEmailExists(email: string) {
    this.operations.push("admin-collision");
    return email.toLowerCase() === "admin@example.test";
  }

  async createSessionForCustomer(input: {
    customerId: string;
    sessionTokenHash: string;
  }) {
    this.operations.push("create-session");
    this.sessions.push({
      customerId: input.customerId,
      tokenHash: input.sessionTokenHash,
    });
    return true;
  }

  async linkCustomerAndCreateSession(input: LinkGoogleCustomerSessionInput) {
    this.operations.push("link-customer-session");
    const customer = this.customers.find(
      (entry) => entry.id === input.customerId
    );
    if (!customer) return null;

    customer.displayName = input.profileUpdates.displayName ?? customer.displayName;
    customer.firstName = input.profileUpdates.firstName ?? customer.firstName;
    customer.lastName = input.profileUpdates.lastName ?? customer.lastName;
    customer.avatarUrl = input.profileUpdates.avatarUrl ?? customer.avatarUrl;
    customer.emailVerifiedAt =
      input.profileUpdates.emailVerifiedAt ?? customer.emailVerifiedAt;
    this.providerLinks.push({
      provider: input.provider,
      providerUserId: input.providerUserId,
      customerId: input.customerId,
      customer,
    });
    this.sessions.push({
      customerId: input.customerId,
      tokenHash: input.sessionTokenHash,
    });
    return customer;
  }

  async createCustomerLinkAndSession(input: CreateGoogleCustomerLinkSessionInput) {
    this.operations.push("create-customer-session");
    const customer: GoogleOAuthCustomerRecord = {
      id: `customer_${this.customers.length + 1}`,
      email: input.email,
      status: "ACTIVE",
      emailVerifiedAt: input.emailVerifiedAt,
      displayName: input.profile.displayName ?? null,
      firstName: input.profile.firstName ?? null,
      lastName: input.profile.lastName ?? null,
      avatarUrl: input.profile.avatarUrl ?? null,
    };
    this.customers.push(customer);
    this.providerLinks.push({
      provider: input.provider,
      providerUserId: input.providerUserId,
      customerId: customer.id,
      customer,
    });
    this.sessions.push({
      customerId: customer.id,
      tokenHash: input.sessionTokenHash,
    });
    return customer;
  }
}

class FakeGoogleProvider implements GoogleOAuthProviderPort {
  exchangeCalls = 0;
  identityResult: AppResult<GoogleOAuthIdentity> = Result.okay({
    sub: "google-sub-1",
    email: "buyer@example.test",
    emailVerified: true,
    name: "Google Buyer",
    givenName: "Google",
    familyName: "Buyer",
    picture: "https://example.test/avatar.png",
  });

  createAuthorizationUrl(input: { state: string; nonce: string }) {
    return `https://accounts.google.com/o/oauth2/v2/auth?state=${input.state}&nonce=${input.nonce}`;
  }

  async exchangeCodeForIdentity() {
    this.exchangeCalls += 1;
    return this.identityResult;
  }
}

async function stateRecord(
  overrides: Partial<GoogleOAuthStateRecord> = {}
): Promise<GoogleOAuthStateRecord> {
  return {
    id: "state_1",
    provider: GOOGLE_OAUTH_PROVIDER,
    stateHash: await hashGoogleOAuthMaterial("raw-state"),
    nonceHash: await hashGoogleOAuthMaterial("raw-nonce"),
    redirectPath: "/checkout",
    expiresAt: "2026-05-15T00:10:00.000Z",
    usedAt: null,
    ...overrides,
  };
}

function customer(
  overrides: Partial<GoogleOAuthCustomerRecord> = {}
): GoogleOAuthCustomerRecord {
  return {
    id: "customer_1",
    email: "buyer@example.test",
    status: "ACTIVE",
    emailVerifiedAt: "2026-05-14T00:00:00.000Z",
    displayName: "Local Buyer",
    firstName: "",
    lastName: null,
    avatarUrl: null,
    ...overrides,
  };
}

function createService(input: {
  repository?: FakeGoogleOAuthRepository;
  provider?: FakeGoogleProvider;
  logs?: OperationalLogEvent[];
} = {}) {
  return new GoogleOAuthService({
    repository: input.repository ?? new FakeGoogleOAuthRepository(),
    provider: input.provider ?? new FakeGoogleProvider(),
    now: () => new Date("2026-05-15T00:00:00.000Z"),
    operationalLogger: input.logs
      ? { record: (event) => input.logs?.push(event) }
      : undefined,
    createOAuthCredential: async () => ({
      state: "raw-state",
      stateHash: await hashGoogleOAuthMaterial("raw-state"),
      nonce: "raw-nonce",
      nonceHash: await hashGoogleOAuthMaterial("raw-nonce"),
      expiresAt: "2026-05-15T00:10:00.000Z",
    }),
    createSessionCredential: async () => ({
      sessionToken: "raw-session-token",
      tokenHash: await hashGoogleOAuthMaterial("raw-session-token"),
    }),
  });
}

describe("GoogleOAuthService", () => {
  it("starts OAuth by storing only hashed state and nonce", async () => {
    const repository = new FakeGoogleOAuthRepository();
    const service = createService({ repository });

    const result = await service.startSession({
      returnTo: "/account/orders",
      requestId: "req_start",
      sourceIpHash: "source_hash",
    });

    expect(result).toMatchObject({
      content: {
        redirectUrl: expect.stringContaining("accounts.google.com"),
      },
      error: null,
    });
    expect(repository.createdStates[0]).toMatchObject({
      provider: "GOOGLE",
      redirectPath: "/account/orders",
      expiresAt: "2026-05-15T00:10:00.000Z",
    });
    expect(JSON.stringify(repository.createdStates)).not.toContain("raw-state");
    expect(JSON.stringify(repository.createdStates)).not.toContain("raw-nonce");
  });

  it("handles a valid new-customer callback after consuming state once", async () => {
    const repository = new FakeGoogleOAuthRepository();
    repository.states.push(await stateRecord());
    const service = createService({ repository });

    const result = await service.handleCallback({
      state: "raw-state",
      code: "authorization-code",
      requestId: "req_callback",
    });

    expect(result).toMatchObject({
      content: {
        actor: { role: "CUSTOMER", accountStatus: { emailVerified: true } },
        redirectPath: "/checkout",
        session: { token: "raw-session-token" },
      },
      error: null,
    });
    expect(repository.operations.indexOf("consume-state")).toBeLessThan(
      repository.operations.indexOf("create-customer-session")
    );
    expect(repository.providerLinks[0]).toMatchObject({
      provider: "GOOGLE",
      providerUserId: "google-sub-1",
      customerId: "customer_1",
    });
    expect(JSON.stringify(repository.providerLinks)).not.toContain(
      "authorization-code"
    );
  });

  it("signs in existing provider-linked customers without relinking by email", async () => {
    const repository = new FakeGoogleOAuthRepository();
    const existing = customer();
    repository.states.push(await stateRecord());
    repository.customers.push(existing);
    repository.providerLinks.push({
      provider: "GOOGLE",
      providerUserId: "google-sub-1",
      customerId: existing.id,
      customer: existing,
    });
    const service = createService({ repository });

    await expect(
      service.handleCallback({
        state: "raw-state",
        code: "authorization-code",
        requestId: "req_callback",
      })
    ).resolves.toMatchObject({
      content: { actor: { id: "customer_1", role: "CUSTOMER" } },
      error: null,
    });
    expect(repository.sessions).toHaveLength(1);
  });

  it("auto-links only safe customers and fills empty profile fields", async () => {
    const repository = new FakeGoogleOAuthRepository();
    repository.states.push(await stateRecord());
    repository.customers.push(customer());
    const service = createService({ repository });

    await service.handleCallback({
      state: "raw-state",
      code: "authorization-code",
      requestId: "req_callback",
    });

    expect(repository.customers[0]).toMatchObject({
      displayName: "Local Buyer",
      firstName: "Google",
      lastName: "Buyer",
      avatarUrl: "https://example.test/avatar.png",
    });
    expect(repository.providerLinks).toHaveLength(1);
  });

  it("rejects invalid expired or reused state before provider exchange", async () => {
    const repository = new FakeGoogleOAuthRepository();
    const provider = new FakeGoogleProvider();
    repository.states.push(
      await stateRecord({ expiresAt: "2026-05-14T00:00:00.000Z" })
    );
    const service = createService({ repository, provider });

    await expect(
      service.handleCallback({
        state: "raw-state",
        code: "authorization-code",
        requestId: "req_callback",
      })
    ).resolves.toMatchObject({ error: { code: "CONFLICT_STATE" } });
    expect(provider.exchangeCalls).toBe(0);
    expect(repository.sessions).toHaveLength(0);
  });

  it("rejects provider errors, unverified email, and Admin email collisions safely", async () => {
    const logs: OperationalLogEvent[] = [];
    const scenarios: Array<{
      email?: string;
      providerResult?: AppResult<GoogleOAuthIdentity>;
      code: string;
    }> = [
      {
        providerResult: Result.error(
          new GeneralError({ rawToken: "raw-id-token" }, "PROVIDER_UNAVAILABLE")
        ),
        code: "PROVIDER_UNAVAILABLE",
      },
      {
        providerResult: Result.okay({
          sub: "google-sub-1",
          email: "buyer@example.test",
          emailVerified: false,
        }),
        code: "AUTHENTICATION",
      },
      {
        email: "admin@example.test",
        providerResult: Result.okay({
          sub: "google-sub-1",
          email: "admin@example.test",
          emailVerified: true,
        }),
        code: "AUTH_FORBIDDEN",
      },
    ];

    for (const scenario of scenarios) {
      const repository = new FakeGoogleOAuthRepository();
      const provider = new FakeGoogleProvider();
      repository.states.push(await stateRecord());
      if (scenario.providerResult) {
        provider.identityResult = scenario.providerResult;
      }
      const service = createService({ repository, provider, logs });

      await expect(
        service.handleCallback({
          state: "raw-state",
          code: "authorization-code",
          requestId: `req_${scenario.code}`,
        })
      ).resolves.toMatchObject({ error: { code: scenario.code } });
      expect(repository.sessions).toHaveLength(0);
    }

    expect(JSON.stringify(logs)).not.toContain("raw-id-token");
    expect(JSON.stringify(logs)).not.toContain("authorization-code");
  });
});
