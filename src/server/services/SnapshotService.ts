import { evaluateRouteAccess } from "@/domain/auth/rbac";
import {
  SnapshotBuildError,
  type SnapshotBuilder,
} from "@/domain/snapshots/snapshot-builder";
import { zodSnapshotBuildInput } from "@/domain/snapshots/schemas";
import type {
  SnapshotBuildResult,
  SnapshotDetailResult,
  SnapshotListResult,
} from "@/domain/snapshots/types";
import type { RequestActorContext } from "@/server/context/request-context";
import type {
  ProductBrandMembershipRecord,
  ProductRepository,
} from "@/server/repositories/ProductRepository";
import type { SnapshotRepository } from "@/server/repositories/SnapshotRepository";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

type SnapshotAuth = {
  mode: "required";
  roles: readonly ["ADMIN"];
};

const snapshotAuth: SnapshotAuth = {
  mode: "required",
  roles: ["ADMIN"],
};

export type SnapshotActorInput = Pick<
  RequestActorContext,
  | "authenticated"
  | "role"
  | "actorId"
  | "safeActorId"
  | "accountStatus"
  | "eligibility"
>;

export type BuildSnapshotServiceInput = {
  actor: SnapshotActorInput | undefined;
  requestId: string;
  body: Record<string, unknown>;
};

export type GetSnapshotServiceInput = {
  actor: SnapshotActorInput | undefined;
  requestId: string;
  snapshotId: string;
};

export type ListOrderSnapshotsServiceInput = {
  actor: SnapshotActorInput | undefined;
  requestId: string;
  orderId: string;
};

export type SnapshotServiceOptions = {
  builder: SnapshotBuilder;
  productRepository: Pick<
    ProductRepository,
    "findById" | "findBrandMembership"
  >;
  snapshotRepository: SnapshotRepository;
};

function isActiveMembership(
  membership: ProductBrandMembershipRecord | null
): membership is ProductBrandMembershipRecord {
  if (!membership) {
    return false;
  }

  if (membership.status !== "ACTIVE") {
    return false;
  }

  return membership.role === "OWNER" || membership.role === "MEMBER";
}

function serviceError(
  code:
    | "AUTH_REQUIRED"
    | "AUTH_FORBIDDEN"
    | "ACCOUNT_SUSPENDED"
    | "EMAIL_NOT_VERIFIED"
    | "ADMIN_APPROVAL_REQUIRED"
    | "VALIDATION_FAILED"
    | "RESOURCE_NOT_FOUND"
    | "PROVIDER_UNAVAILABLE",
  data: Record<string, unknown> = {}
) {
  return new GeneralError(data, code);
}

function providerFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    /D1_|SQLITE_|database|query|constraint|prepare|execute|transaction/i.test(
      error.message
    )
  );
}

function snapshotBuildError(error: SnapshotBuildError): GeneralError {
  switch (error.reason) {
    case "PRODUCT_NOT_FOUND":
      return serviceError("RESOURCE_NOT_FOUND", {
        reason: "PRODUCT_NOT_FOUND",
      });
    case "VARIANT_NOT_FOUND":
    case "VARIANT_PRODUCT_MISMATCH":
      return serviceError("RESOURCE_NOT_FOUND", {
        reason: "VARIANT_NOT_FOUND",
      });
    case "INVALID_SNAPSHOT_INPUT":
    default:
      return serviceError("VALIDATION_FAILED", {
        reason: "INVALID_SNAPSHOT_INPUT",
      });
  }
}

export class SnapshotService {
  private readonly builder: SnapshotBuilder;
  private readonly productRepository: Pick<
    ProductRepository,
    "findById" | "findBrandMembership"
  >;
  private readonly snapshotRepository: SnapshotRepository;

  constructor(options: SnapshotServiceOptions) {
    this.builder = options.builder;
    this.productRepository = options.productRepository;
    this.snapshotRepository = options.snapshotRepository;
  }

  private requireAdminActor(actor: SnapshotActorInput | undefined): AppResult<{
    actorId: string;
    safeActorId: string;
    role: "ADMIN";
  }> {
    const decision = evaluateRouteAccess({
      auth: snapshotAuth,
      actor,
    });

    if (!decision.allowed) {
      return Result.error(serviceError(decision.code));
    }

    if (!actor?.actorId) {
      return Result.error(serviceError("AUTH_REQUIRED"));
    }

    if (decision.actorRole !== "ADMIN") {
      return Result.error(serviceError("AUTH_FORBIDDEN"));
    }

    return Result.okay({
      actorId: actor.actorId,
      safeActorId: actor.safeActorId ?? actor.actorId,
      role: decision.actorRole,
    });
  }

  private async loadProductOrError(productId: string) {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      return Result.error(
        serviceError("RESOURCE_NOT_FOUND", { reason: "PRODUCT_NOT_FOUND" })
      );
    }

    return Result.okay(product);
  }

  private async requireBrandReadPermission(input: {
    actorId: string;
    role: "ADMIN";
    brandId: string | null;
  }): Promise<AppResult<null>> {
    if (!input.brandId) {
      return Result.okay(null);
    }

    const membership = await this.productRepository.findBrandMembership(
      input.brandId,
      input.actorId
    );
    if (!isActiveMembership(membership)) {
      return Result.error(
        serviceError("AUTH_FORBIDDEN", { reason: "BRAND_MEMBERSHIP_REQUIRED" })
      );
    }

    return Result.okay(null);
  }

  async buildSnapshot(
    input: BuildSnapshotServiceInput
  ): Promise<AppResult<SnapshotBuildResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const parsed = zodSnapshotBuildInput.safeParse(input.body);
    if (!parsed.success) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          reason: "INVALID_SNAPSHOT_INPUT",
        })
      );
    }

    try {
      const product = await this.loadProductOrError(parsed.data.productId);
      if (product.error) {
        return Result.error(product.error);
      }

      const permission = await this.requireBrandReadPermission({
        actorId: actor.content.actorId,
        role: actor.content.role,
        brandId: product.content.brandId,
      });
      if (permission.error) {
        return Result.error(permission.error);
      }

      const snapshot = await this.builder.build(parsed.data);
      return Result.okay({ snapshot });
    } catch (error) {
      if (error instanceof SnapshotBuildError) {
        return Result.error(snapshotBuildError(error));
      }

      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async getSnapshot(
    input: GetSnapshotServiceInput
  ): Promise<AppResult<SnapshotDetailResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    if (!input.snapshotId.trim()) {
      return Result.error(serviceError("VALIDATION_FAILED"));
    }

    try {
      const snapshot = await this.snapshotRepository.getSnapshot(
        input.snapshotId
      );
      if (!snapshot) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "SNAPSHOT_NOT_FOUND" })
        );
      }

      return Result.okay({ snapshot });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async listOrderSnapshots(
    input: ListOrderSnapshotsServiceInput
  ): Promise<AppResult<SnapshotListResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    if (!input.orderId.trim()) {
      return Result.error(serviceError("VALIDATION_FAILED"));
    }

    try {
      const items = await this.snapshotRepository.getSnapshotsByOrderId(
        input.orderId
      );
      return Result.okay({ items });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }
}
