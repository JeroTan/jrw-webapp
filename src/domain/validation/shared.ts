import { z } from "zod";
import { tboxEnum } from "@/lib/typebox/wrappers";

// Enums
export const ORDER_STATUSES = ["PENDING", "FAILED", "ON_THE_WAY", "FULFILLED"] as const;
export const SHIPPING_TYPES = ["STANDARD", "EXPRESS"] as const;

export const zodOrderStatus = z.enum(ORDER_STATUSES);
export const tboxOrderStatus = tboxEnum(ORDER_STATUSES);

export const zodShippingType = z.enum(SHIPPING_TYPES);
export const tboxShippingType = tboxEnum(SHIPPING_TYPES);

// API Wrappers (Zod)
export function zodApiResponse<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    message: z.string(),
  });
}

export function zodPaginatedResponse<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: z.array(dataSchema),
    meta: z.object({
      page: z.number(),
      total: z.number(),
      limit: z.number(),
    }),
    message: z.string(),
  });
}
