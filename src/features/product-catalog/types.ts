import type {
  PublicCatalogBrandListResult,
  PublicCatalogBrandOption,
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
export type StorefrontCatalogBrandListResult = PublicCatalogBrandListResult;
export type StorefrontCatalogBrandOption = PublicCatalogBrandOption;
export type StorefrontCatalogCategoryOption = PublicCatalogCategoryOption;
export type StorefrontCatalogEmptyState = PublicCatalogEmptyState;
export type StorefrontCatalogPagination = PublicCatalogPagination;
export type StorefrontCatalogProductCard = PublicCatalogProductCard;
export type StorefrontCatalogQuery = PublicCatalogQuery;
export type StorefrontCatalogResult = PublicCatalogResult;

export type StorefrontCatalogView = "grid" | "categories";
export type StorefrontCategoryNavigationMode = "route" | "query";

export type StorefrontCatalogPageError = {
  code: string;
  message: string;
  title: string;
};

export type StorefrontCatalogPageData = {
  brands: StorefrontCatalogBrandOption[];
  catalog: StorefrontCatalogResult | null;
  categories: StorefrontCatalogCategoryOption[];
  error: StorefrontCatalogPageError | null;
  query: StorefrontCatalogQuery;
  view: StorefrontCatalogView;
};

export type StorefrontCategorySection = {
  category: StorefrontCatalogCategoryOption;
  productCount: number;
  products: StorefrontCatalogProductCard[];
};

export type StorefrontCategoryIndexPageData = {
  categories: StorefrontCatalogCategoryOption[];
  error: StorefrontCatalogPageError | null;
  sections: StorefrontCategorySection[];
};
