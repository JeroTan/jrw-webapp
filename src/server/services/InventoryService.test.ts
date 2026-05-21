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
  InventoryAvailabilityRecord,
  InventoryState,
  ProductRecord,
  ProductVariantRecord,
  VariantListResult,
} from "@/domain/products/types";
import {
  InventoryService,
  type InventoryActorInput,
} from "./InventoryService";

const now = "2026-05-21T05:00:00.000Z";

function adminActor(overrides: Partial<InventoryActorInput> = {}): InventoryActorInput {
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
    stock: 12,
    isPreorder: false,
    expectedRelease: null,
    variationChain: [
      { group: "Size", name: "Small" },
      { group: "Color", name: "Black" },
    ],
    status: "ACTIVE",
    hasAvailableStock: true,
    inventoryState: "IN_STOCK",
    stockVersion: 3,
    availability: "Available",
    ...overrides,
  };
}

class VariantRepositoryStub implements VariantRepository {
  variants: ProductVariantRecord[] = [];
  bumpVersionBeforeStockUpdate = false;
  bumpVersionBeforeStateUpdate = false;
  availability: InventoryAvailabilityRecord = {
    productId: "prod_1",
    variantId: "var_1",
    label: "Available",
    inStock: true,
  };

  async create(_input: CreateVariantRecordInput): Promise<ProductVariantRecord> {
    throw new Error("Not used in inventory tests.");
  }

  async findById(variantId: string): Promise<ProductVariantRecord | null> {
    return this.variants.find((variant) => variant.id === variantId) ?? null;
  }

  async findBySku(_sku: string): Promise<ProductVariantRecord | null> {
    return null;
  }

  async listByProductId(
    _productId: string,
    _options: { page: number; pageSize: number }
  ): Promise<VariantListResult> {
    return {
      items: [],
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
    };
  }

  async update(
    _variantId: string,
    _input: UpdateVariantRecordInput
  ): Promise<ProductVariantRecord | null> {
    throw new Error("Not used in inventory tests.");
  }

  async archive(_variantId: string): Promise<ProductVariantRecord | null> {
    throw new Error("Not used in inventory tests.");
  }

  async findDuplicateOptionCombination(_input: {
    productId: string;
    variationChain: ProductVariantRecord["variationChain"];
    excludeVariantId?: string;
  }): Promise<ProductVariantRecord | null> {
    return null;
  }

  async getProductSummary(_productId: string) {
    return {
      variantCount: 0,
      lowestPrice: null,
      priceRangeMin: null,
      priceRangeMax: null,
      hasAvailableVariants: false,
    };
  }

  async updateStockQuantity(input: {
    variantId: string;
    quantity: number;
    inventoryState: InventoryState;
    expectedStockVersion: number;
  }): Promise<ProductVariantRecord | null> {
    const index = this.variants.findIndex((variant) => variant.id === input.variantId);
    if (index < 0) {
      return null;
    }
    if (this.bumpVersionBeforeStockUpdate) {
      this.variants[index] = {
        ...this.variants[index],
        stockVersion: this.variants[index].stockVersion + 1,
      };
      this.bumpVersionBeforeStockUpdate = false;
    }
    if (this.variants[index].stockVersion !== input.expectedStockVersion) {
      return null;
    }

    const next = {
      ...this.variants[index],
      stock: input.quantity,
      inventoryState: input.inventoryState,
      isPreorder: input.inventoryState === "PREORDER",
      stockVersion: this.variants[index].stockVersion + 1,
      availability:
        input.inventoryState === "IN_STOCK"
          ? "Available"
          : input.inventoryState === "LOW_STOCK"
            ? "Low Stock"
            : input.inventoryState === "PREORDER"
              ? "Preorder"
              : "Unavailable",
      hasAvailableStock:
        input.inventoryState === "IN_STOCK" ||
        input.inventoryState === "LOW_STOCK" ||
        input.inventoryState === "PREORDER",
    } as ProductVariantRecord;

    this.variants[index] = next;
    return next;
  }

  async updateInventoryState(input: {
    variantId: string;
    inventoryState: InventoryState;
    expectedStockVersion: number;
  }): Promise<ProductVariantRecord | null> {
    const index = this.variants.findIndex((variant) => variant.id === input.variantId);
    if (index < 0) {
      return null;
    }
    if (this.bumpVersionBeforeStateUpdate) {
      this.variants[index] = {
        ...this.variants[index],
        stockVersion: this.variants[index].stockVersion + 1,
      };
      this.bumpVersionBeforeStateUpdate = false;
    }
    if (this.variants[index].stockVersion !== input.expectedStockVersion) {
      return null;
    }

    const next = {
      ...this.variants[index],
      inventoryState: input.inventoryState,
      isPreorder: input.inventoryState === "PREORDER",
      stockVersion: this.variants[index].stockVersion + 1,
      availability:
        input.inventoryState === "IN_STOCK"
          ? "Available"
          : input.inventoryState === "LOW_STOCK"
            ? "Low Stock"
            : input.inventoryState === "PREORDER"
              ? "Preorder"
              : "Unavailable",
      hasAvailableStock:
        input.inventoryState === "IN_STOCK" ||
        input.inventoryState === "LOW_STOCK" ||
        input.inventoryState === "PREORDER",
    } as ProductVariantRecord;

    this.variants[index] = next;
    return next;
  }

  async getStockAvailability(_input: {
    productId: string;
    variantId: string;
  }): Promise<InventoryAvailabilityRecord | null> {
    return this.availability;
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

  async findBrandMembership(): Promise<ProductBrandMembershipRecord | null> {
    return this.membership;
  }
}

class AuditPublisherStub {
  events: Array<Record<string, unknown>> = [];

  async publish(event: Record<string, unknown>): Promise<void> {
    this.events.push(event);
  }
}

describe("InventoryService", () => {
  it("updates stock quantity and emits audit event with old/new values", async () => {
    const variantRepository = new VariantRepositoryStub();
    variantRepository.variants = [variantRecord({ stock: 2, inventoryState: "LOW_STOCK" })];
    const auditPublisher = new AuditPublisherStub();
    const service = new InventoryService({
      variantRepository,
      productRepository: new ProductScopeRepositoryStub(),
      auditPublisher,
      now: () => new Date(now),
    });

    const result = await service.updateStockQuantity({
      actor: adminActor(),
      requestId: "req_inventory_stock_update",
      productId: "prod_1",
      variantId: "var_1",
      body: { quantity: 0 },
    });

    expect(result.error).toBeNull();
    if (result.error) {
      throw result.error;
    }

    expect(result.content.variant.stock).toBe(0);
    expect(result.content.variant.inventoryState).toBe("OUT_OF_STOCK");
    expect(auditPublisher.events).toHaveLength(1);
    expect(auditPublisher.events[0]).toMatchObject({
      action: "inventory.stock_adjusted",
      requestId: "req_inventory_stock_update",
      safeDetails: {
        oldQuantity: 2,
        newQuantity: 0,
      },
    });
  });

  it("rejects invalid quantity", async () => {
    const service = new InventoryService({
      variantRepository: new VariantRepositoryStub(),
      productRepository: new ProductScopeRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.updateStockQuantity({
      actor: adminActor(),
      requestId: "req_inventory_invalid_quantity",
      productId: "prod_1",
      variantId: "var_1",
      body: { quantity: -1 },
    });

    expect(result.error?.code).toBe("VALIDATION_FAILED");
  });

  it("updates inventory state when consistent", async () => {
    const variantRepository = new VariantRepositoryStub();
    variantRepository.variants = [variantRecord({ stock: 4, inventoryState: "LOW_STOCK" })];
    const service = new InventoryService({
      variantRepository,
      productRepository: new ProductScopeRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.updateInventoryState({
      actor: adminActor(),
      requestId: "req_inventory_state_update",
      productId: "prod_1",
      variantId: "var_1",
      body: { state: "LOW_STOCK" },
    });

    expect(result.error).toBeNull();
    if (result.error) {
      throw result.error;
    }
    expect(result.content.variant.inventoryState).toBe("LOW_STOCK");
    expect(result.content.variant.availability).toBe("Low Stock");
  });

  it("rejects invalid inventory state value", async () => {
    const variantRepository = new VariantRepositoryStub();
    variantRepository.variants = [variantRecord({ stock: 12 })];
    const service = new InventoryService({
      variantRepository,
      productRepository: new ProductScopeRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.updateInventoryState({
      actor: adminActor(),
      requestId: "req_inventory_state_invalid",
      productId: "prod_1",
      variantId: "var_1",
      body: { state: "BROKEN" },
    });

    expect(result.error?.code).toBe("VALIDATION_FAILED");
  });

  it("rejects state and quantity consistency conflict", async () => {
    const variantRepository = new VariantRepositoryStub();
    variantRepository.variants = [variantRecord({ stock: 0, inventoryState: "OUT_OF_STOCK" })];
    const service = new InventoryService({
      variantRepository,
      productRepository: new ProductScopeRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.updateInventoryState({
      actor: adminActor(),
      requestId: "req_inventory_state_conflict",
      productId: "prod_1",
      variantId: "var_1",
      body: { state: "IN_STOCK" },
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toMatchObject({
      reason: "INVENTORY_STATE_CONFLICT",
    });
  });

  it("returns conflict when inventory state update sees stale stock version", async () => {
    const variantRepository = new VariantRepositoryStub();
    variantRepository.variants = [
      variantRecord({ stock: 4, inventoryState: "LOW_STOCK", stockVersion: 7 }),
    ];
    variantRepository.bumpVersionBeforeStateUpdate = true;
    const service = new InventoryService({
      variantRepository,
      productRepository: new ProductScopeRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.updateInventoryState({
      actor: adminActor(),
      requestId: "req_inventory_state_version_conflict",
      productId: "prod_1",
      variantId: "var_1",
      body: { state: "LOW_STOCK" },
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toMatchObject({
      reason: "INVENTORY_VERSION_CONFLICT",
    });
  });

  it("returns conflict when stock update sees stale stock version", async () => {
    const variantRepository = new VariantRepositoryStub();
    variantRepository.variants = [
      variantRecord({ stock: 12, inventoryState: "IN_STOCK", stockVersion: 3 }),
    ];
    variantRepository.bumpVersionBeforeStockUpdate = true;
    const service = new InventoryService({
      variantRepository,
      productRepository: new ProductScopeRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.updateStockQuantity({
      actor: adminActor(),
      requestId: "req_inventory_stock_version_conflict",
      productId: "prod_1",
      variantId: "var_1",
      body: { quantity: 9 },
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toMatchObject({
      reason: "INVENTORY_VERSION_CONFLICT",
    });
  });

  it("denies stock mutation when admin lacks brand membership", async () => {
    const variantRepository = new VariantRepositoryStub();
    variantRepository.variants = [variantRecord({ stock: 3, inventoryState: "LOW_STOCK" })];
    const productRepository = new ProductScopeRepositoryStub();
    productRepository.product = productRecord({
      id: "prod_1",
      brandId: "brand_1",
      brandName: "Home",
    });
    productRepository.membership = null;

    const service = new InventoryService({
      variantRepository,
      productRepository,
      now: () => new Date(now),
    });

    const result = await service.updateStockQuantity({
      actor: adminActor(),
      requestId: "req_inventory_brand_forbidden",
      productId: "prod_1",
      variantId: "var_1",
      body: { quantity: 4 },
    });

    expect(result.error?.code).toBe("AUTH_FORBIDDEN");
    expect(result.error?.data).toMatchObject({
      reason: "BRAND_MEMBERSHIP_REQUIRED",
    });
  });

  it("returns customer-safe availability without raw quantity", async () => {
    const variantRepository = new VariantRepositoryStub();
    const service = new InventoryService({
      variantRepository,
      productRepository: new ProductScopeRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.getAvailability({
      requestId: "req_inventory_public_availability",
      productId: "prod_1",
      variantId: "var_1",
    });

    expect(result.error).toBeNull();
    if (result.error) {
      throw result.error;
    }
    expect(result.content.availability).toEqual({
      productId: "prod_1",
      variantId: "var_1",
      label: "Available",
      inStock: true,
    });
  });
});
