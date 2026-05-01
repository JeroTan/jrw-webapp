import { z } from "zod";
import { t } from "elysia";
import {
  zodName,
  zodEmail,
  zodAddress,
  zodTextEssentials,
  zodAlphaNumericSpace,
  zodRarity,
  zodApiResponse,
} from "@/lib/zod/wrappers";
import {
  zodOrderStatus,
  tboxOrderStatus,
  zodShippingType,
  tboxShippingType,
} from "./shared";
import { tboxApiResponse, tboxPaginationQuery, tboxSearchQuery } from "@/lib/typebox/wrappers";
import { zodCustomer, tboxCustomerResponse } from "./identity";

// --- BASE SCHEMAS (ZOD) ---
export const zodOrder = z.object({
  id: z.cuid2(),
  customer_id: z.cuid2().nullable(),
  status: zodOrderStatus,
  status_description: z.string().nullable().optional(),
  shipping_type: zodShippingType,
  total_amount: z.number().min(0),
  created_at: z.string(),
  updated_at: z.string(),
});

export const zodOrderSnapshot = z.object({
  id: z.cuid2(),
  order_id: z.cuid2(),
  product_id: z.cuid2().nullable(),
  product_name: z.string(),
  variant_name: z.string(),
  price_at_purchase: z.number().min(0),
  quantity: z.number().int().min(1),
});

export const zodReview = z.object({
  id: z.cuid2(),
  customer_id: z.cuid2(),
  product_id: z.cuid2(),
  order_id: z.cuid2(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable().optional(),
  created_at: z.string(),
});

// --- BASE SCHEMAS (TYPEBOX) ---
export const tboxOrder = t.Object({
  id: t.String(),
  customer_id: t.Union([t.String(), t.Null()]),
  status: tboxOrderStatus,
  status_description: t.Optional(t.Union([t.String(), t.Null()])),
  shipping_type: tboxShippingType,
  total_amount: t.Number({ minimum: 0 }),
  created_at: t.String(),
  updated_at: t.String(),
});

export const tboxOrderSnapshot = t.Object({
  id: t.String(),
  order_id: t.String(),
  product_id: t.Union([t.String(), t.Null()]),
  product_name: t.String(),
  variant_name: t.String(),
  price_at_purchase: t.Number({ minimum: 0 }),
  quantity: t.Integer({ minimum: 1 }),
});

export const tboxReview = t.Object({
  id: t.String(),
  customer_id: t.String(),
  product_id: t.String(),
  order_id: t.String(),
  rating: t.Integer({ minimum: 1, maximum: 5 }),
  comment: t.Optional(t.Union([t.String(), t.Null()])),
  created_at: t.String(),
});

// --- FORMS & REQUEST BODIES ---

// Common cart item schema for checkout
const zodCartItem = z.object({
  variant_id: z.cuid2(),
  quantity: z.number().int().min(1),
});
const tboxCartItem = t.Object({
  variant_id: t.String(),
  quantity: t.Integer({ minimum: 1 }),
});

// Authenticated Checkout
export const zodAuthCheckoutForm = z.object({
  customer_id: z.cuid2(), // Usually injected server-side or from token, but required in schema per plan
  shipping_type: zodShippingType,
  items: z.array(zodCartItem).min(1),
});
export type typeAuthCheckoutForm = z.infer<typeof zodAuthCheckoutForm>;

export const tboxAuthCheckoutBody = t.Object({
  customer_id: t.String(),
  shipping_type: tboxShippingType,
  items: t.Array(tboxCartItem, { minItems: 1 }),
});

// Guest Checkout (requires full PII)
export const zodGuestCheckoutForm = z.object({
  email: zodEmail({ fieldName: "Email" }),
  first_name: zodName({ fieldName: "First Name" }),
  last_name: zodName({ fieldName: "Last Name" }),
  phone: zodAlphaNumericSpace({ fieldName: "Phone" }),
  street_address: zodAddress({ fieldName: "Street Address" }),
  barangay: zodTextEssentials({ fieldName: "Barangay" }),
  city_province: zodTextEssentials({ fieldName: "City/Province" }),
  postal_code: zodAlphaNumericSpace({ fieldName: "Postal Code" }),
  shipping_type: zodShippingType,
  items: z.array(zodCartItem).min(1),
});
export type typeGuestCheckoutForm = z.infer<typeof zodGuestCheckoutForm>;

export const tboxGuestCheckoutBody = t.Object({
  email: t.String({ format: "email" }),
  first_name: t.String(),
  last_name: t.String(),
  phone: t.String(),
  street_address: t.String(),
  barangay: t.String(),
  city_province: t.String(),
  postal_code: t.String(),
  shipping_type: tboxShippingType,
  items: t.Array(tboxCartItem, { minItems: 1 }),
});

// Review Submission
export const zodSubmitReviewForm = z.object({
  rating: zodRarity({ fieldName: "Rating" }),
  comment: zodTextEssentials({ fieldName: "Comment" }).optional(),
});
export type typeSubmitReviewForm = z.infer<typeof zodSubmitReviewForm>;

export const tboxSubmitReviewBody = t.Object({
  rating: t.Integer({ minimum: 1, maximum: 5 }),
  comment: t.Optional(t.String()),
});

export const tboxUpdateOrderStatusBody = t.Object({
  status: tboxOrderStatus,
});

export const tboxOrderFilterQuery = t.Composite([
  tboxPaginationQuery,
  tboxSearchQuery,
  t.Object({
    status: t.Optional(t.String({ description: "Filter by status. Comma-separated for multiple." })),
    sort: t.Optional(t.String({ description: "Sort by: total_amount, created_at. Prefix with '-' for descending. Comma-separated for multiple." }))
  })
]);

// --- API RESPONSES ---

// Order Details (Nested)
export const zodOrderDetails = zodOrder.extend({
  snapshots: z.array(zodOrderSnapshot),
  customer: zodCustomer.nullable().optional(),
});
export type typeOrderDetails = z.infer<typeof zodOrderDetails>;

export const zodOrderDetailsResponse = zodApiResponse(zodOrderDetails);

export const tboxOrderDetails = t.Intersect([
  tboxOrder,
  t.Object({
    snapshots: t.Array(tboxOrderSnapshot),
    customer: t.Optional(t.Union([tboxCustomerResponse, t.Null()])),
  }),
]);

export const tboxOrderDetailsResponse = tboxApiResponse(tboxOrderDetails);

