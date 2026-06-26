ALTER TABLE orders ADD COLUMN order_number text;
ALTER TABLE orders ADD COLUMN checkout_attempt_id text REFERENCES checkout_attempts(id) ON DELETE set null;
ALTER TABLE orders ADD COLUMN reservation_id text REFERENCES checkout_reservations(id) ON DELETE set null;
ALTER TABLE orders ADD COLUMN payment_id text REFERENCES checkout_payments(id) ON DELETE set null;
ALTER TABLE orders ADD COLUMN checkout_email text;
ALTER TABLE orders ADD COLUMN full_name text;
ALTER TABLE orders ADD COLUMN phone text;
ALTER TABLE orders ADD COLUMN street_address text;
ALTER TABLE orders ADD COLUMN barangay text;
ALTER TABLE orders ADD COLUMN city_province text;
ALTER TABLE orders ADD COLUMN postal_code text;
ALTER TABLE orders ADD COLUMN payment_status text DEFAULT 'PAYMENT_PENDING' NOT NULL;
ALTER TABLE orders ADD COLUMN fulfillment_status text DEFAULT 'ORDER_PLACED' NOT NULL;
ALTER TABLE orders ADD COLUMN subtotal_centavos integer DEFAULT 0 NOT NULL;
ALTER TABLE orders ADD COLUMN total_centavos integer DEFAULT 0 NOT NULL;
ALTER TABLE orders ADD COLUMN currency text DEFAULT 'PHP' NOT NULL;
ALTER TABLE orders ADD COLUMN order_confirmation_email_status text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE orders ADD COLUMN order_confirmation_email_sent_at text;
ALTER TABLE orders ADD COLUMN order_confirmation_email_last_attempt_at text;
ALTER TABLE orders ADD COLUMN order_confirmation_email_message_id text;
ALTER TABLE orders ADD COLUMN created_request_id text;
ALTER TABLE orders ADD COLUMN updated_request_id text;

CREATE UNIQUE INDEX uq_orders_order_number
  ON orders(order_number)
  WHERE order_number IS NOT NULL;
CREATE UNIQUE INDEX uq_orders_payment_id
  ON orders(payment_id)
  WHERE payment_id IS NOT NULL;
CREATE INDEX idx_orders_checkout_attempt_id
  ON orders(checkout_attempt_id);
CREATE INDEX idx_orders_reservation_id
  ON orders(reservation_id);
CREATE INDEX idx_orders_payment_status
  ON orders(payment_status);
CREATE INDEX idx_orders_fulfillment_status
  ON orders(fulfillment_status);
