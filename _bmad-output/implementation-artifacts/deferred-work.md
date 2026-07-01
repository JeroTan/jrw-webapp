# Deferred Work

## Deferred from: code review of 1-1-brownfield-server-migration-and-minimal-reformat (2026-05-12)

- Production CORS origin policy remains localhost-only [src/server/middleware/cors.ts:3]. Existing brownfield CORS was also localhost-only, and production app origin policy is not defined in Story 1.1.

## Deferred from: code review of 5-3-paymongo-payment-creation-and-handoff (2026-06-20)

- Story 5.6 post-payment terminal/stale release now uses `checkout_reservation_releases` per-item idempotency plus guarded stock/release batch updates. Legacy pre-payment expired-reservation cleanup remains separate; refactor it to the same ledger if its scope expands beyond the existing pre-payment sweep [src/server/repositories/CheckoutRepository.ts:638].

## Deferred from: code review of 5-5-payment-reconciliation-and-order-confirmation (2026-06-30)

- Existing legacy `orders.status` and `orders.total_amount real` remain for backward compatibility; future order-schema cleanup should isolate or remove them after dependent UI/API paths migrate.
- Provider-paid fallback does not verify amount/currency/livemode from PayMongo GET response because current local session ID is server-created and PayMongo status parsing lacks stable amount fields; revisit if provider status response contract is expanded.
- Order snapshot `image_r2_key` remains unavailable because `checkout_payment_items` does not store a frozen image reference; add frozen image reference to checkout payment items before rich receipt/order-history work.
