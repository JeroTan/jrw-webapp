export type StorefrontBrandProductPreview = {
  href: string;
  id: string;
  imageAlt: string;
  imageSrc?: string;
};

export type StorefrontBrandRow = {
  href: string;
  id: string;
  name: string;
  productCount: number;
  products: StorefrontBrandProductPreview[];
};
