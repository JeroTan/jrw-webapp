# JRW Order Status Flow

Customer-facing order status is shown as a newest-first timeline. Backoffice should keep payment, fulfillment, return, and refund as separate lanes, then project safe customer labels from those lanes.

Idle return and refund values are not process steps. `RETURN_NOT_REQUESTED` and `REFUND_NOT_REQUESTED` mean there is no active case, so they must not point to "requested" in the flow.

```mermaid
flowchart TD
  checkout["Checkout submitted"] --> paymentPending["Payment pending"]

  subgraph paymentLane["Payment lane"]
    paymentPending -->|PayMongo paid webhook or reconciliation| paymentPaid["Payment paid"]
    paymentPending -->|Failed| paymentFailed["Payment failed"]
    paymentPending -->|Expired or stale pending timeout| paymentExpired["Payment expired"]
    paymentPending -->|Buyer/provider cancelled before payment| paymentCancelled["Payment cancelled"]
  end

  subgraph fulfillmentLane["Fulfillment lane"]
    paymentPaid --> orderPlaced["Order placed"]
    orderPlaced --> processing["Processing / packed by JRW"]
    processing --> shipped["Shipped / parcel picked up"]
    shipped --> delivered["Delivered"]
    orderPlaced -->|Cancel before shipping| fulfillmentCancelled["Order cancelled"]
    processing -->|Cancel before shipping| fulfillmentCancelled
  end

  paymentFailed -.-> noOrder["No order prepared"]
  paymentExpired -.-> noOrder
  paymentCancelled -.-> noOrder

  subgraph returnLane["Return lane, only when return exists"]
    delivered -->|Customer/admin opens return case| returnRequested["Return requested"]
    returnRequested --> returnApproved["Return approved"]
    returnRequested --> returnRejected["Return unavailable"]
    returnRequested --> returnCancelled["Return cancelled"]
    returnApproved --> returnReceived["Return received"]
    returnReceived --> returnCompleted["Return completed"]
  end

  subgraph refundLane["Refund lane, only when refund exists"]
    paymentPaid -->|Customer/admin opens refund case| refundPending["Refund requested / pending"]
    fulfillmentCancelled -->|Paid order cancelled before shipping| refundPending
    returnCompleted -->|Returned order qualifies for refund| refundPending
    refundPending --> refundApproved["Refund approved"]
    refundPending --> refundDeclined["Refund unavailable"]
    refundPending --> refundFailed["Refund failed"]
    refundApproved --> refundSent["Refund sent"]
  end
```

## Customer Timeline Projection

- Latest meaningful event appears first.
- Raw database values such as `PAYMENT_PAID` and `ORDER_PLACED` do not render in customer UI.
- Default inactive lanes such as "No return requested" and "No refund requested" stay out of the main timeline and out of the process arrows.
- Item display uses `order_snapshots` only; current catalog data must not rewrite historical order truth.

## Cancellation Rules

- Payment cancelled, failed, or expired before payment means no fulfillment is prepared and no refund is needed.
- Order cancelled after payment is paid means fulfillment stops and a refund case should be opened.
- Order cannot normally be cancelled after shipping; customer path becomes return support instead.
