export type PublicBrandProductPreview = {
  href: string;
  id: string;
  imageAlt: string;
  imageSrc?: string;
};

export type PublicBrandRow = {
  href: string;
  id: string;
  name: string;
  productCount: number;
  products: PublicBrandProductPreview[];
};

export type PublicBrandListResult = {
  items: PublicBrandRow[];
};

export type PublicBrandDetailResult = {
  brand: PublicBrandRow;
};
