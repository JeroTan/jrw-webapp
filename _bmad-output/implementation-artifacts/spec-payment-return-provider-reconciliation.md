---
title: 'Payment return reconciles paid PayMongo sessions'
type: 'bugfix'
created: '2026-06-30'
status: 'done'
baseline_commit: 'fdaa98632b3a13af9e9124d9036fb31e5ee5c482'
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/5-4-paymongo-webhook-verification-and-idempotency.md'
  - '{project-root}/_bmad-output/implementation-artifacts/5-5-payment-reconciliation-and-order-confirmation.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A shopper can pay successfully in PayMongo, return to JRW, and remain stuck at `Payment pending` when the webhook is missing, delayed, misconfigured, or rejected before DB mutation. Current evidence: PayMongo session `cs_5a98de119018dc5a99f53d31` contains a `paid` payment, but JRW payment `x971jh6zwj6h9ymqj4jpen3x` remains `PAYMENT_PENDING` and `payment_webhook_events` has zero rows because development lacks `PAYMONGO_WEBHOOK_SECRET`.

**Approach:** Keep webhook as primary path, but add server-side fallback reconciliation to the payment return status check. When JRW has a pending PayMongo checkout session, the server fetches the provider session with `PAYMONGO_SECRET_KEY`, trusts only provider-owned paid status, marks the JRW payment paid idempotently, creates/reuses the order confirmation, then returns confirmed receipt data.

## Boundaries & Constraints

**Always:** Payment success pages must reconcile against JRW server/payment provider state, not browser query params. Provider calls stay backend-only. Payment, order, and fulfillment states remain separate. Payment/order confirmation must be idempotent across refresh, double-click, webhook retry, and fallback retry. Customer-facing errors must stay safe and never leak provider payloads, checkout URL, email, address, phone, card data, tokens, or secrets.

**Ask First:** Production secret changes, production migration, destructive payment/order cleanup, or manual paid-state patching outside provider verification.

**Never:** Do not mark paid from `paymentStatus`, PayMongo return params, UI state, or local cart. Do not require `PAYMONGO_WEBHOOK_SECRET` for fallback status reconciliation. Do not create duplicate orders or duplicate snapshots when webhook and fallback both process the same paid session.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Paid provider, pending JRW | Return status lookup finds `PAYMENT_PENDING`; PayMongo v1 session has at least one payment with status `paid` | JRW payment becomes `PAYMENT_PAID`; order confirmation is created or reused; return API responds `confirmed` with safe order summary | Provider payload is not exposed |
| Provider still unpaid | Return status lookup finds `PAYMENT_PENDING`; PayMongo session has no paid payment | Return API stays `pending`; UI can keep “Check status” | No order is created |
| Provider unavailable | PayMongo read fails, secret missing, timeout, or invalid response | Return API remains safe: preferably pending if JRW state is still readable, or provider-unavailable only when existing route policy requires it | No payment/order mutation |
| Webhook/fallback race | Webhook marks paid while fallback also runs | Same payment/order result; no duplicate orders, snapshots, or emails | Idempotent DB updates win safely |
| Terminal JRW state | JRW payment already failed/cancelled/expired/refunded | Fallback does not regress or override terminal state | Return existing safe status |

</frozen-after-approval>

## Code Map

- `src/server/routes/payment-return.routes.ts` -- builds runtime payment return controller and injects provider fallback dependencies.
- `src/server/services/PaymentReconciliationService.ts` -- reads return state, performs optional provider reconciliation for pending PayMongo sessions, confirms paid orders.
- `src/server/repositories/OrderConfirmationRepository.ts` -- owns idempotent payment paid marking and order confirmation reads/writes.
- `src/lib/paymongo/PayMongoClient.ts` -- backend-only PayMongo client; add safe checkout-session status read via v1 endpoint.
- `src/server/services/PaymentReconciliationService.test.ts` -- service-level pending/paid fallback behavior.
- `src/lib/paymongo/PayMongoClient.test.ts` -- provider response parsing and secret-safe failure coverage.
- `src/server/routes/payment-return.routes.test.ts` -- route ignores browser-paid params and wires backend fallback through service.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/paymongo/PayMongoClient.ts` -- add `getCheckoutSessionPaymentStatus(providerCheckoutSessionId)` using `https://api.paymongo.com/v1/checkout_sessions/{id}` -- v2 retrieve returns 404 for observed sessions while v1 exposes payment status.
- [x] `src/server/repositories/OrderConfirmationRepository.ts` -- add idempotent `markProviderCheckoutSessionPaid()` guarded by provider/session and `PAYMENT_PENDING` -- lets fallback persist paid state without fake browser trust.
- [x] `src/server/services/PaymentReconciliationService.ts` -- when return record is pending and provider fallback is configured, read PayMongo status, mark paid only when provider says paid, then confirm/reuse order -- fixes paid-return stuck pending.
- [x] `src/server/routes/payment-return.routes.ts` -- construct `PayMongoClient` from `PAYMONGO_SECRET_KEY` and pass fallback into service -- keeps browser/backend boundary intact.
- [x] Tests above -- cover paid fallback, unpaid/no-op fallback, terminal-state no override, provider failure safe behavior, and PayMongo response parsing -- prevent regression.

**Acceptance Criteria:**
- Given JRW has a pending payment for a PayMongo checkout session and PayMongo reports a paid payment, when the shopper clicks `Check status` or reloads the return URL, then JRW returns `confirmed` with order summary and persists `PAYMENT_PAID`.
- Given PayMongo does not report a paid payment, when status is checked, then JRW remains `pending` and creates no order.
- Given webhook and return fallback process the same session, when both run or retry, then only one payment/order confirmation exists and response stays safe.
- Given browser query contains fake paid indicators, when status is checked, then those values are ignored and cannot mark payment paid.

## Spec Change Log

## Verification

**Commands:**
- `npx vitest run src/lib/paymongo/PayMongoClient.test.ts src/server/services/PaymentReconciliationService.test.ts src/server/routes/payment-return.routes.test.ts --pool=threads --maxWorkers=1 --reporter=dot` -- expected: pass.
- `npm run check` -- expected: pass.
- `npm run build-development` -- expected: pass.
- `npm run deploy-development` -- expected: development worker updated only after local checks pass.
- Remote manual: `GET /api/checkout/payment-return?attemptId=mw3m8pqc0b6d1e6vct8wcdrf` -- expected: confirmed after provider fallback.

## Suggested Review Order

**Runtime entry point**

- Return status route injects backend-only PayMongo fallback.
  [`payment-return.routes.ts:100`](../../src/server/routes/payment-return.routes.ts#L100)

- Worker-safe env lookup disables fallback without crashing.
  [`payment-return.routes.ts:67`](../../src/server/routes/payment-return.routes.ts#L67)

**Provider reconciliation**

- Service attempts provider reconciliation only from pending server state.
  [`PaymentReconciliationService.ts:275`](../../src/server/services/PaymentReconciliationService.ts#L275)

- Provider response must match same checkout session before mutation.
  [`PaymentReconciliationService.ts:289`](../../src/server/services/PaymentReconciliationService.ts#L289)

- Paid provider state then flows through existing order confirmation.
  [`PaymentReconciliationService.ts:320`](../../src/server/services/PaymentReconciliationService.ts#L320)

**PayMongo status client**

- V1 session read parses paid payment rows only.
  [`PayMongoClient.ts:139`](../../src/lib/paymongo/PayMongoClient.ts#L139)

- Thrown provider errors return sanitized failure details.
  [`PayMongoClient.ts:262`](../../src/lib/paymongo/PayMongoClient.ts#L262)

**Persistence guard**

- Payment update is guarded by provider session and pending state.
  [`OrderConfirmationRepository.ts:494`](../../src/server/repositories/OrderConfirmationRepository.ts#L494)

**Regression tests**

- Service confirms paid fallback and blocks mismatched sessions.
  [`PaymentReconciliationService.test.ts:184`](../../src/server/services/PaymentReconciliationService.test.ts#L184)

- Client refuses session-status-only paid proof and sanitizes throws.
  [`PayMongoClient.test.ts:342`](../../src/lib/paymongo/PayMongoClient.test.ts#L342)

- Repository marks provider sessions paid idempotently.
  [`OrderConfirmationRepository.test.ts:395`](../../src/server/repositories/OrderConfirmationRepository.test.ts#L395)
