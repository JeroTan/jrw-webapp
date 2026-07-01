import { Miniflare } from "miniflare";
import { describe, expect, it } from "vitest";
import { createDb } from "@/adapter/infrastructure/db/client";
import { DrizzleInventoryReleaseRepository } from "./InventoryReleaseRepository";

const now = "2026-07-01T08:00:00.000Z";

async function createInventoryReleaseTestD1() {
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
    `CREATE TABLE checkout_reservation_items (
      id text PRIMARY KEY NOT NULL,
      reservation_id text NOT NULL,
      product_id text,
      variant_id text,
      quantity integer NOT NULL,
      price_centavos integer NOT NULL,
      reservation_mode text DEFAULT 'STOCK' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
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
      payment_status text DEFAULT 'PAYMENT_PENDING' NOT NULL,
      fulfillment_status text DEFAULT 'ORDER_PLACED' NOT NULL,
      subtotal_centavos integer DEFAULT 0 NOT NULL,
      total_centavos integer DEFAULT 0 NOT NULL,
      currency text DEFAULT 'PHP' NOT NULL,
      order_confirmation_email_status text DEFAULT 'PENDING' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE checkout_reservation_releases (
      id text PRIMARY KEY NOT NULL,
      reservation_id text NOT NULL,
      reservation_item_id text NOT NULL,
      checkout_attempt_id text NOT NULL,
      payment_id text,
      product_id text,
      variant_id text,
      quantity integer DEFAULT 0 NOT NULL,
      reservation_mode text DEFAULT 'STOCK' NOT NULL,
      release_reason text NOT NULL,
      status text DEFAULT 'REQUESTED' NOT NULL,
      error_code text,
      requested_at text NOT NULL,
      applied_at text,
      failed_at text,
      created_request_id text NOT NULL,
      updated_request_id text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE UNIQUE INDEX uq_checkout_reservation_releases_item
      ON checkout_reservation_releases(reservation_item_id)`,
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
        id, name, stock, inventory_state, price, sku, is_preorder,
        stock_version, stock_lock_version, variation_chain, product_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "variant_linen_small",
      "Size: Small",
      1,
      "LOW_STOCK",
      1999,
      "SKU-LINEN-S",
      0,
      8,
      0,
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
      "2026-07-01T08:15:00.000Z",
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
      "2026-07-01T08:15:00.000Z",
      "req_reservation",
      now,
      now
    )
    .run();
  await d1
    .prepare(
      `INSERT INTO checkout_reservation_items (
        id, reservation_id, product_id, variant_id, quantity, price_centavos,
        reservation_mode, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "reservation_item_1",
      "reservation_1",
      "prod_linen",
      "variant_linen_small",
      2,
      1999,
      "STOCK",
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
      "PAYMENT_FAILED",
      3998,
      "PHP",
      "https://checkout.paymongo.com/cs_test_123",
      0,
      "req_payment",
      now,
      now
    )
    .run();

  return {
    d1,
    mf,
    repository: new DrizzleInventoryReleaseRepository(createDb(d1)),
  };
}

async function stock(d1: D1Database) {
  return d1
    .prepare(
      `SELECT stock, stock_version, inventory_state
       FROM product_variants WHERE id = ?`
    )
    .bind("variant_linen_small")
    .first<Record<string, unknown>>();
}

describe("DrizzleInventoryReleaseRepository", () => {
  it("releases failed payment reservation idempotently without over-restoring", async () => {
    const { d1, mf, repository } = await createInventoryReleaseTestD1();

    try {
      const first = await repository.releaseInventoryForPayment({
        now,
        paymentId: "payment_1",
        requestId: "req_release_1",
      });
      const second = await repository.releaseInventoryForPayment({
        now,
        paymentId: "payment_1",
        requestId: "req_release_2",
      });
      const reservation = await d1
        .prepare(`SELECT status FROM checkout_reservations WHERE id = ?`)
        .bind("reservation_1")
        .first<Record<string, unknown>>();
      const attempt = await d1
        .prepare(
          `SELECT status, reservation_id, reservation_expires_at
           FROM checkout_attempts WHERE id = ?`
        )
        .bind("attempt_1")
        .first<Record<string, unknown>>();

      expect(first).toMatchObject({
        decision: "released",
        paymentId: "payment_1",
        releaseReason: "PAYMENT_FAILED",
        reservationId: "reservation_1",
        restoredQuantity: 2,
      });
      expect(second).toMatchObject({
        decision: "already-released",
        restoredQuantity: 0,
      });
      expect(await stock(d1)).toEqual({
        inventory_state: "LOW_STOCK",
        stock: 3,
        stock_version: 9,
      });
      expect(reservation).toEqual({ status: "RELEASED" });
      expect(attempt).toEqual({
        reservation_expires_at: null,
        reservation_id: null,
        status: "PAYMENT_FAILED",
      });
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("releases cancelled and expired terminal payments", async () => {
    for (const status of ["PAYMENT_CANCELLED", "PAYMENT_EXPIRED"]) {
      const { d1, mf, repository } = await createInventoryReleaseTestD1();

      try {
        await d1
          .prepare(`UPDATE checkout_payments SET status = ? WHERE id = ?`)
          .bind(status, "payment_1")
          .run();

        const result = await repository.releaseInventoryForPayment({
          now,
          paymentId: "payment_1",
          requestId: `req_release_${status}`,
        });

        expect(result).toMatchObject({
          decision: "released",
          releaseReason: status,
          restoredQuantity: 2,
        });
        expect(await stock(d1)).toMatchObject({ stock: 3 });
      } finally {
        await mf.dispose();
      }
    }
  }, 20_000);

  it("releases stale pending payments by timeout but leaves fresh pending held", async () => {
    const { d1, mf, repository } = await createInventoryReleaseTestD1();

    try {
      await d1
        .prepare(`UPDATE checkout_payments SET status = ? WHERE id = ?`)
        .bind("PAYMENT_PENDING", "payment_1")
        .run();

      const fresh = await repository.releaseInventoryForPayment({
        allowPendingTimeout: true,
        now: "2026-07-01T08:10:00.000Z",
        paymentId: "payment_1",
        requestId: "req_release_fresh_pending",
      });
      const stale = await repository.releaseInventoryForPayment({
        allowPendingTimeout: true,
        now: "2026-07-01T08:16:00.000Z",
        paymentId: "payment_1",
        releaseReason: "PENDING_TIMEOUT",
        requestId: "req_release_stale_pending",
      });
      const payment = await d1
        .prepare(
          `SELECT status, updated_request_id FROM checkout_payments WHERE id = ?`
        )
        .bind("payment_1")
        .first<Record<string, unknown>>();

      expect(fresh).toMatchObject({
        decision: "skipped",
        skipReason: "skip-active-pending",
      });
      expect(stale).toMatchObject({
        decision: "released",
        paymentStatus: "PAYMENT_EXPIRED",
        releaseReason: "PENDING_TIMEOUT",
        restoredQuantity: 2,
      });
      expect(payment).toEqual({
        status: "PAYMENT_EXPIRED",
        updated_request_id: "req_release_stale_pending",
      });
      expect(await stock(d1)).toMatchObject({ stock: 3 });
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("handles concurrent duplicate release without over-restoring stock", async () => {
    const { d1, mf, repository } = await createInventoryReleaseTestD1();

    try {
      const results = await Promise.all([
        repository.releaseInventoryForPayment({
          now,
          paymentId: "payment_1",
          requestId: "req_release_a",
        }),
        repository.releaseInventoryForPayment({
          now,
          paymentId: "payment_1",
          requestId: "req_release_b",
        }),
      ]);

      expect(results.map((result) => result.decision).sort()).toEqual([
        "already-released",
        "released",
      ]);
      expect(await stock(d1)).toMatchObject({
        stock: 3,
        stock_version: 9,
      });
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("marks preorder release without changing stock", async () => {
    const { d1, mf, repository } = await createInventoryReleaseTestD1();

    try {
      await d1
        .prepare(
          `UPDATE product_variants
           SET stock = 0, inventory_state = 'PREORDER', is_preorder = 1
           WHERE id = ?`
        )
        .bind("variant_linen_small")
        .run();
      await d1
        .prepare(
          `UPDATE checkout_reservation_items
           SET reservation_mode = 'PREORDER', quantity = 5
           WHERE id = ?`
        )
        .bind("reservation_item_1")
        .run();

      const result = await repository.releaseInventoryForPayment({
        now,
        paymentId: "payment_1",
        requestId: "req_release_preorder",
      });

      expect(result).toMatchObject({
        decision: "released",
        itemCount: 1,
        restoredQuantity: 0,
      });
      expect(await stock(d1)).toMatchObject({
        inventory_state: "PREORDER",
        stock: 0,
      });
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("does not release paid or order-linked payment reservations", async () => {
    const { d1, mf, repository } = await createInventoryReleaseTestD1();

    try {
      await d1
        .prepare(`UPDATE checkout_payments SET status = ? WHERE id = ?`)
        .bind("PAYMENT_PAID", "payment_1")
        .run();

      const paid = await repository.releaseInventoryForPayment({
        now,
        paymentId: "payment_1",
        requestId: "req_release_paid",
      });

      await d1
        .prepare(`UPDATE checkout_payments SET status = ? WHERE id = ?`)
        .bind("PAYMENT_FAILED", "payment_1")
        .run();
      await d1
        .prepare(
          `INSERT INTO orders (
            id, checkout_attempt_id, reservation_id, payment_id, total_amount,
            payment_status, total_centavos
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "order_1",
          "attempt_1",
          "reservation_1",
          "payment_1",
          39.98,
          "PAYMENT_PAID",
          3998
        )
        .run();

      const orderLinked = await repository.releaseInventoryForPayment({
        now,
        paymentId: "payment_1",
        requestId: "req_release_order",
      });

      expect(paid).toMatchObject({
        decision: "skipped",
        skipReason: "skip-paid",
      });
      expect(orderLinked).toMatchObject({
        decision: "skipped",
        skipReason: "skip-order-exists",
      });
      expect(await stock(d1)).toMatchObject({ stock: 1 });
    } finally {
      await mf.dispose();
    }
  }, 20_000);

  it("skips non-PayMongo and superseded stale pending payments", async () => {
    const providerCase = await createInventoryReleaseTestD1();

    try {
      await providerCase.d1
        .prepare(`UPDATE checkout_payments SET provider = ? WHERE id = ?`)
        .bind("OTHER_PROVIDER", "payment_1")
        .run();

      const result = await providerCase.repository.releaseInventoryForPayment({
        now,
        paymentId: "payment_1",
        requestId: "req_release_provider_mismatch",
      });

      expect(result).toMatchObject({
        decision: "skipped",
        skipReason: "skip-provider-mismatch",
      });
      expect(await stock(providerCase.d1)).toMatchObject({ stock: 1 });
    } finally {
      await providerCase.mf.dispose();
    }

    const staleCase = await createInventoryReleaseTestD1();

    try {
      await staleCase.d1
        .prepare(
          `UPDATE checkout_payments
           SET status = ?, created_at = ?
           WHERE id = ?`
        )
        .bind("PAYMENT_PENDING", "2026-07-01T08:00:00.000Z", "payment_1")
        .run();
      await staleCase.d1
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
          "cs_test_newer",
          "JRW-attempt_1-reservation_1-newer",
          "PAYMENT_PENDING",
          3998,
          "PHP",
          "https://checkout.paymongo.com/cs_test_newer",
          0,
          "req_payment_2",
          "2026-07-01T08:20:00.000Z",
          "2026-07-01T08:20:00.000Z"
        )
        .run();

      const result = await staleCase.repository.releaseInventoryForPayment({
        allowPendingTimeout: true,
        now: "2026-07-01T08:30:00.000Z",
        paymentId: "payment_1",
        releaseReason: "PENDING_TIMEOUT",
        requestId: "req_release_superseded_pending",
      });

      expect(result).toMatchObject({
        decision: "skipped",
        skipReason: "skip-active-pending",
      });
      expect(await stock(staleCase.d1)).toMatchObject({ stock: 1 });
    } finally {
      await staleCase.mf.dispose();
    }
  }, 20_000);

  it("keeps failed release retryable without marking reservation released", async () => {
    const { d1, mf, repository } = await createInventoryReleaseTestD1();

    try {
      await d1
        .prepare(`DELETE FROM product_variants WHERE id = ?`)
        .bind("variant_linen_small")
        .run();

      const failed = await repository.releaseInventoryForPayment({
        now,
        paymentId: "payment_1",
        requestId: "req_release_failed",
      });
      const reservationAfterFailure = await d1
        .prepare(`SELECT status FROM checkout_reservations WHERE id = ?`)
        .bind("reservation_1")
        .first<Record<string, unknown>>();

      await d1
        .prepare(
          `INSERT INTO product_variants (
            id, name, stock, inventory_state, price, sku, is_preorder,
            stock_version, stock_lock_version, variation_chain, product_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "variant_linen_small",
          "Size: Small",
          1,
          "LOW_STOCK",
          1999,
          "SKU-LINEN-S-RETRY",
          0,
          8,
          0,
          JSON.stringify([{ group: "Size", name: "Small" }]),
          "prod_linen"
        )
        .run();

      const retried = await repository.releaseInventoryForPayment({
        now,
        paymentId: "payment_1",
        requestId: "req_release_retry",
      });

      expect(failed).toMatchObject({
        decision: "failed",
        errorCode: "INVENTORY_RELEASE_FAILED",
      });
      expect(reservationAfterFailure).toEqual({ status: "ACTIVE" });
      expect(retried).toMatchObject({
        decision: "released",
        restoredQuantity: 2,
      });
      expect(await stock(d1)).toMatchObject({ stock: 3 });
    } finally {
      await mf.dispose();
    }
  }, 20_000);
});
