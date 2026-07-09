CREATE TABLE order_refund_records (
  id text PRIMARY KEY NOT NULL,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE cascade,
  order_snapshot_id text REFERENCES order_snapshots(id) ON DELETE set null,
  target_type text NOT NULL CHECK (target_type IN ('ORDER', 'ITEM')),
  previous_refund_status text,
  refund_status text NOT NULL CHECK (
    refund_status IN (
      'REFUND_PENDING',
      'REFUND_APPROVED',
      'REFUND_DECLINED',
      'REFUND_SENT',
      'REFUND_FAILED'
    )
  ),
  amount_centavos integer NOT NULL CHECK (amount_centavos > 0),
  currency text DEFAULT 'PHP' NOT NULL,
  reason text NOT NULL,
  notes text,
  reference_id text,
  actor_id text,
  request_id text NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX uq_order_refund_records_request_id
  ON order_refund_records(request_id);
CREATE INDEX idx_order_refund_records_order_id
  ON order_refund_records(order_id);
CREATE INDEX idx_order_refund_records_order_snapshot_id
  ON order_refund_records(order_snapshot_id);
CREATE INDEX idx_order_refund_records_refund_status
  ON order_refund_records(refund_status);
CREATE INDEX idx_order_refund_records_created_at
  ON order_refund_records(created_at);
