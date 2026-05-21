import { describe, expect, it } from "vitest";
import type {
  ProductPhotoRecord,
  ProductRecord,
  ProductVariantRecord,
} from "@/domain/products/types";
import { SnapshotBuilder } from "./snapshot-builder";

const now = "2026-05-21T12:00:00.000Z";

function productRecord(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: "prod_1",
    name: "Desk Lamp",
    slug: "desk-lamp",
    summary: "Compact lamp",
    description: "Compact lamp with matte finish.",
    status: "PUBLISHED",
    brandId: null,
    brandName: null,
    linkedCategoryCount: 1,
    variantCount: 1,
    lowestPrice: 1999,
    priceRangeMin: 1999,
    priceRangeMax: 1999,
    hasAvailableVariants: true,
    imageCount: 1,
    primaryImageUrl: "photo_primary",
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
    name: "Small Black",
    sku: "SKU-S-BLK",
    priceCentavos: 1999,
    stock: 10,
    isPreorder: false,
    expectedRelease: null,
    variationChain: [
      { group: "Size", name: "Small" },
      { group: "Color", name: "Black" },
    ],
    status: "ACTIVE",
    hasAvailableStock: true,
    inventoryState: "IN_STOCK",
    stockVersion: 0,
    availability: "Available",
    imageReferenceId: "photo_variant",
    ...overrides,
  };
}

function photoRecord(
  overrides: Partial<ProductPhotoRecord> = {}
): ProductPhotoRecord {
  return {
    id: "photo_variant",
    productId: "prod_1",
    imageId: "https://img.test/variant.png",
    name: "Variant",
    sortOrder: 0,
    isPrimary: false,
    r2Key: "products/prod_1/variant.png",
    fileSize: 123,
    contentType: "image/png",
    width: 1000,
    height: 1000,
    createdAt: now,
    updatedAt: now,
    uploadedAt: now,
    url: "https://img.test/variant.png",
    ...overrides,
  };
}

function builderFixture(input: {
  product?: ProductRecord | null;
  variant?: ProductVariantRecord | null;
  photos?: ProductPhotoRecord[];
} = {}) {
  const state = {
    product: input.product === undefined ? productRecord() : input.product,
    variant: input.variant === undefined ? variantRecord() : input.variant,
    photos:
      input.photos ??
      [
        photoRecord(),
        photoRecord({
          id: "photo_primary",
          imageId: "https://img.test/primary.png",
          name: "Primary",
          isPrimary: true,
          r2Key: "products/prod_1/primary.png",
        }),
      ],
  };

  const builder = new SnapshotBuilder({
    productRepository: {
      async findById(productId) {
        return state.product?.id === productId ? state.product : null;
      },
    },
    variantRepository: {
      async findById(variantId) {
        return state.variant?.id === variantId ? state.variant : null;
      },
    },
    photoRepository: {
      async findById(photoId) {
        return state.photos.find((photo) => photo.id === photoId) ?? null;
      },
      async listByProductId(productId) {
        return state.photos.filter((photo) => photo.productId === productId);
      },
    },
    now: () => new Date(now),
  });

  return { builder, state };
}

describe("SnapshotBuilder", () => {
  it("builds immutable purchase-time snapshot with variant options, centavos, quantity, and variant R2 key", async () => {
    const { builder } = builderFixture();

    const snapshot = await builder.build({
      productId: "prod_1",
      variantId: "var_1",
      quantity: 2,
    });

    expect(snapshot).toEqual({
      productId: "prod_1",
      productName: "Desk Lamp",
      productSlug: "desk-lamp",
      variantId: "var_1",
      variantLabel: "Small / Black",
      variantOptions: [
        { group: "Size", name: "Small" },
        { group: "Color", name: "Black" },
      ],
      priceCentavos: 1999,
      quantity: 2,
      imageReference: "products/prod_1/variant.png",
      snapshotTimestamp: now,
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.variantOptions)).toBe(true);
  });

  it("keeps stored snapshot values unchanged after catalog mutations", async () => {
    const { builder, state } = builderFixture();
    const snapshot = await builder.build({
      productId: "prod_1",
      variantId: "var_1",
      quantity: 1,
    });

    state.product = productRecord({
      id: "prod_1",
      name: "Changed Lamp",
      slug: "changed-lamp",
    });
    state.variant = variantRecord({
      id: "var_1",
      priceCentavos: 2999,
      variationChain: [{ group: "Size", name: "Large" }],
    });
    state.photos = [
      photoRecord({
        id: "photo_variant",
        productId: null,
        r2Key: "products/prod_1/replaced.png",
      }),
    ];

    expect(snapshot.productName).toBe("Desk Lamp");
    expect(snapshot.productSlug).toBe("desk-lamp");
    expect(snapshot.variantLabel).toBe("Small / Black");
    expect(snapshot.priceCentavos).toBe(1999);
    expect(snapshot.imageReference).toBe("products/prod_1/variant.png");
  });

  it("reads archived product and archived variant without hiding purchased details", async () => {
    const { builder } = builderFixture({
      product: productRecord({ status: "ARCHIVED" }),
      variant: variantRecord({ status: "ARCHIVED", hasAvailableStock: false }),
    });

    const snapshot = await builder.build({
      productId: "prod_1",
      variantId: "var_1",
      quantity: 1,
    });

    expect(snapshot.productName).toBe("Desk Lamp");
    expect(snapshot.variantLabel).toBe("Small / Black");
    expect(snapshot.priceCentavos).toBe(1999);
  });

  it("falls back to product primary photo when variant image reference is missing", async () => {
    const { builder } = builderFixture({
      variant: variantRecord({ imageReferenceId: null }),
    });

    const snapshot = await builder.build({
      productId: "prod_1",
      variantId: "var_1",
      quantity: 1,
    });

    expect(snapshot.imageReference).toBe("products/prod_1/primary.png");
  });
});
