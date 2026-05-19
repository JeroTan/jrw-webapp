import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  customers,
  email_verification_tokens,
  password_reset_tokens,
  type accountStatusValues,
  type sessionActorKinds,
} from "@/domain/schema/identity";
import type {
  AccountRecoveryLookup,
  AccountRecoveryRepository,
  ConsumePasswordResetTokenInput,
  CreatePasswordResetTokenInput,
  CreateRecoveryEmailVerificationTokenInput,
  PasswordResetTokenRecord,
  RecoveryAccountRecord,
  RecoveryEmailVerificationTokenRecord,
} from "@/server/services/AccountRecoveryService";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { DrizzleAuthRateLimiter } from "./AuthRepository";

type AccountStatusValue = (typeof accountStatusValues)[number];
type ActorKindValue = (typeof sessionActorKinds)[number];
type CustomerRow = typeof customers.$inferSelect;
type PasswordResetTokenRow = typeof password_reset_tokens.$inferSelect;
type EmailVerificationTokenRow = typeof email_verification_tokens.$inferSelect;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function accountStatus(
  value: AccountStatusValue
): RecoveryAccountRecord["status"] {
  return value;
}

function actorKind(
  value: ActorKindValue
): PasswordResetTokenRecord["actorKind"] {
  return value;
}

function customerRecord(row: CustomerRow): RecoveryAccountRecord {
  return {
    actorKind: "CUSTOMER",
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    status: accountStatus(row.status),
    emailVerifiedAt: row.email_verified_at,
    isOwner: false,
    approvedAt: null,
  };
}

function passwordResetTokenRecord(
  row: PasswordResetTokenRow
): PasswordResetTokenRecord {
  return {
    id: row.id,
    actorKind: actorKind(row.actor_kind),
    actorId: row.actor_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
  };
}

function emailVerificationTokenRecord(
  row: EmailVerificationTokenRow
): RecoveryEmailVerificationTokenRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
  };
}

export class DrizzleCustomerAccountRecoveryRepository implements AccountRecoveryRepository {
  constructor(private readonly db: AppDb) {}

  async findAccountsByEmail(email: string): Promise<AccountRecoveryLookup> {
    const normalizedEmail = normalizeEmail(email);
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(sql`lower(${customers.email}) = ${normalizedEmail}`)
      .limit(1);

    return {
      admin: null,
      customer: customer ? customerRecord(customer) : null,
    };
  }

  async createPasswordResetToken(
    input: CreatePasswordResetTokenInput
  ): Promise<PasswordResetTokenRecord | null> {
    if (input.actorKind !== "CUSTOMER") return null;

    const [customer] = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, input.actorId))
      .limit(1);

    if (!customer) return null;

    const [token] = await this.db
      .insert(password_reset_tokens)
      .values({
        actor_kind: input.actorKind,
        actor_id: input.actorId,
        token_hash: input.tokenHash,
        expires_at: input.expiresAt,
        created_request_id: input.requestId,
        source_hash: input.sourceHash,
        created_at: input.createdAt,
        updated_at: input.createdAt,
      })
      .returning();

    return passwordResetTokenRecord(token);
  }

  async createEmailVerificationToken(
    input: CreateRecoveryEmailVerificationTokenInput
  ): Promise<RecoveryEmailVerificationTokenRecord | null> {
    const [customer] = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);

    if (!customer) return null;

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

  async findPasswordResetTokenByHash(
    tokenHash: string
  ): Promise<PasswordResetTokenRecord | null> {
    const [token] = await this.db
      .select()
      .from(password_reset_tokens)
      .where(
        and(
          eq(password_reset_tokens.token_hash, tokenHash),
          eq(password_reset_tokens.actor_kind, "CUSTOMER")
        )
      )
      .limit(1);

    return token ? passwordResetTokenRecord(token) : null;
  }

  async consumePasswordResetToken(
    input: ConsumePasswordResetTokenInput
  ): Promise<boolean> {
    if (input.actorKind !== "CUSTOMER") return false;

    const [customerRows, tokenRows] = await this.db.batch([
      this.db
        .update(customers)
        .set({
          password_hash: input.passwordHash,
          password_salt: input.passwordSalt,
          updated_at: input.usedAt,
        })
        .where(
          and(
            eq(customers.id, input.actorId),
            sql`EXISTS (
              SELECT 1 FROM ${password_reset_tokens}
              WHERE ${password_reset_tokens.token_hash} = ${input.tokenHash}
                AND ${password_reset_tokens.actor_kind} = ${input.actorKind}
                AND ${password_reset_tokens.actor_id} = ${input.actorId}
                AND ${password_reset_tokens.used_at} IS NULL
                AND ${password_reset_tokens.expires_at} > ${input.usedAt}
            )`
          )
        )
        .returning({ id: customers.id }),
      this.db
        .update(password_reset_tokens)
        .set({
          used_at: input.usedAt,
          updated_at: input.usedAt,
        })
        .where(
          and(
            eq(password_reset_tokens.token_hash, input.tokenHash),
            eq(password_reset_tokens.actor_kind, input.actorKind),
            eq(password_reset_tokens.actor_id, input.actorId),
            isNull(password_reset_tokens.used_at),
            gt(password_reset_tokens.expires_at, input.usedAt),
            sql`EXISTS (
              SELECT 1 FROM ${customers}
              WHERE ${customers.id} = ${input.actorId}
                AND ${customers.password_hash} = ${input.passwordHash}
                AND ${customers.updated_at} = ${input.usedAt}
            )`
          )
        )
        .returning({ id: password_reset_tokens.id }),
    ]);

    return customerRows.length > 0 && tokenRows.length > 0;
  }
}

export function createCustomerAccountRecoveryRepositories(
  dbBinding: D1Database
) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleCustomerAccountRecoveryRepository(db),
    rateLimiter: new DrizzleAuthRateLimiter(db),
  };
}
