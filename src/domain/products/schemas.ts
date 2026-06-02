import { t } from "elysia";
import { z } from "zod";
import type { AvailabilityLabel, InventoryState, ProductStatus } from "./types";

export const PRODUCT_NAME_MIN_LENGTH = 2;
export const PRODUCT_NAME_MAX_LENGTH = 160;
export const PRODUCT_SLUG_MIN_LENGTH = 2;
export const PRODUCT_SLUG_MAX_LENGTH = 120;
export const PRODUCT_SUMMARY_MAX_LENGTH = 280;
export const PRODUCT_DESCRIPTION_MIN_LENGTH = 2;
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 8_000;
export const PRODUCT_STATUS_VALUES = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const;
export const PRODUCT_ASSIGNMENT_MAX_CATEGORY_IDS = 100;
export const PRODUCT_READINESS_MAX_ITEMS = 32;
export const PRODUCT_VARIANT_NAME_MAX_LENGTH = 255;
export const PRODUCT_VARIANT_SKU_MAX_LENGTH = 64;
export const PRODUCT_VARIANT_MAX_STOCK = 10_000_000;
export const PRODUCT_VARIANT_LOW_STOCK_THRESHOLD = 10;
export const PRODUCT_VARIANT_MAX_OPTION_ITEMS = 32;
export const PRODUCT_VARIANT_OPTION_NAME_MAX_LENGTH = 120;
export const PRODUCT_VARIANT_OPTION_GROUP_MAX_LENGTH = 120;
export const INVENTORY_STATE_VALUES = [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "PREORDER",
] as const;
export const AVAILABILITY_LABEL_VALUES = [
  "Available",
  "Low Stock",
  "Unavailable",
  "Preorder",
] as const;
export const PRODUCT_IMAGE_NAME_MAX_LENGTH = 255;
export const PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const PRODUCT_IMAGE_LIST_TARGET_MAX_BYTES = 250 * 1024;
export const PRODUCT_IMAGE_DETAIL_TARGET_MAX_BYTES = 1024 * 1024;

export const zodProductSlug = z
  .string()
  .trim()
  .min(PRODUCT_SLUG_MIN_LENGTH)
  .max(PRODUCT_SLUG_MAX_LENGTH)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const zodCreateProductInput = z.object({
  name: z
    .string()
    .trim()
    .min(PRODUCT_NAME_MIN_LENGTH)
    .max(PRODUCT_NAME_MAX_LENGTH),
  slug: zodProductSlug.optional(),
  summary: z
    .union([z.string().trim().max(PRODUCT_SUMMARY_MAX_LENGTH), z.null()])
    .optional(),
  description: z
    .string()
    .trim()
    .min(PRODUCT_DESCRIPTION_MIN_LENGTH)
    .max(PRODUCT_DESCRIPTION_MAX_LENGTH),
});

export const zodUpdateProductInput = z
  .object({
    name: z
      .string()
      .trim()
      .min(PRODUCT_NAME_MIN_LENGTH)
      .max(PRODUCT_NAME_MAX_LENGTH)
      .optional(),
    slug: zodProductSlug.optional(),
    summary: z
      .union([z.string().trim().max(PRODUCT_SUMMARY_MAX_LENGTH), z.null()])
      .optional(),
    description: z
      .string()
      .trim()
      .min(PRODUCT_DESCRIPTION_MIN_LENGTH)
      .max(PRODUCT_DESCRIPTION_MAX_LENGTH)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const zodAssignProductBrandInput = z.object({
  brandId: z.union([z.string().trim().min(1).max(128), z.null()]),
});

export const zodAssignProductCategoriesInput = z.object({
  categoryIds: z
    .array(z.string().trim().min(1).max(128))
    .max(PRODUCT_ASSIGNMENT_MAX_CATEGORY_IDS),
});

export const zodProductReadinessResult = z.object({
  isReady: z.boolean(),
  missingItems: z
    .array(z.string().trim().min(1))
    .max(PRODUCT_READINESS_MAX_ITEMS),
});

export const zodProductVariantOption = z.object({
  name: z.string().trim().min(1).max(PRODUCT_VARIANT_OPTION_NAME_MAX_LENGTH),
  group: z.string().trim().min(1).max(PRODUCT_VARIANT_OPTION_GROUP_MAX_LENGTH),
});

const zodInventoryState = z.enum(INVENTORY_STATE_VALUES);

export function isInventoryState(value: unknown): value is InventoryState {
  return INVENTORY_STATE_VALUES.includes(value as InventoryState);
}

export function availabilityLabelFromState(
  state: InventoryState
): AvailabilityLabel {
  switch (state) {
    case "IN_STOCK":
      return "Available";
    case "LOW_STOCK":
      return "Low Stock";
    case "PREORDER":
      return "Preorder";
    default:
      return "Unavailable";
  }
}

export function isInventoryStateInStock(state: InventoryState): boolean {
  return state === "IN_STOCK" || state === "LOW_STOCK" || state === "PREORDER";
}

export function deriveInventoryStateFromQuantity(input: {
  quantity: number;
  isPreorder?: boolean;
  lowStockThreshold?: number;
}): InventoryState {
  if (input.isPreorder) {
    return "PREORDER";
  }

  const threshold = Math.max(
    0,
    input.lowStockThreshold ?? PRODUCT_VARIANT_LOW_STOCK_THRESHOLD
  );

  if (input.quantity <= 0) {
    return "OUT_OF_STOCK";
  }

  if (input.quantity <= threshold) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
}

export function inventoryStateConsistent(input: {
  quantity: number;
  state: InventoryState;
  lowStockThreshold?: number;
}): boolean {
  if (input.state === "PREORDER") {
    return true;
  }

  const derived = deriveInventoryStateFromQuantity({
    quantity: input.quantity,
    lowStockThreshold: input.lowStockThreshold,
  });

  return derived === input.state;
}

const zodProductVariantCommon = z.object({
  name: z
    .string()
    .trim()
    .min(PRODUCT_NAME_MIN_LENGTH)
    .max(PRODUCT_VARIANT_NAME_MAX_LENGTH),
  sku: z.string().trim().min(1).max(PRODUCT_VARIANT_SKU_MAX_LENGTH),
  priceCentavos: z.number().int().min(0),
  stock: z.number().int().min(0).max(PRODUCT_VARIANT_MAX_STOCK).default(0),
  isPreorder: z.boolean().default(false),
  expectedRelease: z.union([z.string().trim().min(1), z.null()]).optional(),
  imageReferenceId: z
    .union([z.string().trim().min(1).max(128), z.null()])
    .optional(),
  variationChain: z
    .array(zodProductVariantOption)
    .max(PRODUCT_VARIANT_MAX_OPTION_ITEMS)
    .default([]),
});

export const zodCreateProductVariantInput = zodProductVariantCommon;

export const zodUpdateProductVariantInput = z
  .object({
    name: zodProductVariantCommon.shape.name.optional(),
    sku: zodProductVariantCommon.shape.sku.optional(),
    priceCentavos: zodProductVariantCommon.shape.priceCentavos.optional(),
    stock: zodProductVariantCommon.shape.stock.optional(),
    isPreorder: zodProductVariantCommon.shape.isPreorder.optional(),
    expectedRelease: zodProductVariantCommon.shape.expectedRelease,
    imageReferenceId: zodProductVariantCommon.shape.imageReferenceId,
    variationChain: zodProductVariantCommon.shape.variationChain.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const zodArchiveProductVariantInput = z.object({
  reason: z.string().trim().max(160).optional(),
});

export const zodUpdateStockInput = z.object({
  quantity: z.number().int().min(0).max(PRODUCT_VARIANT_MAX_STOCK),
});

export const zodUpdateInventoryStateInput = z.object({
  state: zodInventoryState,
});

const zodFileValue = z
  .custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    {
      message: "Image file is required.",
    }
  )
  .refine((file) => file.size > 0, {
    message: "Image file is required.",
  });

export const zodProductImageUploadInput = z.object({
  image: zodFileValue
    .refine(
      (file) =>
        PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES.includes(
          file.type as (typeof PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES)[number]
        ),
      { message: "Unsupported image file type." }
    )
    .refine((file) => file.size <= PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES, {
      message: "Image file exceeds maximum size.",
    }),
  name: z
    .union([
      z.string().trim().min(1).max(PRODUCT_IMAGE_NAME_MAX_LENGTH),
      z.null(),
    ])
    .optional(),
});

export const zodUpdateImageOrderInput = z.object({
  sortOrder: z.number().int().min(0),
});

export const zodRemoveProductPhotoInput = z.object({
  photoId: z.string().trim().min(1).max(128),
});

const tboxProductStatus = t.Union([
  t.Literal("DRAFT"),
  t.Literal("PUBLISHED"),
  t.Literal("ARCHIVED"),
]);

const tboxCategoryStatus = t.Union([
  t.Literal("ACTIVE"),
  t.Literal("ARCHIVED"),
]);
const tboxBrandStatus = t.Union([t.Literal("ACTIVE"), t.Literal("ARCHIVED")]);

export const tboxProduct = t.Object({
  id: t.String(),
  name: t.String({
    minLength: PRODUCT_NAME_MIN_LENGTH,
    maxLength: PRODUCT_NAME_MAX_LENGTH,
  }),
  slug: t.String({
    minLength: PRODUCT_SLUG_MIN_LENGTH,
    maxLength: PRODUCT_SLUG_MAX_LENGTH,
    pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
  }),
  summary: t.Nullable(t.String({ maxLength: PRODUCT_SUMMARY_MAX_LENGTH })),
  description: t.String({
    minLength: PRODUCT_DESCRIPTION_MIN_LENGTH,
    maxLength: PRODUCT_DESCRIPTION_MAX_LENGTH,
  }),
  status: tboxProductStatus,
  brandId: t.Nullable(t.String()),
  brandName: t.Nullable(t.String()),
  linkedCategoryCount: t.Integer({ minimum: 0 }),
  variantCount: t.Integer({ minimum: 0 }),
  lowestPrice: t.Nullable(t.Integer({ minimum: 0 })),
  priceRangeMin: t.Nullable(t.Integer({ minimum: 0 })),
  priceRangeMax: t.Nullable(t.Integer({ minimum: 0 })),
  hasAvailableVariants: t.Boolean(),
  imageCount: t.Integer({ minimum: 0 }),
  primaryImageUrl: t.Nullable(t.String()),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

export const tboxProductData = t.Object({
  product: tboxProduct,
});

export const tboxProductReadiness = t.Object({
  isReady: t.Boolean(),
  missingItems: t.Array(t.String({ minLength: 1 }), {
    maxItems: PRODUCT_READINESS_MAX_ITEMS,
  }),
});

export const tboxProductReadinessData = t.Object({
  readiness: tboxProductReadiness,
});

const tboxProductOrganizationBrand = t.Object({
  id: t.String(),
  name: t.String(),
  status: tboxBrandStatus,
});

const tboxProductOrganizationCategory = t.Object({
  id: t.String(),
  name: t.String(),
  slug: t.String(),
  status: tboxCategoryStatus,
});

export const tboxProductOrganization = t.Object({
  productId: t.String(),
  brand: t.Nullable(tboxProductOrganizationBrand),
  categories: t.Array(tboxProductOrganizationCategory),
});

export const tboxProductOrganizationData = t.Object({
  organization: tboxProductOrganization,
});

export const tboxProductOrganizationMutationData = t.Object({
  product: tboxProduct,
  organization: tboxProductOrganization,
});

export const tboxProductListData = t.Object({
  items: t.Array(tboxProduct),
  page: t.Number(),
  pageSize: t.Number(),
  totalItems: t.Number(),
  totalPages: t.Number(),
});

export const tboxCreateProductBody = t.Object(
  {
    name: t.String({
      minLength: PRODUCT_NAME_MIN_LENGTH,
      maxLength: PRODUCT_NAME_MAX_LENGTH,
    }),
    slug: t.Optional(
      t.String({
        minLength: PRODUCT_SLUG_MIN_LENGTH,
        maxLength: PRODUCT_SLUG_MAX_LENGTH,
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      })
    ),
    summary: t.Optional(
      t.Nullable(t.String({ maxLength: PRODUCT_SUMMARY_MAX_LENGTH }))
    ),
    description: t.String({
      minLength: PRODUCT_DESCRIPTION_MIN_LENGTH,
      maxLength: PRODUCT_DESCRIPTION_MAX_LENGTH,
    }),
  },
  { additionalProperties: false }
);

export const tboxUpdateProductBody = t.Object(
  {
    name: t.Optional(
      t.String({
        minLength: PRODUCT_NAME_MIN_LENGTH,
        maxLength: PRODUCT_NAME_MAX_LENGTH,
      })
    ),
    slug: t.Optional(
      t.String({
        minLength: PRODUCT_SLUG_MIN_LENGTH,
        maxLength: PRODUCT_SLUG_MAX_LENGTH,
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      })
    ),
    summary: t.Optional(
      t.Nullable(t.String({ maxLength: PRODUCT_SUMMARY_MAX_LENGTH }))
    ),
    description: t.Optional(
      t.String({
        minLength: PRODUCT_DESCRIPTION_MIN_LENGTH,
        maxLength: PRODUCT_DESCRIPTION_MAX_LENGTH,
      })
    ),
  },
  { additionalProperties: false, minProperties: 1 }
);

export const tboxAssignProductBrandBody = t.Object(
  {
    brandId: t.Nullable(t.String({ minLength: 1, maxLength: 128 })),
  },
  { additionalProperties: false }
);

export const tboxAssignProductCategoriesBody = t.Object(
  {
    categoryIds: t.Array(t.String({ minLength: 1, maxLength: 128 }), {
      maxItems: PRODUCT_ASSIGNMENT_MAX_CATEGORY_IDS,
    }),
  },
  { additionalProperties: false }
);

export const tboxProductIdParams = t.Object(
  {
    productId: t.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false }
);

export const tboxInventoryState = t.Union([
  t.Literal("IN_STOCK"),
  t.Literal("LOW_STOCK"),
  t.Literal("OUT_OF_STOCK"),
  t.Literal("PREORDER"),
]);

export const tboxAvailabilityLabel = t.Union([
  t.Literal("Available"),
  t.Literal("Low Stock"),
  t.Literal("Unavailable"),
  t.Literal("Preorder"),
]);

const tboxVariantStatus = t.Union([t.Literal("ACTIVE"), t.Literal("ARCHIVED")]);

export const tboxProductVariantOption = t.Object({
  name: t.String({
    minLength: 1,
    maxLength: PRODUCT_VARIANT_OPTION_NAME_MAX_LENGTH,
  }),
  group: t.String({
    minLength: 1,
    maxLength: PRODUCT_VARIANT_OPTION_GROUP_MAX_LENGTH,
  }),
});

export const tboxProductVariant = t.Object({
  id: t.String(),
  productId: t.String(),
  name: t.String({
    minLength: PRODUCT_NAME_MIN_LENGTH,
    maxLength: PRODUCT_VARIANT_NAME_MAX_LENGTH,
  }),
  sku: t.String({ minLength: 1, maxLength: PRODUCT_VARIANT_SKU_MAX_LENGTH }),
  priceCentavos: t.Integer({ minimum: 0 }),
  stock: t.Integer({ minimum: 0 }),
  isPreorder: t.Boolean(),
  expectedRelease: t.Nullable(t.String()),
  imageReferenceId: t.Optional(t.Nullable(t.String())),
  variationChain: t.Array(tboxProductVariantOption, {
    maxItems: PRODUCT_VARIANT_MAX_OPTION_ITEMS,
  }),
  status: tboxVariantStatus,
  hasAvailableStock: t.Boolean(),
  inventoryState: tboxInventoryState,
  stockVersion: t.Integer({ minimum: 0 }),
  availability: tboxAvailabilityLabel,
});

export const tboxProductVariantData = t.Object({
  variant: tboxProductVariant,
});

export const tboxProductVariantListData = t.Object({
  items: t.Array(tboxProductVariant),
  page: t.Number(),
  pageSize: t.Number(),
  totalItems: t.Number(),
  totalPages: t.Number(),
});

export const tboxProductVariantRouteParams = t.Object(
  {
    productId: t.String({ minLength: 1, maxLength: 128 }),
    variantId: t.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false }
);

export const tboxInventoryAvailability = t.Object({
  productId: t.String({ minLength: 1, maxLength: 128 }),
  variantId: t.String({ minLength: 1, maxLength: 128 }),
  label: tboxAvailabilityLabel,
  inStock: t.Boolean(),
});

export const tboxInventoryAvailabilityData = t.Object({
  availability: tboxInventoryAvailability,
});

export const tboxProductImage = t.Object({
  id: t.String(),
  productId: t.Nullable(t.String()),
  imageId: t.String(),
  name: t.Nullable(t.String({ maxLength: PRODUCT_IMAGE_NAME_MAX_LENGTH })),
  sortOrder: t.Integer({ minimum: 0 }),
  isPrimary: t.Boolean(),
  r2Key: t.String(),
  fileSize: t.Nullable(t.Integer({ minimum: 0 })),
  contentType: t.Nullable(t.String()),
  width: t.Nullable(t.Integer({ minimum: 1 })),
  height: t.Nullable(t.Integer({ minimum: 1 })),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
  uploadedAt: t.String({ format: "date-time" }),
  url: t.String(),
});

export const tboxProductImageData = t.Object({
  image: tboxProductImage,
});

export const tboxProductImageListData = t.Object({
  items: t.Array(tboxProductImage),
  performanceTargets: t.Object({
    listMaxBytes: t.Integer({ minimum: 1 }),
    detailMaxBytes: t.Integer({ minimum: 1 }),
  }),
});

export const tboxProductImageRouteParams = t.Object(
  {
    productId: t.String({ minLength: 1, maxLength: 128 }),
    photoId: t.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false }
);

export const tboxUploadProductImageBody = t.Object(
  {
    image: t.File({
      type: [...PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES],
      maxSize: PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
      minSize: 1,
    }),
    name: t.Optional(
      t.Nullable(
        t.String({ minLength: 1, maxLength: PRODUCT_IMAGE_NAME_MAX_LENGTH })
      )
    ),
  },
  { additionalProperties: false }
);

export const tboxUpdateImageOrderBody = t.Object(
  {
    sortOrder: t.Integer({ minimum: 0 }),
  },
  { additionalProperties: false }
);

export const tboxVariantListQuery = t.Object(
  {
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  },
  { additionalProperties: false }
);

export const tboxCreateProductVariantBody = t.Object(
  {
    name: t.String({
      minLength: PRODUCT_NAME_MIN_LENGTH,
      maxLength: PRODUCT_VARIANT_NAME_MAX_LENGTH,
    }),
    sku: t.String({ minLength: 1, maxLength: PRODUCT_VARIANT_SKU_MAX_LENGTH }),
    priceCentavos: t.Integer({ minimum: 0 }),
    stock: t.Optional(
      t.Integer({ minimum: 0, maximum: PRODUCT_VARIANT_MAX_STOCK })
    ),
    isPreorder: t.Optional(t.Boolean()),
    expectedRelease: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
    imageReferenceId: t.Optional(
      t.Nullable(t.String({ minLength: 1, maxLength: 128 }))
    ),
    variationChain: t.Optional(
      t.Array(tboxProductVariantOption, {
        maxItems: PRODUCT_VARIANT_MAX_OPTION_ITEMS,
      })
    ),
  },
  { additionalProperties: false }
);

export const tboxUpdateProductVariantBody = t.Object(
  {
    name: t.Optional(
      t.String({
        minLength: PRODUCT_NAME_MIN_LENGTH,
        maxLength: PRODUCT_VARIANT_NAME_MAX_LENGTH,
      })
    ),
    sku: t.Optional(
      t.String({ minLength: 1, maxLength: PRODUCT_VARIANT_SKU_MAX_LENGTH })
    ),
    priceCentavos: t.Optional(t.Integer({ minimum: 0 })),
    stock: t.Optional(
      t.Integer({ minimum: 0, maximum: PRODUCT_VARIANT_MAX_STOCK })
    ),
    isPreorder: t.Optional(t.Boolean()),
    expectedRelease: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
    imageReferenceId: t.Optional(
      t.Nullable(t.String({ minLength: 1, maxLength: 128 }))
    ),
    variationChain: t.Optional(
      t.Array(tboxProductVariantOption, {
        maxItems: PRODUCT_VARIANT_MAX_OPTION_ITEMS,
      })
    ),
  },
  { additionalProperties: false, minProperties: 1 }
);

export const tboxArchiveProductVariantBody = t.Object(
  {
    reason: t.Optional(t.String({ maxLength: 160 })),
  },
  { additionalProperties: false }
);

export const tboxUpdateStockBody = t.Object(
  {
    quantity: t.Integer({
      minimum: 0,
      maximum: PRODUCT_VARIANT_MAX_STOCK,
    }),
  },
  { additionalProperties: false }
);

export const tboxUpdateInventoryStateBody = t.Object(
  {
    state: tboxInventoryState,
  },
  { additionalProperties: false }
);

export const tboxProductListQuery = t.Object(
  {
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
    status: t.Optional(tboxProductStatus),
    brandId: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
    brandless: t.Optional(t.BooleanString()),
    categoryId: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
    search: t.Optional(t.String({ minLength: 1, maxLength: 180 })),
    includeArchived: t.Optional(t.BooleanString()),
  },
  { additionalProperties: false }
);

export function isProductStatus(value: string): value is ProductStatus {
  return PRODUCT_STATUS_VALUES.includes(value as ProductStatus);
}
