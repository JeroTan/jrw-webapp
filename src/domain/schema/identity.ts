import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";

export const accountStatusValues = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export const sessionActorKinds = ["ADMIN", "CUSTOMER"] as const;
export const sessionStatusValues = ["ACTIVE", "REVOKED"] as const;

export const admins = sqliteTable(
  "admins",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    email: text("email").notNull().unique(),
    password_hash: text("password_hash").notNull(),
    password_salt: text("password_salt"),
    is_owner: integer("is_owner", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: accountStatusValues })
      .notNull()
      .default("ACTIVE"),
    email_verified_at: text("email_verified_at"),
    approved_at: text("approved_at"),
    created_at: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("admins_single_owner_idx")
      .on(sql`1`)
      .where(sql`${table.is_owner} <> 0`),
  ]
);

export const customers = sqliteTable("customers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash"), // Nullable for OAuth users
  password_salt: text("password_salt"),
  status: text("status", { enum: accountStatusValues })
    .notNull()
    .default("ACTIVE"),
  email_verified_at: text("email_verified_at"),
  avatar_url: text("avatar_url"), // Profile picture URL
  first_name: text("first_name"),
  last_name: text("last_name"),
  phone: text("phone"),
  street_address: text("street_address"),
  barangay: text("barangay"),
  city_province: text("city_province"),
  postal_code: text("postal_code"),
  created_at: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const customer_providers = sqliteTable("customer_providers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  customer_id: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // e.g., 'GOOGLE', 'FACEBOOK'
  provider_user_id: text("provider_user_id").notNull().unique(), // ID from the provider (e.g., 'sub' in Google)
  metadata: text("metadata", { mode: "json" }), // Original provider snapshot
  created_at: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    token_hash: text("token_hash").notNull(),
    actor_kind: text("actor_kind", { enum: sessionActorKinds }).notNull(),
    actor_id: text("actor_id").notNull(),
    status: text("status", { enum: sessionStatusValues })
      .notNull()
      .default("ACTIVE"),
    expires_at: text("expires_at").notNull(),
    revoked_at: text("revoked_at"),
    last_used_at: text("last_used_at"),
    created_request_id: text("created_request_id"),
    created_ip_hash: text("created_ip_hash"),
    created_at: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_idx").on(table.token_hash),
    index("sessions_actor_idx").on(table.actor_kind, table.actor_id),
    index("sessions_actor_active_idx")
      .on(table.actor_kind, table.actor_id, table.status)
      .where(sql`${table.status} = 'ACTIVE'`),
    index("sessions_active_expiry_idx")
      .on(table.expires_at)
      .where(sql`${table.status} = 'ACTIVE'`),
    index("sessions_revoked_at_idx")
      .on(table.revoked_at)
      .where(sql`${table.revoked_at} IS NOT NULL`),
  ]
);

export const auth_rate_limits = sqliteTable(
  "auth_rate_limits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    scope_hash: text("scope_hash").notNull(),
    window_start: text("window_start").notNull(),
    attempt_count: integer("attempt_count").notNull().default(0),
    expires_at: text("expires_at").notNull(),
    created_at: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("auth_rate_limits_scope_window_idx").on(
      table.scope_hash,
      table.window_start
    ),
    index("auth_rate_limits_expires_at_idx").on(table.expires_at),
  ]
);

export const customersRelations = relations(customers, ({ many }) => ({
  providers: many(customer_providers),
}));

export const customerProvidersRelations = relations(
  customer_providers,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customer_providers.customer_id],
      references: [customers.id],
    }),
  })
);
