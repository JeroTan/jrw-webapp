CREATE TABLE checkout_payments (
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
  updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (checkout_attempt_id) REFERENCES checkout_attempts(id) ON DELETE cascade,
  FOREIGN KEY (reservation_id) REFERENCES checkout_reservations(id) ON DELETE cascade
);

CREATE INDEX idx_checkout_payments_attempt_id
  ON checkout_payments(checkout_attempt_id);
CREATE INDEX idx_checkout_payments_reservation_id
  ON checkout_payments(reservation_id);
CREATE INDEX idx_checkout_payments_status
  ON checkout_payments(status);
CREATE INDEX idx_checkout_payments_created_at
  ON checkout_payments(created_at);
CREATE UNIQUE INDEX uq_checkout_payments_provider_session
  ON checkout_payments(provider_checkout_session_id);
CREATE UNIQUE INDEX uq_checkout_payments_provider_reference
  ON checkout_payments(provider_reference_number);
CREATE UNIQUE INDEX uq_checkout_payments_pending_attempt_reservation
  ON checkout_payments(checkout_attempt_id, reservation_id)
  WHERE status = 'PAYMENT_PENDING';

CREATE TABLE checkout_payment_items (
  id text PRIMARY KEY NOT NULL,
  payment_id text NOT NULL,
  product_id text,
  variant_id text,
  name text NOT NULL,
  amount_centavos integer NOT NULL,
  currency text DEFAULT 'PHP' NOT NULL,
  quantity integer NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES checkout_payments(id) ON DELETE cascade,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE set null,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE set null
);

CREATE INDEX idx_checkout_payment_items_payment_id
  ON checkout_payment_items(payment_id);
CREATE INDEX idx_checkout_payment_items_variant_id
  ON checkout_payment_items(variant_id);
