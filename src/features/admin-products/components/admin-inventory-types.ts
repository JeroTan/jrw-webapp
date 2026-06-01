import type {
  InventoryState,
  ProductRecord,
  ProductVariantRecord,
} from "../types";

export type AdminInventoryLoadState = "loading" | "ready" | "failed";

export type AdminInventorySource = {
  product: ProductRecord;
  variants: ProductVariantRecord[];
};

export type AdminInventoryRow = {
  availabilityLabel: string;
  brandLabel: string;
  id: string;
  inventoryState: InventoryState | null;
  inventoryStateLabel: string;
  needsAction: boolean;
  productId: string;
  productName: string;
  productSlug: string;
  productStatus: ProductRecord["status"];
  sku: string;
  stockLabel: string;
  variantId: string | null;
  variantName: string;
};
