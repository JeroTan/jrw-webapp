import { describe, expect, it } from "vitest";
import type { AccountEmailNotifier } from "@/domain/notifications/account-emails";
import type {
  AdminAccountRecord,
  AdminAccountRepository,
  CreateAdminAccountInput,
  UpdateAdminAccountInput,
  ApproveAdminAccountInput,
  RejectAdminAccountInput,
  SuspendAdminAccountInput,
  ReactivateAdminAccountInput,
} from "@/server/repositories/AdminAccountRepository";
import { AdminAccountService } from "./AdminAccountService";

const now = "2026-05-16T12:33:19.000Z";

function adminRecord(
  overrides: Partial<AdminAccountRecord> = {}
): AdminAccountRecord {
  return {
    id: "admin_1",
    email: "ops@example.test",
    role: "ADMIN",
    status: "ACTIVE",
    isOwner: false,
    emailVerifiedAt: now,
    approvedAt: now,
    suspensionReason: null,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

class FakeAdminRepository implements AdminAccountRepository {
  admins: AdminAccountRecord[] = [];
  customerEmails: string[] = [];
  created?: CreateAdminAccountInput;
  updated?: UpdateAdminAccountInput;
  approved?: ApproveAdminAccountInput;
  rejected?: RejectAdminAccountInput;
  suspended?: SuspendAdminAccountInput;
  reactivated?: ReactivateAdminAccountInput;

  async listAdminAccounts() {
    return this.admins;
  }

  async findAdminAccountById(adminAccountId: string) {
    return this.admins.find((admin) => admin.id === adminAccountId) ?? null;
  }

  async findAdminAccountByEmail(email: string) {
    return (
      this.admins.find(
        (admin) => admin.email.toLowerCase() === email.toLowerCase()
      ) ?? null
    );
  }

  async findCustomerByEmail(email: string) {
    const existing = this.customerEmails.find(
      (customerEmail) => customerEmail.toLowerCase() === email.toLowerCase()
    );

    return existing ? { id: `customer_${existing}`, email: existing } : null;
  }

  async createAdminAccount(input: CreateAdminAccountInput) {
    this.created = input;
    const record = adminRecord({
      id: `admin_${this.admins.length + 1}`,
      email: input.email,
      status: input.status,
      emailVerifiedAt: input.emailVerifiedAt,
      approvedAt: input.approvedAt,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    });
    this.admins.push(record);
    return record;
  }

  async updateAdminAccount(input: UpdateAdminAccountInput) {
    this.updated = input;
    const admin = await this.findAdminAccountById(input.adminAccountId);
    if (!admin || admin.updatedAt !== input.expectedUpdatedAt) return null;
    admin.email = input.email;
    admin.updatedAt = input.updatedAt;
    return admin;
  }

  async approveAdminAccount(input: ApproveAdminAccountInput) {
    this.approved = input;
    const admin = await this.findAdminAccountById(input.adminAccountId);
    if (
      !admin ||
      admin.updatedAt !== input.expectedUpdatedAt ||
      !admin.emailVerifiedAt ||
      admin.approvedAt
    ) {
      return null;
    }
    admin.status = "ACTIVE";
    admin.approvedAt = input.approvedAt;
    admin.rejectionReason = null;
    admin.updatedAt = input.updatedAt;
    return admin;
  }

  async rejectAdminAccount(input: RejectAdminAccountInput) {
    this.rejected = input;
    const admin = await this.findAdminAccountById(input.adminAccountId);
    if (
      !admin ||
      admin.updatedAt !== input.expectedUpdatedAt ||
      admin.status !== input.expectedStatus
    ) {
      return null;
    }
    admin.status = "INACTIVE";
    admin.approvedAt = null;
    admin.rejectionReason = input.rejectionReason;
    admin.updatedAt = input.updatedAt;
    return admin;
  }

  async suspendAdminAccount(input: SuspendAdminAccountInput) {
    this.suspended = input;
    const admin = await this.findAdminAccountById(input.adminAccountId);
    if (
      !admin ||
      admin.updatedAt !== input.expectedUpdatedAt ||
      admin.status !== "ACTIVE"
    ) {
      return null;
    }
    admin.status = "SUSPENDED";
    admin.suspensionReason = input.suspensionReason;
    admin.updatedAt = input.updatedAt;
    return admin;
  }

  async reactivateAdminAccount(input: ReactivateAdminAccountInput) {
    this.reactivated = input;
    const admin = await this.findAdminAccountById(input.adminAccountId);
    if (
      !admin ||
      admin.updatedAt !== input.expectedUpdatedAt ||
      admin.status !== input.expectedStatus
    ) {
      return null;
    }
    admin.status = "ACTIVE";
    admin.suspensionReason = null;
    admin.rejectionReason = null;
    admin.updatedAt = input.updatedAt;
    return admin;
  }
}

function notifier(sent: string[] = []): AccountEmailNotifier {
  return {
    sendVerificationEmail: async () => ({ ok: true }),
    sendPasswordResetEmail: async () => ({ ok: true }),
    sendAdminInvitationEmail: async () => {
      sent.push("invitation");
      return { ok: true };
    },
    sendAdminApprovalEmail: async () => {
      sent.push("approval");
      return { ok: true };
    },
    sendAdminRejectionEmail: async () => {
      sent.push("rejection");
      return { ok: true };
    },
    sendBrandInvitationEmail: async () => ({ ok: true }),
  };
}

function createService(input: {
  repository?: FakeAdminRepository;
  lifecycleEmailsEnabled?: boolean;
  emails?: AccountEmailNotifier;
} = {}) {
  return new AdminAccountService({
    repository: input.repository ?? new FakeAdminRepository(),
    accountEmails: input.emails ?? notifier(),
    lifecycleEmailsEnabled: input.lifecycleEmailsEnabled ?? false,
    passwordPepper: "test-pepper-value",
    now: () => new Date(now),
  });
}

const ownerActor = {
  authenticated: true,
  role: "SUPER_ADMIN",
  actorId: "owner_1",
};

describe("AdminAccountService", () => {
  it("denies anonymous, Admin, and Customer actors before state changes", async () => {
    const repository = new FakeAdminRepository();
    repository.admins.push(adminRecord());
    const service = createService({ repository });

    await expect(
      service.createAdminAccount({
        actor: { authenticated: false, role: "PROSPECT" },
        requestId: "req_anon",
        body: {
          email: "new@example.test",
          password: "correct horse battery staple",
        },
      })
    ).resolves.toMatchObject({ error: { code: "AUTH_REQUIRED" } });
    await expect(
      service.suspendAdminAccount({
        actor: { authenticated: true, role: "ADMIN", actorId: "admin_2" },
        requestId: "req_admin",
        adminAccountId: "admin_1",
        body: { reason: "Nope" },
      })
    ).resolves.toMatchObject({ error: { code: "AUTH_FORBIDDEN" } });
    await expect(
      service.listAdminAccounts({
        actor: { authenticated: true, role: "CUSTOMER", actorId: "customer_1" },
        requestId: "req_customer",
      })
    ).resolves.toMatchObject({ error: { code: "AUTH_FORBIDDEN" } });
    expect(repository.admins[0]?.status).toBe("ACTIVE");
  });

  it("creates ADMIN accounts with hashed credentials and optional invitation email", async () => {
    const repository = new FakeAdminRepository();
    const sent: string[] = [];
    const service = createService({
      repository,
      emails: notifier(sent),
      lifecycleEmailsEnabled: true,
    });

    const result = await service.createAdminAccount({
      actor: ownerActor,
      requestId: "req_create",
      body: {
        email: " Ops@Example.TEST ",
        password: "correct horse battery staple",
        sendInvitationEmail: true,
      },
    });

    expect(result.error).toBeNull();
    expect(result.content?.admin).toMatchObject({
      email: "ops@example.test",
      role: "ADMIN",
      isOwner: false,
      emailVerified: true,
      approved: true,
    });
    expect(repository.created?.passwordHash).toMatch(/^pbkdf2-sha256\$/);
    expect(repository.created?.passwordHash).not.toContain(
      "correct horse battery staple"
    );
    expect(repository.created?.passwordSalt).toEqual(expect.any(String));
    expect(sent).toEqual(["invitation"]);
    expect(JSON.stringify(result.content)).not.toContain("passwordHash");
    expect(JSON.stringify(result.content)).not.toContain("passwordSalt");
  });

  it("lists, inspects, and updates safe admin account fields", async () => {
    const repository = new FakeAdminRepository();
    repository.admins.push(adminRecord());
    const service = createService({ repository });

    await expect(
      service.listAdminAccounts({ actor: ownerActor, requestId: "req_list" })
    ).resolves.toMatchObject({
      content: { admins: [{ id: "admin_1", email: "ops@example.test" }] },
    });
    await expect(
      service.getAdminAccount({
        actor: ownerActor,
        requestId: "req_get",
        adminAccountId: "admin_1",
      })
    ).resolves.toMatchObject({
      content: { admin: { id: "admin_1", role: "ADMIN" } },
    });

    const updated = await service.updateAdminAccount({
      actor: ownerActor,
      requestId: "req_update",
      adminAccountId: "admin_1",
      body: { email: " NewOps@Example.TEST ", role: "SUPER_ADMIN" },
    });

    expect(updated.error).toBeNull();
    expect(updated.content?.admin).toMatchObject({
      email: "newops@example.test",
      role: "ADMIN",
    });
    expect(repository.updated).toEqual({
      adminAccountId: "admin_1",
      email: "newops@example.test",
      expectedUpdatedAt: now,
      updatedAt: now,
    });
  });

  it("approves, rejects, suspends, and reactivates admin accounts with safe notification behavior", async () => {
    const repository = new FakeAdminRepository();
    const sent: string[] = [];
    repository.admins.push(adminRecord({ approvedAt: null }));
    const service = createService({
      repository,
      emails: notifier(sent),
      lifecycleEmailsEnabled: true,
    });

    await expect(
      service.approveAdminAccount({
        actor: ownerActor,
        requestId: "req_approve",
        adminAccountId: "admin_1",
      })
    ).resolves.toMatchObject({
      content: { admin: { approved: true, status: "ACTIVE" } },
    });
    await expect(
      service.suspendAdminAccount({
        actor: ownerActor,
        requestId: "req_suspend",
        adminAccountId: "admin_1",
        body: { reason: "Policy review" },
      })
    ).resolves.toMatchObject({
      content: { admin: { status: "SUSPENDED", dashboardEligible: false } },
    });
    await expect(
      service.reactivateAdminAccount({
        actor: ownerActor,
        requestId: "req_reactivate",
        adminAccountId: "admin_1",
      })
    ).resolves.toMatchObject({
      content: { admin: { status: "ACTIVE", dashboardEligible: true } },
    });
    await expect(
      service.rejectAdminAccount({
        actor: ownerActor,
        requestId: "req_reject",
        adminAccountId: "admin_1",
        body: { reason: "No longer eligible", sendRejectionEmail: true },
      })
    ).resolves.toMatchObject({
      content: { admin: { status: "INACTIVE", dashboardEligible: false } },
    });

    expect(repository.suspended).toMatchObject({
      adminAccountId: "admin_1",
      suspensionReason: "Policy review",
    });
    expect(repository.rejected).toMatchObject({
      adminAccountId: "admin_1",
      rejectionReason: "No longer eligible",
    });
    expect(sent).toEqual(["approval", "rejection"]);
  });

  it("protects owner invariants and blocks duplicate Admin or Customer emails", async () => {
    const repository = new FakeAdminRepository();
    repository.admins.push(
      adminRecord({ id: "owner_1", role: "SUPER_ADMIN", isOwner: true }),
      adminRecord({ id: "admin_2", email: "duplicate@example.test" })
    );
    repository.customerEmails.push("customer@example.test");
    const service = createService({ repository });

    await expect(
      service.suspendAdminAccount({
        actor: ownerActor,
        requestId: "req_owner",
        adminAccountId: "owner_1",
        body: { reason: "Nope" },
      })
    ).resolves.toMatchObject({ error: { code: "AUTH_FORBIDDEN" } });
    await expect(
      service.createAdminAccount({
        actor: ownerActor,
        requestId: "req_duplicate",
        body: {
          email: "DUPLICATE@example.test",
          password: "correct horse battery staple",
        },
      })
    ).resolves.toMatchObject({ error: { code: "CONFLICT_STATE" } });
    await expect(
      service.createAdminAccount({
        actor: ownerActor,
        requestId: "req_customer_duplicate",
        body: {
          email: "CUSTOMER@example.test",
          password: "correct horse battery staple",
        },
      })
    ).resolves.toMatchObject({ error: { code: "CONFLICT_STATE" } });
    await expect(
      service.updateAdminAccount({
        actor: ownerActor,
        requestId: "req_update_customer_duplicate",
        adminAccountId: "admin_2",
        body: { email: "customer@example.test" },
      })
    ).resolves.toMatchObject({ error: { code: "CONFLICT_STATE" } });
  });

  it("keeps committed admin changes successful when lifecycle emails fail", async () => {
    const repository = new FakeAdminRepository();
    repository.admins.push(adminRecord({ approvedAt: null }));
    const service = createService({
      repository,
      lifecycleEmailsEnabled: true,
      emails: {
        ...notifier(),
        sendAdminInvitationEmail: async () => ({
          ok: false,
          error: new Error("raw provider token leaked"),
        }),
        sendAdminApprovalEmail: async () => ({
          ok: false,
          error: new Error("raw provider token leaked"),
        }),
        sendAdminRejectionEmail: async () => {
          throw new Error("raw provider token leaked");
        },
      },
    });

    const created = await service.createAdminAccount({
      actor: ownerActor,
      requestId: "req_email_fail",
      body: {
        email: "new@example.test",
        password: "correct horse battery staple",
        sendInvitationEmail: true,
      },
    });
    expect(created.error).toBeNull();
    expect(created.content?.invitationEmail.sent).toBe(false);
    expect(repository.admins.some((admin) => admin.email === "new@example.test")).toBe(
      true
    );

    await expect(
      service.approveAdminAccount({
        actor: ownerActor,
        requestId: "req_approve_fail",
        adminAccountId: "admin_1",
      })
    ).resolves.toMatchObject({
      content: { admin: { approved: true, status: "ACTIVE" } },
    });
    await expect(
      service.rejectAdminAccount({
        actor: ownerActor,
        requestId: "req_reject_fail",
        adminAccountId: "admin_1",
        body: { reason: "No longer eligible", sendRejectionEmail: true },
      })
    ).resolves.toMatchObject({
      content: { admin: { status: "INACTIVE", dashboardEligible: false } },
    });
  });
});
