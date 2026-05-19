import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  customers,
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
type CustomerRow = typeof customers.$inferSelect;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function accountStatus(value: AccountStatusValue): AuthAccountRecord["status"] {
  return value;
}

function customerRecord(row: CustomerRow): AuthAccountRecord {
  return {
    actorKind: "CUSTOMER",
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    status: accountStatus(row.status),
    isOwner: false,
    emailVerifiedAt: row.email_verified_at,
    approvedAt: null,
  };
}

export class DrizzleCustomerAuthAccountRepository
  implements AuthAccountRepository
{
  constructor(private readonly db: AppDb) {}

  async findByEmail(email: string): Promise<AuthAccountRecord | null> {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(sql`lower(${customers.email}) = ${normalizeEmail(email)}`)
      .limit(1);

    return customer ? customerRecord(customer) : null;
  }

  async findByActor(
    actorKind: AuthAccountRecord["actorKind"],
    actorId: string
  ): Promise<AuthAccountRecord | null> {
    if (actorKind !== "CUSTOMER") {
      return null;
    }

    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, actorId))
      .limit(1);

    return customer ? customerRecord(customer) : null;
  }
}

export function createCustomerAuthRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    accounts: new DrizzleCustomerAuthAccountRepository(db),
    rateLimiter: new DrizzleAuthRateLimiter(db),
    sessions: new DrizzleAuthSessionRepository(db),
  };
}
