import type {
  AdminInventoryRow,
  AdminInventorySource,
} from "./admin-inventory-types";

export function inventoryRowsFromProducts(
  sources: AdminInventorySource[]
): AdminInventoryRow[] {
  return sources
    .flatMap(({ product, variants }): AdminInventoryRow[] => {
      const brandLabel =
        product.brandName && product.brandName.trim().length > 0
          ? product.brandName
          : "No brand";

      if (variants.length === 0) {
        return [
          {
            availabilityLabel: "Create variant",
            brandLabel,
            id: `${product.id}:no-variants`,
            inventoryState: null,
            inventoryStateLabel: "No variants",
            needsAction: true,
            productId: product.id,
            productName: product.name,
            productSlug: product.slug,
            productStatus: product.status,
            sku: "-",
            stockLabel: "-",
            variantId: null,
            variantName: "No variants",
          },
        ];
      }

      return variants.map((variant) => ({
        availabilityLabel: variant.availability,
        brandLabel,
        id: variant.id,
        inventoryState: variant.inventoryState,
        inventoryStateLabel: variant.inventoryState.replaceAll("_", " "),
        needsAction:
          variant.status === "ARCHIVED" ||
          variant.inventoryState === "LOW_STOCK" ||
          variant.inventoryState === "OUT_OF_STOCK" ||
          (!variant.hasAvailableStock && variant.inventoryState !== "PREORDER"),
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        productStatus: product.status,
        sku: variant.sku,
        stockLabel: String(variant.stock),
        variantId: variant.id,
        variantName: variant.name,
      }));
    })
    .sort(
      (left, right) => Number(right.needsAction) - Number(left.needsAction)
    );
}
