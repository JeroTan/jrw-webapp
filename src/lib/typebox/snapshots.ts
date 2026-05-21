import { t } from "elysia";
import {
  SNAPSHOT_ID_MAX_LENGTH,
  SNAPSHOT_QUANTITY_MAX,
  SNAPSHOT_TEXT_MAX_LENGTH,
  SNAPSHOT_VARIANT_LABEL_MAX_LENGTH,
  SNAPSHOT_VARIANT_OPTION_MAX_ITEMS,
  SNAPSHOT_VARIANT_OPTION_TEXT_MAX_LENGTH,
} from "@/domain/snapshots/schemas";

export const tboxSnapshotVariantOption = t.Object({
  group: t.String({
    minLength: 1,
    maxLength: SNAPSHOT_VARIANT_OPTION_TEXT_MAX_LENGTH,
  }),
  name: t.String({
    minLength: 1,
    maxLength: SNAPSHOT_VARIANT_OPTION_TEXT_MAX_LENGTH,
  }),
});

export const tboxBuiltOrderSnapshot = t.Object({
  productId: t.String({ minLength: 1, maxLength: SNAPSHOT_ID_MAX_LENGTH }),
  productName: t.String({ minLength: 1, maxLength: SNAPSHOT_TEXT_MAX_LENGTH }),
  productSlug: t.String({ minLength: 1, maxLength: SNAPSHOT_TEXT_MAX_LENGTH }),
  variantId: t.String({ minLength: 1, maxLength: SNAPSHOT_ID_MAX_LENGTH }),
  variantLabel: t.String({
    minLength: 1,
    maxLength: SNAPSHOT_VARIANT_LABEL_MAX_LENGTH,
  }),
  variantOptions: t.Array(tboxSnapshotVariantOption, {
    maxItems: SNAPSHOT_VARIANT_OPTION_MAX_ITEMS,
  }),
  priceCentavos: t.Integer({ minimum: 0 }),
  quantity: t.Integer({ minimum: 1, maximum: SNAPSHOT_QUANTITY_MAX }),
  imageReference: t.Nullable(t.String({ minLength: 1 })),
  snapshotTimestamp: t.String(),
});

export const tboxOrderSnapshot = t.Object({
  id: t.String({ minLength: 1, maxLength: SNAPSHOT_ID_MAX_LENGTH }),
  orderId: t.String({ minLength: 1, maxLength: SNAPSHOT_ID_MAX_LENGTH }),
  productId: t.Nullable(
    t.String({ minLength: 1, maxLength: SNAPSHOT_ID_MAX_LENGTH })
  ),
  productName: t.String({ minLength: 1, maxLength: SNAPSHOT_TEXT_MAX_LENGTH }),
  productSlug: t.Nullable(t.String({ minLength: 1 })),
  variantId: t.Nullable(
    t.String({ minLength: 1, maxLength: SNAPSHOT_ID_MAX_LENGTH })
  ),
  variantLabel: t.String({
    minLength: 1,
    maxLength: SNAPSHOT_VARIANT_LABEL_MAX_LENGTH,
  }),
  variantOptions: t.Array(tboxSnapshotVariantOption, {
    maxItems: SNAPSHOT_VARIANT_OPTION_MAX_ITEMS,
  }),
  priceCentavos: t.Integer({ minimum: 0 }),
  quantity: t.Integer({ minimum: 1, maximum: SNAPSHOT_QUANTITY_MAX }),
  imageReference: t.Nullable(t.String({ minLength: 1 })),
  snapshotTimestamp: t.String(),
});

export const tboxSnapshotBuildBody = t.Object(
  {
    productId: t.String({ minLength: 1, maxLength: SNAPSHOT_ID_MAX_LENGTH }),
    variantId: t.String({ minLength: 1, maxLength: SNAPSHOT_ID_MAX_LENGTH }),
    quantity: t.Integer({ minimum: 1, maximum: SNAPSHOT_QUANTITY_MAX }),
  },
  { additionalProperties: false }
);

export const tboxSnapshotIdParams = t.Object(
  {
    snapshotId: t.String({ minLength: 1, maxLength: SNAPSHOT_ID_MAX_LENGTH }),
  },
  { additionalProperties: false }
);

export const tboxOrderIdParams = t.Object(
  {
    orderId: t.String({ minLength: 1, maxLength: SNAPSHOT_ID_MAX_LENGTH }),
  },
  { additionalProperties: false }
);

export const tboxBuiltOrderSnapshotData = t.Object({
  snapshot: tboxBuiltOrderSnapshot,
});

export const tboxOrderSnapshotData = t.Object({
  snapshot: tboxOrderSnapshot,
});

export const tboxOrderSnapshotListData = t.Object({
  items: t.Array(tboxOrderSnapshot),
});
