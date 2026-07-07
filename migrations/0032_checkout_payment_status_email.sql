ALTER TABLE checkout_payments
  ADD COLUMN payment_status_email_status text DEFAULT 'PENDING' NOT NULL;

ALTER TABLE checkout_payments
  ADD COLUMN payment_status_email_sent_at text;

ALTER TABLE checkout_payments
  ADD COLUMN payment_status_email_last_attempt_at text;

ALTER TABLE checkout_payments
  ADD COLUMN payment_status_email_message_id text;
