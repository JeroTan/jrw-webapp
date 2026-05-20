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
