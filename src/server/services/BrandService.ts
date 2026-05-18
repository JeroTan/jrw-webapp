import {
  createAuditEvent,
  NoopAuditEventPublisher,
  type AuditEventPublisher,
} from "@/domain/audit/events";
import {
  archiveBrand as archiveBrandDraft,
  createBrand as createBrandDraft,
  createBrandInvitation,
  detectBrandCreateConflict,
  updateBrand as updateBrandDraft,
  type BrandUpdateInput,
} from "@/domain/brands/brand";
import { evaluateRouteAccess } from "@/domain/auth/rbac";
import type { AccountEmailNotifier } from "@/domain/notifications/account-emails";
import type { RequestActorContext } from "@/server/context/request-context";
import type {
  BrandAdminRecord,
  BrandMembershipRecord,
  BrandRecord,
  BrandRepository,
} from "@/server/repositories/BrandRepository";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

type BrandCreateAuth = {
  mode: "required";
  roles: readonly ["ADMIN", "SUPER_ADMIN"];
};

const brandCreateAuth: BrandCreateAuth = {
  mode: "required",
  roles: ["ADMIN", "SUPER_ADMIN"],
};

export type BrandActorInput = Pick<
  RequestActorContext,
  "authenticated" | "role" | "actorId" | "accountStatus" | "eligibility"
>;

export type CreateBrandServiceInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  body: Record<string, unknown>;
};

export type UpdateBrandServiceInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  brandId: string;
  body: Record<string, unknown>;
};

export type ArchiveBrandServiceInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  brandId: string;
};

export type InviteBrandServiceInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  brandId: string;
  body: Record<string, unknown>;
};

export type BrandCreateResult = {
  brand: BrandRecord;
};

export type BrandUpdateResult = {
  brand: BrandRecord;
};

export type BrandArchiveResult = {
  brand: BrandRecord;
};

export type BrandInviteResult = {
  invitation: BrandMembershipRecord;
};

export type BrandServiceOptions = {
  repository: BrandRepository;
  auditPublisher?: AuditEventPublisher;
  accountEmails?: AccountEmailNotifier;
  invitationEmailsEnabled?: boolean;
  brandInvitationActionUrl?: string | null;
  now?: () => Date;
};

function serviceError(
  code:
    | "AUTH_REQUIRED"
    | "AUTH_FORBIDDEN"
    | "ACCOUNT_SUSPENDED"
    | "EMAIL_NOT_VERIFIED"
    | "ADMIN_APPROVAL_REQUIRED"
    | "VALIDATION_FAILED"
    | "CONFLICT_STATE"
    | "PROVIDER_UNAVAILABLE",
  data: Record<string, unknown> = {}
) {
  return new GeneralError(data, code);
}

function providerFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    /D1_|SQLITE_|database|query|constraint|prepare|execute|transaction|storage/i.test(
      error.message
    )
  );
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /SQLITE_CONSTRAINT|UNIQUE constraint failed|constraint failed/i.test(
      error.message
    )
  );
}

function mapBrandDomainErrorCode(
  code: string
): "VALIDATION_FAILED" | "CONFLICT_STATE" {
  return code === "CONFLICT_STATE" ? "CONFLICT_STATE" : "VALIDATION_FAILED";
}

const noopAccountEmails: AccountEmailNotifier = {
  async sendVerificationEmail() {
    return { ok: false };
  },
  async sendPasswordResetEmail() {
    return { ok: false };
  },
  async sendAdminInvitationEmail() {
    return { ok: false };
  },
  async sendAdminApprovalEmail() {
    return { ok: false };
  },
  async sendAdminRejectionEmail() {
    return { ok: false };
  },
  async sendBrandInvitationEmail() {
    return { ok: false };
  },
};

function normalizeInviteEmail(value: string): string {
  return value.trim().toLowerCase();
}

export class BrandService {
  private readonly repository: BrandRepository;
  private readonly auditPublisher: AuditEventPublisher;
  private readonly accountEmails: AccountEmailNotifier;
  private readonly invitationEmailsEnabled: boolean;
  private readonly brandInvitationActionUrl: string | null;
  private readonly now: () => Date;

  constructor(options: BrandServiceOptions) {
    this.repository = options.repository;
    this.auditPublisher =
      options.auditPublisher ?? new NoopAuditEventPublisher();
    this.accountEmails = options.accountEmails ?? noopAccountEmails;
    this.invitationEmailsEnabled = options.invitationEmailsEnabled ?? false;
    this.brandInvitationActionUrl = options.brandInvitationActionUrl ?? null;
    this.now = options.now ?? (() => new Date());
  }

  private requireAdminActor(
    actor: BrandActorInput | undefined
  ): AppResult<{ actorId: string; role: "ADMIN" | "SUPER_ADMIN" }> {
    const decision = evaluateRouteAccess({
      auth: brandCreateAuth,
      actor,
    });

    if (!decision.allowed) {
      return Result.error(serviceError(decision.code));
    }

    if (!actor?.actorId) {
      return Result.error(serviceError("AUTH_REQUIRED"));
    }

    if (
      decision.actorRole !== "ADMIN" &&
      decision.actorRole !== "SUPER_ADMIN"
    ) {
      return Result.error(serviceError("AUTH_FORBIDDEN"));
    }

    return Result.okay({
      actorId: actor.actorId,
      role: decision.actorRole,
    });
  }

  private hasOwnField(body: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(body, key);
  }

  private extractUpdatePatch(
    body: Record<string, unknown>
  ): AppResult<BrandUpdateInput> {
    const patch: BrandUpdateInput = {};
    const reasons: string[] = [];

    if (this.hasOwnField(body, "name")) {
      if (typeof body.name === "string" || body.name === null) {
        patch.name = body.name;
      } else {
        reasons.push("name:type");
      }
    }

    if (this.hasOwnField(body, "slug")) {
      if (typeof body.slug === "string" || body.slug === null) {
        patch.slug = body.slug;
      } else {
        reasons.push("slug:type");
      }
    }

    if (this.hasOwnField(body, "description")) {
      if (
        typeof body.description === "string" ||
        body.description === null
      ) {
        patch.description = body.description;
      } else {
        reasons.push("description:type");
      }
    }

    if (reasons.length > 0) {
      return Result.error(serviceError("VALIDATION_FAILED", { reasons }));
    }

    return Result.okay(patch);
  }

  private extractInviteTarget(
    body: Record<string, unknown>
  ): AppResult<{ adminId?: string; email?: string }> {
    const reasons: string[] = [];
    let adminId: string | undefined;
    let email: string | undefined;

    if (this.hasOwnField(body, "adminId")) {
      if (typeof body.adminId !== "string") {
        reasons.push("adminId:type");
      } else if (body.adminId.trim().length === 0) {
        reasons.push("adminId:required");
      } else {
        adminId = body.adminId.trim();
      }
    }

    if (this.hasOwnField(body, "email")) {
      if (typeof body.email !== "string") {
        reasons.push("email:type");
      } else if (body.email.trim().length === 0) {
        reasons.push("email:required");
      } else {
        email = normalizeInviteEmail(body.email);
      }
    }

    if (reasons.length > 0) {
      return Result.error(serviceError("VALIDATION_FAILED", { reasons }));
    }

    if (!adminId && !email) {
      return Result.error(
        serviceError("VALIDATION_FAILED", { reasons: ["target:required"] })
      );
    }

    return Result.okay({
      ...(adminId ? { adminId } : {}),
      ...(email ? { email } : {}),
    });
  }

  private invitationActionUrl(brandId: string): string {
    if (!this.brandInvitationActionUrl) {
      return "";
    }

    try {
      const url = new URL(this.brandInvitationActionUrl);
      if (!url.searchParams.has("brandId")) {
        url.searchParams.set("brandId", brandId);
      }
      return url.toString();
    } catch {
      return this.brandInvitationActionUrl;
    }
  }

  private async findInviteTargetAdmin(input: {
    adminId?: string;
    email?: string;
  }): Promise<AppResult<BrandAdminRecord | null>> {
    if (input.adminId && input.email) {
      const [adminById, adminByEmail] = await Promise.all([
        this.repository.findAdminById(input.adminId),
        this.repository.findAdminByEmail(input.email),
      ]);

      if (!adminById && !adminByEmail) {
        return Result.okay(null);
      }

      if (!adminById || !adminByEmail || adminById.id !== adminByEmail.id) {
        return Result.error(
          serviceError("VALIDATION_FAILED", {
            reasons: ["target:identifier_mismatch"],
          })
        );
      }

      return Result.okay(adminById);
    }

    if (input.adminId) {
      return Result.okay(await this.repository.findAdminById(input.adminId));
    }

    if (input.email) {
      return Result.okay(await this.repository.findAdminByEmail(input.email));
    }

    return Result.okay(null);
  }

  private async sendBrandInvitationEmail(input: {
    brand: BrandRecord;
    targetAdmin: BrandAdminRecord;
    invitedByAdminId: string;
    requestId: string;
  }): Promise<void> {
    if (!this.invitationEmailsEnabled) {
      return;
    }

    try {
      await this.accountEmails.sendBrandInvitationEmail({
        toEmail: input.targetAdmin.email,
        brandName: input.brand.name,
        invitedByDisplayName: input.invitedByAdminId,
        actionUrl: this.invitationActionUrl(input.brand.id),
        requestId: input.requestId,
      });
    } catch {
      return;
    }
  }

  private hasElevatedPermission(role: "ADMIN" | "SUPER_ADMIN"): boolean {
    return role === "SUPER_ADMIN";
  }

  private isActiveBrandMember(
    membership: BrandMembershipRecord | null
  ): membership is BrandMembershipRecord {
    if (!membership) return false;
    if (membership.status !== "ACTIVE") return false;

    return membership.role === "OWNER" || membership.role === "MEMBER";
  }

  async createBrand(
    input: CreateBrandServiceInput
  ): Promise<AppResult<BrandCreateResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) return actor;

    const draft = createBrandDraft({
      name: typeof input.body.name === "string" ? input.body.name : "",
      slug: typeof input.body.slug === "string" ? input.body.slug : null,
      description:
        typeof input.body.description === "string"
          ? input.body.description
          : null,
    });
    if (draft.error) {
      return Result.error(serviceError("VALIDATION_FAILED", draft.error.data));
    }

    try {
      const [existingByName, existingBySlug, existingArchivedByName] =
        await Promise.all([
          this.repository.findBrandByName(draft.content.name),
          this.repository.findBrandBySlug(draft.content.slug),
          this.repository.findArchivedBrandByName(draft.content.name),
        ]);

      const conflict = detectBrandCreateConflict({
        existingByName: existingByName
          ? { id: existingByName.id, name: existingByName.name }
          : null,
        existingBySlug: existingBySlug
          ? { id: existingBySlug.id, slug: existingBySlug.slug }
          : null,
        existingArchivedByName: existingArchivedByName
          ? {
              id: existingArchivedByName.id,
              name: existingArchivedByName.name,
            }
          : null,
      });

      if (!conflict.ok) {
        return Result.error(
          serviceError("CONFLICT_STATE", { reason: conflict.reason })
        );
      }

      const timestamp = this.now().toISOString();
      const { brand } = await this.repository.createBrandWithOwnerMembership(
        {
          brand: {
            name: draft.content.name,
            slug: draft.content.slug,
            description: draft.content.description,
            status: "ACTIVE",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          membership: {
            adminId: actor.content.actorId,
            role: "OWNER",
            status: "ACTIVE",
            invitedByAdminId: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        },
        actor.content.actorId
      );

      const auditEvent = createAuditEvent({
        requestId: input.requestId,
        action: "brand.created",
        actor: {
          type: "user",
          id: actor.content.actorId,
          role: actor.content.role,
        },
        target: {
          entity: "brand",
          entityId: brand.id,
        },
        safeDetails: {
          requestId: input.requestId,
          name: brand.name,
          slug: brand.slug,
          timestamp,
        },
        occurredAt: timestamp,
      });

      await this.auditPublisher.publish(auditEvent);

      return Result.okay({ brand });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async inviteAdminToBrand(
    input: InviteBrandServiceInput
  ): Promise<AppResult<BrandInviteResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) return actor;

    const target = this.extractInviteTarget(input.body);
    if (target.error) return target;

    try {
      const brand = await this.repository.findBrandById(input.brandId);
      if (!brand) {
        return Result.error(
          serviceError("CONFLICT_STATE", { reason: "BRAND_NOT_FOUND" })
        );
      }

      const actorMembership = await this.repository.findMembershipByBrandAndAdmin(
        input.brandId,
        actor.content.actorId
      );

      if (
        !this.hasElevatedPermission(actor.content.role) &&
        !this.isActiveBrandMember(actorMembership)
      ) {
        return Result.error(serviceError("AUTH_FORBIDDEN"));
      }

      const targetAdminResult = await this.findInviteTargetAdmin(target.content);
      if (targetAdminResult.error) {
        return targetAdminResult;
      }
      const targetAdmin = targetAdminResult.content;

      const existingMembership = targetAdmin
        ? await this.repository.findMembershipByBrandAndAdmin(
            input.brandId,
            targetAdmin.id
          )
        : null;

      const invitationDraft = createBrandInvitation({
        invitingActor: {
          adminId: actor.content.actorId,
          role: actor.content.role,
          currentMembership: actorMembership
            ? {
                adminId: actorMembership.adminId,
                role: actorMembership.role,
                status: actorMembership.status,
              }
            : null,
        },
        targetAdminId:
          targetAdmin?.id ?? target.content.adminId ?? target.content.email ?? "",
        brandId: input.brandId,
        existingMembership: existingMembership
          ? {
              adminId: existingMembership.adminId,
              role: existingMembership.role,
              status: existingMembership.status,
            }
          : null,
        targetAdmin: targetAdmin
          ? {
              adminId: targetAdmin.id,
              role: targetAdmin.role,
              status: targetAdmin.status,
              emailVerifiedAt: targetAdmin.emailVerifiedAt,
              approvedAt: targetAdmin.approvedAt,
            }
          : null,
      });
      if (invitationDraft.error) {
        const code =
          invitationDraft.error.code === "AUTH_FORBIDDEN"
            ? "AUTH_FORBIDDEN"
            : mapBrandDomainErrorCode(invitationDraft.error.code);
        const data =
          typeof invitationDraft.error.data === "object" &&
          invitationDraft.error.data !== null
            ? invitationDraft.error.data
            : {};
        return Result.error(serviceError(code, data));
      }

      const timestamp = this.now().toISOString();
      const invitation = await this.repository.createBrandMembership({
        brandId: invitationDraft.content.brandId,
        adminId: invitationDraft.content.adminId,
        role: invitationDraft.content.role,
        status: invitationDraft.content.status,
        invitedByAdminId: invitationDraft.content.invitedByAdminId,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      const auditEvent = createAuditEvent({
        requestId: input.requestId,
        action: "brand.member_invited",
        actor: {
          type: "user",
          id: actor.content.actorId,
          role: actor.content.role,
        },
        target: {
          entity: "brand",
          entityId: brand.id,
        },
        safeDetails: {
          requestId: input.requestId,
          brandId: brand.id,
          targetAdminId: invitation.adminId,
          timestamp,
        },
        occurredAt: timestamp,
      });

      await this.auditPublisher.publish(auditEvent);

      if (targetAdmin) {
        await this.sendBrandInvitationEmail({
          brand,
          targetAdmin,
          invitedByAdminId: actor.content.actorId,
          requestId: input.requestId,
        });
      }

      return Result.okay({ invitation });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return Result.error(
          serviceError("CONFLICT_STATE", {
            reason: "DUPLICATE_PENDING_INVITATION",
          })
        );
      }

      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async updateBrand(
    input: UpdateBrandServiceInput
  ): Promise<AppResult<BrandUpdateResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) return actor;

    const patch = this.extractUpdatePatch(input.body);
    if (patch.error) return patch;
    const validatedPatch = updateBrandDraft({
      patch: patch.content,
      conflict: {
        existingByName: null,
        existingBySlug: null,
        existingArchivedByName: null,
      },
    });
    if (validatedPatch.error) {
      return Result.error(
        serviceError(
          mapBrandDomainErrorCode(validatedPatch.error.code),
          validatedPatch.error.data
        )
      );
    }

    try {
      const brand = await this.repository.findBrandById(input.brandId);
      if (!brand) {
        return Result.error(
          serviceError("CONFLICT_STATE", { reason: "BRAND_NOT_FOUND" })
        );
      }

      if (!this.hasElevatedPermission(actor.content.role)) {
        const membership = await this.repository.findMembershipByBrandAndAdmin(
          input.brandId,
          actor.content.actorId
        );
        if (!this.isActiveBrandMember(membership)) {
          return Result.error(serviceError("AUTH_FORBIDDEN"));
        }
      }

      const [existingByName, existingBySlug, existingArchivedByName] =
        await Promise.all([
          validatedPatch.content.name
            ? this.repository.findBrandByNameExcluding(
                input.brandId,
                validatedPatch.content.name
              )
            : Promise.resolve(null),
          validatedPatch.content.slug
            ? this.repository.findBrandBySlugExcluding(
                input.brandId,
                validatedPatch.content.slug
              )
            : Promise.resolve(null),
          validatedPatch.content.name
            ? this.repository.findArchivedBrandByNameExcluding(
                input.brandId,
                validatedPatch.content.name
              )
            : Promise.resolve(null),
        ]);

      const draft = updateBrandDraft({
        patch: validatedPatch.content,
        conflict: {
          existingByName: existingByName
            ? { id: existingByName.id, name: existingByName.name }
            : null,
          existingBySlug: existingBySlug
            ? { id: existingBySlug.id, slug: existingBySlug.slug }
            : null,
          existingArchivedByName: existingArchivedByName
            ? {
                id: existingArchivedByName.id,
                name: existingArchivedByName.name,
              }
            : null,
        },
      });
      if (draft.error) {
        return Result.error(
          serviceError(
            mapBrandDomainErrorCode(draft.error.code),
            draft.error.data
          )
        );
      }

      const timestamp = this.now().toISOString();
      const updatedBrand = await this.repository.updateBrand(input.brandId, {
        ...draft.content,
        updatedAt: timestamp,
      });

      const changedFields = Object.fromEntries(
        Object.entries({
          ...(draft.content.name !== undefined
            ? {
                name: {
                  from: brand.name,
                  to: draft.content.name,
                },
              }
            : {}),
          ...(draft.content.slug !== undefined
            ? {
                slug: {
                  from: brand.slug,
                  to: draft.content.slug,
                },
              }
            : {}),
          ...(draft.content.description !== undefined
            ? {
                description: {
                  from: brand.description,
                  to: draft.content.description,
                },
              }
            : {}),
        })
      );

      const auditEvent = createAuditEvent({
        requestId: input.requestId,
        action: "brand.updated",
        actor: {
          type: "user",
          id: actor.content.actorId,
          role: actor.content.role,
        },
        target: {
          entity: "brand",
          entityId: updatedBrand.id,
        },
        safeDetails: {
          requestId: input.requestId,
          changedFields,
          timestamp,
        },
        occurredAt: timestamp,
      });

      await this.auditPublisher.publish(auditEvent);

      return Result.okay({ brand: updatedBrand });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return Result.error(serviceError("CONFLICT_STATE"));
      }

      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async archiveBrand(
    input: ArchiveBrandServiceInput
  ): Promise<AppResult<BrandArchiveResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) return actor;

    try {
      const brand = await this.repository.findBrandByIdIncludingArchived(
        input.brandId
      );
      if (!brand) {
        return Result.error(
          serviceError("CONFLICT_STATE", { reason: "BRAND_NOT_FOUND" })
        );
      }

      if (!this.hasElevatedPermission(actor.content.role)) {
        const membership = await this.repository.findMembershipByBrandAndAdmin(
          input.brandId,
          actor.content.actorId
        );
        if (!this.isActiveBrandMember(membership)) {
          return Result.error(serviceError("AUTH_FORBIDDEN"));
        }
      }

      const timestamp = this.now().toISOString();
      const archiveDraft = archiveBrandDraft({
        currentStatus: brand.status,
        timestamp,
      });
      if (archiveDraft.error) {
        return Result.error(
          serviceError(
            mapBrandDomainErrorCode(archiveDraft.error.code),
            archiveDraft.error.data
          )
        );
      }

      const archivedBrand = await this.repository.archiveBrand(
        input.brandId,
        archiveDraft.content.archivedAt
      );

      const auditEvent = createAuditEvent({
        requestId: input.requestId,
        action: "brand.archived",
        actor: {
          type: "user",
          id: actor.content.actorId,
          role: actor.content.role,
        },
        target: {
          entity: "brand",
          entityId: archivedBrand.id,
        },
        safeDetails: {
          requestId: input.requestId,
          name: archivedBrand.name,
          slug: archivedBrand.slug,
          timestamp,
        },
        occurredAt: timestamp,
      });

      await this.auditPublisher.publish(auditEvent);

      return Result.okay({ brand: archivedBrand });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }
}
