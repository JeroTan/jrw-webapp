import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  admins,
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
type AdminRow = typeof admins.$inferSelect;
type CustomerRow = typeof customers.$inferSelect;
type PasswordResetTokenRow = typeof password_reset_tokens.$inferSelect;
type EmailVerificationTokenRow = typeof email_verification_tokens.$inferSelect;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function accountStatus(value: AccountStatusValue): RecoveryAccountRecord["status"] {
  return value;
}

function actorKind(value: ActorKindValue): PasswordResetTokenRecord["actorKind"] {
  return value;
}

function adminRecord(row: AdminRow): RecoveryAccountRecord {
  return {
    actorKind: "ADMIN",
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    status: accountStatus(row.status),
    emailVerifiedAt: row.email_verified_at,
    isOwner: row.is_owner,
    approvedAt: row.approved_at,
  };
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

export class DrizzleAccountRecoveryRepository
  implements AccountRecoveryRepository
{
  constructor(private readonly db: AppDb) {}

  async findAccountsByEmail(email: string): Promise<AccountRecoveryLookup> {
    const normalizedEmail = normalizeEmail(email);
    const [admin] = await this.db
      .select()
      .from(admins)
      .where(sql`lower(${admins.email}) = ${normalizedEmail}`)
      .limit(1);
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(sql`lower(${customers.email}) = ${normalizedEmail}`)
      .limit(1);

    return {
      admin: admin ? adminRecord(admin) : null,
      customer: customer ? customerRecord(customer) : null,
    };
  }

  private async findAccountByActor(
    actor: Pick<CreatePasswordResetTokenInput, "actorKind" | "actorId">
  ): Promise<RecoveryAccountRecord | null> {
    if (actor.actorKind === "ADMIN") {
      const [admin] = await this.db
        .select()
        .from(admins)
        .where(eq(admins.id, actor.actorId))
        .limit(1);

      return admin ? adminRecord(admin) : null;
    }

    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, actor.actorId))
      .limit(1);

    return customer ? customerRecord(customer) : null;
  }

  async createPasswordResetToken(
    input: CreatePasswordResetTokenInput
  ): Promise<PasswordResetTokenRecord | null> {
    const account = await this.findAccountByActor(input);

    if (!account) return null;

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
      .where(eq(password_reset_tokens.token_hash, tokenHash))
      .limit(1);

    return token ? passwordResetTokenRecord(token) : null;
  }

  async consumePasswordResetToken(
    input: ConsumePasswordResetTokenInput
  ): Promise<boolean> {
    return input.actorKind === "ADMIN"
      ? this.consumeAdminPasswordResetToken(input)
      : this.consumeCustomerPasswordResetToken(input);
  }

  private async consumeAdminPasswordResetToken(
    input: ConsumePasswordResetTokenInput
  ): Promise<boolean> {
    const [adminRows, tokenRows] = await this.db.batch([
      this.db
        .update(admins)
        .set({
          password_hash: input.passwordHash,
          password_salt: input.passwordSalt,
          updated_at: input.usedAt,
        })
        .where(
          and(
            eq(admins.id, input.actorId),
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
        .returning({ id: admins.id }),
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
              SELECT 1 FROM ${admins}
              WHERE ${admins.id} = ${input.actorId}
                AND ${admins.password_hash} = ${input.passwordHash}
                AND ${admins.updated_at} = ${input.usedAt}
            )`
          )
        )
        .returning({ id: password_reset_tokens.id }),
    ]);

    return adminRows.length > 0 && tokenRows.length > 0;
  }

  private async consumeCustomerPasswordResetToken(
    input: ConsumePasswordResetTokenInput
  ): Promise<boolean> {
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

export function createAccountRecoveryRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleAccountRecoveryRepository(db),
    rateLimiter: new DrizzleAuthRateLimiter(db),
  };
}
