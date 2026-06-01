import type { InventoryState } from "./types";
import { deriveInventoryStateFromQuantity } from "./deriveInventoryStateFromQuantity";

export function inventoryStateConsistent(input: {
  quantity: number;
  state: InventoryState;
  lowStockThreshold?: number;
}): boolean {
  if (input.state === "PREORDER") {
    return true;
  }

  return (
    deriveInventoryStateFromQuantity({
      quantity: input.quantity,
      lowStockThreshold: input.lowStockThreshold,
    }) === input.state
  );
}
