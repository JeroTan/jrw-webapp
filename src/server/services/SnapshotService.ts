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
import type { SnapshotRepository } from "@/server/repositories/SnapshotRepository";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

type SnapshotAuth = {
  mode: "required";
  roles: readonly ["ADMIN", "SUPER_ADMIN"];
};

const snapshotAuth: SnapshotAuth = {
  mode: "required",
  roles: ["ADMIN", "SUPER_ADMIN"],
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
  snapshotRepository: SnapshotRepository;
};

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
      return serviceError("RESOURCE_NOT_FOUND", { reason: "PRODUCT_NOT_FOUND" });
    case "VARIANT_NOT_FOUND":
    case "VARIANT_PRODUCT_MISMATCH":
      return serviceError("RESOURCE_NOT_FOUND", { reason: "VARIANT_NOT_FOUND" });
    case "INVALID_SNAPSHOT_INPUT":
    default:
      return serviceError("VALIDATION_FAILED", {
        reason: "INVALID_SNAPSHOT_INPUT",
      });
  }
}

export class SnapshotService {
  private readonly builder: SnapshotBuilder;
  private readonly snapshotRepository: SnapshotRepository;

  constructor(options: SnapshotServiceOptions) {
    this.builder = options.builder;
    this.snapshotRepository = options.snapshotRepository;
  }

  private requireAdminActor(
    actor: SnapshotActorInput | undefined
  ): AppResult<{
    actorId: string;
    safeActorId: string;
    role: "ADMIN" | "SUPER_ADMIN";
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

    if (
      decision.actorRole !== "ADMIN" &&
      decision.actorRole !== "SUPER_ADMIN"
    ) {
      return Result.error(serviceError("AUTH_FORBIDDEN"));
    }

    return Result.okay({
      actorId: actor.actorId,
      safeActorId: actor.safeActorId ?? actor.actorId,
      role: decision.actorRole,
    });
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
