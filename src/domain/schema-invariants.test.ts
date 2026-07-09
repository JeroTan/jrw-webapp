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
import {
  checkout_attempts,
  checkout_payment_items,
  checkout_payments,
  checkout_reservation_items,
  checkout_reservation_releases,
  checkout_reservations,
  order_fulfillment_events,
  order_return_records,
  orders,
  payment_webhook_events,
} from "./schema/transactions";

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
    const indexNames = rateLimitConfig.indexes.map(
      (index) => index.config.name
    );

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
        (index) =>
          index.config.name === "email_verification_tokens_token_hash_idx"
      )?.config.unique
    ).toBe(true);
    expect(
      getSqlQuery(
        tokenConfig.indexes.find(
          (index) =>
            index.config.name ===
            "email_verification_tokens_customer_active_idx"
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
          (index) =>
            index.config.name === "password_reset_tokens_actor_active_idx"
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
          (index) =>
            index.config.name === "oauth_state_tokens_provider_active_idx"
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

describe("checkout schema invariants", () => {
  it("keeps order customer reference nullable for guest checkout", () => {
    const orderConfig = getTableConfig(orders);
    const customerIdColumn = orderConfig.columns.find(
      (column) => getColumnName(column) === "customer_id"
    );
    const columnNames = orderConfig.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const indexNames = orderConfig.indexes.map((index) => index.config.name);

    expect(customerIdColumn?.notNull).toBe(false);
    expect(columnNames).toEqual(
      expect.arrayContaining([
        "order_number",
        "checkout_attempt_id",
        "reservation_id",
        "payment_id",
        "checkout_email",
        "full_name",
        "phone",
        "street_address",
        "barangay",
        "city_province",
        "postal_code",
        "payment_status",
        "fulfillment_status",
        "subtotal_centavos",
        "total_centavos",
        "currency",
        "order_confirmation_email_status",
        "created_request_id",
        "updated_request_id",
      ])
    );
    expect(columnNames).not.toEqual(
      expect.arrayContaining([
        "provider_payload",
        "raw_provider_payload",
        "payment_payload",
        "payment_response",
        "checkout_url",
        "card_data",
        "card_number",
        "cvv",
        "attempt_token",
        "raw_token",
      ])
    );
    expect(indexNames).toEqual(
      expect.arrayContaining([
        "uq_orders_order_number",
        "uq_orders_payment_id",
        "idx_orders_checkout_attempt_id",
        "idx_orders_reservation_id",
        "idx_orders_payment_status",
        "idx_orders_fulfillment_status",
      ])
    );
  });

  it("stores checkout attempt contact snapshot without role or provider fields", () => {
    const attemptConfig = getTableConfig(checkout_attempts);
    const columnNames = attemptConfig.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const indexNames = attemptConfig.indexes.map((index) => index.config.name);
    const customerIdColumn = attemptConfig.columns.find(
      (column) => getColumnName(column) === "customer_id"
    );

    expect(columnNames).toEqual(
      expect.arrayContaining([
        "customer_id",
        "checkout_email",
        "full_name",
        "first_name",
        "last_name",
        "phone",
        "street_address",
        "barangay",
        "city_province",
        "postal_code",
        "privacy_acknowledged_at",
        "attempt_token_hash",
        "cart_fingerprint",
        "reservation_id",
        "reservation_expires_at",
        "created_request_id",
        "updated_request_id",
      ])
    );
    expect(columnNames).not.toEqual(
      expect.arrayContaining([
        "role",
        "email_verified",
        "provider_metadata",
        "payment_payload",
        "payment_response",
        "attempt_token",
        "raw_token",
        "token",
        "card_data",
      ])
    );
    expect(customerIdColumn?.notNull).toBe(false);
    expect(indexNames).toEqual(
      expect.arrayContaining([
        "idx_checkout_attempts_customer_id",
        "idx_checkout_attempts_checkout_email",
        "idx_checkout_attempts_reservation_id",
        "idx_checkout_attempts_created_at",
      ])
    );
  });

  it("stores reservation records without raw provider, payment, or token material", () => {
    const reservationConfig = getTableConfig(checkout_reservations);
    const itemConfig = getTableConfig(checkout_reservation_items);
    const reservationColumns = reservationConfig.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const itemColumns = itemConfig.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const reservationIndexes = reservationConfig.indexes.map(
      (index) => index.config.name
    );
    const itemIndexes = itemConfig.indexes.map((index) => index.config.name);

    expect(reservationColumns).toEqual(
      expect.arrayContaining([
        "checkout_attempt_id",
        "status",
        "cart_fingerprint",
        "subtotal_centavos",
        "expires_at",
        "created_request_id",
      ])
    );
    expect(itemColumns).toEqual(
      expect.arrayContaining([
        "reservation_id",
        "product_id",
        "variant_id",
        "quantity",
        "price_centavos",
        "reservation_mode",
      ])
    );
    expect([...reservationColumns, ...itemColumns]).not.toEqual(
      expect.arrayContaining([
        "token",
        "token_hash",
        "raw_token",
        "payment_payload",
        "provider_payload",
        "paymongo_payload",
        "card_data",
        "stock_version",
        "stock_lock_version",
      ])
    );
    expect(reservationIndexes).toEqual(
      expect.arrayContaining([
        "idx_checkout_reservations_attempt_id",
        "idx_checkout_reservations_status",
        "idx_checkout_reservations_expires_at",
        "uq_checkout_reservations_active_attempt",
        "uq_checkout_reservations_active_attempt_cart",
      ])
    );
    expect(itemIndexes).toEqual(
      expect.arrayContaining([
        "idx_checkout_reservation_items_reservation_id",
        "idx_checkout_reservation_items_variant_id",
      ])
    );
  });

  it("stores payment handoff records without raw provider payloads or card material", () => {
    const paymentConfig = getTableConfig(checkout_payments);
    const itemConfig = getTableConfig(checkout_payment_items);
    const paymentColumns = paymentConfig.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const itemColumns = itemConfig.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const paymentIndexes = paymentConfig.indexes.map(
      (index) => index.config.name
    );
    const itemIndexes = itemConfig.indexes.map((index) => index.config.name);

    expect(paymentColumns).toEqual(
      expect.arrayContaining([
        "checkout_attempt_id",
        "reservation_id",
        "provider",
        "provider_checkout_session_id",
        "provider_reference_number",
        "status",
        "amount_centavos",
        "currency",
        "checkout_url",
        "livemode",
        "payment_status_email_status",
        "payment_status_email_sent_at",
        "payment_status_email_last_attempt_at",
        "payment_status_email_message_id",
        "created_request_id",
        "updated_request_id",
      ])
    );
    expect(itemColumns).toEqual(
      expect.arrayContaining([
        "payment_id",
        "product_id",
        "variant_id",
        "name",
        "amount_centavos",
        "currency",
        "quantity",
      ])
    );
    expect([...paymentColumns, ...itemColumns]).not.toEqual(
      expect.arrayContaining([
        "token",
        "raw_token",
        "secret",
        "signature",
        "authorization",
        "provider_payload",
        "paymongo_payload",
        "payment_payload",
        "payment_response",
        "card_data",
        "card_number",
        "cvv",
        "checkout_email",
        "phone",
        "street_address",
      ])
    );
    expect(paymentIndexes).toEqual(
      expect.arrayContaining([
        "idx_checkout_payments_attempt_id",
        "idx_checkout_payments_reservation_id",
        "idx_checkout_payments_status",
        "idx_checkout_payments_created_at",
        "uq_checkout_payments_provider_session",
        "uq_checkout_payments_provider_reference",
        "uq_checkout_payments_pending_attempt_reservation",
      ])
    );
    expect(itemIndexes).toEqual(
      expect.arrayContaining([
        "idx_checkout_payment_items_payment_id",
        "idx_checkout_payment_items_variant_id",
      ])
    );
  });

  it("stores reservation release idempotency without provider payloads or customer data", () => {
    const config = getTableConfig(checkout_reservation_releases);
    const columns = config.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const indexes = config.indexes.map((index) => index.config.name);
    const releaseItemIndex = config.indexes.find(
      (index) => index.config.name === "uq_checkout_reservation_releases_item"
    );

    expect(columns).toEqual(
      expect.arrayContaining([
        "reservation_id",
        "reservation_item_id",
        "checkout_attempt_id",
        "payment_id",
        "product_id",
        "variant_id",
        "quantity",
        "reservation_mode",
        "release_reason",
        "status",
        "error_code",
        "requested_at",
        "applied_at",
        "failed_at",
        "created_request_id",
        "updated_request_id",
      ])
    );
    expect(columns).not.toEqual(
      expect.arrayContaining([
        "raw_payload",
        "provider_payload",
        "raw_signature",
        "signature",
        "headers",
        "authorization",
        "checkout_url",
        "card_data",
        "card_number",
        "checkout_email",
        "phone",
        "street_address",
        "attempt_token",
        "provider_secret",
      ])
    );
    expect(indexes).toEqual(
      expect.arrayContaining([
        "uq_checkout_reservation_releases_item",
        "idx_checkout_reservation_releases_reservation_id",
        "idx_checkout_reservation_releases_payment_id",
        "idx_checkout_reservation_releases_status",
      ])
    );
    expect(releaseItemIndex?.config.unique).toBe(true);
  });

  it("stores webhook idempotency without payload, signature, or customer data", () => {
    const config = getTableConfig(payment_webhook_events);
    const columns = config.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const indexes = config.indexes.map((index) => index.config.name);

    expect(columns).toEqual(
      expect.arrayContaining([
        "provider_event_id",
        "event_type",
        "payload_hash",
        "processing_status",
        "related_payment_id",
        "provider_checkout_session_id",
        "provider_payment_id",
        "provider_payment_intent_id",
        "first_request_id",
        "last_request_id",
        "received_at",
        "processed_at",
      ])
    );
    expect(columns).not.toEqual(
      expect.arrayContaining([
        "raw_payload",
        "provider_payload",
        "raw_signature",
        "signature",
        "headers",
        "authorization",
        "checkout_url",
        "card_data",
        "card_number",
        "checkout_email",
        "phone",
        "street_address",
        "attempt_token",
        "provider_secret",
      ])
    );
    expect(indexes).toEqual(
      expect.arrayContaining([
        "uq_payment_webhook_events_provider_event_id",
        "idx_payment_webhook_events_event_type",
        "idx_payment_webhook_events_processing_status",
        "idx_payment_webhook_events_related_payment_id",
        "idx_payment_webhook_events_created_at",
      ])
    );
  });

  it("stores fulfillment transition events without provider payloads or customer data", () => {
    const config = getTableConfig(order_fulfillment_events);
    const columns = config.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const indexes = config.indexes.map((index) => index.config.name);
    const requestIdIndex = config.indexes.find(
      (index) => index.config.name === "uq_order_fulfillment_events_request_id"
    );

    expect(columns).toEqual(
      expect.arrayContaining([
        "order_id",
        "actor_id",
        "old_fulfillment_status",
        "new_fulfillment_status",
        "request_id",
        "email_status",
        "email_sent_at",
        "email_last_attempt_at",
        "email_message_id",
        "created_at",
        "updated_at",
      ])
    );
    expect(columns).not.toEqual(
      expect.arrayContaining([
        "checkout_email",
        "phone",
        "street_address",
        "provider_payload",
        "raw_payload",
        "paymongo_payload",
        "payment_response",
        "card_data",
        "token",
        "secret",
        "signature",
      ])
    );
    expect(indexes).toEqual(
      expect.arrayContaining([
        "uq_order_fulfillment_events_request_id",
        "idx_order_fulfillment_events_order_id",
        "idx_order_fulfillment_events_email_status",
        "idx_order_fulfillment_events_created_at",
      ])
    );
    expect(requestIdIndex?.config.unique).toBe(true);
  });

  it("stores return records append-only without provider payloads or customer contact", () => {
    const config = getTableConfig(order_return_records);
    const columns = config.columns
      .map((column) => getColumnName(column))
      .filter((name): name is string => Boolean(name));
    const indexes = config.indexes.map((index) => index.config.name);
    const requestIdIndex = config.indexes.find(
      (index) => index.config.name === "uq_order_return_records_request_id"
    );

    expect(columns).toEqual(
      expect.arrayContaining([
        "order_id",
        "order_snapshot_id",
        "target_type",
        "previous_return_status",
        "return_status",
        "amount_centavos",
        "currency",
        "reason",
        "notes",
        "reference_id",
        "actor_id",
        "request_id",
        "created_at",
        "updated_at",
      ])
    );
    expect(columns).not.toEqual(
      expect.arrayContaining([
        "checkout_email",
        "phone",
        "street_address",
        "provider_payload",
        "raw_payload",
        "paymongo_payload",
        "payment_response",
        "card_data",
        "token",
        "secret",
        "signature",
      ])
    );
    expect(indexes).toEqual(
      expect.arrayContaining([
        "uq_order_return_records_request_id",
        "idx_order_return_records_order_id",
        "idx_order_return_records_order_snapshot_id",
        "idx_order_return_records_return_status",
        "idx_order_return_records_created_at",
      ])
    );
    expect(requestIdIndex?.config.unique).toBe(true);
  });
});
