import type { PublicCatalogDetailResult } from "@/domain/products/public-types";

export type StorefrontProductDetailResult = PublicCatalogDetailResult;

export type StorefrontProductDetailPageError = {
  code: string;
  message: string;
  title: string;
};

export type StorefrontProductDetailPageData = {
  detail: StorefrontProductDetailResult | null;
  error: StorefrontProductDetailPageError | null;
  status: 200 | 404 | 503;
};
