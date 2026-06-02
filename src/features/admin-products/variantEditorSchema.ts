import { z } from "zod";
import {
  INVENTORY_STATE_VALUES,
  PRODUCT_NAME_MIN_LENGTH,
  PRODUCT_VARIANT_MAX_OPTION_ITEMS,
  PRODUCT_VARIANT_MAX_STOCK,
  PRODUCT_VARIANT_NAME_MAX_LENGTH,
  PRODUCT_VARIANT_OPTION_GROUP_MAX_LENGTH,
  PRODUCT_VARIANT_OPTION_NAME_MAX_LENGTH,
  PRODUCT_VARIANT_SKU_MAX_LENGTH,
} from "./productValidationLimits";

const zodProductVariantOption = z.object({
  name: z.string().trim().min(1).max(PRODUCT_VARIANT_OPTION_NAME_MAX_LENGTH),
  group: z.string().trim().min(1).max(PRODUCT_VARIANT_OPTION_GROUP_MAX_LENGTH),
});

export const zodCreateProductVariantInput = z.object({
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

export const zodUpdateInventoryStateInput = z.object({
  state: z.enum(INVENTORY_STATE_VALUES),
});
