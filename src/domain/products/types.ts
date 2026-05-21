import { productStatusValues } from "@/domain/schema/catalog";

export type ProductStatus = (typeof productStatusValues)[number];

export type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  description: string;
  status: ProductStatus;
  brandId: string | null;
  brandName: string | null;
  linkedCategoryCount: number;
  variantCount: number;
  lowestPrice: number | null;
  priceRangeMin: number | null;
  priceRangeMax: number | null;
  hasAvailableVariants: boolean;
  imageCount: number;
  primaryImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductPhotoRecord = {
  id: string;
  productId: string | null;
  imageId: string;
  name: string | null;
  sortOrder: number;
  isPrimary: boolean;
  r2Key: string;
  fileSize: number | null;
  contentType: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  updatedAt: string;
  uploadedAt: string;
  url: string;
};

export type CreateProductPhotoInput = {
  id: string;
  productId: string;
  imageId: string;
  name: string | null;
  sortOrder: number;
  isPrimary: boolean;
  r2Key: string;
  fileSize: number | null;
  contentType: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdatePhotoOrderInput = {
  productId: string;
  photoId: string;
  sortOrder: number;
};

export type RemoveProductPhotoInput = {
  productId: string;
  photoId: string;
};

export type ImageListResult = {
  items: ProductPhotoRecord[];
};

export type ProductVariantStatus = "ACTIVE" | "ARCHIVED";

export type ProductVariantOption = {
  name: string;
  group: string;
};

export type InventoryState =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "PREORDER";

export type AvailabilityLabel =
  | "Available"
  | "Low Stock"
  | "Unavailable"
  | "Preorder";

export type InventoryRecord = {
  variantId: string;
  quantity: number;
  state: InventoryState;
  stockVersion: number;
};

export type UpdateStockInput = {
  quantity: number;
};

export type UpdateInventoryStateInput = {
  state: InventoryState;
};

export type InventoryAvailabilityRecord = {
  productId: string;
  variantId: string;
  label: AvailabilityLabel;
  inStock: boolean;
};

export type ProductVariantRecord = {
  id: string;
  productId: string;
  name: string;
  sku: string;
  priceCentavos: number;
  stock: number;
  isPreorder: boolean;
  expectedRelease: string | null;
  variationChain: ProductVariantOption[];
  status: ProductVariantStatus;
  hasAvailableStock: boolean;
  inventoryState: InventoryState;
  stockVersion: number;
  availability: AvailabilityLabel;
};

export type CreateProductVariantInput = {
  name: string;
  sku: string;
  priceCentavos: number;
  stock?: number;
  isPreorder?: boolean;
  expectedRelease?: string | null;
  variationChain?: ProductVariantOption[];
};

export type UpdateProductVariantInput = {
  name?: string;
  sku?: string;
  priceCentavos?: number;
  stock?: number;
  isPreorder?: boolean;
  expectedRelease?: string | null;
  variationChain?: ProductVariantOption[];
};

export type ArchiveProductVariantInput = {
  reason?: string;
};

export type VariantListResult = {
  items: ProductVariantRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ProductVariantSummary = {
  variantCount: number;
  lowestPrice: number | null;
  priceRangeMin: number | null;
  priceRangeMax: number | null;
  hasAvailableVariants: boolean;
};

export type CreateProductInput = {
  name: string;
  slug?: string;
  summary?: string | null;
  description: string;
};

export type UpdateProductInput = {
  name?: string;
  slug?: string;
  summary?: string | null;
  description?: string;
};

export type ProductListQueryInput = {
  page?: number;
  pageSize?: number;
  status?: string;
  brandId?: string;
  brandless?: boolean | string;
  categoryId?: string;
  search?: string;
  includeArchived?: boolean | string;
};

export type ProductListQuery = {
  page: number;
  pageSize: number;
  status?: ProductStatus;
  brandId?: string;
  brandless: boolean;
  categoryId?: string;
  search?: string;
  includeArchived: boolean;
};

export type ProductListResult = {
  items: ProductRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ProductOrganizationBrand = {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
};

export type ProductOrganizationCategory = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "ARCHIVED";
};

export type ProductOrganizationRecord = {
  productId: string;
  brand: ProductOrganizationBrand | null;
  categories: ProductOrganizationCategory[];
};
