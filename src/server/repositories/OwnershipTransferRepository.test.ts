import { Miniflare } from "miniflare";
import { describe, expect, it } from "vitest";
import { createDb } from "@/adapter/infrastructure/db/client";
import {
  buildOwnershipTransferAuditDetails,
  DrizzleOwnershipTransferRepository,
  filterEligibleOwnershipTransferCandidates,
  ownershipTransferCandidateFromRow,
  ownershipTransferOwnerCredentialFromRow,
  ownershipTransferResultFromBatchResult,
  ownershipTransferSessionRevocationDbValues,
} from "./OwnershipTransferRepository";

const now = "2026-05-17T12:18:00.000Z";
const later = "2026-05-17T12:19:00.000Z";

async function createOwnershipTransferTestD1() {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    d1Databases: ["DB"],
  });
  const d1 = await mf.getD1Database("DB");

  const schemaStatements = [
    `CREATE TABLE admins (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      password_salt text,
      is_owner integer DEFAULT 0 NOT NULL,
      status text DEFAULT 'ACTIVE' NOT NULL,
      email_verified_at text,
      approved_at text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE UNIQUE INDEX admins_single_owner_idx ON admins(1) WHERE is_owner <> 0`,
    `CREATE TABLE sessions (
      id text PRIMARY KEY NOT NULL,
      token_hash text NOT NULL,
      actor_kind text NOT NULL,
      actor_id text NOT NULL,
      status text DEFAULT 'ACTIVE' NOT NULL,
      expires_at text NOT NULL,
      revoked_at text,
      last_used_at text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE audit_logs (
      id text PRIMARY KEY NOT NULL,
      admin_id text,
      action text NOT NULL,
      entity text NOT NULL,
      entity_id text,
      details text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
  ];

  for (const statement of schemaStatements) {
    await d1.prepare(statement).run();
  }

  return { d1, mf };
}

async function seedOwnershipTransferRows(d1: D1Database) {
  await d1.batch([
    d1
      .prepare(
        `INSERT INTO admins (
          id, email, password_hash, password_salt, is_owner, status,
          email_verified_at, approved_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        "admin_owner",
        "owner@example.test",
        "pbkdf2-sha256$99999$owner",
        "owner-salt",
        1,
        "ACTIVE",
        null,
        null,
        now,
        now
      ),
    d1
      .prepare(
        `INSERT INTO admins (
          id, email, password_hash, password_salt, is_owner, status,
          email_verified_at, approved_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        "admin_target",
        "target@example.test",
        "pbkdf2-sha256$99999$target",
        "target-salt",
        0,
        "ACTIVE",
        now,
        now,
        now,
        now
      ),
    d1
      .prepare(
        `INSERT INTO sessions (
          id, token_hash, actor_kind, actor_id, status, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        "sess_owner",
        "hash-owner",
        "ADMIN",
        "admin_owner",
        "ACTIVE",
        later,
        now,
        now
      ),
    d1
      .prepare(
        `INSERT INTO sessions (
          id, token_hash, actor_kind, actor_id, status, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        "sess_target",
        "hash-target",
        "ADMIN",
        "admin_target",
        "ACTIVE",
        later,
        now,
        now
      ),
  ]);
}

const eligibleRow = {
  id: "admin_target",
  email: "target@example.test",
  password_hash: "secret-hash",
  password_salt: "secret-salt",
  is_owner: false,
  status: "ACTIVE" as const,
  email_verified_at: now,
  approved_at: now,
  created_at: now,
  updated_at: now,
};

describe("OwnershipTransferRepository helpers", () => {
  it("maps candidate rows to safe DTO fields and filters eligible targets", () => {
    const eligible = ownershipTransferCandidateFromRow(eligibleRow);
    const suspended = ownershipTransferCandidateFromRow({
      ...eligibleRow,
      id: "admin_suspended",
      status: "SUSPENDED",
    });
    const unverified = ownershipTransferCandidateFromRow({
      ...eligibleRow,
      id: "admin_unverified",
      email_verified_at: null,
    });

    expect(eligible).toEqual({
      id: "admin_target",
      email: "target@example.test",
      role: "ADMIN",
      status: "ACTIVE",
      isOwner: false,
      emailVerified: true,
      approved: true,
      dashboardEligible: true,
      createdAt: now,
      updatedAt: now,
    });
    expect(JSON.stringify(eligible)).not.toContain("secret-hash");
    expect(JSON.stringify(eligible)).not.toContain("secret-salt");

    expect(
      filterEligibleOwnershipTransferCandidates([
        eligible,
        suspended,
        unverified,
      ]).map((candidate) => candidate.id)
    ).toEqual(["admin_target"]);
  });

  it("maps current owner credential with hash/salt only inside repository boundary", () => {
    expect(
      ownershipTransferOwnerCredentialFromRow({
        ...eligibleRow,
        id: "admin_owner",
        is_owner: true,
      })
    ).toEqual({
      id: "admin_owner",
      email: "target@example.test",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      isOwner: true,
      emailVerifiedAt: now,
      approvedAt: now,
      passwordHash: "secret-hash",
      passwordSalt: "secret-salt",
      updatedAt: now,
    });
  });

  it("summarizes transfer batch success, no-op conflicts, owner invariant, and revoked accounts", () => {
    expect(
      ownershipTransferResultFromBatchResult({
        previousOwnerRows: [
          {
            ...eligibleRow,
            id: "admin_owner",
            email: "owner@example.test",
            is_owner: false,
          },
        ],
        newOwnerRows: [
          {
            ...eligibleRow,
            id: "admin_target",
            is_owner: true,
          },
        ],
        revokedSessionRows: [
          { id: "sess_owner", actorId: "admin_owner" },
          { id: "sess_target", actorId: "admin_target" },
        ],
        auditRows: [{ id: "audit_1" }],
        ownerCountRows: [{ count: 1 }],
      })
    ).toMatchObject({
      success: true,
      previousOwner: {
        id: "admin_owner",
        role: "ADMIN",
        isOwner: false,
      },
      newOwner: {
        id: "admin_target",
        role: "SUPER_ADMIN",
        isOwner: true,
      },
      revokedSessionCount: 2,
      revokedActorIds: ["admin_owner", "admin_target"],
      auditLogId: "audit_1",
    });

    expect(
      ownershipTransferResultFromBatchResult({
        previousOwnerRows: [],
        newOwnerRows: [],
        revokedSessionRows: [],
        auditRows: [],
        ownerCountRows: [{ count: 1 }],
      })
    ).toEqual({
      success: false,
      reason: "INVARIANT_CONFLICT",
      ownerCount: 1,
      revokedSessionCount: 0,
    });

    expect(
      ownershipTransferResultFromBatchResult({
        previousOwnerRows: [{ ...eligibleRow, id: "admin_owner" }],
        newOwnerRows: [{ ...eligibleRow, id: "admin_target", is_owner: true }],
        revokedSessionRows: [],
        auditRows: [{ id: "audit_1" }],
        ownerCountRows: [{ count: 2 }],
      })
    ).toEqual({
      success: false,
      reason: "UNIQUE_OWNER_VIOLATION",
      ownerCount: 2,
      revokedSessionCount: 0,
    });
  });

  it("builds safe audit details and session revocation values without secrets", () => {
    const details = buildOwnershipTransferAuditDetails({
      requestId: "req_owner_transfer",
      actorAdminId: "admin_owner",
      targetAdminId: "admin_target",
      previousOwnerOldRole: "SUPER_ADMIN",
      previousOwnerNewRole: "ADMIN",
      targetOldRole: "ADMIN",
      targetNewRole: "SUPER_ADMIN",
      revokedActorIds: ["admin_owner", "admin_target"],
      revokedSessionCount: 2,
      password: "must-redact",
      confirmationPhrase: "TRANSFER OWNERSHIP TO target@example.test",
      tokenHash: "must-redact",
      cookie: "must-redact",
    });

    expect(details).toMatchObject({
      requestId: "req_owner_transfer",
      actorAdminId: "admin_owner",
      targetAdminId: "admin_target",
      previousOwnerOldRole: "SUPER_ADMIN",
      previousOwnerNewRole: "ADMIN",
      targetOldRole: "ADMIN",
      targetNewRole: "SUPER_ADMIN",
      authorityRefresh: {
        revokedActorIds: ["admin_owner", "admin_target"],
        revokedCount: 2,
      },
    });
    expect(JSON.stringify(details)).not.toContain("must-redact");
    expect(JSON.stringify(details)).not.toContain(
      "TRANSFER OWNERSHIP TO target@example.test"
    );

    expect(ownershipTransferSessionRevocationDbValues(now)).toEqual({
      status: "REVOKED",
      revoked_at: now,
      updated_at: now,
    });
  });

  it("executes real D1 ownership transfer with audit id, actual revoked count, and owner eligibility", async () => {
    const { d1, mf } = await createOwnershipTransferTestD1();

    try {
      await seedOwnershipTransferRows(d1);
      const repository = new DrizzleOwnershipTransferRepository(createDb(d1));

      const result = await repository.transferOwnership({
        currentOwnerId: "admin_owner",
        targetAdminId: "admin_target",
        requestId: "req_transfer",
        transferredAt: later,
      });

      expect(result).toMatchObject({
        success: true,
        previousOwner: {
          id: "admin_owner",
          role: "ADMIN",
          isOwner: false,
          emailVerifiedAt: later,
          approvedAt: later,
        },
        newOwner: {
          id: "admin_target",
          role: "SUPER_ADMIN",
          isOwner: true,
        },
        revokedSessionCount: 2,
        revokedActorIds: ["admin_owner", "admin_target"],
      });

      if (!result.success) {
        throw new Error("Expected ownership transfer success.");
      }

      expect(result.auditLogId).toEqual(expect.any(String));

      const audit = await d1
        .prepare("SELECT id, action, details FROM audit_logs LIMIT 1")
        .first<{ id: string; action: string; details: string }>();
      expect(audit).toMatchObject({
        id: result.auditLogId,
        action: "account.ownership_transferred",
      });
      expect(audit?.details).toContain('"revokedCount":2');
      expect(audit?.details).not.toContain("TRANSFER OWNERSHIP TO");
      expect(audit?.details).not.toContain("password");
    } finally {
      await mf.dispose();
    }
  });

  it("rolls back real D1 batch when transfer invariant fails", async () => {
    const { d1, mf } = await createOwnershipTransferTestD1();

    try {
      await seedOwnershipTransferRows(d1);
      await d1
        .prepare("UPDATE admins SET approved_at = NULL WHERE id = ?")
        .bind("admin_target")
        .run();
      const repository = new DrizzleOwnershipTransferRepository(createDb(d1));

      const result = await repository.transferOwnership({
        currentOwnerId: "admin_owner",
        targetAdminId: "admin_target",
        requestId: "req_conflict",
        transferredAt: later,
      });

      expect(result).toEqual({
        success: false,
        reason: "INVARIANT_CONFLICT",
        ownerCount: 0,
        revokedSessionCount: 0,
      });

      const owner = await d1
        .prepare("SELECT is_owner FROM admins WHERE id = ?")
        .bind("admin_owner")
        .first<{ is_owner: number }>();
      const target = await d1
        .prepare("SELECT is_owner FROM admins WHERE id = ?")
        .bind("admin_target")
        .first<{ is_owner: number }>();
      const auditCount = await d1
        .prepare("SELECT count(*) AS count FROM audit_logs")
        .first<{ count: number }>();

      expect(owner?.is_owner).toBe(1);
      expect(target?.is_owner).toBe(0);
      expect(auditCount?.count).toBe(0);
    } finally {
      await mf.dispose();
    }
  });
});
