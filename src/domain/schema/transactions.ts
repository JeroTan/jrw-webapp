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
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  customer_id: text("customer_id").references(() => customers.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("PENDING"),
  status_description: text("status_description"),
  shipping_type: text("shipping_type").notNull().default("STANDARD"),
  total_amount: real("total_amount").notNull(),
  created_at: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const checkout_attempts = sqliteTable(
  "checkout_attempts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
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
    created_at: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
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
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    checkout_attempt_id: text("checkout_attempt_id")
      .notNull()
      .references(() => checkout_attempts.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("ACTIVE"),
    cart_fingerprint: text("cart_fingerprint").notNull(),
    subtotal_centavos: integer("subtotal_centavos").notNull().default(0),
    expires_at: text("expires_at").notNull(),
    created_request_id: text("created_request_id").notNull(),
    created_at: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_checkout_reservations_attempt_id").on(table.checkout_attempt_id),
    index("idx_checkout_reservations_status").on(table.status),
    index("idx_checkout_reservations_expires_at").on(table.expires_at),
    uniqueIndex("uq_checkout_reservations_active_attempt")
      .on(table.checkout_attempt_id)
      .where(sql`${table.status} = 'ACTIVE'`),
    uniqueIndex("uq_checkout_reservations_active_attempt_cart")
      .on(table.checkout_attempt_id, table.cart_fingerprint)
      .where(sql`${table.status} = 'ACTIVE'`),
  ]
);

export const checkout_reservation_items = sqliteTable(
  "checkout_reservation_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
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
    created_at: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_checkout_reservation_items_reservation_id").on(
      table.reservation_id
    ),
    index("idx_checkout_reservation_items_variant_id").on(table.variant_id),
  ]
);

export const checkout_payments = sqliteTable(
  "checkout_payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    checkout_attempt_id: text("checkout_attempt_id")
      .notNull()
      .references(() => checkout_attempts.id, { onDelete: "cascade" }),
    reservation_id: text("reservation_id")
      .notNull()
      .references(() => checkout_reservations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("PAYMONGO"),
    provider_checkout_session_id: text("provider_checkout_session_id")
      .notNull(),
    provider_reference_number: text("provider_reference_number").notNull(),
    status: text("status").notNull().default("PAYMENT_PENDING"),
    amount_centavos: integer("amount_centavos").notNull(),
    currency: text("currency").notNull().default("PHP"),
    checkout_url: text("checkout_url").notNull(),
    livemode: integer("livemode", { mode: "boolean" })
      .notNull()
      .default(false),
    created_request_id: text("created_request_id").notNull(),
    updated_request_id: text("updated_request_id"),
    created_at: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_checkout_payments_attempt_id").on(table.checkout_attempt_id),
    index("idx_checkout_payments_reservation_id").on(table.reservation_id),
    index("idx_checkout_payments_status").on(table.status),
    index("idx_checkout_payments_created_at").on(table.created_at),
    uniqueIndex("uq_checkout_payments_provider_session").on(
      table.provider_checkout_session_id
    ),
    uniqueIndex("uq_checkout_payments_provider_reference").on(
      table.provider_reference_number
    ),
    uniqueIndex("uq_checkout_payments_pending_attempt_reservation")
      .on(table.checkout_attempt_id, table.reservation_id)
      .where(sql`${table.status} = 'PAYMENT_PENDING'`),
  ]
);

export const checkout_payment_items = sqliteTable(
  "checkout_payment_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    payment_id: text("payment_id")
      .notNull()
      .references(() => checkout_payments.id, { onDelete: "cascade" }),
    product_id: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    variant_id: text("variant_id").references(() => product_variants.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    amount_centavos: integer("amount_centavos").notNull(),
    currency: text("currency").notNull().default("PHP"),
    quantity: integer("quantity").notNull(),
    created_at: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_checkout_payment_items_payment_id").on(table.payment_id),
    index("idx_checkout_payment_items_variant_id").on(table.variant_id),
  ]
);

export const payment_webhook_events = sqliteTable(
  "payment_webhook_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    provider: text("provider").notNull().default("PAYMONGO"),
    provider_event_id: text("provider_event_id").notNull(),
    event_type: text("event_type").notNull(),
    payload_hash: text("payload_hash").notNull(),
    processing_status: text("processing_status").notNull().default("RECEIVED"),
    related_payment_id: text("related_payment_id").references(
      () => checkout_payments.id,
      { onDelete: "set null" }
    ),
    provider_checkout_session_id: text("provider_checkout_session_id"),
    provider_payment_id: text("provider_payment_id"),
    provider_payment_intent_id: text("provider_payment_intent_id"),
    first_request_id: text("first_request_id").notNull(),
    last_request_id: text("last_request_id").notNull(),
    received_at: text("received_at").notNull(),
    processed_at: text("processed_at"),
    created_at: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("uq_payment_webhook_events_provider_event_id").on(
      table.provider_event_id
    ),
    index("idx_payment_webhook_events_event_type").on(table.event_type),
    index("idx_payment_webhook_events_processing_status").on(
      table.processing_status
    ),
    index("idx_payment_webhook_events_related_payment_id").on(
      table.related_payment_id
    ),
    index("idx_payment_webhook_events_created_at").on(table.created_at),
  ]
);

export const order_snapshots = sqliteTable(
  "order_snapshots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
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
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  customer_id: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  product_id: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  order_id: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  created_at: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Relationships
export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customer_id],
    references: [customers.id],
  }),
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
    payments: many(checkout_payments),
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
    payments: many(checkout_payments),
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

export const checkoutPaymentsRelations = relations(
  checkout_payments,
  ({ one, many }) => ({
    attempt: one(checkout_attempts, {
      fields: [checkout_payments.checkout_attempt_id],
      references: [checkout_attempts.id],
    }),
    reservation: one(checkout_reservations, {
      fields: [checkout_payments.reservation_id],
      references: [checkout_reservations.id],
    }),
    items: many(checkout_payment_items),
    webhookEvents: many(payment_webhook_events),
  })
);

export const checkoutPaymentItemsRelations = relations(
  checkout_payment_items,
  ({ one }) => ({
    payment: one(checkout_payments, {
      fields: [checkout_payment_items.payment_id],
      references: [checkout_payments.id],
    }),
    product: one(products, {
      fields: [checkout_payment_items.product_id],
      references: [products.id],
    }),
    variant: one(product_variants, {
      fields: [checkout_payment_items.variant_id],
      references: [product_variants.id],
    }),
  })
);

export const paymentWebhookEventsRelations = relations(
  payment_webhook_events,
  ({ one }) => ({
    payment: one(checkout_payments, {
      fields: [payment_webhook_events.related_payment_id],
      references: [checkout_payments.id],
    }),
  })
);

export const orderSnapshotsRelations = relations(
  order_snapshots,
  ({ one }) => ({
    order: one(orders, {
      fields: [order_snapshots.order_id],
      references: [orders.id],
    }),
    product: one(products, {
      fields: [order_snapshots.product_id],
      references: [products.id],
    }),
    variant: one(product_variants, {
      fields: [order_snapshots.variant_id],
      references: [product_variants.id],
    }),
  })
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  customer: one(customers, {
    fields: [reviews.customer_id],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [reviews.product_id],
    references: [products.id],
  }),
  order: one(orders, { fields: [reviews.order_id], references: [orders.id] }),
}));
