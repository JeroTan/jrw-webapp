import { Miniflare } from "miniflare";
import { describe, expect, it } from "vitest";
import { createDb } from "@/adapter/infrastructure/db/client";
import { DrizzleAuthSessionRepository } from "./AuthRepository";

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
});
