import type { ProductRecord } from "./types";

export function productCanMutate(
  product: ProductRecord,
  availableBrandIds: Set<string>,
  brandScopeKnown: boolean
): { allowed: boolean; reason: string | null } {
  if (!brandScopeKnown || !product.brandId) {
    return { allowed: true, reason: null };
  }

  if (availableBrandIds.has(product.brandId)) {
    return { allowed: true, reason: null };
  }

  return {
    allowed: false,
    reason: "You need active membership in this product brand.",
  };
}
