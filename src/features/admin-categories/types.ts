export type CategoryStatus = "ACTIVE" | "ARCHIVED";

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

export type CategoryListResult = {
  items: CategoryRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type CategoryMutationInput = {
  name: string;
  slug?: string;
  description?: string | null;
  sortOrder: number;
  isVisible: boolean;
};

