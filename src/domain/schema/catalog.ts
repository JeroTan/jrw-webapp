import {
  index,
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { sql, relations } from "drizzle-orm";
import { admins } from "./identity";

export type VariationChain = {
  name: string;
  group: string;
};

export const brandStatusValues = ["ACTIVE", "ARCHIVED"] as const;
export const brandMembershipRoleValues = ["OWNER", "MEMBER"] as const;
export const brandMembershipStatusValues = [
  "ACTIVE",
  "PENDING",
  "REVOKED",
] as const;

export const brands = sqliteTable(
  "brands",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: text("status", { enum: brandStatusValues })
      .notNull()
      .default("ACTIVE"),
    created_by_admin_id: text("created_by_admin_id")
      .notNull()
      .references(() => admins.id),
    archived_at: text("archived_at"),
    created_at: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("brands_name_unique").on(table.name),
    uniqueIndex("brands_slug_unique").on(table.slug),
    index("idx_brands_slug").on(table.slug),
    index("idx_brands_status").on(table.status),
  ]
);

export const brand_memberships = sqliteTable(
  "brand_memberships",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    brand_id: text("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    admin_id: text("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    role: text("role", { enum: brandMembershipRoleValues })
      .notNull()
      .default("MEMBER"),
    status: text("status", { enum: brandMembershipStatusValues })
      .notNull()
      .default("ACTIVE"),
    invited_by_admin_id: text("invited_by_admin_id").references(
      () => admins.id,
      { onDelete: "set null" }
    ),
    created_at: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("uq_brand_memberships_brand_admin").on(
      table.brand_id,
      table.admin_id
    ),
    index("idx_brand_memberships_admin").on(table.admin_id),
    index("idx_brand_memberships_brand").on(table.brand_id),
  ]
);

export const products = sqliteTable("products", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  name: text("name").notNull(),
  brand: text("brand"),
  tags: text("tags", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  description: text("description").notNull(),
  created_at: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const product_photos = sqliteTable("product_photos", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name"),
  image_id: text("image_id").notNull(),
  product_id: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
});

export const categories = sqliteTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  type: text("type").notNull(), // CLOTHING, STYLE, SEASON
});

export const product_categories = sqliteTable(
  "product_categories",
  {
    product_id: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    category_id: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({
      name: "product_categories_pk",
      columns: [t.product_id, t.category_id],
    }),
  ]
);

export const product_variants = sqliteTable("product_variants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  stock: integer("stock").notNull().default(0),
  price: real("price").notNull(),
  sku: text("sku").notNull().unique(),
  is_preorder: integer("is_preorder", { mode: "boolean" })
    .notNull()
    .default(false),
  expected_release: text("expected_release"),
  stock_lock_version: integer("stock_lock_version").notNull().default(0),
  variation_chain: text("variation_chain", { mode: "json" })
    .$type<VariationChain[]>()
    .notNull()
    .default(sql`'[]'`),
  image_reference_id: text("image_reference_id").references(
    () => product_photos.id,
    { onDelete: "set null" }
  ),
  product_id: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
});

// Relationships
export const productsRelations = relations(products, ({ many }) => ({
  photos: many(product_photos),
  variants: many(product_variants),
  categories: many(product_categories),
}));

export const brandsRelations = relations(brands, ({ many, one }) => ({
  memberships: many(brand_memberships),
  createdByAdmin: one(admins, {
    fields: [brands.created_by_admin_id],
    references: [admins.id],
  }),
}));

export const brandMembershipsRelations = relations(
  brand_memberships,
  ({ one }) => ({
    brand: one(brands, {
      fields: [brand_memberships.brand_id],
      references: [brands.id],
    }),
    admin: one(admins, {
      fields: [brand_memberships.admin_id],
      references: [admins.id],
    }),
    invitedByAdmin: one(admins, {
      fields: [brand_memberships.invited_by_admin_id],
      references: [admins.id],
    }),
  })
);

export const productVariantsRelations = relations(
  product_variants,
  ({ one }) => ({
    product: one(products, {
      fields: [product_variants.product_id],
      references: [products.id],
    }),
    image_reference: one(product_photos, {
      fields: [product_variants.image_reference_id],
      references: [product_photos.id],
    }),
  })
);

export const productPhotosRelations = relations(
  product_photos,
  ({ one, many }) => ({
    product: one(products, {
      fields: [product_photos.product_id],
      references: [products.id],
    }),
    variants: many(product_variants),
  })
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(product_categories),
}));
