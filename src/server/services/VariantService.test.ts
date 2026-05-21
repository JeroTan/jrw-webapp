import { describe, expect, it } from "vitest";
import type {
  ProductBrandMembershipRecord,
  ProductBrandRecord,
} from "@/server/repositories/ProductRepository";
import type {
  CreateVariantRecordInput,
  UpdateVariantRecordInput,
  VariantRepository,
} from "@/server/repositories/VariantRepository";
import type {
  ProductRecord,
  ProductVariantOption,
  ProductVariantRecord,
  ProductVariantSummary,
  VariantListResult,
} from "@/domain/products/types";
import { VariantService, type VariantActorInput } from "./VariantService";

const now = "2026-05-21T04:00:00.000Z";

function adminActor(overrides: Partial<VariantActorInput> = {}): VariantActorInput {
  return {
    authenticated: true,
    role: "ADMIN",
    actorId: "admin_1",
    safeActorId: "admin_1",
    accountStatus: {
      status: "ACTIVE",
      emailVerified: true,
      approved: true,
    },
    eligibility: {
      active: true,
      emailVerified: true,
      approved: true,
    },
    ...overrides,
  };
}

function productRecord(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: "prod_1",
    name: "Desk Lamp",
    slug: "desk-lamp",
    summary: "Compact lamp",
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

function variantRecord(
  overrides: Partial<ProductVariantRecord> = {}
): ProductVariantRecord {
  return {
    id: "var_1",
    productId: "prod_1",
    name: "Small / Black",
    sku: "SKU-S-BLK",
    priceCentavos: 1999,
    isPreorder: false,
    expectedRelease: null,
    variationChain: [
      { group: "Size", name: "Small" },
      { group: "Color", name: "Black" },
    ],
    status: "ACTIVE",
    hasAvailableStock: true,
    stock: 10,
    ...overrides,
  };
}

function normalizeOptionSignature(options: ProductVariantOption[]): string {
  return JSON.stringify(
    options
      .map((option) => ({
        group: option.group.trim().toLowerCase(),
        name: option.name.trim().toLowerCase(),
      }))
      .sort((left, right) =>
        `${left.group}:${left.name}`.localeCompare(`${right.group}:${right.name}`)
      )
  );
}

class VariantRepositoryStub implements VariantRepository {
  variants: ProductVariantRecord[] = [];
  createdInputs: CreateVariantRecordInput[] = [];
  updatedInputs: Array<{ variantId: string; input: UpdateVariantRecordInput }> = [];
  archivedIds: string[] = [];

  async create(input: CreateVariantRecordInput): Promise<ProductVariantRecord> {
    this.createdInputs.push(input);
    const variant = variantRecord({
      id: `var_${this.variants.length + 1}`,
      productId: input.productId,
      name: input.name,
      sku: input.sku,
      priceCentavos: input.priceCentavos,
      isPreorder: input.isPreorder,
      expectedRelease: input.expectedRelease,
      variationChain: input.variationChain,
      stock: input.stock,
      status: "ACTIVE",
      hasAvailableStock: input.stock > 0 || input.isPreorder,
    });
    this.variants.push(variant);
    return variant;
  }

  async findById(variantId: string): Promise<ProductVariantRecord | null> {
    return this.variants.find((variant) => variant.id === variantId) ?? null;
  }

  async findBySku(sku: string): Promise<ProductVariantRecord | null> {
    const normalized = sku.trim().toLowerCase();
    return (
      this.variants.find(
        (variant) => variant.sku.trim().toLowerCase() === normalized
      ) ?? null
    );
  }

  async listByProductId(
    productId: string,
    options: { page: number; pageSize: number }
  ): Promise<VariantListResult> {
    const scoped = this.variants.filter((variant) => variant.productId === productId);
    const start = (options.page - 1) * options.pageSize;
    const items = scoped.slice(start, start + options.pageSize);
    const totalItems = scoped.length;
    return {
      items,
      page: options.page,
      pageSize: options.pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / options.pageSize),
    };
  }

  async update(
    variantId: string,
    input: UpdateVariantRecordInput
  ): Promise<ProductVariantRecord | null> {
    this.updatedInputs.push({ variantId, input });
    const index = this.variants.findIndex((variant) => variant.id === variantId);
    if (index < 0) {
      return null;
    }

    const next = {
      ...this.variants[index],
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.priceCentavos !== undefined
        ? { priceCentavos: input.priceCentavos }
        : {}),
      ...(input.isPreorder !== undefined ? { isPreorder: input.isPreorder } : {}),
      ...(input.expectedRelease !== undefined
        ? { expectedRelease: input.expectedRelease }
        : {}),
      ...(input.variationChain !== undefined
        ? { variationChain: input.variationChain }
        : {}),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
    };
    next.hasAvailableStock = next.stock > 0 || next.isPreorder;
    this.variants[index] = next;

    return next;
  }

  async archive(variantId: string): Promise<ProductVariantRecord | null> {
    this.archivedIds.push(variantId);
    const index = this.variants.findIndex((variant) => variant.id === variantId);
    if (index < 0) {
      return null;
    }

    this.variants[index] = {
      ...this.variants[index],
      status: "ARCHIVED",
      hasAvailableStock: false,
    };
    return this.variants[index];
  }

  async findDuplicateOptionCombination(input: {
    productId: string;
    variationChain: ProductVariantOption[];
    excludeVariantId?: string;
  }): Promise<ProductVariantRecord | null> {
    const expected = normalizeOptionSignature(input.variationChain);
    return (
      this.variants.find((variant) => {
        if (variant.productId !== input.productId) {
          return false;
        }
        if (input.excludeVariantId && variant.id === input.excludeVariantId) {
          return false;
        }
        return normalizeOptionSignature(variant.variationChain) === expected;
      }) ?? null
    );
  }

  async getProductSummary(_productId: string): Promise<ProductVariantSummary> {
    return {
      variantCount: this.variants.filter((variant) => variant.status === "ACTIVE")
        .length,
      lowestPrice: null,
      priceRangeMin: null,
      priceRangeMax: null,
      hasAvailableVariants: this.variants.some(
        (variant) => variant.status === "ACTIVE" && variant.hasAvailableStock
      ),
    };
  }
}

class ProductScopeRepositoryStub {
  product: ProductRecord | null = productRecord();
  brand: ProductBrandRecord | null = {
    id: "brand_1",
    name: "Home",
    status: "ACTIVE",
  };
  membership: ProductBrandMembershipRecord | null = {
    adminId: "admin_1",
    role: "MEMBER",
    status: "ACTIVE",
  };

  async findById(productId: string): Promise<ProductRecord | null> {
    if (this.product?.id !== productId) {
      return null;
    }
    return this.product;
  }

  async findBrandById(brandId: string): Promise<ProductBrandRecord | null> {
    if (this.brand?.id !== brandId) {
      return null;
    }
    return this.brand;
  }

  async findBrandMembership(
    _brandId: string,
    _adminId: string
  ): Promise<ProductBrandMembershipRecord | null> {
    return this.membership;
  }
}

describe("VariantService", () => {
  it("creates variant and keeps price in centavos", async () => {
    const variantRepository = new VariantRepositoryStub();
    const productRepository = new ProductScopeRepositoryStub();
    const service = new VariantService({
      variantRepository,
      productRepository,
      now: () => new Date(now),
    });

    const result = await service.createVariant({
      actor: adminActor(),
      requestId: "req_variant_create_success",
      productId: "prod_1",
      body: {
        name: "Small / Black",
        sku: "SKU-S-BLK",
        priceCentavos: 1999,
        variationChain: [
          { group: "Size", name: "Small" },
          { group: "Color", name: "Black" },
        ],
      },
    });

    expect(result.error).toBeNull();
    if (result.error) {
      throw result.error;
    }
    expect(result.content.variant.priceCentavos).toBe(1999);
    expect(variantRepository.createdInputs[0]?.priceCentavos).toBe(1999);
  });

  it("updates variant price in centavos", async () => {
    const variantRepository = new VariantRepositoryStub();
    variantRepository.variants = [
      variantRecord({
        id: "var_1",
        productId: "prod_1",
        sku: "SKU-1",
        priceCentavos: 1200,
      }),
    ];
    const service = new VariantService({
      variantRepository,
      productRepository: new ProductScopeRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.updateVariant({
      actor: adminActor(),
      requestId: "req_variant_update_price",
      productId: "prod_1",
      variantId: "var_1",
      body: {
        priceCentavos: 1599,
      },
    });

    expect(result.error).toBeNull();
    if (result.error) {
      throw result.error;
    }
    expect(result.content.variant.priceCentavos).toBe(1599);
    expect(variantRepository.updatedInputs[0]?.input.priceCentavos).toBe(1599);
  });

  it("archives variant with soft status update", async () => {
    const variantRepository = new VariantRepositoryStub();
    variantRepository.variants = [variantRecord({ id: "var_1", productId: "prod_1" })];
    const service = new VariantService({
      variantRepository,
      productRepository: new ProductScopeRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.archiveVariant({
      actor: adminActor(),
      requestId: "req_variant_archive",
      productId: "prod_1",
      variantId: "var_1",
      body: {},
    });

    expect(result.error).toBeNull();
    if (result.error) {
      throw result.error;
    }
    expect(result.content.variant.status).toBe("ARCHIVED");
    expect(variantRepository.archivedIds).toEqual(["var_1"]);
  });

  it("rejects duplicate option combinations per product", async () => {
    const variantRepository = new VariantRepositoryStub();
    variantRepository.variants = [
      variantRecord({
        id: "var_1",
        productId: "prod_1",
        variationChain: [{ group: "Size", name: "Small" }],
      }),
    ];
    const service = new VariantService({
      variantRepository,
      productRepository: new ProductScopeRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.createVariant({
      actor: adminActor(),
      requestId: "req_variant_duplicate_option",
      productId: "prod_1",
      body: {
        name: "Small / White",
        sku: "SKU-S-WHT",
        priceCentavos: 2099,
        variationChain: [{ group: "Size", name: "Small" }],
      },
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toMatchObject({
      reason: "DUPLICATE_OPTION_COMBINATION",
    });
  });

  it("rejects invalid centavos price", async () => {
    const service = new VariantService({
      variantRepository: new VariantRepositoryStub(),
      productRepository: new ProductScopeRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.createVariant({
      actor: adminActor(),
      requestId: "req_variant_invalid_price",
      productId: "prod_1",
      body: {
        name: "Invalid Price",
        sku: "SKU-INVALID",
        priceCentavos: -1,
        variationChain: [],
      },
    });

    expect(result.error?.code).toBe("VALIDATION_FAILED");
  });

  it("rejects duplicate SKU", async () => {
    const variantRepository = new VariantRepositoryStub();
    variantRepository.variants = [
      variantRecord({ id: "var_1", productId: "prod_1", sku: "SKU-DUP" }),
    ];
    const service = new VariantService({
      variantRepository,
      productRepository: new ProductScopeRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.createVariant({
      actor: adminActor(),
      requestId: "req_variant_duplicate_sku",
      productId: "prod_1",
      body: {
        name: "Duplicate SKU",
        sku: "SKU-DUP",
        priceCentavos: 1899,
        variationChain: [{ group: "Size", name: "Medium" }],
      },
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toMatchObject({
      reason: "DUPLICATE_SKU",
    });
  });

  it("denies variant mutation when admin lacks brand membership", async () => {
    const variantRepository = new VariantRepositoryStub();
    const productRepository = new ProductScopeRepositoryStub();
    productRepository.product = productRecord({
      id: "prod_1",
      brandId: "brand_1",
      brandName: "Home",
    });
    productRepository.membership = null;
    const service = new VariantService({
      variantRepository,
      productRepository,
      now: () => new Date(now),
    });

    const result = await service.createVariant({
      actor: adminActor(),
      requestId: "req_variant_brand_forbidden",
      productId: "prod_1",
      body: {
        name: "Blocked Variant",
        sku: "SKU-BLOCKED",
        priceCentavos: 1999,
        variationChain: [],
      },
    });

    expect(result.error?.code).toBe("AUTH_FORBIDDEN");
    expect(result.error?.data).toMatchObject({
      reason: "BRAND_MEMBERSHIP_REQUIRED",
    });
  });
});
