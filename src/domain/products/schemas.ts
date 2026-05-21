import { t } from "elysia";
import { z } from "zod";
import type { ProductStatus } from "./types";

export const PRODUCT_NAME_MIN_LENGTH = 2;
export const PRODUCT_NAME_MAX_LENGTH = 160;
export const PRODUCT_SLUG_MIN_LENGTH = 2;
export const PRODUCT_SLUG_MAX_LENGTH = 120;
export const PRODUCT_SUMMARY_MAX_LENGTH = 280;
export const PRODUCT_DESCRIPTION_MIN_LENGTH = 2;
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 8_000;
export const PRODUCT_STATUS_VALUES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export const PRODUCT_ASSIGNMENT_MAX_CATEGORY_IDS = 100;
export const PRODUCT_VARIANT_NAME_MAX_LENGTH = 255;
export const PRODUCT_VARIANT_SKU_MAX_LENGTH = 64;
export const PRODUCT_VARIANT_MAX_STOCK = 10_000_000;
export const PRODUCT_VARIANT_MAX_OPTION_ITEMS = 32;
export const PRODUCT_VARIANT_OPTION_NAME_MAX_LENGTH = 120;
export const PRODUCT_VARIANT_OPTION_GROUP_MAX_LENGTH = 120;

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

export const zodProductVariantOption = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(PRODUCT_VARIANT_OPTION_NAME_MAX_LENGTH),
  group: z
    .string()
    .trim()
    .min(1)
    .max(PRODUCT_VARIANT_OPTION_GROUP_MAX_LENGTH),
});

const zodProductVariantCommon = z.object({
  name: z
    .string()
    .trim()
    .min(PRODUCT_NAME_MIN_LENGTH)
    .max(PRODUCT_VARIANT_NAME_MAX_LENGTH),
  sku: z
    .string()
    .trim()
    .min(1)
    .max(PRODUCT_VARIANT_SKU_MAX_LENGTH),
  priceCentavos: z.number().int().min(0),
  stock: z.number().int().min(0).max(PRODUCT_VARIANT_MAX_STOCK).default(0),
  isPreorder: z.boolean().default(false),
  expectedRelease: z.union([z.string().trim().min(1), z.null()]).optional(),
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
    variationChain: zodProductVariantCommon.shape.variationChain.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const zodArchiveProductVariantInput = z.object({
  reason: z.string().trim().max(160).optional(),
});

const tboxProductStatus = t.Union([
  t.Literal("DRAFT"),
  t.Literal("PUBLISHED"),
  t.Literal("ARCHIVED"),
]);

const tboxCategoryStatus = t.Union([t.Literal("ACTIVE"), t.Literal("ARCHIVED")]);
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
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

export const tboxProductData = t.Object({
  product: tboxProduct,
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
  variationChain: t.Array(tboxProductVariantOption, {
    maxItems: PRODUCT_VARIANT_MAX_OPTION_ITEMS,
  }),
  status: tboxVariantStatus,
  hasAvailableStock: t.Boolean(),
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
