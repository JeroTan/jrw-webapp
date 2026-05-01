import { z } from "zod";
import { tboxEnum } from "@/lib/typebox/wrappers";

// Enums
export const ORDER_STATUSES = ["PENDING", "FAILED", "ON_THE_WAY", "FULFILLED"] as const;
export const SHIPPING_TYPES = ["STANDARD", "EXPRESS"] as const;

export const zodOrderStatus = z.enum(ORDER_STATUSES);
export const tboxOrderStatus = tboxEnum(ORDER_STATUSES);

export const zodShippingType = z.enum(SHIPPING_TYPES);
export const tboxShippingType = tboxEnum(SHIPPING_TYPES);
