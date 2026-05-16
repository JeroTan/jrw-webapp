import { createId } from "@paralleldrive/cuid2";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  admins,
  customer_providers,
  customers,
  oauth_state_tokens,
  sessions,
  type accountStatusValues,
  type oauthProviderValues,
} from "@/domain/schema/identity";
import type {
  CreateGoogleCustomerLinkSessionInput,
  CreateOAuthStateInput,
  GoogleOAuthProviderLinkRecord,
  GoogleOAuthRepository,
  LinkGoogleCustomerSessionInput,
} from "@/server/services/GoogleOAuthService";
import type {
  GoogleOAuthCustomerRecord,
  GoogleOAuthStateRecord,
} from "@/domain/auth/google-oauth";
import { DrizzleAuthRateLimiter } from "./AuthRepository";

type AccountStatusValue = (typeof accountStatusValues)[number];
type OAuthProviderValue = (typeof oauthProviderValues)[number];
type CustomerRow = typeof customers.$inferSelect;
type OAuthStateRow = typeof oauth_state_tokens.$inferSelect;
type ProviderRow = typeof customer_providers.$inferSelect;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function accountStatus(
  value: AccountStatusValue
): GoogleOAuthCustomerRecord["status"] {
  return value;
}

function provider(value: OAuthProviderValue): GoogleOAuthStateRecord["provider"] {
  return value;
}

function customerRecord(row: CustomerRow): GoogleOAuthCustomerRecord {
  return {
    id: row.id,
    email: row.email,
    status: accountStatus(row.status),
    emailVerifiedAt: row.email_verified_at,
    displayName: row.display_name,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
  };
}

function stateRecord(row: OAuthStateRow): GoogleOAuthStateRecord {
  return {
    id: row.id,
    provider: provider(row.provider),
    stateHash: row.state_hash,
    nonceHash: row.nonce_hash,
    redirectPath: row.redirect_path,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    sourceHash: row.source_hash,
  };
}

function providerLinkRecord(input: {
  providerRow: ProviderRow;
  customerRow: CustomerRow | null;
}): GoogleOAuthProviderLinkRecord {
  return {
    provider: provider(input.providerRow.provider),
    providerUserId: input.providerRow.provider_user_id,
    customerId: input.providerRow.customer_id,
    customer: input.customerRow ? customerRecord(input.customerRow) : null,
  };
}

export class DrizzleGoogleOAuthRepository implements GoogleOAuthRepository {
  constructor(private readonly db: AppDb) {}

  async createOAuthState(
    input: CreateOAuthStateInput
  ): Promise<GoogleOAuthStateRecord> {
    const [state] = await this.db
      .insert(oauth_state_tokens)
      .values({
        provider: input.provider,
        state_hash: input.stateHash,
        nonce_hash: input.nonceHash,
        redirect_path: input.redirectPath,
        expires_at: input.expiresAt,
        created_request_id: input.requestId,
        source_hash: input.sourceHash,
        created_at: input.createdAt,
        updated_at: input.createdAt,
      })
      .returning();

    return stateRecord(state);
  }

  async findOAuthStateByHash(input: {
    provider: GoogleOAuthStateRecord["provider"];
    stateHash: string;
  }): Promise<GoogleOAuthStateRecord | null> {
    const [state] = await this.db
      .select()
      .from(oauth_state_tokens)
      .where(
        and(
          eq(oauth_state_tokens.provider, input.provider),
          eq(oauth_state_tokens.state_hash, input.stateHash)
        )
      )
      .limit(1);

    return state ? stateRecord(state) : null;
  }

  async consumeOAuthState(input: {
    provider: GoogleOAuthStateRecord["provider"];
    stateHash: string;
    usedAt: string;
  }): Promise<boolean> {
    const result = await this.db
      .update(oauth_state_tokens)
      .set({
        used_at: input.usedAt,
        updated_at: input.usedAt,
      })
      .where(
        and(
          eq(oauth_state_tokens.provider, input.provider),
          eq(oauth_state_tokens.state_hash, input.stateHash),
          isNull(oauth_state_tokens.used_at),
          gt(oauth_state_tokens.expires_at, input.usedAt)
        )
      )
      .returning({ id: oauth_state_tokens.id });

    return result.length > 0;
  }

  async findProviderLink(input: {
    provider: GoogleOAuthStateRecord["provider"];
    providerUserId: string;
  }): Promise<GoogleOAuthProviderLinkRecord | null> {
    const [row] = await this.db
      .select({
        providerRow: customer_providers,
        customerRow: customers,
      })
      .from(customer_providers)
      .leftJoin(customers, eq(customer_providers.customer_id, customers.id))
      .where(
        and(
          eq(customer_providers.provider, input.provider),
          eq(customer_providers.provider_user_id, input.providerUserId)
        )
      )
      .limit(1);

    return row ? providerLinkRecord(row) : null;
  }

  async findCustomerByEmail(
    email: string
  ): Promise<GoogleOAuthCustomerRecord | null> {
    const normalizedEmail = normalizeEmail(email);
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(sql`lower(${customers.email}) = ${normalizedEmail}`)
      .limit(1);

    return customer ? customerRecord(customer) : null;
  }

  async adminEmailExists(email: string): Promise<boolean> {
    const normalizedEmail = normalizeEmail(email);
    const [admin] = await this.db
      .select({ id: admins.id })
      .from(admins)
      .where(sql`lower(${admins.email}) = ${normalizedEmail}`)
      .limit(1);

    return Boolean(admin);
  }

  async createSessionForCustomer(input: {
    customerId: string;
    sessionTokenHash: string;
    sessionExpiresAt: string;
    requestId: string;
    sourceHash?: string;
    createdAt: string;
  }): Promise<boolean> {
    const [customer] = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);

    if (!customer) return false;

    const [session] = await this.db
      .insert(sessions)
      .values({
        token_hash: input.sessionTokenHash,
        actor_kind: "CUSTOMER",
        actor_id: input.customerId,
        status: "ACTIVE",
        expires_at: input.sessionExpiresAt,
        created_request_id: input.requestId,
        created_ip_hash: input.sourceHash,
        created_at: input.createdAt,
        updated_at: input.createdAt,
      })
      .returning({ id: sessions.id });

    return Boolean(session);
  }

  async linkCustomerAndCreateSession(
    input: LinkGoogleCustomerSessionInput
  ): Promise<GoogleOAuthCustomerRecord | null> {
    const [customerRows, providerRows, sessionRows] = await this.db.batch([
      this.db
        .update(customers)
        .set({
          display_name: input.profileUpdates.displayName,
          first_name: input.profileUpdates.firstName,
          last_name: input.profileUpdates.lastName,
          avatar_url: input.profileUpdates.avatarUrl,
          email_verified_at: input.profileUpdates.emailVerifiedAt,
          updated_at: input.createdAt,
        })
        .where(eq(customers.id, input.customerId))
        .returning(),
      this.db
        .insert(customer_providers)
        .values({
          customer_id: input.customerId,
          provider: input.provider,
          provider_user_id: input.providerUserId,
          metadata: input.providerMetadata,
          created_at: input.createdAt,
        })
        .returning({ id: customer_providers.id }),
      this.db
        .insert(sessions)
        .values({
          token_hash: input.sessionTokenHash,
          actor_kind: "CUSTOMER",
          actor_id: input.customerId,
          status: "ACTIVE",
          expires_at: input.sessionExpiresAt,
          created_request_id: input.requestId,
          created_ip_hash: input.sourceHash,
          created_at: input.createdAt,
          updated_at: input.createdAt,
        })
        .returning({ id: sessions.id }),
    ]);

    return customerRows.length > 0 &&
      providerRows.length > 0 &&
      sessionRows.length > 0
      ? customerRecord(customerRows[0])
      : null;
  }

  async createCustomerLinkAndSession(
    input: CreateGoogleCustomerLinkSessionInput
  ): Promise<GoogleOAuthCustomerRecord | null> {
    const customerId = createId();
    const [customerRows, providerRows, sessionRows] = await this.db.batch([
      this.db
        .insert(customers)
        .values({
          id: customerId,
          email: input.email,
          password_hash: null,
          password_salt: null,
          status: "ACTIVE",
          email_verified_at: input.emailVerifiedAt,
          display_name: input.profile.displayName,
          first_name: input.profile.firstName,
          last_name: input.profile.lastName,
          avatar_url: input.profile.avatarUrl,
          created_at: input.createdAt,
          updated_at: input.createdAt,
        })
        .returning(),
      this.db
        .insert(customer_providers)
        .values({
          customer_id: customerId,
          provider: input.provider,
          provider_user_id: input.providerUserId,
          metadata: input.providerMetadata,
          created_at: input.createdAt,
        })
        .returning({ id: customer_providers.id }),
      this.db
        .insert(sessions)
        .values({
          token_hash: input.sessionTokenHash,
          actor_kind: "CUSTOMER",
          actor_id: customerId,
          status: "ACTIVE",
          expires_at: input.sessionExpiresAt,
          created_request_id: input.requestId,
          created_ip_hash: input.sourceHash,
          created_at: input.createdAt,
          updated_at: input.createdAt,
        })
        .returning({ id: sessions.id }),
    ]);

    return customerRows.length > 0 &&
      providerRows.length > 0 &&
      sessionRows.length > 0
      ? customerRecord(customerRows[0])
      : null;
  }
}

export function createGoogleOAuthRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleGoogleOAuthRepository(db),
    rateLimiter: new DrizzleAuthRateLimiter(db),
  };
}
