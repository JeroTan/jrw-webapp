import * as React from "react";

import type { AdminInventoryLoadState } from "./admin-inventory-types";

export type AdminInventorySummaryProps = {
  loadState: AdminInventoryLoadState;
  needsActionCount: number;
  totalProducts: number;
  totalVariants: number;
};

export function AdminInventorySummary({
  loadState,
  needsActionCount,
  totalProducts,
  totalVariants,
}: AdminInventorySummaryProps) {
  return (
    <dl
      aria-label="Inventory summary"
      className="m-0 grid grid-cols-3 border border-brand-border-strong bg-brand-surface max-md:grid-cols-1 [&>div]:grid [&>div]:gap-grid-xs [&>div]:border-r [&>div]:border-brand-border [&>div]:p-grid-sm [&>div:last-child]:border-r-0 max-md:[&>div]:border-r-0 max-md:[&>div]:border-b max-md:[&>div:last-child]:border-b-0 [&_dd]:m-0 [&_dd]:font-heading [&_dd]:text-xl [&_dd]:font-bold [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:text-brand-muted"
    >
      <div>
        <dt>Products scanned</dt>
        <dd>{loadState === "ready" ? totalProducts : "-"}</dd>
      </div>
      <div>
        <dt>Variant rows</dt>
        <dd>{loadState === "ready" ? totalVariants : "-"}</dd>
      </div>
      <div>
        <dt>Needs action</dt>
        <dd>{loadState === "ready" ? needsActionCount : "-"}</dd>
      </div>
    </dl>
  );
}
