import { describe, expect, it } from "vitest";
import {
  createProductDraft,
  normalizeProductListQuery,
  resolveUniqueProductSlug,
} from "./product";
import { ProductService } from "@/server/services/ProductService";
import type {
  ProductBrandMembershipRecord,
  ProductBrandRecord,
  ProductRepository,
} from "@/server/repositories/ProductRepository";
import type { ProductRecord } from "./types";

const now = "2026-05-20T10:00:00.000Z";

const adminActor = {
  authenticated: true,
  role: "ADMIN" as const,
  actorId: "admin_1",
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
};

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
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function activeBrand(overrides: Partial<ProductBrandRecord> = {}): ProductBrandRecord {
  return {
    id: "brand_1",
    name: "Home",
    status: "ACTIVE",
    ...overrides,
  };
}

function activeMembership(
  overrides: Partial<ProductBrandMembershipRecord> = {}
): ProductBrandMembershipRecord {
  return {
    adminId: "admin_1",
    role: "MEMBER",
    status: "ACTIVE",
    ...overrides,
  };
}

function repositoryDouble(
  overrides: Partial<ProductRepository> = {}
): ProductRepository {
  return {
    create: async (input) =>
      productRecord({
        name: input.name,
        slug: input.slug,
        summary: input.summary,
        description: input.description,
        status: input.status,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      }),
    findById: async () => productRecord(),
    findBySlug: async () => null,
    list: async () => ({
      items: [productRecord()],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    }),
    update: async (productId, input) =>
      productRecord({
        id: productId,
        name: input.name ?? "Desk Lamp",
        slug: input.slug ?? "desk-lamp",
        summary: input.summary ?? null,
        description: input.description ?? "Compact lamp with matte finish.",
        status: "DRAFT",
        updatedAt: input.updatedAt,
      }),
    findBrandById: async () => activeBrand(),
    findBrandMembership: async () => activeMembership(),
    ...overrides,
  };
}

describe("product domain helpers", () => {
  it("creates draft from valid input", () => {
    const draft = createProductDraft({
      name: "  Desk Lamp  ",
      description: "  Compact lamp with matte finish.  ",
    });

    expect(draft.error).toBeNull();
    if (draft.error) {
      throw draft.error;
    }

    expect(draft.content).toMatchObject({
      name: "Desk Lamp",
      slug: "desk-lamp",
      summary: null,
      description: "Compact lamp with matte finish.",
      status: "DRAFT",
    });
  });

  it("resolves unique slug conflicts with numeric suffixes", () => {
    const slug = resolveUniqueProductSlug("desk-lamp", [
      "desk-lamp",
      "desk-lamp-1",
      "desk-lamp-2",
    ]);

    expect(slug).toBe("desk-lamp-3");
  });

  it("normalizes list query defaults and clamps page size", () => {
    const query = normalizeProductListQuery({
      page: undefined,
      pageSize: 999,
      status: "DRAFT",
      brandId: "brand_1",
      categoryId: "cat_1",
      search: "lamp",
      includeArchived: "true",
    });

    expect(query.error).toBeNull();
    if (query.error) {
      throw query.error;
    }

    expect(query.content).toMatchObject({
      page: 1,
      pageSize: 100,
      status: "DRAFT",
      brandId: "brand_1",
      categoryId: "cat_1",
      search: "lamp",
      includeArchived: true,
    });
  });
});

describe("ProductService", () => {
  it("creates draft product and resolves unique auto slug", async () => {
    const createInputs: Array<{ slug: string; status: string }> = [];
    const service = new ProductService({
      now: () => new Date(now),
      repository: repositoryDouble({
        findBySlug: async (slug) =>
          slug === "desk-lamp" ? productRecord({ id: "prod_existing", slug }) : null,
        create: async (input) => {
          createInputs.push({ slug: input.slug, status: input.status });
          return productRecord({
            id: "prod_created",
            name: input.name,
            slug: input.slug,
            summary: input.summary,
            description: input.description,
            status: input.status,
            createdAt: input.createdAt,
            updatedAt: input.updatedAt,
          });
        },
      }),
    });

    const created = await service.createProduct({
      actor: adminActor,
      requestId: "req_create_product",
      body: {
        name: "Desk Lamp",
        description: "Compact lamp with matte finish.",
      },
    });

    expect(created.error).toBeNull();
    expect(created.content?.product.status).toBe("DRAFT");
    expect(created.content?.product.slug).toBe("desk-lamp-1");
    expect(createInputs).toEqual([{ slug: "desk-lamp-1", status: "DRAFT" }]);
  });

  it("rejects explicit duplicate slug with conflict error", async () => {
    const service = new ProductService({
      repository: repositoryDouble({
        findBySlug: async (slug) =>
          slug === "desk-lamp" ? productRecord({ id: "prod_existing", slug }) : null,
      }),
    });

    const created = await service.createProduct({
      actor: adminActor,
      requestId: "req_duplicate_slug",
      body: {
        name: "Desk Lamp",
        slug: "desk-lamp",
        description: "Compact lamp with matte finish.",
      },
    });

    expect(created.error?.code).toBe("CONFLICT_STATE");
    expect(created.error?.data).toMatchObject({ reason: "DUPLICATE_SLUG" });
  });

  it("rejects invalid payload before persistence", async () => {
    let createCalls = 0;
    const service = new ProductService({
      repository: repositoryDouble({
        create: async (input) => {
          createCalls += 1;
          return productRecord({ slug: input.slug });
        },
      }),
    });

    const created = await service.createProduct({
      actor: adminActor,
      requestId: "req_invalid_payload",
      body: {
        description: "Missing required name",
      },
    });

    expect(created.error?.code).toBe("VALIDATION_FAILED");
    expect(createCalls).toBe(0);
  });

  it("returns paginated list", async () => {
    const service = new ProductService({
      repository: repositoryDouble({
        list: async (options) => ({
          items: [productRecord()],
          page: options.page ?? 1,
          pageSize: options.pageSize ?? 20,
          totalItems: 1,
          totalPages: 1,
        }),
      }),
    });

    const listed = await service.listProducts({
      actor: adminActor,
      requestId: "req_list_products",
      query: {
        page: 2,
        pageSize: 30,
        status: "DRAFT",
        search: "lamp",
      },
    });

    expect(listed.error).toBeNull();
    if (listed.error) {
      throw listed.error;
    }

    expect(listed.content).toMatchObject({
      page: 2,
      pageSize: 30,
      totalItems: 1,
      totalPages: 1,
    });
  });
});
