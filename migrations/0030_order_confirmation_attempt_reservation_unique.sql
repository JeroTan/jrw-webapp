CREATE UNIQUE INDEX uq_orders_checkout_attempt_id
  ON orders(checkout_attempt_id)
  WHERE checkout_attempt_id IS NOT NULL;

CREATE UNIQUE INDEX uq_orders_reservation_id
  ON orders(reservation_id)
  WHERE reservation_id IS NOT NULL;
