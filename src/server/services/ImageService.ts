import { createId } from "@paralleldrive/cuid2";
import {
  PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES,
  PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
  PRODUCT_IMAGE_DETAIL_TARGET_MAX_BYTES,
  PRODUCT_IMAGE_LIST_TARGET_MAX_BYTES,
  zodUpdateImageOrderInput,
} from "@/domain/products/schemas";
import type {
  ImageListResult,
  ProductPhotoRecord,
} from "@/domain/products/types";
import {
  createAuditEvent,
  NoopAuditEventPublisher,
  type AuditEventPublisher,
} from "@/domain/audit/events";
import { evaluateRouteAccess } from "@/domain/auth/rbac";
import type { RequestActorContext } from "@/server/context/request-context";
import type {
  ProductBrandMembershipRecord,
  ProductBrandRecord,
} from "@/server/repositories/ProductRepository";
import type { ImageRepository } from "@/server/repositories/ImageRepository";
import type { PhotoRepository } from "@/server/repositories/PhotoRepository";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

type ImageAuth = {
  mode: "required";
  roles: readonly ["ADMIN", "SUPER_ADMIN"];
};

const imageAuth: ImageAuth = {
  mode: "required",
  roles: ["ADMIN", "SUPER_ADMIN"],
};

type ImageProductScopeRepository = {
  findById(productId: string): Promise<{
    id: string;
    brandId: string | null;
  } | null>;
  findBrandById(brandId: string): Promise<ProductBrandRecord | null>;
  findBrandMembership(
    brandId: string,
    adminId: string
  ): Promise<ProductBrandMembershipRecord | null>;
};

export type ImageActorInput = Pick<
  RequestActorContext,
  | "authenticated"
  | "role"
  | "actorId"
  | "safeActorId"
  | "accountStatus"
  | "eligibility"
>;

export type UploadImageServiceInput = {
  actor: ImageActorInput | undefined;
  requestId: string;
  productId: string;
  file: File;
  name?: string | null;
};

export type ListProductImagesServiceInput = {
  actor: ImageActorInput | undefined;
  requestId: string;
  productId: string;
};

export type UpdateImageOrderServiceInput = {
  actor: ImageActorInput | undefined;
  requestId: string;
  productId: string;
  photoId: string;
  body: Record<string, unknown>;
};

export type SetPrimaryImageServiceInput = {
  actor: ImageActorInput | undefined;
  requestId: string;
  productId: string;
  photoId: string;
};

export type RemoveImageServiceInput = {
  actor: ImageActorInput | undefined;
  requestId: string;
  productId: string;
  photoId: string;
};

export type GetImageServiceInput = {
  actor: ImageActorInput | undefined;
  requestId: string;
  productId: string;
  photoId: string;
};

export type ImageDetailResult = {
  image: ProductPhotoRecord;
};

export type ImageListServiceResult = ImageListResult & {
  performanceTargets: {
    listMaxBytes: number;
    detailMaxBytes: number;
  };
};

export type ImageServiceOptions = {
  productRepository: ImageProductScopeRepository;
  photoRepository: PhotoRepository;
  imageRepository: ImageRepository;
  auditPublisher?: AuditEventPublisher;
  now?: () => Date;
  log?: (entry: Record<string, unknown>) => void;
};

type ParsedImageDimensions = {
  width: number;
  height: number;
};

const jpegSofMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function serviceError(
  code:
    | "AUTH_REQUIRED"
    | "AUTH_FORBIDDEN"
    | "ACCOUNT_SUSPENDED"
    | "EMAIL_NOT_VERIFIED"
    | "ADMIN_APPROVAL_REQUIRED"
    | "VALIDATION_FAILED"
    | "RESOURCE_NOT_FOUND"
    | "CONFLICT_STATE"
    | "PROVIDER_UNAVAILABLE",
  data: Record<string, unknown> = {}
) {
  return new GeneralError(data, code);
}

function providerFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    /D1_|SQLITE_|database|query|constraint|prepare|execute|transaction|storage|r2/i.test(
      error.message
    )
  );
}

function safeErrorType(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

function isActiveMembership(
  membership: ProductBrandMembershipRecord | null
): membership is ProductBrandMembershipRecord {
  if (!membership) {
    return false;
  }

  if (membership.status !== "ACTIVE") {
    return false;
  }

  return membership.role === "OWNER" || membership.role === "MEMBER";
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function parsePngDimensions(bytes: Uint8Array): ParsedImageDimensions | null {
  if (bytes.length < 24) {
    return null;
  }

  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[index] !== signature[index]) {
      return null;
    }
  }

  const width =
    (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height =
    (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function parseJpegDimensions(bytes: Uint8Array): ParsedImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    offset += 2;

    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      continue;
    }

    if (offset + 1 >= bytes.length) {
      return null;
    }

    const segmentLength = readUint16BE(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null;
    }

    if (jpegSofMarkers.has(marker)) {
      if (segmentLength < 7) {
        return null;
      }

      const height = readUint16BE(bytes, offset + 3);
      const width = readUint16BE(bytes, offset + 5);

      if (width <= 0 || height <= 0) {
        return null;
      }

      return { width, height };
    }

    offset += segmentLength;
  }

  return null;
}

function parseWebpDimensions(bytes: Uint8Array): ParsedImageDimensions | null {
  if (bytes.length < 30) {
    return null;
  }

  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff !== "RIFF" || webp !== "WEBP") {
    return null;
  }

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const chunkSize =
      bytes[offset + 4] |
      (bytes[offset + 5] << 8) |
      (bytes[offset + 6] << 16) |
      (bytes[offset + 7] << 24);
    const chunkDataOffset = offset + 8;

    if (chunkSize < 0 || chunkDataOffset + chunkSize > bytes.length) {
      return null;
    }

    if (chunkType === "VP8X" && chunkSize >= 10) {
      const width = readUint24LE(bytes, chunkDataOffset + 4) + 1;
      const height = readUint24LE(bytes, chunkDataOffset + 7) + 1;
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }

    if (chunkType === "VP8 " && chunkSize >= 10) {
      const startCodeOffset = chunkDataOffset + 3;
      if (
        bytes[startCodeOffset] === 0x9d &&
        bytes[startCodeOffset + 1] === 0x01 &&
        bytes[startCodeOffset + 2] === 0x2a
      ) {
        const width =
          (bytes[chunkDataOffset + 6] | (bytes[chunkDataOffset + 7] << 8)) &
          0x3fff;
        const height =
          (bytes[chunkDataOffset + 8] | (bytes[chunkDataOffset + 9] << 8)) &
          0x3fff;
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }
    }

    if (chunkType === "VP8L" && chunkSize >= 5) {
      if (bytes[chunkDataOffset] !== 0x2f) {
        return null;
      }

      const b1 = bytes[chunkDataOffset + 1];
      const b2 = bytes[chunkDataOffset + 2];
      const b3 = bytes[chunkDataOffset + 3];
      const b4 = bytes[chunkDataOffset + 4];
      const width = 1 + (((b2 & 0x3f) << 8) | b1);
      const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));

      if (width > 0 && height > 0) {
        return { width, height };
      }
    }

    offset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  return null;
}

function parseImageDimensions(
  bytes: Uint8Array,
  contentType: string
): ParsedImageDimensions | null {
  if (contentType === "image/png") {
    return parsePngDimensions(bytes);
  }

  if (contentType === "image/jpeg") {
    return parseJpegDimensions(bytes);
  }

  if (contentType === "image/webp") {
    return parseWebpDimensions(bytes);
  }

  return null;
}

function contentTypeToExtension(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export class ImageService {
  private readonly productRepository: ImageProductScopeRepository;
  private readonly photoRepository: PhotoRepository;
  private readonly imageRepository: ImageRepository;
  private readonly auditPublisher: AuditEventPublisher;
  private readonly now: () => Date;
  private readonly log: (entry: Record<string, unknown>) => void;

  constructor(options: ImageServiceOptions) {
    this.productRepository = options.productRepository;
    this.photoRepository = options.photoRepository;
    this.imageRepository = options.imageRepository;
    this.auditPublisher =
      options.auditPublisher ?? new NoopAuditEventPublisher();
    this.now = options.now ?? (() => new Date());
    this.log = options.log ?? ((entry) => console.error(entry));
  }

  private requireAdminActor(actor: ImageActorInput | undefined): AppResult<{
    actorId: string;
    safeActorId: string;
    role: "ADMIN" | "SUPER_ADMIN";
  }> {
    const decision = evaluateRouteAccess({
      auth: imageAuth,
      actor,
    });

    if (!decision.allowed) {
      return Result.error(serviceError(decision.code));
    }

    if (!actor?.actorId) {
      return Result.error(serviceError("AUTH_REQUIRED"));
    }

    if (
      decision.actorRole !== "ADMIN" &&
      decision.actorRole !== "SUPER_ADMIN"
    ) {
      return Result.error(serviceError("AUTH_FORBIDDEN"));
    }

    return Result.okay({
      actorId: actor.actorId,
      safeActorId: actor.safeActorId ?? actor.actorId,
      role: decision.actorRole,
    });
  }

  private async requireProductMutationPermission(input: {
    productId: string;
    actorId: string;
    role: "ADMIN" | "SUPER_ADMIN";
  }): Promise<AppResult<{ productId: string; brandId: string | null }>> {
    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      return Result.error(
        serviceError("RESOURCE_NOT_FOUND", { reason: "PRODUCT_NOT_FOUND" })
      );
    }

    if (!product.brandId) {
      return Result.okay({
        productId: product.id,
        brandId: null,
      });
    }

    const brand = await this.productRepository.findBrandById(product.brandId);
    if (!brand) {
      return Result.error(
        serviceError("CONFLICT_STATE", { reason: "BRAND_NOT_FOUND" })
      );
    }

    if (brand.status === "ARCHIVED") {
      return Result.error(
        serviceError("CONFLICT_STATE", { reason: "BRAND_ARCHIVED" })
      );
    }

    if (input.role === "SUPER_ADMIN") {
      return Result.okay({
        productId: product.id,
        brandId: brand.id,
      });
    }

    const membership = await this.productRepository.findBrandMembership(
      brand.id,
      input.actorId
    );
    if (!isActiveMembership(membership)) {
      return Result.error(
        serviceError("AUTH_FORBIDDEN", { reason: "BRAND_MEMBERSHIP_REQUIRED" })
      );
    }

    return Result.okay({
      productId: product.id,
      brandId: brand.id,
    });
  }

  private async validateFile(
    file: File
  ): Promise<
    AppResult<{ contentType: string; dimensions: ParsedImageDimensions }>
  > {
    const contentType = file.type;

    if (
      !PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES.includes(
        contentType as (typeof PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES)[number]
      )
    ) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          reason: "UNSUPPORTED_IMAGE_TYPE",
          allowedTypes: [...PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES],
        })
      );
    }

    if (file.size <= 0) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          reason: "EMPTY_IMAGE_FILE",
        })
      );
    }

    if (file.size > PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          reason: "IMAGE_TOO_LARGE",
          maxBytes: PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
        })
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const dimensions = parseImageDimensions(bytes, contentType);
    if (!dimensions) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          reason: "IMAGE_CORRUPT",
        })
      );
    }

    return Result.okay({
      contentType,
      dimensions,
    });
  }

  private buildObjectKey(input: {
    productId: string;
    photoId: string;
    contentType: string;
  }): string {
    const extension = contentTypeToExtension(input.contentType);
    return `products/${input.productId}/${input.photoId}.${extension}`;
  }

  private async requirePhotoScopedToProduct(input: {
    productId: string;
    photoId: string;
  }): Promise<AppResult<ProductPhotoRecord>> {
    const photo = await this.photoRepository.findById(input.photoId);
    if (!photo || photo.productId !== input.productId) {
      return Result.error(
        serviceError("RESOURCE_NOT_FOUND", { reason: "PHOTO_NOT_FOUND" })
      );
    }

    return Result.okay(photo);
  }

  private async publishAudit(input: {
    requestId: string;
    actorId: string;
    safeActorId: string;
    actorRole: "ADMIN" | "SUPER_ADMIN";
    productId: string;
    photoId: string;
    operation:
      | "upload_image"
      | "reorder_image"
      | "set_primary_image"
      | "remove_image";
    photo: ProductPhotoRecord;
  }): Promise<void> {
    const action =
      input.operation === "upload_image"
        ? "catalog.image_uploaded"
        : "catalog.product_updated";

    const event = createAuditEvent({
      requestId: input.requestId,
      action,
      actor: {
        type: "user",
        id: input.actorId,
        role: input.actorRole,
        safeIdentifier: input.safeActorId,
      },
      target: {
        entity: "catalog",
        entityId: input.productId,
      },
      safeDetails: {
        operation: input.operation,
        productId: input.productId,
        photoId: input.photoId,
        imageId: input.photo.imageId,
        isPrimary: input.photo.isPrimary,
        sortOrder: input.photo.sortOrder,
        contentType: input.photo.contentType,
        fileSize: input.photo.fileSize,
      },
      occurredAt: this.now().toISOString(),
    });

    await this.auditPublisher.publish(event);
  }

  private logStorageFailure(input: {
    requestId: string;
    operation: string;
    error: unknown;
  }) {
    this.log({
      requestId: input.requestId,
      operation: input.operation,
      errorCode: "PROVIDER_UNAVAILABLE",
      reason: "IMAGE_STORAGE_FAILURE",
      errorType: safeErrorType(input.error),
    });
  }

  private async rollbackUploadedObject(input: {
    requestId: string;
    operation: string;
    key: string;
  }): Promise<void> {
    try {
      await this.imageRepository.delete(input.key);
    } catch (error) {
      this.log({
        requestId: input.requestId,
        operation: input.operation,
        errorCode: "PROVIDER_UNAVAILABLE",
        reason: "IMAGE_ROLLBACK_FAILURE",
        errorType: safeErrorType(error),
      });
    }
  }

  async uploadImage(
    input: UploadImageServiceInput
  ): Promise<AppResult<ImageDetailResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const permission = await this.requireProductMutationPermission({
        productId: input.productId,
        actorId: actor.content.actorId,
        role: actor.content.role,
      });
      if (permission.error) {
        return Result.error(permission.error);
      }

      const validation = await this.validateFile(input.file);
      if (validation.error) {
        return Result.error(validation.error);
      }

      const photoId = createId();
      const key = this.buildObjectKey({
        productId: input.productId,
        photoId,
        contentType: validation.content.contentType,
      });

      const sortOrder = await this.photoRepository.nextSortOrder(
        input.productId
      );
      const existing = await this.photoRepository.listByProductId(
        input.productId
      );
      const timestamp = this.now().toISOString();
      const uploaded = await this.imageRepository.upload(input.file, key);

      let image: ProductPhotoRecord;
      try {
        image = await this.photoRepository.create({
          id: photoId,
          productId: input.productId,
          imageId: uploaded.url,
          name:
            input.name && input.name.trim().length > 0
              ? input.name.trim()
              : input.file.name.trim().slice(0, 255) || null,
          sortOrder,
          isPrimary: existing.length === 0,
          r2Key: uploaded.key,
          fileSize: uploaded.size,
          contentType: uploaded.contentType,
          width: validation.content.dimensions.width,
          height: validation.content.dimensions.height,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      } catch (error) {
        await this.rollbackUploadedObject({
          requestId: input.requestId,
          operation: "upload_image",
          key: uploaded.key,
        });
        throw error;
      }

      await this.publishAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        productId: input.productId,
        photoId: image.id,
        operation: "upload_image",
        photo: image,
      });

      return Result.okay({ image });
    } catch (error) {
      if (providerFailure(error)) {
        this.logStorageFailure({
          requestId: input.requestId,
          operation: "upload_image",
          error,
        });
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      this.logStorageFailure({
        requestId: input.requestId,
        operation: "upload_image",
        error,
      });
      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async listProductImages(
    input: ListProductImagesServiceInput
  ): Promise<AppResult<ImageListServiceResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const permission = await this.requireProductMutationPermission({
        productId: input.productId,
        actorId: actor.content.actorId,
        role: actor.content.role,
      });
      if (permission.error) {
        return Result.error(permission.error);
      }

      const items = await this.photoRepository.listByProductId(input.productId);
      return Result.okay({
        items,
        performanceTargets: {
          listMaxBytes: PRODUCT_IMAGE_LIST_TARGET_MAX_BYTES,
          detailMaxBytes: PRODUCT_IMAGE_DETAIL_TARGET_MAX_BYTES,
        },
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async updateImageOrder(
    input: UpdateImageOrderServiceInput
  ): Promise<AppResult<ImageDetailResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const parsed = zodUpdateImageOrderInput.safeParse(input.body);
    if (!parsed.success) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          reason: "INVALID_SORT_ORDER",
        })
      );
    }

    try {
      const permission = await this.requireProductMutationPermission({
        productId: input.productId,
        actorId: actor.content.actorId,
        role: actor.content.role,
      });
      if (permission.error) {
        return Result.error(permission.error);
      }

      const photo = await this.requirePhotoScopedToProduct({
        productId: input.productId,
        photoId: input.photoId,
      });
      if (photo.error) {
        return Result.error(photo.error);
      }

      const currentItems = await this.photoRepository.listByProductId(
        input.productId
      );
      const maxSortOrder = Math.max(currentItems.length - 1, 0);
      const targetSortOrder = Math.min(
        Math.max(parsed.data.sortOrder, 0),
        maxSortOrder
      );

      if (photo.content.sortOrder !== targetSortOrder) {
        await this.photoRepository.shiftSortOrderRange({
          productId: input.productId,
          fromSortOrder: photo.content.sortOrder,
          toSortOrder: targetSortOrder,
          updatedAt: this.now().toISOString(),
        });
      }

      const updated = await this.photoRepository.updateOrder({
        productId: input.productId,
        photoId: input.photoId,
        sortOrder: targetSortOrder,
        updatedAt: this.now().toISOString(),
      });

      if (!updated) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "PHOTO_NOT_FOUND" })
        );
      }

      await this.publishAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        productId: input.productId,
        photoId: updated.id,
        operation: "reorder_image",
        photo: updated,
      });

      return Result.okay({ image: updated });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async setPrimaryImage(
    input: SetPrimaryImageServiceInput
  ): Promise<AppResult<ImageDetailResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const permission = await this.requireProductMutationPermission({
        productId: input.productId,
        actorId: actor.content.actorId,
        role: actor.content.role,
      });
      if (permission.error) {
        return Result.error(permission.error);
      }

      const photo = await this.requirePhotoScopedToProduct({
        productId: input.productId,
        photoId: input.photoId,
      });
      if (photo.error) {
        return Result.error(photo.error);
      }

      const updated = await this.photoRepository.setPrimary(
        input.productId,
        input.photoId,
        this.now().toISOString()
      );

      if (!updated) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "PHOTO_NOT_FOUND" })
        );
      }

      await this.publishAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        productId: input.productId,
        photoId: updated.id,
        operation: "set_primary_image",
        photo: updated,
      });

      return Result.okay({ image: updated });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async removeImage(
    input: RemoveImageServiceInput
  ): Promise<AppResult<ImageDetailResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const permission = await this.requireProductMutationPermission({
        productId: input.productId,
        actorId: actor.content.actorId,
        role: actor.content.role,
      });
      if (permission.error) {
        return Result.error(permission.error);
      }

      const photo = await this.requirePhotoScopedToProduct({
        productId: input.productId,
        photoId: input.photoId,
      });
      if (photo.error) {
        return Result.error(photo.error);
      }

      const removed = await this.photoRepository.removeFromProduct({
        productId: input.productId,
        photoId: input.photoId,
        updatedAt: this.now().toISOString(),
      });

      if (!removed) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "PHOTO_NOT_FOUND" })
        );
      }

      if (photo.content.isPrimary) {
        const remainingImages = await this.photoRepository.listByProductId(
          input.productId
        );
        const nextPrimary = remainingImages[0];
        if (nextPrimary) {
          await this.photoRepository.setPrimary(
            input.productId,
            nextPrimary.id,
            this.now().toISOString()
          );
        }
      }

      await this.publishAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        productId: input.productId,
        photoId: removed.id,
        operation: "remove_image",
        photo: removed,
      });

      return Result.okay({ image: removed });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async getImage(
    input: GetImageServiceInput
  ): Promise<AppResult<ImageDetailResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const permission = await this.requireProductMutationPermission({
        productId: input.productId,
        actorId: actor.content.actorId,
        role: actor.content.role,
      });
      if (permission.error) {
        return Result.error(permission.error);
      }

      const photo = await this.requirePhotoScopedToProduct({
        productId: input.productId,
        photoId: input.photoId,
      });
      if (photo.error) {
        return Result.error(photo.error);
      }

      return Result.okay({
        image: photo.content,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }
}
