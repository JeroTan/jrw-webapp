import { describe, expect, it } from "vitest";
import type {
  ProductBrandMembershipRecord,
  ProductBrandRecord,
} from "@/server/repositories/ProductRepository";
import type { ImageRepository } from "@/server/repositories/ImageRepository";
import type { PhotoRepository } from "@/server/repositories/PhotoRepository";
import type { ProductPhotoRecord } from "@/domain/products/types";
import { ImageService, type ImageActorInput } from "./ImageService";

const now = "2026-05-21T09:00:00.000Z";

function adminActor(overrides: Partial<ImageActorInput> = {}): ImageActorInput {
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

function createPngFile(name = "lamp.png"): File {
  const bytes = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
    1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 1, 73, 68,
    65, 84, 120, 218, 99, 0, 0, 0, 2, 0, 1, 229, 39, 212, 162, 0, 0, 0, 0,
    73, 69, 78, 68, 174, 66, 96, 130,
  ]);

  return new File([bytes], name, {
    type: "image/png",
  });
}

function createPhotoRecord(
  overrides: Partial<ProductPhotoRecord> = {}
): ProductPhotoRecord {
  return {
    id: "photo_1",
    productId: "prod_1",
    imageId: "https://pub.r2.dev/products/prod_1/photo_1.png",
    name: "Lamp",
    sortOrder: 0,
    isPrimary: true,
    r2Key: "products/prod_1/photo_1.png",
    fileSize: 68,
    contentType: "image/png",
    width: 1,
    height: 1,
    createdAt: now,
    updatedAt: now,
    uploadedAt: now,
    url: "https://pub.r2.dev/products/prod_1/photo_1.png",
    ...overrides,
  };
}

class ProductScopeRepositoryStub {
  product: { id: string; brandId: string | null } | null = {
    id: "prod_1",
    brandId: null,
  };

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

  async findById(productId: string) {
    if (!this.product || this.product.id !== productId) {
      return null;
    }

    return this.product;
  }

  async findBrandById(brandId: string): Promise<ProductBrandRecord | null> {
    if (!this.brand || this.brand.id !== brandId) {
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

class PhotoRepositoryStub implements PhotoRepository {
  items: ProductPhotoRecord[] = [];

  async create(input: {
    id: string;
    productId: string;
    imageId: string;
    name: string | null;
    sortOrder: number;
    isPrimary: boolean;
    r2Key: string;
    fileSize: number | null;
    contentType: string | null;
    width: number | null;
    height: number | null;
    createdAt: string;
    updatedAt: string;
  }): Promise<ProductPhotoRecord> {
    const row = createPhotoRecord({
      id: input.id,
      productId: input.productId,
      imageId: input.imageId,
      name: input.name,
      sortOrder: input.sortOrder,
      isPrimary: input.isPrimary,
      r2Key: input.r2Key,
      fileSize: input.fileSize,
      contentType: input.contentType,
      width: input.width,
      height: input.height,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      uploadedAt: input.createdAt,
      url: input.imageId,
    });

    this.items.push(row);
    return row;
  }

  async findById(photoId: string): Promise<ProductPhotoRecord | null> {
    return this.items.find((row) => row.id === photoId) ?? null;
  }

  async listByProductId(productId: string): Promise<ProductPhotoRecord[]> {
    return this.items
      .filter((row) => row.productId === productId)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async updateOrder(input: {
    productId: string;
    photoId: string;
    sortOrder: number;
    updatedAt: string;
  }): Promise<ProductPhotoRecord | null> {
    const index = this.items.findIndex(
      (row) => row.id === input.photoId && row.productId === input.productId
    );
    if (index < 0) {
      return null;
    }

    this.items[index] = {
      ...this.items[index],
      sortOrder: input.sortOrder,
      updatedAt: input.updatedAt,
    };

    return this.items[index];
  }

  async shiftSortOrderRange(input: {
    productId: string;
    fromSortOrder: number;
    toSortOrder: number;
    updatedAt: string;
  }): Promise<void> {
    if (input.fromSortOrder === input.toSortOrder) {
      return;
    }

    this.items = this.items.map((row) => {
      if (row.productId !== input.productId || row.sortOrder === input.fromSortOrder) {
        return row;
      }

      if (
        input.toSortOrder < input.fromSortOrder &&
        row.sortOrder >= input.toSortOrder &&
        row.sortOrder < input.fromSortOrder
      ) {
        return {
          ...row,
          sortOrder: row.sortOrder + 1,
          updatedAt: input.updatedAt,
        };
      }

      if (
        input.toSortOrder > input.fromSortOrder &&
        row.sortOrder <= input.toSortOrder &&
        row.sortOrder > input.fromSortOrder
      ) {
        return {
          ...row,
          sortOrder: row.sortOrder - 1,
          updatedAt: input.updatedAt,
        };
      }

      return row;
    });
  }

  async setPrimary(
    productId: string,
    photoId: string,
    updatedAt: string
  ): Promise<ProductPhotoRecord | null> {
    let updated: ProductPhotoRecord | null = null;

    this.items = this.items.map((row) => {
      if (row.productId !== productId) {
        return row;
      }

      const next = {
        ...row,
        isPrimary: row.id === photoId,
        updatedAt,
      };

      if (next.id === photoId) {
        updated = next;
      }

      return next;
    });

    return updated;
  }

  async removeFromProduct(input: {
    productId: string;
    photoId: string;
    updatedAt: string;
  }): Promise<ProductPhotoRecord | null> {
    const index = this.items.findIndex(
      (row) => row.id === input.photoId && row.productId === input.productId
    );
    if (index < 0) {
      return null;
    }

    this.items[index] = {
      ...this.items[index],
      productId: null,
      isPrimary: false,
      updatedAt: input.updatedAt,
    };

    return this.items[index];
  }

  async findByIds(photoIds: string[]): Promise<ProductPhotoRecord[]> {
    const idSet = new Set(photoIds);
    return this.items.filter((row) => idSet.has(row.id));
  }

  async nextSortOrder(productId: string): Promise<number> {
    const scoped = this.items.filter((row) => row.productId === productId);
    if (scoped.length === 0) {
      return 0;
    }

    return Math.max(...scoped.map((row) => row.sortOrder)) + 1;
  }
}

class ImageRepositoryStub implements ImageRepository {
  shouldFailUpload = false;

  uploadCalls: Array<{ file: File; key: string }> = [];

  async upload(file: File, key: string) {
    if (this.shouldFailUpload) {
      throw new Error("storage unavailable");
    }

    this.uploadCalls.push({ file, key });

    return {
      key,
      size: file.size,
      contentType: file.type,
      uploadedAt: now,
      etag: "etag_1",
      url: this.getPublicUrl(key),
    };
  }

  async get(_key: string): Promise<R2ObjectBody | null> {
    return null;
  }

  async delete(_key: string): Promise<void> {
    return undefined;
  }

  getPublicUrl(key: string): string {
    return `https://pub.r2.dev/${key}`;
  }
}

describe("ImageService", () => {
  it("uploads image and stores metadata", async () => {
    const service = new ImageService({
      productRepository: new ProductScopeRepositoryStub(),
      photoRepository: new PhotoRepositoryStub(),
      imageRepository: new ImageRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.uploadImage({
      actor: adminActor(),
      requestId: "req_image_upload_success",
      productId: "prod_1",
      file: createPngFile(),
      name: "Front view",
    });

    expect(result.error).toBeNull();
    if (result.error) {
      throw result.error;
    }

    expect(result.content.image.name).toBe("Front view");
    expect(result.content.image.contentType).toBe("image/png");
    expect(result.content.image.width).toBe(1);
    expect(result.content.image.height).toBe(1);
    expect(result.content.image.isPrimary).toBe(true);
  });

  it("rejects invalid file type", async () => {
    const service = new ImageService({
      productRepository: new ProductScopeRepositoryStub(),
      photoRepository: new PhotoRepositoryStub(),
      imageRepository: new ImageRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.uploadImage({
      actor: adminActor(),
      requestId: "req_image_invalid_type",
      productId: "prod_1",
      file: new File(["nope"], "invalid.gif", { type: "image/gif" }),
      name: "Invalid",
    });

    expect(result.error?.code).toBe("VALIDATION_FAILED");
    expect(result.error?.data).toMatchObject({
      reason: "UNSUPPORTED_IMAGE_TYPE",
    });
  });

  it("rejects file larger than 5MB", async () => {
    const service = new ImageService({
      productRepository: new ProductScopeRepositoryStub(),
      photoRepository: new PhotoRepositoryStub(),
      imageRepository: new ImageRepositoryStub(),
      now: () => new Date(now),
    });

    const largeFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", {
      type: "image/png",
    });

    const result = await service.uploadImage({
      actor: adminActor(),
      requestId: "req_image_large",
      productId: "prod_1",
      file: largeFile,
      name: "Too large",
    });

    expect(result.error?.code).toBe("VALIDATION_FAILED");
    expect(result.error?.data).toMatchObject({
      reason: "IMAGE_TOO_LARGE",
    });
  });

  it("reorders image sort order", async () => {
    const photoRepository = new PhotoRepositoryStub();
    photoRepository.items = [
      createPhotoRecord({ id: "photo_1", sortOrder: 0, isPrimary: true }),
      createPhotoRecord({
        id: "photo_2",
        imageId: "https://pub.r2.dev/products/prod_1/photo_2.png",
        sortOrder: 1,
        isPrimary: false,
      }),
    ];

    const service = new ImageService({
      productRepository: new ProductScopeRepositoryStub(),
      photoRepository,
      imageRepository: new ImageRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.updateImageOrder({
      actor: adminActor(),
      requestId: "req_image_reorder",
      productId: "prod_1",
      photoId: "photo_2",
      body: { sortOrder: 0 },
    });

    expect(result.error).toBeNull();
    if (result.error) {
      throw result.error;
    }

    const listed = await photoRepository.listByProductId("prod_1");
    expect(listed.map((row) => `${row.id}:${row.sortOrder}`)).toEqual([
      "photo_2:0",
      "photo_1:1",
    ]);
  });

  it("sets primary image", async () => {
    const photoRepository = new PhotoRepositoryStub();
    photoRepository.items = [
      createPhotoRecord({ id: "photo_1", isPrimary: true }),
      createPhotoRecord({
        id: "photo_2",
        imageId: "https://pub.r2.dev/products/prod_1/photo_2.png",
        isPrimary: false,
        sortOrder: 1,
      }),
    ];

    const service = new ImageService({
      productRepository: new ProductScopeRepositoryStub(),
      photoRepository,
      imageRepository: new ImageRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.setPrimaryImage({
      actor: adminActor(),
      requestId: "req_image_primary",
      productId: "prod_1",
      photoId: "photo_2",
    });

    expect(result.error).toBeNull();
    if (result.error) {
      throw result.error;
    }

    const listed = await photoRepository.listByProductId("prod_1");
    expect(listed.find((row) => row.id === "photo_1")?.isPrimary).toBe(false);
    expect(listed.find((row) => row.id === "photo_2")?.isPrimary).toBe(true);
  });

  it("removes image from product without deleting record", async () => {
    const photoRepository = new PhotoRepositoryStub();
    photoRepository.items = [createPhotoRecord({ id: "photo_1", isPrimary: true })];

    const service = new ImageService({
      productRepository: new ProductScopeRepositoryStub(),
      photoRepository,
      imageRepository: new ImageRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.removeImage({
      actor: adminActor(),
      requestId: "req_image_remove",
      productId: "prod_1",
      photoId: "photo_1",
    });

    expect(result.error).toBeNull();
    if (result.error) {
      throw result.error;
    }

    expect(result.content.image.productId).toBeNull();
    expect(result.content.image.isPrimary).toBe(false);
  });

  it("denies upload when admin lacks brand membership", async () => {
    const scope = new ProductScopeRepositoryStub();
    scope.product = {
      id: "prod_1",
      brandId: "brand_1",
    };
    scope.membership = null;

    const service = new ImageService({
      productRepository: scope,
      photoRepository: new PhotoRepositoryStub(),
      imageRepository: new ImageRepositoryStub(),
      now: () => new Date(now),
    });

    const result = await service.uploadImage({
      actor: adminActor(),
      requestId: "req_image_forbidden",
      productId: "prod_1",
      file: createPngFile(),
      name: "Blocked",
    });

    expect(result.error?.code).toBe("AUTH_FORBIDDEN");
    expect(result.error?.data).toMatchObject({
      reason: "BRAND_MEMBERSHIP_REQUIRED",
    });
  });

  it("maps storage failures to provider unavailable", async () => {
    const imageRepository = new ImageRepositoryStub();
    imageRepository.shouldFailUpload = true;

    const service = new ImageService({
      productRepository: new ProductScopeRepositoryStub(),
      photoRepository: new PhotoRepositoryStub(),
      imageRepository,
      now: () => new Date(now),
    });

    const result = await service.uploadImage({
      actor: adminActor(),
      requestId: "req_image_storage_failure",
      productId: "prod_1",
      file: createPngFile(),
      name: "Storage fail",
    });

    expect(result.error?.code).toBe("PROVIDER_UNAVAILABLE");
  });
});