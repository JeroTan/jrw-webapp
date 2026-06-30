---
title: 'Payment return uses checkout receipt state'
type: 'bugfix'
created: '2026-06-30'
status: 'done'
baseline_commit: '5decf07365a8ef7f0a34071af1709458145a6ca2'
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/5-5-payment-reconciliation-and-order-confirmation.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After PayMongo returns to JRW, shoppers land on a standalone payment status page that can show `Could not read payment status.` instead of the checkout receipt/order step. Current deployed/local failure is caused by unapplied order-confirmation migrations, and the UX does not match the desired staged checkout flow.

**Approach:** Apply/fix the missing payment webhook and order confirmation schema path, then route/render confirmed or pending payment return through the checkout receipt/order-confirmation surface. Redirect/browser query params must only select lookup context; server payment/order state remains source of truth.

## Boundaries & Constraints

**Always:** Keep PayMongo handoff backend-only. Keep payment, order, and fulfillment states separate. Use server-owned payment/order records for confirmation. Preserve guest checkout. Preserve JRW Technical Brutalist checkout styling. Keep D1 remote development as canonical for local app flows.

**Ask First:** Production migration, destructive payment/order data cleanup, or changing PayMongo webhook/merchant configuration.

**Never:** Do not mark payment paid from return URL params. Do not create duplicate orders on refresh/webhook retry. Do not expose raw PayMongo payloads, checkout URLs, card data, secrets, tokens, phone, address, or email in customer-facing errors/logs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Paid return | PayMongo returns with `attemptId`; JRW payment is `PAYMENT_PAID` or becomes paid through verified webhook | Shopper sees checkout receipt/order confirmation state, not generic standalone error | If order creation email fails, order remains confirmed and email state is retryable |
| Pending return | Payment row exists but still `PAYMENT_PENDING` | Checkout payment/receipt surface shows pending reconciliation and status refresh path | No order is created and no false success copy appears |
| Missing migration/schema | D1 lacks `payment_webhook_events` or order-confirmation columns | Remote development schema is migrated before code is considered done | Surface safe provider unavailable only before fix; tests/queries prove schema present after fix |
| Unknown attempt | No payment row maps to lookup reference | Safe unavailable/return-to-checkout copy | No provider internals exposed |
| Refresh/double return | User refreshes return page or webhook also runs | Same order/status returned idempotently | No duplicate order/snapshot/email side effects |

</frozen-after-approval>

## Code Map

- `migrations/0028_paymongo_webhook_events.sql` -- required remote D1 migration for webhook idempotency table.
- `migrations/0029_order_confirmation.sql` -- required remote D1 migration for order confirmation fields/indexes.
- `src/domain/schema/transactions.ts` -- schema expected by return/status repository.
- `src/server/repositories/OrderConfirmationRepository.ts` -- reads payment/order return record and creates idempotent orders.
- `src/server/services/PaymentReconciliationService.ts` -- converts server payment/order truth into safe return status.
- `src/server/routes/payment-return.routes.ts` -- API route currently returning `503` when schema is missing.
- `src/pages/checkout/payment-return.astro` -- current standalone return page.
- `src/features/cart-checkout/components/PaymentReturnStatus.tsx` -- current standalone status UI.
- `src/features/cart-checkout/components/CheckoutDetailsPage.tsx` and cart-checkout flow components/tests -- target receipt/order step integration.
- `src/features/cart-checkout/api.ts` -- client return-status helper and checkout flow API contracts.

## Tasks & Acceptance

**Execution:**
- [x] Remote D1 development -- apply `0028` and `0029` migrations -- backend status route must match deployed code schema.
- [x] `src/pages/checkout/payment-return.astro` -- change return landing to preserve/enter checkout receipt-order surface instead of feeling like unrelated page -- match desired checkout step UX.
- [x] `src/features/cart-checkout/components/PaymentReturnStatus.tsx` or checkout receipt component -- render confirmed/pending/failed states as checkout receipt/payment step module -- avoid generic standalone failure page.
- [x] `src/features/cart-checkout/api.ts` -- keep return-status lookup server-only and safe -- never trust browser params as paid proof.
- [x] Tests under checkout/payment-return suites -- add/adjust assertions for receipt-step return, pending safe state, unknown attempt safe copy, and idempotent refresh -- prevent regression.

**Acceptance Criteria:**
- Given a PayMongo redirect with a valid server-owned payment reference, when the shopper lands back on JRW, then the UI remains in the checkout order/receipt experience and reads JRW server state.
- Given remote development D1 is queried, when migrations are inspected, then `0028_paymongo_webhook_events.sql` and `0029_order_confirmation.sql` are applied and required order columns/tables exist.
- Given a payment is still pending, when return status loads, then shopper sees pending reconciliation copy and no order-confirmed copy.
- Given a paid payment already has an order, when return page refreshes, then the same order is returned and no duplicate order/snapshot/email side effects occur.
- Given payment-return API fails internally, when the browser displays an error, then copy remains safe and no raw provider/database detail leaks.

## Spec Change Log

## Verification

**Commands:**
- `npx wrangler d1 migrations apply DB --remote --env development` -- expected: `0028` and `0029` applied or already applied.
- `npx wrangler d1 execute DB --env development --remote --command "SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 5;"` -- expected: migrations include `0028`/`0029`.
- `npx vitest run src/server/routes/payment-return.routes.test.ts src/server/repositories/OrderConfirmationRepository.test.ts src/server/services/PaymentReconciliationService.test.ts src/features/cart-checkout/components/cart-ui.test.tsx` -- expected: pass.
- `npm run check` -- expected: pass.

## Suggested Review Order

**Receipt return entry point**

- Return page now names checkout receipt, not standalone payment status.
  [`payment-return.astro:13`](../../src/pages/checkout/payment-return.astro#L13)

- Return status mounts inside checkout receipt shell.
  [`PaymentReturnStatus.tsx:242`](../../src/features/cart-checkout/components/PaymentReturnStatus.tsx#L242)

**Checkout receipt behavior**

- Receipt wrapper selects step, actions, and safe status copy.
  [`PaymentReturnStatus.tsx:191`](../../src/features/cart-checkout/components/PaymentReturnStatus.tsx#L191)

- Summary messages separate pending, failure, and confirmed states.
  [`PaymentReturnStatus.tsx:144`](../../src/features/cart-checkout/components/PaymentReturnStatus.tsx#L144)

- Confirmed receipt summary uses server order total.
  [`PaymentReturnStatus.tsx:172`](../../src/features/cart-checkout/components/PaymentReturnStatus.tsx#L172)

- Checkout shell accepts server-owned summary override.
  [`CheckoutFlow.tsx:17`](../../src/features/cart-checkout/components/CheckoutFlow.tsx#L17)

- Summary renders override title, description, and totals.
  [`CheckoutFlow.tsx:174`](../../src/features/cart-checkout/components/CheckoutFlow.tsx#L174)

**Regression tests**

- Pending return stays inside receipt step without provider leaks.
  [`cart-ui.test.tsx:1109`](../../src/features/cart-checkout/components/cart-ui.test.tsx#L1109)

- Confirmed receipt ignores stale browser cart totals.
  [`cart-ui.test.tsx:1139`](../../src/features/cart-checkout/components/cart-ui.test.tsx#L1139)
