import * as React from "react";
import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-display/DataTable";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { Button } from "@/components/ui/Button";
import type { BrandJoinRequestRecord } from "../types";

type BrandJoinRequestTableProps = {
  canManageJoinRequests?: boolean;
  loading?: boolean;
  onApprove?: (adminId: string) => void;
  onReject?: (adminId: string) => void;
  pendingAdminId?: string | null;
  permissionReason?: string;
  rows: BrandJoinRequestRecord[];
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

export function BrandJoinRequestTable({
  canManageJoinRequests = false,
  loading = false,
  onApprove,
  onReject,
  pendingAdminId = null,
  permissionReason = "You need access to review join requests for this brand.",
  rows,
}: BrandJoinRequestTableProps) {
  const columns = useMemo<Array<DataTableColumn<BrandJoinRequestRecord>>>(
    () => [
      {
        key: "requester",
        header: "Requester",
        cell: (row) => row.adminEmail ?? row.adminId,
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => <StatusBadge label={row.status} tone="warning" />,
      },
      {
        key: "requestedAt",
        header: "Requested",
        cell: (row) => formatDateTime(row.createdAt),
      },
      {
        key: "actions",
        header: "Next action",
        cell: (row) => {
          if (!canManageJoinRequests) {
            return permissionReason;
          }

          if (row.status !== "PENDING") {
            return "No next action.";
          }

          const submitting = pendingAdminId === row.adminId;

          return (
            <div className="inline-flex flex-wrap gap-grid-xs">
              <Button
                disabled={submitting}
                loading={submitting}
                loadingLabel="Approving"
                onClick={() => onApprove?.(row.adminId)}
                size="sm"
                variant="primary"
              >
                Approve
              </Button>
              <Button
                disabled={submitting}
                loading={submitting}
                loadingLabel="Rejecting"
                onClick={() => onReject?.(row.adminId)}
                size="sm"
                variant="danger"
              >
                Reject
              </Button>
            </div>
          );
        },
      },
    ],
    [canManageJoinRequests, onApprove, onReject, pendingAdminId, permissionReason],
  );

  return (
    <DataTable
      caption="Brand join requests"
      columns={columns}
      emptyMessage="No join requests found."
      getRowId={(row) => row.id}
      loading={loading}
      loadingLabel="Loading join requests."
      rows={rows}
    />
  );
}
