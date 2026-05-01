import { z } from "zod";
import { t } from "elysia";
import {
  zodName,
  zodTextEssentials,
  zodImage,
  zodArrayMinMax,
  zodApiResponse,
} from "@/lib/zod/wrappers";
import { tboxApiResponse, tboxPaginationQuery, tboxSearchQuery } from "@/lib/typebox/wrappers";

// --- BASE SCHEMAS (ZOD) ---
export const zodProduct = z.object({
  id: z.cuid2(),
  name: zodName({ fieldName: "Product Name" }),
  brand: zodName({ fieldName: "Brand" }).nullable().optional(),
  tags: z.array(z.string()),
  description: zodTextEssentials({ fieldName: "Description" }),
  created_at: z.string(),
  updated_at: z.string(),
});

export const zodVariationChain = z.object({
  name: z.string(),
  group: z.string(),
});

export const zodVariant = z.object({
  id: z.cuid2(),
  name: zodName({ fieldName: "Variant Name" }),
  stock: z.number().int().min(0),
  price: z.number().min(0),
  sku: z.string(),
  is_preorder: z.boolean(),
  expected_release: z.string().nullable().optional(),
  stock_lock_version: z.number().int(),
  variation_chain: z.array(zodVariationChain),
  image_reference_id: z.cuid2().nullable().optional(),
  product_id: z.cuid2(),
});

export const zodPhoto = z.object({
  id: z.cuid2(),
  name: z.string().nullable().optional(),
  image_link: z.url({ message: "Invalid Image Link format. Must be a valid HTTP or HTTPS URL." }),
  product_id: z.cuid2(),
});

export const zodCategory = z.object({
  id: z.cuid2(),
  name: z.string(),
  type: z.string(),
});

// --- BASE SCHEMAS (TYPEBOX) ---
export const tboxProduct = t.Object({
  id: t.String(),
  name: t.String(),
  brand: t.Optional(t.Union([t.String(), t.Null()])),
  tags: t.Array(t.String()),
  description: t.String(),
  created_at: t.String(),
  updated_at: t.String(),
});

export const tboxVariationChain = t.Object({
  name: t.String(),
  group: t.String(),
});

export const tboxVariant = t.Object({
  id: t.String(),
  name: t.String(),
  stock: t.Integer({ minimum: 0 }),
  price: t.Number({ minimum: 0 }),
  sku: t.String(),
  is_preorder: t.Boolean(),
  expected_release: t.Optional(t.Union([t.String(), t.Null()])),
  stock_lock_version: t.Integer(),
  variation_chain: t.Array(tboxVariationChain),
  image_reference_id: t.Optional(t.Union([t.String(), t.Null()])),
  product_id: t.String(),
});

export const tboxPhoto = t.Object({
  id: t.String(),
  name: t.Optional(t.Union([t.String(), t.Null()])),
  image_link: t.String({ format: "uri" }),
  product_id: t.String(),
});

export const tboxCategory = t.Object({
  id: t.String(),
  name: t.String(),
  type: t.String(),
});

// --- FORMS & REQUEST BODIES ---

// Create Product Form (with multipart file uploads)
export const zodCreateVariantInput = z.object({
  name: zodName({ fieldName: "Variant Name" }),
  stock: z.coerce.number().int().min(0),
  price: z.coerce.number().min(0),
  sku: z.string(),
  is_preorder: z.coerce.boolean(),
  expected_release: z.string().optional(),
  variation_chain: z.string().transform((val) => JSON.parse(val)), // Parse JSON string from FormData
  image_reference_id: z.cuid2().optional(),
});

export const zodCreateProductForm = z.object({
  name: zodName({ fieldName: "Product Name" }),
  brand: zodName({ fieldName: "Brand" }).optional(),
  tags: z.string().transform((val) => JSON.parse(val)), // Parse JSON string from FormData
  description: zodTextEssentials({ fieldName: "Description" }),
  variants: z.string().transform((val) => JSON.parse(val)), // Or handle array of objects
  photos: zodArrayMinMax({
    zodSchema: zodImage({ fieldName: "Product Photo" }),
    minLength: 1,
    fieldName: "Photos",
  }),
});
export type typeCreateProductForm = z.infer<typeof zodCreateProductForm>;

export const tboxCreateVariantInput = t.Object({
  name: t.String(),
  stock: t.Numeric(),
  price: t.Numeric(),
  sku: t.String(),
  is_preorder: t.BooleanString(), // Elysia handles boolean strings in form data
  expected_release: t.Optional(t.String()),
  variation_chain: t.String(), // Will be parsed later
  image_reference_id: t.Optional(t.String()),
});

export const tboxCreateProductBody = t.Object({
  name: t.String(),
  brand: t.Optional(t.String()),
  tags: t.String(), // Stringified JSON array
  description: t.String(),
  variants: t.String(), // Stringified JSON array of variants
  photos: t.Files(), // Use t.Files() for multiple file uploads
});

// Category Management
export const tboxCreateCategoryBody = t.Object({
  name: t.String(),
  type: t.String(),
});

export const tboxUpdateCategoryBody = t.Object({
  name: t.Optional(t.String()),
  type: t.Optional(t.String()),
});

// Product Filtering
export const tboxProductFilterQuery = t.Composite([
  tboxPaginationQuery,
  tboxSearchQuery,
  t.Object({
    category_id: t.Optional(t.String({ description: "Filter by Category ID. Comma-separated for multiple." })),
    min_price: t.Optional(t.Numeric({ description: "Minimum price filter." })),
    max_price: t.Optional(t.Numeric({ description: "Maximum price filter." })),
    sort: t.Optional(t.String({ description: "Sort by: price, created_at. Prefix with '-' for descending. Comma-separated for multiple." }))
  })
]);

// --- API RESPONSES ---

// Product Details (Nested)
export const zodProductDetails = zodProduct.extend({
  variants: z.array(zodVariant),
  photos: z.array(zodPhoto),
  categories: z.array(zodCategory),
});
export type typeProductDetails = z.infer<typeof zodProductDetails>;

export const zodProductDetailsResponse = zodApiResponse(zodProductDetails);

export const tboxProductDetails = t.Intersect([
  tboxProduct,
  t.Object({
    variants: t.Array(tboxVariant),
    photos: t.Array(tboxPhoto),
    categories: t.Array(tboxCategory),
  }),
]);

export const tboxProductDetailsResponse = tboxApiResponse(tboxProductDetails);
