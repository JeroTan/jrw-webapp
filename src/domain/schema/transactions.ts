import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { sql, relations } from "drizzle-orm";
import { customers } from "./identity";
import { products } from "./catalog";

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

export const order_snapshots = sqliteTable("order_snapshots", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  order_id: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  product_id: text("product_id").references(() => products.id, { onDelete: "set null" }),
  product_name: text("product_name").notNull(),
  variant_name: text("variant_name").notNull(),
  price_at_purchase: real("price_at_purchase").notNull(),
  quantity: integer("quantity").notNull().default(1),
});

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

export const orderSnapshotsRelations = relations(order_snapshots, ({ one }) => ({
  order: one(orders, { fields: [order_snapshots.order_id], references: [orders.id] }),
  product: one(products, { fields: [order_snapshots.product_id], references: [products.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  customer: one(customers, { fields: [reviews.customer_id], references: [customers.id] }),
  product: one(products, { fields: [reviews.product_id], references: [products.id] }),
  order: one(orders, { fields: [reviews.order_id], references: [orders.id] }),
}));
