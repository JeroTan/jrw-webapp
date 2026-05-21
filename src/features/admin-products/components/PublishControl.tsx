import * as React from "react";
import { useState } from "react";
import { StatusBadge } from "@/components/feedback";
import { Button, ConfirmDialog } from "@/components/ui";
import type { ProductReadinessResult, ProductStatus } from "../types";

type PublishControlProps = {
  status: ProductStatus;
  readiness: ProductReadinessResult | null;
  busy?: boolean;
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

  return (
    <section className="jrw-products__publish-control">
      <div className="jrw-products__publish-head">
        <p className="jrw-products__publish-title">Catalog status</p>
        <StatusBadge
          aria-label={`Product status: ${statusLabel(status)}`}
          label={statusLabel(status)}
          tone={statusTone(status)}
        />
      </div>

      <div className="jrw-products__publish-actions">
        <Button
          aria-label="Publish product"
          disabled={busy || !canPublish || !publishReady}
          onClick={async () => {
            await onPublish();
          }}
          variant="primary"
        >
          Publish
        </Button>
        <Button
          aria-label="Move product to draft"
          disabled={busy || !canUnpublish}
          onClick={async () => {
            await onUnpublish();
          }}
          variant="secondary"
        >
          Move to draft
        </Button>
        <Button
          aria-label="Archive product"
          disabled={busy || !canArchive}
          onClick={() => {
            setConfirmArchiveOpen(true);
          }}
          variant="danger"
        >
          Archive
        </Button>
      </div>

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
