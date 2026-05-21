import type { ProductVariantOption } from "@/domain/products/types";

export type SnapshotVariantOption = ProductVariantOption;

export type SnapshotBuildInput = {
  productId: string;
  variantId: string;
  quantity: number;
};

export type BuiltOrderSnapshot = {
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  variantLabel: string;
  variantOptions: readonly SnapshotVariantOption[];
  priceCentavos: number;
  quantity: number;
  imageReference: string | null;
  snapshotTimestamp: string;
};

export type CreateOrderSnapshotInput = BuiltOrderSnapshot & {
  id?: string;
  orderId: string;
};

export type OrderSnapshot = Omit<
  BuiltOrderSnapshot,
  "productId" | "productSlug" | "variantId"
> & {
  id: string;
  orderId: string;
  productId: string | null;
  productSlug: string | null;
  variantId: string | null;
};

export type SnapshotBuildResult = {
  snapshot: BuiltOrderSnapshot;
};

export type SnapshotDetailResult = {
  snapshot: OrderSnapshot;
};

export type SnapshotListResult = {
  items: OrderSnapshot[];
};
