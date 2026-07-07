# Story 5.6: Release Reserved Inventory After Failed or Cancelled Payment

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As JRW,
I want reserved inventory released after failed or cancelled payment,
so that stock does not remain stuck and future customers can buy available products.

## Acceptance Criteria

1. Given a checkout reservation exists and its linked payment is reconciled to `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, or `PAYMENT_CANCELLED`, when terminal reconciliation completes, then stock-backed reservation items are released exactly once, preorder reservation items are not stock-restored, reservation/attempt state no longer blocks future checkout, and the release result is idempotent.
2. Given PayMongo checkout is cancelled by the Shopper or a provider/server lookup returns a terminal cancelled state, when JRW updates payment state to `PAYMENT_CANCELLED`, then the active reservation is released and customer-safe retry/return-to-cart state remains available without raw provider details.
3. Given a payment remains `PAYMENT_PENDING` beyond the allowed reservation/payment window, when the reconciliation job or documented manual process runs, then the reservation is released within 5 minutes or the documented MVP reconciliation behavior is followed, stale pending state is visible to operations, and pending release can be retried safely.
4. Given the same terminal payment, stale pending payment, webhook retry, return-page refresh, or manual reconciliation is processed more than once, when release runs again, then stock is not over-restored, no duplicate inventory movement/audit/email/order side effect occurs, and an idempotent result is returned.
5. Given payment is `PAYMENT_PAID`, an order already exists, the reservation is not active, the payment does not match the reservation/attempt, or the checkout session is still active and inside the allowed pending window, when release logic is invoked, then no stock is restored and a safe skipped/conflict result is returned.
6. Given release fails due to D1/storage/runtime/provider lookup failure, when operation fails, then a safe operational event is logged with request ID, payment ID, reservation ID where available, release reason, and safe error code; raw provider payloads, checkout URL, email, phone, address, secrets, signatures, tokens, and stack traces are not logged; retry cannot duplicate stock movement.
7. Given implementation finishes, when tests run, then checks cover failed payment release, cancelled payment release, expired payment release, stale pending timeout release, duplicate release, concurrent release, provider/storage failure retry, preorder skip, paid/order skip, and no over-restoration, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Lock scope and preserve Epic 5 boundaries. (AC: 1-7)
  - [x] Implement post-payment failed/cancelled/expired/stale reservation release only.
  - [x] Do not change paid payment order confirmation semantics from Story 5.5.
  - [x] Do not build rich receipt/payment status UI or payment success/failure emails; Story 5.7 owns that.
  - [x] Do not implement admin order list/detail, fulfillment transitions, manual return recording, or manual refund recording; Epic 6 owns those.
  - [x] Do not trust browser redirect params as terminal payment proof. Terminal release must come from verified webhook state, backend PayMongo lookup, or documented stale reconciliation policy.
  - [x] Keep guest checkout supported. Guest release must not require account auth or raw email lookup.

- [x] Task 2: Add pure release decision rules. (AC: 1-5)
  - [x] Add focused domain helper under `src/domain/checkout/**` or `src/domain/payments/**`, recommended `inventory-release.ts`, for release eligibility decisions.
  - [x] Treat `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, and `PAYMENT_CANCELLED` as releasable terminal payment statuses.
  - [x] Treat `PAYMENT_PAID` and `PAYMENT_REFUNDED` as not releasable in this story. Paid inventory has become order inventory; refunds are manual/provider future scope.
  - [x] Treat `PAYMENT_PENDING` as releasable only when older than the documented cutoff, reservation is still active, no paid/order state exists, and process reason is `PENDING_TIMEOUT` or equivalent explicit reconciliation reason.
  - [x] Return explicit decisions such as `release`, `already-released`, `skip-paid`, `skip-order-exists`, `skip-active-pending`, `skip-mismatch`, and `conflict`.
  - [x] Unit test every decision. Do not bury this logic in repository SQL or route handlers.

- [x] Task 3: Add durable, idempotent reservation release persistence. (AC: 1, 3-6)
  - [x] Read `src/domain/schema/transactions.ts` and all existing migrations before editing.
  - [x] Add next migration after `0030_order_confirmation_attempt_reservation_unique.sql`; do not edit old migrations.
  - [x] Add release metadata if needed so retries are observable and safe: recommended fields or table data include release reason, release status, released/requested timestamps, release request ID, release error code, release attempt count, and source payment ID.
  - [x] Strongly prefer a per-reservation or per-reservation-item release ledger/movement record with unique key(s) so each stock-backed reservation item is restored once. `releaseStockLine` increments stock and is not idempotent by itself.
  - [x] If using D1/Drizzle batch or transaction, prove with tests that stock restore plus release marker cannot double-apply on retry. If transaction support falls back, keep the fallback equally safe.
  - [x] Never mark release complete before all stock-backed items are durably restored or otherwise resumable. A crash after claim and before stock restore must be retryable.
  - [x] Release only `checkout_reservation_items.reservation_mode = 'STOCK'` with non-null product and variant IDs. `PREORDER` items should mark released without changing stock.
  - [x] Preserve `checkout_payments`, `orders`, and `order_snapshots` raw-payload protections. Do not add provider payload, checkout URL, card data, token, signature, secret, email, phone, or address to release/audit metadata.

- [x] Task 4: Implement repository APIs for terminal and stale release. (AC: 1-6)
  - [x] Add focused repository methods, recommended under `src/server/repositories/CheckoutRepository.ts` or a new `InventoryReleaseRepository.ts` if separation keeps it clearer.
  - [x] Repository method should load payment, attempt, reservation, reservation items, and any existing order in one server-owned path.
  - [x] Release for terminal payment must verify:
    - payment provider is `PAYMONGO`;
    - payment status is `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, or `PAYMENT_CANCELLED`;
    - payment reservation ID equals reservation ID;
    - reservation is active or already released by this logic;
    - no order exists for payment/attempt/reservation;
    - stock items have not already been restored.
  - [x] Stale pending release must verify `PAYMENT_PENDING`, age/cutoff, active reservation, no paid/order state, and no newer pending payment that still owns the same attempt/reservation.
  - [x] Add `PAYMENT_CANCELLED` to any local payment status union that currently omits it, including `CheckoutPaymentStatus` in `CheckoutRepository.ts`.
  - [x] Return structured result: released/already released/skipped/failed, payment ID, reservation ID, attempt ID, reason, item count, restored quantity, and safe code.
  - [x] Existing `releaseCheckoutReservationForPaymentFailure` is provider-creation rollback. Do not reuse it blindly for post-payment terminal release because it intentionally skips when pending payment exists and sets `PAYMENT_CREATION_FAILED`.
  - [x] Existing `releaseExpiredCheckoutReservations` handles pre-payment stale reservations and currently excludes `PAYMENT_CREATED`; extend or add separate stale-payment release path rather than breaking pre-payment cleanup.

- [x] Task 5: Compose release with payment reconciliation. (AC: 1-6)
  - [x] Update `PaymentReconciliationService` so `markProviderCheckoutSessionTerminal(...)` success or already-terminal result triggers idempotent reservation release.
  - [x] Ensure provider fallback status `failed`, `expired`, `cancelled`, and spelling variants (`canceled`) map to terminal internal statuses only through backend PayMongo lookup or equivalent server-owned reconciliation.
  - [x] Return public payment-return status with retry/return-to-cart allowed after terminal release, but do not expose release internals to customer response.
  - [x] Add service method for stale pending reconciliation, for example `releaseStalePendingPayments({ now, limit, requestId })`, and wire it to documented call site: checkout validation sweep, scheduled Worker/Cron, admin/manual script, or explicit internal service method with runbook note.
  - [x] If release fails after terminal payment status is set, public status may still be retryable, but operations must see release failure and can retry without duplicate stock movement.
  - [x] Do not downgrade terminal or paid payment states during stale cleanup.

- [x] Task 6: Keep webhook and PayMongo semantics accurate. (AC: 1, 2, 4-6)
  - [x] `src/domain/payments/paymongo-webhook.ts` currently supports only `checkout_session.payment.paid`. Do not invent failed/cancelled webhook event handling unless current PayMongo docs and test fixtures prove the exact event shape.
  - [x] `PaymentWebhookService` paid flow must continue to create/return idempotent order confirmation and must never release stock for paid payment.
  - [x] If this story adds terminal webhook support later, signature verification and idempotency claim must still happen before release side effects.
  - [x] PayMongo Hosted Checkout failed attempts can be retried in the same Checkout Session while it remains active. Do not release reservation from one non-paid payment attempt unless the session/payment is terminal or the configured stale policy says it is abandoned.
  - [x] PayMongo Client calls remain backend-only with Basic auth. Frontend must not call PayMongo APIs or receive provider payload.

- [x] Task 7: Update customer-safe status and operational visibility. (AC: 2, 3, 6)
  - [x] Update `PaymentReturnStatus` service tests and route metadata if terminal release now runs during `/api/checkout/payment-return` status refresh.
  - [x] Customer-visible response stays limited to payment status, safe retry flags, and existing order summary when confirmed. Do not include reservation IDs, release counts, stock quantities restored, provider status details, or raw errors.
  - [x] Operations visibility can be audit/log only for MVP, but stale pending release must be observable by request ID, payment ID, reservation ID, reason, release status, and safe code.
  - [x] Publish `inventory.released` audit event for successful release with system actor and safe details. Use `payment.reconciled` or operational log where payment terminal state changes.
  - [x] On release failure, log `PROVIDER_UNAVAILABLE` or `INTERNAL_ERROR` as appropriate through `createOperationalLogEvent`; keep scrubbed details.

- [x] Task 8: Add tests and validation gates. (AC: 1-7)
  - [x] Domain tests for release decisions: failed, expired, cancelled, stale pending, paid skip, order skip, active pending skip, already released, mismatched payment/reservation.
  - [x] D1/Miniflare repository tests for:
    - failed payment releases active stock reservation and clears blocking attempt state;
    - cancelled payment releases active stock reservation;
    - expired payment releases active stock reservation;
    - stale pending payment release respects cutoff and leaves fresh pending payment alone;
    - duplicate release returns idempotent result and does not over-restore stock;
    - concurrent release calls restore stock once;
    - preorder release changes release state but not stock;
    - paid/order-linked payment never releases reservation;
    - simulated storage failure is retryable without duplicate stock movement.
  - [x] Service tests for provider fallback terminal statuses triggering release and release failure logging without leaking provider/PII details.
  - [x] Route tests for `/api/checkout/payment-return` if status refresh can trigger terminal release; response must keep standard envelope, request ID, safe labels, and no release internals.
  - [x] If adding a job/script/internal route, test auth mode or document why it is not public HTTP. Protected internal/admin endpoints need auth metadata, rate-limit class, and denial tests.
  - [x] Minimum commands:
    - `npx vitest run src/domain/checkout/inventory-release.test.ts src/domain/payments/payment-reconciliation.test.ts`
    - `npx vitest run src/server/repositories/CheckoutRepository.test.ts src/server/repositories/OrderConfirmationRepository.test.ts`
    - `npx vitest run src/server/services/PaymentReconciliationService.test.ts src/server/services/PaymentWebhookService.test.ts src/server/routes/payment-return.routes.test.ts`
    - `npm run check`
  - [x] Run `npm run build-development` if repository/service/route changes touch Worker runtime wiring. Document exact blocker if full validation cannot pass.

- [x] Task 9: Update docs and deferred work. (AC: 3, 6, 7)
  - [x] Update route descriptions, endpoint catalog notes, or implementation artifact notes to say failed/cancelled/stale payment release exists.
  - [x] Resolve or update `_bmad-output/implementation-artifacts/deferred-work.md` item about expired-reservation cleanup once release is proven atomic/resumable.
  - [x] Add implementation notes for any chosen stale pending cutoff, job/manual process, and operational retry process.

### Review Findings

- [x] [Review][Patch] Terminal return refresh did not retry inventory release [src/server/services/PaymentReconciliationService.ts:281]
- [x] [Review][Patch] Batch stale release omitted per-payment audit/log visibility [src/server/services/PaymentReconciliationService.ts:337]
- [x] [Review][Patch] Inventory release failure log omitted reservation/reason details [src/server/services/PaymentReconciliationService.ts:774]

## Endpoint Guard Checklist

Complete for every new or changed endpoint/job. Mark non-applicable items as `N/A` with reason.

- [ ] Route auth metadata declares public/optional/required auth, roles, and rate-limit class.
- [ ] Route-level RBAC guard runs before validation or side effects for protected endpoints.
- [ ] Service/controller enforces actor state before mutation: authenticated, active, verified, approved.
- [ ] Brand-scoped reads or writes enforce active brand membership or elevated permission server-side.
- [ ] Public/customer endpoints explicitly document why brand membership is not required.
- [ ] Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable.
- [ ] Error response uses safe envelope codes and does not leak provider/internal authorization details.
- [ ] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes.

For this story:

- `/api/checkout/payment-return` remains public customer/guest-facing if changed. Brand membership is `N/A` because it reads only limited checkout payment state through high-entropy server-owned references and must not expose release internals.
- PayMongo webhook remains public only because `Paymongo-Signature` verification is the provider auth boundary. Any release side effect from webhook requires signature verification and idempotency claim first.
- Any scheduled/manual release route must not be public unless protected by a verified internal boundary. Prefer service/script/Cron invocation over adding a broad HTTP endpoint.
- Denial/guard tests should cover invalid/missing lookup, raw email lookup denial, mismatched checkout references, wrong payment state, existing order, paid payment, and missing/invalid internal job auth where applicable.

## Dev Notes

### Epic Context

- Epic 5 goal: guest or signed-in shoppers submit checkout, inventory is reserved, PayMongo Hosted Checkout is created through JRW's single merchant account, payment state reconciles from server/provider truth, and safe updates reach the Shopper.
- Story 5.1 captured checkout details into `checkout_attempts` with nullable `customer_id` and guest attempt token.
- Story 5.2 reserved inventory through D1/DO coordination and keeps reservation separate from payment/fulfillment.
- Story 5.3 created PayMongo Hosted Checkout V2 sessions and persisted `checkout_payments` plus `checkout_payment_items`; it also releases reservations when provider creation fails before payment handoff.
- Story 5.4 verified PayMongo webhooks, recorded `payment_webhook_events`, and moved only supported paid checkout-session events to `PAYMENT_PAID`.
- Story 5.5 reconciles payment, creates idempotent order confirmation from paid server state, and intentionally deferred failed/cancelled/stale reservation release to this story.
- Story 5.6 owns failed/cancelled/expired/stale payment inventory release and retry-safe stock restoration.
- Story 5.7 owns rich checkout receipt/payment-status UX and payment success/failure emails.

### Current Code Intelligence

#### READ/UPDATE: `src/domain/schema/transactions.ts`

- Current state: `checkout_reservations` has status `ACTIVE` by default and indexes by status/expires_at. It does not store release reason, release status, released timestamp, release request ID, error code, or source payment ID.
- Current state: `checkout_reservation_items` stores product/variant/quantity/price/mode. It has enough data to restore stock for `STOCK` lines and skip `PREORDER` lines.
- Current state: `checkout_payments.status` is free text and already stores `PAYMENT_PENDING`, `PAYMENT_PAID`, `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, and `PAYMENT_CANCELLED` in service/repository paths, but some local TypeScript unions omit `PAYMENT_CANCELLED`.
- Current state: `orders` has unique payment/attempt/reservation indexes. Paid order existence must block reservation release.
- What this story changes: add release metadata or ledger structures needed for idempotent post-payment release and retry visibility.
- Preserve: payment status, fulfillment status, return/refund status, inventory status, and order status stay separate. No raw provider payload, checkout URL, card data, token, secret, signature, email, phone, or address in release records.

#### READ/UPDATE: `src/server/repositories/CheckoutRepository.ts`

- Current state: `releaseCheckoutReservationForPaymentFailure` is provider-creation rollback. It updates `checkout_attempts` to `PAYMENT_CREATION_FAILED`, clears attempt reservation fields, restores stock through `releaseStockLine`, then marks reservation `RELEASED`. It intentionally refuses to release if a pending payment exists.
- Current state: `releaseExpiredCheckoutReservations` handles pre-payment stale reservations only. It currently selects active reservations where attempt status is `DETAILS_CAPTURED`, `INVENTORY_RESERVED`, or `RESERVATION_FAILED`; it does not handle `PAYMENT_CREATED` stale pending payment.
- Current state: `releaseStockLine` increments product variant stock and stock_version. It is not idempotent alone and can over-restore if called twice for the same reservation item.
- Current state: `reserveStockAndCreateCheckoutReservation` uses Drizzle transaction where possible and sequential fallback in development/runtime cases where explicit transaction is unsupported.
- What this story changes: add a release API that is safe for post-payment terminal/stale flows, uses payment/reservation/order guards, and records enough release progress to retry without duplicate stock movement.
- Preserve: provider-creation rollback semantics, pre-payment expired-reservation cleanup behavior, guarded stock reservation logic, and D1-compatible patterns.

#### READ/UPDATE: `src/server/repositories/OrderConfirmationRepository.ts`

- Current state: `markProviderCheckoutSessionTerminal` changes `PAYMENT_PENDING` to terminal `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, or `PAYMENT_CANCELLED`, but it does not release reservation stock.
- Current state: `findPaymentReturnRecord` exposes safe payment-return status and prioritizes confirmed order/paid rows.
- Current state: `createOrderConfirmationForPaidPayment` creates orders only from `PAYMENT_PAID` and uses unique constraints to avoid duplicate orders.
- What this story changes: either compose release after terminal marking or move terminal marking/release into a new repository/service path. Avoid splitting state so terminal payment succeeds but release becomes invisible.
- Preserve: paid confirmation idempotency, no raw provider storage, order snapshot behavior, and no release for paid/order-confirmed payments.

#### READ/UPDATE: `src/server/services/PaymentReconciliationService.ts`

- Current state: return status can call PayMongo backend lookup for pending sessions. If provider says paid, it marks paid and creates order. If provider says `failed`, `expired`, `cancelled`, or `canceled`, it marks terminal and returns retryable status.
- Current gap: terminal marking does not release inventory.
- What this story changes: call release service/repository after terminal marking and from stale pending reconciliation. Keep release failure logged and retryable.
- Preserve: customer response stays safe; provider fallback failure leaves pending safe; terminal states are not overwritten.

#### READ/UPDATE: `src/domain/payments/payment-reconciliation.ts`

- Current state: maps payment status to safe return labels: pending, confirmed, failed, expired, cancelled, refunded, unknown.
- What this story changes: may add release-related status helpers or keep separate in `inventory-release.ts`.
- Preserve: public labels remain customer-safe and color-independent for UI.

#### READ/UPDATE: `src/domain/payments/paymongo-webhook.ts`

- Current state: supported webhook type list includes only `checkout_session.payment.paid`.
- What this story changes: likely none unless official docs and fixtures prove additional terminal checkout-session events. Terminal release can be driven by backend status lookup and stale job without expanding webhook support.
- Preserve: parser/classifier purity and idempotency behavior.

#### READ/UPDATE: `src/server/services/PaymentWebhookService.ts` and `src/server/repositories/PaymentWebhookRepository.ts`

- Current state: paid webhook verifies signature, claims idempotency, marks payment paid, and composes order confirmation.
- What this story changes: no paid release. If terminal webhook support is added, side effects must follow the same verified/claimed/idempotent pattern.
- Preserve: invalid signatures reject before mutation; duplicate webhooks do not duplicate side effects; unsupported events remain ignored.

#### READ/UPDATE: `src/lib/paymongo/PayMongoClient.ts`

- Current state: creates Hosted Checkout V2 sessions with backend Basic auth and reads checkout-session payment status through backend-only GET status lookup. It only treats response as paid when a nested payment row has `status: "paid"`.
- What this story changes: maybe no client change. If explicit checkout-session expiration is added, add backend-only method with tests and scrubbed errors.
- Preserve: no frontend PayMongo calls, no secret leakage, trusted checkout URL checks, no raw provider response in public errors/logs.

#### READ/UPDATE: `src/cloudflare/durable-objects/InventoryDurableObject.ts`

- Current state: serializes checkout reservation and payment creation through `CheckoutPaymentAttemptCoordinator`. It has no release endpoint.
- What this story changes: only add DO release path if the chosen design needs serialized release per attempt/reservation and tests prove it. D1 guarded release/ledger may be enough.
- Preserve: Worker-compatible runtime and existing `/reserve` plus `/payments` behavior.

#### READ/UPDATE: `src/server/routes/payment-return.routes.ts` and `src/server/controllers/PaymentReconciliationController.ts`

- Current state: public status endpoint reads server-owned lookup references, returns `{ data, meta }` or `{ error }`, and documents that redirect params do not finalize payment/order.
- What this story changes: if terminal status refresh now releases reservation, route description and tests must mention safe release side effect. Response must not include release internals.
- Preserve: public auth rationale, rate-limit class, safe envelope, request ID, no provider internals.

#### READ/UPDATE: `src/adapter/infrastructure/logging/operational-log.ts` and `src/domain/audit/events.ts`

- Current state: scrubbers redact payment payloads/responses, card data, contact PII, secrets, tokens, signatures, raw bodies, stack traces, email, phone, and address. Audit action list already includes `inventory.released`, `payment.failed`, and `payment.reconciled`.
- What this story changes: use existing logging/audit helpers for successful release and release failure.
- Preserve: `providerCheckoutSessionId` may be retained as safe identifier; raw provider payloads and PII must stay redacted.

### Previous Story Intelligence

- Story 5.5 review fixed duplicate webhook/page refresh hazards. Do not regress order-confirmation idempotency when release is added.
- Story 5.5 now prioritizes confirmed/paid rows during payment-return lookup so later pending retries do not hide existing paid confirmation.
- Story 5.5 normalized provider terminal fallback states to `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, and `PAYMENT_CANCELLED`; this story must attach release to that terminal path.
- Story 5.5 explicitly deferred failed/cancelled/stale payment release and rich receipt/payment emails.
- Story 5.3 payment creation failure release exists before handoff. This story is after handoff. Do not reuse provider-creation rollback status names without thinking through user retry and operations visibility.
- Deferred work warns expired reservation cleanup needed serialization/resumability before Story 5.6 expands release paths. Treat this as a must-fix design point.

### Git Intelligence Summary

- Recent commits:
  - `34c41cb fix: address story 5.5 review findings`
  - `527318f fix: remove inline receipt actions`
  - `d34a948 fix: center checkout receipt content`
  - `027e592 fix: tighten checkout receipt spacing`
  - `f9ccee7 fix: reconcile paid PayMongo return status`
- Current recent work focused on payment-return correctness, receipt copy restraint, and Story 5.5 idempotency. Preserve that narrowness.

### Architecture Compliance

- Use Route -> Controller -> Service -> Domain/Repository layering.
- Domain decisions must be testable without HTTP, D1, PayMongo, Astro, Elysia, Resend, Durable Objects, or React.
- D1/Drizzle remains source of truth for payment, reservation, release idempotency, and audit-safe state.
- Durable Objects coordinate checkout-sensitive operations where needed, but do not add DO release complexity unless it solves a proven race.
- Public API responses use `{ data, meta }` or `{ error: { code, message, details? } }` with request ID where safe.
- Payment, fulfillment, return, refund, and inventory statuses stay separate.
- JRW is single seller of record. Brands are catalog groups only and never PayMongo merchants, sellers, stores, tenants, or payout owners.

### Design Direction Fidelity

- Source: `_bmad-output/planning-artifacts/ux-design-directions.html#direction-04`.
- This story is mostly backend/domain. If payment-return copy or state UI changes, preserve Direction 04 precision checkout: staged Cart, Details, Payment, Receipt/Confirmation states, safe pending/failed/cancelled copy, text status labels, visible focus, mobile/desktop readability, 0px radius, 1px borders, no shadows/blur.
- Do not build full receipt/order timeline here. Story 5.7 owns richer receipt/status UX and payment emails.

### Latest Technical Information

- PayMongo Hosted Checkout V2 is current integration path for new Checkout Sessions; save Checkout Session ID and rely on `checkout_session.payment.paid` webhook for successful payment fulfillment. Source: https://docs.paymongo.com/docs/payment-channels-hosted-checkout and https://docs.paymongo.com/reference/create-a-checkout-v2
- PayMongo key concepts state Checkout Session can remain `active` while payment attempts fail and the customer can retry payment in the same session. Do not treat a non-paid attempt as final failure unless the session/payment is terminal or stale by JRW policy. Source: https://docs.paymongo.com/docs/payment-channels-key-concepts
- PayMongo webhook delivery expects a 200-209 response within 30 seconds and retries failed deliveries up to 12 times, so release/order/payment side effects must be idempotent. Source: https://docs.paymongo.com/docs/developer-tools-webhooks-key-concepts
- Cloudflare D1 supports batched SQL execution from Workers, but current repo already has Drizzle transaction fallback because explicit transaction support can vary by runtime. Prove release idempotency in Miniflare/D1 tests, not by assuming one runtime behavior. Source: https://developers.cloudflare.com/d1/worker-api/d1-database/

### Testing Requirements

- Minimum targeted suites are listed in Task 8.
- Add schema/migration tests if new release metadata/ledger columns or tables are introduced.
- Use Miniflare D1 tests for real stock math and unique release guards.
- Include a concurrent release test that starts from reserved stock and asserts final stock equals original stock, not original plus duplicate restore.
- Include simulated failure/resume test. If a release marker is written before stock restore, retry must still restore missing stock exactly once.
- Run `npm run check`. Run `npm run build-development` if route/runtime wiring changes.

### Anti-Patterns To Avoid

- Do not release stock from browser redirect params alone.
- Do not release stock for paid/order-confirmed payment.
- Do not call `releaseStockLine` twice for the same reservation item.
- Do not claim release complete before stock restoration is complete or resumable.
- Do not treat any active PayMongo Checkout Session with failed payment attempts as abandoned unless terminal provider status or stale policy says so.
- Do not add full receipt/payment email scope.
- Do not store or log raw provider payloads, checkout URL, card data, signatures, tokens, secrets, email, phone, address, or stack traces.
- Do not mix payment status and fulfillment status.
- Do not use legacy `src/api/**`.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 5.6`
- `_bmad-output/planning-artifacts/prd.md#Payments & Checkout`
- `_bmad-output/planning-artifacts/prd.md#Reliability & Data Integrity`
- `_bmad-output/planning-artifacts/architecture.md#Data Architecture`
- `_bmad-output/planning-artifacts/architecture.md#Integration Points`
- `_bmad-output/planning-artifacts/ux-design-specification.md#CheckoutSteps`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/epic-5-context.md`
- `_bmad-output/implementation-artifacts/5-2-server-cart-validation-and-inventory-reservation.md`
- `_bmad-output/implementation-artifacts/5-3-paymongo-payment-creation-and-handoff.md`
- `_bmad-output/implementation-artifacts/5-4-paymongo-webhook-verification-and-idempotency.md`
- `_bmad-output/implementation-artifacts/5-5-payment-reconciliation-and-order-confirmation.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `src/domain/schema/transactions.ts`
- `src/domain/checkout/inventory-reservation.ts`
- `src/domain/payments/payment-reconciliation.ts`
- `src/domain/payments/paymongo-webhook.ts`
- `src/server/repositories/CheckoutRepository.ts`
- `src/server/repositories/OrderConfirmationRepository.ts`
- `src/server/repositories/PaymentWebhookRepository.ts`
- `src/server/services/CheckoutService.ts`
- `src/server/services/PaymentReconciliationService.ts`
- `src/server/services/PaymentWebhookService.ts`
- `src/server/routes/payment-return.routes.ts`
- `src/server/routes/payment-webhook.routes.ts`
- `src/lib/paymongo/PayMongoClient.ts`
- `src/cloudflare/durable-objects/InventoryDurableObject.ts`
- `src/adapter/infrastructure/logging/operational-log.ts`
- `src/domain/audit/events.ts`
- https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- https://docs.paymongo.com/reference/create-a-checkout-v2
- https://docs.paymongo.com/docs/payment-channels-key-concepts
- https://docs.paymongo.com/docs/developer-tools-webhooks-key-concepts
- https://developers.cloudflare.com/d1/worker-api/d1-database/

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npx vitest run src/domain/checkout/inventory-release.test.ts src/domain/schema-invariants.test.ts` - passed, 17 tests.
- `npx vitest run src/server/repositories/InventoryReleaseRepository.test.ts src/domain/checkout/inventory-release.test.ts src/domain/schema-invariants.test.ts` - passed, 25 tests.
- `npx vitest run src/server/repositories/InventoryReleaseRepository.test.ts` - passed after provider/superseded-pending guard additions, 8 tests.
- `npx vitest run src/server/services/PaymentReconciliationService.test.ts src/server/routes/payment-return.routes.test.ts src/server/routes/payment-webhook.routes.test.ts` - passed, 16 tests.
- `npx vitest run src/domain/payments/payment-reconciliation.test.ts` - passed, 2 tests.
- `npx vitest run src/server/repositories/OrderConfirmationRepository.test.ts` - passed, 8 tests.
- `npx vitest run src/server/services/PaymentWebhookService.test.ts` - passed, 8 tests.
- `npx vitest run src/server/repositories/CheckoutRepository.test.ts` - passed, 15 tests.
- `npx vitest run src/server/services/PaymentReconciliationService.test.ts` - passed after review fixes, 14 tests.
- `npx vitest run src/domain/checkout/inventory-release.test.ts src/domain/payments/payment-reconciliation.test.ts src/server/repositories/CheckoutRepository.test.ts src/server/repositories/OrderConfirmationRepository.test.ts src/server/repositories/InventoryReleaseRepository.test.ts src/server/services/PaymentReconciliationService.test.ts src/server/services/PaymentWebhookService.test.ts src/server/routes/payment-return.routes.test.ts` - passed after review fixes, 60 tests.
- `npx vitest run src/domain/schema-invariants.test.ts` - passed after review fixes, 14 tests.
- `npx vitest run src/server/routes/payment-webhook.routes.test.ts` - passed after review fixes, 2 tests.
- `npm run check` - passed; existing hints remain in unrelated UI files.
- `npm run build-development` - passed; existing hints remain in unrelated UI files.
- `npm run check` - passed after review fixes; existing hints remain in unrelated UI files.
- `npm run build-development` - passed after review fixes; existing hints remain in unrelated UI files.
- Full `npx vitest run` was attempted before targeted validation; default/dot output exited without useful failure detail and JSON capture timed out after 304s with no report file.

### Completion Notes List

- Added pure checkout inventory-release decision helper for terminal, stale pending, paid/order skip, active pending skip, mismatch, and already-released cases.
- Added `checkout_reservation_releases` per-item ledger and migration `0031_checkout_reservation_releases.sql` for retry-safe stock restoration.
- Added `DrizzleInventoryReleaseRepository` with terminal/stale release APIs, guarded D1 batch stock restore plus release marker update, preorder no-stock release, duplicate/concurrent idempotency, and retry after failed restore.
- Enforced PayMongo-only release ownership and stale-pending skip when a newer pending payment owns the same attempt/reservation.
- Composed inventory release into `PaymentReconciliationService` terminal PayMongo fallback and stale pending return-status path; added service wrapper for batch stale pending reconciliation.
- Fixed review findings so terminal return refresh retries idempotent release, batch stale reconciliation emits per-payment audit/log visibility, and release failure logs include safe reservation/reason details.
- Kept paid webhook/order confirmation semantics unchanged; webhook route injects release repository only as reconciliation dependency and paid flow does not release inventory.
- Updated payment-return route metadata and deferred-work note to document server-owned failed/cancelled/stale release behavior.

### File List

- `migrations/0031_checkout_reservation_releases.sql`
- `src/domain/checkout/inventory-release.ts`
- `src/domain/checkout/inventory-release.test.ts`
- `src/domain/schema/transactions.ts`
- `src/domain/schema-invariants.test.ts`
- `src/server/repositories/InventoryReleaseRepository.ts`
- `src/server/repositories/InventoryReleaseRepository.test.ts`
- `src/server/repositories/CheckoutRepository.ts`
- `src/server/services/PaymentReconciliationService.ts`
- `src/server/services/PaymentReconciliationService.test.ts`
- `src/server/routes/payment-return.routes.ts`
- `src/server/routes/payment-webhook.routes.ts`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/5-6-release-reserved-inventory-after-failed-or-cancelled-payment.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-01: Story created with failed/cancelled/expired/stale payment inventory release scope and ready-for-dev status.
- 2026-07-01: Implemented idempotent post-payment inventory release ledger, repository/service composition, route metadata update, deferred-work note, and validation coverage; moved story to review.
- 2026-07-07: Code review completed; fixed terminal refresh release retry, batch stale release audit/log visibility, and safe failure log details; moved story to done.
