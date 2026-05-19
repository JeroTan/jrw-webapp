import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  admins,
  sessions,
  type accountStatusValues,
} from "@/domain/schema/identity";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";

type AccountStatusValue = (typeof accountStatusValues)[number];

type AdminRowLike = {
  [key: string]: unknown;
  id: string;
  email: string;
  is_owner: boolean;
  status: AccountStatusValue;
  email_verified_at: string | null;
  approved_at: string | null;
  suspension_reason?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
};

type AdminRow = typeof admins.$inferSelect;

export type AdminAccountRecord = {
  id: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
  status: AccountStatusValue;
  isOwner: boolean;
  emailVerifiedAt: string | null;
  approvedAt: string | null;
  suspensionReason: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminAccountInput = {
  email: string;
  passwordHash: string;
  passwordSalt: string;
  status: "ACTIVE";
  emailVerifiedAt: string;
  approvedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateAdminAccountInput = {
  adminAccountId: string;
  email: string;
  expectedUpdatedAt: string;
  updatedAt: string;
};

export type ApproveAdminAccountInput = {
  adminAccountId: string;
  expectedUpdatedAt: string;
  approvedAt: string;
  updatedAt: string;
};

export type RejectAdminAccountInput = {
  adminAccountId: string;
  expectedStatus: AccountStatusValue;
  expectedUpdatedAt: string;
  rejectionReason: string | null;
  updatedAt: string;
};

export type SuspendAdminAccountInput = {
  adminAccountId: string;
  expectedUpdatedAt: string;
  suspensionReason: string | null;
  updatedAt: string;
};

export type ReactivateAdminAccountInput = {
  adminAccountId: string;
  expectedStatus: Extract<AccountStatusValue, "INACTIVE" | "SUSPENDED">;
  expectedUpdatedAt: string;
  updatedAt: string;
};

export type AdminAccountRepository = {
  listAdminAccounts(): Promise<AdminAccountRecord[]>;
  findAdminAccountById(
    adminAccountId: string
  ): Promise<AdminAccountRecord | null>;
  findAdminAccountByEmail(email: string): Promise<AdminAccountRecord | null>;
  createAdminAccount(
    input: CreateAdminAccountInput
  ): Promise<AdminAccountRecord>;
  updateAdminAccount(
    input: UpdateAdminAccountInput
  ): Promise<AdminAccountRecord | null>;
  approveAdminAccount(
    input: ApproveAdminAccountInput
  ): Promise<AdminAccountRecord | null>;
  rejectAdminAccount(
    input: RejectAdminAccountInput
  ): Promise<AdminAccountRecord | null>;
  suspendAdminAccount(
    input: SuspendAdminAccountInput
  ): Promise<AdminAccountRecord | null>;
  reactivateAdminAccount(
    input: ReactivateAdminAccountInput
  ): Promise<AdminAccountRecord | null>;
};

export function adminAccountRecordFromRow(
  row: AdminRowLike
): AdminAccountRecord {
  return {
    id: row.id,
    email: row.email,
    role: row.is_owner ? "SUPER_ADMIN" : "ADMIN",
    status: row.status,
    isOwner: row.is_owner,
    emailVerifiedAt: row.email_verified_at,
    approvedAt: row.approved_at,
    suspensionReason: row.suspension_reason ?? null,
    rejectionReason: row.rejection_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function adminSessionRevocationValues(input: {
  targetAdminId: string;
  revokedAt: string;
}) {
  return {
    actorKind: "ADMIN" as const,
    actorId: input.targetAdminId,
    status: "REVOKED" as const,
    revokedAt: input.revokedAt,
    updatedAt: input.revokedAt,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sessionRevocationDbValues(revokedAt: string) {
  return {
    status: "REVOKED" as const,
    revoked_at: revokedAt,
    updated_at: revokedAt,
  };
}

function mapRows(rows: AdminRow[]): AdminAccountRecord[] {
  return rows.map((row) => adminAccountRecordFromRow(row));
}

export class DrizzleAdminAccountRepository
  implements AdminAccountRepository
{
  constructor(private readonly db: AppDb) {}

  async listAdminAccounts(): Promise<AdminAccountRecord[]> {
    const rows = await this.db
      .select()
      .from(admins)
      .orderBy(admins.created_at);

    return mapRows(rows);
  }

  async findAdminAccountById(
    adminAccountId: string
  ): Promise<AdminAccountRecord | null> {
    const [admin] = await this.db
      .select()
      .from(admins)
      .where(eq(admins.id, adminAccountId))
      .limit(1);

    return admin ? adminAccountRecordFromRow(admin) : null;
  }

  async findAdminAccountByEmail(
    email: string
  ): Promise<AdminAccountRecord | null> {
    const [admin] = await this.db
      .select()
      .from(admins)
      .where(sql`lower(${admins.email}) = ${normalizeEmail(email)}`)
      .limit(1);

    return admin ? adminAccountRecordFromRow(admin) : null;
  }

  async createAdminAccount(
    input: CreateAdminAccountInput
  ): Promise<AdminAccountRecord> {
    const [admin] = await this.db
      .insert(admins)
      .values({
        email: normalizeEmail(input.email),
        password_hash: input.passwordHash,
        password_salt: input.passwordSalt,
        is_owner: false,
        status: input.status,
        email_verified_at: input.emailVerifiedAt,
        approved_at: input.approvedAt,
        suspension_reason: null,
        rejection_reason: null,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
      })
      .returning();

    return adminAccountRecordFromRow(admin);
  }

  async updateAdminAccount(
    input: UpdateAdminAccountInput
  ): Promise<AdminAccountRecord | null> {
    const [admin] = await this.db
      .update(admins)
      .set({
        email: normalizeEmail(input.email),
        updated_at: input.updatedAt,
      })
      .where(
        and(
          eq(admins.id, input.adminAccountId),
          eq(admins.is_owner, false),
          eq(admins.updated_at, input.expectedUpdatedAt)
        )
      )
      .returning();

    return admin ? adminAccountRecordFromRow(admin) : null;
  }

  async approveAdminAccount(
    input: ApproveAdminAccountInput
  ): Promise<AdminAccountRecord | null> {
    const [admin] = await this.db
      .update(admins)
      .set({
        status: "ACTIVE",
        approved_at: input.approvedAt,
        rejection_reason: null,
        updated_at: input.updatedAt,
      })
      .where(
        and(
          eq(admins.id, input.adminAccountId),
          eq(admins.is_owner, false),
          eq(admins.updated_at, input.expectedUpdatedAt),
          isNotNull(admins.email_verified_at),
          isNull(admins.approved_at)
        )
      )
      .returning();

    return admin ? adminAccountRecordFromRow(admin) : null;
  }

  async rejectAdminAccount(
    input: RejectAdminAccountInput
  ): Promise<AdminAccountRecord | null> {
    const [adminRows] = await this.db.batch([
      this.db
        .update(admins)
        .set({
          status: "INACTIVE",
          approved_at: null,
          rejection_reason: input.rejectionReason,
          updated_at: input.updatedAt,
        })
        .where(
          and(
            eq(admins.id, input.adminAccountId),
            eq(admins.is_owner, false),
            eq(admins.status, input.expectedStatus),
            eq(admins.updated_at, input.expectedUpdatedAt)
          )
        )
        .returning(),
      this.db
        .update(sessions)
        .set(sessionRevocationDbValues(input.updatedAt))
        .where(
          and(
            eq(sessions.actor_kind, "ADMIN"),
            eq(sessions.actor_id, input.adminAccountId),
            eq(sessions.status, "ACTIVE"),
            sql`EXISTS (
              SELECT 1 FROM ${admins}
              WHERE ${admins.id} = ${input.adminAccountId}
                AND ${admins.status} = 'INACTIVE'
                AND ${admins.updated_at} = ${input.updatedAt}
            )`
          )
        )
        .returning({ id: sessions.id }),
    ]);
    const [admin] = adminRows as AdminRow[];

    return admin ? adminAccountRecordFromRow(admin) : null;
  }

  async suspendAdminAccount(
    input: SuspendAdminAccountInput
  ): Promise<AdminAccountRecord | null> {
    const [adminRows] = await this.db.batch([
      this.db
        .update(admins)
        .set({
          status: "SUSPENDED",
          suspension_reason: input.suspensionReason,
          updated_at: input.updatedAt,
        })
        .where(
          and(
            eq(admins.id, input.adminAccountId),
            eq(admins.is_owner, false),
            eq(admins.status, "ACTIVE"),
            eq(admins.updated_at, input.expectedUpdatedAt)
          )
        )
        .returning(),
      this.db
        .update(sessions)
        .set(sessionRevocationDbValues(input.updatedAt))
        .where(
          and(
            eq(sessions.actor_kind, "ADMIN"),
            eq(sessions.actor_id, input.adminAccountId),
            eq(sessions.status, "ACTIVE"),
            sql`EXISTS (
              SELECT 1 FROM ${admins}
              WHERE ${admins.id} = ${input.adminAccountId}
                AND ${admins.status} = 'SUSPENDED'
                AND ${admins.updated_at} = ${input.updatedAt}
            )`
          )
        )
        .returning({ id: sessions.id }),
    ]);
    const [admin] = adminRows as AdminRow[];

    return admin ? adminAccountRecordFromRow(admin) : null;
  }

  async reactivateAdminAccount(
    input: ReactivateAdminAccountInput
  ): Promise<AdminAccountRecord | null> {
    const [admin] = await this.db
      .update(admins)
      .set({
        status: "ACTIVE",
        suspension_reason: null,
        rejection_reason: null,
        updated_at: input.updatedAt,
      })
      .where(
        and(
          eq(admins.id, input.adminAccountId),
          eq(admins.is_owner, false),
          eq(admins.status, input.expectedStatus),
          eq(admins.updated_at, input.expectedUpdatedAt)
        )
      )
      .returning();

    return admin ? adminAccountRecordFromRow(admin) : null;
  }
}

export function createAdminAccountRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleAdminAccountRepository(db),
  };
}
