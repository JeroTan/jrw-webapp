import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicCatalogDetailResult } from "@/domain/products/public-types";
import {
  availabilityLabelForCartCapacity,
  ProductDetailErrorState,
  ProductDetailPage,
  ProductGallery,
  VariantSelector,
} from "@/features/product-detail";
import { nextQuantityFromInputValue } from "@/features/product-detail/components/product-quantity-control/ProductQuantityControl";

const baseProductCard = {
  availability: {
    inStock: true,
    label: "Available" as const,
    tone: "success" as const,
  },
  brandName: "JRW Studio",
  categoryName: "Apparel",
  href: "/products/linen-pants",
  id: "prod_linen_pants",
  imageAlt: "Linen Pants",
  imageSrc: "/assets/products/linen-pants/front.jpg",
  name: "Linen Pants",
  priceLabel: "PHP 29.99",
  quickAction: {
    disabled: false,
    href: "/products/linen-pants",
    label: "View product",
  },
};

const detail: PublicCatalogDetailResult = {
  action: {
    disabled: false,
    label: "Add to cart",
    reason: "Availability rechecks before checkout.",
  },
  brand: {
    href: "/brands/jrw-studio",
    id: "brand_jrw",
    imageAlt: "Linen Pants",
    imageSrc: "/assets/products/linen-pants/front.jpg",
    name: "JRW Studio",
    productCount: 4,
    slug: "jrw-studio",
  },
  gallery: [
    {
      alt: "Linen Shirt front",
      height: 1200,
      id: "photo_linen_front",
      isPrimary: true,
      name: "Linen Shirt front",
      src: "/assets/products/linen-shirt/front.jpg",
      width: 1200,
    },
    {
      alt: "Linen Shirt back",
      height: 1200,
      id: "photo_linen_back",
      isPrimary: false,
      name: "Linen Shirt back",
      src: "/assets/products/linen-shirt/back.jpg",
      width: 1200,
    },
  ],
  metadata: {
    availabilityText: "Available",
    canonicalPath: "/products/linen-shirt",
    description: "Lightweight linen shirt - PHP 19.99 - Available - JRW Studio",
    imageAlt: "Linen Shirt front",
    imageSrc: "/assets/products/linen-shirt/front.jpg",
    robots: "index,follow",
    title: "Linen Shirt | JRW",
  },
  product: {
    availability: {
      inStock: true,
      label: "Available",
      tone: "success",
    },
    brandName: "JRW Studio",
    categories: [
      {
        href: "/categories/apparel",
        id: "cat_apparel",
        name: "Apparel",
        slug: "apparel",
      },
    ],
    description:
      "## Fit notes\n\nLightweight **linen** shirt.\n\n- Relaxed cut\n- Warm weather",
    id: "prod_linen",
    name: "Linen Shirt",
    priceCentavos: 1999,
    priceLabel: "PHP 19.99",
    primaryImage: {
      alt: "Linen Shirt front",
      height: 1200,
      id: "photo_linen_front",
      isPrimary: true,
      name: "Linen Shirt front",
      src: "/assets/products/linen-shirt/front.jpg",
      width: 1200,
    },
    slug: "linen-shirt",
    summary: "Lightweight linen shirt",
  },
  recommendations: {
    actionHref: "/categories/apparel",
    actionLabel: "View more",
    items: [baseProductCard],
    source: "related",
    title: "Related products",
  },
  recoveryLinks: [
    { href: "/products", label: "Browse all products" },
    { href: "/categories", label: "Browse categories" },
  ],
  selectedVariantId: "variant_linen_blue_small",
  variants: [
    {
      availability: {
        inStock: true,
        label: "Available",
        tone: "success",
      },
      disabled: false,
      id: "variant_linen_blue_small",
      imageSrc: "/assets/products/linen-shirt/front.jpg",
      label: "Color: Blue / Size: Small",
      maxQuantity: 12,
      optionValues: [
        { group: "Color", name: "Blue" },
        { group: "Size", name: "Small" },
      ],
      priceCentavos: 1999,
      priceLabel: "PHP 19.99",
      productId: "prod_linen",
      selected: true,
    },
    {
      availability: {
        inStock: false,
        label: "Unavailable",
        tone: "error",
      },
      disabled: true,
      id: "variant_linen_blue_large",
      label: "Color: Blue / Size: Large",
      maxQuantity: 0,
      optionValues: [
        { group: "Color", name: "Blue" },
        { group: "Size", name: "Large" },
      ],
      priceCentavos: 2499,
      priceLabel: "PHP 24.99",
      productId: "prod_linen",
      selected: false,
      unavailableReason: "Selected option is unavailable right now.",
    },
  ],
};

describe("product detail UI", () => {
  it("renders 4.11 product detail composition with modules and markdown", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductDetailPage, {
        detail,
      })
    );

    expect(markup).toContain('data-product-detail-module="product-details"');
    expect(markup).toContain("lg:grid-cols-[minmax(0,40%)_minmax(0,60%)]");
    expect(markup.indexOf("Linen Shirt")).toBeLessThan(
      markup.indexOf("Selected price")
    );
    expect(markup).toContain("Product description");
    expect(markup).toContain("<h3>Fit notes</h3>");
    expect(markup).toContain("<strong>linen</strong>");
    expect(markup).toContain("JRW Studio");
    expect(markup).toContain("4 products");
    expect(markup).toContain("Related products");
    expect(markup).toContain("Linen Pants");
    expect(markup).toContain("Buy");
    expect(markup).toContain("Add to cart");
    expect(markup).toContain("Share");
    expect(markup).toContain("md:grid-cols-[minmax(0,7fr)_auto_auto]");
    expect(markup).toContain("grid-cols-1");
    expect(markup).toContain("xs:col-span-2");
    expect(markup).not.toContain("Reviews");
    expect(markup).not.toContain("seller of record");
    expect(markup).not.toContain("rounded-md");
    expect(markup).not.toContain("shadow-sm");
    expect(markup).not.toContain("blur");
  });

  it("renders square gallery image with carousel controls and hides carousel for one image", () => {
    const carouselMarkup = renderToStaticMarkup(
      createElement(ProductGallery, {
        gallery: detail.gallery,
        onSelectImage: () => undefined,
        productName: detail.product.name,
        selectedImageId: "photo_linen_front",
      })
    );
    const singleImageMarkup = renderToStaticMarkup(
      createElement(ProductGallery, {
        gallery: [detail.gallery[0]],
        onSelectImage: () => undefined,
        productName: detail.product.name,
        selectedImageId: "photo_linen_front",
      })
    );

    expect(carouselMarkup).toContain("aspect-square");
    expect(carouselMarkup).toContain("object-contain");
    expect(carouselMarkup).toContain("Previous product image");
    expect(carouselMarkup).toContain("Next product image");
    expect(carouselMarkup).toContain("Product image thumbnails");
    expect(singleImageMarkup).not.toContain("Product image thumbnails");
  });

  it("renders dynamic variant option groups as chips and color swatches", () => {
    const markup = renderToStaticMarkup(
      createElement(VariantSelector, {
        onSelectVariant: () => undefined,
        selectedVariantId: "variant_linen_blue_small",
        variants: detail.variants,
      })
    );

    expect(markup).toContain("Color");
    expect(markup).toContain("Size");
    expect(markup).toContain("Blue");
    expect(markup).toContain("Small");
    expect(markup).toContain('data-variant-swatch="true"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).not.toContain('type="checkbox"');
    expect(markup).not.toContain('type="radio"');
  });

  it("can render a missing option combination as selected without picking a purchasable variant", () => {
    const markup = renderToStaticMarkup(
      createElement(VariantSelector, {
        onSelectOptions: () => undefined,
        selectedSelection: { Color: "Red", Size: "Small" },
        selectedVariantId: null,
        variants: [
          detail.variants[0],
          {
            ...detail.variants[1],
            id: "variant_linen_red_large",
            label: "Color: Red / Size: Large",
            optionValues: [
              { group: "Color", name: "Red" },
              { group: "Size", name: "Large" },
            ],
          },
        ],
      })
    );

    expect(markup).toContain("Color: Red");
    expect(markup).toContain("Size: Small");
    expect(markup).toContain('aria-label="Color: Red" aria-pressed="true"');
    expect(markup).toContain('aria-label="Size: Small" aria-pressed="true"');
    expect(markup).not.toContain(
      'aria-label="Color: Blue" aria-pressed="true"'
    );
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(2);
  });

  it("renders unavailable variant text and keeps brandless product copy safe", () => {
    const unavailableMarkup = renderToStaticMarkup(
      createElement(ProductDetailPage, {
        detail: {
          ...detail,
          brand: null,
          product: {
            ...detail.product,
            brandName: null,
            summary: null,
          },
          recommendations: null,
          selectedVariantId: "variant_linen_blue_large",
          variants: detail.variants.map((variant) => ({
            ...variant,
            selected: variant.id === "variant_linen_blue_large",
          })),
        },
      })
    );

    expect(unavailableMarkup).toContain(
      "Selected option is unavailable right now."
    );
    expect(unavailableMarkup).toContain("Unavailable");
    expect(unavailableMarkup).not.toContain("missing seller");
    expect(unavailableMarkup).not.toContain("seller of record");
    expect(unavailableMarkup).not.toContain("Brand details");
    expect(unavailableMarkup).not.toContain("Related products");
  });

  it("preserves prior valid quantity on blank or nonnumeric input", () => {
    expect(nextQuantityFromInputValue("", 3, 12)).toBe(3);
    expect(nextQuantityFromInputValue("e", 3, 12)).toBe(3);
    expect(nextQuantityFromInputValue("99", 3, 12)).toBe(12);
    expect(nextQuantityFromInputValue("0", 3, 12)).toBe(1);
  });

  it("shows remaining add-to-cart capacity when item already exists in cart", () => {
    expect(availabilityLabelForCartCapacity("Available", 12, 0)).toBe(
      "Available (12 available)"
    );
    expect(availabilityLabelForCartCapacity("Available", 12, 5)).toBe(
      "Available (7 left, 5 in cart)"
    );
    expect(availabilityLabelForCartCapacity("Available", 12, 12)).toBe(
      "Available (0 left, 12 in cart)"
    );
  });

  it("renders safe recovery state for missing or unavailable products", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductDetailErrorState, {
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "Product not found. Browse current products instead.",
          title: "Product not found",
        },
      })
    );

    expect(markup).toContain("Product not found");
    expect(markup).toContain("Browse all products");
    expect(markup).toContain("Browse categories");
  });
});
