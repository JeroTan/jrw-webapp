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
      status text DEFAULT 'DETAILS_CAPTURED' NOT NULL,
      created_request_id text NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE set null
    )`,
    `CREATE INDEX idx_checkout_attempts_customer_id ON checkout_attempts(customer_id)`,
    `CREATE INDEX idx_checkout_attempts_checkout_email ON checkout_attempts(checkout_email)`,
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

describe("CheckoutRepository", { timeout: 20_000 }, () => {
  it("persists guest checkout contact snapshot with nullable customer id", async () => {
    const { d1, mf } = await createCheckoutTestD1();

    try {
      const repository = new DrizzleCheckoutRepository(createDb(d1));
      const created = await repository.createCheckoutAttempt({
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
        created_request_id: "req_checkout_attempt_guest",
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
        customerId: "customer_1",
        details: checkoutDetails(),
        now,
        requestId: "req_checkout_attempt_customer",
      });

      const row = await d1
        .prepare("SELECT customer_id, checkout_email FROM checkout_attempts WHERE id = ?")
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
});
