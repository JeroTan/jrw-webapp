import { describe, expect, it } from "vitest";
import { hashPassword } from "@/lib/crypto/password";
import type {
  ExecuteOwnershipTransferInput,
  OwnershipTransferBatchResult,
  OwnershipTransferCandidateRecord,
  OwnershipTransferOwnerCredentialRecord,
  OwnershipTransferRepository,
  OwnershipTransferTargetRecord,
} from "@/server/repositories/OwnershipTransferRepository";
import { OwnershipTransferService } from "./OwnershipTransferService";

const now = "2026-05-17T12:28:00.000Z";
const pepper = "test-pepper-value";

const ownerActor = {
  authenticated: true,
  role: "SUPER_ADMIN",
  actorId: "admin_owner",
};

function candidate(
  overrides: Partial<OwnershipTransferCandidateRecord> = {}
): OwnershipTransferCandidateRecord {
  return {
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
    ...overrides,
  };
}

function target(
  overrides: Partial<OwnershipTransferTargetRecord> = {}
): OwnershipTransferTargetRecord {
  return {
    id: "admin_target",
    email: "target@example.test",
    role: "ADMIN",
    status: "ACTIVE",
    isOwner: false,
    emailVerifiedAt: now,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function ownerCredential(
  overrides: Partial<OwnershipTransferOwnerCredentialRecord> = {}
): Promise<OwnershipTransferOwnerCredentialRecord> {
  const credential = await hashPassword("correct horse battery staple", pepper);

  return {
    id: "admin_owner",
    email: "owner@example.test",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    isOwner: true,
    emailVerifiedAt: now,
    approvedAt: now,
    passwordHash: credential.passwordHash,
    passwordSalt: credential.passwordSalt,
    updatedAt: now,
    ...overrides,
  };
}

class FakeOwnershipTransferRepository implements OwnershipTransferRepository {
  candidates: OwnershipTransferCandidateRecord[] = [candidate()];
  owner: OwnershipTransferOwnerCredentialRecord | null = null;
  target: OwnershipTransferTargetRecord | null = target();
  transferResult: OwnershipTransferBatchResult = {
    success: true,
    previousOwner: target({
      id: "admin_owner",
      email: "owner@example.test",
      role: "ADMIN",
      isOwner: false,
    }),
    newOwner: target({
      role: "SUPER_ADMIN",
      isOwner: true,
    }),
    revokedSessionCount: 2,
    revokedActorIds: ["admin_owner", "admin_target"],
    auditLogId: "audit_1",
  };
  listed = 0;
  transferInput?: ExecuteOwnershipTransferInput;
  failStorage = false;

  async listOwnershipTransferCandidates() {
    this.listed += 1;
    if (this.failStorage) throw new Error("D1_ERROR: unavailable");
    return this.candidates;
  }

  async findCurrentOwnerCredentialById() {
    if (this.failStorage) throw new Error("D1_ERROR: unavailable");
    return this.owner;
  }

  async findTransferTargetById() {
    if (this.failStorage) throw new Error("D1_ERROR: unavailable");
    return this.target;
  }

  async transferOwnership(input: ExecuteOwnershipTransferInput) {
    if (this.failStorage) throw new Error("D1_ERROR: unavailable");
    this.transferInput = input;
    return this.transferResult;
  }
}

function createService(repository: FakeOwnershipTransferRepository) {
  return new OwnershipTransferService({
    repository,
    passwordPepper: pepper,
    now: () => new Date(now),
  });
}

describe("OwnershipTransferService", () => {
  it("lists only eligible ownership transfer candidates for current owner", async () => {
    const repository = new FakeOwnershipTransferRepository();
    repository.candidates = [
      candidate(),
      candidate({
        id: "admin_suspended",
        status: "SUSPENDED",
        dashboardEligible: false,
      }),
    ];
    const service = createService(repository);

    await expect(
      service.listCandidates({
        actor: ownerActor,
        requestId: "req_candidates",
      })
    ).resolves.toMatchObject({
      content: {
        candidates: [
          {
            id: "admin_target",
            email: "target@example.test",
            emailVerified: true,
            approved: true,
            dashboardEligible: true,
          },
        ],
      },
    });
  });

  it("denies missing, Admin, and Customer actors before repository access", async () => {
    const repository = new FakeOwnershipTransferRepository();
    const service = createService(repository);

    await expect(
      service.listCandidates({
        actor: { authenticated: false, role: "PROSPECT" },
        requestId: "req_anon",
      })
    ).resolves.toMatchObject({ error: { code: "AUTH_REQUIRED" } });
    await expect(
      service.submitTransfer({
        actor: { authenticated: true, role: "ADMIN", actorId: "admin_2" },
        requestId: "req_admin",
        body: {},
      })
    ).resolves.toMatchObject({ error: { code: "AUTH_FORBIDDEN" } });
    await expect(
      service.submitTransfer({
        actor: { authenticated: true, role: "CUSTOMER", actorId: "customer_1" },
        requestId: "req_customer",
        body: {},
      })
    ).resolves.toMatchObject({ error: { code: "AUTH_FORBIDDEN" } });
    expect(repository.listed).toBe(0);
    expect(repository.transferInput).toBeUndefined();
  });

  it("rejects missing target and ineligible target states safely", async () => {
    const repository = new FakeOwnershipTransferRepository();
    repository.owner = await ownerCredential();
    const service = createService(repository);

    repository.target = null;
    await expect(
      service.submitTransfer({
        actor: ownerActor,
        requestId: "req_missing",
        body: {
          targetAdminId: "admin_missing",
          confirmationPhrase: "TRANSFER OWNERSHIP TO target@example.test",
          password: "correct horse battery staple",
        },
      })
    ).resolves.toMatchObject({ error: { code: "RESOURCE_NOT_FOUND" } });

    repository.target = target({ status: "SUSPENDED" });
    await expect(
      service.submitTransfer({
        actor: ownerActor,
        requestId: "req_suspended",
        body: {
          targetAdminId: "admin_target",
          confirmationPhrase: "TRANSFER OWNERSHIP TO target@example.test",
          password: "correct horse battery staple",
        },
      })
    ).resolves.toMatchObject({ error: { code: "CONFLICT_STATE" } });

    repository.target = target({ approvedAt: null });
    await expect(
      service.submitTransfer({
        actor: ownerActor,
        requestId: "req_unapproved",
        body: {
          targetAdminId: "admin_target",
          confirmationPhrase: "TRANSFER OWNERSHIP TO target@example.test",
          password: "correct horse battery staple",
        },
      })
    ).resolves.toMatchObject({ error: { code: "CONFLICT_STATE" } });
  });

  it("rejects wrong phrase, wrong password, and owner-as-target before transfer", async () => {
    const repository = new FakeOwnershipTransferRepository();
    repository.owner = await ownerCredential();
    const service = createService(repository);

    await expect(
      service.submitTransfer({
        actor: ownerActor,
        requestId: "req_wrong_phrase",
        body: {
          targetAdminId: "admin_target",
          confirmationPhrase: "transfer ownership to target@example.test",
          password: "correct horse battery staple",
        },
      })
    ).resolves.toMatchObject({ error: { code: "VALIDATION_FAILED" } });

    await expect(
      service.submitTransfer({
        actor: ownerActor,
        requestId: "req_wrong_password",
        body: {
          targetAdminId: "admin_target",
          confirmationPhrase: "TRANSFER OWNERSHIP TO target@example.test",
          password: "wrong password value",
        },
      })
    ).resolves.toMatchObject({ error: { code: "AUTH_FORBIDDEN" } });

    repository.target = target({
      id: "admin_owner",
      role: "SUPER_ADMIN",
      isOwner: true,
    });
    await expect(
      service.submitTransfer({
        actor: ownerActor,
        requestId: "req_owner_target",
        body: {
          targetAdminId: "admin_owner",
          confirmationPhrase: "TRANSFER OWNERSHIP TO owner@example.test",
          password: "correct horse battery staple",
        },
      })
    ).resolves.toMatchObject({ error: { code: "AUTH_FORBIDDEN" } });

    expect(repository.transferInput).toBeUndefined();
  });

  it("transfers ownership, revokes role context, and keeps secrets out of result", async () => {
    const repository = new FakeOwnershipTransferRepository();
    repository.owner = await ownerCredential();
    const service = createService(repository);

    const result = await service.submitTransfer({
      actor: ownerActor,
      requestId: "req_transfer",
      body: {
        targetAdminId: "admin_target",
        confirmationPhrase: "TRANSFER OWNERSHIP TO target@example.test",
        password: "correct horse battery staple",
      },
    });

    expect(result.error).toBeNull();
    expect(result.content).toMatchObject({
      previousOwner: { id: "admin_owner", role: "ADMIN", isOwner: false },
      newOwner: { id: "admin_target", role: "SUPER_ADMIN", isOwner: true },
      revokedSessionCount: 2,
      sessionRefreshRequired: true,
    });
    expect(repository.transferInput).toEqual({
      currentOwnerId: "admin_owner",
      targetAdminId: "admin_target",
      requestId: "req_transfer",
      transferredAt: now,
    });
    expect(JSON.stringify(result.content)).not.toContain(
      "correct horse battery staple"
    );
    expect(JSON.stringify(result.content)).not.toContain(
      "TRANSFER OWNERSHIP TO"
    );
  });

  it("maps repository conflicts and storage failures to safe service errors", async () => {
    const repository = new FakeOwnershipTransferRepository();
    repository.owner = await ownerCredential();
    repository.transferResult = {
      success: false,
      reason: "INVARIANT_CONFLICT",
      ownerCount: 1,
      revokedSessionCount: 0,
    };
    const service = createService(repository);

    await expect(
      service.submitTransfer({
        actor: ownerActor,
        requestId: "req_conflict",
        body: {
          targetAdminId: "admin_target",
          confirmationPhrase: "TRANSFER OWNERSHIP TO target@example.test",
          password: "correct horse battery staple",
        },
      })
    ).resolves.toMatchObject({ error: { code: "CONFLICT_STATE" } });

    repository.failStorage = true;
    await expect(
      service.listCandidates({
        actor: ownerActor,
        requestId: "req_storage",
      })
    ).resolves.toMatchObject({ error: { code: "PROVIDER_UNAVAILABLE" } });
  });
});
