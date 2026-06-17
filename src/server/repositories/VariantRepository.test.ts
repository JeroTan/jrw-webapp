import { Miniflare } from "miniflare";
import { describe, expect, it } from "vitest";

import { createDb } from "@/adapter/infrastructure/db/client";
import { DrizzleVariantRepository } from "./VariantRepository";

async function createVariantReadTestD1() {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    d1Databases: ["DB"],
  });
  const d1 = await mf.getD1Database("DB");

  await d1
    .prepare(
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
      )`
    )
    .run();

  return { d1, mf };
}

describe("VariantRepository", { timeout: 20_000 }, () => {
  it("derives availability from stock when stored inventory state is stale", async () => {
    const { d1, mf } = await createVariantReadTestD1();

    try {
      await d1
        .prepare(
          `INSERT INTO product_variants (
            id, name, stock, inventory_state, price, sku, is_preorder,
            stock_lock_version, variation_chain, product_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "var_water_xl",
          "XL",
          24,
          "OUT_OF_STOCK",
          22,
          "WATER-XL",
          0,
          0,
          "[]",
          "prod_water"
        )
        .run();

      const repository = new DrizzleVariantRepository(createDb(d1));
      const variant = await repository.findById("var_water_xl");

      expect(variant).toMatchObject({
        availability: "Available",
        hasAvailableStock: true,
        inventoryState: "IN_STOCK",
        stock: 24,
      });
    } finally {
      await mf.dispose();
    }
  });
});
