import type {
  ProductPhotoRecord,
  ProductRecord,
  ProductVariantRecord,
} from "@/domain/products/types";
import { zodSnapshotBuildInput } from "./schemas";
import type {
  BuiltOrderSnapshot,
  SnapshotBuildInput,
  SnapshotVariantOption,
} from "./types";

export type SnapshotBuildErrorReason =
  | "INVALID_SNAPSHOT_INPUT"
  | "PRODUCT_NOT_FOUND"
  | "VARIANT_NOT_FOUND"
  | "VARIANT_PRODUCT_MISMATCH";

export class SnapshotBuildError extends Error {
  constructor(public readonly reason: SnapshotBuildErrorReason) {
    super(reason);
    this.name = "SnapshotBuildError";
  }
}

export type SnapshotProductRepository = {
  findById(productId: string): Promise<ProductRecord | null>;
};

export type SnapshotVariantRepository = {
  findById(variantId: string): Promise<ProductVariantRecord | null>;
};

export type SnapshotPhotoRepository = {
  findById(photoId: string): Promise<ProductPhotoRecord | null>;
  listByProductId(productId: string): Promise<ProductPhotoRecord[]>;
};

export type SnapshotBuilderOptions = {
  productRepository: SnapshotProductRepository;
  variantRepository: SnapshotVariantRepository;
  photoRepository: SnapshotPhotoRepository;
  now?: () => Date;
};

function cloneOptions(
  options: readonly SnapshotVariantOption[]
): SnapshotVariantOption[] {
  return options.map((option) => ({
    group: option.group,
    name: option.name,
  }));
}

function freezeSnapshot(snapshot: BuiltOrderSnapshot): BuiltOrderSnapshot {
  const variantOptions = Object.freeze(
    snapshot.variantOptions.map((option) => Object.freeze({ ...option }))
  );

  return Object.freeze({
    ...snapshot,
    variantOptions,
  });
}

function variantLabel(input: {
  variantName: string;
  options: SnapshotVariantOption[];
}): string {
  const optionLabel = input.options
    .map((option) => option.name.trim())
    .filter((name) => name.length > 0)
    .join(" / ");

  return optionLabel || input.variantName;
}

export class SnapshotBuilder {
  private readonly productRepository: SnapshotProductRepository;
  private readonly variantRepository: SnapshotVariantRepository;
  private readonly photoRepository: SnapshotPhotoRepository;
  private readonly now: () => Date;

  constructor(options: SnapshotBuilderOptions) {
    this.productRepository = options.productRepository;
    this.variantRepository = options.variantRepository;
    this.photoRepository = options.photoRepository;
    this.now = options.now ?? (() => new Date());
  }

  private async resolveImageReference(input: {
    productId: string;
    variant: ProductVariantRecord;
  }): Promise<string | null> {
    const variantPhotoId = input.variant.imageReferenceId ?? null;
    if (variantPhotoId) {
      const variantPhoto = await this.photoRepository.findById(variantPhotoId);
      if (variantPhoto?.r2Key) {
        return variantPhoto.r2Key;
      }
    }

    const productPhotos = await this.photoRepository.listByProductId(
      input.productId
    );
    const primaryPhoto =
      productPhotos.find((photo) => photo.isPrimary) ?? productPhotos[0] ?? null;

    return primaryPhoto?.r2Key ?? null;
  }

  /**
   * Future order flow: build at purchase boundary, then persist with orderId via SnapshotRepository.createSnapshot.
   */
  async build(input: SnapshotBuildInput): Promise<BuiltOrderSnapshot> {
    const parsed = zodSnapshotBuildInput.safeParse(input);
    if (!parsed.success) {
      throw new SnapshotBuildError("INVALID_SNAPSHOT_INPUT");
    }

    const product = await this.productRepository.findById(parsed.data.productId);
    if (!product) {
      throw new SnapshotBuildError("PRODUCT_NOT_FOUND");
    }

    const variant = await this.variantRepository.findById(parsed.data.variantId);
    if (!variant) {
      throw new SnapshotBuildError("VARIANT_NOT_FOUND");
    }

    if (variant.productId !== product.id) {
      throw new SnapshotBuildError("VARIANT_PRODUCT_MISMATCH");
    }

    const variantOptions = cloneOptions(variant.variationChain);
    const imageReference = await this.resolveImageReference({
      productId: product.id,
      variant,
    });

    return freezeSnapshot({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      variantId: variant.id,
      variantLabel: variantLabel({
        variantName: variant.name,
        options: variantOptions,
      }),
      variantOptions,
      priceCentavos: Math.round(variant.priceCentavos),
      quantity: parsed.data.quantity,
      imageReference,
      snapshotTimestamp: this.now().toISOString(),
    });
  }
}
