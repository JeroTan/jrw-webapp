import { Miniflare } from "miniflare";
import { describe, expect, it } from "vitest";

import { createDb } from "@/adapter/infrastructure/db/client";
import { DrizzleProductRepository } from "./ProductRepository";

const now = "2026-06-02T12:00:00.000Z";

async function createProductReadinessTestD1() {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    d1Databases: ["DB"],
  });
  const d1 = await mf.getD1Database("DB");

  const schemaStatements = [
    `CREATE TABLE products (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      slug text NOT NULL,
      brand text,
      brand_id text,
      tags text DEFAULT '[]' NOT NULL,
      summary text,
      description text NOT NULL,
      status text DEFAULT 'DRAFT' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE categories (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      slug text NOT NULL,
      description text,
      sort_order integer DEFAULT 0 NOT NULL,
      is_visible integer DEFAULT 1 NOT NULL,
      status text DEFAULT 'ACTIVE' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE product_categories (
      product_id text NOT NULL,
      category_id text NOT NULL,
      PRIMARY KEY (product_id, category_id)
    )`,
    `CREATE TABLE product_photos (
      id text PRIMARY KEY NOT NULL,
      product_id text
    )`,
    `CREATE TABLE product_variants (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      stock integer DEFAULT 0 NOT NULL,
      inventory_state text DEFAULT 'OUT_OF_STOCK' NOT NULL,
      price integer NOT NULL,
      sku text NOT NULL UNIQUE,
      is_preorder integer DEFAULT 0 NOT NULL,
      expected_release text,
      stock_version integer DEFAULT 0 NOT NULL,
      stock_lock_version integer DEFAULT 0 NOT NULL,
      variation_chain text DEFAULT '[]' NOT NULL,
      image_reference_id text,
      product_id text NOT NULL
    )`,
  ];

  for (const statement of schemaStatements) {
    await d1.prepare(statement).run();
  }

  await d1
    .prepare(
      `INSERT INTO products (
        id, name, slug, description, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind("prod_1", "Example", "example", "Product body", "DRAFT", now, now)
    .run();
  await d1
    .prepare(
      `INSERT INTO categories (
        id, name, slug, is_visible, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind("cat_1", "Tee-shirt", "tee-shirt", 0, "ACTIVE", now, now)
    .run();
  await d1
    .prepare(
      `INSERT INTO product_categories (product_id, category_id)
       VALUES (?, ?)`
    )
    .bind("prod_1", "cat_1")
    .run();
  await d1
    .prepare(
      `INSERT INTO product_variants (
        id, name, stock, inventory_state, price, sku, is_preorder,
        stock_lock_version, variation_chain, product_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "var_active",
      "Small",
      7,
      "IN_STOCK",
      100,
      "EXAMPLE-SMALL",
      0,
      0,
      "[]",
      "prod_1"
    )
    .run();
  await d1
    .prepare(
      `INSERT INTO product_variants (
        id, name, stock, inventory_state, price, sku, is_preorder,
        stock_lock_version, variation_chain, product_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "var_archived",
      "Archived",
      99,
      "IN_STOCK",
      100,
      "EXAMPLE-ARCHIVED",
      0,
      -1,
      "[]",
      "prod_1"
    )
    .run();

  return { d1, mf };
}

describe("ProductRepository", { timeout: 20_000 }, () => {
  it("counts active category links and variants for publish readiness", async () => {
    const { d1, mf } = await createProductReadinessTestD1();

    try {
      const repository = new DrizzleProductRepository(createDb(d1));
      const readiness = await repository.getPublishReadiness("prod_1");

      expect(readiness).toMatchObject({
        categoryCount: 1,
        variantCount: 1,
        availableVariantCount: 1,
        variantsMissingPriceCount: 0,
        variantsMissingSkuCount: 0,
      });
    } finally {
      await mf.dispose();
    }
  });
});
