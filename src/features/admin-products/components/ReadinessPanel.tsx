import * as React from "react";
import { EmptyState } from "@/components/feedback";
import { Button } from "@/components/ui";
import type { ProductReadinessResult } from "../types";
import { ReadinessMissingItems } from "./ReadinessMissingItems";

type ReadinessPanelProps = {
  readiness: ProductReadinessResult | null;
  loading?: boolean;
  busy?: boolean;
  errorMessage?: string | null;
  onRefresh: () => Promise<void> | void;
};

export function ReadinessPanel({
  readiness,
  loading = false,
  busy = false,
  errorMessage = null,
  onRefresh,
}: ReadinessPanelProps) {
  return (
    <section className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm">
      <header className="flex flex-wrap items-start justify-between gap-grid-sm">
        <div>
          <p className="m-0 text-sm font-bold">Publish readiness</p>
          <p className="font-system text-xs text-brand-muted">
            Readiness validates required catalog data before publish.
          </p>
        </div>
        <Button
          disabled={busy || loading}
          onClick={async () => {
            await onRefresh();
          }}
          size="sm"
          variant="secondary"
        >
          Refresh
        </Button>
      </header>

      {loading ? (
        <p className="font-system text-xs text-brand-muted">
          Loading publish readiness...
        </p>
      ) : null}

      {!loading && errorMessage ? (
        <section
          className="grid gap-grid-xs border border-brand-border-strong p-grid-sm font-system text-[0.8125rem] font-bold [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-grid-sm border-brand-danger bg-brand-danger/6 text-brand-danger"
          role="alert"
        >
          <p>{errorMessage}</p>
        </section>
      ) : null}

      {!loading && !errorMessage && readiness?.isReady ? (
        <EmptyState
          message="All publish-required product fields are valid."
          title="Ready to publish"
        />
      ) : null}

      {!loading &&
      !errorMessage &&
      readiness &&
      !readiness.isReady &&
      readiness.missingItems.length > 0 ? (
        <ReadinessMissingItems items={readiness.missingItems} />
      ) : null}
    </section>
  );
}
