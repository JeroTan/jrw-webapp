import * as React from "react";
import { useMemo } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-display";
import { StatusBadge } from "@/components/feedback";
import { ButtonLink } from "@/components/ui";
import { adminInventoryTone } from "./adminInventoryTone";
import type { AdminInventoryRow } from "./admin-inventory-types";

export type AdminInventoryTableProps = {
  rows: AdminInventoryRow[];
};

export function AdminInventoryTable({ rows }: AdminInventoryTableProps) {
  const columns = useMemo<Array<DataTableColumn<AdminInventoryRow>>>(
    () => [
      {
        key: "product",
        header: "Product",
        cell: (row) => (
          <div className="grid gap-0.5">
            <strong>{row.productName}</strong>
            <span className="text-xs text-brand-muted">{row.productSlug}</span>
            <span className="text-xs text-brand-muted">{row.brandLabel}</span>
          </div>
        ),
      },
      {
        key: "variant",
        header: "Variant / SKU",
        cell: (row) => (
          <div className="grid gap-0.5">
            <span>{row.variantName}</span>
            <span className="text-xs text-brand-muted">{row.sku}</span>
          </div>
        ),
      },
      {
        key: "stock",
        header: "Stock",
        cell: (row) => row.stockLabel,
      },
      {
        key: "inventoryState",
        header: "Inventory state",
        cell: (row) => (
          <StatusBadge
            label={row.inventoryStateLabel}
            tone={adminInventoryTone(row)}
          />
        ),
      },
      {
        key: "availability",
        header: "Availability",
        cell: (row) => row.availabilityLabel,
      },
      {
        key: "action",
        header: "Action",
        align: "right",
        cell: (row) => (
          <ButtonLink
            href={`/admin/products?focus=inventory&productId=${encodeURIComponent(row.productId)}`}
            size="sm"
            textSize="xs"
            variant={row.needsAction ? "primary" : "secondary"}
          >
            Open product
          </ButtonLink>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      caption="Inventory variants"
      columns={columns}
      emptyMessage="No inventory rows match current search."
      getRowId={(row) => row.id}
      rows={rows}
    />
  );
}
