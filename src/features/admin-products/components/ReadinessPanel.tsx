import * as React from "react";
import { EmptyState } from "@/components/feedback";
import { Button } from "@/components/ui";
import type { ProductReadinessResult } from "../types";

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
    <section className="jrw-products__readiness-panel">
      <header className="jrw-products__readiness-head">
        <div>
          <p className="jrw-products__publish-title">Publish readiness</p>
          <p className="jrw-field__description">
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
        <p className="jrw-field__description">Loading publish readiness...</p>
      ) : null}

      {!loading && errorMessage ? (
        <section
          className="jrw-products__publish-feedback jrw-products__publish-feedback--error"
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
        <section className="jrw-products__publish-feedback" role="status">
          <p>Missing requirements:</p>
          <ul>
            {readiness.missingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

