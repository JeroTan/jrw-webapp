import { Miniflare } from "miniflare";
import { describe, expect, it } from "vitest";
import { createDb } from "@/adapter/infrastructure/db/client";
import { DrizzleCheckoutRepository } from "./CheckoutRepository";

const now = "2026-06-12T08:00:00.000Z";

async function createCheckoutTestD1() {
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
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE set null
    )`,
    `CREATE INDEX idx_checkout_attempts_customer_id ON checkout_attempts(customer_id)`,
    `CREATE INDEX idx_checkout_attempts_checkout_email ON checkout_attempts(checkout_email)`,
    `CREATE INDEX idx_checkout_attempts_reservation_id ON checkout_attempts(reservation_id)`,
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
      sku text NOT NULL,
      is_preorder integer DEFAULT 0 NOT NULL,
      expected_release text,
      stock_version integer DEFAULT 0 NOT NULL,
      stock_lock_version integer DEFAULT 0 NOT NULL,
      variation_chain text DEFAULT '[]' NOT NULL,
      image_reference_id text,
      product_id text NOT NULL
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
    `CREATE INDEX idx_checkout_reservations_attempt_id ON checkout_reservations(checkout_attempt_id)`,
    `CREATE INDEX idx_checkout_reservations_status ON checkout_reservations(status)`,
    `CREATE INDEX idx_checkout_reservations_expires_at ON checkout_reservations(expires_at)`,
    `CREATE UNIQUE INDEX uq_checkout_reservations_active_attempt
      ON checkout_reservations(checkout_attempt_id)
      WHERE status = 'ACTIVE'`,
    `CREATE UNIQUE INDEX uq_checkout_reservations_active_attempt_cart
      ON checkout_reservations(checkout_attempt_id, cart_fingerprint)
      WHERE status = 'ACTIVE'`,
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
    `CREATE INDEX idx_checkout_reservation_items_reservation_id ON checkout_reservation_items(reservation_id)`,
    `CREATE INDEX idx_checkout_reservation_items_variant_id ON checkout_reservation_items(variant_id)`,
  ];

  for (const statement of statements) {
    await d1.prepare(statement).run();
  }

  await d1
    .prepare(
      `INSERT INTO customers (id, email, created_at, updated_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind("customer_1", "nina@example.com", now, now)
    .run();
  await d1
    .prepare(
      `INSERT INTO products (id, name, slug, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      "prod_linen",
      "Linen Shirt",
      "linen-shirt",
      "Lightweight linen shirt.",
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
      3,
      "IN_STOCK",
      1999,
      "LINEN-S",
      0,
      7,
      0,
      JSON.stringify([{ group: "Size", name: "Small" }]),
      "prod_linen"
    )
    .run();

  return { d1, mf };
}

function checkoutDetails() {
  return {
    barangay: "Barangay 456",
    cityProvince: "Quezon City",
    email: "nina@example.com",
    firstName: "Nina",
    fullName: "Nina Reyes",
    lastName: "Reyes",
    phone: "+63 917 555 1212",
    postalCode: "1100",
    privacyAcknowledged: true,
    streetAddress: "12 Sampaguita Street",
  } as const;
}

describe("CheckoutRepository", { timeout: 60_000 }, () => {
  it("persists guest checkout contact snapshot with nullable customer id", async () => {
    const { d1, mf } = await createCheckoutTestD1();

    try {
      const repository = new DrizzleCheckoutRepository(createDb(d1));
      const created = await repository.createCheckoutAttempt({
        attemptTokenHash: "hashed_attempt_token",
        customerId: null,
        details: checkoutDetails(),
        now,
        requestId: "req_checkout_attempt_guest",
      });

      const row = await d1
        .prepare("SELECT * FROM checkout_attempts WHERE id = ?")
        .bind(created.id)
        .first<Record<string, unknown>>();

      expect(created).toMatchObject({
        customerId: null,
        checkoutEmail: "nina@example.com",
        fullName: "Nina Reyes",
        status: "DETAILS_CAPTURED",
      });
      expect(row).toMatchObject({
        customer_id: null,
        checkout_email: "nina@example.com",
        full_name: "Nina Reyes",
        first_name: "Nina",
        last_name: "Reyes",
        phone: "+63 917 555 1212",
        street_address: "12 Sampaguita Street",
        barangay: "Barangay 456",
        city_province: "Quezon City",
        postal_code: "1100",
        privacy_acknowledged_at: now,
        attempt_token_hash: "hashed_attempt_token",
        created_request_id: "req_checkout_attempt_guest",
      });
      expect(row).not.toMatchObject({
        attempt_token: expect.anything(),
      });
    } finally {
      await mf.dispose();
    }
  });

  it("persists signed-in checkout attempt from server customer id", async () => {
    const { d1, mf } = await createCheckoutTestD1();

    try {
      const repository = new DrizzleCheckoutRepository(createDb(d1));
      const created = await repository.createCheckoutAttempt({
        attemptTokenHash: "hashed_customer_attempt_token",
        customerId: "customer_1",
        details: checkoutDetails(),
        now,
        requestId: "req_checkout_attempt_customer",
      });

      const row = await d1
        .prepare(
          "SELECT customer_id, checkout_email FROM checkout_attempts WHERE id = ?"
        )
        .bind(created.id)
        .first<Record<string, unknown>>();

      expect(created.customerId).toBe("customer_1");
      expect(row).toEqual({
        customer_id: "customer_1",
        checkout_email: "nina@example.com",
      });
    } finally {
      await mf.dispose();
    }
  });

  it("atomically reserves stock, writes reservation items, and updates attempt state", async () => {
    const { d1, mf } = await createCheckoutTestD1();

    try {
      const repository = new DrizzleCheckoutRepository(createDb(d1));
      const attempt = await repository.createCheckoutAttempt({
        attemptTokenHash: "hashed_attempt_token",
        customerId: null,
        details: checkoutDetails(),
        now,
        requestId: "req_checkout_attempt_guest",
      });
      const reserved = await repository.reserveStockLine({
        mode: "STOCK",
        priceCentavos: 1999,
        productId: "prod_linen",
        quantity: 2,
        variantId: "variant_linen_small",
      });
      const reservation = await repository.createCheckoutReservation({
        attemptId: attempt.id,
        cartFingerprint: "prod_linen:variant_linen_small:1999:2:3998",
        expiresAt: "2026-06-12T08:15:00.000Z",
        lines: [
          {
            mode: "STOCK",
            priceCentavos: 1999,
            productId: "prod_linen",
            quantity: 2,
            variantId: "variant_linen_small",
          },
        ],
        now,
        requestId: "req_checkout_reservation",
        subtotalCentavos: 3998,
      });

      const variant = await d1
        .prepare(
          `SELECT stock, stock_version, inventory_state
           FROM product_variants WHERE id = ?`
        )
        .bind("variant_linen_small")
        .first<Record<string, unknown>>();
      const item = await d1
        .prepare(
          `SELECT product_id, variant_id, quantity, price_centavos, reservation_mode
           FROM checkout_reservation_items WHERE reservation_id = ?`
        )
        .bind(reservation.id)
        .first<Record<string, unknown>>();
      const updatedAttempt = await repository.findCheckoutAttempt(attempt.id);

      expect(reserved).toBe(true);
      expect(variant).toEqual({
        inventory_state: "LOW_STOCK",
        stock: 1,
        stock_version: 8,
      });
      expect(item).toEqual({
        price_centavos: 1999,
        product_id: "prod_linen",
        quantity: 2,
        reservation_mode: "STOCK",
        variant_id: "variant_linen_small",
      });
      expect(updatedAttempt).toMatchObject({
        cartFingerprint: "prod_linen:variant_linen_small:1999:2:3998",
        reservationExpiresAt: "2026-06-12T08:15:00.000Z",
        reservationId: reservation.id,
        status: "INVENTORY_RESERVED",
      });
    } finally {
      await mf.dispose();
    }
  });

  it("rejects stock-backed reservations that would oversell", async () => {
    const { d1, mf } = await createCheckoutTestD1();

    try {
      const repository = new DrizzleCheckoutRepository(createDb(d1));
      const reserved = await repository.reserveStockLine({
        mode: "STOCK",
        priceCentavos: 1999,
        productId: "prod_linen",
        quantity: 4,
        variantId: "variant_linen_small",
      });
      const variant = await d1
        .prepare(
          "SELECT stock, stock_version FROM product_variants WHERE id = ?"
        )
        .bind("variant_linen_small")
        .first<Record<string, unknown>>();

      expect(reserved).toBe(false);
      expect(variant).toEqual({
        stock: 3,
        stock_version: 7,
      });
    } finally {
      await mf.dispose();
    }
  });

  it("prevents oversell with concurrent D1 stock reservations", async () => {
    const { d1, mf } = await createCheckoutTestD1();

    try {
      await d1
        .prepare(
          `UPDATE product_variants
           SET stock = 5, stock_version = 0, inventory_state = 'LOW_STOCK'
           WHERE id = ?`
        )
        .bind("variant_linen_small")
        .run();

      const repository = new DrizzleCheckoutRepository(createDb(d1));
      const attempts = await Promise.all(
        Array.from({ length: 6 }, () =>
          repository.reserveStockLine({
            mode: "STOCK",
            priceCentavos: 1999,
            productId: "prod_linen",
            quantity: 1,
            variantId: "variant_linen_small",
          })
        )
      );
      const variant = await d1
        .prepare(
          `SELECT stock, stock_version, inventory_state
           FROM product_variants WHERE id = ?`
        )
        .bind("variant_linen_small")
        .first<Record<string, unknown>>();

      expect(attempts.filter(Boolean)).toHaveLength(5);
      expect(variant).toEqual({
        inventory_state: "OUT_OF_STOCK",
        stock: 0,
        stock_version: 5,
      });
    } finally {
      await mf.dispose();
    }
  });

  it("rechecks preorder, price, and product status before accepting reservation lines", async () => {
    const { d1, mf } = await createCheckoutTestD1();

    try {
      const repository = new DrizzleCheckoutRepository(createDb(d1));

      await d1
        .prepare(
          `UPDATE product_variants
           SET is_preorder = 1, inventory_state = 'PREORDER', stock = 0
           WHERE id = ?`
        )
        .bind("variant_linen_small")
        .run();

      await expect(
        repository.reserveStockLine({
          mode: "PREORDER",
          priceCentavos: 1999,
          productId: "prod_linen",
          quantity: 2,
          variantId: "variant_linen_small",
        })
      ).resolves.toBe(true);

      await d1
        .prepare("UPDATE product_variants SET price = ? WHERE id = ?")
        .bind(2099, "variant_linen_small")
        .run();

      await expect(
        repository.reserveStockLine({
          mode: "PREORDER",
          priceCentavos: 1999,
          productId: "prod_linen",
          quantity: 2,
          variantId: "variant_linen_small",
        })
      ).resolves.toBe(false);

      await d1
        .prepare("UPDATE product_variants SET price = ? WHERE id = ?")
        .bind(1999, "variant_linen_small")
        .run();
      await d1
        .prepare("UPDATE products SET status = 'ARCHIVED' WHERE id = ?")
        .bind("prod_linen")
        .run();

      await expect(
        repository.reserveStockLine({
          mode: "PREORDER",
          priceCentavos: 1999,
          productId: "prod_linen",
          quantity: 2,
          variantId: "variant_linen_small",
        })
      ).resolves.toBe(false);
    } finally {
      await mf.dispose();
    }
  });

  it("rejects stock reservation when price or product status changes after validation", async () => {
    const { d1, mf } = await createCheckoutTestD1();

    try {
      const repository = new DrizzleCheckoutRepository(createDb(d1));

      await d1
        .prepare("UPDATE product_variants SET price = ? WHERE id = ?")
        .bind(2099, "variant_linen_small")
        .run();

      await expect(
        repository.reserveStockLine({
          mode: "STOCK",
          priceCentavos: 1999,
          productId: "prod_linen",
          quantity: 1,
          variantId: "variant_linen_small",
        })
      ).resolves.toBe(false);

      await d1
        .prepare("UPDATE product_variants SET price = ? WHERE id = ?")
        .bind(1999, "variant_linen_small")
        .run();
      await d1
        .prepare("UPDATE products SET status = 'ARCHIVED' WHERE id = ?")
        .bind("prod_linen")
        .run();

      await expect(
        repository.reserveStockLine({
          mode: "STOCK",
          priceCentavos: 1999,
          productId: "prod_linen",
          quantity: 1,
          variantId: "variant_linen_small",
        })
      ).resolves.toBe(false);
    } finally {
      await mf.dispose();
    }
  });

  it("keeps the existing active reservation when a conflicting insert loses the race", async () => {
    const { d1, mf } = await createCheckoutTestD1();

    try {
      const repository = new DrizzleCheckoutRepository(createDb(d1));
      const attempt = await repository.createCheckoutAttempt({
        attemptTokenHash: "hashed_attempt_token",
        customerId: null,
        details: checkoutDetails(),
        now,
        requestId: "req_checkout_attempt_guest",
      });
      const firstReservation = await repository.createCheckoutReservation({
        attemptId: attempt.id,
        cartFingerprint: "prod_linen:variant_linen_small:1999:1:1999",
        expiresAt: "2026-06-12T08:15:00.000Z",
        lines: [
          {
            mode: "STOCK",
            priceCentavos: 1999,
            productId: "prod_linen",
            quantity: 1,
            variantId: "variant_linen_small",
          },
        ],
        now,
        requestId: "req_checkout_reservation_first",
        subtotalCentavos: 1999,
      });

      await expect(
        repository.createCheckoutReservation({
          attemptId: attempt.id,
          cartFingerprint: "prod_linen:variant_linen_small:1999:2:3998",
          expiresAt: "2026-06-12T08:16:00.000Z",
          lines: [
            {
              mode: "STOCK",
              priceCentavos: 1999,
              productId: "prod_linen",
              quantity: 2,
              variantId: "variant_linen_small",
            },
          ],
          now,
          requestId: "req_checkout_reservation_conflict",
          subtotalCentavos: 3998,
        })
      ).rejects.toThrow();

      const updatedAttempt = await repository.findCheckoutAttempt(attempt.id);
      const activeReservation =
        await repository.findActiveReservationForAttempt(attempt.id);

      expect(updatedAttempt).toMatchObject({
        reservationId: firstReservation.id,
        status: "INVENTORY_RESERVED",
      });
      expect(activeReservation).toMatchObject({
        cartFingerprint: "prod_linen:variant_linen_small:1999:1:1999",
        id: firstReservation.id,
      });
    } finally {
      await mf.dispose();
    }
  });

  it("does not mark an active reservation attempt failed after a losing request", async () => {
    const { d1, mf } = await createCheckoutTestD1();

    try {
      const repository = new DrizzleCheckoutRepository(createDb(d1));
      const attempt = await repository.createCheckoutAttempt({
        attemptTokenHash: "hashed_attempt_token",
        customerId: null,
        details: checkoutDetails(),
        now,
        requestId: "req_checkout_attempt_guest",
      });
      const reservation = await repository.createCheckoutReservation({
        attemptId: attempt.id,
        cartFingerprint: "prod_linen:variant_linen_small:1999:1:1999",
        expiresAt: "2026-06-12T08:15:00.000Z",
        lines: [
          {
            mode: "STOCK",
            priceCentavos: 1999,
            productId: "prod_linen",
            quantity: 1,
            variantId: "variant_linen_small",
          },
        ],
        now,
        requestId: "req_checkout_reservation",
        subtotalCentavos: 1999,
      });

      await repository.failReservationAndAttempt({
        attemptId: attempt.id,
        now,
        requestId: "req_losing_reservation",
      });

      await expect(
        repository.findCheckoutAttempt(attempt.id)
      ).resolves.toMatchObject({
        reservationId: reservation.id,
        status: "INVENTORY_RESERVED",
      });
    } finally {
      await mf.dispose();
    }
  });
});
