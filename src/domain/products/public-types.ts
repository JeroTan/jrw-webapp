import type { AvailabilityLabel } from "./types";

export type PublicCatalogTone = "info" | "success" | "warning" | "error";

export type PublicCatalogAvailability = {
  inStock: boolean;
  label: AvailabilityLabel;
  tone: PublicCatalogTone;
};

export type PublicCatalogQuickAction = {
  disabled: boolean;
  hint?: string;
  href: string;
  label: string;
};

export type PublicCatalogProductCard = {
  availability: PublicCatalogAvailability;
  brandName: string | null;
  categoryName?: string;
  href: string;
  id: string;
  imageAlt: string;
  imageSrc?: string;
  name: string;
  priceLabel: string;
  quickAction: PublicCatalogQuickAction;
};

export type PublicCatalogCategoryOption = {
  href: string;
  id: string;
  name: string;
  slug: string;
};

export type PublicCatalogPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PublicCatalogSort = "new";

export type PublicCatalogQueryInput = {
  category?: string;
  page?: number | string;
  pageSize?: number | string;
  q?: string;
  sort?: string;
};

export type PublicCatalogQuery = {
  category?: string;
  page: number;
  pageSize: number;
  q: string;
  sort: PublicCatalogSort;
};

export type PublicCatalogEmptyState = {
  actionHref?: string;
  actionLabel?: string;
  message: string;
  title: string;
};

export type PublicCatalogResult = {
  emptyState: PublicCatalogEmptyState | null;
  items: PublicCatalogProductCard[];
  pagination: PublicCatalogPagination;
  query: PublicCatalogQuery;
  selectedCategory: PublicCatalogCategoryOption | null;
};

export type PublicCatalogCategoryListResult = {
  items: PublicCatalogCategoryOption[];
};
