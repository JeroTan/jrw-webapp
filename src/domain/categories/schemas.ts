import { t } from "elysia";
import { z } from "zod";
import type { CategoryStatus } from "./types";

export const CATEGORY_NAME_MIN_LENGTH = 2;
export const CATEGORY_NAME_MAX_LENGTH = 120;
export const CATEGORY_SLUG_MIN_LENGTH = 2;
export const CATEGORY_SLUG_MAX_LENGTH = 120;
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 500;
export const CATEGORY_SORT_ORDER_MIN = 0;
export const CATEGORY_SORT_ORDER_MAX = 999_999;
export const CATEGORY_STATUS_VALUES = ["ACTIVE", "ARCHIVED"] as const;

export const zodCategorySlug = z
  .string()
  .trim()
  .min(CATEGORY_SLUG_MIN_LENGTH)
  .max(CATEGORY_SLUG_MAX_LENGTH)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const zodCreateCategoryInput = z.object({
  name: z
    .string()
    .trim()
    .min(CATEGORY_NAME_MIN_LENGTH)
    .max(CATEGORY_NAME_MAX_LENGTH),
  slug: zodCategorySlug.optional(),
  description: z
    .union([z.string().trim().max(CATEGORY_DESCRIPTION_MAX_LENGTH), z.null()])
    .optional(),
  sortOrder: z
    .number()
    .int()
    .min(CATEGORY_SORT_ORDER_MIN)
    .max(CATEGORY_SORT_ORDER_MAX)
    .optional(),
  isVisible: z.boolean().optional(),
});

export const zodUpdateCategoryInput = z
  .object({
    name: z
      .string()
      .trim()
      .min(CATEGORY_NAME_MIN_LENGTH)
      .max(CATEGORY_NAME_MAX_LENGTH)
      .optional(),
    slug: zodCategorySlug.optional(),
    description: z
      .union([z.string().trim().max(CATEGORY_DESCRIPTION_MAX_LENGTH), z.null()])
      .optional(),
    sortOrder: z
      .number()
      .int()
      .min(CATEGORY_SORT_ORDER_MIN)
      .max(CATEGORY_SORT_ORDER_MAX)
      .optional(),
    isVisible: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

const tboxCategoryStatus = t.Union([
  t.Literal("ACTIVE"),
  t.Literal("ARCHIVED"),
]);

export const tboxCategory = t.Object({
  id: t.String(),
  name: t.String({ minLength: CATEGORY_NAME_MIN_LENGTH, maxLength: CATEGORY_NAME_MAX_LENGTH }),
  slug: t.String({
    minLength: CATEGORY_SLUG_MIN_LENGTH,
    maxLength: CATEGORY_SLUG_MAX_LENGTH,
    pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
  }),
  description: t.Nullable(t.String({ maxLength: CATEGORY_DESCRIPTION_MAX_LENGTH })),
  sortOrder: t.Integer({
    minimum: CATEGORY_SORT_ORDER_MIN,
    maximum: CATEGORY_SORT_ORDER_MAX,
  }),
  isVisible: t.Boolean(),
  status: tboxCategoryStatus,
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
  linkedProductCount: t.Nullable(t.Integer({ minimum: 0 })),
});

export const tboxCategoryData = t.Object({
  category: tboxCategory,
});

export const tboxCategoryListData = t.Object({
  items: t.Array(tboxCategory),
  page: t.Number(),
  pageSize: t.Number(),
  totalItems: t.Number(),
  totalPages: t.Number(),
});

export const tboxCreateCategoryBody = t.Object(
  {
    name: t.String({ minLength: CATEGORY_NAME_MIN_LENGTH, maxLength: CATEGORY_NAME_MAX_LENGTH }),
    slug: t.Optional(
      t.String({
        minLength: CATEGORY_SLUG_MIN_LENGTH,
        maxLength: CATEGORY_SLUG_MAX_LENGTH,
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      })
    ),
    description: t.Optional(
      t.Nullable(t.String({ maxLength: CATEGORY_DESCRIPTION_MAX_LENGTH }))
    ),
    sortOrder: t.Optional(
      t.Numeric({
        minimum: CATEGORY_SORT_ORDER_MIN,
        maximum: CATEGORY_SORT_ORDER_MAX,
      })
    ),
    isVisible: t.Optional(t.Boolean()),
  },
  { additionalProperties: false }
);

export const tboxUpdateCategoryBody = t.Object(
  {
    name: t.Optional(
      t.String({ minLength: CATEGORY_NAME_MIN_LENGTH, maxLength: CATEGORY_NAME_MAX_LENGTH })
    ),
    slug: t.Optional(
      t.String({
        minLength: CATEGORY_SLUG_MIN_LENGTH,
        maxLength: CATEGORY_SLUG_MAX_LENGTH,
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      })
    ),
    description: t.Optional(
      t.Nullable(t.String({ maxLength: CATEGORY_DESCRIPTION_MAX_LENGTH }))
    ),
    sortOrder: t.Optional(
      t.Numeric({
        minimum: CATEGORY_SORT_ORDER_MIN,
        maximum: CATEGORY_SORT_ORDER_MAX,
      })
    ),
    isVisible: t.Optional(t.Boolean()),
  },
  { additionalProperties: false, minProperties: 1 }
);

export const tboxCategoryIdParams = t.Object(
  {
    categoryId: t.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false }
);

export const tboxCategoryListQuery = t.Object(
  {
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
    status: t.Optional(tboxCategoryStatus),
    isVisible: t.Optional(t.BooleanString()),
  },
  { additionalProperties: false }
);

export function isCategoryStatus(value: string): value is CategoryStatus {
  return CATEGORY_STATUS_VALUES.includes(value as CategoryStatus);
}

