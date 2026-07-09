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
    `CREATE TABLE product_photos (
      id text PRIMARY KEY NOT NULL,
      name text,
      image_id text NOT NULL,
      r2_key text NOT NULL,
      sort_order integer DEFAULT 0 NOT NULL,
      is_primary integer DEFAULT 0 NOT NULL,
      file_size integer,
      content_type text,
      width integer,
      height integer,
      product_id text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
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
    `CREATE TABLE order_fulfillment_events (
      id text PRIMARY KEY NOT NULL,
      order_id text NOT NULL,
      actor_id text,
      old_fulfillment_status text NOT NULL,
      new_fulfillment_status text NOT NULL,
      request_id text NOT NULL,
      email_status text DEFAULT 'PENDING' NOT NULL,
      email_sent_at text,
      email_last_attempt_at text,
      email_message_id text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE UNIQUE INDEX uq_order_fulfillment_events_request_id
      ON order_fulfillment_events(request_id)`,
    `CREATE INDEX idx_order_fulfillment_events_order_id
      ON order_fulfillment_events(order_id)`,
    `CREATE INDEX idx_order_fulfillment_events_email_status
      ON order_fulfillment_events(email_status)`,
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
      `INSERT INTO product_photos (
        id, image_id, r2_key, sort_order, is_primary, product_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "photo_linen_primary",
      "image_linen_primary",
      "products/prod_linen/primary.webp",
      0,
      1,
      "prod_linen",
      now,
      now
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
      "products/frozen-linen-shirt/front.webp",
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
      null,
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
  }, 20_000);

  it("gets owned detail by id or order number and never joins mutable catalog truth", async () => {
    const { d1, mf, repository } = await createOrderRepositoryTestD1();

    try {
      await d1
        .prepare(`UPDATE products SET name = ? WHERE id = ?`)
        .bind("Current Catalog Name", "prod_linen")
        .run();
      await d1
        .prepare(`UPDATE product_photos SET r2_key = ? WHERE id = ?`)
        .bind("products/prod_linen/mutated.webp", "photo_linen_primary")
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
            imageR2Key: "products/frozen-linen-shirt/front.webp",
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
  }, 20_000);

  it("lists Admin orders with safe summaries, filters, max page size, and stable newest-first sorting", async () => {
    const { mf, repository } = await createOrderRepositoryTestD1();

    try {
      const result = await repository.listAdminOrders({
        page: 1,
        pageSize: 500,
      });
      const searchResult = await repository.listAdminOrders({
        search: "ORDER1",
      });
      const paymentResult = await repository.listAdminOrders({
        paymentStatus: "PAYMENT_PENDING",
      });
      const fulfillmentResult = await repository.listAdminOrders({
        fulfillmentStatus: "SHIPPED",
      });
      const dateResult = await repository.listAdminOrders({
        createdFrom: "2026-07-08T01:00:00.000Z",
        createdTo: "2026-07-08T01:00:00.000Z",
      });
      const dateOnlyResult = await repository.listAdminOrders({
        createdFrom: "2026-07-08",
        createdTo: "2026-07-08",
      });

      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 100,
        totalItems: 2,
        totalPages: 1,
      });
      expect(result.items.map((order) => order.orderId)).toEqual([
        "order_2",
        "order_1",
      ]);
      expect(result.items[1]).toMatchObject({
        checkoutEmailMasked: "n***@example.test",
        customerKind: "CUSTOMER",
        customerLabel: "Nina R.",
        itemCount: 1,
        orderId: "order_1",
        totalQuantity: 2,
      });
      expect(result.items[0]?.items[0]?.imageR2Key).toBeNull();
      expect(searchResult.items.map((order) => order.orderId)).toEqual([
        "order_1",
      ]);
      expect(paymentResult.items.map((order) => order.orderId)).toEqual([
        "order_2",
      ]);
      expect(fulfillmentResult.items.map((order) => order.orderId)).toEqual([
        "order_1",
      ]);
      expect(dateResult.pagination.totalItems).toBe(2);
      expect(dateOnlyResult.pagination.totalItems).toBe(2);
      expect(JSON.stringify(result)).not.toMatch(
        /0917|Sampaguita|Secret Street|payment_1|payment_2|checkout_attempt|reservation|req_order|message_id|provider|token|secret|card/i
      );
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("gets Admin detail by id or order number with fulfillment contact allowlist and snapshot items", async () => {
    const { d1, mf, repository } = await createOrderRepositoryTestD1();

    try {
      await d1
        .prepare(`UPDATE products SET name = ? WHERE id = ?`)
        .bind("Current Catalog Name", "prod_linen")
        .run();
      await d1
        .prepare(`UPDATE product_photos SET r2_key = ? WHERE id = ?`)
        .bind("products/prod_linen/mutated.webp", "photo_linen_primary")
        .run();

      const byId = await repository.getAdminOrderDetail({
        orderIdOrNumber: "order_1",
      });
      const byNumber = await repository.getAdminOrderDetail({
        orderIdOrNumber: "JRW-2026-ORDER1",
      });
      const missing = await repository.getAdminOrderDetail({
        orderIdOrNumber: "missing",
      });

      expect(byId).toMatchObject({
        contact: {
          checkoutEmail: "nina@example.test",
          fullName: "Nina Reyes",
          phone: "09171234567",
        },
        customerLabel: "Nina R.",
        items: [
          {
            imageR2Key: "products/frozen-linen-shirt/front.webp",
            lineTotalCentavos: 3998,
            productName: "Frozen Linen Shirt",
            productSlug: "frozen-linen-shirt",
            quantity: 2,
            unitPriceCentavos: 1999,
            variantLabel: "Size: Small",
          },
        ],
        orderId: "order_1",
        shippingAddress: {
          barangay: "Poblacion",
          cityProvince: "Makati",
          postalCode: "1200",
          shippingType: "STANDARD",
          streetAddress: "12 Sampaguita Street",
        },
      });
      expect(byNumber).toEqual(byId);
      expect(missing).toBeNull();
      expect(JSON.stringify(byId)).not.toContain("Current Catalog Name");
      expect(JSON.stringify(byId)).not.toMatch(
        /payment_1|checkout_attempt|reservation_id|created_request_id|updated_request_id|message_id|checkout_url|provider|token|secret|signature|card/i
      );
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("persists paid fulfillment transitions atomically with event and email state", async () => {
    const { d1, mf, repository } = await createOrderRepositoryTestD1();

    try {
      const transition = await repository.transitionAdminOrderFulfillment({
        actorId: "admin_1",
        expectedFulfillmentStatus: "SHIPPED",
        now: "2026-07-08T02:00:00.000Z",
        orderId: "order_1",
        requestId: "req_fulfillment_ship",
        targetStatus: "DELIVERED",
      });

      expect(transition).toMatchObject({
        decision: "transitioned",
        event: {
          emailStatus: "PENDING",
          newFulfillmentStatus: "DELIVERED",
          oldFulfillmentStatus: "SHIPPED",
          orderId: "order_1",
          requestId: "req_fulfillment_ship",
        },
        order: {
          fulfillment: { value: "DELIVERED" },
          orderId: "order_1",
        },
      });

      const stale = await repository.transitionAdminOrderFulfillment({
        actorId: "admin_1",
        expectedFulfillmentStatus: "SHIPPED",
        now: "2026-07-08T02:01:00.000Z",
        orderId: "order_1",
        requestId: "req_fulfillment_stale",
        targetStatus: "DELIVERED",
      });
      expect(stale).toMatchObject({
        currentFulfillmentStatus: "DELIVERED",
        decision: "stale",
      });

      await d1
        .prepare(`UPDATE orders SET payment_status = ? WHERE id = ?`)
        .bind("PAYMENT_PAID", "order_2")
        .run();

      const mismatchedRequestId =
        await repository.transitionAdminOrderFulfillment({
          actorId: "admin_1",
          expectedFulfillmentStatus: "ORDER_PLACED",
          now: "2026-07-08T02:02:00.000Z",
          orderId: "order_2",
          requestId: "req_fulfillment_ship",
          targetStatus: "PROCESSING",
        });
      expect(mismatchedRequestId).toMatchObject({
        currentFulfillmentStatus: "ORDER_PLACED",
        decision: "stale",
        orderId: "order_2",
      });

      const order2Rows = await d1
        .prepare(`SELECT fulfillment_status FROM orders WHERE id = ?`)
        .bind("order_2")
        .all();
      expect(order2Rows.results).toEqual([
        { fulfillment_status: "ORDER_PLACED" },
      ]);

      const rows = await d1
        .prepare(
          `SELECT old_fulfillment_status, new_fulfillment_status, email_status
           FROM order_fulfillment_events WHERE request_id = ?`
        )
        .bind("req_fulfillment_ship")
        .all();
      expect(rows.results).toEqual([
        {
          email_status: "PENDING",
          new_fulfillment_status: "DELIVERED",
          old_fulfillment_status: "SHIPPED",
        },
      ]);
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("claims and marks fulfillment event email attempts with retry-safe states", async () => {
    const { mf, repository } = await createOrderRepositoryTestD1();

    try {
      const transition = await repository.transitionAdminOrderFulfillment({
        actorId: "admin_1",
        expectedFulfillmentStatus: "SHIPPED",
        now: "2026-07-08T02:00:00.000Z",
        orderId: "order_1",
        requestId: "req_fulfillment_email",
        targetStatus: "DELIVERED",
      });
      expect(transition.decision).toBe("transitioned");
      const eventId =
        transition.decision === "transitioned" ? transition.event.eventId : "";

      const claimed = await repository.claimFulfillmentStatusEmail({
        eventId,
        now: "2026-07-08T02:02:00.000Z",
        requestId: "req_claim",
      });
      const duplicateClaim = await repository.claimFulfillmentStatusEmail({
        eventId,
        now: "2026-07-08T02:03:00.000Z",
        requestId: "req_claim_2",
      });
      const email = await repository.getFulfillmentStatusEmail(eventId);

      expect(claimed).toBe(true);
      expect(duplicateClaim).toBe(false);
      expect(email).toMatchObject({
        fulfillmentStatusLabel: "Delivered",
        orderNumber: "JRW-2026-ORDER1",
        toEmail: "nina@example.test",
        totalCentavos: 3998,
      });
      expect(JSON.stringify(email)).not.toMatch(
        /0917|Sampaguita|payment_1|provider|token|secret|card/i
      );

      await repository.markFulfillmentStatusEmailSent({
        eventId,
        messageId: "email_1",
        now: "2026-07-08T02:04:00.000Z",
        requestId: "req_sent",
      });
      const event = await repository.findFulfillmentEventByRequestId(
        "req_fulfillment_email"
      );
      expect(event).toMatchObject({
        emailMessageId: "email_1",
        emailStatus: "SENT",
      });
    } finally {
      await mf.dispose();
    }
  }, 20_000);
});
