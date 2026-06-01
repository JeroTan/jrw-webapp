import type { InventoryState } from "./types";
import { PRODUCT_VARIANT_LOW_STOCK_THRESHOLD } from "./productValidationLimits";

export function deriveInventoryStateFromQuantity(input: {
  quantity: number;
  isPreorder?: boolean;
  lowStockThreshold?: number;
}): InventoryState {
  if (input.isPreorder) {
    return "PREORDER";
  }

  const threshold = Math.max(
    0,
    input.lowStockThreshold ?? PRODUCT_VARIANT_LOW_STOCK_THRESHOLD
  );

  if (input.quantity <= 0) {
    return "OUT_OF_STOCK";
  }

  if (input.quantity <= threshold) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
}
