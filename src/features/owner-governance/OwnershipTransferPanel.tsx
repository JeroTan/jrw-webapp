import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  fetchOwnershipTransferCandidates,
  submitOwnershipTransfer,
  type ApiFailure,
  type OwnershipTransferResult,
} from "./api";
import {
  buildRequiredTransferPhrase,
  candidateEligibilityLabel,
  validateTransferForm,
  type OwnerGovernanceCandidate,
  type TransferFormErrors,
} from "./ownership-transfer";

type LoadState = "loading" | "ready" | "failed";
type DialogState =
  | "ready"
  | "ineligible"
  | "confirming"
  | "failed"
  | "complete"
  | "session-expired";

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function apiFailureMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ApiFailure).message === "string"
  ) {
    return (error as ApiFailure).message;
  }

  return "Ownership transfer failed.";
}

export function OwnershipTransferPanel() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [candidates, setCandidates] = useState<OwnerGovernanceCandidate[]>([]);
  const [selected, setSelected] = useState<OwnerGovernanceCandidate | null>(
    null
  );
  const [dialogState, setDialogState] = useState<DialogState>("ready");
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<TransferFormErrors>({});
  const [formSummary, setFormSummary] = useState<string | null>(null);
  const [result, setResult] = useState<OwnershipTransferResult | null>(null);

  useEffect(() => {
    let mounted = true;

    fetchOwnershipTransferCandidates()
      .then((items) => {
        if (!mounted) return;
        setCandidates(items);
        setLoadState("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setLoadState("failed");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const eligibleCount = candidates.filter(
    (candidate) => candidate.dashboardEligible
  ).length;
  const selectedPhrase = selected
    ? buildRequiredTransferPhrase(selected.email)
    : "";

  const columns = useMemo<Array<DataTableColumn<OwnerGovernanceCandidate>>>(
    () => [
      {
        key: "email",
        header: "Admin",
        cell: (candidate) => (
          <span className="jrw-owner-governance__email">{candidate.email}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (candidate) => (
          <StatusBadge
            label={candidate.status}
            tone={candidate.status === "ACTIVE" ? "success" : "error"}
          />
        ),
      },
      {
        key: "emailVerified",
        header: "Verified",
        cell: (candidate) => (candidate.emailVerified ? "Verified" : "No"),
      },
      {
        key: "approved",
        header: "Approved",
        cell: (candidate) => (candidate.approved ? "Approved" : "No"),
      },
      {
        key: "eligibility",
        header: "Eligibility",
        cell: (candidate) => {
          const status = candidateEligibilityLabel(candidate);

          return <StatusBadge label={status.label} tone={status.tone} />;
        },
      },
      {
        key: "updated",
        header: "Updated",
        cell: (candidate) => formatDateTime(candidate.updatedAt),
      },
      {
        key: "action",
        header: "Action",
        align: "right",
        cell: (candidate) => (
          <Button
            disabled={!candidate.dashboardEligible}
            onClick={() => openDialog(candidate)}
            size="sm"
            variant={candidate.dashboardEligible ? "danger" : "secondary"}
          >
            {candidate.dashboardEligible ? "Transfer" : "Ineligible"}
          </Button>
        ),
      },
    ],
    []
  );

  function openDialog(candidate: OwnerGovernanceCandidate) {
    setSelected(candidate);
    setDialogState(candidate.dashboardEligible ? "ready" : "ineligible");
    setConfirmationPhrase("");
    setPassword("");
    setErrors({});
    setFormSummary(null);
    setResult(null);
  }

  function closeDialog() {
    if (dialogState === "confirming") return;

    if (dialogState === "complete" || dialogState === "session-expired") {
      window.location.assign("/");
      return;
    }

    setSelected(null);
  }

  async function handleSubmit(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) {
    event.preventDefault();
    if (!selected) return;

    const validation = validateTransferForm({
      expectedPhrase: selectedPhrase,
      confirmationPhrase,
      password,
    });
    setErrors(validation.errors);

    if (!validation.ok) {
      setFormSummary("Resolve highlighted fields before transfer.");
      return;
    }

    setDialogState("confirming");
    setFormSummary(null);

    try {
      const transfer = await submitOwnershipTransfer({
        targetAdminId: selected.id,
        confirmationPhrase: confirmationPhrase.trim(),
        password,
      });
      setPassword("");
      setConfirmationPhrase("");
      setResult(transfer);
      setDialogState("complete");
    } catch (error) {
      setPassword("");
      setDialogState(
        typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as ApiFailure).code === "AUTH_REQUIRED"
          ? "session-expired"
          : "failed"
      );
      setFormSummary(apiFailureMessage(error));
    }
  }

  return (
    <main className="jrw-owner-governance">
      <header className="jrw-owner-governance__header">
        <div>
          <p className="jrw-page-kicker">Owner-only governance</p>
          <h1 className="jrw-owner-governance__title">Ownership Transfer</h1>
        </div>
        <dl
          className="jrw-owner-governance__metrics"
          aria-label="Transfer status"
        >
          <div>
            <dt>Eligible Admins</dt>
            <dd>{loadState === "ready" ? eligibleCount : "-"}</dd>
          </div>
          <div>
            <dt>Owner Rule</dt>
            <dd>One Super Admin</dd>
          </div>
        </dl>
      </header>

      <section className="jrw-owner-governance__section">
        {loadState === "loading" ? (
          <Skeleton lines={4} label="Loading ownership candidates" />
        ) : null}

        {loadState === "failed" ? (
          <EmptyState
            message="Candidate list could not load. Sign in again or retry from an owner session."
            title="Ownership candidates unavailable"
          />
        ) : null}

        {loadState === "ready" ? (
          <DataTable
            caption="Ownership transfer candidates"
            columns={columns}
            emptyMessage="No eligible Admin accounts."
            getRowId={(candidate) => candidate.id}
            rows={candidates}
          />
        ) : null}
      </section>

      {formSummary && dialogState === "failed" ? (
        <div className="jrw-owner-governance__toast">
          <Toast
            message={formSummary}
            onDismiss={() => setFormSummary(null)}
            title="Transfer rejected"
            tone="error"
          />
        </div>
      ) : null}

      <Modal
        closeLabel={
          dialogState === "complete" || dialogState === "session-expired"
            ? "Refresh session"
            : "Close dialog"
        }
        description={
          selected
            ? `${selected.email} becomes Super Admin. Current owner becomes Admin. Both accounts refresh authority.`
            : undefined
        }
        footer={
          dialogState === "complete" || dialogState === "session-expired" ? (
            <Button
              onClick={() => window.location.assign("/")}
              variant="primary"
            >
              Refresh session
            </Button>
          ) : (
            <>
              <Button
                disabled={dialogState === "confirming"}
                onClick={closeDialog}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                form="ownership-transfer-form"
                loading={dialogState === "confirming"}
                loadingLabel="Transferring"
                type="submit"
                variant="danger"
              >
                Transfer Ownership
              </Button>
            </>
          )
        }
        onClose={closeDialog}
        open={Boolean(selected)}
        title="Transfer ownership"
      >
        {selected ? (
          <form
            className="jrw-owner-governance__dialog"
            id="ownership-transfer-form"
            onSubmit={handleSubmit}
          >
            <div className="jrw-owner-governance__target">
              <span>Target Admin</span>
              <strong>{selected.email}</strong>
              <StatusBadge
                label={candidateEligibilityLabel(selected).label}
                tone={candidateEligibilityLabel(selected).tone}
              />
            </div>

            {dialogState === "ineligible" ? (
              <p className="jrw-owner-governance__error">
                Selected Admin is not eligible for ownership transfer.
              </p>
            ) : null}

            {dialogState === "complete" && result ? (
              <div className="jrw-owner-governance__complete" role="status">
                <p>Ownership transferred.</p>
                <p>
                  {result.newOwner.email} is Super Admin. Current owner session
                  was cleared.
                </p>
              </div>
            ) : null}

            {dialogState === "session-expired" ? (
              <div className="jrw-owner-governance__complete" role="alert">
                <p>Owner session expired.</p>
                <p>Refresh session before continuing governance work.</p>
              </div>
            ) : null}

            {dialogState !== "complete" && dialogState !== "session-expired" ? (
              <>
                <div className="jrw-owner-governance__phrase">
                  <span>Required phrase</span>
                  <code>{selectedPhrase}</code>
                </div>
                {formSummary ? (
                  <p className="jrw-owner-governance__error" role="alert">
                    {formSummary}
                  </p>
                ) : null}
                <Input
                  autoComplete="off"
                  disabled={dialogState === "confirming"}
                  error={errors.confirmationPhrase}
                  label="Confirmation phrase"
                  onChange={(event) =>
                    setConfirmationPhrase(event.currentTarget.value)
                  }
                  required
                  value={confirmationPhrase}
                />
                <Input
                  autoComplete="current-password"
                  disabled={dialogState === "confirming"}
                  error={errors.password}
                  label="Current owner password"
                  onChange={(event) => setPassword(event.currentTarget.value)}
                  required
                  type="password"
                  value={password}
                />
              </>
            ) : null}
          </form>
        ) : null}
      </Modal>
    </main>
  );
}
