# Story 5.7: Checkout Receipt, Payment Status, and Payment Emails

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Shopper,
I want checkout receipt and payment status updates that are clear and safe,
so that I know what happened after payment without seeing provider internals.

## Acceptance Criteria

1. Given Shopper reaches `/checkout/payment-return` for a paid payment, when JRW server state confirms the order, then receipt shows order number/reference, purchased items from order snapshots or frozen payment items, totals in PHP centavos display, payment status label, fulfillment status label, and one clear next action; provider internals, raw PayMongo errors, checkout URL, secrets, tokens, and contact/delivery PII are not exposed.
2. Given paid receipt renders, when Shopper reads success content, then receipt reassures that order and delivery updates were sent to the checkout email inbox, and the reassurance is based on server order/checkout email state, not browser-submitted email.
3. Given paid receipt belongs to a guest checkout, when receipt shows optional account conversion, then guest account CTA appears after successful receipt content, never inside checkout details, uses copy such as `Create account`, and routes to the customer account flow without blocking receipt/status access.
4. Given guest account CTA uses checkout email context, when implementation provides prefill or contextual copy, then source is the persisted checkout email from JRW server state through a signed/masked context only; raw email must not be placed in URL query params, logs, route metadata, or public error details.
5. Given payment is `PAYMENT_PENDING`, reconciliation delayed, provider lookup unavailable, or order creation still catching up, when Shopper views receipt/status, then UI shows safe pending/reconciliation label, refresh/check-status action in the checkout summary rail, no false paid confirmation, and no raw provider detail.
6. Given payment is `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, or `PAYMENT_CANCELLED`, when Shopper views receipt/status, then UI shows safe text status label, next action to retry or return to checkout/products according to server `next` flags, no order confirmation, no provider payload, and no stale inventory-release internals.
7. Given payment status email is triggered for paid, failed, expired, or cancelled payment, when notification sends, then checkout email receives one safe payment status email or the existing order confirmation email is deliberately reused for the paid-success case; duplicate webhook retries, return-page refreshes, and stale reconciliation retries do not send duplicate emails.
8. Given payment status email provider fails or runtime config is missing, when send attempt fails, then payment/order state is not rolled back, failure is logged with request ID, payment ID and order ID when available, safe status/reason, and retryable email state; logs exclude raw provider payload, email address, phone, address, checkout URL, secrets, tokens, card data, signatures, and stack traces.
9. Given receipt/status UI renders on desktop and mobile, when QA runs against Direction 04, then content is readable, status labels are text-based and color-independent, buttons meet 44px touch and cobalt 2px outline focus requirements, heading/status spacing follows UX spec, text does not overflow, and JRW tokens are used with 0px radius, 1px borders, no shadows, no blur.
10. Given implementation finishes, when tests and QA run, then checks cover paid receipt with items/totals/statuses, inbox update reassurance, optional guest account CTA, pending status, failed/expired/cancelled status, email success/failure/idempotency, mobile/desktop receipt layout, safe messaging, and `npm run check`; blockers are documented if validation cannot pass.

## Tasks / Subtasks

- [x] Task 1: Lock scope and preserve Epic 5 boundaries. (AC: 1-10)
  - [x] Re-read every UPDATE file listed in Current Code Intelligence before editing.
  - [x] Implement rich receipt/status presentation and payment status email behavior only.
  - [x] Preserve Story 5.5 payment reconciliation/order confirmation idempotency and Story 5.6 failed/cancelled/stale inventory release idempotency.
  - [x] Do not implement signed-in customer order history, broad guest order lookup, admin order list/detail, fulfillment transitions, manual return recording, manual refund recording, or order truth timeline beyond receipt labels; Epic 6 owns those.
  - [x] Do not trust browser redirect params, cart state, or query-string email for paid state, account CTA context, receipt items, totals, or email recipient.
  - [x] Keep PayMongo `send_email_receipt` disabled unless owner explicitly changes policy. JRW owns customer-facing order/payment email copy.

- [x] Task 2: Extend receipt/status domain contracts. (AC: 1-6)
  - [x] Add pure helpers under `src/domain/payments/**` or `src/domain/checkout/**`, recommended `payment-receipt.ts`, for receipt status labels, next-action decisions, email trigger decisions, and public receipt DTO shaping.
  - [x] Keep public statuses limited to safe labels: `pending`, `confirmed`, `failed`, `expired`, `cancelled`, `refunded`, `unknown`.
  - [x] Keep payment status separate from fulfillment status. Do not combine into one generic `status`.
  - [x] Derive paid receipt from server order/payment state only. Browser query params may choose lookup reference only.
  - [x] Derive receipt items from `order_snapshots` when order exists; fallback to `checkout_payment_items` only if order snapshot completion is still retrying and copy clearly remains pending.
  - [x] For guest CTA eligibility, return a safe boolean/intent such as `guestAccountCtaEligible`; do not return raw checkout email unless a signed/masked server token mechanism is implemented and tested.

- [x] Task 3: Expand payment-return repository data without leaking PII. (AC: 1-6)
  - [x] Extend `DrizzleOrderConfirmationRepository` or add a focused receipt repository under `src/server/repositories/**`.
  - [x] Current `findPaymentReturnRecord` returns payment/order ID, order number, total, and safe status only. Add a public receipt read path for order number, item names/variant labels/quantities/prices, subtotal/total/currency, payment status label, fulfillment status label, and customer mode/guest CTA eligibility.
  - [x] Keep email/contact/delivery snapshot fields out of public receipt DTO unless masked or signed-token-scoped. `orders.checkout_email`, phone, street, barangay, city, and postal code must not be returned to the browser just to render receipt.
  - [x] Preserve lookup behavior fixed in Story 5.5: multiple supplied identifiers must match one payment row; confirmed/paid rows outrank later pending retry rows.
  - [x] Preserve order-confirmation idempotency: paid payment with no order may still trigger `confirmPaidPayment`, but receipt expansion must not create duplicate orders or snapshots.
  - [x] Add repository tests for confirmed order receipt, pending payment no-order receipt, terminal failed/cancelled receipt, and no raw PII/provider columns in public DTO.

- [x] Task 4: Add payment status email domain and persistence policy. (AC: 7-8)
  - [x] Decide explicit paid-success email policy before coding:
    - Preferred: existing order confirmation email satisfies paid-success payment status email when copy includes payment status, fulfillment status, receipt/status URL, and inbox reassurance.
    - Add separate `PaymentStatusEmailNotifier` only for failed/expired/cancelled payment notifications or when product requires distinct paid payment email.
  - [x] For failed/expired/cancelled payment emails, add domain template under `src/domain/notifications/**`, recommended `payment-status-email.ts`, using safe fields only: payment status label, payment/reference/order number when available, total, safe next action URL, and no provider payload/contact/delivery details.
  - [x] Add durable send state so duplicate refreshes/retries do not duplicate emails. Options:
    - Add `payment_status_email_*` columns to `checkout_payments` through next migration after `0031_checkout_reservation_releases.sql`.
    - Or create a generic notification outbox table with unique key `(event_type, payment_id, status)` if broader reuse is justified and tests stay focused.
  - [x] Use D1 claim state as source of truth for email idempotency. Resend idempotency headers may be additive only; they expire after 24 hours.
  - [x] Email recipient must come from `checkout_attempts.checkout_email` or `orders.checkout_email` already persisted by JRW, never from browser body/query.
  - [x] Provider failure marks email state `FAILED` or equivalent retryable state without rolling back payment/order/inventory state.

- [x] Task 5: Extend Resend adapter safely. (AC: 7-8)
  - [x] Reuse `src/adapter/infrastructure/resend/email-template.ts` and config resolution from `CustomerVerificationEmailNotifier.ts`.
  - [x] Extend `OrderConfirmationEmailNotifier` copy if it is reused for paid-success payment status. Include order number, payment label, fulfillment label, total, item summary, status URL, and inbox/update reassurance.
  - [x] Add `PaymentStatusEmailNotifier` under `src/adapter/infrastructure/resend/**` if terminal payment emails are separate.
  - [x] Do not duplicate config parsing, lazy client code, or HTML escaping helpers if existing helpers fit.
  - [x] If adding Resend `Idempotency-Key`, keep key length <= 256 and derive from stable internal event key, not raw email or provider payload. If current SDK wrapper cannot pass headers cleanly, rely on D1 claim and document why.
  - [x] Add adapter tests for escaped content, safe text/html output, provider error result, no request ID/email/token/provider payload leakage, and optional idempotency key behavior if implemented.

- [x] Task 6: Compose email sending with reconciliation/status paths. (AC: 7-8)
  - [x] Update `PaymentReconciliationService` so paid confirmation continues to send/queue order confirmation once and terminal failed/expired/cancelled states can send one safe payment status email when policy says email is required.
  - [x] Trigger terminal email from server-owned state transitions or first terminal status read, guarded by email claim. Repeated `getPaymentReturnStatus`, webhook retry, stale pending release retry, and duplicate provider lookup must not duplicate sends.
  - [x] Do not send payment failure email for a still-active PayMongo Checkout Session unless JRW has reconciled terminal failed/expired/cancelled state or stale timeout policy released the reservation.
  - [x] Preserve `releaseTerminalPaymentInventory` and `releaseStalePendingReturnInventory` behavior from Story 5.6. Email failure cannot block inventory release retry or status response.
  - [x] Safe logs should use `createOperationalLogEvent` and existing scrubbers. Add action names such as `payment.status_email_failed` or `order.confirmation_email_failed` consistently.

- [x] Task 7: Expand payment-return API contract. (AC: 1-8)
  - [x] Update `PaymentReturnStatusResult` in `src/server/services/PaymentReconciliationService.ts`, controller response, `payment-return.routes.ts` TypeBox schema, and `src/features/cart-checkout/api.ts` client validator.
  - [x] Preserve existing fields for compatibility where reasonable: `status`, `payment`, `order`, `next`, `canRetry`.
  - [x] Add safe receipt fields behind `receipt` or expanded `order`: items, totals, labels, inbox reminder, guest account CTA eligibility/action, and maybe `emailStatus` as `SENT`/`FAILED`/`PENDING` without exposing recipient.
  - [x] Route remains public customer/guest-facing. Route metadata must still explain high-entropy server references, no brand membership, no raw email lookup, no provider payload, no card/contact PII.
  - [x] Response must stay `{ data, meta }` or `{ error }` with request ID.
  - [x] Add route tests for public metadata, response schema, no raw provider/PII, paid receipt fields, pending safe fields, failed/cancelled safe fields, and email status if exposed.

- [x] Task 8: Upgrade receipt UI in `cart-checkout`. (AC: 1-6, 9)
  - [x] Update `src/features/cart-checkout/components/PaymentReturnStatus.tsx` to render receipt as Direction 04 checkout receipt/status, not a sparse payment status page.
  - [x] Keep `CheckoutFlowShell` receipt step and current step history non-clickable.
  - [x] Main receipt body may show order facts, item list, payment/fulfillment status rows, inbox reassurance, and optional guest account CTA after success.
  - [x] Keep summary rail as primary next-action owner unless product explicitly requires CTA in body. If body CTA is added for guest account creation, it must not duplicate summary rail payment/retry action.
  - [x] Preserve previous one-shot cleanup: no bordered inner receipt card, compact receipt height, centered readable status body, and no duplicated `Continue shopping` in confirmed main body.
  - [x] Use `ButtonLink` for account CTA and next links, `Button` for refresh action, shared tokens, no custom SVG, no `IconButton`.
  - [x] Status badges/labels must include text and not rely on color alone.
  - [x] Add tests in `cart-ui.test.tsx` for paid receipt items/status/totals, inbox reassurance, guest CTA placement, pending copy, failed/expired/cancelled copy, summary action ownership, no provider internals, no inline duplicate payment actions, and centered/Direction 04 class contract.

- [x] Task 9: Add or update account CTA behavior. (AC: 3-4)
  - [x] Existing customer registration page lives at `/account/register` and currently starts with empty email/password fields.
  - [x] Minimum acceptable CTA: show post-success copy that says order updates were sent to checkout email and link `Create account` to `/account/register?returnTo=/account/orders` or another sanitized customer route, without raw email in URL.
  - [x] If prefill is implemented, add a signed short-lived receipt/account token or server-masked email context. Do not use `?email=` raw query.
  - [x] Account creation remains optional and post-order. Do not add sign-in, Google OAuth, or account creation prompt back to checkout details step.
  - [x] Add customer-account UI/API tests if registration route gains returnTo, prefill, or context-token behavior.

- [x] Task 10: Validation gates. (AC: 1-10)
  - [x] Domain tests:
    - `npx vitest run src/domain/payments/payment-reconciliation.test.ts src/domain/payments/payment-receipt.test.ts`
    - `npx vitest run src/domain/notifications/order-confirmation-email.test.ts src/domain/notifications/payment-status-email.test.ts` if new files exist.
  - [x] Repository/service/route tests:
    - `npx vitest run src/server/repositories/OrderConfirmationRepository.test.ts src/server/repositories/InventoryReleaseRepository.test.ts`
    - `npx vitest run src/server/services/PaymentReconciliationService.test.ts src/server/services/PaymentWebhookService.test.ts`
    - `npx vitest run src/server/routes/payment-return.routes.test.ts src/server/routes/payment-webhook.routes.test.ts`
  - [x] UI/email adapter tests:
    - `npx vitest run src/features/cart-checkout/components/cart-ui.test.tsx src/features/customer-account/customer-account-ui.test.tsx`
    - `npx vitest run src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.test.ts src/adapter/infrastructure/resend/email-template.test.ts`
    - Add and run `src/adapter/infrastructure/resend/OrderConfirmationEmailNotifier.test.ts` or payment-status notifier test if created.
  - [x] Schema/safety tests:
    - `npx vitest run src/domain/schema-invariants.test.ts src/adapter/infrastructure/logging/operational-log.test.ts`
  - [x] Run `npm run check`.
  - [x] Run `npm run build-development` if route/schema/Worker wiring changes.
  - [x] For UI completion, document responsive/manual QA at 320, 375, 768, 1024, and 1440 widths, or document blocker.

## Endpoint Guard Checklist

Complete for every new or changed endpoint/job. Mark non-applicable items as `N/A` with reason.

- [x] Route auth metadata declares public/optional/required auth, roles, and rate-limit class.
- [x] Route-level RBAC guard runs before validation or side effects for protected endpoints.
- [x] Service/controller enforces actor state before mutation: authenticated, active, verified, approved.
- [x] Brand-scoped reads or writes enforce active brand membership or elevated permission server-side.
- [x] Public/customer endpoints explicitly document why brand membership is not required.
- [x] Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable.
- [x] Error response uses safe envelope codes and does not leak provider/internal authorization details.
- [x] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes.

For this story:

- `/api/checkout/payment-return` remains public customer/guest-facing if changed. Brand membership is `N/A` because it returns only limited checkout payment/receipt state through server-owned high-entropy references.
- Public receipt response must not support raw email lookup and must not expose checkout email/contact/delivery fields, provider payload, checkout URL, card data, tokens, signatures, or secrets.
- PayMongo webhook route remains public only because `Paymongo-Signature` verification is provider auth boundary. If paid webhook triggers payment email/order confirmation email, signature verification and idempotency claim still happen before side effects.
- Any scheduled/manual email retry job must be internal, script/Cron, or protected admin/internal route. Do not add a public retry endpoint.
- Denial/safety tests should cover missing lookup, mismatched identifiers, raw email lookup denial, unknown payment, terminal payment retry, duplicate email claim, provider send failure, and no provider/PII leakage.

## Dev Notes

### Epic Context

- Epic 5 goal: guest or signed-in shoppers submit checkout, inventory is reserved, PayMongo Hosted Checkout runs through JRW single merchant account, payment state reconciles from server/provider truth, and safe updates reach the Shopper.
- Story 5.1 captured required checkout email/contact/delivery with nullable `customer_id`; guest checkout remains valid.
- Story 5.2 reserves inventory before payment and ties reservation to checkout attempt.
- Story 5.3 creates PayMongo Hosted Checkout V2 sessions, persists `checkout_payments` and frozen `checkout_payment_items`, and keeps frontend off PayMongo APIs.
- Story 5.4 verifies PayMongo webhooks, records idempotency, and supports `checkout_session.payment.paid`.
- Story 5.5 reconciles payment, creates idempotent order confirmation, snapshots items, and sends order confirmation email.
- Story 5.6 releases reserved inventory for failed/cancelled/expired/stale pending payment exactly once.
- Story 5.7 now owns rich receipt/status UI plus payment success/failure email behavior.

### Current Code Intelligence

#### READ/UPDATE: `src/features/cart-checkout/components/PaymentReturnStatus.tsx`

- Current state: renders `PaymentReturnStatusView` inside `CheckoutFlowShell` receipt step, with status copy for confirmed/pending/failed/expired/cancelled/refunded/unknown.
- Current state: confirmed view shows only order number and total. No item list, fulfillment label row, inbox reassurance, or guest account CTA.
- Current state: action ownership is mostly in summary rail through `summaryAction`; recent specs removed duplicate inline actions and centered receipt content.
- What this story changes: render full receipt/status body with items/totals/status labels, inbox reassurance, optional guest account CTA, and richer safe pending/terminal states.
- Preserve: checkout step shell, no false paid state, no provider internals, no duplicate inline payment actions, compact receipt spacing, shared `Button`/`ButtonLink`, and Direction 04 tokens.

#### READ/UPDATE: `src/features/cart-checkout/components/CheckoutFlow.tsx`

- Current state: `CheckoutFlowShell` defines `cart`, `details`, `payment`, and `receipt` steps, non-clickable receipt history, summary rail, and compact receipt min height.
- What this story changes: may need summary override/action support for receipt items/status/email CTA state.
- Preserve: `aria-current`, mobile details step behavior, no account prompt in checkout details, summary rail as one primary action owner, `Button` default behavior.

#### READ/UPDATE: `src/features/cart-checkout/api.ts`

- Current state: `PaymentReturnStatusResult` client type and validator only accept order ID/number/total plus payment/status/next flags.
- What this story changes: add safe receipt fields and validate shape before UI renders. Reject malformed successful-looking envelopes.
- Preserve: no frontend PayMongo calls, no browser mutation of payment/order, safe fallback copy.

#### READ/UPDATE: `src/pages/checkout/payment-return.astro`

- Current state: page passes `attemptId`, `paymentId`, and `providerCheckoutSessionId` query params into React island and uses `StorefrontLayout`.
- What this story changes: likely metadata/copy only unless new server-side receipt load is chosen.
- Preserve: PayMongo params remain lookup references only; page title/description stay receipt/status focused.

#### READ/UPDATE: `src/server/routes/payment-return.routes.ts`

- Current state: public `GET /api/checkout/payment-return` with TypeBox query/response schema, route metadata, optional PayMongo backend status provider, order confirmation email notifier, and inventory release repository.
- Current state: description already documents that terminal/timed-out pending payment may release reserved inventory and no brand membership is required.
- What this story changes: response schema expands for receipt fields and email status/CTA; may inject payment-status email notifier/repository.
- Preserve: standard envelope, request ID, public auth rationale, rate-limit class `checkout-payment`, no raw email lookup, no provider payload.

#### READ/UPDATE: `src/server/controllers/PaymentReconciliationController.ts`

- Current state: thin adapter from service `AppResult` to success/error envelope with request ID.
- What this story changes: probably type imports only if service result expands.
- Preserve: no business rules in controller.

#### READ/UPDATE: `src/server/services/PaymentReconciliationService.ts`

- Current state: confirms paid payments, creates/returns order confirmation, sends order confirmation email with claim/retry state, reads payment-return status, reconciles pending provider status, releases terminal/stale inventory, and logs safe provider/release/email failures.
- Current state: paid success email is currently named/order-confirmation email, not general payment status email.
- What this story changes: add receipt DTO composition and payment-status email trigger policy for paid/terminal statuses.
- Preserve: paid/order idempotency, terminal inventory release retry, provider fallback safety, public status not exposing release internals, logging never masking payment reconciliation.

#### READ/UPDATE: `src/server/repositories/OrderConfirmationRepository.ts`

- Current state: creates idempotent orders from `PAYMENT_PAID`, ensures snapshots, finds payment-return record, marks provider paid/terminal, claims/sends/marks order confirmation email, and builds safe order confirmation email payload.
- Current state: `getOrderConfirmationEmail` includes `toEmail`; this is not suitable as public receipt DTO unless email is removed/masked.
- What this story changes: add receipt read method and maybe payment-status email claim methods if not using separate repository.
- Preserve: multiple lookup matching, paid row priority, unique order constraints, item snapshot idempotency, no raw provider persistence.

#### READ/UPDATE: `src/domain/schema/transactions.ts`

- Current state: `orders` has checkout email/contact/delivery snapshot, payment/fulfillment statuses, centavos totals, and order confirmation email state.
- Current state: `checkout_payments` has provider checkout session ID/reference, status, amount, checkout URL, livemode, and timestamps. Checkout URL is sensitive and must not be logged/returned except payment handoff.
- Current state: `checkout_payment_items`, `checkout_reservation_releases`, `payment_webhook_events`, and `order_snapshots` exist.
- What this story changes: likely add payment-status email state to `checkout_payments` or a notification outbox. Add next migration after `0031_checkout_reservation_releases.sql`.
- Preserve: no raw provider payload/card/token/signature/secret/contact PII columns for new payment status email storage; new money stays integer centavos.

#### READ/UPDATE: `src/domain/payments/payment-reconciliation.ts`

- Current state: owns public payment return statuses, fulfillment status constants, and order confirmation email status constants.
- What this story changes: may add receipt label helpers or import from new `payment-receipt.ts`.
- Preserve: pure, provider-free, UI-free domain decisions.

#### READ/UPDATE: `src/domain/notifications/order-confirmation-email.ts`

- Current state: defines safe order confirmation email input with order number, item names, payment/fulfillment labels, status URL, total, and `toEmail`.
- What this story changes: add inbox reassurance/copy support or keep as paid-success payment status email policy.
- Preserve: provider-free type contract and no raw provider fields.

#### READ/UPDATE: `src/adapter/infrastructure/resend/OrderConfirmationEmailNotifier.ts`

- Current state: sends order confirmation email through `ResendEmailClient`, reuses email template helpers, formats item summary, and does not log provider details itself.
- What this story changes: update template copy and possibly add payment status notifier.
- Preserve: absolute status URL generation, escaped email template helpers, backend-only Resend API key.

#### READ/UPDATE: `src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.ts`

- Current state: contains reusable Resend config resolution, lazy client, safe provider logging patterns, and account email adapters.
- What this story changes: reuse config/logging patterns for payment-status email; do not duplicate config handling blindly.
- Preserve: no token/email/request ID leakage in provider payload/logs beyond intended recipient in email send call.

#### READ/UPDATE: `src/server/services/PaymentWebhookService.ts` and `src/server/repositories/PaymentWebhookRepository.ts`

- Current state: paid webhook marks payment paid and composes confirmation through reconciliation service; duplicate paid webhook can retry confirmation safely.
- What this story changes: paid webhook path may now indirectly satisfy paid-success payment status email through confirmation email.
- Preserve: signature verification and idempotency claim before side effects; unsupported events still ignored safely.

#### READ/UPDATE: `src/server/routes/payment-webhook.routes.ts`

- Current state: route description explicitly says it does not create rich receipt or send payment success/failure emails. After this story, description must be updated if paid-success order confirmation email or payment status email is in scope.
- Preserve: public signature-auth boundary and raw text parsing.

#### READ/UPDATE: `src/features/customer-account/CustomerRegisterPanel.tsx` and `src/features/customer-account/api.ts`

- Current state: `/account/register` creates a customer account from email/password and verification email. It does not prefill email from query params.
- What this story changes: may add sanitized `returnTo` support already present on panel/page, post-receipt CTA link, or signed/masked email context if accepted.
- Preserve: account creation remains optional, after receipt success, and never blocks checkout/receipt access.

#### READ/UPDATE: `src/adapter/infrastructure/logging/operational-log.ts` and `src/domain/audit/events.ts`

- Current state: scrubbers redact payment payloads/responses, card data, checkout URL, contact PII, secrets, tokens, signatures, raw bodies, stack traces, email, phone, and address; audit actions include payment/order/inventory events.
- What this story changes: add/reuse safe logging for payment status email failure/success if needed.
- Preserve: logging cannot mask checkout status response or provider webhook response.

### Previous Story Intelligence

- Story 5.6 review fixed terminal return refresh release retry, stale release audit/log visibility, and release failure logs with reservation/reason details. Do not regress inventory release side effects when adding email.
- Story 5.6 added idempotent `checkout_reservation_releases`; terminal failed/cancelled/expired/stale pending release now exists and must remain independent from email send success.
- Story 5.5 fixed duplicate webhook/page refresh hazards and paid row prioritization. Receipt expansion must preserve one order per payment/attempt/reservation.
- Story 5.5 order confirmation email already carries payment and fulfillment labels. Paid-success payment email should reuse or deliberately extend this instead of sending duplicate success emails.
- One-shot specs after Story 5.5 adjusted receipt return UI:
  - `_bmad-output/implementation-artifacts/spec-payment-return-checkout-receipt-step.md`
  - `_bmad-output/implementation-artifacts/spec-checkout-receipt-status-only-content.md`
  - `_bmad-output/implementation-artifacts/spec-checkout-receipt-spacing-cleanup.md`
  - `_bmad-output/implementation-artifacts/spec-checkout-receipt-centered-cleanup.md`
- Those specs removed generic standalone status feel, inline action duplication, an inner receipt card frame, and left-heavy layout. Preserve those corrections while adding richer receipt content.

### Git Intelligence Summary

- Recent commits:
  - `afe9543 chore: 5-6 reviewed`
  - `b783648 feat: 5-6 implemented`
  - `a8663f2 docs: 5-6 story is created`
  - `34c41cb fix: address story 5.5 review findings`
  - `527318f fix: remove inline receipt actions`
- Current recent work focused on payment inventory release, status return correctness, and receipt action ownership. Preserve that narrowness.

### Architecture Compliance

- Use Route -> Controller -> Service -> Domain/Repository layering.
- Domain receipt/email decisions must be testable without HTTP, D1, PayMongo, Resend, Astro, Elysia, or React.
- D1/Drizzle is source of truth for payment, order, receipt data, snapshots, and email idempotency state.
- Resend stays behind `src/adapter/infrastructure/resend/**`; provider config comes from runtime env.
- Public API responses use `{ data, meta }` or `{ error: { code, message, details? } }` with request ID where safe.
- Payment, fulfillment, return, refund, inventory, and order statuses stay separate.
- JRW is single seller of record. Brands are not stores, sellers, tenants, merchants, payout owners, or PayMongo accounts.
- Runtime code must be Cloudflare Workers-compatible. Do not add Node-only APIs in request path.

### Design Direction Fidelity

- Source: `_bmad-output/planning-artifacts/ux-design-directions.html#direction-04`.
- Direction 04 is "Precision Checkout": staged Cart, Details, Payment, Receipt; receipt rail shows items/subtotal/payment/fulfillment/return/refund labels; checkout remains calm, stage-based, and PayMongo handoff/receipt confirmation stays server-driven.
- Receipt/status UI must also follow `_bmad-output/planning-artifacts/ux-design-specification.md#OrderReceipt`: order number, items, totals, payment status, fulfillment status, next action, inbox reminder, optional account CTA after success.
- Use JRW Technical Brutalist tokens: 0px radius, 1px borders, no shadows, no blur, Satoshi headings, Space Mono/system labels, cobalt only for focus/primary/selected/live status.
- Button/ButtonLink hover/focus must use 2px cobalt outline with 2px offset.
- Status labels must include text; color alone is not enough.
- Required UI done evidence: component tests asserting visual contract classes, responsive/manual QA notes, or documented QA blocker. Type checks alone are not enough.

### Latest Technical Information

- PayMongo Hosted Checkout V2 remains the recommended new integration path. V2 defers Payment Intent creation until customer payment; save Checkout Session ID and use `checkout_session.payment.paid` webhook. Source: https://docs.paymongo.com/reference/create-a-checkout-v2
- PayMongo Hosted Checkout returns a `checkout_url` from backend-created sessions. `send_email_receipt: true` makes PayMongo send its own successful-payment email to billing/email input, but JRW should keep this false unless owner approves duplicate provider email risk. Source: https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- PayMongo Checkout Session can create multiple Payment Intents. Failed attempts can retry while Checkout Session remains the same, and active sessions do not expire automatically unless explicitly expired. Do not send failure email from a single failed attempt unless JRW has terminal local state or stale timeout policy. Source: https://docs.paymongo.com/docs/payment-channels-key-concepts
- PayMongo `checkout_session.payment.paid` webhook payload includes Checkout Session and resulting payment details, but current implementation intentionally processes only paid events and keeps raw payload out of persistence/logs. Source: https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- Resend Send Email API returns a message ID on success. It supports an `Idempotency-Key` header to prevent duplicate emails; keys expire after 24 hours and max length is 256. Use app-side D1 claim for durable idempotency. Source: https://resend.com/docs/api-reference/emails/send-email

### Testing Requirements

- Minimum targeted suites are listed in Task 10.
- Add migration/schema tests if payment email state or notification outbox is added.
- UI tests must assert no raw strings such as `PayMongo error`, `providerCheckoutSession`, `checkout_url`, raw email, phone, address, token, secret, or signature appear in rendered markup.
- Service tests must prove duplicate webhook, duplicate return refresh, and stale pending release retry do not duplicate payment status emails.
- Adapter tests must prove email templates escape user/product/order strings.
- Run `npm run check`. Run `npm run build-development` after route/schema/runtime wiring changes.

### Anti-Patterns To Avoid

- Do not trust PayMongo redirect params for paid/failed status.
- Do not return raw checkout email just to render guest CTA.
- Do not put raw email in `/account/register?email=...`.
- Do not send both order confirmation email and separate paid-success email unless product explicitly accepts duplicate customer email.
- Do not send failure email from non-terminal active PayMongo payment attempt.
- Do not let email failure roll back paid order confirmation, terminal payment status, or inventory release.
- Do not expose or log raw provider payloads, checkout URL, card data, signatures, tokens, secrets, email, phone, address, or stack traces.
- Do not combine payment status and fulfillment status.
- Do not move business logic into React, route handlers, or Resend adapter.
- Do not use legacy `src/api/**`.
- Do not add full order history/timeline scope from Epic 6.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 5.7`
- `_bmad-output/planning-artifacts/prd.md#Storefront & Customer Shopping`
- `_bmad-output/planning-artifacts/prd.md#Payments & Checkout`
- `_bmad-output/planning-artifacts/prd.md#Notifications`
- `_bmad-output/planning-artifacts/architecture.md#Data Flow`
- `_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries`
- `_bmad-output/planning-artifacts/ux-design-specification.md#CheckoutSteps`
- `_bmad-output/planning-artifacts/ux-design-specification.md#OrderReceipt`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-04`
- `docs/design-by-google-stitch.md`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/epic-5-context.md`
- `_bmad-output/implementation-artifacts/5-3-paymongo-payment-creation-and-handoff.md`
- `_bmad-output/implementation-artifacts/5-4-paymongo-webhook-verification-and-idempotency.md`
- `_bmad-output/implementation-artifacts/5-5-payment-reconciliation-and-order-confirmation.md`
- `_bmad-output/implementation-artifacts/5-6-release-reserved-inventory-after-failed-or-cancelled-payment.md`
- `_bmad-output/implementation-artifacts/spec-payment-return-checkout-receipt-step.md`
- `_bmad-output/implementation-artifacts/spec-checkout-receipt-status-only-content.md`
- `_bmad-output/implementation-artifacts/spec-checkout-receipt-spacing-cleanup.md`
- `_bmad-output/implementation-artifacts/spec-checkout-receipt-centered-cleanup.md`
- `src/domain/schema/transactions.ts`
- `src/domain/payments/payment-reconciliation.ts`
- `src/domain/notifications/order-confirmation-email.ts`
- `src/adapter/infrastructure/resend/OrderConfirmationEmailNotifier.ts`
- `src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.ts`
- `src/server/repositories/OrderConfirmationRepository.ts`
- `src/server/repositories/InventoryReleaseRepository.ts`
- `src/server/services/PaymentReconciliationService.ts`
- `src/server/services/PaymentWebhookService.ts`
- `src/server/routes/payment-return.routes.ts`
- `src/server/routes/payment-webhook.routes.ts`
- `src/server/controllers/PaymentReconciliationController.ts`
- `src/features/cart-checkout/api.ts`
- `src/features/cart-checkout/components/PaymentReturnStatus.tsx`
- `src/features/cart-checkout/components/CheckoutFlow.tsx`
- `src/pages/checkout/payment-return.astro`
- `src/features/customer-account/CustomerRegisterPanel.tsx`
- `src/features/customer-account/api.ts`
- `src/adapter/infrastructure/logging/operational-log.ts`
- `src/domain/audit/events.ts`
- https://docs.paymongo.com/reference/create-a-checkout-v2
- https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- https://docs.paymongo.com/docs/payment-channels-key-concepts
- https://resend.com/docs/api-reference/emails/send-email

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add pure receipt DTO and payment-status email domain helpers before wiring transport/UI.
- Extend `checkout_payments` with durable terminal payment email state through migration `0032`.
- Enrich payment-return repository/service/API response with safe receipt fields and terminal email idempotency.
- Upgrade receipt UI to show items, totals, payment/fulfillment labels, inbox reassurance, and optional post-success account CTA without raw email.
- Preserve paid-success email reuse through order confirmation email; send separate terminal payment email only for failed/expired/cancelled server-owned states.

### Debug Log References

- Red test run: `npx vitest run src/domain/payments/payment-receipt.test.ts src/domain/notifications/payment-status-email.test.ts src/adapter/infrastructure/resend/PaymentStatusEmailNotifier.test.ts src/server/repositories/OrderConfirmationRepository.test.ts src/server/services/PaymentReconciliationService.test.ts src/features/cart-checkout/components/cart-ui.test.tsx src/server/routes/payment-return.routes.test.ts src/domain/schema-invariants.test.ts` failed as expected before implementation.
- Targeted story tests passed: 16 files, 128 tests.
- `npm run check` passed with existing hints only.
- `npm run build-development` passed with existing hints only.
- Full regression `npx vitest run` passed: 131 files, 869 tests.
- UI token guard returned only existing brand slug/test guard matches.
- `npm run db:migrate:remote` applied remote development migrations `0030`, `0031`, and `0032`; production untouched.

### Completion Notes List

- Implemented safe public receipt DTO from server state only: order snapshots for confirmed orders and frozen payment items for pending/terminal payment states.
- Added receipt API/UI fields for items, totals, payment label, fulfillment label, inbox reassurance, and guest post-success `Create account` CTA without raw email query params.
- Added durable terminal payment-status email state on `checkout_payments`; paid success continues to reuse order confirmation email, while failed/expired/cancelled states send one safe terminal email through D1 claim state.
- Preserved Story 5.5/5.6 idempotency: order confirmation, inventory release, webhook retry, return refresh, and stale pending release retry do not depend on email success.
- Payment/order/inventory state does not roll back when email config/provider send fails; safe operational log uses request ID and payment ID only.
- Remote development D1 now includes `0032_checkout_payment_status_email.sql`; Wrangler also applied previously pending development migrations `0030` and `0031`.
- Responsive/manual viewport QA blocker: no seeded browser payment-return fixture exists for 320/375/768/1024/1440 live inspection. Component tests cover receipt markup/class contract and build/type gates passed.

### File List

- `_bmad-output/implementation-artifacts/5-7-checkout-receipt-payment-status-and-payment-emails.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `migrations/0032_checkout_payment_status_email.sql`
- `src/adapter/infrastructure/resend/OrderConfirmationEmailNotifier.ts`
- `src/adapter/infrastructure/resend/PaymentStatusEmailNotifier.test.ts`
- `src/adapter/infrastructure/resend/PaymentStatusEmailNotifier.ts`
- `src/domain/notifications/payment-status-email.test.ts`
- `src/domain/notifications/payment-status-email.ts`
- `src/domain/payments/payment-receipt.test.ts`
- `src/domain/payments/payment-receipt.ts`
- `src/domain/schema-invariants.test.ts`
- `src/domain/schema/transactions.ts`
- `src/features/cart-checkout/api.ts`
- `src/features/cart-checkout/components/CheckoutFlow.tsx`
- `src/features/cart-checkout/components/PaymentReturnStatus.tsx`
- `src/features/cart-checkout/components/cart-ui.test.tsx`
- `src/server/repositories/CheckoutRepository.test.ts`
- `src/server/repositories/OrderConfirmationRepository.test.ts`
- `src/server/repositories/OrderConfirmationRepository.ts`
- `src/server/routes/payment-return.routes.test.ts`
- `src/server/routes/payment-return.routes.ts`
- `src/server/routes/payment-webhook.routes.ts`
- `src/server/services/PaymentReconciliationService.test.ts`
- `src/server/services/PaymentReconciliationService.ts`

## Change Log

- 2026-07-07: Story created with rich receipt/status UI and payment status email scope; status set to ready-for-dev.
- 2026-07-07: Implemented rich receipt/status API, receipt UI, terminal payment-status email idempotency, migration, and tests; status set to review.
