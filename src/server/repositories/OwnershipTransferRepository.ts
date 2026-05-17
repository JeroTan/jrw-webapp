import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  scrubAuditDetails,
  type AuditActionType,
  type AuditSafeDetails,
} from "@/domain/audit/events";
import { createId } from "@paralleldrive/cuid2";
import {
  isEligibleOwnershipTransferTarget,
  type OwnershipTransferTarget,
} from "@/domain/admins/ownership-transfer";
import { audit_logs } from "@/domain/schema/audit";
import {
  admins,
  sessions,
  type accountStatusValues,
} from "@/domain/schema/identity";
import { and, eq, inArray, sql } from "drizzle-orm";

type AccountStatusValue = (typeof accountStatusValues)[number];

const ownershipTransferAuditAction =
  "account.ownership_transferred" satisfies AuditActionType;

type OwnershipTransferAdminRowLike = {
  [key: string]: unknown;
  id: string;
  email: string;
  password_hash?: string | null;
  password_salt?: string | null;
  is_owner: boolean;
  status: AccountStatusValue;
  email_verified_at: string | null;
  approved_at: string | null;
  created_at?: string;
  updated_at: string;
};

type OwnershipTransferAdminRow = typeof admins.$inferSelect;

export type OwnershipTransferCandidateRecord = {
  id: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
  status: AccountStatusValue;
  isOwner: boolean;
  emailVerified: boolean;
  approved: boolean;
  dashboardEligible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OwnershipTransferOwnerCredentialRecord = OwnershipTransferTarget & {
  role: "SUPER_ADMIN";
  passwordHash: string | null;
  passwordSalt: string | null;
  updatedAt: string;
};

export type OwnershipTransferTargetRecord = OwnershipTransferTarget & {
  role: "ADMIN" | "SUPER_ADMIN";
  createdAt: string;
  updatedAt: string;
};

export type ExecuteOwnershipTransferInput = {
  currentOwnerId: string;
  targetAdminId: string;
  requestId: string;
  transferredAt: string;
};

export type OwnershipTransferBatchResult =
  | {
      success: true;
      previousOwner: OwnershipTransferTargetRecord;
      newOwner: OwnershipTransferTargetRecord;
      revokedSessionCount: number;
      revokedActorIds: string[];
      auditLogId: string;
    }
  | {
      success: false;
      reason: "INVARIANT_CONFLICT" | "UNIQUE_OWNER_VIOLATION";
      ownerCount: number;
      revokedSessionCount: number;
    };

export type OwnershipTransferRepository = {
  listOwnershipTransferCandidates(): Promise<
    OwnershipTransferCandidateRecord[]
  >;
  findCurrentOwnerCredentialById(
    currentOwnerId: string
  ): Promise<OwnershipTransferOwnerCredentialRecord | null>;
  findTransferTargetById(
    targetAdminId: string
  ): Promise<OwnershipTransferTargetRecord | null>;
  transferOwnership(
    input: ExecuteOwnershipTransferInput
  ): Promise<OwnershipTransferBatchResult>;
};

export function ownershipTransferCandidateFromRow(
  row: OwnershipTransferAdminRowLike
): OwnershipTransferCandidateRecord {
  const role = row.is_owner ? "SUPER_ADMIN" : "ADMIN";
  const target: OwnershipTransferTarget = {
    id: row.id,
    email: row.email,
    role,
    status: row.status,
    isOwner: row.is_owner,
    emailVerifiedAt: row.email_verified_at,
    approvedAt: row.approved_at,
  };

  return {
    id: row.id,
    email: row.email,
    role,
    status: row.status,
    isOwner: row.is_owner,
    emailVerified: Boolean(row.email_verified_at),
    approved: Boolean(row.approved_at),
    dashboardEligible: isEligibleOwnershipTransferTarget(target),
    createdAt: row.created_at ?? row.updated_at,
    updatedAt: row.updated_at,
  };
}

export function filterEligibleOwnershipTransferCandidates(
  candidates: OwnershipTransferCandidateRecord[]
): OwnershipTransferCandidateRecord[] {
  return candidates.filter((candidate) => candidate.dashboardEligible);
}

export function ownershipTransferOwnerCredentialFromRow(
  row: OwnershipTransferAdminRowLike
): OwnershipTransferOwnerCredentialRecord {
  return {
    id: row.id,
    email: row.email,
    role: "SUPER_ADMIN",
    status: row.status,
    isOwner: row.is_owner,
    emailVerifiedAt: row.email_verified_at,
    approvedAt: row.approved_at,
    passwordHash: row.password_hash ?? null,
    passwordSalt: row.password_salt ?? null,
    updatedAt: row.updated_at,
  };
}

function ownershipTransferTargetFromRow(
  row: OwnershipTransferAdminRowLike
): OwnershipTransferTargetRecord {
  return {
    id: row.id,
    email: row.email,
    role: row.is_owner ? "SUPER_ADMIN" : "ADMIN",
    status: row.status,
    isOwner: row.is_owner,
    emailVerifiedAt: row.email_verified_at,
    approvedAt: row.approved_at,
    createdAt: row.created_at ?? row.updated_at,
    updatedAt: row.updated_at,
  };
}

export function ownershipTransferSessionRevocationDbValues(revokedAt: string) {
  return {
    status: "REVOKED" as const,
    revoked_at: revokedAt,
    updated_at: revokedAt,
  };
}

export function buildOwnershipTransferAuditDetails(
  input: {
    requestId: string;
    actorAdminId: string;
    targetAdminId: string;
    previousOwnerOldRole: "SUPER_ADMIN";
    previousOwnerNewRole: "ADMIN";
    targetOldRole: "ADMIN";
    targetNewRole: "SUPER_ADMIN";
    revokedActorIds: string[];
    revokedSessionCount: number;
  } & Record<string, unknown>
): AuditSafeDetails {
  const details = {
    requestId: input.requestId,
    actorAdminId: input.actorAdminId,
    targetAdminId: input.targetAdminId,
    previousOwnerOldRole: input.previousOwnerOldRole,
    previousOwnerNewRole: input.previousOwnerNewRole,
    targetOldRole: input.targetOldRole,
    targetNewRole: input.targetNewRole,
    authorityRefresh: {
      revokedActorIds: input.revokedActorIds,
      revokedCount: input.revokedSessionCount,
    },
  } satisfies AuditSafeDetails;

  return scrubAuditDetails(details) ?? details;
}

function ownershipTransferAuditDetailsSql(
  input: ExecuteOwnershipTransferInput
) {
  return sql<string>`json_object(
    'requestId', ${input.requestId},
    'actorAdminId', ${input.currentOwnerId},
    'targetAdminId', ${input.targetAdminId},
    'previousOwnerOldRole', 'SUPER_ADMIN',
    'previousOwnerNewRole', 'ADMIN',
    'targetOldRole', 'ADMIN',
    'targetNewRole', 'SUPER_ADMIN',
    'authorityRefresh', json_object(
      'revokedActorIds', json_array(${input.currentOwnerId}, ${input.targetAdminId}),
      'revokedCount', (
        SELECT count(*)
        FROM ${sessions}
        WHERE ${sessions.actor_kind} = 'ADMIN'
          AND ${sessions.actor_id} IN (${input.currentOwnerId}, ${input.targetAdminId})
          AND ${sessions.status} = 'REVOKED'
          AND ${sessions.revoked_at} = ${input.transferredAt}
      )
    )
  )`;
}

function ownershipTransferInvariantAbortSql(
  input: ExecuteOwnershipTransferInput,
  auditLogId: string
) {
  return sql`
    SELECT
      ${`ownership_transfer_invariant_${auditLogId}`},
      ${input.currentOwnerId},
      NULL,
      'account',
      NULL,
      NULL,
      ${input.transferredAt}
    WHERE NOT (
      EXISTS (
        SELECT 1 FROM ${admins} previous_owner
        WHERE previous_owner.id = ${input.currentOwnerId}
          AND previous_owner.is_owner = 0
          AND previous_owner.updated_at = ${input.transferredAt}
          AND previous_owner.email_verified_at IS NOT NULL
          AND previous_owner.approved_at IS NOT NULL
      )
      AND EXISTS (
        SELECT 1 FROM ${admins} target
        WHERE target.id = ${input.targetAdminId}
          AND target.is_owner = 1
          AND target.updated_at = ${input.transferredAt}
          AND target.status = 'ACTIVE'
          AND target.email_verified_at IS NOT NULL
          AND target.approved_at IS NOT NULL
      )
      AND EXISTS (
        SELECT 1 FROM ${audit_logs} audit
        WHERE audit.id = ${auditLogId}
          AND audit.action = ${ownershipTransferAuditAction}
      )
      AND (
        SELECT count(*) FROM ${admins}
        WHERE ${admins.is_owner} <> 0
      ) = 1
    )
  `;
}

function isOwnershipTransferInvariantAbort(error: unknown): boolean {
  return (
    error instanceof Error &&
    /ownership_transfer_invariant_|audit_logs\.action|NOT NULL constraint failed/i.test(
      error.message
    )
  );
}

export function ownershipTransferResultFromBatchResult(input: {
  previousOwnerRows: OwnershipTransferAdminRowLike[];
  newOwnerRows: OwnershipTransferAdminRowLike[];
  revokedSessionRows: Array<{ id: string; actorId: string }>;
  auditRows: Array<{ id: string }>;
  ownerCountRows: Array<{ count: number | string | bigint }>;
}): OwnershipTransferBatchResult {
  const ownerCount = Number(input.ownerCountRows[0]?.count ?? 0);
  const revokedActorIds = Array.from(
    new Set(input.revokedSessionRows.map((row) => row.actorId))
  );
  const revokedSessionCount = input.revokedSessionRows.length;

  if (ownerCount !== 1) {
    return {
      success: false,
      reason: "UNIQUE_OWNER_VIOLATION",
      ownerCount,
      revokedSessionCount,
    };
  }

  const [previousOwner] = input.previousOwnerRows;
  const [newOwner] = input.newOwnerRows;
  const [audit] = input.auditRows;

  if (!previousOwner || !newOwner || !audit) {
    return {
      success: false,
      reason: "INVARIANT_CONFLICT",
      ownerCount,
      revokedSessionCount,
    };
  }

  return {
    success: true,
    previousOwner: ownershipTransferTargetFromRow(previousOwner),
    newOwner: ownershipTransferTargetFromRow(newOwner),
    revokedSessionCount,
    revokedActorIds,
    auditLogId: audit.id,
  };
}

function adminSafeColumns() {
  return {
    id: admins.id,
    email: admins.email,
    is_owner: admins.is_owner,
    status: admins.status,
    email_verified_at: admins.email_verified_at,
    approved_at: admins.approved_at,
    created_at: admins.created_at,
    updated_at: admins.updated_at,
  };
}

export class DrizzleOwnershipTransferRepository implements OwnershipTransferRepository {
  constructor(private readonly db: AppDb) {}

  async listOwnershipTransferCandidates(): Promise<
    OwnershipTransferCandidateRecord[]
  > {
    const rows = await this.db
      .select(adminSafeColumns())
      .from(admins)
      .where(eq(admins.is_owner, false))
      .orderBy(admins.email);

    return rows.map((row) => ownershipTransferCandidateFromRow(row));
  }

  async findCurrentOwnerCredentialById(
    currentOwnerId: string
  ): Promise<OwnershipTransferOwnerCredentialRecord | null> {
    const [owner] = await this.db
      .select({
        ...adminSafeColumns(),
        password_hash: admins.password_hash,
        password_salt: admins.password_salt,
      })
      .from(admins)
      .where(and(eq(admins.id, currentOwnerId), eq(admins.is_owner, true)))
      .limit(1);

    return owner ? ownershipTransferOwnerCredentialFromRow(owner) : null;
  }

  async findTransferTargetById(
    targetAdminId: string
  ): Promise<OwnershipTransferTargetRecord | null> {
    const [target] = await this.db
      .select(adminSafeColumns())
      .from(admins)
      .where(eq(admins.id, targetAdminId))
      .limit(1);

    return target ? ownershipTransferTargetFromRow(target) : null;
  }

  async transferOwnership(
    input: ExecuteOwnershipTransferInput
  ): Promise<OwnershipTransferBatchResult> {
    const auditLogId = createId();

    try {
      const [
        previousOwnerRows,
        newOwnerRows,
        revokedSessionRows,
        auditRows,
        ownerCountRows,
      ] = await this.db.batch([
        this.db
          .update(admins)
          .set({
            is_owner: false,
            email_verified_at: sql`coalesce(${admins.email_verified_at}, ${input.transferredAt})`,
            approved_at: sql`coalesce(${admins.approved_at}, ${input.transferredAt})`,
            updated_at: input.transferredAt,
          })
          .where(
            and(
              eq(admins.id, input.currentOwnerId),
              eq(admins.is_owner, true),
              sql`EXISTS (
                SELECT 1 FROM admins target
                WHERE target.id = ${input.targetAdminId}
                  AND target.is_owner = 0
                  AND target.status = 'ACTIVE'
                  AND target.email_verified_at IS NOT NULL
                  AND target.approved_at IS NOT NULL
              )`
            )
          )
          .returning(adminSafeColumns()),
        this.db
          .update(admins)
          .set({
            is_owner: true,
            updated_at: input.transferredAt,
          })
          .where(
            and(
              eq(admins.id, input.targetAdminId),
              eq(admins.is_owner, false),
              eq(admins.status, "ACTIVE"),
              sql`${admins.email_verified_at} IS NOT NULL`,
              sql`${admins.approved_at} IS NOT NULL`,
              sql`EXISTS (
                SELECT 1 FROM admins previous_owner
                WHERE previous_owner.id = ${input.currentOwnerId}
                  AND previous_owner.is_owner = 0
                  AND previous_owner.updated_at = ${input.transferredAt}
                  AND previous_owner.email_verified_at IS NOT NULL
                  AND previous_owner.approved_at IS NOT NULL
              )`
            )
          )
          .returning(adminSafeColumns()),
        this.db
          .update(sessions)
          .set(ownershipTransferSessionRevocationDbValues(input.transferredAt))
          .where(
            and(
              eq(sessions.actor_kind, "ADMIN"),
              inArray(sessions.actor_id, [
                input.currentOwnerId,
                input.targetAdminId,
              ]),
              eq(sessions.status, "ACTIVE"),
              sql`EXISTS (
                SELECT 1 FROM admins target
                WHERE target.id = ${input.targetAdminId}
                  AND target.is_owner = 1
                  AND target.updated_at = ${input.transferredAt}
              )`
            )
          )
          .returning({ id: sessions.id, actorId: sessions.actor_id }),
        this.db
          .insert(audit_logs)
          .select(
            sql`
          SELECT
            ${auditLogId},
            ${input.currentOwnerId},
            ${ownershipTransferAuditAction},
            'account',
            ${input.targetAdminId},
            ${ownershipTransferAuditDetailsSql(input)},
            ${input.transferredAt}
          WHERE EXISTS (
            SELECT 1 FROM admins target
            WHERE target.id = ${input.targetAdminId}
              AND target.is_owner = 1
              AND target.updated_at = ${input.transferredAt}
          )
        `
          )
          .returning({ id: audit_logs.id }),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(admins)
          .where(eq(admins.is_owner, true)),
        this.db
          .insert(audit_logs)
          .select(ownershipTransferInvariantAbortSql(input, auditLogId)),
      ]);

      return ownershipTransferResultFromBatchResult({
        previousOwnerRows: previousOwnerRows as OwnershipTransferAdminRow[],
        newOwnerRows: newOwnerRows as OwnershipTransferAdminRow[],
        revokedSessionRows: revokedSessionRows as Array<{
          id: string;
          actorId: string;
        }>,
        auditRows: auditRows as Array<{ id: string }>,
        ownerCountRows: ownerCountRows as Array<{ count: number }>,
      });
    } catch (error) {
      if (isOwnershipTransferInvariantAbort(error)) {
        return {
          success: false,
          reason: "INVARIANT_CONFLICT",
          ownerCount: 0,
          revokedSessionCount: 0,
        };
      }

      throw error;
    }
  }
}

export function createOwnershipTransferRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    repository: new DrizzleOwnershipTransferRepository(db),
  };
}
