import * as React from "react";
import { ProductGrid } from "@/features/product-catalog/components/ProductGrid";
import type { PublicCatalogProductCard } from "@/domain/products/public-types";

type RecommendationGridProps = {
  products: PublicCatalogProductCard[];
};

export function RecommendationGrid({ products }: RecommendationGridProps) {
  return <ProductGrid products={products} />;
}

export default RecommendationGrid;
