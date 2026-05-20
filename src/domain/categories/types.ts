import { categoryStatusValues } from "@/domain/schema/catalog";

export type CategoryStatus = (typeof categoryStatusValues)[number];

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isVisible: boolean;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
  linkedProductCount: number | null;
};

export type CreateCategoryInput = {
  name: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
};

export type UpdateCategoryInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
};

export type CategoryListQueryInput = {
  page?: number;
  pageSize?: number;
  status?: string;
  isVisible?: boolean | string;
};

export type CategoryListQuery = {
  page: number;
  pageSize: number;
  status?: CategoryStatus;
  isVisible?: boolean;
};

export type CategoryListResult = {
  items: CategoryRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

