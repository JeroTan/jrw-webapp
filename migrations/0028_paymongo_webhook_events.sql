CREATE TABLE payment_webhook_events (
  id text PRIMARY KEY NOT NULL,
  provider text DEFAULT 'PAYMONGO' NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  payload_hash text NOT NULL,
  processing_status text DEFAULT 'RECEIVED' NOT NULL,
  related_payment_id text,
  provider_checkout_session_id text,
  provider_payment_id text,
  provider_payment_intent_id text,
  first_request_id text NOT NULL,
  last_request_id text NOT NULL,
  received_at text NOT NULL,
  processed_at text,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (related_payment_id) REFERENCES checkout_payments(id) ON DELETE set null
);

CREATE UNIQUE INDEX uq_payment_webhook_events_provider_event_id
  ON payment_webhook_events(provider_event_id);
CREATE INDEX idx_payment_webhook_events_event_type
  ON payment_webhook_events(event_type);
CREATE INDEX idx_payment_webhook_events_processing_status
  ON payment_webhook_events(processing_status);
CREATE INDEX idx_payment_webhook_events_related_payment_id
  ON payment_webhook_events(related_payment_id);
CREATE INDEX idx_payment_webhook_events_created_at
  ON payment_webhook_events(created_at);
