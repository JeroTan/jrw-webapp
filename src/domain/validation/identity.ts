import { z } from "zod";
import { t } from "elysia";
import { 
  zodName, 
  zodEmail, 
  zodPassword, 
  zodAddress, 
  zodTextEssentials, 
  zodAlphaNumericSpace 
} from "@/lib/zod/wrapperSchemaFields";

// --- BASE SCHEMAS (ZOD) ---
export const zodAdmin = z.object({
  id: z.cuid2(),
  email: zodEmail({ fieldName: "Email" }),
  password_hash: z.string(),
  is_owner: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const zodCustomer = z.object({
  id: z.cuid2(),
  email: zodEmail({ fieldName: "Email" }),
  first_name: zodName({ fieldName: "First Name" }).nullable().optional(),
  last_name: zodName({ fieldName: "Last Name" }).nullable().optional(),
  phone: zodAlphaNumericSpace({ fieldName: "Phone" }).nullable().optional(),
  street_address: zodAddress({ fieldName: "Street Address" }).nullable().optional(),
  barangay: zodTextEssentials({ fieldName: "Barangay" }).nullable().optional(),
  city_province: zodTextEssentials({ fieldName: "City/Province" }).nullable().optional(),
  postal_code: zodAlphaNumericSpace({ fieldName: "Postal Code" }).nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

// --- FORMS & REQUEST BODIES ---

// Registration
export const zodRegistrationForm = z.object({
  email: zodEmail({ fieldName: "Email" }),
  password: zodPassword({ fieldName: "Password" }),
  first_name: zodName({ fieldName: "First Name" }),
  last_name: zodName({ fieldName: "Last Name" }),
});
export type typeRegistrationForm = z.infer<typeof zodRegistrationForm>;

export const tboxRegistrationBody = t.Object({
  email: t.String({ format: "email" }),
  password: t.String(),
  first_name: t.String(),
  last_name: t.String(),
});

// Login
export const zodLoginForm = z.object({
  email: zodEmail({ fieldName: "Email" }),
  password: z.string().min(1, { message: "Password is required" }), 
});
export type typeLoginForm = z.infer<typeof zodLoginForm>;

export const tboxLoginBody = t.Object({
  email: t.String({ format: "email" }),
  password: t.String(),
});

// --- API RESPONSES ---

// Admin Details (excluding password)
export const zodAdminDetails = zodAdmin.omit({ password_hash: true });
export type typeAdminDetails = z.infer<typeof zodAdminDetails>;

export const tboxAdminResponse = t.Object({
  id: t.String(),
  email: t.String({ format: "email" }),
  is_owner: t.Boolean(),
  created_at: t.String(),
  updated_at: t.String(),
});

// Customer Details
export const zodCustomerDetails = zodCustomer;
export type typeCustomerDetails = z.infer<typeof zodCustomerDetails>;

export const tboxCustomerResponse = t.Object({
  id: t.String(),
  email: t.String({ format: "email" }),
  first_name: t.Optional(t.Union([t.String(), t.Null()])),
  last_name: t.Optional(t.Union([t.String(), t.Null()])),
  phone: t.Optional(t.Union([t.String(), t.Null()])),
  street_address: t.Optional(t.Union([t.String(), t.Null()])),
  barangay: t.Optional(t.Union([t.String(), t.Null()])),
  city_province: t.Optional(t.Union([t.String(), t.Null()])),
  postal_code: t.Optional(t.Union([t.String(), t.Null()])),
  created_at: t.String(),
  updated_at: t.String(),
});
