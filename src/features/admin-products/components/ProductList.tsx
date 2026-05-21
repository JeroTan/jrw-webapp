import * as React from "react";
import {
  ProductListDashboard,
  filterProductsByQuery,
  type ProductListDashboardProps,
} from "./ProductListDashboard";

export type ProductListProps = ProductListDashboardProps;

export { filterProductsByQuery };

export function ProductList(props: ProductListProps) {
  return <ProductListDashboard {...props} />;
}

