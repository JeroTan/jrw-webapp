import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  auth_rate_limits,
  customers,
  email_verification_tokens,
  type accountStatusValues,
} from "@/domain/schema/identity";
import type {
  CreateCustomerRecordInput,
  CreateEmailVerificationTokenInput,
  CustomerAccountRecord,
  CustomerAccountRepository,
  EmailVerificationTokenRecord,
  MarkEmailVerifiedInput,
  UpdateCustomerProfileInput,
} from "@/server/services/CustomerAccountService";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { DrizzleAuthRateLimiter } from "./AuthRepository";

type AccountStatusValue = (typeof accountStatusValues)[number];
type CustomerRow = typeof customers.$inferSelect;
type EmailVerificationTokenRow = typeof email_verification_tokens.$inferSelect;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function accountStatus(value: AccountStatusValue): CustomerAccountRecord["status"] {
  return value;
}

function customerRecord(row: CustomerRow): CustomerAccountRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    status: accountStatus(row.status),
    emailVerifiedAt: row.email_verified_at,
    avatarUrl: row.avatar_url,
    displayName: row.display_name,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    streetAddress: row.street_address,
    barangay: row.barangay,
    cityProvince: row.city_province,
    postalCode: row.postal_code,
    emailMarketingOptIn: row.email_marketing_opt_in,
  };
}

function emailVerificationTokenRecord(
  row: EmailVerificationTokenRow
): EmailVerificationTokenRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
  };
}

function customerProfileValues(
  profile: CreateCustomerRecordInput["profile"] | UpdateCustomerProfileInput["profile"]
) {
  return {
    ...(profile.displayName === undefined
      ? {}
      : { display_name: profile.displayName }),
    ...(profile.firstName === undefined ? {} : { first_name: profile.firstName }),
    ...(profile.lastName === undefined ? {} : { last_name: profile.lastName }),
    ...(profile.phone === undefined ? {} : { phone: profile.phone }),
    ...(profile.streetAddress === undefined
      ? {}
      : { street_address: profile.streetAddress }),
    ...(profile.barangay === undefined ? {} : { barangay: profile.barangay }),
    ...(profile.cityProvince === undefined
      ? {}
      : { city_province: profile.cityProvince }),
    ...(profile.postalCode === undefined
      ? {}
      : { postal_code: profile.postalCode }),
    ...(profile.emailMarketingOptIn === undefined
      ? {}
      : { email_marketing_opt_in: profile.emailMarketingOptIn }),
  };
}

export class DrizzleCustomerAccountRepository
  implements CustomerAccountRepository
{
  constructor(private readonly db: AppDb) {}

  async findCustomerByEmail(email: string): Promise<CustomerAccountRecord | null> {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(sql`lower(${customers.email}) = ${normalizeEmail(email)}`)
      .limit(1);

    return customer ? customerRecord(customer) : null;
  }

  async findCustomerById(
    customerId: string
  ): Promise<CustomerAccountRecord | null> {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    return customer ? customerRecord(customer) : null;
  }

  async createCustomer(
    input: CreateCustomerRecordInput
  ): Promise<CustomerAccountRecord> {
    const [customer] = await this.db
      .insert(customers)
      .values({
        email: normalizeEmail(input.email),
        password_hash: input.passwordHash,
        password_salt: input.passwordSalt,
        status: "ACTIVE",
        email_verified_at: null,
        ...customerProfileValues(input.profile),
        created_at: input.createdAt,
        updated_at: input.createdAt,
      })
      .returning();

    return customerRecord(customer);
  }

  async createEmailVerificationToken(
    input: CreateEmailVerificationTokenInput
  ): Promise<EmailVerificationTokenRecord> {
    const [token] = await this.db
      .insert(email_verification_tokens)
      .values({
        customer_id: input.customerId,
        token_hash: input.tokenHash,
        expires_at: input.expiresAt,
        created_request_id: input.requestId,
        source_hash: input.sourceHash,
        created_at: input.createdAt,
        updated_at: input.createdAt,
      })
      .returning();

    return emailVerificationTokenRecord(token);
  }

  async findVerificationTokenByHash(
    tokenHash: string
  ): Promise<EmailVerificationTokenRecord | null> {
    const [token] = await this.db
      .select()
      .from(email_verification_tokens)
      .where(eq(email_verification_tokens.token_hash, tokenHash))
      .limit(1);

    return token ? emailVerificationTokenRecord(token) : null;
  }

  async markEmailVerifiedAndTokenUsed(
    input: MarkEmailVerifiedInput
  ): Promise<boolean> {
    const [tokenRows, customerRows] = await this.db.batch([
      this.db
        .update(email_verification_tokens)
        .set({
          used_at: input.usedAt,
          updated_at: input.usedAt,
        })
        .where(
          and(
            eq(email_verification_tokens.token_hash, input.tokenHash),
            eq(email_verification_tokens.customer_id, input.customerId),
            isNull(email_verification_tokens.used_at),
            gt(email_verification_tokens.expires_at, input.usedAt),
            sql`EXISTS (
              SELECT 1 FROM ${customers}
              WHERE ${customers.id} = ${input.customerId}
            )`
          )
        )
        .returning({ customerId: email_verification_tokens.customer_id }),
      this.db
        .update(customers)
        .set({
          email_verified_at: input.verifiedAt,
          updated_at: input.verifiedAt,
        })
        .where(
          and(
            eq(customers.id, input.customerId),
            sql`EXISTS (
              SELECT 1 FROM ${email_verification_tokens}
              WHERE ${email_verification_tokens.token_hash} = ${input.tokenHash}
                AND ${email_verification_tokens.customer_id} = ${input.customerId}
                AND ${email_verification_tokens.used_at} = ${input.usedAt}
            )`
          )
        )
        .returning({ id: customers.id }),
    ]);

    return tokenRows.length > 0 && customerRows.length > 0;
  }

  async updateCustomerProfile(
    input: UpdateCustomerProfileInput
  ): Promise<CustomerAccountRecord | null> {
    const [customer] = await this.db
      .update(customers)
      .set({
        ...customerProfileValues(input.profile),
        updated_at: input.updatedAt,
      })
      .where(eq(customers.id, input.customerId))
      .returning();

    return customer ? customerRecord(customer) : null;
  }
}

export function createCustomerAccountRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleCustomerAccountRepository(db),
    rateLimiter: new DrizzleAuthRateLimiter(db),
  };
}

export { auth_rate_limits };
