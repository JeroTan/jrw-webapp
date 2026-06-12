import {
  index,
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { sql, relations } from "drizzle-orm";
import { customers } from "./identity";
import { products, product_variants, type VariationChain } from "./catalog";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  customer_id: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  status: text("status").notNull().default("PENDING"),
  status_description: text("status_description"),
  shipping_type: text("shipping_type").notNull().default("STANDARD"),
  total_amount: real("total_amount").notNull(),
  created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const checkout_attempts = sqliteTable(
  "checkout_attempts",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    customer_id: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    checkout_email: text("checkout_email").notNull(),
    full_name: text("full_name").notNull(),
    first_name: text("first_name"),
    last_name: text("last_name"),
    phone: text("phone").notNull(),
    street_address: text("street_address").notNull(),
    barangay: text("barangay").notNull(),
    city_province: text("city_province").notNull(),
    postal_code: text("postal_code").notNull(),
    privacy_acknowledged_at: text("privacy_acknowledged_at").notNull(),
    attempt_token_hash: text("attempt_token_hash").notNull().default(""),
    cart_fingerprint: text("cart_fingerprint"),
    reservation_id: text("reservation_id"),
    reservation_expires_at: text("reservation_expires_at"),
    status: text("status").notNull().default("DETAILS_CAPTURED"),
    created_request_id: text("created_request_id").notNull(),
    updated_request_id: text("updated_request_id"),
    created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_checkout_attempts_customer_id").on(table.customer_id),
    index("idx_checkout_attempts_checkout_email").on(table.checkout_email),
    index("idx_checkout_attempts_reservation_id").on(table.reservation_id),
    index("idx_checkout_attempts_created_at").on(table.created_at),
  ]
);

export const checkout_reservations = sqliteTable(
  "checkout_reservations",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    checkout_attempt_id: text("checkout_attempt_id")
      .notNull()
      .references(() => checkout_attempts.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("ACTIVE"),
    cart_fingerprint: text("cart_fingerprint").notNull(),
    subtotal_centavos: integer("subtotal_centavos").notNull().default(0),
    expires_at: text("expires_at").notNull(),
    created_request_id: text("created_request_id").notNull(),
    created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_checkout_reservations_attempt_id").on(table.checkout_attempt_id),
    index("idx_checkout_reservations_status").on(table.status),
    index("idx_checkout_reservations_expires_at").on(table.expires_at),
    uniqueIndex("uq_checkout_reservations_active_attempt_cart")
      .on(table.checkout_attempt_id, table.cart_fingerprint)
      .where(sql`${table.status} = 'ACTIVE'`),
  ]
);

export const checkout_reservation_items = sqliteTable(
  "checkout_reservation_items",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    reservation_id: text("reservation_id")
      .notNull()
      .references(() => checkout_reservations.id, { onDelete: "cascade" }),
    product_id: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    variant_id: text("variant_id").references(() => product_variants.id, {
      onDelete: "set null",
    }),
    quantity: integer("quantity").notNull(),
    price_centavos: integer("price_centavos").notNull(),
    reservation_mode: text("reservation_mode").notNull().default("STOCK"),
    created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_checkout_reservation_items_reservation_id").on(table.reservation_id),
    index("idx_checkout_reservation_items_variant_id").on(table.variant_id),
  ]
);

export const order_snapshots = sqliteTable(
  "order_snapshots",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    order_id: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    product_id: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    product_slug: text("product_slug"),
    variant_id: text("variant_id").references(() => product_variants.id, {
      onDelete: "set null",
    }),
    product_name: text("product_name").notNull(),
    variant_name: text("variant_name").notNull(),
    variant_options: text("variant_options", { mode: "json" })
      .$type<VariationChain[]>()
      .notNull()
      .default(sql`'[]'`),
    price_at_purchase: integer("price_at_purchase").notNull(),
    price_centavos: integer("price_centavos").notNull().default(0),
    quantity: integer("quantity").notNull().default(1),
    image_r2_key: text("image_r2_key"),
    snapshot_timestamp: text("snapshot_timestamp")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    snapshot_signature: text("snapshot_signature"),
  },
  (table) => [
    index("idx_order_snapshots_order_id").on(table.order_id),
    index("idx_order_snapshots_product_id").on(table.product_id),
    uniqueIndex("order_snapshots_signature_unique")
      .on(table.snapshot_signature)
      .where(sql`${table.snapshot_signature} IS NOT NULL`),
  ]
);

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  customer_id: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  product_id: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  order_id: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Relationships
export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customer_id], references: [customers.id] }),
  snapshots: many(order_snapshots),
  reviews: many(reviews),
}));

export const checkoutAttemptsRelations = relations(
  checkout_attempts,
  ({ one, many }) => ({
    customer: one(customers, {
      fields: [checkout_attempts.customer_id],
      references: [customers.id],
    }),
    reservations: many(checkout_reservations),
  })
);

export const checkoutReservationsRelations = relations(
  checkout_reservations,
  ({ one, many }) => ({
    attempt: one(checkout_attempts, {
      fields: [checkout_reservations.checkout_attempt_id],
      references: [checkout_attempts.id],
    }),
    items: many(checkout_reservation_items),
  })
);

export const checkoutReservationItemsRelations = relations(
  checkout_reservation_items,
  ({ one }) => ({
    reservation: one(checkout_reservations, {
      fields: [checkout_reservation_items.reservation_id],
      references: [checkout_reservations.id],
    }),
    product: one(products, {
      fields: [checkout_reservation_items.product_id],
      references: [products.id],
    }),
    variant: one(product_variants, {
      fields: [checkout_reservation_items.variant_id],
      references: [product_variants.id],
    }),
  })
);

export const orderSnapshotsRelations = relations(order_snapshots, ({ one }) => ({
  order: one(orders, { fields: [order_snapshots.order_id], references: [orders.id] }),
  product: one(products, { fields: [order_snapshots.product_id], references: [products.id] }),
  variant: one(product_variants, {
    fields: [order_snapshots.variant_id],
    references: [product_variants.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  customer: one(customers, { fields: [reviews.customer_id], references: [customers.id] }),
  product: one(products, { fields: [reviews.product_id], references: [products.id] }),
  order: one(orders, { fields: [reviews.order_id], references: [orders.id] }),
}));
