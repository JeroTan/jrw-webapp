import { describe, expect, it } from "vitest";
import type { AuditEvent } from "@/domain/audit/events";
import type {
  ProductBrandMembershipRecord,
  ProductBrandRecord,
  ProductCategoryRecord,
  ProductRepository,
  UpdateProductRecordInput,
} from "@/server/repositories/ProductRepository";
import type {
  ProductOrganizationRecord,
  ProductPublishReadinessSnapshot,
  ProductRecord,
} from "@/domain/products/types";
import { ProductService, type ProductActorInput } from "./ProductService";

const now = "2026-05-21T08:00:00.000Z";

function actor(overrides: Partial<ProductActorInput> = {}): ProductActorInput {
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
    linkedCategoryCount: 1,
    variantCount: 1,
    lowestPrice: 1999,
    priceRangeMin: 1999,
    priceRangeMax: 1999,
    hasAvailableVariants: true,
    imageCount: 1,
    primaryImageUrl: "photo_1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function readinessSnapshot(
  overrides: Partial<ProductPublishReadinessSnapshot> = {}
): ProductPublishReadinessSnapshot {
  return {
    productId: "prod_1",
    status: "DRAFT",
    hasName: true,
    hasSlug: true,
    categoryCount: 1,
    variantCount: 1,
    imageCount: 1,
    availableVariantCount: 1,
    variantsMissingSkuCount: 0,
    variantsMissingPriceCount: 0,
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

class ProductRepositoryStub implements ProductRepository {
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
  readiness: ProductPublishReadinessSnapshot | null = readinessSnapshot();

  async create(): Promise<ProductRecord> {
    return productRecord();
  }

  async findById(productId: string): Promise<ProductRecord | null> {
    if (!this.product || this.product.id !== productId) {
      return null;
    }
    return this.product;
  }

  async findBySlug(): Promise<ProductRecord | null> {
    return null;
  }

  async getPublishReadiness(
    _productId: string
  ): Promise<ProductPublishReadinessSnapshot | null> {
    return this.readiness;
  }

  async list() {
    return {
      items: this.product ? [this.product] : [],
      page: 1,
      pageSize: 20,
      totalItems: this.product ? 1 : 0,
      totalPages: this.product ? 1 : 0,
    };
  }

  async update(
    productId: string,
    input: UpdateProductRecordInput
  ): Promise<ProductRecord> {
    const next = productRecord({
      ...this.product,
      id: productId,
      name: input.name ?? this.product?.name ?? "Desk Lamp",
      slug: input.slug ?? this.product?.slug ?? "desk-lamp",
      summary: input.summary ?? this.product?.summary ?? null,
      description:
        input.description ?? this.product?.description ?? "Description",
      updatedAt: input.updatedAt,
    });
    this.product = next;
    return next;
  }

  async publishProduct(
    productId: string,
    updatedAt: string
  ): Promise<ProductRecord | null> {
    const next = productRecord({
      ...(this.product ?? {}),
      id: productId,
      status: "PUBLISHED",
      updatedAt,
    });
    this.product = next;
    return next;
  }

  async draftProduct(
    productId: string,
    updatedAt: string
  ): Promise<ProductRecord | null> {
    const next = productRecord({
      ...(this.product ?? {}),
      id: productId,
      status: "DRAFT",
      updatedAt,
    });
    this.product = next;
    return next;
  }

  async archiveProduct(
    productId: string,
    updatedAt: string
  ): Promise<ProductRecord | null> {
    const next = productRecord({
      ...(this.product ?? {}),
      id: productId,
      status: "ARCHIVED",
      updatedAt,
    });
    this.product = next;
    return next;
  }

  async assignBrand(
    productId: string,
    brandId: string
  ): Promise<ProductRecord> {
    const next = productRecord({
      ...(this.product ?? {}),
      id: productId,
      brandId,
      brandName: this.brand?.name ?? "Brand",
    });
    this.product = next;
    return next;
  }

  async removeBrand(productId: string): Promise<ProductRecord> {
    const next = productRecord({
      ...(this.product ?? {}),
      id: productId,
      brandId: null,
      brandName: null,
    });
    this.product = next;
    return next;
  }

  async assignCategories(): Promise<void> {
    return undefined;
  }

  async removeCategory(): Promise<void> {
    return undefined;
  }

  async findCategoriesByIds(): Promise<ProductCategoryRecord[]> {
    return [];
  }

  async findOrganization(): Promise<ProductOrganizationRecord | null> {
    return organizationRecord();
  }

  async findBrandById(brandId: string): Promise<ProductBrandRecord | null> {
    if (!this.brand || this.brand.id !== brandId) {
      return null;
    }
    return this.brand;
  }

  async findBrandMembership(): Promise<ProductBrandMembershipRecord | null> {
    return this.membership;
  }
}

class AuditPublisherStub {
  events: AuditEvent[] = [];

  async publish(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}

describe("ProductService status flows", () => {
  it("publishes product when readiness is satisfied without an image", async () => {
    const repository = new ProductRepositoryStub();
    repository.product = productRecord({ status: "DRAFT" });
    repository.readiness = readinessSnapshot({ imageCount: 0 });
    const auditPublisher = new AuditPublisherStub();
    const service = new ProductService({
      repository,
      auditPublisher,
      now: () => new Date(now),
    });

    const result = await service.publish({
      actor: actor(),
      requestId: "req_publish_success",
      productId: "prod_1",
    });

    expect(result.error).toBeNull();
    expect(result.content?.product.status).toBe("PUBLISHED");
    expect(auditPublisher.events).toHaveLength(1);
    expect(auditPublisher.events[0]).toMatchObject({
      action: "catalog.product_published",
      requestId: "req_publish_success",
      safeDetails: {
        operation: "publish_product",
        oldStatus: "DRAFT",
        newStatus: "PUBLISHED",
      },
    });
  });

  it("blocks publish when readiness is missing items", async () => {
    const repository = new ProductRepositoryStub();
    repository.product = productRecord({ status: "DRAFT" });
    repository.readiness = readinessSnapshot({
      imageCount: 0,
      availableVariantCount: 0,
    });
    const service = new ProductService({
      repository,
      now: () => new Date(now),
    });

    const result = await service.publish({
      actor: actor(),
      requestId: "req_publish_missing_data",
      productId: "prod_1",
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toMatchObject({
      reason: "PRODUCT_NOT_READY_FOR_PUBLISH",
      missingItems: expect.arrayContaining([
        "At least one active variant must be in stock or preorder.",
      ]),
    });
    expect(result.error?.data).not.toMatchObject({
      missingItems: expect.arrayContaining([
        "At least one product image is required.",
      ]),
    });
  });

  it("blocks publish when another request changes status before write", async () => {
    const repository = new ProductRepositoryStub();
    repository.product = productRecord({ status: "DRAFT" });
    repository.publishProduct = async () => {
      repository.product = productRecord({ status: "PUBLISHED" });
      return null;
    };
    const auditPublisher = new AuditPublisherStub();
    const service = new ProductService({
      repository,
      auditPublisher,
      now: () => new Date(now),
    });

    const result = await service.publish({
      actor: actor(),
      requestId: "req_publish_race",
      productId: "prod_1",
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toMatchObject({
      reason: "ALREADY_IN_STATE",
      currentStatus: "PUBLISHED",
    });
    expect(auditPublisher.events).toHaveLength(0);
  });

  it("moves published product back to draft", async () => {
    const repository = new ProductRepositoryStub();
    repository.product = productRecord({ status: "PUBLISHED" });
    const service = new ProductService({
      repository,
      now: () => new Date(now),
    });

    const result = await service.unpublish({
      actor: actor(),
      requestId: "req_unpublish_success",
      productId: "prod_1",
    });

    expect(result.error).toBeNull();
    expect(result.content?.product.status).toBe("DRAFT");
  });

  it("archives draft or published product with soft status update", async () => {
    const repository = new ProductRepositoryStub();
    repository.product = productRecord({ status: "PUBLISHED" });
    const service = new ProductService({
      repository,
      now: () => new Date(now),
    });

    const result = await service.archive({
      actor: actor(),
      requestId: "req_archive_success",
      productId: "prod_1",
    });

    expect(result.error).toBeNull();
    expect(result.content?.product.status).toBe("ARCHIVED");
  });

  it("rejects invalid transition from archived to published", async () => {
    const repository = new ProductRepositoryStub();
    repository.product = productRecord({ status: "ARCHIVED" });
    const service = new ProductService({
      repository,
      now: () => new Date(now),
    });

    const result = await service.publish({
      actor: actor(),
      requestId: "req_publish_from_archived",
      productId: "prod_1",
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toMatchObject({
      reason: "STATUS_TERMINAL",
    });
  });

  it("denies status mutation when brand membership missing", async () => {
    const repository = new ProductRepositoryStub();
    repository.product = productRecord({
      status: "DRAFT",
      brandId: "brand_1",
      brandName: "Home",
    });
    repository.membership = null;
    const service = new ProductService({
      repository,
      now: () => new Date(now),
    });

    const result = await service.archive({
      actor: actor(),
      requestId: "req_archive_brand_denied",
      productId: "prod_1",
    });

    expect(result.error?.code).toBe("AUTH_FORBIDDEN");
    expect(result.error?.data).toMatchObject({
      reason: "BRAND_MEMBERSHIP_REQUIRED",
    });
  });
});
