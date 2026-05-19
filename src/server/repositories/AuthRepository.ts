import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  auth_rate_limits,
  sessions,
  type sessionStatusValues,
} from "@/domain/schema/identity";
import { toApiDateTime, toNullableApiDateTime } from "@/lib/api/date-time";
import type {
  AuthRateLimitInput,
  AuthRateLimiter,
  AuthSessionRecord,
  AuthSessionRepository,
  CreateSessionInput,
} from "@/server/services/AuthService";
import { and, eq, sql } from "drizzle-orm";

type SessionStatusValue = (typeof sessionStatusValues)[number];

type SessionRow = typeof sessions.$inferSelect;

function sessionStatus(value: SessionStatusValue): AuthSessionRecord["status"] {
  return value;
}

function sessionRecord(row: SessionRow): AuthSessionRecord {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    actorKind: row.actor_kind,
    actorId: row.actor_id,
    status: sessionStatus(row.status),
    expiresAt: toApiDateTime(row.expires_at),
    revokedAt: toNullableApiDateTime(row.revoked_at),
  };
}

export class DrizzleAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly db: AppDb) {}

  async createSession(input: CreateSessionInput): Promise<AuthSessionRecord> {
    const [session] = await this.db
      .insert(sessions)
      .values({
        token_hash: input.tokenHash,
        actor_kind: input.actorKind,
        actor_id: input.actorId,
        status: "ACTIVE",
        expires_at: input.expiresAt,
        created_request_id: input.requestId,
        created_ip_hash: input.sourceIpHash,
      })
      .returning();

    return sessionRecord(session);
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.token_hash, tokenHash))
      .limit(1);

    return session ? sessionRecord(session) : null;
  }

  async revokeByTokenHash(
    tokenHash: string,
    revokedAt: string
  ): Promise<boolean> {
    const result = await this.db
      .update(sessions)
      .set({
        status: "REVOKED",
        revoked_at: revokedAt,
        updated_at: revokedAt,
      })
      .where(
        and(eq(sessions.token_hash, tokenHash), eq(sessions.status, "ACTIVE"))
      )
      .returning({ id: sessions.id });

    return result.length > 0;
  }

  async touchSession(sessionId: string, lastUsedAt: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        last_used_at: lastUsedAt,
        updated_at: lastUsedAt,
      })
      .where(eq(sessions.id, sessionId));
  }
}

function rateLimitWindowStart(input: AuthRateLimitInput): string {
  const windowMs = input.windowSeconds * 1000;
  return new Date(
    Math.floor(input.now.getTime() / windowMs) * windowMs
  ).toISOString();
}

function rateLimitWindowExpiry(input: AuthRateLimitInput): string {
  const windowStart = new Date(rateLimitWindowStart(input)).getTime();
  return new Date(windowStart + input.windowSeconds * 1000).toISOString();
}

export class DrizzleAuthRateLimiter implements AuthRateLimiter {
  constructor(private readonly db: AppDb) {}

  async isLimited(input: AuthRateLimitInput): Promise<boolean> {
    const [bucket] = await this.db
      .select({ attempt_count: auth_rate_limits.attempt_count })
      .from(auth_rate_limits)
      .where(
        and(
          eq(auth_rate_limits.scope_hash, input.scopeHash),
          eq(auth_rate_limits.window_start, rateLimitWindowStart(input))
        )
      )
      .limit(1);

    return (bucket?.attempt_count ?? 0) >= input.maxAttempts;
  }

  async recordFailure(input: AuthRateLimitInput): Promise<void> {
    const now = input.now.toISOString();

    await this.db
      .insert(auth_rate_limits)
      .values({
        scope_hash: input.scopeHash,
        window_start: rateLimitWindowStart(input),
        attempt_count: 1,
        expires_at: rateLimitWindowExpiry(input),
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: [auth_rate_limits.scope_hash, auth_rate_limits.window_start],
        set: {
          attempt_count: sql`${auth_rate_limits.attempt_count} + 1`,
          expires_at: rateLimitWindowExpiry(input),
          updated_at: now,
        },
      });
  }

  async consumeAttempt(input: AuthRateLimitInput): Promise<boolean> {
    const now = input.now.toISOString();
    const [bucket] = await this.db
      .insert(auth_rate_limits)
      .values({
        scope_hash: input.scopeHash,
        window_start: rateLimitWindowStart(input),
        attempt_count: 1,
        expires_at: rateLimitWindowExpiry(input),
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: [auth_rate_limits.scope_hash, auth_rate_limits.window_start],
        set: {
          attempt_count: sql`${auth_rate_limits.attempt_count} + 1`,
          expires_at: rateLimitWindowExpiry(input),
          updated_at: now,
        },
        setWhere: sql`${auth_rate_limits.attempt_count} < ${input.maxAttempts}`,
      })
      .returning({ attemptCount: auth_rate_limits.attempt_count });

    return Boolean(bucket);
  }

  async reset(input: Pick<AuthRateLimitInput, "scopeHash">): Promise<void> {
    await this.db
      .delete(auth_rate_limits)
      .where(eq(auth_rate_limits.scope_hash, input.scopeHash));
  }
}

export function createAuthRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    rateLimiter: new DrizzleAuthRateLimiter(db),
    sessions: new DrizzleAuthSessionRepository(db),
  };
}
