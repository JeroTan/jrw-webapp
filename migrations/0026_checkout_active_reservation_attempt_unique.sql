CREATE UNIQUE INDEX uq_checkout_reservations_active_attempt
  ON checkout_reservations(checkout_attempt_id)
  WHERE status = 'ACTIVE';
