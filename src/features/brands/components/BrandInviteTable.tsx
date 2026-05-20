import * as React from "react";
import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-display/DataTable";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import type { BrandInviteRecord } from "../types";

type BrandInviteTableProps = {
  canManageInvites?: boolean;
  loading?: boolean;
  permissionReason?: string;
  rows: BrandInviteRecord[];
};

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

function inviteTone(status: BrandInviteRecord["status"]) {
  if (status === "PENDING") return "warning" as const;
  if (status === "ACTIVE") return "success" as const;
  return "error" as const;
}

export function BrandInviteTable({
  canManageInvites = false,
  loading = false,
  permissionReason = "You need access to manage invites for this brand.",
  rows,
}: BrandInviteTableProps) {
  const columns = useMemo<Array<DataTableColumn<BrandInviteRecord>>>(
    () => [
      {
        key: "invitee",
        header: "Invited admin",
        cell: (row) => row.adminEmail ?? row.adminId,
      },
      {
        key: "invitedBy",
        header: "Invited by",
        cell: (row) => row.invitedByLabel ?? row.invitedByAdminId ?? "JRW",
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => (
          <StatusBadge label={row.status} tone={inviteTone(row.status)} />
        ),
      },
      {
        key: "date",
        header: "Date",
        cell: (row) => formatDateTime(row.createdAt),
      },
      {
        key: "action",
        header: "Next action",
        cell: (row) =>
          canManageInvites
            ? row.status === "PENDING"
              ? "Awaiting acceptance."
              : "No next action."
            : permissionReason,
      },
    ],
    [canManageInvites, permissionReason],
  );

  return (
    <DataTable
      caption="Brand invitations"
      columns={columns}
      emptyMessage="No brand invitations found."
      getRowId={(row) => row.id}
      loading={loading}
      loadingLabel="Loading brand invitations."
      rows={rows}
    />
  );
}
