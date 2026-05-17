export type OwnerGovernanceStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type OwnerGovernanceCandidate = {
  id: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
  status: OwnerGovernanceStatus;
  isOwner: boolean;
  emailVerified: boolean;
  approved: boolean;
  dashboardEligible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TransferFormErrors = {
  confirmationPhrase?: string;
  password?: string;
};

export function buildRequiredTransferPhrase(email: string): string {
  return `TRANSFER OWNERSHIP TO ${email.trim().toLowerCase()}`;
}

export function candidateEligibilityLabel(
  candidate: Pick<
    OwnerGovernanceCandidate,
    "approved" | "dashboardEligible" | "emailVerified" | "status"
  >
): {
  label: string;
  tone: "success" | "warning" | "error" | "info";
} {
  if (candidate.dashboardEligible) {
    return { label: "Eligible", tone: "success" };
  }

  if (candidate.status === "SUSPENDED") {
    return { label: "Suspended", tone: "error" };
  }

  if (candidate.status === "INACTIVE") {
    return { label: "Inactive", tone: "error" };
  }

  if (!candidate.emailVerified) {
    return { label: "Unverified", tone: "warning" };
  }

  if (!candidate.approved) {
    return { label: "Unapproved", tone: "warning" };
  }

  return { label: "Blocked", tone: "info" };
}

export function validateTransferForm(input: {
  expectedPhrase: string;
  confirmationPhrase: string;
  password: string;
}):
  | {
      ok: true;
      errors: TransferFormErrors;
    }
  | {
      ok: false;
      errors: TransferFormErrors;
    } {
  const errors: TransferFormErrors = {};

  if (input.confirmationPhrase.trim() !== input.expectedPhrase) {
    errors.confirmationPhrase = "Confirmation phrase does not match.";
  }

  if (input.password.length === 0) {
    errors.password = "Password is required.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}
