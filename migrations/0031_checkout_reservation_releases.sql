CREATE TABLE checkout_reservation_releases (
  id text PRIMARY KEY NOT NULL,
  reservation_id text NOT NULL REFERENCES checkout_reservations(id) ON DELETE cascade,
  reservation_item_id text NOT NULL REFERENCES checkout_reservation_items(id) ON DELETE cascade,
  checkout_attempt_id text NOT NULL REFERENCES checkout_attempts(id) ON DELETE cascade,
  payment_id text REFERENCES checkout_payments(id) ON DELETE set null,
  product_id text REFERENCES products(id) ON DELETE set null,
  variant_id text REFERENCES product_variants(id) ON DELETE set null,
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
);

CREATE UNIQUE INDEX uq_checkout_reservation_releases_item
  ON checkout_reservation_releases(reservation_item_id);
CREATE INDEX idx_checkout_reservation_releases_reservation_id
  ON checkout_reservation_releases(reservation_id);
CREATE INDEX idx_checkout_reservation_releases_payment_id
  ON checkout_reservation_releases(payment_id);
CREATE INDEX idx_checkout_reservation_releases_status
  ON checkout_reservation_releases(status);
