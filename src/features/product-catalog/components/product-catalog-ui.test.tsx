import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  PublicCatalogCategoryOption,
  PublicCatalogResult,
} from "@/domain/products/public-types";
import {
  ProductCatalogPage,
  ProductCatalogSkeleton,
} from "@/features/product-catalog";

const categories: PublicCatalogCategoryOption[] = [
  {
    href: "/categories/apparel",
    id: "cat_apparel",
    name: "Apparel",
    slug: "apparel",
  },
  {
    href: "/categories/home-goods",
    id: "cat_home",
    name: "Home Goods",
    slug: "home-goods",
  },
];

const catalog: PublicCatalogResult = {
  emptyState: null,
  items: [
    {
      availability: {
        inStock: true,
        label: "Available",
        tone: "success",
      },
      brandName: "JRW Studio",
      categoryName: "Apparel",
      href: "/products/linen-shirt",
      id: "prod_linen",
      imageAlt: "Linen Shirt",
      imageSrc: "/assets/products/linen-shirt/main.jpg",
      name: "Linen Shirt",
      priceLabel: "PHP 19.99",
      quickAction: {
        disabled: false,
        href: "/products/linen-shirt",
        label: "View product",
      },
    },
    {
      availability: {
        inStock: false,
        label: "Unavailable",
        tone: "error",
      },
      brandName: null,
      categoryName: "Home Goods",
      href: "/products/ceramic-vase",
      id: "prod_vase",
      imageAlt: "Ceramic Vase",
      imageSrc: undefined,
      name: "Ceramic Vase",
      priceLabel: "PHP 24.99",
      quickAction: {
        disabled: true,
        hint: "Currently unavailable",
        href: "/products/ceramic-vase",
        label: "Unavailable",
      },
    },
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 2,
    totalPages: 1,
  },
  query: {
    page: 1,
    pageSize: 20,
    q: "linen",
    sort: "new",
  },
  selectedCategory: null,
};

describe("product catalog UI", () => {
  it("renders live product browsing with search, categories, availability labels, and quick actions", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductCatalogPage, {
        basePath: "/products",
        categories,
        catalog,
        categoryNavigationMode: "query",
        error: null,
        mode: "products",
        showCategoryDirectory: true,
      })
    );

    expect(markup).toContain("Browse products.");
    expect(markup).toContain("Search products");
    expect(markup).toContain("Shop by category");
    expect(markup).toContain("Linen Shirt");
    expect(markup).toContain("Ceramic Vase");
    expect(markup).toContain("Available");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("PHP 19.99");
    expect(markup).toContain("category=apparel");
    expect(markup).toContain("grid-cols-1");
    expect(markup).toContain("xs:grid-cols-2");
    expect(markup).toContain("md:grid-cols-4");
    expect(markup).toContain("lg:grid-cols-12");
    expect(markup).not.toContain("missing seller or store");
  });

  it("renders category recovery empty state without fake seller language", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductCatalogPage, {
        basePath: "/categories/apparel",
        categories,
        catalog: {
          ...catalog,
          emptyState: {
            actionHref: "/products",
            actionLabel: "Browse all products",
            message: "This category has no published products yet.",
            title: "Category empty",
          },
          items: [],
          selectedCategory: categories[0],
        },
        categoryNavigationMode: "route",
        error: null,
        mode: "category",
        showCategoryDirectory: true,
      })
    );

    expect(markup).toContain("Category empty");
    expect(markup).toContain("Browse all products");
    expect(markup).toContain("/categories/home-goods");
    expect(markup).not.toContain("seller of record");
  });

  it("renders safe error and loading surfaces with stable catalog dimensions", () => {
    const errorMarkup = renderToStaticMarkup(
      createElement(ProductCatalogPage, {
        basePath: "/products",
        categories,
        catalog: null,
        categoryNavigationMode: "query",
        error: {
          code: "RESOURCE_NOT_FOUND",
          message:
            "Category not found. Browse another category or all products.",
          title: "Category not found",
        },
        mode: "products",
        showCategoryDirectory: true,
      })
    );
    const loadingMarkup = renderToStaticMarkup(
      createElement(ProductCatalogSkeleton, {
        cardCount: 4,
      })
    );

    expect(errorMarkup).toContain("Category not found");
    expect(errorMarkup).toContain("Browse another category or all products.");
    expect(errorMarkup).toContain("/categories/apparel");
    expect(loadingMarkup).toContain("Loading catalog");
    expect(loadingMarkup).toContain("Loading product card 1");
  });
});
