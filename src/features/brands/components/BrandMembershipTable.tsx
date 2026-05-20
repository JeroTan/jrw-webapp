import * as React from "react";
import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-display/DataTable";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import type { BrandMembershipRecord } from "../types";

type BrandMembershipTableProps = {
  loading?: boolean;
  permissionReason?: string;
  rows: BrandMembershipRecord[];
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

function membershipTone(status: BrandMembershipRecord["status"]) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  return "error" as const;
}

function nextActionLabel(row: BrandMembershipRecord): string {
  if (row.status === "ACTIVE") {
    return "Active brand member.";
  }

  if (row.status === "PENDING" && row.invitedByAdminId) {
    return "Waiting for invited admin response.";
  }

  if (row.status === "PENDING") {
    return "Pending join request. Review in Join Requests tab.";
  }

  return "No next action.";
}

export function BrandMembershipTable({
  loading = false,
  permissionReason = "You need access to manage this brand.",
  rows,
}: BrandMembershipTableProps) {
  const columns = useMemo<Array<DataTableColumn<BrandMembershipRecord>>>(
    () => [
      {
        key: "member",
        header: "Brand member",
        cell: (row) => row.adminEmail ?? row.adminId,
      },
      {
        key: "membershipRole",
        header: "Membership role",
        cell: (row) => row.role,
      },
      {
        key: "membershipStatus",
        header: "Status",
        cell: (row) => (
          <StatusBadge label={row.status} tone={membershipTone(row.status)} />
        ),
      },
      {
        key: "updated",
        header: "Updated",
        cell: (row) => formatDateTime(row.updatedAt),
      },
      {
        key: "actions",
        header: "Next action",
        cell: (row) => (
          <span title={permissionReason}>{nextActionLabel(row)}</span>
        ),
      },
    ],
    [permissionReason],
  );

  return (
    <DataTable
      caption="Brand members and membership states"
      columns={columns}
      emptyMessage="No brand members found."
      getRowId={(row) => row.id}
      loading={loading}
      loadingLabel="Loading brand members."
      rows={rows}
    />
  );
}
