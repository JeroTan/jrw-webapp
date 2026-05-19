import {
  applyAdminApproval,
  applyAdminCreationDefaults,
  applyAdminReactivation,
  applyAdminRejection,
  applyAdminSuspension,
  evaluateAdminLifecycleActor,
  validateAdminAccountCreate,
  validateAdminAccountUpdate,
  type AdminAccountRecord as DomainAdminAccountRecord,
} from "@/domain/admins/admin-account";
import type { AccountEmailNotifier } from "@/domain/notifications/account-emails";
import { toApiDateTime } from "@/lib/api/date-time";
import { hashPassword, type PasswordHashOptions } from "@/lib/crypto/password";
import { GeneralError, type ErrorCodeType } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import type {
  AdminAccountRecord,
  AdminAccountRepository,
} from "@/server/repositories/AdminAccountRepository";

export type AdminActorInput = {
  authenticated: boolean;
  role: string;
  actorId?: string;
};

export type AdminAccountDto = {
  id: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
  status: AdminAccountRecord["status"];
  isOwner: boolean;
  emailVerified: boolean;
  approved: boolean;
  dashboardEligible: boolean;
  suspensionReason: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminAccountListResult = {
  admins: AdminAccountDto[];
};

export type AdminAccountResult = {
  admin: AdminAccountDto;
};

export type CreateAdminAccountResult = AdminAccountResult & {
  invitationEmail: {
    sent: boolean;
  };
};

export type AdminAccountServiceOptions = {
  repository: AdminAccountRepository;
  accountEmails: AccountEmailNotifier;
  passwordPepper: string;
  lifecycleEmailsEnabled?: boolean;
  adminActionUrl?: string | null;
  now?: () => Date;
  passwordHashOptions?: PasswordHashOptions;
};

type ActorScopedInput = {
  actor: AdminActorInput | undefined;
  requestId: string;
};

type AdminEmailConflict = {
  reason: "ADMIN_EMAIL_ALREADY_EXISTS" | "CUSTOMER_EMAIL_ALREADY_EXISTS";
  field: "email";
  existingAccountKind: "ADMIN" | "CUSTOMER";
};

export type CreateAdminAccountServiceInput = ActorScopedInput & {
  body: Record<string, unknown>;
};

export type AdminAccountIdInput = ActorScopedInput & {
  adminAccountId: string;
};

export type UpdateAdminAccountServiceInput = AdminAccountIdInput & {
  body: Record<string, unknown>;
};

export type LifecycleReasonInput = AdminAccountIdInput & {
  body?: Record<string, unknown>;
};

function serviceError(
  code: ErrorCodeType,
  data: Record<string, unknown> = {},
  message?: string
): GeneralError<Record<string, unknown>> {
  return new GeneralError(data, code, message);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /SQLITE_CONSTRAINT|UNIQUE constraint failed|constraint failed/i.test(
      error.message
    )
  );
}

function toDomainRecord(record: AdminAccountRecord): DomainAdminAccountRecord {
  return {
    id: record.id,
    email: record.email,
    role: record.role,
    status: record.status,
    isOwner: record.isOwner,
    emailVerifiedAt: record.emailVerifiedAt,
    approvedAt: record.approvedAt,
    suspensionReason: record.suspensionReason,
    rejectionReason: record.rejectionReason,
  };
}

function dashboardEligible(record: AdminAccountRecord): boolean {
  if (record.status !== "ACTIVE") {
    return false;
  }

  if (record.isOwner || record.role === "SUPER_ADMIN") {
    return true;
  }

  return Boolean(record.emailVerifiedAt && record.approvedAt);
}

function toAdminDto(record: AdminAccountRecord): AdminAccountDto {
  return {
    id: record.id,
    email: record.email,
    role: record.role,
    status: record.status,
    isOwner: record.isOwner,
    emailVerified: Boolean(record.emailVerifiedAt),
    approved: Boolean(record.isOwner || record.approvedAt),
    dashboardEligible: dashboardEligible(record),
    suspensionReason: record.suspensionReason,
    rejectionReason: record.rejectionReason,
    createdAt: toApiDateTime(record.createdAt),
    updatedAt: toApiDateTime(record.updatedAt),
  };
}

function readReason(input: Record<string, unknown> | undefined): string | null {
  return typeof input?.reason === "string" ? input.reason : null;
}

function shouldSendRejectionEmail(
  input: Record<string, unknown> | undefined
): boolean {
  return input?.sendRejectionEmail !== false;
}

export class AdminAccountService {
  private readonly repository: AdminAccountRepository;
  private readonly accountEmails: AccountEmailNotifier;
  private readonly passwordPepper: string;
  private readonly lifecycleEmailsEnabled: boolean;
  private readonly adminActionUrl: string | null;
  private readonly now: () => Date;
  private readonly passwordHashOptions: PasswordHashOptions | undefined;

  constructor(options: AdminAccountServiceOptions) {
    this.repository = options.repository;
    this.accountEmails = options.accountEmails;
    this.passwordPepper = options.passwordPepper;
    this.lifecycleEmailsEnabled = options.lifecycleEmailsEnabled ?? false;
    this.adminActionUrl = options.adminActionUrl ?? null;
    this.now = options.now ?? (() => new Date());
    this.passwordHashOptions = options.passwordHashOptions;
  }

  private requireOwner(
    actor: AdminActorInput | undefined
  ): AppResult<{ ok: true }> {
    const decision = evaluateAdminLifecycleActor(actor);

    if (!decision.ok) {
      return Result.error(serviceError(decision.code));
    }

    return Result.okay({ ok: true });
  }

  private async getMutableTarget(
    adminAccountId: string
  ): Promise<AppResult<AdminAccountRecord>> {
    const target = await this.repository.findAdminAccountById(adminAccountId);

    if (!target) {
      return Result.error(serviceError("RESOURCE_NOT_FOUND"));
    }

    if (target.isOwner || target.role === "SUPER_ADMIN") {
      return Result.error(serviceError("AUTH_FORBIDDEN"));
    }

    return Result.okay(target);
  }

  private async sendLifecycleEmail(input: {
    type: "invitation" | "approval" | "rejection";
    admin: AdminAccountRecord;
    requestId: string;
  }): Promise<AppResult<{ sent: boolean }>> {
    if (!this.lifecycleEmailsEnabled) {
      return Result.okay({ sent: false });
    }

    const payload = {
      toEmail: input.admin.email,
      requestId: input.requestId,
      actionUrl: this.adminActionUrl,
      statusLabel:
        input.type === "invitation"
          ? ("invited" as const)
          : input.type === "approval"
            ? ("approved" as const)
            : ("rejected" as const),
    };

    try {
      const result =
        input.type === "invitation"
          ? await this.accountEmails.sendAdminInvitationEmail(payload)
          : input.type === "approval"
            ? await this.accountEmails.sendAdminApprovalEmail(payload)
            : await this.accountEmails.sendAdminRejectionEmail(payload);

      return Result.okay({ sent: result.ok });
    } catch {
      return Result.okay({ sent: false });
    }
  }

  private async findEmailConflict(
    email: string,
    currentAdminId?: string
  ): Promise<AdminEmailConflict | null> {
    const [admin, customer] = await Promise.all([
      this.repository.findAdminAccountByEmail(email),
      this.repository.findCustomerByEmail(email),
    ]);

    if (admin && admin.id !== currentAdminId) {
      return {
        reason: "ADMIN_EMAIL_ALREADY_EXISTS",
        field: "email",
        existingAccountKind: "ADMIN",
      };
    }

    if (customer) {
      return {
        reason: "CUSTOMER_EMAIL_ALREADY_EXISTS",
        field: "email",
        existingAccountKind: "CUSTOMER",
      };
    }

    return null;
  }

  private emailConflictError(conflict: AdminEmailConflict) {
    const message =
      conflict.existingAccountKind === "ADMIN"
        ? "An Admin account already uses this email."
        : "A Customer account already uses this email.";

    return serviceError("CONFLICT_STATE", conflict, message);
  }

  async listAdminAccounts(
    input: ActorScopedInput
  ): Promise<AppResult<AdminAccountListResult>> {
    const actor = this.requireOwner(input.actor);
    if (actor.error) return actor;

    const admins = await this.repository.listAdminAccounts();
    return Result.okay({
      admins: admins.map((admin) => toAdminDto(admin)),
    });
  }

  async getAdminAccount(
    input: AdminAccountIdInput
  ): Promise<AppResult<AdminAccountResult>> {
    const actor = this.requireOwner(input.actor);
    if (actor.error) return actor;

    const admin = await this.repository.findAdminAccountById(
      input.adminAccountId
    );

    if (!admin) {
      return Result.error(serviceError("RESOURCE_NOT_FOUND"));
    }

    return Result.okay({ admin: toAdminDto(admin) });
  }

  async createAdminAccount(
    input: CreateAdminAccountServiceInput
  ): Promise<AppResult<CreateAdminAccountResult>> {
    const actor = this.requireOwner(input.actor);
    if (actor.error) return actor;

    const validation = validateAdminAccountCreate(input.body);
    if (!validation.ok) {
      return Result.error(serviceError(validation.code));
    }

    const conflict = await this.findEmailConflict(validation.value.email);
    if (conflict) {
      return Result.error(this.emailConflictError(conflict));
    }

    const passwordCredential = await hashPassword(
      validation.value.password,
      this.passwordPepper,
      this.passwordHashOptions
    );
    const createdAt = this.now().toISOString();
    const defaults = applyAdminCreationDefaults({
      email: validation.value.email,
      passwordHash: passwordCredential.passwordHash,
      passwordSalt: passwordCredential.passwordSalt,
      now: createdAt,
    });
    let admin: AdminAccountRecord;
    try {
      admin = await this.repository.createAdminAccount(defaults);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return Result.error(
          this.emailConflictError({
            reason: "ADMIN_EMAIL_ALREADY_EXISTS",
            field: "email",
            existingAccountKind: "ADMIN",
          })
        );
      }

      throw error;
    }
    const invitationEmail =
      validation.value.sendInvitationEmail && this.lifecycleEmailsEnabled
        ? await this.sendLifecycleEmail({
            type: "invitation",
            admin,
            requestId: input.requestId,
          })
        : Result.okay({ sent: false });

    if (invitationEmail.error) {
      return invitationEmail;
    }

    return Result.okay({
      admin: toAdminDto(admin),
      invitationEmail: invitationEmail.content,
    });
  }

  async updateAdminAccount(
    input: UpdateAdminAccountServiceInput
  ): Promise<AppResult<AdminAccountResult>> {
    const actor = this.requireOwner(input.actor);
    if (actor.error) return actor;

    const target = await this.getMutableTarget(input.adminAccountId);
    if (target.error) return target;

    const validation = validateAdminAccountUpdate(input.body);
    if (!validation.ok) {
      return Result.error(serviceError(validation.code));
    }

    const nextEmail = validation.value.email ?? target.content.email;
    if (validation.value.email) {
      const conflict = await this.findEmailConflict(
        validation.value.email,
        input.adminAccountId
      );

      if (conflict) {
        return Result.error(this.emailConflictError(conflict));
      }
    }

    let admin: AdminAccountRecord | null;
    try {
      admin = await this.repository.updateAdminAccount({
        adminAccountId: input.adminAccountId,
        email: nextEmail,
        expectedUpdatedAt: target.content.updatedAt,
        updatedAt: this.now().toISOString(),
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return Result.error(
          this.emailConflictError({
            reason: "ADMIN_EMAIL_ALREADY_EXISTS",
            field: "email",
            existingAccountKind: "ADMIN",
          })
        );
      }

      throw error;
    }

    return admin
      ? Result.okay({ admin: toAdminDto(admin) })
      : Result.error(serviceError("CONFLICT_STATE"));
  }

  async approveAdminAccount(
    input: AdminAccountIdInput
  ): Promise<AppResult<AdminAccountResult>> {
    const actor = this.requireOwner(input.actor);
    if (actor.error) return actor;

    const target = await this.getMutableTarget(input.adminAccountId);
    if (target.error) return target;

    const now = this.now().toISOString();
    const decision = applyAdminApproval({
      account: toDomainRecord(target.content),
      now,
    });
    if (!decision.ok) {
      return Result.error(serviceError(decision.code));
    }

    const admin = await this.repository.approveAdminAccount({
      adminAccountId: input.adminAccountId,
      expectedUpdatedAt: target.content.updatedAt,
      approvedAt: decision.patch.approvedAt ?? now,
      updatedAt: decision.patch.updatedAt,
    });
    if (!admin) {
      return Result.error(serviceError("CONFLICT_STATE"));
    }

    const email = await this.sendLifecycleEmail({
      type: "approval",
      admin,
      requestId: input.requestId,
    });
    if (email.error) return email;

    return Result.okay({ admin: toAdminDto(admin) });
  }

  async rejectAdminAccount(
    input: LifecycleReasonInput
  ): Promise<AppResult<AdminAccountResult>> {
    const actor = this.requireOwner(input.actor);
    if (actor.error) return actor;

    const target = await this.getMutableTarget(input.adminAccountId);
    if (target.error) return target;

    const now = this.now().toISOString();
    const decision = applyAdminRejection({
      account: toDomainRecord(target.content),
      reason: readReason(input.body),
      now,
    });
    if (!decision.ok) {
      return Result.error(serviceError(decision.code));
    }

    const admin = await this.repository.rejectAdminAccount({
      adminAccountId: input.adminAccountId,
      expectedStatus: target.content.status,
      expectedUpdatedAt: target.content.updatedAt,
      rejectionReason: decision.patch.rejectionReason ?? null,
      updatedAt: decision.patch.updatedAt,
    });
    if (!admin) {
      return Result.error(serviceError("CONFLICT_STATE"));
    }

    if (shouldSendRejectionEmail(input.body)) {
      const email = await this.sendLifecycleEmail({
        type: "rejection",
        admin,
        requestId: input.requestId,
      });
      if (email.error) return email;
    }

    return Result.okay({ admin: toAdminDto(admin) });
  }

  async suspendAdminAccount(
    input: LifecycleReasonInput
  ): Promise<AppResult<AdminAccountResult>> {
    const actor = this.requireOwner(input.actor);
    if (actor.error) return actor;

    const target = await this.getMutableTarget(input.adminAccountId);
    if (target.error) return target;

    const now = this.now().toISOString();
    const decision = applyAdminSuspension({
      account: toDomainRecord(target.content),
      reason: readReason(input.body),
      now,
    });
    if (!decision.ok) {
      return Result.error(serviceError(decision.code));
    }

    const admin = await this.repository.suspendAdminAccount({
      adminAccountId: input.adminAccountId,
      expectedUpdatedAt: target.content.updatedAt,
      suspensionReason: decision.patch.suspensionReason ?? null,
      updatedAt: decision.patch.updatedAt,
    });

    return admin
      ? Result.okay({ admin: toAdminDto(admin) })
      : Result.error(serviceError("CONFLICT_STATE"));
  }

  async reactivateAdminAccount(
    input: AdminAccountIdInput
  ): Promise<AppResult<AdminAccountResult>> {
    const actor = this.requireOwner(input.actor);
    if (actor.error) return actor;

    const target = await this.getMutableTarget(input.adminAccountId);
    if (target.error) return target;

    const now = this.now().toISOString();
    const decision = applyAdminReactivation({
      account: toDomainRecord(target.content),
      now,
    });
    if (!decision.ok) {
      return Result.error(serviceError(decision.code));
    }

    const expectedStatus =
      target.content.status === "SUSPENDED" ? "SUSPENDED" : "INACTIVE";
    const admin = await this.repository.reactivateAdminAccount({
      adminAccountId: input.adminAccountId,
      expectedStatus,
      expectedUpdatedAt: target.content.updatedAt,
      updatedAt: decision.patch.updatedAt,
    });

    return admin
      ? Result.okay({ admin: toAdminDto(admin) })
      : Result.error(serviceError("CONFLICT_STATE"));
  }
}
