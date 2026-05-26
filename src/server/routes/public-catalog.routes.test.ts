import { describe, expect, it } from "vitest";
import { createApp } from "@/server/app";
import {
  PublicCatalogController,
  type PublicCatalogServiceLike,
} from "@/server/controllers/PublicCatalogController";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";

const categoryOption = {
  href: "/categories/apparel",
  id: "cat_apparel",
  name: "Apparel",
  slug: "apparel",
};

const brandOption = {
  href: "/brands/jrw-studio",
  id: "brand_jrw",
  name: "JRW Studio",
  slug: "jrw-studio",
};

const catalogItem = {
  availability: {
    inStock: true,
    label: "Available" as const,
    tone: "success" as const,
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
};

const detailItem = {
  action: {
    disabled: false,
    label: "Add to cart",
    reason: "Availability rechecks before checkout.",
  },
  brand: {
    href: "/brands/jrw-studio",
    id: "brand_jrw",
    imageAlt: "Linen Shirt front",
    imageSrc: "/assets/products/linen-shirt/front.jpg",
    name: "JRW Studio",
    productCount: 2,
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
  ],
  metadata: {
    availabilityText: "Available",
    canonicalPath: "/products/linen-shirt",
    description: "Lightweight linen shirt • PHP 19.99 • Available • JRW Studio",
    imageAlt: "Linen Shirt front",
    imageSrc: "/assets/products/linen-shirt/front.jpg",
    robots: "index,follow" as const,
    title: "Linen Shirt | JRW",
  },
  product: {
    availability: {
      inStock: true,
      label: "Available" as const,
      tone: "success" as const,
    },
    brandName: "JRW Studio",
    categories: [categoryOption],
    description: "Lightweight linen shirt for warm days.",
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
    items: [catalogItem],
    source: "related" as const,
    title: "Related products",
  },
  recoveryLinks: [
    { href: "/products", label: "Browse all products" },
    { href: "/categories", label: "Browse categories" },
  ],
  selectedVariantId: "variant_linen_small",
  variants: [
    {
      availability: {
        inStock: true,
        label: "Available" as const,
        tone: "success" as const,
      },
      disabled: false,
      id: "variant_linen_small",
      label: "Size: Small",
      maxQuantity: 12,
      optionValues: [{ group: "Size", name: "Small" }],
      priceCentavos: 1999,
      priceLabel: "PHP 19.99",
      productId: "prod_linen",
      selected: true,
    },
  ],
};

function publicCatalogController(
  overrides: Partial<PublicCatalogServiceLike>
): PublicCatalogController {
  return new PublicCatalogController({
    listCatalog: async () =>
      Result.okay({
        emptyState: null,
        items: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        },
        query: {
          brands: [],
          categories: [],
          page: 1,
          pageSize: 20,
          q: "",
          sort: "new",
          stock: [],
        },
        selectedCategory: null,
      }),
    listCategories: async () => Result.okay({ items: [] }),
    listBrands: async () => Result.okay({ items: [] }),
    getProductDetail: async () => Result.okay(detailItem),
    ...overrides,
  });
}

describe("public catalog routes", () => {
  it("documents public catalog endpoints", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("https://jrw.test/api/openapi/json")
    );
    const body = (await response.json()) as {
      paths?: Record<
        string,
        Record<
          string,
          {
            summary?: string;
            tags?: string[];
            "x-auth"?: { mode?: string; roles?: string[] };
            "x-rate-limit-class"?: string;
            responses?: Record<string, unknown>;
          }
        >
      >;
    };

    const catalog = body.paths?.["/api/storefront/catalog"]?.get;
    const detail = body.paths?.["/api/storefront/catalog/products/{slug}"]?.get;
    const categories = body.paths?.["/api/storefront/catalog/categories"]?.get;
    const brands = body.paths?.["/api/storefront/catalog/brands"]?.get;

    expect(catalog?.summary).toBe("Browse public catalog");
    expect(catalog?.tags).toContain("Public Catalog");
    expect(catalog?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(catalog?.["x-rate-limit-class"]).toBe("public-read");
    expect(catalog?.responses).toHaveProperty("200");
    expect(catalog?.responses).toHaveProperty("400");

    expect(detail?.summary).toBe("Read public product detail");
    expect(detail?.tags).toContain("Public Catalog");
    expect(detail?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(detail?.responses).toHaveProperty("200");
    expect(detail?.responses).toHaveProperty("404");
    expect(JSON.stringify(detail?.responses?.["200"])).toContain(
      "priceCentavos"
    );
    expect(JSON.stringify(detail?.responses?.["200"])).toContain(
      "recommendations"
    );

    expect(categories?.summary).toBe("List public catalog categories");
    expect(categories?.tags).toContain("Public Catalog");
    expect(categories?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(categories?.responses).toHaveProperty("200");

    expect(brands?.summary).toBe("List public catalog brands");
    expect(brands?.tags).toContain("Public Catalog");
    expect(brands?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(brands?.responses).toHaveProperty("200");
  });

  it("reads published product detail without auth and preserves slug params", async () => {
    let receivedInput:
      | Parameters<PublicCatalogServiceLike["getProductDetail"]>[0]
      | undefined;

    const app = createApp({
      routes: {
        publicCatalog: {
          controllerFactory: () =>
            publicCatalogController({
              getProductDetail: async (input) => {
                receivedInput = input;
                return Result.okay(detailItem);
              },
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/storefront/catalog/products/linen-shirt",
        {
          headers: { "x-request-id": "req_storefront_product_detail" },
        }
      )
    );

    expect(receivedInput).toMatchObject({
      requestId: "req_storefront_product_detail",
      slug: "linen-shirt",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        metadata: {
          canonicalPath: "/products/linen-shirt",
          title: "Linen Shirt | JRW",
        },
        product: {
          brandName: "JRW Studio",
          name: "Linen Shirt",
          priceCentavos: 1999,
          priceLabel: "PHP 19.99",
        },
        selectedVariantId: "variant_linen_small",
        brand: {
          href: "/brands/jrw-studio",
          productCount: 2,
        },
        recommendations: {
          source: "related",
          title: "Related products",
        },
        variants: [
          {
            label: "Size: Small",
            maxQuantity: 12,
            priceCentavos: 1999,
            selected: true,
          },
        ],
      },
      meta: { requestId: "req_storefront_product_detail" },
    });
  });

  it("lists published catalog data without auth and preserves storefront query inputs", async () => {
    let receivedInput:
      | Parameters<PublicCatalogServiceLike["listCatalog"]>[0]
      | undefined;

    const app = createApp({
      routes: {
        publicCatalog: {
          controllerFactory: () =>
            publicCatalogController({
              listCatalog: async (input) => {
                receivedInput = input;

                return Result.okay({
                  emptyState: null,
                  items: [catalogItem],
                  pagination: {
                    page: 2,
                    pageSize: 50,
                    totalItems: 120,
                    totalPages: 3,
                  },
                  query: {
                    brands: ["jrw-studio"],
                    categories: ["apparel"],
                    category: "apparel",
                    maxPriceCentavos: 50000,
                    minPriceCentavos: 10000,
                    page: 2,
                    pageSize: 50,
                    q: "linen",
                    sort: "new",
                    stock: ["available"],
                  },
                  selectedCategory: categoryOption,
                });
              },
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/storefront/catalog?q=linen&page=2&pageSize=50&category=apparel&brand=jrw-studio&stock=available&minPrice=100&maxPrice=500&sort=new",
        {
          headers: { "x-request-id": "req_storefront_catalog" },
        }
      )
    );

    expect(receivedInput).toMatchObject({
      query: {
        brand: "jrw-studio",
        category: "apparel",
        maxPrice: 500,
        minPrice: 100,
        page: 2,
        pageSize: 50,
        q: "linen",
        sort: "new",
        stock: "available",
      },
      requestId: "req_storefront_catalog",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        items: [
          {
            availability: { label: "Available" },
            brandName: "JRW Studio",
            categoryName: "Apparel",
            href: "/products/linen-shirt",
            id: "prod_linen",
            name: "Linen Shirt",
            priceLabel: "PHP 19.99",
            quickAction: {
              disabled: false,
              href: "/products/linen-shirt",
              label: "View product",
            },
          },
        ],
        pagination: {
          page: 2,
          pageSize: 50,
          totalItems: 120,
          totalPages: 3,
        },
        query: {
          brands: ["jrw-studio"],
          categories: ["apparel"],
          category: "apparel",
          maxPriceCentavos: 50000,
          minPriceCentavos: 10000,
          page: 2,
          pageSize: 50,
          q: "linen",
          sort: "new",
          stock: ["available"],
        },
        selectedCategory: {
          href: "/categories/apparel",
          name: "Apparel",
        },
      },
      meta: { requestId: "req_storefront_catalog" },
    });
  });

  it("lists public category options without auth", async () => {
    const app = createApp({
      routes: {
        publicCatalog: {
          controllerFactory: () =>
            publicCatalogController({
              listCategories: async () =>
                Result.okay({
                  items: [categoryOption],
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/storefront/catalog/categories", {
        headers: { "x-request-id": "req_storefront_categories" },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        items: [
          {
            href: "/categories/apparel",
            id: "cat_apparel",
            name: "Apparel",
            slug: "apparel",
          },
        ],
      },
      meta: { requestId: "req_storefront_categories" },
    });
  });

  it("lists public brand options without auth", async () => {
    const app = createApp({
      routes: {
        publicCatalog: {
          controllerFactory: () =>
            publicCatalogController({
              listBrands: async () =>
                Result.okay({
                  items: [brandOption],
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/storefront/catalog/brands", {
        headers: { "x-request-id": "req_storefront_catalog_brands" },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        items: [
          {
            href: "/brands/jrw-studio",
            id: "brand_jrw",
            name: "JRW Studio",
            slug: "jrw-studio",
          },
        ],
      },
      meta: { requestId: "req_storefront_catalog_brands" },
    });
  });

  it("returns missing category and validation failures with safe envelopes", async () => {
    const app = createApp({
      routes: {
        publicCatalog: {
          controllerFactory: () =>
            publicCatalogController({
              listCatalog: async () =>
                Result.error(
                  new GeneralError(
                    { category: "missing-category" },
                    "RESOURCE_NOT_FOUND"
                  )
                ),
              getProductDetail: async (input) =>
                input.slug.trim().length === 0
                  ? Result.error(
                      new GeneralError(
                        { reasons: ["slug:invalid_value"] },
                        "VALIDATION_FAILED"
                      )
                    )
                  : Result.error(
                      new GeneralError(
                        { slug: input.slug },
                        "RESOURCE_NOT_FOUND"
                      )
                    ),
            }),
        },
      },
    });

    const missingResponse = await app.handle(
      new Request(
        "https://jrw.test/api/storefront/catalog?category=missing-category",
        {
          headers: { "x-request-id": "req_storefront_catalog_missing" },
        }
      )
    );
    const invalidResponse = await app.handle(
      new Request("https://jrw.test/api/storefront/catalog?pageSize=101", {
        headers: { "x-request-id": "req_storefront_catalog_invalid" },
      })
    );
    const fractionalResponse = await app.handle(
      new Request("https://jrw.test/api/storefront/catalog?page=1.5", {
        headers: { "x-request-id": "req_storefront_catalog_fractional" },
      })
    );
    const missingProductResponse = await app.handle(
      new Request(
        "https://jrw.test/api/storefront/catalog/products/missing-shirt",
        {
          headers: { "x-request-id": "req_storefront_product_missing" },
        }
      )
    );
    const invalidProductResponse = await app.handle(
      new Request("https://jrw.test/api/storefront/catalog/products/%20", {
        headers: { "x-request-id": "req_storefront_product_invalid" },
      })
    );

    expect(missingResponse.status).toBe(404);
    await expect(missingResponse.json()).resolves.toMatchObject({
      error: {
        code: "RESOURCE_NOT_FOUND",
      },
    });

    expect(invalidResponse.status).toBe(400);
    await expect(invalidResponse.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
      },
    });

    expect(fractionalResponse.status).toBe(400);
    await expect(fractionalResponse.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
      },
    });

    expect(missingProductResponse.status).toBe(404);
    await expect(missingProductResponse.json()).resolves.toMatchObject({
      error: {
        code: "RESOURCE_NOT_FOUND",
      },
    });

    expect(invalidProductResponse.status).toBe(400);
    await expect(invalidProductResponse.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
      },
    });
  });
});
