import { z } from "zod";
import {
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_DESCRIPTION_MIN_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
  PRODUCT_SLUG_MAX_LENGTH,
  PRODUCT_SLUG_MIN_LENGTH,
  PRODUCT_SUMMARY_MAX_LENGTH,
} from "./productValidationLimits";

const zodProductSlug = z
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
