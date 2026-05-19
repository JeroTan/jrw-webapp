import {
  evaluateAdminLifecycleActor,
  type AdminLifecycleActor,
} from "@/domain/admins/admin-account";
import {
  evaluateOwnershipTransferTarget,
  isEligibleOwnershipTransferTarget,
  validateOwnershipTransferConfirmationPhrase,
  validateOwnershipTransferSubmissionShape,
} from "@/domain/admins/ownership-transfer";
import { verifyPasswordCredential } from "@/domain/auth/password-credentials";
import { toApiDateTime } from "@/lib/api/date-time";
import { GeneralError, type ErrorCodeType } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import {
  filterEligibleOwnershipTransferCandidates,
  type ExecuteOwnershipTransferInput,
  type OwnershipTransferCandidateRecord,
  type OwnershipTransferRepository,
  type OwnershipTransferTargetRecord,
} from "@/server/repositories/OwnershipTransferRepository";

export type OwnershipTransferActorInput = AdminLifecycleActor & {
  actorId?: string;
};

export type OwnershipTransferCandidateDto = {
  id: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
  status: OwnershipTransferCandidateRecord["status"];
  isOwner: boolean;
  emailVerified: boolean;
  approved: boolean;
  dashboardEligible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OwnershipTransferAccountDto = {
  id: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
  status: OwnershipTransferTargetRecord["status"];
  isOwner: boolean;
  emailVerified: boolean;
  approved: boolean;
  updatedAt: string;
};

export type OwnershipTransferCandidateListResult = {
  candidates: OwnershipTransferCandidateDto[];
};

export type OwnershipTransferResult = {
  previousOwner: OwnershipTransferAccountDto;
  newOwner: OwnershipTransferAccountDto;
  revokedSessionCount: number;
  revokedActorIds: string[];
  auditLogId: string;
  sessionRefreshRequired: true;
};

export type OwnershipTransferServiceOptions = {
  repository: OwnershipTransferRepository;
  passwordPepper: string;
  now?: () => Date;
};

type ActorScopedInput = {
  actor: OwnershipTransferActorInput | undefined;
  requestId: string;
};

export type SubmitOwnershipTransferInput = ActorScopedInput & {
  body: Record<string, unknown>;
};

function serviceError(
  code: ErrorCodeType
): GeneralError<Record<string, never>> {
  return new GeneralError({}, code);
}

function providerUnavailableError(): GeneralError<Record<string, never>> {
  return serviceError("PROVIDER_UNAVAILABLE");
}

function toCandidateTarget(candidate: OwnershipTransferCandidateRecord) {
  return {
    id: candidate.id,
    email: candidate.email,
    role: candidate.role,
    status: candidate.status,
    isOwner: candidate.isOwner,
    emailVerifiedAt: candidate.emailVerified ? "verified" : null,
    approvedAt: candidate.approved ? "approved" : null,
  };
}

function toCandidateDto(
  candidate: OwnershipTransferCandidateRecord
): OwnershipTransferCandidateDto {
  return {
    id: candidate.id,
    email: candidate.email,
    role: candidate.role,
    status: candidate.status,
    isOwner: candidate.isOwner,
    emailVerified: candidate.emailVerified,
    approved: candidate.approved,
    dashboardEligible: candidate.dashboardEligible,
    createdAt: toApiDateTime(candidate.createdAt),
    updatedAt: toApiDateTime(candidate.updatedAt),
  };
}

function toAccountDto(
  account: OwnershipTransferTargetRecord
): OwnershipTransferAccountDto {
  return {
    id: account.id,
    email: account.email,
    role: account.role,
    status: account.status,
    isOwner: account.isOwner,
    emailVerified: Boolean(account.emailVerifiedAt),
    approved: Boolean(account.isOwner || account.approvedAt),
    updatedAt: toApiDateTime(account.updatedAt),
  };
}

function isRepositoryConflictError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /D1_|SQLITE_|database|no such table|no such column|prepare|execute|query|crypto/i.test(
      error.message
    )
  );
}

export class OwnershipTransferService {
  private readonly repository: OwnershipTransferRepository;
  private readonly passwordPepper: string;
  private readonly now: () => Date;

  constructor(options: OwnershipTransferServiceOptions) {
    this.repository = options.repository;
    this.passwordPepper = options.passwordPepper;
    this.now = options.now ?? (() => new Date());
  }

  private requireOwner(
    actor: OwnershipTransferActorInput | undefined
  ): AppResult<{ actorId: string }> {
    const decision = evaluateAdminLifecycleActor(actor);

    if (!decision.ok) {
      return Result.error(serviceError(decision.code));
    }

    if (!actor?.actorId) {
      return Result.error(serviceError("AUTH_REQUIRED"));
    }

    return Result.okay({ actorId: actor.actorId });
  }

  async listCandidates(
    input: ActorScopedInput
  ): Promise<AppResult<OwnershipTransferCandidateListResult>> {
    const actor = this.requireOwner(input.actor);
    if (actor.error) return actor;

    try {
      const candidates =
        await this.repository.listOwnershipTransferCandidates();
      const eligibleCandidates = filterEligibleOwnershipTransferCandidates(
        candidates
      ).filter((candidate) =>
        isEligibleOwnershipTransferTarget(toCandidateTarget(candidate))
      );

      return Result.okay({
        candidates: eligibleCandidates.map((candidate) =>
          toCandidateDto(candidate)
        ),
      });
    } catch (error) {
      if (isRepositoryConflictError(error)) {
        return Result.error(providerUnavailableError());
      }

      return Result.error(providerUnavailableError());
    }
  }

  async submitTransfer(
    input: SubmitOwnershipTransferInput
  ): Promise<AppResult<OwnershipTransferResult>> {
    const actor = this.requireOwner(input.actor);
    if (actor.error) return actor;

    const validation = validateOwnershipTransferSubmissionShape(input.body);
    if (!validation.ok) {
      return Result.error(serviceError(validation.code));
    }

    try {
      const currentOwner = await this.repository.findCurrentOwnerCredentialById(
        actor.content.actorId
      );

      if (!currentOwner) {
        return Result.error(serviceError("AUTH_FORBIDDEN"));
      }

      const target = await this.repository.findTransferTargetById(
        validation.value.targetAdminId
      );

      if (!target) {
        return Result.error(serviceError("RESOURCE_NOT_FOUND"));
      }

      const targetDecision = evaluateOwnershipTransferTarget(target);
      if (!targetDecision.ok) {
        return Result.error(serviceError(targetDecision.code));
      }

      const phrase = validateOwnershipTransferConfirmationPhrase({
        confirmationPhrase: validation.value.confirmationPhrase,
        targetEmail: target.email,
      });
      if (!phrase.ok) {
        return Result.error(serviceError(phrase.code));
      }

      const credential = await verifyPasswordCredential({
        password: validation.value.password,
        pepper: this.passwordPepper,
        passwordHash: currentOwner.passwordHash,
        passwordSalt: currentOwner.passwordSalt,
      });
      if (!credential.ok) {
        return Result.error(serviceError("AUTH_FORBIDDEN"));
      }

      const transferInput: ExecuteOwnershipTransferInput = {
        currentOwnerId: actor.content.actorId,
        targetAdminId: validation.value.targetAdminId,
        requestId: input.requestId,
        transferredAt: this.now().toISOString(),
      };
      const transfer = await this.repository.transferOwnership(transferInput);

      if (!transfer.success) {
        return Result.error(serviceError("CONFLICT_STATE"));
      }

      return Result.okay({
        previousOwner: toAccountDto(transfer.previousOwner),
        newOwner: toAccountDto(transfer.newOwner),
        revokedSessionCount: transfer.revokedSessionCount,
        revokedActorIds: transfer.revokedActorIds,
        auditLogId: transfer.auditLogId,
        sessionRefreshRequired: true,
      });
    } catch (error) {
      if (isRepositoryConflictError(error)) {
        return Result.error(providerUnavailableError());
      }

      return Result.error(providerUnavailableError());
    }
  }
}
