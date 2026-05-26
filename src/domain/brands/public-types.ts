import type { PublicCatalogProductCard } from "@/domain/products/public-types";

export type PublicBrandRow = {
  href: string;
  id: string;
  imageAlt?: string;
  imageSrc?: string;
  name: string;
  productCount: number;
  products: PublicCatalogProductCard[];
  slug: string;
};

export type PublicBrandListResult = {
  items: PublicBrandRow[];
};

export type PublicBrandDetailResult = {
  brand: PublicBrandRow;
};
