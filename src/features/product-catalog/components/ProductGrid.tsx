import * as React from "react";
import type { StorefrontCatalogProductCard } from "../types";
import { ProductCard } from "./ProductCard";

type ProductGridProps = {
  products: StorefrontCatalogProductCard[];
};

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <ul
      aria-label="Published products"
      className="m-0 grid list-none grid-cols-1 gap-grid-sm p-0 xs:grid-cols-2 md:grid-cols-4 lg:grid-cols-12"
    >
      {products.map((product) => (
        <li
          className="md:col-span-2 lg:col-span-4 xl:col-span-3"
          key={product.id}
        >
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

export default ProductGrid;
