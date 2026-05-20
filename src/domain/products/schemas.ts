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

const tboxProductStatus = t.Union([
  t.Literal("DRAFT"),
  t.Literal("PUBLISHED"),
  t.Literal("ARCHIVED"),
]);

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
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

export const tboxProductData = t.Object({
  product: tboxProduct,
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

export const tboxProductIdParams = t.Object(
  {
    productId: t.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false }
);

export const tboxProductListQuery = t.Object(
  {
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
    status: t.Optional(tboxProductStatus),
    brandId: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
    categoryId: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
    search: t.Optional(t.String({ minLength: 1, maxLength: 180 })),
    includeArchived: t.Optional(t.BooleanString()),
  },
  { additionalProperties: false }
);

export function isProductStatus(value: string): value is ProductStatus {
  return PRODUCT_STATUS_VALUES.includes(value as ProductStatus);
}
