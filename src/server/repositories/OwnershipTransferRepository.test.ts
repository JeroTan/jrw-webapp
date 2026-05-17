import { describe, expect, it } from "vitest";
import {
  buildOwnershipTransferAuditDetails,
  filterEligibleOwnershipTransferCandidates,
  ownershipTransferCandidateFromRow,
  ownershipTransferOwnerCredentialFromRow,
  ownershipTransferResultFromBatchResult,
  ownershipTransferSessionRevocationDbValues,
} from "./OwnershipTransferRepository";

const now = "2026-05-17T12:18:00.000Z";

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
});
