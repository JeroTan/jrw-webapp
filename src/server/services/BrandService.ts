import {
  createAuditEvent,
  NoopAuditEventPublisher,
  type AuditEventPublisher,
} from "@/domain/audit/events";
import {
  createBrand as createBrandDraft,
  detectBrandCreateConflict,
} from "@/domain/brands/brand";
import { evaluateRouteAccess } from "@/domain/auth/rbac";
import type { RequestActorContext } from "@/server/context/request-context";
import type {
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

export type BrandCreateResult = {
  brand: BrandRecord;
};

export type BrandServiceOptions = {
  repository: BrandRepository;
  auditPublisher?: AuditEventPublisher;
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

export class BrandService {
  private readonly repository: BrandRepository;
  private readonly auditPublisher: AuditEventPublisher;
  private readonly now: () => Date;

  constructor(options: BrandServiceOptions) {
    this.repository = options.repository;
    this.auditPublisher =
      options.auditPublisher ?? new NoopAuditEventPublisher();
    this.now = options.now ?? (() => new Date());
  }

  private requireCreateActor(
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

  async createBrand(
    input: CreateBrandServiceInput
  ): Promise<AppResult<BrandCreateResult>> {
    const actor = this.requireCreateActor(input.actor);
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
}
