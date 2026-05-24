import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicCatalogDetailResult } from "@/domain/products/public-types";
import {
  ProductGallery,
  ProductDetailErrorState,
  ProductDetailPage,
} from "@/features/product-detail";

const detail: PublicCatalogDetailResult = {
  action: {
    disabled: true,
    label: "Add to cart",
    reason: "Selected option is available. Cart actions are not active on this page yet.",
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
    description: "Lightweight linen shirt • PHP 19.99 • Available • JRW Studio",
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
    description: "Lightweight linen shirt for warm days.",
    id: "prod_linen",
    name: "Linen Shirt",
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
  recoveryLinks: [
    { href: "/products", label: "Browse all products" },
    { href: "/products?view=categories", label: "Browse categories" },
  ],
  selectedVariantId: "variant_linen_small",
  variants: [
    {
      availability: {
        inStock: true,
        label: "Available",
        tone: "success",
      },
      disabled: false,
      id: "variant_linen_small",
      imageSrc: "/assets/products/linen-shirt/front.jpg",
      label: "Size: Small",
      optionValues: [{ group: "Size", name: "Small" }],
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
      id: "variant_linen_large",
      label: "Size: Large",
      optionValues: [{ group: "Size", name: "Large" }],
      priceLabel: "PHP 24.99",
      productId: "prod_linen",
      selected: false,
      unavailableReason: "Selected option is unavailable right now.",
    },
  ],
};

describe("product detail UI", () => {
  it("renders product detail, gallery, radio variant picker, and truthful cart state", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductDetailPage, {
        detail,
      })
    );

    expect(markup).toContain("Linen Shirt");
    expect(markup).toContain("Gallery");
    expect(markup).toContain("Choose an option");
    expect(markup).toContain('type="radio"');
    expect(markup).toContain("Cart action");
    expect(markup).toContain("Browse all products");
    expect(markup).toContain("Selected option is available. Cart actions are not active on this page yet.");
    expect(markup).toContain("aria-pressed=\"true\"");
    expect(markup).not.toContain("seller of record");
  });

  it("renders unavailable variant text and keeps brandless product copy safe", () => {
    const unavailableMarkup = renderToStaticMarkup(
      createElement(ProductDetailPage, {
        detail: {
          ...detail,
          product: {
            ...detail.product,
            brandName: null,
            summary: null,
          },
          selectedVariantId: "variant_linen_large",
          variants: detail.variants.map((variant) => ({
            ...variant,
            selected: variant.id === "variant_linen_large",
          })),
        },
      })
    );

    expect(unavailableMarkup).toContain("Selected option is unavailable right now.");
    expect(unavailableMarkup).toContain("Unavailable");
    expect(unavailableMarkup).not.toContain("missing seller");
    expect(unavailableMarkup).not.toContain("seller of record");
  });

  it("keeps gallery frame geometry stable across image selection", () => {
    const mixedGalleryDetail: PublicCatalogDetailResult = {
      ...detail,
      gallery: [
        {
          alt: "Linen Shirt portrait",
          height: 1500,
          id: "photo_linen_portrait",
          isPrimary: true,
          name: "Linen Shirt portrait",
          src: "/assets/products/linen-shirt/portrait.jpg",
          width: 1200,
        },
        {
          alt: "Linen Shirt landscape",
          height: 900,
          id: "photo_linen_landscape",
          isPrimary: false,
          name: "Linen Shirt landscape",
          src: "/assets/products/linen-shirt/landscape.jpg",
          width: 1600,
        },
      ],
      product: {
        ...detail.product,
        primaryImage: {
          alt: "Linen Shirt portrait",
          height: 1500,
          id: "photo_linen_portrait",
          isPrimary: true,
          name: "Linen Shirt portrait",
          src: "/assets/products/linen-shirt/portrait.jpg",
          width: 1200,
        },
      },
    };

    const primaryMarkup = renderToStaticMarkup(
      createElement(ProductGallery, {
        gallery: mixedGalleryDetail.gallery,
        onSelectImage: () => undefined,
        productName: mixedGalleryDetail.product.name,
        selectedImageId: "photo_linen_portrait",
      })
    );
    const alternateMarkup = renderToStaticMarkup(
      createElement(ProductGallery, {
        gallery: mixedGalleryDetail.gallery,
        onSelectImage: () => undefined,
        productName: mixedGalleryDetail.product.name,
        selectedImageId: "photo_linen_landscape",
      })
    );

    expect(primaryMarkup).toContain("aspect-ratio:1200 / 1500");
    expect(alternateMarkup).toContain("aspect-ratio:1200 / 1500");
    expect(primaryMarkup).toContain("aspect-square");
    expect(alternateMarkup).toContain("aspect-square");
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
