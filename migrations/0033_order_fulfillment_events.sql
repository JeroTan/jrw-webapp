CREATE TABLE order_fulfillment_events (
  id text PRIMARY KEY NOT NULL,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE cascade,
  actor_id text,
  old_fulfillment_status text NOT NULL,
  new_fulfillment_status text NOT NULL,
  request_id text NOT NULL,
  email_status text DEFAULT 'PENDING' NOT NULL,
  email_sent_at text,
  email_last_attempt_at text,
  email_message_id text,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX uq_order_fulfillment_events_request_id
  ON order_fulfillment_events(request_id);
CREATE INDEX idx_order_fulfillment_events_order_id
  ON order_fulfillment_events(order_id);
CREATE INDEX idx_order_fulfillment_events_email_status
  ON order_fulfillment_events(email_status);
CREATE INDEX idx_order_fulfillment_events_created_at
  ON order_fulfillment_events(created_at);
