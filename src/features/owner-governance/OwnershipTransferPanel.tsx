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
import { InputBox } from "@/components/ui/InputBox";

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
          <span className="font-bold">{candidate.email}</span>
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

    setPassword("");
    setConfirmationPhrase("");
    setErrors({});
    setFormSummary(null);
    setResult(null);
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
    <section className="grid gap-grid-sm">
      <header className="grid grid-cols-[minmax(0,1fr)_minmax(280px,420px)] items-end gap-grid-md border-b border-brand-border-strong py-grid-md pt-grid-lg max-md:grid-cols-1 max-md:items-stretch max-md:pt-grid-md">
        <div>
          <p className="font-system text-xs font-bold uppercase text-brand-muted">
            Owner-only governance
          </p>
          <h1 className="text-[clamp(2rem,6vw,4.75rem)]">Ownership Transfer</h1>
        </div>
        <dl
          className="m-0 grid grid-cols-2 border border-brand-border-strong bg-brand-surface max-md:grid-cols-1 [&>div]:grid [&>div]:gap-grid-xs [&>div]:border-r [&>div]:border-brand-border [&>div]:p-grid-sm [&>div:last-child]:border-r-0 max-md:[&>div]:border-r-0 max-md:[&>div]:border-b max-md:[&>div:last-child]:border-b-0 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:text-brand-muted [&_dd]:m-0 [&_dd]:font-heading [&_dd]:text-xl [&_dd]:font-bold"
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

      <section className="grid gap-grid-sm py-grid-md">
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
        <div className="fixed bottom-grid-md right-grid-md z-[60] max-md:bottom-grid-sm max-md:left-grid-sm max-md:right-grid-sm">
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
            className="grid gap-grid-sm"
            id="ownership-transfer-form"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm [&_span]:text-xs [&_span]:font-bold [&_span]:uppercase [&_span]:text-brand-muted [&_strong]:[overflow-wrap:anywhere]">
              <span>Target Admin</span>
              <strong>{selected.email}</strong>
              <StatusBadge
                label={candidateEligibilityLabel(selected).label}
                tone={candidateEligibilityLabel(selected).tone}
              />
            </div>

            {dialogState === "ineligible" ? (
              <p className="font-system text-[0.8125rem] font-bold text-brand-danger">
                Selected Admin is not eligible for ownership transfer.
              </p>
            ) : null}

            {dialogState === "complete" && result ? (
              <div
                className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm"
                role="status"
              >
                <p>Ownership transferred.</p>
                <p>
                  {result.newOwner.email} is Super Admin. Current owner session
                  was cleared.
                </p>
              </div>
            ) : null}

            {dialogState === "session-expired" ? (
              <div
                className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm"
                role="alert"
              >
                <p>Owner session expired.</p>
                <p>Refresh session before continuing governance work.</p>
              </div>
            ) : null}

            {dialogState !== "complete" && dialogState !== "session-expired" ? (
              <>
                <div className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm [&_span]:text-xs [&_span]:font-bold [&_span]:uppercase [&_span]:text-brand-muted [&_code]:font-system [&_code]:text-sm [&_code]:[overflow-wrap:anywhere]">
                  <span>Required phrase</span>
                  <code>{selectedPhrase}</code>
                </div>
                {formSummary ? (
                  <p
                    className="font-system text-[0.8125rem] font-bold text-brand-danger"
                    role="alert"
                  >
                    {formSummary}
                  </p>
                ) : null}
                <InputBox
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
                <InputBox
                  autoComplete="off"
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
    </section>
  );
}
