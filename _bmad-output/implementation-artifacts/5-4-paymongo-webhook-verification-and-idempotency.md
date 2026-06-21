# Story 5.4: PayMongo Webhook Verification and Idempotency

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As JRW,
I want PayMongo webhooks verified and processed idempotently,
so that payment events cannot be spoofed or duplicated.

## Acceptance Criteria

1. Given a PayMongo webhook request has a missing, malformed, or invalid signature, when the webhook endpoint receives it, then the request is rejected before any idempotency record, payment mutation, order mutation, stock movement, email, or audit side effect occurs, and the response uses safe `WEBHOOK_INVALID_SIGNATURE` or documented safe envelope code.
2. Given a PayMongo webhook request has a valid signature, when the endpoint receives it, then the endpoint parses only the verified raw request body, extracts provider event ID/type/payload hash safely, records an idempotency key before mutation, and never trusts unsigned JSON.
3. Given a supported valid event is processed for an existing JRW PayMongo checkout payment, when processing succeeds, then the event record is marked processed and safe operational/audit context includes request ID, event ID, provider checkout session ID or PayMongo payment ID, JRW payment ID when available, event type, status, and no secrets, signatures, raw payload, checkout URL, card data, contact PII, or tokens.
4. Given a duplicate valid event payload matches a prior processed or ignored event, when PayMongo retries it, then the system returns a safe idempotent response and does not duplicate orders, payments, stock movements, emails, audit events, or logs beyond one safe duplicate/reuse log if needed.
5. Given a duplicate provider event ID conflicts with a different payload hash, when the webhook is processed, then the system returns/logs `IDEMPOTENCY_CONFLICT` or documented safe code, blocks all payment/order/inventory/email mutation, and records enough scrubbed context for investigation.
6. Given a valid webhook event type is unsupported or intentionally deferred to a later story, when the endpoint receives it, then the system records a safe ignored/unsupported state, does not mutate payment/order/inventory/email state, and still treats exact retries idempotently.
7. Given implementation finishes, when tests run, then tests cover valid signature, invalid/missing signature, no mutation before verification, supported event idempotency record, exact duplicate retry, conflicting duplicate payload, unsupported event, safe response envelopes, safe logging/audit scrubbing, and `npm run check`; blockers are documented if validation cannot pass.

## Tasks / Subtasks

- [ ] Task 1: Lock webhook scope and preserve checkout/payment boundaries. (AC: 1-7)
  - [ ] Re-read every UPDATE file listed in Current Code Intelligence before editing.
  - [ ] Implement PayMongo webhook verification and idempotency only. Do not implement final order confirmation, receipt page, payment emails, fulfillment transitions, refunds/returns, or long-running stale reservation release in this story.
  - [ ] Treat PayMongo webhooks as payment-event input, not as proof to create customer-visible order confirmation yet; Story 5.5 owns reconciliation/order confirmation and Story 5.7 owns receipt/status emails.
  - [ ] Preserve guest checkout and existing PayMongo handoff from Story 5.3.
  - [ ] Keep all mutation server-side and idempotent.

- [ ] Task 2: Add webhook domain rules. (AC: 1-6)
  - [ ] Create domain helpers under `src/domain/payments/**`, recommended `paymongo-webhook.ts`, for raw-body signature verification input validation, event ID/type extraction, payload hashing, duplicate/idempotency decision, and supported/unsupported event decisions.
  - [ ] Signature verification must use the exact raw request body bytes/string, not a re-serialized object. Do not verify after `JSON.stringify(parsedBody)`.
  - [ ] Verification must require the configured PayMongo webhook secret. Missing runtime secret maps to `PROVIDER_UNAVAILABLE` or documented safe server config code without mutation.
  - [ ] Use Workers-compatible Web Crypto APIs for HMAC/signature comparison unless project evidence proves another compatible approach. Use constant-time comparison semantics for digests/signatures.
  - [ ] Normalize supported event types explicitly. Minimum supported processing target should include PayMongo Hosted Checkout paid event used by current handoff flow; unsupported events must be persisted as ignored, not silently dropped.
  - [ ] Produce stable payload hash from the exact verified raw body or canonical verified payload, and use it to detect conflicting duplicate event IDs.

- [ ] Task 3: Add webhook persistence and migration. (AC: 2-6)
  - [ ] Add next migration after `0027_checkout_paymongo_payments.sql`; do not edit old migrations.
  - [ ] Add Drizzle schema table such as `payment_webhook_events` or `paymongo_webhook_events` with at least:
    - `id`
    - `provider` default `PAYMONGO`
    - `provider_event_id` unique
    - `event_type`
    - `payload_hash`
    - `processing_status` such as `RECEIVED`, `PROCESSED`, `IGNORED`, `CONFLICT`, `FAILED`
    - `related_payment_id` nullable FK to `checkout_payments`
    - provider safe references such as checkout session ID/payment intent/payment ID when available
    - `first_request_id`, `last_request_id`
    - `received_at`, `processed_at`, `created_at`, `updated_at`
  - [ ] Do not store raw webhook payload, raw signature, headers, authorization values, checkout URL, card data, checkout email, phone, address, attempt token, or provider secret.
  - [ ] Add indexes for provider event ID, event type, processing status, related payment ID, and created time.
  - [ ] Add schema invariant tests proving webhook table does not contain raw payload/signature/header/token/card/contact PII columns.

- [ ] Task 4: Add repository methods for atomic idempotency. (AC: 2-6)
  - [ ] Extend `CheckoutRepository` or add a payment repository that can claim/record webhook events before side effects.
  - [ ] The first valid event with a new provider event ID records the event before any payment/order/inventory/email mutation.
  - [ ] Exact duplicate with same payload hash returns existing safe idempotent result and does not re-run side effects.
  - [ ] Same provider event ID with different payload hash marks/returns conflict and blocks mutation.
  - [ ] Unsupported event types should record `IGNORED` idempotently.
  - [ ] If using D1 fallback without explicit transaction support, design guarded updates/unique constraints so duplicates and conflicts stay safe under concurrent webhook retries.

- [ ] Task 5: Add webhook service/controller/route. (AC: 1-7)
  - [ ] Add a public unauthenticated webhook route under the API prefix, recommended `POST /api/payments/paymongo/webhooks` or a similarly explicit PayMongo payment route.
  - [ ] Register the route in `src/server/routes/index.ts` and wire `createApp` route options/loggers consistently with other route groups.
  - [ ] Route must use the raw `Request` body for signature verification before validation/parsing side effects. If Elysia body parsing would consume or transform the body, handle the route with `request.text()`/raw body and avoid using parsed `body` for verification.
  - [ ] Route metadata must declare public auth, rate-limit class such as `payment-webhook`, tags, safe error codes, and why no customer/admin/brand auth applies: provider signature is the auth boundary.
  - [ ] Controller returns a standard safe envelope or documented provider-compatible response. Do not expose provider payload, signature details, or internal verification failures.
  - [ ] Add `.env.example`, Worker runtime docs/types if needed for `PAYMONGO_WEBHOOK_SECRET`. Never commit secret values.

- [ ] Task 6: Process supported events without finalizing future-story state. (AC: 3-6)
  - [ ] Link event to `checkout_payments` using provider checkout session ID, provider payment ID, metadata references, or other safe provider reference from the verified payload.
  - [ ] For the paid checkout-session event, update only payment state that is safe for this story, such as moving `checkout_payments.status` from `PAYMENT_PENDING` to `PAYMENT_PAID`, if and only if the event maps unambiguously to one existing payment.
  - [ ] Do not create orders, send payment/receipt emails, release stock for failed/cancelled payment, or mark fulfillment state. Those belong to Stories 5.5, 5.6, and 5.7.
  - [ ] Unsupported, failed, cancelled, expired, refund-related, or ambiguous events are recorded/ignored safely unless the story explicitly implements a narrow payment status transition with tests.
  - [ ] Invalid state transitions must reject or mark failed with safe code; never downgrade a paid payment to pending or duplicate mutation.

- [ ] Task 7: Add safe logging and audit events. (AC: 1, 3-7)
  - [ ] Reuse `createOperationalLogEvent`, `scrubLogDetails`, `createAuditEvent`, and existing scrubbers. Do not invent ad hoc logger shapes.
  - [ ] Use existing audit action types `payment.webhook_processed` and `payment.webhook_rejected` from `src/domain/audit/events.ts`.
  - [ ] Safe operational/audit details may include request ID, provider event ID, event type, payload hash prefix, provider checkout session ID/payment ID, JRW payment ID, status, and idempotency decision.
  - [ ] Never log PayMongo webhook secret, raw signature/header, raw payload, raw provider response, checkout URL, checkout email, phone, address, card data, attempt token, OAuth/session/JWT tokens, or stack traces.
  - [ ] Add redaction tests for webhook-specific keys (`signature`, `webhookSecret`, `rawPayload`, `rawBody`, provider payload, checkout URL, contact PII).

- [ ] Task 8: Add tests and QA gates. (AC: 1-7)
  - [ ] Domain tests for signature verification success/failure, raw-body dependency, payload hash, supported/unsupported event decisions, duplicate same-hash event, conflicting duplicate hash, and idempotency decision.
  - [ ] Repository/D1 tests for event claim, duplicate exact retry, conflict update, ignored unsupported event, no raw payload/schema invariant, and payment status update guarded by existing payment.
  - [ ] Service tests for invalid signature no mutation, missing secret no mutation, valid paid event success, duplicate retry no duplicate side effects, conflicting duplicate blocked, unsupported event ignored, ambiguous/unmatched payment safe handling.
  - [ ] Route tests for public auth metadata, rate-limit class, raw request body verification, invalid signature response, valid event envelope, no mutation before verification, safe error details, and request ID.
  - [ ] Audit/logging tests for processed/rejected webhook events and scrubbed sensitive fields.
  - [ ] Minimum commands:
    - `npx vitest run src/domain/payments/paymongo-webhook.test.ts src/domain/payments/paymongo-checkout.test.ts`
    - `npx vitest run src/server/repositories/CheckoutRepository.test.ts src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts src/domain/schema-invariants.test.ts`
    - `npx vitest run src/adapter/infrastructure/logging/operational-log.test.ts src/domain/audit/events.test.ts`
    - `npm run check`
  - [ ] Run `npm run build-test` if route registration, schema, Worker env types, or migration/schema changes are broad.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [ ] Route auth metadata declares public/optional/required auth, roles, and rate-limit class.
- [ ] Route-level RBAC guard runs before validation or side effects for protected endpoints.
- [ ] Service/controller enforces actor state before mutation: authenticated, active, verified, approved.
- [ ] Brand-scoped reads or writes enforce active brand membership or elevated permission server-side.
- [ ] Public/customer endpoints explicitly document why brand membership is not required.
- [ ] Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable.
- [ ] Error response uses safe envelope codes and does not leak provider/internal authorization details.
- [ ] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes.

For this story, expected checklist interpretation:

- Webhook route is public/unauthed because PayMongo signature is the provider-auth boundary; document this explicitly in route metadata.
- RBAC/customer/admin actor checks are `N/A` for the webhook endpoint, but signature verification must happen before validation/parsing side effects and before any mutation.
- Brand membership is `N/A`; payments are JRW seller-of-record checkout payments, not brand-scoped admin operations.
- Denial tests should focus on invalid/missing signature, missing secret, duplicate conflict, unsupported event, malformed payload, and no mutation before verification.

## Dev Notes

### Epic Context

- Epic 5 goal: checkout remains guest-or-customer capable, inventory-safe, PayMongo-backed, and payment truth is server-reconciled.
- Story 5.3 is done and creates PayMongo Hosted Checkout sessions with `checkout_payments` and `checkout_payment_items` persistence.
- Story 5.4 owns webhook verification/idempotency only.
- Story 5.5 owns payment reconciliation and order confirmation. Do not create order confirmation here.
- Story 5.6 owns release reserved inventory after failed/cancelled/stale payment. Do not implement broad release logic here.
- Story 5.7 owns receipt/status UI and payment emails. Do not send emails here.

### Current Code Intelligence

#### READ/UPDATE: `src/domain/schema/transactions.ts`

- Current state: `checkout_payments` stores `provider_checkout_session_id`, `provider_reference_number`, status, amount centavos, currency, checkout URL, and livemode. Payment statuses already include `PAYMENT_PENDING`, `PAYMENT_FAILED`, `PAYMENT_PAID`, `PAYMENT_EXPIRED`, `PAYMENT_CANCELLED`, `PAYMENT_REFUNDED`, and `UNKNOWN` in domain types.
- This story likely adds a webhook event table and possibly expands persisted status handling. Keep payment state separate from orders/fulfillment.
- Preserve no raw provider payload/card/token/PII fields in payment schema.

#### READ/UPDATE: `src/domain/payments/paymongo-checkout.ts`

- Current state: payment handoff domain helpers build Hosted Checkout payloads, validate trusted PayMongo checkout URL, normalize payment methods, build return URLs, and decide payment creation/reuse/conflict.
- This story should add webhook-specific helpers in a separate file, not overload checkout-session creation logic.
- Preserve integer centavos, server-owned metadata, trusted URL checks, and existing payment creation decisions.

#### READ/UPDATE: `src/lib/paymongo/PayMongoClient.ts`

- Current state: Workers-compatible `fetch` wrapper creates Hosted Checkout sessions via backend Basic auth and validates response shape/PayMongo checkout URL.
- This story may add `src/lib/paymongo/PayMongoWebhook.ts` or pure verifier helper. Keep provider HTTP client separate from webhook verifier if it does not call PayMongo.
- Preserve Worker-safe Web APIs and no Node-only request-path assumptions.

#### READ/UPDATE: `src/server/repositories/CheckoutRepository.ts`

- Current state: repository owns checkout attempt, reservation, payment persistence, guarded payment creation, pending-payment reuse, and payment-failure release guard.
- This story should add webhook event claim/query/update methods, and narrow payment status update methods guarded by provider references and current status.
- Preserve D1-safe idempotency through unique constraints, guarded updates, and batch/transaction fallback strategy.

#### READ/UPDATE: `src/server/services/CheckoutService.ts`

- Current state: checkout service validates cart, saves details, reserves inventory, creates PayMongo payments, logs/audits checkout_created/reused events, and delegates payment creation through the Inventory Durable Object when configured.
- Decide whether webhook processing belongs in `CheckoutService` or a new `PaymentWebhookService`; prefer a dedicated service if it avoids bloating checkout user-flow service.
- Preserve service result pattern: `AppResult<T>`, `GeneralError`, safe codes, logger/audit injection, and no browser/provider internals in responses.

#### READ/UPDATE: `src/server/controllers/CheckoutController.ts`

- Current state: controller adapts checkout service calls to `{ data, meta }`/safe error envelopes.
- If webhook route is added outside checkout routes, create a dedicated payment/webhook controller; if added to checkout controller, keep method isolated and raw-body aware.

#### READ/UPDATE: `src/server/routes/checkout.routes.ts` and `src/server/routes/index.ts`

- Current state: checkout routes expose cart validation, details, reservation, and payment creation with optional customer/guest auth.
- Webhook route should be explicit and public. It may be better as `payments.routes.ts` to avoid mixing provider callbacks with shopper checkout endpoints.
- Register new route group in `src/server/routes/index.ts` and options in `src/server/app.ts` if using a new route group.

#### READ/UPDATE: `src/server/app.ts`

- Current state: centralizes route options and operational logger injection for checkout/customer/google OAuth/etc.
- If adding `payments`/`paymentWebhooks` route group, wire operational logger here so runtime uses console logger rather than silent no-op.

#### READ/UPDATE: `src/cloudflare/durable-objects/InventoryDurableObject.ts`

- Current state: serializes reservation and payment creation paths for inventory-sensitive checkout; payment creation uses `CheckoutPaymentAttemptCoordinator` per attempt.
- Webhook processing should not blindly run through the inventory DO unless it mutates reservation/inventory state. Since Story 5.4 only verifies/idempotency and may mark payment paid, D1 uniqueness/guarded updates may be sufficient. If webhook updates inventory/order later, defer that to 5.5/5.6.
- Do not add webhook route to DO unless a concrete race requires it and tests prove no double mutation.

#### READ/UPDATE: `src/domain/audit/events.ts` and `src/adapter/infrastructure/logging/operational-log.ts`

- Current state: audit action types already include `payment.webhook_processed` and `payment.webhook_rejected`; scrubbers redact signatures, sessions, emails, PayMongo/raw provider payloads, card data, phone, address, secrets, tokens, and stack values. Provider checkout session ID is explicitly allowed.
- Reuse these existing actions and scrubbers. Add tests for webhook-specific sensitive keys.

#### READ/UPDATE: `src/lib/api/response.ts` and `src/utils/general/error.ts`

- Current state: standard response envelope and safe detail scrubber exist. PRD canonical codes include `WEBHOOK_INVALID_SIGNATURE` and `IDEMPOTENCY_CONFLICT`.
- Verify `WEBHOOK_INVALID_SIGNATURE` is currently in `ERROR_CODE`; if missing, add it with public safe message mapping in `src/lib/api/errors.ts` and tests.

#### CREATE/UPDATE: `.env.example`, `wrangler.jsonc`, `worker-configuration.d.ts`

- Add `PAYMONGO_WEBHOOK_SECRET` documentation/binding if route verifies provider signatures at runtime.
- Do not commit actual webhook secret. If `Env` type changes, run `npm run wrangler-types` or document blocker.

### Previous Story Intelligence

- Story 5.3 added server-owned PayMongo Hosted Checkout creation through `POST /api/checkout/attempts/:attemptId/payments`, `checkout_payments`, `checkout_payment_items`, DO payment coordination, trusted checkout URL validation, safe logging/audit, and immediate frontend redirect to PayMongo.
- Story 5.3 review fixed multiple payment duplication hazards. Do not regress:
  - all UI payment creation must go through canonical JRW backend endpoint;
  - payment creation race must stay idempotent;
  - existing pending payment must be reused;
  - payment failure release must not undo `PAYMENT_CREATED` or a pending payment;
  - provider checkout URL must remain trusted before redirect/persistence;
  - raw provider payloads, checkout URL, contact PII, tokens, card data, and secrets must stay scrubbed.
- Story 5.3 intentionally left webhooks, reconciliation, order confirmation, failed/cancelled payment release, receipt UI, and payment emails to later stories. Keep this story narrow.
- Story 5.2 added active reservation and concurrency safeguards. Do not let webhook handling release stock or mutate inventory without explicit Story 5.6 scope.
- Story 5.1 established guest checkout. Webhook processing must not require customer auth or customer account state.

### Architecture Compliance

- Use Route -> Controller -> Service -> Domain/Repository layering.
- Domain rules must be testable without HTTP, D1, PayMongo, Astro, Elysia, or React.
- D1/Drizzle persists idempotency and payment status; provider verification logic must not live in React/UI.
- Public API responses use standard envelopes and request IDs unless PayMongo requires a specific non-envelope response. If response shape differs for provider compatibility, document it in route tests and metadata.
- Security boundary for webhook is provider signature verification plus webhook secret, not customer/admin cookies.
- Reject invalid signatures before validation/parsing side effects and before mutation.
- Payment state remains separate from fulfillment/order state.
- Money remains integer centavos; no floats for new payment/order structures.
- JRW remains single seller of record; brands are not PayMongo merchants/stores/payout owners.

### Design Direction Fidelity

- This is primarily backend/API work and should not change storefront UI.
- If any checkout status copy is touched, cite `_bmad-output/planning-artifacts/ux-design-directions.html#direction-04` and preserve staged Cart/Details/Payment/Receipt layout.
- Do not change accepted checkout layout, header, footer, cart, account, or product UI as part of this story.

### Project Structure Notes

- New domain helpers: `src/domain/payments/paymongo-webhook.ts` and tests beside it.
- New provider verifier helper if needed: `src/lib/paymongo/PayMongoWebhookVerifier.ts` or keep pure verifier in domain if no provider runtime dependency.
- New route group preferred: `src/server/routes/payments.routes.ts` or `src/server/routes/paymongo-webhook.routes.ts`, registered from `src/server/routes/index.ts` and wired in `src/server/app.ts`.
- Repository additions should extend `src/server/repositories/CheckoutRepository.ts` only if webhook events are payment-adjacent; otherwise create a dedicated repository with the same `createDb` pattern.
- Migration should be `migrations/0028_*.sql` plus Drizzle schema update.

### Anti-Patterns To Avoid

- Do not verify signatures against parsed or re-stringified JSON.
- Do not store raw webhook payloads or raw signatures.
- Do not mutate payment/order/inventory/email before signature verification and idempotency claim.
- Do not create orders, receipts, or emails in this story.
- Do not release reservations or stock for failed/cancelled events in this story unless the acceptance criteria are explicitly expanded; Story 5.6 owns release behavior.
- Do not trust redirect query params or browser state as payment truth.
- Do not create a provider-specific response that leaks verification details.
- Do not add frontend PayMongo logic.
- Do not introduce Node-only APIs in Worker request path.
- Do not use Admin/Customer cookies as webhook auth.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 5.4`
- `_bmad-output/planning-artifacts/epics.md#FR42`
- `_bmad-output/planning-artifacts/epics.md#FR43`
- `_bmad-output/planning-artifacts/epics.md#FR44`
- `_bmad-output/planning-artifacts/epics.md#NFR13`
- `_bmad-output/planning-artifacts/epics.md#NFR19`
- `_bmad-output/planning-artifacts/prd.md#Payments & Checkout`
- `_bmad-output/planning-artifacts/prd.md#Integration Requirements`
- `_bmad-output/planning-artifacts/prd.md#Reliability & Data Integrity`
- `_bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions`
- `_bmad-output/implementation-artifacts/epic-5-context.md`
- `_bmad-output/implementation-artifacts/5-3-paymongo-payment-creation-and-handoff.md`
- `src/domain/schema/transactions.ts`
- `src/domain/payments/paymongo-checkout.ts`
- `src/lib/paymongo/PayMongoClient.ts`
- `src/server/repositories/CheckoutRepository.ts`
- `src/server/services/CheckoutService.ts`
- `src/server/routes/checkout.routes.ts`
- `src/server/routes/index.ts`
- `src/server/app.ts`
- `src/domain/audit/events.ts`
- `src/adapter/infrastructure/logging/operational-log.ts`
- `src/lib/api/response.ts`

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-06-21: Story created with backend webhook verification/idempotency scope and ready-for-dev status.
