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

export type PublicCatalogBrandOption = {
  href: string;
  id: string;
  name: string;
  slug: string;
};

export type PublicCatalogRecoveryLink = {
  href: string;
  label: string;
};

export type PublicCatalogGalleryItem = {
  alt: string;
  height: number | null;
  id: string;
  isPrimary: boolean;
  name: string | null;
  src: string;
  width: number | null;
};

export type PublicCatalogVariantOption = {
  group: string;
  name: string;
};

export type PublicCatalogDetailVariant = {
  availability: PublicCatalogAvailability;
  disabled: boolean;
  id: string;
  imageSrc?: string;
  label: string;
  optionValues: PublicCatalogVariantOption[];
  priceCentavos: number;
  priceLabel: string;
  productId: string;
  selected: boolean;
  unavailableReason?: string;
};

export type PublicCatalogActionState = {
  disabled: boolean;
  label: string;
  reason?: string;
};

export type PublicCatalogDetailMetadata = {
  availabilityText: string;
  canonicalPath: string;
  description: string;
  imageAlt?: string;
  imageSrc?: string;
  robots: "index,follow" | "noindex,nofollow";
  title: string;
};

export type PublicCatalogProductDetailSummary = {
  availability: PublicCatalogAvailability;
  brandName: string | null;
  categories: PublicCatalogCategoryOption[];
  description: string;
  id: string;
  name: string;
  priceCentavos: number | null;
  priceLabel: string;
  primaryImage: PublicCatalogGalleryItem | null;
  slug: string;
  summary: string | null;
};

export type PublicCatalogDetailResult = {
  action: PublicCatalogActionState;
  gallery: PublicCatalogGalleryItem[];
  metadata: PublicCatalogDetailMetadata;
  product: PublicCatalogProductDetailSummary;
  recoveryLinks: PublicCatalogRecoveryLink[];
  selectedVariantId: string | null;
  variants: PublicCatalogDetailVariant[];
};

export type PublicCatalogPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PublicCatalogSort = "new";
export type PublicCatalogStockFilter =
  | "available"
  | "low-stock"
  | "preorder"
  | "unavailable";

type PublicCatalogStringListInput = string | string[];

export type PublicCatalogQueryInput = {
  brand?: PublicCatalogStringListInput;
  category?: PublicCatalogStringListInput;
  maxPrice?: number | string;
  minPrice?: number | string;
  page?: number | string;
  pageSize?: number | string;
  q?: string;
  sort?: string;
  stock?: PublicCatalogStringListInput;
};

export type PublicCatalogQuery = {
  brands: string[];
  categories: string[];
  category?: string;
  maxPriceCentavos?: number;
  minPriceCentavos?: number;
  page: number;
  pageSize: number;
  q: string;
  sort: PublicCatalogSort;
  stock: PublicCatalogStockFilter[];
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

export type PublicCatalogBrandListResult = {
  items: PublicCatalogBrandOption[];
};
