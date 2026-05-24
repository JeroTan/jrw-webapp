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
          page: 1,
          pageSize: 20,
          q: "",
          sort: "new",
        },
        selectedCategory: null,
      }),
    listCategories: async () => Result.okay({ items: [] }),
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
    const categories = body.paths?.["/api/storefront/catalog/categories"]?.get;

    expect(catalog?.summary).toBe("Browse public catalog");
    expect(catalog?.tags).toContain("Public Catalog");
    expect(catalog?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(catalog?.["x-rate-limit-class"]).toBe("public-read");
    expect(catalog?.responses).toHaveProperty("200");
    expect(catalog?.responses).toHaveProperty("400");

    expect(categories?.summary).toBe("List public catalog categories");
    expect(categories?.tags).toContain("Public Catalog");
    expect(categories?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(categories?.responses).toHaveProperty("200");
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
                    category: "apparel",
                    page: 2,
                    pageSize: 50,
                    q: "linen",
                    sort: "new",
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
        "https://jrw.test/api/storefront/catalog?q=linen&page=2&pageSize=50&category=apparel&sort=new",
        {
          headers: { "x-request-id": "req_storefront_catalog" },
        }
      )
    );

    expect(receivedInput).toMatchObject({
      query: {
        category: "apparel",
        page: 2,
        pageSize: 50,
        q: "linen",
        sort: "new",
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
          category: "apparel",
          page: 2,
          pageSize: 50,
          q: "linen",
          sort: "new",
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
  });
});
