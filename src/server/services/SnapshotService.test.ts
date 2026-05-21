import { describe, expect, it } from "vitest";
import type { ProductRecord } from "@/domain/products/types";
import type { SnapshotBuilder } from "@/domain/snapshots/snapshot-builder";
import type {
  BuiltOrderSnapshot,
  CreateOrderSnapshotInput,
  OrderSnapshot,
} from "@/domain/snapshots/types";
import type { SnapshotActorInput } from "./SnapshotService";
import { SnapshotService } from "./SnapshotService";

const now = "2026-05-21T12:00:00.000Z";

const adminActor: SnapshotActorInput = {
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
};

function productRecord(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: "prod_1",
    name: "Desk Lamp",
    slug: "desk-lamp",
    summary: null,
    description: "Lamp",
    status: "PUBLISHED",
    brandId: "brand_1",
    brandName: "JRW Lighting",
    linkedCategoryCount: 1,
    variantCount: 1,
    lowestPrice: 1999,
    priceRangeMin: 1999,
    priceRangeMax: 1999,
    hasAvailableVariants: true,
    imageCount: 1,
    primaryImageUrl: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function builtSnapshot(): BuiltOrderSnapshot {
  return {
    productId: "prod_1",
    productName: "Desk Lamp",
    productSlug: "desk-lamp",
    variantId: "var_1",
    variantLabel: "Small",
    variantOptions: [{ group: "Size", name: "Small" }],
    priceCentavos: 1999,
    quantity: 1,
    imageReference: "products/prod_1/variant.png",
    snapshotTimestamp: now,
  };
}

function createServiceFixture(input: {
  product?: ProductRecord | null;
  membership?: {
    adminId: string;
    role: "OWNER" | "MEMBER";
    status: "ACTIVE" | "PENDING" | "REVOKED";
  } | null;
}) {
  let buildCalls = 0;
  const service = new SnapshotService({
    builder: {
      async build() {
        buildCalls += 1;
        return builtSnapshot();
      },
    } as unknown as SnapshotBuilder,
    productRepository: {
      async findById(productId) {
        const product =
          input.product === undefined ? productRecord() : input.product;
        if (!product) {
          return null;
        }

        return product.id === productId ? product : null;
      },
      async findBrandMembership() {
        return input.membership ?? null;
      },
    },
    snapshotRepository: {
      async createSnapshot(
        snapshot: CreateOrderSnapshotInput
      ): Promise<OrderSnapshot> {
        return {
          ...snapshot,
          id: snapshot.id ?? "snap_1",
          productId: snapshot.productId,
          productSlug: snapshot.productSlug,
          variantId: snapshot.variantId,
        };
      },
      async getSnapshot() {
        return null;
      },
      async getSnapshotsByOrderId() {
        return [];
      },
    },
  });

  return { service, getBuildCalls: () => buildCalls };
}

describe("SnapshotService", () => {
  it("denies brand-scoped snapshot builds without active brand membership", async () => {
    const fixture = createServiceFixture({
      product: productRecord({ brandId: "brand_1" }),
      membership: null,
    });

    const result = await fixture.service.buildSnapshot({
      actor: adminActor,
      requestId: "req_snapshot_scope",
      body: {
        productId: "prod_1",
        variantId: "var_1",
        quantity: 1,
      },
    });

    expect(result.error?.code).toBe("AUTH_FORBIDDEN");
    expect(result.error?.data).toMatchObject({
      reason: "BRAND_MEMBERSHIP_REQUIRED",
    });
    expect(fixture.getBuildCalls()).toBe(0);
  });

  it("allows brand-scoped snapshot builds for active brand members", async () => {
    const fixture = createServiceFixture({
      product: productRecord({ brandId: "brand_1" }),
      membership: {
        adminId: "admin_1",
        role: "MEMBER",
        status: "ACTIVE",
      },
    });

    const result = await fixture.service.buildSnapshot({
      actor: adminActor,
      requestId: "req_snapshot_scope",
      body: {
        productId: "prod_1",
        variantId: "var_1",
        quantity: 1,
      },
    });

    expect(result.error).toBeNull();
    expect(result.content?.snapshot.productId).toBe("prod_1");
    expect(fixture.getBuildCalls()).toBe(1);
  });
});
