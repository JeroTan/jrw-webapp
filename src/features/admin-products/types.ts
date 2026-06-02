export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type ProductReadinessResult = {
  isReady: boolean;
  missingItems: string[];
};

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

export type ProductListResult = {
  items: ProductRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ProductMutationInput = {
  name: string;
  slug?: string;
  summary?: string | null;
  description: string;
};

export type ProductBrandAssignmentInput = {
  brandId: string | null;
};

export type ProductCategoryAssignmentInput = {
  categoryIds: string[];
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

export type ProductOrganizationMutationResult = {
  product: ProductRecord;
  organization: ProductOrganizationRecord;
};

export type ProductListQueryInput = {
  page?: number;
  pageSize?: number;
  status?: ProductStatus;
  search?: string;
  brandId?: string;
  brandless?: boolean;
  categoryId?: string;
  includeArchived?: boolean;
};

export type ProductAssignableBrand = {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
};

export type ProductAssignableCategory = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "ARCHIVED";
};

export type ProductVariantStatus = "ACTIVE" | "ARCHIVED";
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

export type ProductVariantOption = {
  name: string;
  group: string;
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
  imageReferenceId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateVariantInput = {
  name: string;
  sku: string;
  priceCentavos: number;
  stock?: number;
  isPreorder?: boolean;
  expectedRelease?: string | null;
  imageReferenceId?: string | null;
  variationChain?: ProductVariantOption[];
};

export type UpdateVariantInput = Partial<CreateVariantInput>;

export type ArchiveVariantInput = {
  reason?: string;
};

export type UpdateStockInput = {
  quantity: number;
};

export type UpdateInventoryStateInput = {
  state: InventoryState;
};

export type AvailabilityRecord = {
  productId: string;
  variantId: string;
  label: AvailabilityLabel;
  inStock: boolean;
};

export type VariantListResult = {
  items: ProductVariantRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
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

export type UploadProductImageInput = {
  image: File;
  name?: string | null;
};

export type UpdateProductImageOrderInput = {
  sortOrder: number;
};

export type ProductImageListResult = {
  items: ProductPhotoRecord[];
  performanceTargets: {
    listMaxBytes: number;
    detailMaxBytes: number;
  };
};
