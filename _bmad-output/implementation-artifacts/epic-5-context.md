# Epic 5 Context: Inventory-Safe Checkout and PayMongo Payments

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Enable guest and signed-in shoppers to complete server-authoritative checkout without overselling stock or exposing raw payment data. Checkout captures required contact/delivery details, reserves validated inventory, creates PayMongo Hosted Checkout sessions through JRW's single merchant account, reconciles verified provider events, and sends safe payment/receipt updates.

## Stories

- Story 5.1: Checkout Identity, Contact, and Delivery Validation
- Story 5.2: Server Cart Validation and Inventory Reservation
- Story 5.3: PayMongo Payment Creation and Handoff
- Story 5.4: PayMongo Webhook Verification and Idempotency
- Story 5.5: Payment Reconciliation and Order Confirmation
- Story 5.6: Release Reserved Inventory After Failed or Cancelled Payment
- Story 5.7: Checkout Receipt, Payment Status, and Payment Emails

## Requirements & Constraints

- Guest checkout remains supported; account creation must not block checkout.
- Payment handoff requires valid checkout details, accepted server cart state, and active inventory reservation.
- PayMongo payment creation uses JRW's single merchant account and integer centavos from server reservation truth.
- JRW never collects raw card details. Provider secrets, raw payloads, tokens, checkout URLs, and unnecessary PII must not appear in public responses, logs, or audit data.
- Provider failures and timeouts map to stable safe errors with request IDs and retry-safe handling.
- Duplicate payment or webhook requests must not duplicate provider sessions, payment records, stock movements, orders, or emails.
- Redirect parameters never prove payment success. Verified webhook/reconciliation state drives payment and order confirmation.
- Payment state and fulfillment state remain separate.

## Technical Decisions

- Use Route -> Controller -> Service -> Domain/Repository layering. Keep PayMongo behind a Workers-compatible backend client.
- D1/Drizzle remains source of truth. Durable Objects coordinate inventory-sensitive checkout operations; database uniqueness and guarded state transitions provide durable idempotency.
- Inventory reservation gates PayMongo handoff. Release operations must be idempotent and must not over-restore stock.
- Validate before provider calls, persistence, redirect, inventory mutation, and state transitions.
- Public APIs use standard success/error envelopes and request IDs. Provider internals stay server-side.
- PayMongo webhooks require signature verification before mutation and recorded idempotency keys before side effects.

## UX & Interaction Patterns

- Checkout presents staged Cart, Details, Payment, and Confirmation states with desktop/mobile parity.
- Shopper sees one explicit PayMongo action or immediate trusted hosted-checkout redirect; JRW renders no card fields or provider form.
- Blocking validation appears before handoff. Pending, failed, and cancelled states use clear text labels and safe next actions.
- Checkout remains calm, sharp, responsive, and accessible; current step uses text plus `aria-current`.

## Cross-Story Dependencies

- Story 5.3 consumes Story 5.2 checkout attempt and reservation references; browser cart data cannot replace server reservation truth.
- Story 5.4 records verified provider events. Story 5.5 reconciles payment and creates confirmation from server state.
- Story 5.6 owns failed/cancelled/stale payment release and retry-safe stock restoration.
- Story 5.7 owns receipt/status presentation and payment emails.
