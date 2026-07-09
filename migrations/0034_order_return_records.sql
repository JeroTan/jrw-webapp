CREATE TABLE order_return_records (
  id text PRIMARY KEY NOT NULL,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE cascade,
  order_snapshot_id text REFERENCES order_snapshots(id) ON DELETE set null,
  target_type text NOT NULL CHECK (target_type IN ('ORDER', 'ITEM')),
  previous_return_status text,
  return_status text NOT NULL CHECK (
    return_status IN (
      'RETURN_REQUESTED',
      'RETURN_APPROVED',
      'RETURN_REJECTED',
      'RETURN_RECEIVED',
      'RETURN_COMPLETED',
      'RETURN_CANCELLED'
    )
  ),
  amount_centavos integer CHECK (amount_centavos IS NULL OR amount_centavos >= 0),
  currency text DEFAULT 'PHP' NOT NULL,
  reason text NOT NULL,
  notes text,
  reference_id text,
  actor_id text,
  request_id text NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX uq_order_return_records_request_id
  ON order_return_records(request_id);
CREATE INDEX idx_order_return_records_order_id
  ON order_return_records(order_id);
CREATE INDEX idx_order_return_records_order_snapshot_id
  ON order_return_records(order_snapshot_id);
CREATE INDEX idx_order_return_records_return_status
  ON order_return_records(return_status);
CREATE INDEX idx_order_return_records_created_at
  ON order_return_records(created_at);
