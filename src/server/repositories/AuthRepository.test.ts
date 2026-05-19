import { Miniflare } from "miniflare";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDb } from "@/adapter/infrastructure/db/client";
import { DrizzleAdminAuthAccountRepository } from "./AdminAuthRepository";
import { DrizzleAuthSessionRepository } from "./AuthRepository";
import { DrizzleCustomerAuthAccountRepository } from "./CustomerAuthRepository";

async function createAuthSessionD1() {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    d1Databases: ["DB"],
  });
  const d1 = await mf.getD1Database("DB");

  await d1
    .prepare(
      `CREATE TABLE sessions (
        id text PRIMARY KEY NOT NULL,
        token_hash text NOT NULL,
        actor_kind text NOT NULL,
        actor_id text NOT NULL,
        status text DEFAULT 'ACTIVE' NOT NULL,
        expires_at text NOT NULL,
        revoked_at text,
        last_used_at text,
        created_request_id text,
        created_ip_hash text,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`
    )
    .run();

  await d1
    .prepare(
      `CREATE TABLE admins (
        id text PRIMARY KEY NOT NULL,
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        password_salt text,
        is_owner integer DEFAULT 0 NOT NULL,
        status text DEFAULT 'ACTIVE' NOT NULL,
        email_verified_at text,
        approved_at text,
        suspension_reason text,
        rejection_reason text,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`
    )
    .run();

  await d1
    .prepare(
      `CREATE TABLE customers (
        id text PRIMARY KEY NOT NULL,
        email text NOT NULL UNIQUE,
        password_hash text,
        password_salt text,
        status text DEFAULT 'ACTIVE' NOT NULL,
        email_verified_at text,
        avatar_url text,
        display_name text,
        first_name text,
        last_name text,
        phone text,
        street_address text,
        barangay text,
        city_province text,
        postal_code text,
        email_marketing_opt_in integer DEFAULT 0 NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`
    )
    .run();

  return { d1, mf };
}

describe("AuthRepository", { timeout: 20_000 }, () => {
  it("normalizes SQLite session timestamps for API DTO consumers", async () => {
    const { d1, mf } = await createAuthSessionD1();

    try {
      await d1
        .prepare(
          `INSERT INTO sessions (
            id, token_hash, actor_kind, actor_id, status, expires_at, revoked_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "session_sqlite",
          "token_hash",
          "ADMIN",
          "admin_1",
          "REVOKED",
          "2026-05-17 21:10:00",
          "2026-05-17 21:09:00"
        )
        .run();

      const repository = new DrizzleAuthSessionRepository(createDb(d1));
      const session = await repository.findByTokenHash("token_hash");

      expect(session).toMatchObject({
        id: "session_sqlite",
        expiresAt: "2026-05-17T21:10:00.000Z",
        revokedAt: "2026-05-17T21:09:00.000Z",
      });
    } finally {
      await mf.dispose();
    }
  });

  it("keeps same-email Admin and Customer lookups in separate auth realms", async () => {
    const { d1, mf } = await createAuthSessionD1();

    try {
      await d1
        .prepare(
          `INSERT INTO admins (
            id, email, password_hash, password_salt, is_owner, status,
            email_verified_at, approved_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "admin_same",
          "same@example.test",
          "admin_hash",
          "admin_salt",
          0,
          "ACTIVE",
          "2026-05-17T21:00:00.000Z",
          "2026-05-17T21:00:00.000Z"
        )
        .run();
      await d1
        .prepare(
          `INSERT INTO customers (
            id, email, password_hash, password_salt, status, email_verified_at
          ) VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "customer_same",
          "same@example.test",
          "customer_hash",
          "customer_salt",
          "ACTIVE",
          "2026-05-17T21:00:00.000Z"
        )
        .run();

      const db = createDb(d1);
      const adminRepository = new DrizzleAdminAuthAccountRepository(db);
      const customerRepository = new DrizzleCustomerAuthAccountRepository(db);

      await expect(
        adminRepository.findByEmail("same@example.test")
      ).resolves.toMatchObject({
        actorKind: "ADMIN",
        id: "admin_same",
        passwordHash: "admin_hash",
      });
      await expect(
        customerRepository.findByEmail("same@example.test")
      ).resolves.toMatchObject({
        actorKind: "CUSTOMER",
        id: "customer_same",
        passwordHash: "customer_hash",
      });
      await expect(
        adminRepository.findByActor("CUSTOMER", "customer_same")
      ).resolves.toBeNull();
      await expect(
        customerRepository.findByActor("ADMIN", "admin_same")
      ).resolves.toBeNull();
    } finally {
      await mf.dispose();
    }
  });

  it("keeps auth repository imports one-way per identity realm", () => {
    const adminSource = readFileSync(
      new URL("./AdminAuthRepository.ts", import.meta.url),
      "utf8"
    );
    const customerSource = readFileSync(
      new URL("./CustomerAuthRepository.ts", import.meta.url),
      "utf8"
    );
    const adminRecoverySource = readFileSync(
      new URL("./AdminAccountRecoveryRepository.ts", import.meta.url),
      "utf8"
    );
    const customerRecoverySource = readFileSync(
      new URL("./CustomerAccountRecoveryRepository.ts", import.meta.url),
      "utf8"
    );
    const googleOAuthSource = readFileSync(
      new URL("./GoogleOAuthRepository.ts", import.meta.url),
      "utf8"
    );

    expect(adminSource).not.toMatch(/\bcustomers\b/);
    expect(customerSource).not.toMatch(/\badmins\b/);
    expect(adminRecoverySource).not.toMatch(/\bcustomers\b/);
    expect(customerRecoverySource).not.toMatch(/\badmins\b/);
    expect(googleOAuthSource).not.toMatch(/\badmins\b/);
  });
});
