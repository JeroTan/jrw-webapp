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
  createdAt: string;
  updatedAt: string;
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
  categoryId?: string;
  search?: string;
  includeArchived?: boolean | string;
};

export type ProductListQuery = {
  page: number;
  pageSize: number;
  status?: ProductStatus;
  brandId?: string;
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
