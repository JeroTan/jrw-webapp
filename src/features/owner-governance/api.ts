import type { OwnerGovernanceCandidate } from "./ownership-transfer";

export type OwnershipTransferAccount = {
  id: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  isOwner: boolean;
  emailVerified: boolean;
  approved: boolean;
  updatedAt: string;
};

export type OwnershipTransferResult = {
  previousOwner: OwnershipTransferAccount;
  newOwner: OwnershipTransferAccount;
  revokedSessionCount: number;
  revokedActorIds: string[];
  auditLogId: string;
  sessionRefreshRequired: boolean;
};

export type ApiFailure = {
  code: string;
  message: string;
};

type ApiEnvelope<T> =
  | {
      data: T;
      meta?: Record<string, unknown>;
    }
  | {
      error: ApiFailure;
    };

async function readApiEnvelope<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;

  if ("error" in payload) {
    throw payload.error;
  }

  return payload.data;
}

export async function fetchOwnershipTransferCandidates(): Promise<
  OwnerGovernanceCandidate[]
> {
  const response = await fetch(
    "/api/admin/owner/ownership-transfer/candidates",
    {
      headers: { accept: "application/json" },
    }
  );
  const data = await readApiEnvelope<{
    candidates: OwnerGovernanceCandidate[];
  }>(response);

  return data.candidates;
}

export async function submitOwnershipTransfer(input: {
  targetAdminId: string;
  confirmationPhrase: string;
  password: string;
}): Promise<OwnershipTransferResult> {
  const response = await fetch("/api/admin/owner/ownership-transfer", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return readApiEnvelope<OwnershipTransferResult>(response);
}
