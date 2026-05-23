import type { StorefrontNavLink } from "./types";

export const storefrontNavLinks: StorefrontNavLink[] = [
  { href: "/products?sort=new", label: "New Arrivals" },
  { href: "/products?view=categories", label: "Categories" },
  { href: "/brands", label: "Brands" },
  { href: "/products", label: "All Products" },
];

export const storefrontHomeLinks: StorefrontNavLink[] = [
  {
    href: "/products?sort=new",
    description: "Latest products appear here when browsing opens.",
    label: "New Arrivals",
  },
  {
    href: "/products?view=categories",
    description: "Category browsing appears here when product listings open.",
    label: "Categories",
  },
];
