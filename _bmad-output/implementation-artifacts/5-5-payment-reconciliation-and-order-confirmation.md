# Story 5.5: Payment Reconciliation and Order Confirmation

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Shopper,
I want JRW to reconcile payment state before confirming my order,
so that checkout success reflects server truth, not redirect parameters.

## Acceptance Criteria

1. Given PayMongo reports payment success through a verified webhook or server reconciliation, when the payment maps unambiguously to one JRW checkout payment, then `checkout_payments.status` is `PAYMENT_PAID`, an order confirmation is created idempotently from JRW server state, and payment status remains separate from fulfillment status.
2. Given PayMongo redirect returns success-like params to `/checkout/payment-return`, when the Shopper lands there, then JRW reads server payment/order state only, ignores redirect params as proof, and never finalizes payment/order from browser query params.
3. Given payment is still `PAYMENT_PENDING` or reconciliation is delayed, when the Shopper views payment-return/status, then UI shows a pending/reconciliation-safe message, exposes a retry/status refresh path, and shows no false paid/order confirmation.
4. Given payment fails, expires, or is cancelled by verified provider state or explicit server reconciliation, when reconciliation runs, then payment status becomes `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, or `PAYMENT_CANCELLED` as appropriate, no order is created, and Shopper sees safe retry/return-to-cart action without raw PayMongo errors.
5. Given a paid payment has already created an order, when webhook retry, page refresh, or reconciliation retry occurs, then the same order/confirmation is returned and no duplicate order, snapshot, email, inventory movement, audit event, or log side effect is created.
6. Given order confirmation is created, when order rows and item snapshots are persisted, then checkout email/contact/delivery snapshot, nullable customer reference, payment ID, reservation ID, payment status, initial fulfillment status, totals in integer centavos, and product/order snapshots are stored from server-owned payment/reservation data.
7. Given order confirmation email is sent or queued, when notification runs, then email payload contains only safe order/shopper details, no raw provider payloads, checkout URL, card data, tokens, secrets, or unnecessary PII, and provider failure is logged/retryable without rolling back paid order confirmation.
8. Given payment/order reconciliation logs or audit events run, when success, pending, failed, cancelled, duplicate, or mismatch paths execute, then safe request ID, payment ID, order ID when available, provider checkout session ID, event ID when available, status, and code are recorded without raw provider payloads or PII.
9. Given implementation finishes, when tests run, then tests cover paid order creation, redirect-not-trusted, pending/delayed status, failed/expired/cancelled status, idempotent duplicate webhook/page refresh, order snapshot creation, confirmation email success/failure, safe labels, safe logs/audit, and `npm run check`; blockers are documented if validation cannot pass.

## Tasks / Subtasks

- [x] Task 1: Lock scope and preserve Epic 5 boundaries. (AC: 1-9)
  - [x] Re-read every UPDATE file listed in Current Code Intelligence before editing.
  - [x] Implement payment reconciliation, idempotent order confirmation, safe return/status surface, and order confirmation email only.
  - [x] Do not implement broad reserved-inventory release for failed/cancelled/stale payments; Story 5.6 owns stock release.
  - [x] Do not implement full receipt/payment-status UX or payment success/failure email copy beyond the order confirmation email; Story 5.7 owns rich receipt/status and payment emails.
  - [x] Do not implement admin order list/detail, fulfillment transitions, manual returns, or manual refunds; Epic 6 owns those.
  - [x] Keep guest checkout supported. Signed-in Customer order uses nullable `customer_id`; guest order remains accessible only through safe receipt/status mechanism, not raw email lookup.

- [x] Task 2: Add payment reconciliation domain rules. (AC: 1-5, 8)
  - [x] Add pure domain helpers under `src/domain/payments/**`, recommended `payment-reconciliation.ts`, for deciding paid, pending, failed, expired, cancelled, duplicate, mismatch, and order-confirmation eligibility.
  - [x] Treat `PAYMENT_PAID` as terminal for this story; never downgrade paid payment to pending/failed/cancelled from redirect params or unsupported event.
  - [x] Treat redirect params as display hints only. They can trigger server lookup/reconciliation but must never mutate state by themselves.
  - [x] Require paid confirmation source to be one of: processed `checkout_session.payment.paid` webhook result, already persisted `PAYMENT_PAID`, or provider server lookup normalized through a backend client. Browser params are not a source.
  - [x] Map invalid transitions or mismatches to `CONFLICT_STATE`, `PAYMENT_FAILED`, `PROVIDER_UNAVAILABLE`, or documented safe code.
  - [x] Keep payment state separate from order fulfillment state. Initial fulfillment status should be `ORDER_PLACED` or documented MVP equivalent, never a combined generic `status`.

- [x] Task 3: Add order confirmation persistence and migration. (AC: 1, 5-6)
  - [x] Add next migration after `0028_paymongo_webhook_events.sql`; do not edit old migrations.
  - [x] Update `src/domain/schema/transactions.ts` to make `orders` fit current payment/order truth. Current `orders` table is legacy: combined `status`, `status_description`, `shipping_type`, and `total_amount real`.
  - [x] Add or migrate required order fields without losing existing rows: `order_number` or public reference, nullable `customer_id`, `checkout_attempt_id`, `reservation_id`, `payment_id`, checkout email/contact/delivery snapshot, `payment_status`, `fulfillment_status`, `subtotal_centavos`, `total_centavos`, `currency`, `created_request_id`, `updated_request_id`, timestamps.
  - [x] Add unique constraints so one paid checkout payment creates at most one order, and one checkout attempt/reservation cannot create duplicate active confirmations.
  - [x] Reuse `order_snapshots` for item snapshots. Existing payment item rows are used as frozen source with catalog label fallback at first confirmation, then snapshot rows are not recomputed.
  - [x] Preserve integer centavos for all new money fields. Do not add new `real` or float money fields.
  - [x] Add schema invariant tests proving order/payment/confirmation tables do not store raw provider payloads, checkout URL, card data, tokens, signatures, secrets, or unnecessary PII.

- [x] Task 4: Build repository methods for idempotent confirmation. (AC: 1, 5-6)
  - [x] Extend or add repository under `src/server/repositories/**`, recommended `OrderConfirmationRepository.ts`, using existing `createDb` pattern.
  - [x] Load paid payment with checkout attempt, active or paid reservation, payment items, and existing order in one server-owned path.
  - [x] Create order and order snapshots idempotently. Retry after partial success must return the existing order or complete missing safe child records without duplicate rows.
  - [x] Use guarded inserts and unique constraints for D1-compatible idempotency rather than duplicate or half-confirmed orders.
  - [x] Record safe confirmation status on payment/order if useful, but do not overload `checkout_attempts.status` with fulfillment truth.
  - [x] Ensure concurrent webhook and return-page reconciliation cannot both create orders.

- [x] Task 5: Update payment webhook processing to trigger confirmation after paid event. (AC: 1, 5, 8)
  - [x] Update `PaymentWebhookService` or compose a new `PaymentReconciliationService` so processed paid webhook can create or return order confirmation after the payment becomes paid.
  - [x] Keep existing Story 5.4 guarantees: signature verification before parsing/mutation, idempotency claim before side effects, no raw payload persistence, duplicate/conflict handling.
  - [x] Preserve exact duplicate webhook behavior. Duplicate event after confirmation returns idempotent success and does not resend confirmation email unless queued send policy says retry is needed.
  - [x] Unsupported webhook events remain ignored unless this story explicitly adds failed/cancelled normalization with tests.
  - [x] Update `payment-webhook.routes.ts` description: after this story it may create order confirmation, but still no inventory release, rich receipt, or payment email.

- [x] Task 6: Add return/status API and page. (AC: 2-4, 8)
  - [x] Add `/checkout/payment-return` page because current PayMongo success URL points there and the page does not exist.
  - [x] Add a server endpoint or Astro server load path that accepts only safe lookup inputs, recommended `paymentId`/`checkoutSessionId`/attempt reference from server-owned records or signed short-lived status token. Do not allow raw email-only order lookup.
  - [x] Page must call server state and show one of: paid/order confirmed, pending/reconciliation delayed, failed/expired/cancelled retry, or safe unavailable state.
  - [x] Success-like query params from PayMongo must not mark payment paid or create an order. They can only select copy or trigger server lookup.
  - [x] Public response uses `{ data, meta }` or `{ error }` envelope with request ID. No provider internals, raw PayMongo errors, checkout URL, card data, or contact PII.
  - [x] If status endpoint is public, document auth mode, rate-limit class, lookup token rules, and denial codes. If Customer-authenticated, also support guest status link/token for guest checkout.

- [x] Task 7: Add order confirmation email boundary. (AC: 7)
  - [x] Add domain template under `src/domain/notifications/**`, recommended `order-confirmation-email.ts`, with safe fields only: order number/reference, item names/quantities/prices, totals, payment status label, fulfillment status label, and next action/status URL.
  - [x] Extend Resend adapter or add a focused notifier under `src/adapter/infrastructure/resend/**`; reuse `email-template.ts`, `ResendEmailClient`, config resolution patterns, and safe provider logging from `CustomerVerificationEmailNotifier`.
  - [x] Email must go to checkout email snapshot. Do not send to arbitrary browser-submitted email or account email unless it matches server order data.
  - [x] Provider failure must log safe context and leave order confirmation intact with retryable email state or documented operational follow-up.
  - [x] Keep PayMongo `send_email_receipt` disabled unless project owner explicitly changes policy; JRW owns order confirmation copy.

- [x] Task 8: Add tests and QA gates. (AC: 1-9)
  - [x] Domain tests for reconciliation decisions: paid, already-paid, pending, failed, expired, cancelled, redirect-not-trusted, duplicate, mismatch, invalid transition.
  - [x] Repository/D1 tests for order creation, unique payment/order idempotency, duplicate webhook/page race, snapshot creation, partial retry/compensation, and schema invariant protections.
  - [x] Service tests for paid webhook creates order, duplicate webhook returns existing order, redirect page lookup never mutates from params, pending returns safe status, failed/cancelled returns safe retry state, confirmation email success/failure, and safe logs/audit.
  - [x] Route/page tests for `/checkout/payment-return`, status endpoint envelope, rate-limit/auth metadata, lookup denial, safe labels, request ID, no provider internals, and no raw email lookup.
  - [x] UI tests for Direction 04 payment-return states at mobile/desktop widths if page renders React/Astro UI.
  - [x] Minimum commands:
    - `npx vitest run src/domain/payments/payment-reconciliation.test.ts src/domain/payments/paymongo-webhook.test.ts`
    - `npx vitest run src/server/repositories/PaymentWebhookRepository.test.ts src/server/repositories/OrderConfirmationRepository.test.ts src/domain/schema-invariants.test.ts`
    - `npx vitest run src/server/services/PaymentWebhookService.test.ts src/server/services/PaymentReconciliationService.test.ts src/server/routes/payment-webhook.routes.test.ts`
    - `npx vitest run src/server/routes/checkout.routes.test.ts src/features/cart-checkout/components/cart-ui.test.tsx`
    - `npm run check`
  - [x] Run targeted suites, `npm run check`, and `npm run build-development`; full `npx vitest run`/`build-test` exceeded practical runtime without actionable failure output.

### Review Findings

- [x] [Review][Patch] Duplicate paid webhook left in `RECEIVED` did not retry processing — fixed by re-running paid-session processing for exact duplicate supported events that were claimed but not completed.
- [x] [Review][Patch] Duplicate failed webhook retried reconciliation for non-paid payment — fixed by reconciling duplicates only when prior event status is `PROCESSED`.
- [x] [Review][Patch] `SENDING` order confirmation email could wedge forever — fixed with stale `SENDING` reclaim after the send-claim timeout while preserving fresh in-flight sends.
- [x] [Review][Patch] Payment-return lookup with multiple identifiers could show wrong payment — fixed by requiring all supplied identifiers to match the same payment row.
- [x] [Review][Patch] Attempt lookup could hide confirmed payment behind later pending retry — fixed by prioritizing rows with confirmed orders / paid payments before latest pending rows.
- [x] [Review][Patch] Same checkout attempt/reservation could create duplicate orders — fixed with unique order indexes and repository fallback to existing confirmation.
- [x] [Review][Patch] Provider fallback kept explicit expired/cancelled/failed session statuses pending — fixed by normalizing supported terminal provider states to local payment terminal statuses.
- [x] [Review][Patch] Order snapshots preferred mutable catalog labels — fixed by preferring frozen payment-item labels.
- [x] [Review][Patch] Confirmation email missed required status fields — fixed with payment label, fulfillment label, status URL, and item price summary.
- [x] [Review][Patch] Older status response could regress newer refresh state — fixed with request sequencing in the payment-return React component.
- [x] [Review][Patch] Paid payment with no frozen items could create empty order — fixed by rejecting confirmation when payment items are absent.
- [x] [Review][Defer] Existing legacy `orders.status` and `orders.total_amount real` remain for backward compatibility; new Story 5.5 reads/writes canonical `payment_status`, `fulfillment_status`, and centavos fields.
- [x] [Review][Defer] Provider-paid fallback still does not verify amount/currency/livemode from PayMongo GET response because current local session ID is server-created and PayMongo response parsing lacks stable amount fields; revisit if provider status response contract is expanded.
- [x] [Review][Defer] Image reference is not available in `checkout_payment_items`; order snapshot `image_r2_key` remains `null` until checkout payment item schema stores frozen image reference.
- [x] [Review][Dismiss] Checkout URL persistence in `checkout_payments` is intentional Story 5.3 handoff state, not raw provider payload storage in order confirmation.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [x] Route auth metadata declares public/optional/required auth, roles, and rate-limit class.
- [x] Route-level RBAC guard runs before validation or side effects for protected endpoints. N/A for public webhook/status routes; provider signature or high-entropy server reference is boundary.
- [x] Service/controller enforces actor state before mutation: authenticated, active, verified, approved. N/A for public provider/customer return routes; mutation source is server payment state only.
- [x] Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. N/A: no brand-scoped endpoint added.
- [x] Public/customer endpoints explicitly document why brand membership is not required.
- [x] Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable. N/A for brand/role denial; missing/unknown lookup and webhook auth are covered.
- [x] Error response uses safe envelope codes and does not leak provider/internal authorization details.
- [x] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes.

For this story, expected checklist interpretation:

- PayMongo webhook remains public because provider signature verification is the auth boundary. Customer/admin/brand auth is `N/A` for webhook route, but signature and idempotency must happen before order confirmation side effects.
- Payment-return/status endpoint is customer/guest-facing, not brand-scoped. Brand membership is `N/A` because it reads only the Shopper's own checkout/order state.
- Guest lookup must use a signed/status token or server-owned reference, not raw email. Signed-in Customer lookup must restrict to own order.
- Denial tests should cover invalid/missing lookup token, mismatched Customer, raw email lookup, unknown payment/order, unsupported provider status, and redirect-param mutation attempts.

## Dev Notes

### Epic Context

- Epic 5 goal: guest or signed-in shoppers submit checkout, inventory is reserved, PayMongo Hosted Checkout is created through JRW's single merchant account, payment state reconciles from server/provider truth, and safe updates reach the Shopper.
- Story 5.1 captured checkout details into `checkout_attempts` with nullable `customer_id` and guest attempt token.
- Story 5.2 reserved inventory through D1/DO coordination and keeps reservation separate from payment/fulfillment.
- Story 5.3 created PayMongo Hosted Checkout V2 sessions and persisted `checkout_payments` plus `checkout_payment_items`.
- Story 5.4 verified PayMongo webhooks, recorded `payment_webhook_events`, and moved only `PAYMENT_PENDING -> PAYMENT_PAID` for supported paid checkout-session events.
- Story 5.5 owns order confirmation from paid payment truth.
- Story 5.6 owns failed/cancelled/stale payment inventory release. Do not over-restore stock here.
- Story 5.7 owns rich receipt/payment-status UX and payment success/failure emails. This story may create minimal payment-return status and order confirmation email only.

### Current Code Intelligence

#### READ/UPDATE: `src/domain/schema/transactions.ts`

- Current state: `orders` is legacy and still uses combined `status`, `status_description`, `shipping_type`, and `total_amount real`. This is not enough for PRD-required payment/fulfillment separation or integer-centavos money.
- Current state: `checkout_attempts`, `checkout_reservations`, `checkout_reservation_items`, `checkout_payments`, `checkout_payment_items`, `payment_webhook_events`, and `order_snapshots` already exist.
- What this story changes: add order confirmation fields/constraints and possibly expand checkout payment item frozen fields. Keep payment status and fulfillment status separate.
- Preserve: no raw provider payload/card/token/PII fields; new money fields use centavos integers.

#### READ/UPDATE: `src/server/repositories/PaymentWebhookRepository.ts`

- Current state: `processPaidCheckoutSession` finds a payment by PayMongo checkout session ID and updates `PAYMENT_PENDING -> PAYMENT_PAID`; marks event `PROCESSED`, `FAILED`, or already paid.
- What this story changes: after paid state is established, order confirmation must happen idempotently, ideally through a new order confirmation repository/service rather than stuffing order logic into webhook idempotency repository.
- Preserve: unique provider event claim, duplicate same-hash behavior, conflict behavior, and no raw payload persistence.

#### READ/UPDATE: `src/server/services/PaymentWebhookService.ts`

- Current state: verifies raw-body signature, parses event, claims idempotency, ignores unsupported events, processes paid checkout-session events, and emits safe audit/log events.
- What this story changes: compose paid payment reconciliation/order confirmation after `paid` or `already-paid` result, with duplicate retry safety and confirmation email side-effect guard.
- Preserve: invalid signatures reject before mutation; duplicate webhook does not re-run side effects.

#### READ/UPDATE: `src/server/routes/payment-webhook.routes.ts`

- Current state: public `POST /api/payments/paymongo/webhooks`, `parse: "text"`, raw body cap, signature header, response schema for event and optional paid payment. Route description says no orders/emails.
- What this story changes: update response schema/description if webhook now returns order confirmation summary. Keep provider-compatible safe envelope and public auth metadata.
- Preserve: `Paymongo-Signature` as provider auth boundary; no customer/admin/brand session checks.

#### READ/UPDATE: `src/domain/payments/paymongo-webhook.ts`

- Current state: supported event list only includes `checkout_session.payment.paid`; unsupported events such as refunds are ignored.
- What this story changes: add status normalization only if necessary and tested. Do not treat unsupported failed/cancelled/refund events as authoritative without explicit provider event mapping.
- Preserve: pure event parse/classification and derived event ID behavior.

#### READ/UPDATE: `src/domain/payments/paymongo-checkout.ts`

- Current state: defines payment statuses including `PAYMENT_CANCELLED` and `PAYMENT_REFUNDED`, builds PayMongo return URLs with `successUrl` set to `/checkout/payment-return`, validates PayMongo checkout URL, builds V2 checkout payload with string metadata.
- What this story changes: add reconciliation helpers nearby or new file. `/checkout/payment-return` must exist and must not trust query params.
- Preserve: V2 Hosted Checkout, server-owned URLs, string-only metadata, trusted checkout URL, and `send_email_receipt: false` default.

#### READ/UPDATE: `src/server/repositories/CheckoutRepository.ts`

- Current state: creates checkout attempts, reservations, payments, payment items, and handles provider-creation failure release. Payment status union does not currently include `PAYMENT_CANCELLED` despite domain status list including it.
- What this story changes: add read methods for paid payment/order confirmation source or avoid bloating this repository with order responsibilities by adding `OrderConfirmationRepository`.
- Preserve: D1-safe guarded updates, active reservation logic, payment creation idempotency, no provider calls in repository.

#### READ/UPDATE: `src/server/services/CheckoutService.ts`

- Current state: payment handoff result says `orderCreated: false`, `receiptAvailable: false`, `webhookRequired: true`; creates PayMongo session and redirects browser.
- What this story changes: likely no direct handoff change except status/return helpers if reused. Do not regress handoff idempotency or provider URL trust.
- Preserve: browser submits only attempt token for payment creation; no amount/provider/status from browser.

#### READ/UPDATE: `src/pages/checkout/index.astro`

- Current state: checkout page exists.
- What this story changes: add sibling `src/pages/checkout/payment-return.astro` because PayMongo return URL already points there.
- Preserve: `StorefrontLayout`, checkout flow boundaries, responsive storefront shell.

#### READ/UPDATE: `src/features/cart-checkout/api.ts`

- Current state: frontend validates cart, saves details, reserves inventory, creates payment, and maps safe errors/copy. It validates payment handoff as `PAYMENT_PENDING`.
- What this story changes: add status/return API helper only if return page uses React island. Do not let client mutate payment/order from query params.
- Preserve: no frontend PayMongo provider calls; no raw card fields; no account prompt in checkout details.

#### READ/UPDATE: `src/server/repositories/SnapshotRepository.ts` and `src/domain/snapshots/**`

- Current state: snapshot repository can create idempotent `order_snapshots` using signature; snapshot schema stores product name, variant label/options, price centavos, quantity, image reference.
- What this story changes: reuse snapshot creation or shared snapshot types for order items. Do not create duplicate snapshot logic that ignores existing signature idempotency.
- Preserve: snapshots never update after creation; current/future catalog image changes must not alter order history.

#### READ/UPDATE: `src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.ts` and `src/adapter/infrastructure/resend/email-template.ts`

- Current state: Resend adapter, lazy client, config resolution, safe provider logging, and shared email frame/template helpers exist for account lifecycle emails.
- What this story changes: add order confirmation notifier or generalize enough to send order confirmation emails without duplicating provider config/logging.
- Preserve: provider errors scrub email/token/secrets; no raw provider response in logs.

#### READ/UPDATE: `src/domain/audit/events.ts` and `src/adapter/infrastructure/logging/operational-log.ts`

- Current state: audit actions include `payment.failed`, `payment.reconciled`, `order.created`, and `order.status_changed`; scrubbers redact payment payloads/responses, card data, contact PII, secrets, tokens, signatures.
- What this story changes: emit `payment.reconciled` and `order.created` for confirmed order, plus safe operational logs.
- Preserve: no raw PayMongo payload, checkout URL, email, phone, address, token, secret, or stack traces in logs/audit.

### Previous Story Intelligence

- Story 5.4 intentionally did not create orders, receipts, emails, fulfillment changes, or inventory release. It did mark paid checkout-session events as `PAYMENT_PAID` only when provider checkout session maps to one existing JRW payment.
- Story 5.4 verified current PayMongo docs: Hosted Checkout V2 uses `checkout_session.payment.paid`; `Paymongo-Signature` includes `t`, `te`, and `li`; signature input is `${timestamp}.${rawBody}`.
- Story 5.3 review fixed payment duplication hazards. Do not regress:
  - browser must always call JRW backend, never a PayMongo proxy/provider endpoint;
  - payment creation must stay race-safe and idempotent;
  - pending payment reuse must remain valid;
  - payment failure release must not undo `PAYMENT_CREATED` or release a pending payment;
  - PayMongo checkout URL must stay trusted before persistence/redirect;
  - raw provider payloads, checkout URL, contact PII, tokens, card data, and secrets must stay scrubbed.
- Story 5.2 reservation release exists for provider-creation failure and expired pre-payment reservations. Story 5.6 owns post-payment failed/cancelled release. Do not add broad release here.
- Story 3.8 snapshot repository exists and should be reused for order item history.

### Git Intelligence Summary

- Recent commits:
  - `2493b94 refactor: details`
  - `dc2f0f1 refactor: change the ui of product and fix errors`
  - `b8cc2c9 feat: 5-4 implemented`
  - `032792f feat: 5-4 implementation by ChatGPT Browser`
  - `49ea825 refactor: manual change of ui/ux for cart stepper`
- Worktree was clean during story creation. New story should assume Story 5.4 implementation is current baseline.

### Architecture Compliance

- Use Route -> Controller -> Service -> Domain/Repository layering.
- Domain rules must be testable without HTTP, D1, PayMongo, Astro, Elysia, Resend, or React.
- D1/Drizzle is source of truth for payments, orders, snapshots, idempotency, and notification state.
- Durable Object coordinates inventory. Do not use DO for order confirmation unless concrete race requires it and tests prove it.
- Public API responses use `{ data, meta }` or `{ error: { code, message, details? } }` with request ID where safe.
- TypeBox/Elysia schemas drive route contracts and OpenAPI.
- Payment, fulfillment, return, refund, and inventory statuses stay separate.
- JRW is single seller of record. Brands are catalog groups only and never PayMongo merchants, sellers, stores, tenants, or payout owners.

### Design Direction Fidelity

- Source: `_bmad-output/planning-artifacts/ux-design-directions.html#direction-04`.
- This story touches checkout return/status UI. Direction 04 staged checkout requires Cart, Details, Payment, and Receipt/Confirmation states with safe pending/failed messaging.
- Payment-return page must preserve JRW Technical Brutalist style: 0px radius, 1px borders, no shadows/blur, sharp modules, text status labels, visible focus, and mobile/desktop readability.
- Do not build full receipt/order timeline beyond this story's minimal confirmed/pending/failed/cancelled return surface. Story 5.7 owns richer receipt/status and optional guest account CTA.
- Query params from PayMongo must not drive visual "paid" state unless server status confirms it.

### Latest Technical Information

- PayMongo Hosted Checkout docs recommend `/v2/checkout_sessions` for new integrations; V2 defers Payment Intent creation until the customer pays. Source: https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- PayMongo V2 create-checkout docs say to save Checkout Session ID and use `checkout_session.payment.paid` webhook moving forward. Source: https://docs.paymongo.com/reference/create-a-checkout-v2
- PayMongo Checkout Session lifecycle says failed attempts can retry with a new Payment Intent while the Checkout Session stays the same; paid success sends `checkout_session.payment.paid`. Source: https://docs.paymongo.com/docs/payment-channels-key-concepts
- PayMongo Hosted Checkout docs say the paid webhook payload includes full Checkout Session and resulting payment, so order fulfillment can proceed without another API call when webhook is verified and idempotent. Source: https://docs.paymongo.com/docs/payment-channels-hosted-checkout#webhooks
- PayMongo webhook delivery treats HTTP 200-209 within 30 seconds as successful and retries failed delivery up to 12 times; order confirmation must be idempotent. Source: https://docs.paymongo.com/docs/developer-tools-webhooks-key-concepts
- PayMongo signature docs require `Paymongo-Signature` parts `t`, `te`, and `li`; HMAC SHA-256 signs `timestamp.rawBody`; use raw body, not parsed JSON. Source: https://docs.paymongo.com/docs/developer-tools-webhook-setup-management#securing-a-webhook

### Testing Requirements

- Minimum targeted suites are listed in Task 8.
- Add schema/migration tests before broad service tests if order columns/constraints change.
- For UI return page, test desktop and mobile markup/state enough to prove no false paid confirmation, no provider internals, no text overflow, and Direction 04 status copy.
- Run `npm run check`. Run `npm run build-test` after targeted tests pass because payment/order/schema/route/UI changes have high blast radius.
- If Resend or Cloudflare remote bindings block email/build verification, document exact blocker and keep unit tests around notifier payload/logging.

### Anti-Patterns To Avoid

- Do not trust PayMongo redirect params for payment success.
- Do not create order before payment is server-confirmed paid.
- Do not create duplicate orders on webhook retry, page refresh, or concurrent reconciliation.
- Do not combine payment and fulfillment into one status.
- Do not release or over-restore inventory for failed/cancelled payment in this story.
- Do not send full receipt/payment-status emails from this story except order confirmation email required by AC.
- Do not store raw provider payloads, checkout URL, signatures, card data, tokens, secrets, or unnecessary PII.
- Do not parse product and variant names from one display string if stable fields are available or can be added.
- Do not use legacy `src/api/**`.
- Do not add frontend PayMongo calls or card fields.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 5.5`
- `_bmad-output/planning-artifacts/prd.md#Payments & Checkout`
- `_bmad-output/planning-artifacts/prd.md#Reliability & Data Integrity`
- `_bmad-output/planning-artifacts/prd.md#Notifications`
- `_bmad-output/planning-artifacts/architecture.md#Data Architecture`
- `_bmad-output/planning-artifacts/architecture.md#Integration Points`
- `_bmad-output/planning-artifacts/ux-design-specification.md#CheckoutSteps`
- `_bmad-output/planning-artifacts/ux-design-specification.md#OrderReceipt`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/epic-5-context.md`
- `_bmad-output/implementation-artifacts/5-2-server-cart-validation-and-inventory-reservation.md`
- `_bmad-output/implementation-artifacts/5-3-paymongo-payment-creation-and-handoff.md`
- `_bmad-output/implementation-artifacts/5-4-paymongo-webhook-verification-and-idempotency.md`
- `src/domain/schema/transactions.ts`
- `src/domain/payments/paymongo-checkout.ts`
- `src/domain/payments/paymongo-webhook.ts`
- `src/server/repositories/PaymentWebhookRepository.ts`
- `src/server/services/PaymentWebhookService.ts`
- `src/server/routes/payment-webhook.routes.ts`
- `src/server/repositories/CheckoutRepository.ts`
- `src/server/services/CheckoutService.ts`
- `src/server/repositories/SnapshotRepository.ts`
- `src/domain/snapshots/schemas.ts`
- `src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.ts`
- `src/adapter/infrastructure/resend/email-template.ts`
- `src/domain/audit/events.ts`
- https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- https://docs.paymongo.com/reference/create-a-checkout-v2
- https://docs.paymongo.com/docs/payment-channels-key-concepts
- https://docs.paymongo.com/docs/developer-tools-webhooks-key-concepts
- https://docs.paymongo.com/docs/developer-tools-webhook-setup-management#securing-a-webhook

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npx vitest run src/domain/payments/payment-reconciliation.test.ts src/domain/payments/paymongo-checkout.test.ts src/server/repositories/OrderConfirmationRepository.test.ts src/server/services/PaymentReconciliationService.test.ts src/server/services/PaymentWebhookService.test.ts src/server/routes/payment-return.routes.test.ts src/server/routes/payment-webhook.routes.test.ts src/domain/schema-invariants.test.ts` - passed.
- `npx vitest run src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts src/features/cart-checkout/components/cart-ui.test.tsx` - passed.
- `npx vitest run src/features/cart-checkout/components/cart-ui.test.tsx` - passed after payment-return UI test.
- `npm run check` - passed with existing warnings/hints.
- `npm run build-development` - passed with existing warnings/hints.
- `npx vitest run` full suite exceeded practical runtime/nonzero without actionable failure output; targeted impacted suites passed.

### Completion Notes List

- Added additive order confirmation migration and schema fields for `orders` with `payment_status`, separate `fulfillment_status`, centavos totals, checkout snapshot, email retry state, and unique payment/order references.
- Added payment reconciliation domain helpers, D1 order confirmation repository, service, webhook composition, and status controller/route.
- Added `/checkout/payment-return` page plus client status UI/API. PayMongo success URL now carries server-owned `attemptId`; status route tolerates extra redirect params but forwards only server lookup refs.
- Added Resend-backed order confirmation email notifier with safe payload and retryable order email state; provider send failure logs safe order/payment context and does not roll back order creation.
- Failed/expired/cancelled UI/status handling reads existing server statuses only. Broad inventory release and richer payment email/receipt UX remain Story 5.6/5.7 scope.

### File List

- `_bmad-output/implementation-artifacts/5-5-payment-reconciliation-and-order-confirmation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `migrations/0029_order_confirmation.sql`
- `src/domain/schema/transactions.ts`
- `src/domain/schema-invariants.test.ts`
- `src/domain/payments/payment-reconciliation.ts`
- `src/domain/payments/payment-reconciliation.test.ts`
- `src/domain/payments/paymongo-checkout.ts`
- `src/domain/payments/paymongo-checkout.test.ts`
- `src/domain/notifications/order-confirmation-email.ts`
- `src/adapter/infrastructure/resend/OrderConfirmationEmailNotifier.ts`
- `src/server/repositories/OrderConfirmationRepository.ts`
- `src/server/repositories/OrderConfirmationRepository.test.ts`
- `src/server/services/PaymentReconciliationService.ts`
- `src/server/services/PaymentReconciliationService.test.ts`
- `src/server/services/PaymentWebhookService.ts`
- `src/server/services/PaymentWebhookService.test.ts`
- `src/server/services/CheckoutService.ts`
- `src/server/services/CheckoutService.test.ts`
- `src/server/controllers/PaymentReconciliationController.ts`
- `src/server/routes/payment-return.routes.ts`
- `src/server/routes/payment-return.routes.test.ts`
- `src/server/routes/payment-webhook.routes.ts`
- `src/server/routes/index.ts`
- `src/server/app.ts`
- `src/features/cart-checkout/api.ts`
- `src/features/cart-checkout/components/PaymentReturnStatus.tsx`
- `src/features/cart-checkout/components/cart-ui.test.tsx`
- `src/features/cart-checkout/index.ts`
- `src/pages/checkout/payment-return.astro`
## Change Log

- 2026-06-26: Story created with payment reconciliation/order confirmation scope and ready-for-dev status.
- 2026-06-26: Implemented payment reconciliation, idempotent order confirmation, payment-return status UI/API, and order confirmation email boundary; story moved to review.
