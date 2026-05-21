import { z } from "zod";

export const SNAPSHOT_ID_MAX_LENGTH = 128;
export const SNAPSHOT_TEXT_MAX_LENGTH = 255;
export const SNAPSHOT_QUANTITY_MAX = 10_000_000;
export const SNAPSHOT_VARIANT_OPTION_MAX_ITEMS = 32;
export const SNAPSHOT_VARIANT_OPTION_TEXT_MAX_LENGTH = 120;

const zodSnapshotId = z.string().trim().min(1).max(SNAPSHOT_ID_MAX_LENGTH);

export const zodSnapshotVariantOption = z.object({
  group: z
    .string()
    .trim()
    .min(1)
    .max(SNAPSHOT_VARIANT_OPTION_TEXT_MAX_LENGTH),
  name: z
    .string()
    .trim()
    .min(1)
    .max(SNAPSHOT_VARIANT_OPTION_TEXT_MAX_LENGTH),
});

export const zodSnapshotBuildInput = z.object({
  productId: zodSnapshotId,
  variantId: zodSnapshotId,
  quantity: z.number().int().min(1).max(SNAPSHOT_QUANTITY_MAX),
});

export const zodBuiltOrderSnapshot = z.object({
  productId: zodSnapshotId,
  productName: z.string().trim().min(1).max(SNAPSHOT_TEXT_MAX_LENGTH),
  productSlug: z.string().trim().min(1).max(SNAPSHOT_TEXT_MAX_LENGTH),
  variantId: zodSnapshotId,
  variantLabel: z.string().trim().min(1).max(SNAPSHOT_TEXT_MAX_LENGTH),
  variantOptions: z
    .array(zodSnapshotVariantOption)
    .max(SNAPSHOT_VARIANT_OPTION_MAX_ITEMS),
  priceCentavos: z.number().int().min(0),
  quantity: z.number().int().min(1).max(SNAPSHOT_QUANTITY_MAX),
  imageReference: z.union([z.string().trim().min(1), z.null()]),
  snapshotTimestamp: z.string().trim().min(1),
});

export const zodCreateOrderSnapshotInput = zodBuiltOrderSnapshot.extend({
  id: zodSnapshotId.optional(),
  orderId: zodSnapshotId,
});

export const zodOrderSnapshot = zodBuiltOrderSnapshot
  .omit({
    productId: true,
    productSlug: true,
    variantId: true,
  })
  .extend({
    id: zodSnapshotId,
    orderId: zodSnapshotId,
    productId: z.union([zodSnapshotId, z.null()]),
    productSlug: z.union([z.string().trim().min(1), z.null()]),
    variantId: z.union([zodSnapshotId, z.null()]),
  });
