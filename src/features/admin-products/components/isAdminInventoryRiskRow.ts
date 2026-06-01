import type { AdminInventoryRow } from "./admin-inventory-types";

export function isAdminInventoryRiskRow(row: AdminInventoryRow): boolean {
  return row.needsAction;
}
