import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  PublicCatalogBrandOption,
  PublicCatalogCategoryOption,
  PublicCatalogResult,
} from "@/domain/products/public-types";
import {
  ProductCard,
  ProductCatalogSkeleton,
} from "@/features/product-catalog";
import ProductCatalog from "../ProductCatalog";

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

const brands: PublicCatalogBrandOption[] = [
  {
    href: "/brands/jrw-studio",
    id: "brand_jrw",
    name: "JRW Studio",
    slug: "jrw-studio",
  },
  {
    href: "/brands/partner-label",
    id: "brand_partner",
    name: "Partner Label",
    slug: "partner-label",
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
    brands: ["jrw-studio"],
    categories: ["apparel"],
    category: "apparel",
    maxPriceCentavos: 500000,
    minPriceCentavos: 100000,
    page: 1,
    pageSize: 20,
    q: "linen",
    sort: "new",
    stock: ["available"],
  },
  selectedCategory: null,
};

describe("product catalog UI", () => {
  it("renders live product browsing with checklist filters, availability labels, and clickable cards", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductCatalog, {
        basePath: "/products",
        brands,
        categories,
        catalog,
        categoryNavigationMode: "query",
        error: null,
        showCategoryDirectory: true,
      })
    );

    expect(markup).toContain('aria-label="Product catalog"');
    expect(markup).not.toContain("Search products");
    expect(markup).not.toContain("Items per page");
    expect(markup).toContain("Categories");
    expect(markup).toContain("Brands");
    expect(markup).toContain("Stock level");
    expect(markup).toContain("Price range");
    expect(markup).toContain('name="category"');
    expect(markup).toContain('value="apparel"');
    expect(markup).toContain('name="brand"');
    expect(markup).toContain('value="jrw-studio"');
    expect(markup).toContain("Shop by category");
    expect(markup).toContain("Linen Shirt");
    expect(markup).toContain("Ceramic Vase");
    expect(markup).toContain("Available");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("PHP 19.99");
    expect(markup).toContain("grid-cols-1");
    expect(markup).toContain("items-start");
    expect(markup).toContain("content-start");
    expect(markup).toContain("xs:grid-cols-2");
    expect(markup).toContain("md:grid-cols-4");
    expect(markup).toContain("lg:grid-cols-12");
    expect(markup).toContain("lg:col-span-4");
    expect(markup).toContain("xl:col-span-3");
    expect(markup).toContain("h-55");
    expect(markup).toContain("JRW Studio / Apparel / Available");
    expect(markup).toContain('aria-label="View Linen Shirt"');
    expect(markup).toContain('type="submit"');
    expect(markup).not.toContain("View product");
    expect(markup).not.toContain("missing seller or store");
  });

  it("renders Direction 01 card anatomy with softened borders and small price tag", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductCard, { product: catalog.items[0] })
    );

    expect(markup).toContain("min-h-90");
    expect(markup).toContain("border-r border-b");
    expect(markup).toContain("bg-brand-surface");
    expect(markup).toContain("h-55");
    expect(markup).toContain("object-cover");
    expect(markup).toContain("JRW Studio / Apparel / Available");
    expect(markup).toContain("text-[0.6875rem]");
    expect(markup).toContain("border border-brand-content px-2.5");
    expect(markup).not.toContain("bg-brand-accent");
    expect(markup).toContain("PHP 19.99");
    expect(markup).toContain("hover:border-brand-border-strong");
    expect(markup).toContain("focus-visible:outline-brand-accent");
    expect(markup).not.toContain("aria-disabled");
    expect(markup).not.toContain("rounded");
    expect(markup).not.toContain("shadow");
    expect(markup).not.toContain("blur");
  });

  it("renders missing image card with diagonal initial module", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductCard, { product: catalog.items[1] })
    );

    expect(markup).toContain("bg-[linear-gradient(135deg");
    expect(markup).toContain("bg-size-[28px_28px]");
    expect(markup).toContain('aria-label="Ceramic Vase image coming soon"');
    expect(markup).toContain("size-28");
    expect(markup).toContain(">CV</span>");
    expect(markup).toContain("Home Goods / Unavailable");
    expect(markup).not.toContain("Brandless /");
    expect(markup).toContain('aria-label="View Ceramic Vase"');
    expect(markup).not.toContain('aria-disabled="true"');
    expect(markup).not.toContain("rounded");
    expect(markup).not.toContain("shadow");
  });

  it("keeps the landing page focused on products without category directory or filter rail", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductCatalog, {
        basePath: "/",
        brands,
        categories,
        catalog,
        categoryNavigationMode: "route",
        error: null,
        showFilters: false,
      })
    );

    expect(markup).toContain('aria-label="Product catalog"');
    expect(markup).toContain("Linen Shirt");
    expect(markup).not.toContain("Shop by category");
    expect(markup).not.toContain("Filters");
    expect(markup).not.toContain(
      "md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]"
    );
  });

  it("renders category recovery empty state without fake seller language", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductCatalog, {
        basePath: "/categories/apparel",
        brands,
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
        showCategoryDirectory: false,
        showFilters: false,
      })
    );

    expect(markup).toContain("Category empty");
    expect(markup).toContain("Browse all products");
    expect(markup).not.toContain("Shop by category");
    expect(markup).not.toContain("Filters");
    expect(markup).not.toContain("seller of record");
  });

  it("renders safe error and loading surfaces with stable catalog dimensions", () => {
    const errorMarkup = renderToStaticMarkup(
      createElement(ProductCatalog, {
        basePath: "/products",
        brands,
        categories,
        catalog: null,
        categoryNavigationMode: "query",
        error: {
          code: "RESOURCE_NOT_FOUND",
          message:
            "Category not found. Browse another category or all products.",
          title: "Category not found",
        },
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
