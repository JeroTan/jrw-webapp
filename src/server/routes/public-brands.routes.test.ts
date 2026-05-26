import { describe, expect, it } from "vitest";
import { createApp } from "@/server/app";
import {
  PublicBrandController,
  type PublicBrandServiceLike,
} from "@/server/controllers/PublicBrandController";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";

const brandRow = {
  href: "/brands/bongalow",
  id: "brand_bong",
  name: "Bong",
  productCount: 1,
  products: [
    {
      availability: {
        inStock: true,
        label: "Available" as const,
        tone: "success" as const,
      },
      brandName: "Bong",
      categoryName: "Apparel",
      href: "/products/linen-shirt",
      id: "prod_linen",
      imageAlt: "Linen Shirt",
      name: "Linen Shirt",
      priceLabel: "PHP 19.99",
      quickAction: {
        disabled: false,
        href: "/products/linen-shirt",
        label: "View product",
      },
    },
  ],
  slug: "bongalow",
};

function publicBrandController(
  overrides: Partial<PublicBrandServiceLike>
): PublicBrandController {
  return new PublicBrandController({
    getBrand: async () =>
      Result.error(new GeneralError({}, "RESOURCE_NOT_FOUND")),
    listBrands: async () => Result.okay({ items: [] }),
    ...overrides,
  });
}

describe("public brand routes", () => {
  it("documents public brand endpoints", async () => {
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
            tags?: string[];
            summary?: string;
            "x-auth"?: { mode?: string; roles?: string[] };
            "x-rate-limit-class"?: string;
            responses?: Record<string, unknown>;
          }
        >
      >;
    };

    const list = body.paths?.["/api/storefront/brands"]?.get;
    const detail = body.paths?.["/api/storefront/brands/{slugOrId}"]?.get;

    expect(list?.summary).toBe("List public brands");
    expect(list?.tags).toContain("Public Brands");
    expect(list?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(list?.["x-rate-limit-class"]).toBe("public-read");
    expect(list?.responses).toHaveProperty("200");

    expect(detail?.summary).toBe("Get public brand");
    expect(detail?.tags).toContain("Public Brands");
    expect(detail?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(detail?.responses).toHaveProperty("404");
  });

  it("lists public brands without admin session", async () => {
    const app = createApp({
      routes: {
        publicBrands: {
          controllerFactory: () =>
            publicBrandController({
              listBrands: async () => Result.okay({ items: [brandRow] }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/storefront/brands", {
        headers: { "x-request-id": "req_storefront_brands" },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        items: [
          {
            href: "/brands/bongalow",
            id: "brand_bong",
            name: "Bong",
            productCount: 1,
            products: [
              {
                availability: { label: "Available" },
                href: "/products/linen-shirt",
                name: "Linen Shirt",
                priceLabel: "PHP 19.99",
              },
            ],
            slug: "bongalow",
          },
        ],
      },
      meta: { requestId: "req_storefront_brands" },
    });
  });

  it("loads public brand detail and reports missing brands", async () => {
    const app = createApp({
      routes: {
        publicBrands: {
          controllerFactory: () =>
            publicBrandController({
              getBrand: async ({ slugOrId }) =>
                slugOrId === "bongalow"
                  ? Result.okay({ brand: brandRow })
                  : Result.error(
                      new GeneralError({ slugOrId }, "RESOURCE_NOT_FOUND")
                    ),
            }),
        },
      },
    });

    const foundResponse = await app.handle(
      new Request("https://jrw.test/api/storefront/brands/bongalow", {
        headers: { "x-request-id": "req_storefront_brand_detail" },
      })
    );
    const missingResponse = await app.handle(
      new Request("https://jrw.test/api/storefront/brands/missing", {
        headers: { "x-request-id": "req_storefront_brand_missing" },
      })
    );

    expect(foundResponse.status).toBe(200);
    await expect(foundResponse.json()).resolves.toMatchObject({
      data: {
        brand: {
          href: "/brands/bongalow",
          name: "Bong",
          slug: "bongalow",
        },
      },
      meta: { requestId: "req_storefront_brand_detail" },
    });

    expect(missingResponse.status).toBe(404);
    await expect(missingResponse.json()).resolves.toMatchObject({
      error: {
        code: "RESOURCE_NOT_FOUND",
      },
    });
  });
});
