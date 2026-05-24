import { describe, expect, it } from "vitest";
import type {
  PublicCatalogCategoryOption,
  PublicCatalogGalleryItem,
} from "@/domain/products/public-types";
import type { ProductRecord } from "@/domain/products/types";
import { buildPublicCatalogDetailMetadata } from "@/server/repositories/PublicCatalogRepository";

const category: PublicCatalogCategoryOption = {
  href: "/categories/apparel",
  id: "cat_apparel",
  name: "Apparel",
  slug: "apparel",
};

const product: ProductRecord = {
  brandId: "brand_jrw",
  brandName: "JRW Studio",
  createdAt: "2026-05-24T00:00:00.000Z",
  description: "Lightweight linen shirt for warm days.",
  hasAvailableVariants: true,
  id: "prod_linen",
  imageCount: 2,
  linkedCategoryCount: 1,
  lowestPrice: 1999,
  name: "Linen Shirt",
  priceRangeMax: 2499,
  priceRangeMin: 1999,
  primaryImageUrl: "/assets/products/linen-shirt/front.jpg",
  slug: "linen-shirt",
  status: "PUBLISHED",
  summary: "Lightweight linen shirt",
  updatedAt: "2026-05-24T00:00:00.000Z",
  variantCount: 2,
};

const primaryImage: PublicCatalogGalleryItem = {
  alt: "Linen Shirt front",
  height: 1500,
  id: "photo_linen_front",
  isPrimary: true,
  name: "Linen Shirt front",
  src: "/assets/products/linen-shirt/front.jpg",
  width: 1200,
};

describe("buildPublicCatalogDetailMetadata", () => {
  it("includes both brand and category labels when both exist", () => {
    const metadata = buildPublicCatalogDetailMetadata({
      availabilityText: "Available",
      brandName: product.brandName,
      categories: [category],
      imageAlt: primaryImage.alt,
      imageSrc: primaryImage.src,
      priceLabel: "PHP 19.99",
      product,
    });

    expect(metadata.description).toContain("JRW Studio");
    expect(metadata.description).toContain("Apparel");
    expect(metadata.description).toContain("PHP 19.99");
    expect(metadata.description).toContain("Available");
  });

  it("deduplicates matching metadata labels", () => {
    const metadata = buildPublicCatalogDetailMetadata({
      availabilityText: "Available",
      brandName: "Apparel",
      categories: [category],
      priceLabel: "PHP 19.99",
      product,
    });

    expect(metadata.description.match(/Apparel/g)).toHaveLength(1);
  });
});
