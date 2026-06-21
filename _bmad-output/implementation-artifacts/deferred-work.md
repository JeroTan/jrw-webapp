# Deferred Work

## Deferred from: code review of 1-1-brownfield-server-migration-and-minimal-reformat (2026-05-12)

- Production CORS origin policy remains localhost-only [src/server/middleware/cors.ts:3]. Existing brownfield CORS was also localhost-only, and production app origin policy is not defined in Story 1.1.

## Deferred from: code review of 5-3-paymongo-payment-creation-and-handoff (2026-06-20)

- Existing expired-reservation cleanup reads candidates, restores stock, then updates reservation/attempt state without one atomic claim. Serialize cleanup before Story 5.6 reconciliation expands concurrent release paths [src/server/repositories/CheckoutRepository.ts:638].
