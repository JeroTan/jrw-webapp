import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { sql, relations } from "drizzle-orm";

export type VariationChain = {
  name: string;
  group: string;
};

export const products = sqliteTable("products", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  brand: text("brand"),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  description: text("description").notNull(),
  created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const product_photos = sqliteTable("product_photos", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name"),
  image_link: text("image_link").notNull(),
  product_id: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  type: text("type").notNull(), // CLOTHING, STYLE, SEASON
});

export const product_categories = sqliteTable("product_categories", {
  product_id: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  category_id: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ name: "product_categories_pk", columns: [t.product_id, t.category_id] }),
]);

export const product_variants = sqliteTable("product_variants", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  stock: integer("stock").notNull().default(0),
  price: real("price").notNull(),
  sku: text("sku").notNull().unique(),
  is_preorder: integer("is_preorder", { mode: "boolean" }).notNull().default(false),
  expected_release: text("expected_release"),
  stock_lock_version: integer("stock_lock_version").notNull().default(0),
  variation_chain: text("variation_chain", { mode: "json" }).$type<VariationChain[]>().notNull().default(sql`'[]'`),
  image_reference_id: text("image_reference_id").references(() => product_photos.id, { onDelete: "set null" }),
  product_id: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
});

// Relationships
export const productsRelations = relations(products, ({ many }) => ({
  photos: many(product_photos),
  variants: many(product_variants),
  categories: many(product_categories),
}));

export const productVariantsRelations = relations(product_variants, ({ one }) => ({
  product: one(products, { fields: [product_variants.product_id], references: [products.id] }),
  image_reference: one(product_photos, { fields: [product_variants.image_reference_id], references: [product_photos.id] }),
}));

export const productPhotosRelations = relations(product_photos, ({ one, many }) => ({
  product: one(products, { fields: [product_photos.product_id], references: [products.id] }),
  variants: many(product_variants),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(product_categories),
}));
