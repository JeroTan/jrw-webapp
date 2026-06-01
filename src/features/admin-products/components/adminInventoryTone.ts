import type { StatusBadgeProps } from "@/components/feedback";
import type { AdminInventoryRow } from "./admin-inventory-types";

export function adminInventoryTone(
  row: AdminInventoryRow
): StatusBadgeProps["tone"] {
  if (row.inventoryState === "IN_STOCK") {
    return "success";
  }

  if (row.inventoryState === "PREORDER") {
    return "info";
  }

  return "warning";
}
