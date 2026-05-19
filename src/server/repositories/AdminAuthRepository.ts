import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  admins,
  type accountStatusValues,
} from "@/domain/schema/identity";
import type {
  AuthAccountRecord,
  AuthAccountRepository,
} from "@/server/services/AuthService";
import { eq, sql } from "drizzle-orm";
import {
  DrizzleAuthRateLimiter,
  DrizzleAuthSessionRepository,
} from "./AuthRepository";

type AccountStatusValue = (typeof accountStatusValues)[number];
type AdminRow = typeof admins.$inferSelect;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function accountStatus(value: AccountStatusValue): AuthAccountRecord["status"] {
  return value;
}

function adminRecord(row: AdminRow): AuthAccountRecord {
  return {
    actorKind: "ADMIN",
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    status: accountStatus(row.status),
    isOwner: row.is_owner,
    emailVerifiedAt: row.email_verified_at,
    approvedAt: row.approved_at,
  };
}

export class DrizzleAdminAuthAccountRepository
  implements AuthAccountRepository
{
  constructor(private readonly db: AppDb) {}

  async findByEmail(email: string): Promise<AuthAccountRecord | null> {
    const [admin] = await this.db
      .select()
      .from(admins)
      .where(sql`lower(${admins.email}) = ${normalizeEmail(email)}`)
      .limit(1);

    return admin ? adminRecord(admin) : null;
  }

  async findByActor(
    actorKind: AuthAccountRecord["actorKind"],
    actorId: string
  ): Promise<AuthAccountRecord | null> {
    if (actorKind !== "ADMIN") {
      return null;
    }

    const [admin] = await this.db
      .select()
      .from(admins)
      .where(eq(admins.id, actorId))
      .limit(1);

    return admin ? adminRecord(admin) : null;
  }
}

export function createAdminAuthRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    accounts: new DrizzleAdminAuthAccountRepository(db),
    rateLimiter: new DrizzleAuthRateLimiter(db),
    sessions: new DrizzleAuthSessionRepository(db),
  };
}
