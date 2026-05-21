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
  createdAt: string;
  updatedAt: string;
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
