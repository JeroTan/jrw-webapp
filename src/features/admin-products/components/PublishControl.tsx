import * as React from "react";
import { useState } from "react";
import { StatusBadge } from "@/components/feedback";
import { Button, ConfirmDialog } from "@/components/ui";
import type { ProductReadinessResult, ProductStatus } from "../types";

type PublishControlProps = {
  status: ProductStatus;
  readiness: ProductReadinessResult | null;
  busy?: boolean;
  mutationsBlocked?: boolean;
  publishBlockedReason?: string | null;
  initialArchiveConfirmOpen?: boolean;
  onPublish: () => Promise<void> | void;
  onUnpublish: () => Promise<void> | void;
  onArchive: () => Promise<void> | void;
};

function statusTone(status: ProductStatus) {
  switch (status) {
    case "PUBLISHED":
      return "success" as const;
    case "ARCHIVED":
      return "warning" as const;
    default:
      return "info" as const;
  }
}

function statusLabel(status: ProductStatus) {
  switch (status) {
    case "PUBLISHED":
      return "Published";
    case "ARCHIVED":
      return "Archived";
    default:
      return "Draft";
  }
}

export function PublishControl({
  status,
  readiness,
  busy = false,
  mutationsBlocked = false,
  publishBlockedReason = null,
  initialArchiveConfirmOpen = false,
  onPublish,
  onUnpublish,
  onArchive,
}: PublishControlProps) {
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(
    initialArchiveConfirmOpen
  );
  const canPublish = status === "DRAFT";
  const canUnpublish = status === "PUBLISHED";
  const canArchive = status !== "ARCHIVED";
  const publishReady = readiness?.isReady ?? false;
  const blockedReason =
    publishBlockedReason ??
    (!publishReady && canPublish
      ? "Complete missing readiness items before publishing."
      : null);

  return (
    <section className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm">
      <div className="flex flex-wrap items-center justify-between gap-grid-sm">
        <p className="m-0 text-sm font-bold">Catalog status</p>
        <StatusBadge
          aria-label={`Product status: ${statusLabel(status)}`}
          label={statusLabel(status)}
          tone={statusTone(status)}
        />
      </div>

      <div className="inline-flex flex-wrap gap-grid-xs">
        <Button
          aria-label="Publish product"
          disabled={busy || mutationsBlocked || !canPublish || !publishReady}
          onClick={async () => {
            await onPublish();
          }}
          title={blockedReason ?? undefined}
          variant="primary"
        >
          Publish
        </Button>
        <Button
          aria-label="Move product to draft"
          disabled={busy || mutationsBlocked || !canUnpublish}
          onClick={async () => {
            await onUnpublish();
          }}
          title={publishBlockedReason ?? undefined}
          variant="secondary"
        >
          Move to draft
        </Button>
        <Button
          aria-label="Archive product"
          disabled={busy || mutationsBlocked || !canArchive}
          onClick={() => {
            setConfirmArchiveOpen(true);
          }}
          title={publishBlockedReason ?? undefined}
          variant="danger"
        >
          Archive
        </Button>
      </div>

      {blockedReason ? (
        <p className="font-system text-xs text-brand-muted">{blockedReason}</p>
      ) : null}

      <ConfirmDialog
        confirmLabel="Archive product"
        message="Archive keeps historical references and removes this product from active catalog."
        onCancel={() => {
          if (busy) {
            return;
          }
          setConfirmArchiveOpen(false);
        }}
        onConfirm={async () => {
          await onArchive();
          setConfirmArchiveOpen(false);
        }}
        open={confirmArchiveOpen}
        title="Archive product"
        tone="danger"
      />
    </section>
  );
}
