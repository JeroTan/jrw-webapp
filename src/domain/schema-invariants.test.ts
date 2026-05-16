import { SQL } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import {
  admins,
  auth_rate_limits,
  customers,
  email_verification_tokens,
  customer_providers,
  oauth_state_tokens,
  password_reset_tokens,
  sessions,
} from "./schema/identity";

function getColumnName(column: unknown): string | undefined {
  if (typeof column !== "object" || column === null || !("name" in column)) {
    return undefined;
  }

  const name = column.name;
  return typeof name === "string" ? name : undefined;
}

function getSqlQuery(value: unknown): string | undefined {
  if (!(value instanceof SQL)) {
    return undefined;
  }

  return value.toQuery({
    casing: {
      getColumnCasing: (column: { name: string }) => column.name,
    },
    escapeName: (name: string) => `"${name}"`,
    escapeParam: () => "?",
    escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
    invokeSource: "indexes",
  } as never).sql;
}

describe("identity schema invariants", () => {
  it("enforces a single owner admin with a unique partial index", () => {
    const adminConfig = getTableConfig(admins);
    const columnNames = adminConfig.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const ownerIndex = adminConfig.indexes.find(
      (index) => index.config.name === "admins_single_owner_idx"
    );

    expect(columnNames).toEqual(
      expect.arrayContaining([
        "status",
        "email_verified_at",
        "approved_at",
        "suspension_reason",
        "rejection_reason",
      ])
    );
    expect(columnNames).not.toEqual(
      expect.arrayContaining([
        "role",
        "raw_password",
        "session_token",
        "reset_token",
        "provider_metadata",
      ])
    );
    expect(ownerIndex?.config.unique).toBe(true);
    expect(
      ownerIndex?.config.columns.map((column) => getColumnName(column))
    ).toEqual([undefined]);
    expect(getSqlQuery(ownerIndex?.config.columns[0])).toBe("1");
    expect(getSqlQuery(ownerIndex?.config.where)).toBe('"is_owner" <> 0');
  });

  it("stores server-side sessions without raw secret material and with lookup indexes", () => {
    const sessionConfig = getTableConfig(sessions);
    const columnNames = sessionConfig.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const indexNames = sessionConfig.indexes.map((index) => index.config.name);

    expect(columnNames).toEqual(
      expect.arrayContaining([
        "id",
        "token_hash",
        "actor_kind",
        "actor_id",
        "status",
        "expires_at",
        "revoked_at",
        "last_used_at",
        "created_request_id",
        "created_ip_hash",
        "created_at",
        "updated_at",
      ])
    );
    expect(columnNames).not.toEqual(
      expect.arrayContaining([
        "token",
        "raw_token",
        "cookie",
        "jwt",
        "password",
        "pepper",
        "provider_token",
      ])
    );
    expect(indexNames).toEqual(
      expect.arrayContaining([
        "sessions_token_hash_idx",
        "sessions_actor_idx",
        "sessions_actor_active_idx",
        "sessions_active_expiry_idx",
        "sessions_revoked_at_idx",
      ])
    );
    expect(
      sessionConfig.indexes.find(
        (index) => index.config.name === "sessions_token_hash_idx"
      )?.config.unique
    ).toBe(true);
  });

  it("stores auth rate-limit buckets by hashed scope and window", () => {
    const rateLimitConfig = getTableConfig(auth_rate_limits);
    const columnNames = rateLimitConfig.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const indexNames = rateLimitConfig.indexes.map((index) => index.config.name);

    expect(columnNames).toEqual(
      expect.arrayContaining([
        "id",
        "scope_hash",
        "window_start",
        "attempt_count",
        "expires_at",
        "created_at",
        "updated_at",
      ])
    );
    expect(columnNames).not.toEqual(
      expect.arrayContaining(["email", "ip_address", "raw_ip", "password"])
    );
    expect(indexNames).toEqual(
      expect.arrayContaining([
        "auth_rate_limits_scope_window_idx",
        "auth_rate_limits_expires_at_idx",
      ])
    );
    expect(
      rateLimitConfig.indexes.find(
        (index) => index.config.name === "auth_rate_limits_scope_window_idx"
      )?.config.unique
    ).toBe(true);
  });

  it("stores customer profile fields without adding role or secret columns", () => {
    const customerConfig = getTableConfig(customers);
    const columnNames = customerConfig.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));

    expect(columnNames).toEqual(
      expect.arrayContaining([
        "display_name",
        "email_marketing_opt_in",
        "first_name",
        "last_name",
        "phone",
        "street_address",
        "barangay",
        "city_province",
        "postal_code",
        "avatar_url",
      ])
    );
    expect(columnNames).not.toEqual(
      expect.arrayContaining(["role", "raw_password", "verification_token"])
    );
  });

  it("stores email verification tokens as hashes with lookup and cleanup indexes", () => {
    const tokenConfig = getTableConfig(email_verification_tokens);
    const columnNames = tokenConfig.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const indexNames = tokenConfig.indexes.map((index) => index.config.name);

    expect(columnNames).toEqual(
      expect.arrayContaining([
        "id",
        "customer_id",
        "token_hash",
        "expires_at",
        "used_at",
        "created_request_id",
        "source_hash",
        "created_at",
        "updated_at",
      ])
    );
    expect(columnNames).not.toEqual(
      expect.arrayContaining(["token", "raw_token", "email", "password"])
    );
    expect(indexNames).toEqual(
      expect.arrayContaining([
        "email_verification_tokens_token_hash_idx",
        "email_verification_tokens_customer_idx",
        "email_verification_tokens_customer_active_idx",
        "email_verification_tokens_expires_at_idx",
      ])
    );
    expect(
      tokenConfig.indexes.find(
        (index) => index.config.name === "email_verification_tokens_token_hash_idx"
      )?.config.unique
    ).toBe(true);
    expect(
      getSqlQuery(
        tokenConfig.indexes.find(
          (index) => index.config.name === "email_verification_tokens_customer_active_idx"
        )?.config.where
      )
    ).toBe('"used_at" IS NULL');
  });

  it("stores password reset tokens as hashes with polymorphic actor indexes", () => {
    const tokenConfig = getTableConfig(password_reset_tokens);
    const columnNames = tokenConfig.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const indexNames = tokenConfig.indexes.map((index) => index.config.name);

    expect(columnNames).toEqual(
      expect.arrayContaining([
        "id",
        "actor_kind",
        "actor_id",
        "token_hash",
        "expires_at",
        "used_at",
        "created_request_id",
        "source_hash",
        "created_at",
        "updated_at",
      ])
    );
    expect(columnNames).not.toEqual(
      expect.arrayContaining([
        "token",
        "raw_token",
        "email",
        "password",
        "pepper",
      ])
    );
    expect(indexNames).toEqual(
      expect.arrayContaining([
        "password_reset_tokens_token_hash_idx",
        "password_reset_tokens_actor_idx",
        "password_reset_tokens_actor_active_idx",
        "password_reset_tokens_expires_at_idx",
      ])
    );
    expect(
      tokenConfig.indexes.find(
        (index) => index.config.name === "password_reset_tokens_token_hash_idx"
      )?.config.unique
    ).toBe(true);
    expect(
      getSqlQuery(
        tokenConfig.indexes.find(
          (index) => index.config.name === "password_reset_tokens_actor_active_idx"
        )?.config.where
      )
    ).toBe('"used_at" IS NULL');
  });

  it("stores OAuth state and nonce material as hashes with single-use indexes", () => {
    const stateConfig = getTableConfig(oauth_state_tokens);
    const columnNames = stateConfig.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const indexNames = stateConfig.indexes.map((index) => index.config.name);

    expect(columnNames).toEqual(
      expect.arrayContaining([
        "id",
        "provider",
        "state_hash",
        "nonce_hash",
        "redirect_path",
        "expires_at",
        "used_at",
        "created_request_id",
        "source_hash",
        "created_at",
        "updated_at",
      ])
    );
    expect(columnNames).not.toEqual(
      expect.arrayContaining([
        "state",
        "raw_state",
        "nonce",
        "raw_nonce",
        "authorization_code",
        "access_token",
        "refresh_token",
        "id_token",
        "provider_payload",
      ])
    );
    expect(indexNames).toEqual(
      expect.arrayContaining([
        "oauth_state_tokens_state_hash_idx",
        "oauth_state_tokens_provider_active_idx",
        "oauth_state_tokens_expires_at_idx",
      ])
    );
    expect(
      stateConfig.indexes.find(
        (index) => index.config.name === "oauth_state_tokens_state_hash_idx"
      )?.config.unique
    ).toBe(true);
    expect(
      getSqlQuery(
        stateConfig.indexes.find(
          (index) => index.config.name === "oauth_state_tokens_provider_active_idx"
        )?.config.where
      )
    ).toBe('"used_at" IS NULL');
  });

  it("keeps provider identity unique by provider and provider user id", () => {
    const providerConfig = getTableConfig(customer_providers);
    const indexNames = providerConfig.indexes.map((index) => index.config.name);
    const providerIdentityIndex = providerConfig.indexes.find(
      (index) => index.config.name === "customer_providers_provider_user_idx"
    );

    expect(indexNames).toContain("customer_providers_provider_user_idx");
    expect(providerIdentityIndex?.config.unique).toBe(true);
    expect(
      providerIdentityIndex?.config.columns.map((column) =>
        getColumnName(column)
      )
    ).toEqual(["provider", "provider_user_id"]);
  });
});
