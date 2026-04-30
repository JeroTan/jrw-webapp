import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";

export const admins = sqliteTable("admins", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  is_owner: integer("is_owner", { mode: "boolean" }).notNull().default(false),
  created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash"), // Nullable for OAuth users
  avatar_url: text("avatar_url"),        // Profile picture URL
  first_name: text("first_name"),
  last_name: text("last_name"),
  phone: text("phone"),
  street_address: text("street_address"),
  barangay: text("barangay"),
  city_province: text("city_province"),
  postal_code: text("postal_code"),
  created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const customer_providers = sqliteTable("customer_providers", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  customer_id: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // e.g., 'GOOGLE', 'FACEBOOK'
  provider_user_id: text("provider_user_id").notNull().unique(), // ID from the provider (e.g., 'sub' in Google)
  metadata: text("metadata", { mode: "json" }), // Original provider snapshot
  created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const customersRelations = relations(customers, ({ many }) => ({
  providers: many(customer_providers),
}));

export const customerProvidersRelations = relations(customer_providers, ({ one }) => ({
  customer: one(customers, {
    fields: [customer_providers.customer_id],
    references: [customers.id],
  }),
}));
