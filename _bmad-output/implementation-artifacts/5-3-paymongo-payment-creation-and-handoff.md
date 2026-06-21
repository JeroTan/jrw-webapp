# Story 5.3: PayMongo Payment Creation and Handoff

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Shopper,
I want to pay through PayMongo under JRW seller account,
so that payment is handled by a provider while JRW never collects raw card details.

## Acceptance Criteria

1. Given checkout attempt has valid checkout details and active inventory reservation, when payment creation is requested, then JRW creates a PayMongo Hosted Checkout Session through backend-only secret-key auth, using the single JRW PayMongo merchant account, and JRW never collects raw card details.
2. Given payment request is built, when provider payload is created, then amount uses integer centavos, currency is `PHP`, line item names/amounts/quantities match the active server reservation and validated cart summary, and checkout attempt/reservation references are included in `reference_number` and string-only metadata for later reconciliation.
3. Given PayMongo returns checkout session data, when response returns, then API returns standard `{ data, meta }` envelope with safe handoff URL, checkout attempt ID, reservation ID, JRW payment record ID, provider checkout session ID, amount, currency, status `PAYMENT_PENDING`, and request ID; response does not expose raw provider payload, secret key, client key unless explicitly needed, card data, or provider internals.
4. Given shopper can proceed to payment, when UI receives safe handoff URL, then browser moves to PayMongo-hosted checkout or presents one explicit "Pay with PayMongo" action; no card number, CVV, card token, or provider form is rendered by JRW.
5. Given provider fails, times out, rejects request, or runtime env lacks required PayMongo config, when payment creation fails, then response maps to `PROVIDER_UNAVAILABLE`, `PAYMENT_FAILED`, or documented safe code, active reservation is released immediately or a durable release-required state is persisted, and shopper sees retry-safe checkout copy without raw PayMongo errors.
6. Given payment creation is retried for same checkout attempt and same active reservation, when a pending PayMongo checkout session already exists, then endpoint returns the existing safe handoff data and does not create duplicate provider sessions, duplicate payment records, duplicate inventory movements, or duplicate logs.
7. Given reservation expired, was released, belongs to another shopper, or attempt status is not payment-eligible, when payment creation is requested, then provider is not called and response returns `CONFLICT_STATE`, `AUTH_FORBIDDEN`, or `RESOURCE_NOT_FOUND` as appropriate.
8. Given payment creation succeeds, when audit/log hooks run, then safe request ID, attempt ID, reservation ID, amount, payment record ID, and provider checkout session ID are recorded; secrets, raw provider payloads, checkout URL, checkout email, phone, address, card data, and tokens are scrubbed.
9. Given implementation finishes, when tests run, then tests cover success, centavos amount, line item construction, JRW merchant account boundary, backend-only secret use, provider failure, immediate or persisted reservation release, idempotent retry, expired/wrong attempt denial, no raw card collection, safe logging, and `npm run check`; blockers are documented if validation cannot pass.

## Tasks / Subtasks

- [x] Task 1: Lock scope and reuse current checkout stack. (AC: 1-9)
  - [x] Re-read every UPDATE file listed in Current Code Intelligence before editing. Worktree may change; preserve owner edits.
  - [x] Extend current Route -> Controller -> Service -> Domain/Repository checkout stack. Do not create a parallel checkout/payment pipeline under legacy `src/api/**`.
  - [x] Recommended endpoint: `POST /api/checkout/attempts/:attemptId/payments`. Body should accept only `attemptToken` for guest attempt authorization; server loads reservation, contact snapshot, amount, line items, and return URLs.
  - [x] Keep `POST /api/checkout/details` and `POST /api/checkout/attempts/:attemptId/reservations` backward compatible.
  - [x] Do not implement PayMongo webhooks, payment reconciliation, order creation, order confirmation emails, payment success/failure emails, fulfillment transitions, return/refund behavior, or guest order status lookup in this story.
  - [x] Preserve guest checkout. Signed-in Customer attempt is authorized by server Customer actor; guest attempt is authorized by opaque attempt token.

- [x] Task 2: Add payment domain contract and state transitions. (AC: 1-3, 5-7)
  - [x] Add pure payment handoff rules under `src/domain/payments/**` or `src/domain/checkout/**` if tighter with checkout. Recommended file: `src/domain/payments/paymongo-checkout.ts`.
  - [x] Define payment creation statuses separately from fulfillment/order state: minimum `PAYMENT_PENDING`, `PAYMENT_FAILED`; reserve `PAYMENT_PAID`, `PAYMENT_CANCELLED`, `PAYMENT_REFUNDED` for later stories.
  - [x] Extend checkout attempt statuses only for checkout phase, not payment truth. Minimum accepted: `PAYMENT_CREATED`; optional failure/release phase such as `PAYMENT_CREATION_FAILED` if used by release logic.
  - [x] Payment-eligible attempt must have status `INVENTORY_RESERVED` or already have same pending payment; reservation must be `ACTIVE`, not expired, and match `checkout_attempts.reservation_id`.
  - [x] Build provider line items from server reservation records and current product/variant names, but amount and quantity must come from reservation/payment source of truth. If catalog names are unavailable, use safe fallback names without failing amount integrity.
  - [x] Do not accept amount, currency, line items, customer ID, checkout email, reservation status, payment status, provider ID, provider payload, success URL, or cancel URL from browser body.

- [x] Task 3: Add payment persistence and migration. (AC: 2, 3, 5-8)
  - [x] Add Drizzle schema and next migration after `0026_checkout_active_reservation_attempt_unique.sql`. Do not edit old migrations unless project policy changes.
  - [x] Recommended table: `checkout_payments` or `payments` if using broader future order linkage. Required fields:
    - `id`, `checkout_attempt_id`, `reservation_id`
    - `provider` default `PAYMONGO`
    - `provider_checkout_session_id` unique
    - `provider_reference_number` unique
    - `status` default `PAYMENT_PENDING`
    - `amount_centavos`, `currency` default `PHP`
    - `checkout_url` only if needed for idempotent retry; treat as sensitive and never log
    - `livemode`
    - `created_request_id`, `updated_request_id`, `created_at`, `updated_at`
  - [x] Optional table `checkout_payment_items`: `payment_id`, `product_id`, `variant_id`, `name`, `amount_centavos`, `currency`, `quantity`. Use this if line item summary must be frozen for reconciliation/support.
  - [x] Add indexes for attempt, reservation, provider session ID, status, and created time. Enforce one active/pending payment per checkout attempt/reservation.
  - [x] Update schema invariant tests so payment records reject raw provider payload fields, card fields, token fields, signatures, secret keys, and customer PII columns beyond provider IDs and safe status metadata.

- [x] Task 4: Build Workers-compatible PayMongo client. (AC: 1-5, 8)
  - [x] Add `src/lib/paymongo/PayMongoClient.ts` or equivalent wrapper that uses global `fetch` against `https://api.paymongo.com/v2/checkout_sessions`.
  - [x] Use backend-only Basic auth with `PAYMONGO_SECRET_KEY` as username and empty password. In Workers request path, prefer Web APIs such as `btoa(`${secretKey}:`)`; do not depend on Node `Buffer` unless tests prove compatibility.
  - [x] Read PayMongo config from Worker runtime env: `PAYMONGO_SECRET_KEY`; optional server-side config for payment methods such as `PAYMONGO_PAYMENT_METHODS`. Keep `PAYMONGO_PUBLIC_KEY` out of this Hosted Checkout server flow unless a later story needs it.
  - [x] Update `.env.example`, `wrangler.jsonc` env vars or secrets docs, and regenerate `worker-configuration.d.ts` with `npm run wrangler-types` if runtime `Env` needs PayMongo fields.
  - [x] Default payment method list must be server-owned. Recommended MVP list: configured methods from env, else reviewed constant such as `["card", "gcash", "qrph"]` only if account supports them.
  - [x] Set `send_email_receipt` deliberately. Recommended default is `false` because Story 5.7 owns JRW payment email copy. If set true, document duplicate-email risk and use checkout email safely.
  - [x] Never call PayMongo from frontend. Never expose secret key, Authorization header, raw request JSON, raw response JSON, or provider errors to browser.

- [x] Task 5: Implement service/repository payment creation use case. (AC: 1-8)
  - [x] Add repository methods to load checkout attempt, active reservation with items, existing pending payment, and safe product/variant display names.
  - [x] Add repository method to create payment record and transition attempt to `PAYMENT_CREATED` only after provider checkout session is successfully created and required provider IDs are parsed.
  - [x] Service order: authorize attempt -> load active reservation -> reject expired/released/conflicting states -> return existing same payment if present -> build provider payload -> call PayMongo client -> validate response shape -> persist payment -> return safe handoff.
  - [x] Use `reference_number` like `JRW-{attemptId or paymentId}` within PayMongo length/format constraints. Include string-only metadata such as `checkout_attempt_id`, `reservation_id`, `payment_id` when available. Do not include checkout email, phone, address, token, or raw cart JSON in metadata.
  - [x] Build `success_url` and `cancel_url` server-side from `APP_BASE_URL`/`PUBLIC_APP_BASE_URL` or request origin fallback. Do not trust browser-return URLs or allow open redirects.
  - [x] On provider failure before payment record exists, release active reservation immediately by restoring stock and marking reservation `RELEASED`, or persist a durable release-required state with tests. Minimum accepted path is immediate release.
  - [x] On provider success but DB persistence failure, persist/emit safe operational failure and do not claim payment handoff success. If provider session exists without DB record, return safe `PROVIDER_UNAVAILABLE` and record enough scrubbed context for manual reconciliation.
  - [x] Map provider 400 to `PAYMENT_FAILED` or `VALIDATION_FAILED` only if safe and not leaking provider detail; provider 401/403/5xx/network timeout map to `PROVIDER_UNAVAILABLE`.

- [x] Task 6: Add route/controller/API/UI handoff. (AC: 3, 4, 7)
  - [x] Add TypeBox params/body/response schemas, OpenAPI metadata, optional auth roles `PROSPECT`/`CUSTOMER`, rate-limit class `checkout-payment`, and error codes for payment creation endpoint.
  - [x] Controller must return standard envelope with request ID, using existing `apiSuccessWithRequestId` and `apiErrorWithRequestId`.
  - [x] Add client helper in `src/features/cart-checkout/api.ts` to create PayMongo payment after reservation success. Validate response shape before redirect.
  - [x] Update `CheckoutDetailsPage.tsx`: after details save, cart validation, and reservation success, call payment creation and then redirect to `checkoutUrl` or render one explicit retry-safe handoff button. Do not leave user at disabled "Payment ready" dead end.
  - [x] Update `CheckoutFlow.tsx` copy/state if needed: Payment step should show pending handoff, provider redirect, provider unavailable, and retry states with Direction 04 style.
  - [x] Browser redirect should use `window.location.assign(checkoutUrl)` only after URL is parsed and host is PayMongo-controlled, or after server response marks it trusted.
  - [x] Do not render PayMongo iframe/card fields or collect card data.

- [x] Task 7: Add safe logging/audit hooks. (AC: 5, 8)
  - [x] Reuse `createOperationalLogEvent`/`scrubLogDetails` and audit event helpers; do not invent ad hoc logging.
  - [x] Publish or prepare `payment.checkout_created` audit event with safe actor, target `payment`, and safe details only.
  - [x] Operational logs may include request ID, attempt ID, reservation ID, payment ID, amount centavos, currency, provider checkout session ID, and safe status.
  - [x] Logs/audits must not include PayMongo secret/public keys, Authorization header, checkout URL, checkout email, phone, address, raw provider request/response, provider error body, card data, or attempt token.
  - [x] Add tests proving scrubbers redact PayMongo secrets, checkout URL/provider response keys, raw payment payloads, card values, checkout email, phone, and address.

- [x] Task 8: Add tests and QA gates. (AC: 1-9)
  - [x] Domain tests for payment eligibility, expired reservation rejection, centavos line item build, metadata string-only shape, safe return URL generation, and duplicate same-attempt payment decision.
  - [x] PayMongo client tests with mocked fetch for success, missing checkout URL, 400, 401, timeout/network failure, and no secret leakage in errors.
  - [x] Repository/D1 tests for payment table insert, active-payment uniqueness, attempt transition to `PAYMENT_CREATED`, idempotent pending payment reuse, reservation release after provider failure, and schema invariant protections.
  - [x] Service tests for guest token success, signed-in Customer success, wrong Customer denial, missing/invalid guest token denial, expired reservation denial, provider failure release, DB persistence failure after provider success, idempotent retry, and safe errors.
  - [x] Route tests for OpenAPI metadata, optional auth, rate-limit class, response shape, request ID, safe envelopes, denial before provider call, and rejected browser-supplied amount/provider/status fields.
  - [x] UI/API tests for reservation -> payment creation -> redirect, provider unavailable copy, expired checkout session recovery, no card fields, no account prompt, and payment button not dead-ended.
  - [x] Minimum commands:
    - `npx vitest run src/domain/checkout/cart-validation.test.ts src/domain/checkout/contact-delivery.test.ts src/domain/checkout/inventory-reservation.test.ts`
    - `npx vitest run src/domain/payments/paymongo-checkout.test.ts src/lib/paymongo/PayMongoClient.test.ts`
    - `npx vitest run src/server/repositories/CheckoutRepository.test.ts src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts src/domain/schema-invariants.test.ts`
    - `npx vitest run src/features/cart-checkout/components/cart-ui.test.tsx src/features/cart-checkout/store.test.ts`
    - `npm run check`
  - [x] Run `npm run build-test` after targeted suites pass because this story touches payment handoff.

### Review Findings

- [x] [Review][Patch] Route payment creation through Inventory Durable Object with per-attempt serialization [src/cloudflare/durable-objects/InventoryDurableObject.ts:37]
- [x] [Review][Patch] Prevent payment-failure release from regressing `PAYMENT_CREATED` or releasing a pending payment reservation [src/server/repositories/CheckoutRepository.ts:564]
- [x] [Review][Patch] Persist payment row, payment items, and attempt transition atomically [src/server/repositories/CheckoutRepository.ts:492]
- [x] [Review][Patch] Remove browser/local PayMongo proxy handoff and always call canonical JRW payment endpoint [src/features/cart-checkout/api.ts:880]
- [x] [Review][Patch] Remove `proxyEndpoint` behavior from backend PayMongo client [src/lib/paymongo/PayMongoClient.ts:99]
- [x] [Review][Patch] Reject non-HTTPS or non-`checkout.paymongo.com` checkout URLs before persistence and redirect [src/lib/paymongo/PayMongoClient.ts:68]
- [x] [Review][Patch] Reject malformed payment envelopes and successful-looking bodies from non-success HTTP responses [src/features/cart-checkout/api.ts:453]
- [x] [Review][Patch] Reject invalid reservation price/quantity totals instead of clamping payment payload values [src/server/services/CheckoutService.ts:358]
- [x] [Review][Patch] Bound PayMongo requests and return scrubbed provider failures without operator-only UI guidance [src/lib/paymongo/PayMongoClient.ts:134]
- [x] [Review][Patch] Wire runtime payment operational logging instead of default no-op logger [src/server/routes/checkout.routes.ts:420]
- [x] [Review][Patch] Add concurrency, reservation-state, proxy-removal, localhost-endpoint, malicious-URL, and release-guard regression tests [src/server/services/CheckoutService.test.ts]
- [x] [Review][Defer] Serialize existing expired-reservation cleanup and stock restoration as one claim/release operation [src/server/repositories/CheckoutRepository.ts:638] — deferred, pre-existing

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [x] Route auth metadata declares public/optional/required auth, roles, and rate-limit class.
- [x] N/A - Route-level RBAC guard runs before validation or side effects for protected endpoints; payment creation endpoint is optional-auth guest/customer but must run attempt ownership/token guard before provider call or persistence.
- [x] Service/controller enforces actor state before mutation: Customer actor must come from server Customer session; guest must pass attempt token; Admin/Super Admin cookies do not become Customer identity.
- [x] N/A - Brand-scoped reads or writes enforce active brand membership or elevated permission server-side; public checkout payment uses public published storefront reservation, not brand admin scope.
- [x] Public/customer endpoints explicitly document why brand membership is not required.
- [x] Denial tests cover missing/invalid attempt token, wrong Customer actor, Admin/wrong realm actor, stale attempt, non-payment-eligible status, expired/released reservation, duplicate conflicting payment, and provider-not-called path where applicable.
- [x] Error response uses safe envelope codes and does not leak provider/internal authorization details.
- [x] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial/error codes.

## Dev Notes

### Epic Context

- Epic 5 goal: guest or signed-in shoppers submit checkout with required email/contact/delivery details, inventory is reserved/validated, PayMongo state reconciles safely, webhooks are verified/idempotent, and payment emails send to checkout email.
- Story 5.1 is done: checkout details are guest-capable and persisted in `checkout_attempts` with nullable `customer_id`.
- Story 5.2 is done: cart is revalidated server-side, inventory is reserved, and `next.payMongoCreationRequired` is returned after active reservation.
- Story 5.3 is the first PayMongo story. It creates hosted checkout handoff only.
- Story 5.4 owns PayMongo webhook signature verification and idempotency.
- Story 5.5 owns payment reconciliation and order confirmation from server truth.
- Story 5.6 owns reserved inventory release after failed/cancelled/pending-too-long provider payment. Story 5.3 still owns release/cleanup when PayMongo session creation itself fails before handoff.
- Story 5.7 owns checkout receipt/payment email UX and payment emails to checkout email.

### Current Code Intelligence

#### READ/UPDATE: `src/domain/schema/transactions.ts`

- Current state: `checkout_attempts` stores checkout contact/delivery snapshot, nullable `customer_id`, `attempt_token_hash`, `cart_fingerprint`, `reservation_id`, `reservation_expires_at`, and status. `checkout_reservations` and `checkout_reservation_items` store active reservation records and item quantities/prices. `orders` still has legacy combined status/real total and is not ready for final payment/order truth.
- What this story changes: add payment persistence and likely extend attempt/payment status constants. Add migration after `0026`.
- Preserve: nullable Customer reference, snake_case DB names, integer centavos, no raw provider payload/card/token fields, payment state separate from fulfillment/order state.

#### READ/UPDATE: `migrations/0025_checkout_inventory_reservations.sql` and `migrations/0026_checkout_active_reservation_attempt_unique.sql`

- Current state: latest checkout migration adds attempt token/reservation fields plus active reservation uniqueness.
- What this story changes: add next migration only. Do not edit prior migrations unless project explicitly approves migration rewrite.
- Preserve: remote-first D1 practice; do not apply production migrations without review.

#### READ/UPDATE: `src/domain/checkout/inventory-reservation.ts`

- Current state: defines reservation plan/response, active reservation TTL, cart fingerprint, retry decisions, and `payMongoCreationRequired`.
- What this story changes: reuse `CheckoutReservationResponse` as prerequisite; do not mutate reservation semantics unless payment handoff needs a narrow exported helper.
- Preserve: idempotent retry semantics, `PREORDER` reservation mode, and no raw stock/provider internals.

#### READ/UPDATE: `src/server/repositories/CheckoutRepository.ts`

- Current state: reads cart lines, creates checkout attempts, verifies active reservation, writes reservation rows/items, decrements/releases stock, maps attempt status including `PAYMENT_CREATED` placeholder.
- What this story changes: add payment record methods, active payment reuse, reservation release by reservation ID/items, payment-eligible attempt lookup, safe line item/name loading, and guarded attempt transition to `PAYMENT_CREATED`.
- Preserve: Drizzle `createDb` pattern, D1 provider failure mapping, conditional stock/version updates, no provider calls inside repository, no public exposure of stock versions/token hashes.

#### READ/UPDATE: `src/server/services/CheckoutService.ts`

- Current state: `validateCart`, `saveDetails`, and `reserveInventory`; service authorizes guest/customer attempt before reservation and maps D1 failures to safe errors.
- What this story changes: add `createPayment`/`createPaymentHandoff` use case with attempt authorization, reservation eligibility, PayMongo client call, idempotency, persistence, release-on-provider-failure, and safe result.
- Preserve: validation before side effects, `AppResult`/`GeneralError`, provider failures mapped safely, browser payload treated as untrusted.

#### READ/UPDATE: `src/server/controllers/CheckoutController.ts`

- Current state: adapts checkout service results to standard envelopes with request ID.
- What this story changes: add payment creation controller method.
- Preserve: `publicErrorMessage`, `apiSuccessWithRequestId`, `apiErrorWithRequestId`, and sanitized details.

#### READ/UPDATE: `src/server/routes/checkout.routes.ts`

- Current state: routes `POST /checkout/cart-validations`, `POST /checkout/details`, and `POST /checkout/attempts/:attemptId/reservations`; all use optional auth, TypeBox schemas, OpenAPI `routeDetail`, and rate-limit class `checkout-payment`.
- What this story changes: add payment creation route and response schemas. Existing route descriptions saying they create no PayMongo session remain true for those routes.
- Preserve: optional auth semantics, roles `PROSPECT`/`CUSTOMER`, `additionalProperties` protections, route docs, standard response schemas, and route tests.

#### READ/UPDATE: `src/features/cart-checkout/api.ts`

- Current state: client helpers validate cart, save details, reserve inventory, and map safe errors. `CheckoutReservationResult.next.payMongoCreationRequired` is already typed.
- What this story changes: add payment creation helper, response validation, safe error mapping, and redirect handoff helper if needed.
- Preserve: standard envelope parsing, no raw provider payload assumptions, no secret/client key usage in browser.

#### READ/UPDATE: `src/features/cart-checkout/components/CheckoutDetailsPage.tsx`

- Current state: details form saves details, validates cart, reserves inventory, then sets status `reserved` and leaves Payment step as "Payment ready".
- What this story changes: after reservation success, call payment creation and redirect/present handoff; add states such as `creating-payment`, `payment-ready`, `payment-failed`.
- Preserve: Direction 04 details form, field errors/focus summary, cart preservation, guest/signed-in behavior, no account prompts in details, no PayMongo/card fields.

#### READ/UPDATE: `src/features/cart-checkout/components/CheckoutFlow.tsx`

- Current state: checkout stepper and summary rail with `cart`, `details`, `payment`, `receipt`; current step uses `aria-current="step"`. Payment CTA is disabled unless summary action supplied.
- What this story changes: payment step/action copy and pending/error states for PayMongo handoff.
- Preserve: stable Direction 04 layout, sharp 1px style, no fake receipt/order state, no text overlap.

#### READ/UPDATE: `.env.example`, `wrangler.jsonc`, `worker-configuration.d.ts`

- Current state: `.env.example` has `PAYMONGO_SECRET_KEY` and `PAYMONGO_PUBLIC_KEY`. Generated `Env` types do not include PayMongo keys, and `wrangler.jsonc` has no PayMongo vars/secrets declaration.
- What this story changes: document/setup PayMongo secret binding for Workers and regenerate types if runtime env reads it.
- Preserve: env-scoped Cloudflare binding style, no secret values committed, `--env development` for development Wrangler commands.

#### READ/UPDATE: `src/adapter/infrastructure/logging/operational-log.ts`, `src/domain/audit/events.ts`, `src/lib/api/response.ts`

- Current state: scrubbers already redact PayMongo/provider/payment payload keywords, tokens, secrets, emails, phones, and addresses.
- What this story changes: add test cases for new payment handoff detail keys and ensure checkout URL/provider response fields are redacted.
- Preserve: logging must never mask original safe error response.

#### READ/CREATE: `src/lib/paymongo/PayMongoClient.ts`

- Current state: no project PayMongo client exists. `package.json` includes community `paymongo` dependency, but current code does not use it.
- What this story changes: add project-owned Workers-compatible wrapper using PayMongo Hosted Checkout V2 API.
- Preserve: provider wrapper lives in `src/lib/**`; service calls wrapper through injected dependency for tests.

### Previous Story Intelligence

- Story 5.2 added hashed attempt-token gate, `POST /api/checkout/attempts/:attemptId/reservations`, reservation domain rules, D1 reservation persistence, Durable Object coordination, idempotent same-cart retry, and 100-attempt oversell tests.
- Story 5.2 review fixed: same-cart retry after own stock decrement, expired reservation reuse, active reservation uniqueness, unknown attempt status acceptance, mutation-time product/price/status predicates, transactional reservation persistence, rollback failure visibility, invalid reservation clock, guarded attempt transitions, cart-change payment lock reset, D1 concurrency coverage, and Durable Object response validation.
- Do not reintroduce any fixed bug. Payment creation must reject expired active reservations before provider call and must reuse existing same-attempt pending payment rather than create duplicate sessions.
- Story 5.1 established guest checkout and optional Customer prefill. Do not require account sign-in, email verification, or Google OAuth before PayMongo handoff.
- Story 4.5 established server cart validation before checkout. Do not create PayMongo from localStorage/browser cart.

### Git Intelligence Summary

- Recent commits:
  - `14d9c98 chore: 5-2 reviewed`
  - `9f3da36 feat: 5-2 implemented`
  - `83795e5 chore: 5-1 reviewed`
  - `004abac feat: 5-1 implemneted`
  - `c5d0395 feat: 5-1 story created`
- `9f3da36` touched checkout story file/status, reservation migrations, `InventoryDurableObject`, checkout domain/repository/service/controller/routes, feature API/UI, crypto opaque token helper, and checkout tests.
- Build on the 5.2 checkout stack rather than replacing it.

### Architecture Compliance

- Route flow remains Route -> Controller -> Service -> Domain/Repository.
- Business rules and payment eligibility stay testable without HTTP, D1, PayMongo, or React.
- PayMongo HTTP wrapper belongs in `src/lib/paymongo/**` and is injected into service for tests.
- D1/Drizzle persistence belongs in repository methods, not provider wrapper or UI.
- Runtime code must be Cloudflare Workers-compatible. Avoid Node-only APIs in request path.
- Public API responses use `{ data, meta }` or `{ error: { code, message, details? } }`.
- Use TypeBox/Elysia `t` schemas for route contracts/OpenAPI. Use pure domain validators for internal payment payload assembly.
- Server state is authority for checkout, inventory, payment, and order. Browser payload never controls amount, status, provider references, or return URLs.
- Money uses integer centavos. No floats for new payment/order structures.
- Payment, fulfillment, return, refund, inventory, and checkout attempt phase remain separate.
- Brand membership is not required for shopper checkout payment because payment uses already reserved public storefront inventory.

### Design Direction Fidelity

- Source: `_bmad-output/planning-artifacts/ux-design-directions.html#direction-04`.
- Direction 04: staged checkout with Cart, Details, Payment, Receipt/Confirmation. Story 5.3 moves user from Payment step to provider handoff; receipt remains future.
- Source: `_bmad-output/planning-artifacts/ux-design-specification.md#CheckoutSteps`.
- Checkout steps must show current/complete/blocked states and current step with `aria-current`.
- Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns`.
- Payment creation failure should be inline, text-first, retry-safe, and customer-safe. No provider jargon or raw PayMongo error.
- Preserve sharp 1px module style, no shadows/blur, shared `Button` hover/focus contract, responsive text non-overlap, and no `jrw-*` CSS resurrection.
- Routine UI should not explain "JRW seller of record" or merchant boundary. Keep that in developer/API/payment/legal contexts.

### Latest Technical Information

- PayMongo Hosted Checkout is created by backend call to Checkout Session API with amount, line items, payment methods, redirect URLs, and returns a customer payment URL. Source: https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- PayMongo docs recommend `/v2/checkout_sessions` for new integrations; V2 defers Payment Intent creation until customer pays. Save Checkout Session ID and use `checkout_session.payment.paid` webhook in later Story 5.4/5.5. Source: https://docs.paymongo.com/reference/create-a-checkout-v2
- PayMongo quick start says authenticate backend request with secret key through Basic auth username and no password; never call checkout session creation from frontend. Source: https://docs.paymongo.com/docs/payment-channels-hosted-checkout-quick-start
- PayMongo response includes `data.attributes.checkout_url`; browser should be redirected to that URL. Source: https://docs.paymongo.com/docs/payment-channels-hosted-checkout-quick-start
- PayMongo Checkout Session resource includes `reference_number`, `success_url`, `cancel_url`, `payment_method_types`, `checkout_url`, `livemode`, `status`, `send_email_receipt`, and `metadata`. Metadata accepts only string values. Source: https://docs.paymongo.com/reference/checkout-session-resource
- PayMongo Hosted Checkout sends `checkout_session.payment.paid` to configured webhook endpoint after payment completion; this story must not mark order paid from redirect alone. Source: https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- Local `paymongo` package is community Node-oriented and its README points to community docs; it is not already integrated and may not target Hosted Checkout V2/Workers. Prefer project-owned `fetch` wrapper unless developer proves compatibility. Sources: `package.json`, `node_modules/paymongo/package.json`, `node_modules/paymongo/README.md`.

### Testing Requirements

- Minimum local gate:
  - `npx vitest run src/domain/checkout/cart-validation.test.ts src/domain/checkout/contact-delivery.test.ts src/domain/checkout/inventory-reservation.test.ts`
  - `npx vitest run src/domain/payments/paymongo-checkout.test.ts src/lib/paymongo/PayMongoClient.test.ts`
  - `npx vitest run src/server/repositories/CheckoutRepository.test.ts src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts src/domain/schema-invariants.test.ts`
  - `npx vitest run src/features/cart-checkout/components/cart-ui.test.tsx src/features/cart-checkout/store.test.ts`
  - `npm run check`
- Run `npm run build-test` after targeted suites pass.
- If UI layout changes beyond payment state/copy, run checkout viewport QA or document blocker:
  - `npm run qa:checkout-viewports`
- If `worker-configuration.d.ts` changes, run:
  - `npm run wrangler-types`

### Anti-Patterns To Avoid

- Do not create PayMongo session from browser cart, browser amount, browser customer ID, or browser return URL.
- Do not call PayMongo from frontend.
- Do not render card fields or collect raw card data in JRW.
- Do not trust PayMongo redirect params as paid state; Story 5.5 reconciles server truth.
- Do not create order confirmation, receipt, payment email, webhook handler, or fulfillment state here.
- Do not reserve again during payment creation. Use active reservation.
- Do not create duplicate PayMongo sessions on double click/retry.
- Do not leave active stock reservation stranded after provider creation failure.
- Do not log or expose `PAYMONGO_SECRET_KEY`, Authorization header, raw provider request/response, checkout URL, checkout email, phone, address, card data, or attempt token.
- Do not use legacy `src/api/**`.
- Do not store money as floats.
- Do not model brands as sellers, merchants, stores, payout owners, or PayMongo accounts.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 5.3`
- `_bmad-output/planning-artifacts/prd.md#Payments & Checkout`
- `_bmad-output/planning-artifacts/prd.md#Integration Requirements`
- `_bmad-output/planning-artifacts/prd.md#Reliability & Data Integrity`
- `_bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions`
- `_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-04`
- `_bmad-output/planning-artifacts/ux-design-specification.md#CheckoutSteps`
- `_bmad-output/project-context.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-12-guest-email-checkout.md`
- `_bmad-output/implementation-artifacts/5-1-checkout-identity-contact-and-delivery-validation.md`
- `_bmad-output/implementation-artifacts/5-2-server-cart-validation-and-inventory-reservation.md`
- `_bmad-output/implementation-artifacts/1-4-retention-privacy-checklist.md`
- `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md`
- `src/domain/schema/transactions.ts`
- `src/domain/checkout/inventory-reservation.ts`
- `src/server/repositories/CheckoutRepository.ts`
- `src/server/services/CheckoutService.ts`
- `src/server/controllers/CheckoutController.ts`
- `src/server/routes/checkout.routes.ts`
- `src/features/cart-checkout/api.ts`
- `src/features/cart-checkout/components/CheckoutDetailsPage.tsx`
- `src/features/cart-checkout/components/CheckoutFlow.tsx`
- `src/adapter/infrastructure/logging/operational-log.ts`
- `src/domain/audit/events.ts`
- `src/lib/api/response.ts`
- `.env.example`
- `wrangler.jsonc`
- `worker-configuration.d.ts`
- `package.json`
- `node_modules/paymongo/package.json`
- `node_modules/paymongo/README.md`
- https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- https://docs.paymongo.com/docs/payment-channels-hosted-checkout-quick-start
- https://docs.paymongo.com/reference/create-a-checkout-v2
- https://docs.paymongo.com/reference/checkout-session-resource

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npx vitest run src/domain/checkout/cart-validation.test.ts src/domain/checkout/contact-delivery.test.ts src/domain/checkout/inventory-reservation.test.ts src/features/cart-checkout/store.test.ts --reporter=verbose` - passed, 21 tests.
- `npx vitest run src/domain/checkout/cart-validation.test.ts src/domain/checkout/contact-delivery.test.ts src/domain/checkout/inventory-reservation.test.ts src/domain/payments/paymongo-checkout.test.ts src/lib/paymongo/PayMongoClient.test.ts src/domain/schema-invariants.test.ts src/server/repositories/CheckoutRepository.test.ts src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts src/features/cart-checkout/components/cart-ui.test.tsx src/features/cart-checkout/store.test.ts src/adapter/infrastructure/logging/operational-log.test.ts src/domain/audit/events.test.ts --pool=threads --maxWorkers=1 --reporter=verbose` - passed, 118 tests.
- `npm run check` - passed with existing hints.
- `npm run build-test` - attempted; `astro check` passed and Vitest reached 110/111 files, 722/725 tests, then failed on `vitest-pool` worker fork crash: `Worker exited unexpectedly`.
- `npm run build-development` - attempted after final log/audit changes; `astro check` passed, `astro build` blocked by Cloudflare API authentication error `[code: 10000]` while starting remote proxy session.
- `npx vitest run src/features/cart-checkout/components/cart-ui.test.tsx --reporter verbose` - passed, 23 tests including immediate PayMongo redirect after handoff creation.
- `npm run check` - passed with 0 errors and 9 existing hints.
- `npx vitest run --pool=threads --maxWorkers=1 --reporter=dot` - attempted; timed out after 15 minutes with no diagnostics, so full-suite completion remains environment-blocked while targeted Story 5.3 coverage passes.
- `npx vitest run src/cloudflare/durable-objects/InventoryDurableObject.test.ts src/domain/payments/paymongo-checkout.test.ts src/lib/paymongo/PayMongoClient.test.ts src/server/repositories/CheckoutRepository.test.ts src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts src/features/cart-checkout/components/cart-ui.test.tsx --pool=threads --maxWorkers=1 --reporter=dot` - passed, 7 files, 91 tests.
- `npx vitest run src/domain/checkout/cart-validation.test.ts src/domain/checkout/contact-delivery.test.ts src/domain/checkout/inventory-reservation.test.ts src/domain/payments/paymongo-checkout.test.ts src/lib/paymongo/PayMongoClient.test.ts src/domain/schema-invariants.test.ts src/server/repositories/CheckoutRepository.test.ts src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts src/features/cart-checkout/components/cart-ui.test.tsx src/features/cart-checkout/store.test.ts src/adapter/infrastructure/logging/operational-log.test.ts src/domain/audit/events.test.ts src/cloudflare/durable-objects/InventoryDurableObject.test.ts --pool=threads --maxWorkers=1 --reporter=dot` - passed, 14 files, 131 tests.
- `npm run check` - passed with 0 errors and 9 existing hints.
- `npm run build-test` - passed; Astro check passed with 0 errors and 9 existing hints, Vitest passed 113 files / 741 tests, Astro build completed.
- `npx vitest run src/server/routes/checkout.routes.test.ts src/cloudflare/durable-objects/InventoryDurableObject.test.ts --pool=threads --maxWorkers=1 --reporter=dot` - passed, 2 files, 16 tests after DO runtime payment config forwarding hotfix.
- `npx vitest run src/cloudflare/durable-objects/InventoryDurableObject.test.ts src/domain/payments/paymongo-checkout.test.ts src/lib/paymongo/PayMongoClient.test.ts src/server/repositories/CheckoutRepository.test.ts src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts src/features/cart-checkout/components/cart-ui.test.tsx --pool=threads --maxWorkers=1 --reporter=dot` - passed, 7 files, 91 tests after DO runtime payment config forwarding hotfix.
- `npm run check` - passed with 0 errors and 9 existing hints after DO runtime payment config forwarding hotfix.
- Browser/API diagnostic checkout against `http://localhost:7777`: details 200, cart validation 200, reservation 200, payment 200, returned PayMongo checkout URL `https://checkout.paymongo.com/...`.
- Playwright browser checkout against `http://localhost:7777/checkout`: seeded cart, filled details, clicked `Continue to Payment`, and observed `BROWSER_REDIRECT_OK https://checkout.paymongo.com/...`.
- `npx vitest run src/lib/paymongo/PayMongoClient.test.ts src/server/routes/checkout.routes.test.ts src/cloudflare/durable-objects/InventoryDurableObject.test.ts --pool=threads --maxWorkers=1 --reporter=dot` - passed, 3 files, 23 tests after Worker fetch invocation fix.
- `npx vitest run src/cloudflare/durable-objects/InventoryDurableObject.test.ts src/domain/payments/paymongo-checkout.test.ts src/lib/paymongo/PayMongoClient.test.ts src/server/repositories/CheckoutRepository.test.ts src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts src/features/cart-checkout/components/cart-ui.test.tsx --pool=threads --maxWorkers=1 --reporter=dot` - passed, 7 files, 92 tests after Worker fetch invocation fix.
- `npm run check` - passed with 0 errors and 9 existing hints after Worker fetch invocation fix.
- `npm run build-test` - passed after Worker fetch invocation fix; Astro check passed with 0 errors and 9 existing hints, Vitest passed 113 files / 742 tests, Astro build completed.
- `npx wrangler deploy --env development` - deployed development Worker version `7ce74c81-e751-4523-90b3-bf6b7d5984bc` after local/browser verification.
- Remote API diagnostic checkout against `https://jrw-ecommerce-development.jerowe-tan99.workers.dev`: details 200, cart validation 200, reservation 200, payment 200, returned PayMongo checkout URL `https://checkout.paymongo.com/...`.
- Remote Playwright browser checkout against `https://jrw-ecommerce-development.jerowe-tan99.workers.dev/checkout`: seeded cart, filled details, clicked `Continue to Payment`, and observed `REMOTE_BROWSER_REDIRECT_OK https://checkout.paymongo.com/...`.

### Completion Notes List

- Added server-owned PayMongo Hosted Checkout V2 handoff behind `POST /api/checkout/attempts/:attemptId/payments` with optional customer/guest auth, attempt-token gate, server-side return URLs, server-owned payment methods, and safe response envelope.
- Added `checkout_payments` and `checkout_payment_items` schema/migration, repository persistence, pending-payment reuse, attempt transition to `PAYMENT_CREATED`, and provider/persistence failure reservation release to `PAYMENT_CREATION_FAILED`.
- Added Workers-compatible `PayMongoClient` using global `fetch` plus backend-only Basic auth; frontend only calls JRW API and renders explicit PayMongo handoff button.
- Added safe operational log and `payment.checkout_created` audit event details; scrubbers now preserve safe provider checkout session IDs while redacting checkout URLs, provider payloads, card data, contact PII, tokens, and secrets.
- `worker-configuration.d.ts` not regenerated because payment env keys are read through runtime `Record<string, unknown>` and PayMongo secret should remain a Worker secret, not a committed var.
- Routed runtime payment creation through the Inventory Durable Object `/payments` path with per-attempt serialization, route-level payment executor wiring, and DO-local `CheckoutService` construction.
- Forwarded runtime payment config from the outer checkout route into the Durable Object `/payments` request so local `.env` values and original request origin are available when DO creates the PayMongo session.
- Fixed Workers runtime PayMongo calls by wrapping default global `fetch`; storing raw Worker `fetch` on the client and invoking it as `this.fetcher(...)` caused Cloudflare `Illegal invocation` errors.
- Verified live local checkout in browser: `Continue to Payment` redirects to PayMongo Hosted Checkout.
- Deployed and verified development Worker after local fixes; remote checkout now returns payment handoff and redirects to PayMongo Hosted Checkout.
- Removed browser/local PayMongo proxy handoff and backend `proxyEndpoint` behavior; UI now always calls the canonical JRW payment endpoint before redirect.
- Added trusted PayMongo checkout URL validation before persistence and browser redirect, strict response envelope validation, bounded provider requests, and scrubbed provider failures.
- Hardened payment persistence/release behavior for concurrent payment attempts: batch payment creation, pending-payment reuse, guarded release, and no regression from `PAYMENT_CREATED`.
- Full `npm run build-test` now passes after final review fixes.
- Updated successful backend PayMongo handoffs to call `window.location.assign(checkoutUrl)` immediately after safe response validation, removing the normal second-click payment friction while retaining the existing handoff link as recovery state if navigation does not leave the page.
- Local browser QA restart was blocked by Cloudflare dev runtime error `Network connection lost`; redirect behavior is covered by a focused unit test and checkout UI suite.

### File List

- `.env.example`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/epic-5-context.md`
- `_bmad-output/implementation-artifacts/5-3-paymongo-payment-creation-and-handoff.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `migrations/0027_checkout_paymongo_payments.sql`
- `src/adapter/infrastructure/logging/operational-log.test.ts`
- `src/adapter/infrastructure/logging/operational-log.ts`
- `src/cloudflare/durable-objects/CheckoutPaymentAttemptCoordinator.ts`
- `src/cloudflare/durable-objects/InventoryDurableObject.test.ts`
- `src/cloudflare/durable-objects/InventoryDurableObject.ts`
- `src/domain/audit/events.test.ts`
- `src/domain/audit/events.ts`
- `src/domain/payments/paymongo-checkout.test.ts`
- `src/domain/payments/paymongo-checkout.ts`
- `src/domain/schema-invariants.test.ts`
- `src/domain/schema/transactions.ts`
- `src/features/cart-checkout/api.ts`
- `src/features/cart-checkout/components/CheckoutDetailsPage.tsx`
- `src/features/cart-checkout/components/CheckoutFlow.tsx`
- `src/features/cart-checkout/components/cart-ui.test.tsx`
- `src/lib/paymongo/PayMongoClient.test.ts`
- `src/lib/paymongo/PayMongoClient.ts`
- `src/server/app.ts`
- `src/server/controllers/CheckoutController.ts`
- `src/server/repositories/CheckoutRepository.test.ts`
- `src/server/repositories/CheckoutRepository.ts`
- `src/server/routes/checkout.routes.test.ts`
- `src/server/routes/checkout.routes.ts`
- `src/server/services/CheckoutService.test.ts`
- `src/server/services/CheckoutService.ts`

### Change Log

- 2026-06-16: Implemented PayMongo Hosted Checkout creation/handoff, payment persistence, safe audit/logging, UI PayMongo action, tests, and moved story to review.
- 2026-06-19: Removed second-click PayMongo handoff friction by redirecting immediately after successful handoff creation; added redirect coverage and reran Story 5.3 completion checks.
- 2026-06-21: Fixed BMad review findings for DO payment coordination, proxy removal, trusted checkout URL validation, release guards, atomic persistence, and regression tests; Story 5.3 targeted suites, `npm run check`, and `npm run build-test` passed; moved story to done.
- 2026-06-21: Hotfixed DO payment runtime config forwarding so `.env`-loaded PayMongo secret and request-origin app base URL reach the Durable Object payment service in local dev; targeted tests and `npm run check` passed.
- 2026-06-21: Fixed Cloudflare Worker `fetch` illegal invocation in `PayMongoClient`, verified API and Playwright browser redirect to PayMongo, reran targeted suites, `npm run check`, and `npm run build-test`.
- 2026-06-21: Deployed development Worker version `7ce74c81-e751-4523-90b3-bf6b7d5984bc`; remote API and Playwright browser checks redirect to PayMongo.


## Code Review - ChatGPT Browser Pass (2026-06-20)

Review method: BMad `bmad-code-review` style pass using Acceptance Auditor + Edge Case Hunter + Blind Hunter against the committed current implementation. Repository worktree was clean at review start (`main`, HEAD `d21ecd57460909f07c5b1914d9cb0a1bc1a5a5e8`), so this review inspected current files rather than an unstaged diff. I could not run local commands from ChatGPT browser; findings are static-review findings for Codex/local follow-up.

### Review Status

Fixed and verified locally. Story moved to `done` after Story 5.3 targeted suites, `npm run check`, and `npm run build-test` passed.

### Findings

1. **P0 - Concurrent payment creation can undo a successful PayMongo handoff.**
   - Files: `src/server/services/CheckoutService.ts`, `src/server/repositories/CheckoutRepository.ts`, `migrations/0027_checkout_paymongo_payments.sql`.
   - Scenario: two fast `POST /api/checkout/attempts/:attemptId/payments` requests both pass `findPendingCheckoutPaymentForAttempt()` before either insert exists, so both call PayMongo. The first request can insert `checkout_payments` and transition the attempt to `PAYMENT_CREATED`. The second request can then fail on the pending-payment uniqueness constraint and enter the service `createCheckoutPayment` catch path, which calls `releaseCheckoutReservationForPaymentFailure()`. That release method only checks attempt id + reservation id, not current attempt status or existing pending payment, so it can mark the reservation `RELEASED`, clear the attempt reservation, and set status `PAYMENT_CREATION_FAILED` after a valid `PAYMENT_PENDING` payment was created.
   - Impact: duplicate provider session risk, valid payment record attached to released reservation, attempt state regression, inventory restored while shopper is redirected to PayMongo, and later webhook/reconciliation ambiguity.
   - Required fix: make payment creation idempotency atomic. Use a DB claim/lock or transaction-safe insert-before-provider design, or handle post-provider unique conflicts by fetching and returning the existing pending payment without releasing the reservation. Also guard `releaseCheckoutReservationForPaymentFailure()` so it cannot release a reservation with an existing `PAYMENT_PENDING` payment or an attempt already in `PAYMENT_CREATED`.
   - Missing test: concurrent/double-click payment creation where both calls reach provider; assert only one provider session is accepted or the loser reuses existing, reservation remains `ACTIVE`, attempt remains `PAYMENT_CREATED`, and stock is not restored.

2. **P0 - Local PayMongo proxy path bypasses backend payment persistence and audit.**
   - Files: `src/features/cart-checkout/components/CheckoutDetailsPage.tsx`, `src/features/cart-checkout/api.ts`.
   - Scenario: on localhost, `CheckoutDetailsPage` calls `createLocalPayMongoCheckoutHandoff()` before `createPayMongoPaymentHandoff()`. That helper builds a PayMongo payload from browser cart state and posts directly to `/__jrw-dev/paymongo/checkout-sessions`, then redirects on success.
   - Impact: the normal backend payment endpoint is skipped, so no `checkout_payments` row is created, the attempt is not transitioned to `PAYMENT_CREATED`, idempotent retry does not exist, audit/operational logging is skipped, and the story’s backend-only/server-authoritative PayMongo boundary is weakened even if this is intended for local development only.
   - Required fix: remove the frontend local PayMongo handoff path, or move the local proxy usage behind the backend `POST /api/checkout/attempts/:attemptId/payments` path only. The browser should always call the JRW payment endpoint and receive a persisted safe handoff response.
   - Missing test: localhost checkout still posts to `/api/checkout/attempts/:attemptId/payments`; no frontend code path posts provider payload/line items to a PayMongo/proxy endpoint.

3. **P1 - Payment persistence is not atomic with payment items and attempt transition.**
   - Files: `src/server/repositories/CheckoutRepository.ts`.
   - Scenario: `createCheckoutPayment()` inserts `checkout_payments`, then inserts `checkout_payment_items`, then updates `checkout_attempts`. If item insert or attempt update fails, the already inserted payment row can remain pending while the service catches and releases the reservation.
   - Impact: stranded `PAYMENT_PENDING` rows, provider sessions without a consistent attempt state, and manual reconciliation burden. This overlaps with the concurrency issue but can also happen from DB/runtime failure after provider success.
   - Required fix: wrap payment insert, item insert, and attempt transition in a transaction where supported, with a safe D1 fallback/compensation that marks the payment failed/manual-reconcile-required rather than leaving pending. If fallback cannot be fully atomic, tests must prove the compensating state is durable and safe.
   - Missing test: force failure after payment insert and before/at attempt transition; assert no usable pending payment is left on a released reservation, and enough scrubbed reconciliation context remains.

4. **P1 - Redirect URL trust is not enforced at the backend/client boundary.**
   - Files: `src/lib/paymongo/PayMongoClient.ts`, `src/features/cart-checkout/components/CheckoutDetailsPage.tsx`, `src/features/cart-checkout/api.ts`.
   - Scenario: `parseCheckoutSessionResponse()` accepts any string `attributes.checkout_url`, the API returns it, and `redirectToPayMongoCheckout()` calls `window.location.assign(checkoutUrl)` without a PayMongo-controlled host policy.
   - Impact: a compromised mock/proxy/provider response or unexpected integration bug can turn payment handoff into an open redirect. Story AC requires redirect only after the URL is parsed and PayMongo-controlled, or after the server marks it trusted.
   - Required fix: validate checkout URL server-side before persistence/response and/or return an explicit `trusted: true` flag only after validation. Client should redirect only trusted handoff URLs and otherwise show safe retry copy.
   - Missing test: malicious `checkout_url` such as `https://evil.example/pay` is rejected before persistence and before browser redirect.

### Positive Coverage Observed

- The main server endpoint follows Route -> Controller -> Service -> Repository/Domain and uses optional guest/customer auth with attempt-token authorization.
- Browser payment helper for the normal backend path submits only `attemptToken`; it does not submit amount, line items, provider status, or card data.
- PayMongo client uses backend Basic auth and maps provider failures to safe public codes without raw provider body leakage.
- Schema avoids raw provider payload, card/token fields, and obvious PII columns in payment tables.
- Existing targeted tests cover core success, safe envelopes, backend-only auth for the normal path, provider failures, idempotent existing-payment reuse, and UI redirect behavior.

### Codex Follow-Up Checklist

- [x] Remove or reroute frontend local PayMongo proxy handoff so all UI payment starts go through `POST /api/checkout/attempts/:attemptId/payments`.
- [x] Make payment creation race-safe and idempotent under double-click/concurrent requests.
- [x] Prevent `releaseCheckoutReservationForPaymentFailure()` from releasing reservations that already have pending payments or attempts already marked `PAYMENT_CREATED`.
- [x] Make payment insert + payment items + attempt transition atomic or add durable compensating state with tests.
- [x] Validate PayMongo checkout URL trust before persistence/response/redirect.
- [x] Add regression tests for concurrent payment creation, unique-conflict loser behavior, post-provider persistence failure, release guard, and malicious checkout URL rejection.
- [x] Rerun Story 5.3 targeted suites, `npm run check`, and `npm run build-test` locally after fixes.
