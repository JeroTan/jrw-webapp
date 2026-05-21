export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

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
  variationChain?: ProductVariantOption[];
};

export type UpdateVariantInput = Partial<CreateVariantInput>;

export type ArchiveVariantInput = {
  reason?: string;
};

export type VariantListResult = {
  items: ProductVariantRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
