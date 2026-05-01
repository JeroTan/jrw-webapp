import { z } from "zod";
import { t } from "elysia";

// Enums
export const ORDER_STATUSES = ["PENDING", "FAILED", "ON_THE_WAY", "FULFILLED"] as const;
export const SHIPPING_TYPES = ["STANDARD", "EXPRESS"] as const;

export const zodOrderStatus = z.enum(ORDER_STATUSES);
export const tboxOrderStatus = t.Union([
  t.Literal("PENDING"),
  t.Literal("FAILED"),
  t.Literal("ON_THE_WAY"),
  t.Literal("FULFILLED")
]);

export const zodShippingType = z.enum(SHIPPING_TYPES);
export const tboxShippingType = t.Union([
  t.Literal("STANDARD"),
  t.Literal("EXPRESS")
]);
