ALTER TABLE checkout_attempts ADD COLUMN attempt_token_hash text NOT NULL DEFAULT '';
ALTER TABLE checkout_attempts ADD COLUMN cart_fingerprint text;
ALTER TABLE checkout_attempts ADD COLUMN reservation_id text;
ALTER TABLE checkout_attempts ADD COLUMN reservation_expires_at text;
ALTER TABLE checkout_attempts ADD COLUMN updated_request_id text;

CREATE INDEX idx_checkout_attempts_reservation_id
  ON checkout_attempts(reservation_id);

CREATE TABLE checkout_reservations (
  id text PRIMARY KEY NOT NULL,
  checkout_attempt_id text NOT NULL,
  status text DEFAULT 'ACTIVE' NOT NULL,
  cart_fingerprint text NOT NULL,
  subtotal_centavos integer DEFAULT 0 NOT NULL,
  expires_at text NOT NULL,
  created_request_id text NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (checkout_attempt_id) REFERENCES checkout_attempts(id) ON DELETE cascade
);

CREATE INDEX idx_checkout_reservations_attempt_id
  ON checkout_reservations(checkout_attempt_id);
CREATE INDEX idx_checkout_reservations_status
  ON checkout_reservations(status);
CREATE INDEX idx_checkout_reservations_expires_at
  ON checkout_reservations(expires_at);
CREATE UNIQUE INDEX uq_checkout_reservations_active_attempt_cart
  ON checkout_reservations(checkout_attempt_id, cart_fingerprint)
  WHERE status = 'ACTIVE';

CREATE TABLE checkout_reservation_items (
  id text PRIMARY KEY NOT NULL,
  reservation_id text NOT NULL,
  product_id text,
  variant_id text,
  quantity integer NOT NULL,
  price_centavos integer NOT NULL,
  reservation_mode text DEFAULT 'STOCK' NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES checkout_reservations(id) ON DELETE cascade,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE set null,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE set null
);

CREATE INDEX idx_checkout_reservation_items_reservation_id
  ON checkout_reservation_items(reservation_id);
CREATE INDEX idx_checkout_reservation_items_variant_id
  ON checkout_reservation_items(variant_id);
