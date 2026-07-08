import { Miniflare } from "miniflare";
import { describe, expect, it } from "vitest";
import { createDb } from "@/adapter/infrastructure/db/client";
import { DrizzleOrderRepository } from "./OrderRepository";

const now = "2026-07-08T01:00:00.000Z";

async function createOrderRepositoryTestD1() {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    d1Databases: ["DB"],
  });
  const d1 = await mf.getD1Database("DB");

  for (const statement of [
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
      order_number text,
      customer_id text,
      checkout_attempt_id text,
      reservation_id text,
      payment_id text,
      status text DEFAULT 'PENDING' NOT NULL,
      status_description text,
      shipping_type text DEFAULT 'STANDARD' NOT NULL,
      total_amount real NOT NULL,
      checkout_email text,
      full_name text,
      phone text,
      street_address text,
      barangay text,
      city_province text,
      postal_code text,
      payment_status text DEFAULT 'PAYMENT_PENDING' NOT NULL,
      fulfillment_status text DEFAULT 'ORDER_PLACED' NOT NULL,
      subtotal_centavos integer DEFAULT 0 NOT NULL,
      total_centavos integer DEFAULT 0 NOT NULL,
      currency text DEFAULT 'PHP' NOT NULL,
      order_confirmation_email_status text DEFAULT 'PENDING' NOT NULL,
      order_confirmation_email_sent_at text,
      order_confirmation_email_last_attempt_at text,
      order_confirmation_email_message_id text,
      created_request_id text,
      updated_request_id text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE UNIQUE INDEX uq_orders_order_number ON orders(order_number)
      WHERE order_number IS NOT NULL`,
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
  ]) {
    await d1.prepare(statement).run();
  }

  await d1
    .prepare(`INSERT INTO customers (id, email) VALUES (?, ?), (?, ?)`)
    .bind("customer_1", "nina@example.test", "customer_2", "mika@example.test")
    .run();
  await d1
    .prepare(
      `INSERT INTO products (id, name, slug, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "prod_linen",
      "Mutable Catalog Shirt",
      "linen-shirt",
      "Current product text",
      "PUBLISHED",
      now,
      now
    )
    .run();
  await d1
    .prepare(
      `INSERT INTO product_variants (id, name, price, sku, variation_chain, product_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "variant_linen_small",
      "Mutable Catalog Size",
      2999,
      "SKU-LINEN-S",
      JSON.stringify([{ group: "Size", name: "Changed" }]),
      "prod_linen"
    )
    .run();
  await d1
    .prepare(
      `INSERT INTO orders (
        id, order_number, customer_id, payment_id, total_amount, checkout_email,
        full_name, phone, street_address, barangay, city_province, postal_code,
        payment_status, fulfillment_status, subtotal_centavos, total_centavos,
        currency, created_request_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "order_1",
      "JRW-2026-ORDER1",
      "customer_1",
      "payment_1",
      999999,
      "nina@example.test",
      "Nina Reyes",
      "09171234567",
      "12 Sampaguita Street",
      "Poblacion",
      "Makati",
      "1200",
      "PAYMENT_PAID",
      "SHIPPED",
      3998,
      3998,
      "PHP",
      "req_order_1",
      now,
      now,
      "order_2",
      "JRW-2026-ORDER2",
      "customer_2",
      "payment_2",
      888888,
      "mika@example.test",
      "Mika Santos",
      "09175550123",
      "88 Secret Street",
      "Poblacion",
      "Makati",
      "1200",
      "PAYMENT_PENDING",
      "ORDER_PLACED",
      1999,
      1999,
      "PHP",
      "req_order_2",
      now,
      now
    )
    .run();
  await d1
    .prepare(
      `INSERT INTO order_snapshots (
        id, order_id, product_id, product_slug, variant_id, product_name,
        variant_name, variant_options, price_at_purchase, price_centavos,
        quantity, image_r2_key, snapshot_timestamp, snapshot_signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "snapshot_1",
      "order_1",
      "prod_linen",
      "frozen-linen-shirt",
      "variant_linen_small",
      "Frozen Linen Shirt",
      "Size: Small",
      JSON.stringify([{ group: "Size", name: "Small" }]),
      1999,
      1999,
      2,
      null,
      "2026-07-08T01:01:00.000Z",
      "sig_1",
      "snapshot_2",
      "order_2",
      "prod_linen",
      "other-shirt",
      "variant_linen_small",
      "Other Customer Shirt",
      "Size: Small",
      JSON.stringify([{ group: "Size", name: "Small" }]),
      1999,
      1999,
      1,
      "orders/order_2/image.webp",
      "2026-07-08T01:02:00.000Z",
      "sig_2"
    )
    .run();

  const repository = new DrizzleOrderRepository(createDb(d1));

  return { d1, mf, repository };
}

describe("order repository", () => {
  it("lists only customer-owned orders with snapshot totals and safe lanes", async () => {
    const { mf, repository } = await createOrderRepositoryTestD1();

    try {
      const result = await repository.listCustomerOrders({
        customerId: "customer_1",
        page: 1,
        pageSize: 20,
      });

      expect(result).toMatchObject({
        items: [
          {
            currency: "PHP",
            fulfillment: { label: "Shipped", value: "SHIPPED" },
            itemCount: 1,
            orderId: "order_1",
            orderNumber: "JRW-2026-ORDER1",
            payment: { label: "Payment paid", value: "PAYMENT_PAID" },
            refund: { value: "REFUND_NOT_REQUESTED" },
            return: { value: "RETURN_NOT_REQUESTED" },
            totalCentavos: 3998,
            totalQuantity: 2,
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        },
      });
      expect(JSON.stringify(result)).not.toContain("order_2");
      expect(JSON.stringify(result)).not.toMatch(
        /nina@example|0917|Sampaguita|checkout|provider|payment_1|req_order|message_id/i
      );
    } finally {
      await mf.dispose();
    }
  });

  it("gets owned detail by id or order number and never joins mutable catalog truth", async () => {
    const { d1, mf, repository } = await createOrderRepositoryTestD1();

    try {
      await d1
        .prepare(`UPDATE products SET name = ? WHERE id = ?`)
        .bind("Current Catalog Name", "prod_linen")
        .run();

      const byId = await repository.getCustomerOrderDetail({
        customerId: "customer_1",
        orderIdOrNumber: "order_1",
      });
      const byNumber = await repository.getCustomerOrderDetail({
        customerId: "customer_1",
        orderIdOrNumber: "JRW-2026-ORDER1",
      });
      const crossCustomer = await repository.getCustomerOrderDetail({
        customerId: "customer_1",
        orderIdOrNumber: "order_2",
      });

      expect(byId).toMatchObject({
        items: [
          {
            imageR2Key: null,
            lineTotalCentavos: 3998,
            productName: "Frozen Linen Shirt",
            productSlug: "frozen-linen-shirt",
            quantity: 2,
            unitPriceCentavos: 1999,
            variantLabel: "Size: Small",
            variantOptions: [{ group: "Size", name: "Small" }],
          },
        ],
        orderId: "order_1",
        orderNumber: "JRW-2026-ORDER1",
      });
      expect(byNumber).toEqual(byId);
      expect(crossCustomer).toBeNull();
      expect(JSON.stringify(byId)).not.toContain("Current Catalog Name");
      expect(JSON.stringify(byId)).not.toMatch(
        /nina@example|0917|Sampaguita|provider|payment_1|token|secret|card/i
      );
    } finally {
      await mf.dispose();
    }
  });
});
