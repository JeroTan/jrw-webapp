import { Miniflare } from "miniflare";
import { describe, expect, it } from "vitest";
import { createDb } from "@/adapter/infrastructure/db/client";
import { DrizzleOrderConfirmationRepository } from "./OrderConfirmationRepository";

const now = "2026-06-26T05:00:00.000Z";

async function createOrderConfirmationTestD1() {
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
    `CREATE TABLE checkout_attempts (
      id text PRIMARY KEY NOT NULL,
      customer_id text,
      checkout_email text NOT NULL,
      full_name text NOT NULL,
      first_name text,
      last_name text,
      phone text NOT NULL,
      street_address text NOT NULL,
      barangay text NOT NULL,
      city_province text NOT NULL,
      postal_code text NOT NULL,
      privacy_acknowledged_at text NOT NULL,
      attempt_token_hash text DEFAULT '' NOT NULL,
      cart_fingerprint text,
      reservation_id text,
      reservation_expires_at text,
      status text DEFAULT 'DETAILS_CAPTURED' NOT NULL,
      created_request_id text NOT NULL,
      updated_request_id text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE checkout_reservations (
      id text PRIMARY KEY NOT NULL,
      checkout_attempt_id text NOT NULL,
      status text DEFAULT 'ACTIVE' NOT NULL,
      cart_fingerprint text NOT NULL,
      subtotal_centavos integer DEFAULT 0 NOT NULL,
      expires_at text NOT NULL,
      created_request_id text NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE checkout_payments (
      id text PRIMARY KEY NOT NULL,
      checkout_attempt_id text NOT NULL,
      reservation_id text NOT NULL,
      provider text DEFAULT 'PAYMONGO' NOT NULL,
      provider_checkout_session_id text NOT NULL,
      provider_reference_number text NOT NULL,
      status text DEFAULT 'PAYMENT_PENDING' NOT NULL,
      amount_centavos integer NOT NULL,
      currency text DEFAULT 'PHP' NOT NULL,
      checkout_url text NOT NULL,
      livemode integer DEFAULT 0 NOT NULL,
      created_request_id text NOT NULL,
      updated_request_id text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE checkout_payment_items (
      id text PRIMARY KEY NOT NULL,
      payment_id text NOT NULL,
      product_id text,
      variant_id text,
      name text NOT NULL,
      amount_centavos integer NOT NULL,
      currency text DEFAULT 'PHP' NOT NULL,
      quantity integer NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
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
    `CREATE UNIQUE INDEX uq_orders_payment_id ON orders(payment_id) WHERE payment_id IS NOT NULL`,
    `CREATE UNIQUE INDEX uq_orders_checkout_attempt_id ON orders(checkout_attempt_id) WHERE checkout_attempt_id IS NOT NULL`,
    `CREATE UNIQUE INDEX uq_orders_reservation_id ON orders(reservation_id) WHERE reservation_id IS NOT NULL`,
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
    `CREATE UNIQUE INDEX order_snapshots_signature_unique
      ON order_snapshots(snapshot_signature)
      WHERE snapshot_signature IS NOT NULL`,
  ]) {
    await d1.prepare(statement).run();
  }

  await d1
    .prepare(
      `INSERT INTO products (id, name, slug, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "prod_linen",
      "Linen Shirt",
      "linen-shirt",
      "Shirt",
      "PUBLISHED",
      now,
      now
    )
    .run();
  await d1
    .prepare(
      `INSERT INTO product_variants (
        id, name, price, sku, variation_chain, product_id
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "variant_linen_small",
      "Size: Small",
      1999,
      "SKU-LINEN-S",
      JSON.stringify([{ group: "Size", name: "Small" }]),
      "prod_linen"
    )
    .run();
  await d1
    .prepare(
      `INSERT INTO checkout_attempts (
        id, checkout_email, full_name, phone, street_address, barangay,
        city_province, postal_code, privacy_acknowledged_at, reservation_id,
        reservation_expires_at, status, created_request_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "attempt_1",
      "nina@example.com",
      "Nina Reyes",
      "+63 917 555 1212",
      "12 Sampaguita Street",
      "Barangay 456",
      "Quezon City",
      "1100",
      now,
      "reservation_1",
      "2026-06-26T05:15:00.000Z",
      "PAYMENT_CREATED",
      "req_attempt",
      now,
      now
    )
    .run();
  await d1
    .prepare(
      `INSERT INTO checkout_reservations (
        id, checkout_attempt_id, status, cart_fingerprint, subtotal_centavos,
        expires_at, created_request_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "reservation_1",
      "attempt_1",
      "ACTIVE",
      "cart_fingerprint_1",
      3998,
      "2026-06-26T05:15:00.000Z",
      "req_reservation",
      now,
      now
    )
    .run();
  await d1
    .prepare(
      `INSERT INTO checkout_payments (
        id, checkout_attempt_id, reservation_id, provider,
        provider_checkout_session_id, provider_reference_number, status,
        amount_centavos, currency, checkout_url, livemode,
        created_request_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "payment_1",
      "attempt_1",
      "reservation_1",
      "PAYMONGO",
      "cs_test_123",
      "JRW-attempt_1-reservation_1",
      "PAYMENT_PAID",
      3998,
      "PHP",
      "https://checkout.paymongo.com/cs_test_123",
      0,
      "req_payment",
      now,
      now
    )
    .run();
  await d1
    .prepare(
      `INSERT INTO checkout_payment_items (
        id, payment_id, product_id, variant_id, name, amount_centavos,
        currency, quantity, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "payment_item_1",
      "payment_1",
      "prod_linen",
      "variant_linen_small",
      "Linen Shirt - Size: Small",
      1999,
      "PHP",
      2,
      now
    )
    .run();

  return {
    d1,
    mf,
    repository: new DrizzleOrderConfirmationRepository(createDb(d1)),
  };
}

describe("DrizzleOrderConfirmationRepository", () => {
  it("creates paid order confirmation and item snapshots idempotently", async () => {
    const { d1, mf, repository } = await createOrderConfirmationTestD1();

    try {
      const first = await repository.createOrderConfirmationForPaidPayment({
        now,
        paymentId: "payment_1",
        requestId: "req_confirm_1",
      });
      const second = await repository.createOrderConfirmationForPaidPayment({
        now,
        paymentId: "payment_1",
        requestId: "req_confirm_2",
      });

      expect(first).toMatchObject({
        created: true,
        decision: "confirmed",
        order: {
          checkoutAttemptId: "attempt_1",
          customerId: null,
          fulfillmentStatus: "ORDER_PLACED",
          paymentId: "payment_1",
          paymentStatus: "PAYMENT_PAID",
          reservationId: "reservation_1",
          totalCentavos: 3998,
        },
      });
      expect(second).toMatchObject({
        created: false,
        decision: "confirmed",
      });

      const orderCount = await d1
        .prepare(`SELECT count(*) AS count FROM orders`)
        .first<{ count: number }>();
      const snapshotCount = await d1
        .prepare(`SELECT count(*) AS count FROM order_snapshots`)
        .first<{ count: number }>();
      const snapshot = await d1
        .prepare(
          `SELECT product_name, variant_name, price_centavos, quantity
           FROM order_snapshots`
        )
        .first<{
          price_centavos: number;
          product_name: string;
          quantity: number;
          variant_name: string;
        }>();

      expect(Number(orderCount?.count ?? 0)).toBe(1);
      expect(Number(snapshotCount?.count ?? 0)).toBe(1);
      expect(snapshot).toEqual({
        product_name: "Linen Shirt",
        variant_name: "Size: Small",
        price_centavos: 1999,
        quantity: 2,
      });
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("returns existing order for a second paid payment on the same attempt and reservation", async () => {
    const { d1, mf, repository } = await createOrderConfirmationTestD1();

    try {
      const first = await repository.createOrderConfirmationForPaidPayment({
        now,
        paymentId: "payment_1",
        requestId: "req_confirm_1",
      });

      await d1
        .prepare(
          `INSERT INTO checkout_payments (
            id, checkout_attempt_id, reservation_id, provider,
            provider_checkout_session_id, provider_reference_number, status,
            amount_centavos, currency, checkout_url, livemode,
            created_request_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "payment_2",
          "attempt_1",
          "reservation_1",
          "PAYMONGO",
          "cs_test_456",
          "JRW-attempt_1-reservation_1-retry",
          "PAYMENT_PAID",
          3998,
          "PHP",
          "https://checkout.paymongo.com/cs_test_456",
          0,
          "req_payment_2",
          "2026-06-26T05:01:00.000Z",
          "2026-06-26T05:01:00.000Z"
        )
        .run();

      const second = await repository.createOrderConfirmationForPaidPayment({
        now,
        paymentId: "payment_2",
        requestId: "req_confirm_2",
      });
      const orderCount = await d1
        .prepare(`SELECT count(*) AS count FROM orders`)
        .first<{ count: number }>();

      expect(second).toMatchObject({
        created: false,
        decision: "confirmed",
        order: {
          orderId:
            first.decision === "confirmed" ? first.order.orderId : undefined,
          paymentId: "payment_1",
        },
      });
      expect(Number(orderCount?.count ?? 0)).toBe(1);
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("does not create an order for pending payment", async () => {
    const { d1, mf, repository } = await createOrderConfirmationTestD1();

    try {
      await d1
        .prepare(
          `UPDATE checkout_payments SET status = 'PAYMENT_PENDING' WHERE id = ?`
        )
        .bind("payment_1")
        .run();

      await expect(
        repository.createOrderConfirmationForPaidPayment({
          now,
          paymentId: "payment_1",
          requestId: "req_pending",
        })
      ).resolves.toEqual({
        decision: "not-paid",
        paymentId: "payment_1",
        paymentStatus: "PAYMENT_PENDING",
      });

      const orderCount = await d1
        .prepare(`SELECT count(*) AS count FROM orders`)
        .first<{ count: number }>();

      expect(Number(orderCount?.count ?? 0)).toBe(0);
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("does not create an order when paid payment has no frozen payment items", async () => {
    const { d1, mf, repository } = await createOrderConfirmationTestD1();

    try {
      await d1
        .prepare(`DELETE FROM checkout_payment_items WHERE payment_id = ?`)
        .bind("payment_1")
        .run();

      await expect(
        repository.createOrderConfirmationForPaidPayment({
          now,
          paymentId: "payment_1",
          requestId: "req_missing_items",
        })
      ).resolves.toEqual({
        decision: "missing-payment-items",
        paymentId: "payment_1",
      });

      const orderCount = await d1
        .prepare(`SELECT count(*) AS count FROM orders`)
        .first<{ count: number }>();

      expect(Number(orderCount?.count ?? 0)).toBe(0);
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("marks provider checkout session paid idempotently", async () => {
    const { d1, mf, repository } = await createOrderConfirmationTestD1();

    try {
      await d1
        .prepare(
          `UPDATE checkout_payments SET status = 'PAYMENT_PENDING' WHERE id = ?`
        )
        .bind("payment_1")
        .run();

      const first = await repository.markProviderCheckoutSessionPaid({
        now,
        providerCheckoutSessionId: "cs_test_123",
        requestId: "req_mark_paid_1",
      });
      const second = await repository.markProviderCheckoutSessionPaid({
        now,
        providerCheckoutSessionId: "cs_test_123",
        requestId: "req_mark_paid_2",
      });
      const payment = await d1
        .prepare(
          `SELECT status, updated_request_id FROM checkout_payments WHERE id = ?`
        )
        .bind("payment_1")
        .first<{ status: string; updated_request_id: string }>();

      expect(first).toEqual({
        decision: "paid",
        paymentId: "payment_1",
        paymentStatus: "PAYMENT_PAID",
      });
      expect(second).toEqual({
        decision: "already-paid",
        paymentId: "payment_1",
        paymentStatus: "PAYMENT_PAID",
      });
      expect(payment).toEqual({
        status: "PAYMENT_PAID",
        updated_request_id: "req_mark_paid_1",
      });
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("marks provider checkout session expired idempotently", async () => {
    const { d1, mf, repository } = await createOrderConfirmationTestD1();

    try {
      await d1
        .prepare(
          `UPDATE checkout_payments SET status = 'PAYMENT_PENDING' WHERE id = ?`
        )
        .bind("payment_1")
        .run();

      const first = await repository.markProviderCheckoutSessionTerminal({
        now,
        providerCheckoutSessionId: "cs_test_123",
        requestId: "req_mark_expired_1",
        targetStatus: "PAYMENT_EXPIRED",
      });
      const second = await repository.markProviderCheckoutSessionTerminal({
        now,
        providerCheckoutSessionId: "cs_test_123",
        requestId: "req_mark_expired_2",
        targetStatus: "PAYMENT_EXPIRED",
      });
      const payment = await d1
        .prepare(
          `SELECT status, updated_request_id FROM checkout_payments WHERE id = ?`
        )
        .bind("payment_1")
        .first<{ status: string; updated_request_id: string }>();

      expect(first).toEqual({
        decision: "terminal",
        paymentId: "payment_1",
        paymentStatus: "PAYMENT_EXPIRED",
      });
      expect(second).toEqual({
        decision: "already-terminal",
        paymentId: "payment_1",
        paymentStatus: "PAYMENT_EXPIRED",
      });
      expect(payment).toEqual({
        status: "PAYMENT_EXPIRED",
        updated_request_id: "req_mark_expired_1",
      });
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("reclaims stale SENDING order confirmation email but not fresh sends", async () => {
    const { mf, repository } = await createOrderConfirmationTestD1();

    try {
      const confirmation =
        await repository.createOrderConfirmationForPaidPayment({
          now,
          paymentId: "payment_1",
          requestId: "req_confirm_email_claim",
        });

      if (confirmation.decision !== "confirmed") {
        throw new Error("expected confirmed order");
      }

      const orderId = confirmation.order.orderId;

      await expect(
        repository.claimOrderConfirmationEmail({
          now,
          orderId,
          requestId: "req_claim_1",
        })
      ).resolves.toBe(true);
      await expect(
        repository.claimOrderConfirmationEmail({
          now: "2026-06-26T05:01:00.000Z",
          orderId,
          requestId: "req_claim_fresh",
        })
      ).resolves.toBe(false);
      await expect(
        repository.claimOrderConfirmationEmail({
          now: "2026-06-26T05:16:00.000Z",
          orderId,
          requestId: "req_claim_stale",
        })
      ).resolves.toBe(true);
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("prefers confirmed order when attempt lookup also has a later pending payment", async () => {
    const { d1, mf, repository } = await createOrderConfirmationTestD1();

    try {
      const confirmation =
        await repository.createOrderConfirmationForPaidPayment({
          now,
          paymentId: "payment_1",
          requestId: "req_confirm_lookup",
        });

      await d1
        .prepare(
          `INSERT INTO checkout_payments (
            id, checkout_attempt_id, reservation_id, provider,
            provider_checkout_session_id, provider_reference_number, status,
            amount_centavos, currency, checkout_url, livemode,
            created_request_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "payment_2",
          "attempt_1",
          "reservation_1",
          "PAYMONGO",
          "cs_test_456",
          "JRW-attempt_1-reservation_1-retry",
          "PAYMENT_PENDING",
          3998,
          "PHP",
          "https://checkout.paymongo.com/cs_test_456",
          0,
          "req_payment_2",
          "2026-06-26T05:01:00.000Z",
          "2026-06-26T05:01:00.000Z"
        )
        .run();

      const record = await repository.findPaymentReturnRecord({
        attemptId: "attempt_1",
      });

      expect(record).toMatchObject({
        orderId:
          confirmation.decision === "confirmed"
            ? confirmation.order.orderId
            : undefined,
        paymentId: "payment_1",
        status: "confirmed",
      });
    } finally {
      await mf.dispose();
    }
  }, 20_000);
});
