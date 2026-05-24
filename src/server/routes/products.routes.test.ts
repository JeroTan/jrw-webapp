import { describe, expect, it } from "vitest";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";
import { createApp } from "@/server/app";
import { ProductController } from "@/server/controllers/ProductController";
import type { RequestActorContext } from "@/server/context/request-context";
import type {
  ProductOrganizationRecord,
  ProductRecord,
} from "@/domain/products/types";
import { ProductService } from "@/server/services/ProductService";

const now = "2026-05-20T11:00:00.000Z";

function createController(service: Partial<ProductService>) {
  return new ProductController(service as ProductService);
}

const adminContext = {
  authenticated: true,
  role: "ADMIN",
  actorId: "admin_1",
  safeActorId: "admin_1",
  accountStatus: {
    status: "ACTIVE" as const,
    emailVerified: true,
    approved: true,
  },
  eligibility: {
    active: true,
    emailVerified: true,
    approved: true,
  },
} satisfies RequestActorContext;

const customerContext = {
  authenticated: true,
  role: "CUSTOMER",
  actorId: "customer_1",
  safeActorId: "customer_1",
  accountStatus: {
    status: "ACTIVE" as const,
    emailVerified: true,
    approved: true,
  },
  eligibility: {
    active: true,
    emailVerified: true,
    approved: true,
  },
} satisfies RequestActorContext;

function productRecord(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: "prod_1",
    name: "Desk Lamp",
    slug: "desk-lamp",
    summary: "Metal lamp",
    description: "Compact lamp with matte finish.",
    status: "DRAFT",
    brandId: null,
    brandName: null,
    linkedCategoryCount: 0,
    variantCount: 0,
    lowestPrice: null,
    priceRangeMin: null,
    priceRangeMax: null,
    hasAvailableVariants: false,
    imageCount: 0,
    primaryImageUrl: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function organizationRecord(
  overrides: Partial<ProductOrganizationRecord> = {}
): ProductOrganizationRecord {
  return {
    productId: "prod_1",
    brand: null,
    categories: [],
    ...overrides,
  };
}

describe("products routes", () => {
  it("documents product endpoints with auth metadata and error codes", async () => {
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
            "x-error-codes"?: string[];
            responses?: Record<string, unknown>;
          }
        >
      >;
    };

    const list = body.paths?.["/api/admin/products"]?.get;
    const create = body.paths?.["/api/admin/products"]?.post;
    const detail = body.paths?.["/api/admin/products/{productId}"]?.get;
    const organization =
      body.paths?.["/api/admin/products/{productId}/organization"]?.get;
    const assignBrand =
      body.paths?.["/api/admin/products/{productId}/brand"]?.patch;
    const assignCategories =
      body.paths?.["/api/admin/products/{productId}/categories"]?.patch;
    const readiness =
      body.paths?.["/api/admin/products/{productId}/readiness"]?.get;
    const publish =
      body.paths?.["/api/admin/products/{productId}/publish"]?.post;
    const unpublish =
      body.paths?.["/api/admin/products/{productId}/unpublish"]?.post;
    const archive =
      body.paths?.["/api/admin/products/{productId}/archive"]?.post;
    const update = body.paths?.["/api/admin/products/{productId}"]?.patch;

    expect(list?.summary).toBe("List products");
    expect(list?.tags).toContain("Products");
    expect(list?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN", "SUPER_ADMIN"],
    });
    expect(list?.["x-rate-limit-class"]).toBe("admin-read");
    expect(list?.["x-error-codes"]).toEqual(
      expect.arrayContaining([
        "AUTH_REQUIRED",
        "AUTH_FORBIDDEN",
        "VALIDATION_FAILED",
        "RESOURCE_NOT_FOUND",
        "CONFLICT_STATE",
        "PROVIDER_UNAVAILABLE",
      ])
    );
    expect(list?.responses).toHaveProperty("200");

    expect(create?.summary).toBe("Create product");
    expect(create?.["x-rate-limit-class"]).toBe("admin-write");
    expect(create?.responses).toHaveProperty("201");

    expect(detail?.summary).toBe("Get product detail");
    expect(detail?.responses).toHaveProperty("200");

    expect(organization?.summary).toBe("Get product organization");
    expect(organization?.responses).toHaveProperty("200");

    expect(assignBrand?.summary).toBe("Assign or remove product brand");
    expect(assignBrand?.responses).toHaveProperty("200");

    expect(assignCategories?.summary).toBe("Assign product categories");
    expect(assignCategories?.responses).toHaveProperty("200");

    expect(readiness?.summary).toBe("Get product publish readiness");
    expect(readiness?.responses).toHaveProperty("200");

    expect(publish?.summary).toBe("Publish product");
    expect(publish?.responses).toHaveProperty("200");

    expect(unpublish?.summary).toBe("Unpublish product");
    expect(unpublish?.responses).toHaveProperty("200");

    expect(archive?.summary).toBe("Archive product");
    expect(archive?.responses).toHaveProperty("200");

    expect(update?.summary).toBe("Update product identity");
    expect(update?.responses).toHaveProperty("200");
  });

  it("creates product with standard success envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              createProduct: async () =>
                Result.okay({
                  product: productRecord(),
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_create_success",
        },
        body: JSON.stringify({
          name: "Desk Lamp",
          description: "Compact lamp with matte finish.",
        }),
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        product: {
          id: "prod_1",
          slug: "desk-lamp",
          status: "DRAFT",
        },
      },
      meta: { requestId: "req_product_create_success" },
    });
  });

  it("lists products with pagination envelope metadata", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              listProducts: async () =>
                Result.okay({
                  items: [productRecord()],
                  page: 1,
                  pageSize: 20,
                  totalItems: 1,
                  totalPages: 1,
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request(
        "https://jrw.test/api/admin/products?page=1&pageSize=20&status=DRAFT&search=lamp",
        {
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "x-request-id": "req_product_list_success",
          },
        }
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        items: [expect.objectContaining({ id: "prod_1" })],
      },
      meta: {
        requestId: "req_product_list_success",
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    });
  });

  it("updates product identity with standard envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              updateProduct: async () =>
                Result.okay({
                  product: productRecord({
                    name: "Desk Lamp v2",
                    slug: "desk-lamp-v2",
                  }),
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1", {
        method: "PATCH",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_update_success",
        },
        body: JSON.stringify({
          name: "Desk Lamp v2",
          slug: "desk-lamp-v2",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        product: {
          name: "Desk Lamp v2",
          slug: "desk-lamp-v2",
        },
      },
      meta: { requestId: "req_product_update_success" },
    });
  });

  it("loads product organization with brand and categories", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              getProductOrganization: async () =>
                Result.okay({
                  organization: organizationRecord({
                    brand: {
                      id: "brand_1",
                      name: "Home",
                      status: "ACTIVE",
                    },
                    categories: [
                      {
                        id: "cat_1",
                        name: "Lighting",
                        slug: "lighting",
                        status: "ACTIVE",
                      },
                    ],
                  }),
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/organization", {
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_product_org_success",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        organization: {
          productId: "prod_1",
          brand: {
            id: "brand_1",
            name: "Home",
          },
          categories: [{ id: "cat_1", slug: "lighting" }],
        },
      },
      meta: { requestId: "req_product_org_success" },
    });
  });

  it("assigns and removes product brand with standard envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              assignProductBrand: async (input) => {
                const payload = input.body as { brandId?: string | null };
                const brandId = payload.brandId ?? null;

                return Result.okay({
                  product: productRecord({
                    brandId,
                    brandName: brandId ? "Home" : null,
                  }),
                  organization: organizationRecord({
                    brand: brandId
                      ? {
                          id: brandId,
                          name: "Home",
                          status: "ACTIVE",
                        }
                      : null,
                  }),
                });
              },
            }),
        },
      },
    });

    const assigned = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/brand", {
        method: "PATCH",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_brand_assign",
        },
        body: JSON.stringify({
          brandId: "brand_1",
        }),
      })
    );

    expect(assigned.status).toBe(200);
    await expect(assigned.json()).resolves.toMatchObject({
      data: {
        product: {
          brandId: "brand_1",
          brandName: "Home",
        },
        organization: {
          brand: {
            id: "brand_1",
          },
        },
      },
      meta: { requestId: "req_product_brand_assign" },
    });

    const removed = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/brand", {
        method: "PATCH",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_brand_remove",
        },
        body: JSON.stringify({
          brandId: null,
        }),
      })
    );

    expect(removed.status).toBe(200);
    await expect(removed.json()).resolves.toMatchObject({
      data: {
        product: {
          brandId: null,
          brandName: null,
        },
        organization: {
          brand: null,
        },
      },
      meta: { requestId: "req_product_brand_remove" },
    });
  });

  it("assigns and removes product categories with standard envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              assignProductCategories: async (input) => {
                const payload = input.body as { categoryIds?: string[] };
                const categoryIds = payload.categoryIds ?? [];

                return Result.okay({
                  product: productRecord({
                    linkedCategoryCount: categoryIds.length,
                  }),
                  organization: organizationRecord({
                    categories: categoryIds.map((categoryId, index) => ({
                      id: categoryId,
                      name: `Category ${index + 1}`,
                      slug: `category-${index + 1}`,
                      status: "ACTIVE",
                    })),
                  }),
                });
              },
            }),
        },
      },
    });

    const assigned = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/categories", {
        method: "PATCH",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_categories_assign",
        },
        body: JSON.stringify({
          categoryIds: ["cat_1", "cat_2"],
        }),
      })
    );

    expect(assigned.status).toBe(200);
    await expect(assigned.json()).resolves.toMatchObject({
      data: {
        product: {
          linkedCategoryCount: 2,
        },
        organization: {
          categories: [{ id: "cat_1" }, { id: "cat_2" }],
        },
      },
      meta: { requestId: "req_product_categories_assign" },
    });

    const removed = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/categories", {
        method: "PATCH",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_categories_remove",
        },
        body: JSON.stringify({
          categoryIds: [],
        }),
      })
    );

    expect(removed.status).toBe(200);
    await expect(removed.json()).resolves.toMatchObject({
      data: {
        product: {
          linkedCategoryCount: 0,
        },
        organization: {
          categories: [],
        },
      },
      meta: { requestId: "req_product_categories_remove" },
    });
  });

  it("returns readiness and applies publish lifecycle endpoints", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              getPublishReadiness: async () =>
                Result.okay({
                  readiness: {
                    isReady: false,
                    missingItems: ["At least one active variant is required."],
                  },
                }),
              publish: async () =>
                Result.okay({
                  product: productRecord({
                    status: "PUBLISHED",
                  }),
                }),
              unpublish: async () =>
                Result.okay({
                  product: productRecord({
                    status: "DRAFT",
                  }),
                }),
              archive: async () =>
                Result.okay({
                  product: productRecord({
                    status: "ARCHIVED",
                  }),
                }),
            }),
        },
      },
    });

    const readiness = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/readiness", {
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_product_readiness",
        },
      })
    );
    expect(readiness.status).toBe(200);
    await expect(readiness.json()).resolves.toMatchObject({
      data: {
        readiness: {
          isReady: false,
          missingItems: ["At least one active variant is required."],
        },
      },
      meta: { requestId: "req_product_readiness" },
    });

    const publish = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/publish", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_product_publish",
        },
      })
    );
    expect(publish.status).toBe(200);
    await expect(publish.json()).resolves.toMatchObject({
      data: { product: { status: "PUBLISHED" } },
      meta: { requestId: "req_product_publish" },
    });

    const unpublish = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/unpublish", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_product_unpublish",
        },
      })
    );
    expect(unpublish.status).toBe(200);
    await expect(unpublish.json()).resolves.toMatchObject({
      data: { product: { status: "DRAFT" } },
      meta: { requestId: "req_product_unpublish" },
    });

    const archive = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/archive", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_product_archive",
        },
      })
    );
    expect(archive.status).toBe(200);
    await expect(archive.json()).resolves.toMatchObject({
      data: { product: { status: "ARCHIVED" } },
      meta: { requestId: "req_product_archive" },
    });
  });

  it("returns forbidden envelope when publish denied by brand scope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              publish: async () =>
                Result.error(
                  new GeneralError(
                    { reason: "BRAND_MEMBERSHIP_REQUIRED" },
                    "AUTH_FORBIDDEN"
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/publish", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_product_publish_forbidden",
        },
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: {
          requestId: "req_product_publish_forbidden",
          reason: "BRAND_MEMBERSHIP_REQUIRED",
        },
      },
    });
  });

  it("returns forbidden when admin lacks selected brand membership", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              assignProductBrand: async () =>
                Result.error(
                  new GeneralError(
                    { reason: "BRAND_MEMBERSHIP_REQUIRED" },
                    "AUTH_FORBIDDEN"
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/brand", {
        method: "PATCH",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_brand_forbidden",
        },
        body: JSON.stringify({
          brandId: "brand_2",
        }),
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: {
          requestId: "req_product_brand_forbidden",
          reason: "BRAND_MEMBERSHIP_REQUIRED",
        },
      },
    });
  });

  it("returns validation error for archived category assignment", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              assignProductCategories: async () =>
                Result.error(
                  new GeneralError(
                    {
                      reason: "CATEGORY_NOT_ACTIVE",
                      categoryIds: ["cat_archived"],
                    },
                    "VALIDATION_FAILED"
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/categories", {
        method: "PATCH",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_category_archived",
        },
        body: JSON.stringify({
          categoryIds: ["cat_archived"],
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: {
          requestId: "req_product_category_archived",
          reason: "CATEGORY_NOT_ACTIVE",
        },
      },
    });
  });

  it("rejects multi-brand payload at route validation", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              assignProductBrand: async () =>
                Result.okay({
                  product: productRecord(),
                  organization: organizationRecord(),
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/brand", {
        method: "PATCH",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_brand_multi_reject",
        },
        body: JSON.stringify({
          brandId: ["brand_1", "brand_2"],
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: {
          requestId: "req_product_brand_multi_reject",
        },
      },
    });
  });

  it("returns conflict envelope for duplicate slug", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        products: {
          controllerFactory: () =>
            createController({
              createProduct: async () =>
                Result.error(
                  new GeneralError(
                    { reason: "DUPLICATE_SLUG" },
                    "CONFLICT_STATE"
                  )
                ),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_duplicate_slug",
        },
        body: JSON.stringify({
          name: "Duplicate",
          slug: "desk-lamp",
          description: "Duplicate slug attempt.",
        }),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT_STATE",
        details: {
          requestId: "req_product_duplicate_slug",
        },
      },
    });
  });

  it("denies non-admin before controller execution", async () => {
    let controllerCalls = 0;
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => customerContext,
      },
      routes: {
        products: {
          controllerFactory: () => {
            controllerCalls += 1;
            return createController({
              createProduct: async () =>
                Result.okay({
                  product: productRecord(),
                }),
            });
          },
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products", {
        method: "POST",
        headers: {
          cookie: "jrw_customer_session=customer-token",
          "content-type": "application/json",
          "x-request-id": "req_product_non_admin_denied",
        },
        body: JSON.stringify({
          name: "Denied Product",
          description: "Should not pass.",
        }),
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_FORBIDDEN",
        details: {
          requestId: "req_product_non_admin_denied",
        },
      },
    });
    expect(controllerCalls).toBe(0);
  });

  it("returns validation envelope for invalid payload", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "content-type": "application/json",
          "x-request-id": "req_product_invalid_payload",
        },
        body: JSON.stringify({
          description: "Missing required product name",
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: {
          requestId: "req_product_invalid_payload",
        },
      },
    });
  });
});
