import type {
  PublicCatalogCategoryListResult,
  PublicCatalogCategoryOption,
  PublicCatalogEmptyState,
  PublicCatalogPagination,
  PublicCatalogProductCard,
  PublicCatalogQuery,
  PublicCatalogResult,
} from "@/domain/products/public-types";

export type StorefrontCatalogCategoryListResult =
  PublicCatalogCategoryListResult;
export type StorefrontCatalogCategoryOption = PublicCatalogCategoryOption;
export type StorefrontCatalogEmptyState = PublicCatalogEmptyState;
export type StorefrontCatalogPagination = PublicCatalogPagination;
export type StorefrontCatalogProductCard = PublicCatalogProductCard;
export type StorefrontCatalogQuery = PublicCatalogQuery;
export type StorefrontCatalogResult = PublicCatalogResult;

export type StorefrontCatalogView = "grid" | "categories";
export type StorefrontCatalogPageMode = "home" | "products" | "category";
export type StorefrontCategoryNavigationMode = "route" | "query";

export type StorefrontCatalogPageError = {
  code: string;
  message: string;
  title: string;
};

export type StorefrontCatalogPageData = {
  catalog: StorefrontCatalogResult | null;
  categories: StorefrontCatalogCategoryOption[];
  error: StorefrontCatalogPageError | null;
  query: StorefrontCatalogQuery;
  view: StorefrontCatalogView;
};
