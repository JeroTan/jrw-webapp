import { Miniflare } from "miniflare";
import { describe, expect, it } from "vitest";
import { createDb } from "@/adapter/infrastructure/db/client";
import { DrizzleSnapshotRepository } from "./SnapshotRepository";

const now = "2026-05-21T12:00:00.000Z";

async function createSnapshotTestD1() {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    d1Databases: ["DB"],
  });
  const d1 = await mf.getD1Database("DB");

  const statements = [
    `CREATE TABLE customers (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
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
    `CREATE TABLE orders (
      id text PRIMARY KEY NOT NULL,
      customer_id text,
      status text DEFAULT 'PENDING' NOT NULL,
      status_description text,
      shipping_type text DEFAULT 'STANDARD' NOT NULL,
      total_amount real NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE order_snapshots (
      id text PRIMARY KEY NOT NULL,
      order_id text NOT NULL,
      product_id text,
      product_slug text,
      variant_id text,
      product_name text NOT NULL,
      variant_name text NOT NULL,
      variant_options text DEFAULT '[]' NOT NULL,
      price_at_purchase integer NOT NULL,
      price_centavos integer DEFAULT 0 NOT NULL,
      quantity integer DEFAULT 1 NOT NULL,
      image_r2_key text,
      snapshot_timestamp text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      snapshot_signature text
    )`,
    `CREATE UNIQUE INDEX order_snapshots_signature_unique ON order_snapshots(snapshot_signature) WHERE snapshot_signature IS NOT NULL`,
    `CREATE INDEX idx_order_snapshots_order_id ON order_snapshots(order_id)`,
  ];

  for (const statement of statements) {
    await d1.prepare(statement).run();
  }

  await d1
    .prepare(
      `INSERT INTO products (id, name, slug, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind("prod_1", "Desk Lamp", "desk-lamp", "Lamp", "PUBLISHED", now, now)
    .run();
  await d1
    .prepare(
      `INSERT INTO product_variants (
        id, name, price, sku, variation_chain, product_id
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "var_1",
      "Small Black",
      1999,
      "SKU-S-BLK",
      JSON.stringify([{ group: "Size", name: "Small" }]),
      "prod_1"
    )
    .run();
  await d1
    .prepare(`INSERT INTO orders (id, total_amount) VALUES (?, ?)`)
    .bind("order_1", 1999)
    .run();

  return { d1, mf };
}

function snapshotInput(overrides = {}) {
  return {
    orderId: "order_1",
    productId: "prod_1",
    productName: "Desk Lamp",
    productSlug: "desk-lamp",
    variantId: "var_1",
    variantLabel: "Small",
    variantOptions: [{ group: "Size", name: "Small" }],
    priceCentavos: 1999,
    quantity: 2,
    imageReference: "products/prod_1/variant.png",
    snapshotTimestamp: now,
    ...overrides,
  };
}

describe("SnapshotRepository", { timeout: 20_000 }, () => {
  it("inserts and reads complete immutable snapshot fields", async () => {
    const { d1, mf } = await createSnapshotTestD1();

    try {
      const repository = new DrizzleSnapshotRepository(createDb(d1));
      const created = await repository.createSnapshot(snapshotInput());
      const found = await repository.getSnapshot(created.id);

      expect(found).toEqual(created);
      expect(found).toMatchObject({
        orderId: "order_1",
        productId: "prod_1",
        productSlug: "desk-lamp",
        variantId: "var_1",
        variantLabel: "Small",
        priceCentavos: 1999,
        quantity: 2,
        imageReference: "products/prod_1/variant.png",
        snapshotTimestamp: now,
      });
    } finally {
      await mf.dispose();
    }
  });

  it("reuses exact duplicate snapshot for same order line but creates new row when captured fields change", async () => {
    const { d1, mf } = await createSnapshotTestD1();

    try {
      const repository = new DrizzleSnapshotRepository(createDb(d1));
      const first = await repository.createSnapshot(snapshotInput());
      const duplicate = await repository.createSnapshot(snapshotInput());
      const changed = await repository.createSnapshot(
        snapshotInput({ productName: "Desk Lamp Renamed" })
      );

      expect(duplicate.id).toBe(first.id);
      expect(changed.id).not.toBe(first.id);

      const count = await d1
        .prepare(`SELECT count(*) AS count FROM order_snapshots`)
        .first<{ count: number }>();
      expect(Number(count?.count ?? 0)).toBe(2);
    } finally {
      await mf.dispose();
    }
  });

  it("persists legal variant labels longer than generic snapshot text", async () => {
    const { d1, mf } = await createSnapshotTestD1();

    try {
      const repository = new DrizzleSnapshotRepository(createDb(d1));
      const variantOptions = Array.from({ length: 3 }, (_, index) => ({
        group: `Group ${index + 1}`,
        name: "X".repeat(120),
      }));
      const variantLabel = variantOptions
        .map((option) => option.name)
        .join(" / ");

      expect(variantLabel.length).toBeGreaterThan(255);

      const created = await repository.createSnapshot(
        snapshotInput({
          id: "snap_long_label",
          variantLabel,
          variantOptions,
        })
      );

      expect(created.variantLabel).toBe(variantLabel);
      expect(created.variantOptions).toEqual(variantOptions);
    } finally {
      await mf.dispose();
    }
  });

  it("lists snapshots by order id", async () => {
    const { d1, mf } = await createSnapshotTestD1();

    try {
      const repository = new DrizzleSnapshotRepository(createDb(d1));
      const first = await repository.createSnapshot(
        snapshotInput({ id: "snap_1" })
      );
      const second = await repository.createSnapshot(
        snapshotInput({
          id: "snap_2",
          variantId: "var_2",
          variantLabel: "Large",
        })
      );

      const items = await repository.getSnapshotsByOrderId("order_1");

      expect(items.map((item) => item.id)).toEqual([first.id, second.id]);
    } finally {
      await mf.dispose();
    }
  });

  it("rejects invalid snapshot before any partial insert", async () => {
    const { d1, mf } = await createSnapshotTestD1();

    try {
      const repository = new DrizzleSnapshotRepository(createDb(d1));
      await expect(
        repository.createSnapshot(snapshotInput({ quantity: 0 }))
      ).rejects.toThrow("SNAPSHOT_VALIDATION_FAILED");

      const count = await d1
        .prepare(`SELECT count(*) AS count FROM order_snapshots`)
        .first<{ count: number }>();
      expect(Number(count?.count ?? 0)).toBe(0);
    } finally {
      await mf.dispose();
    }
  });
});
