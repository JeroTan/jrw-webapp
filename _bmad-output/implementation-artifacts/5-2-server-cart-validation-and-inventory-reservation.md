# Story 5.2: Server Cart Validation and Inventory Reservation

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Shopper,
I want JRW to validate and reserve inventory before payment,
so that checkout cannot oversell limited stock.

## Acceptance Criteria

1. Given Shopper submits checkout for cart items after checkout details are captured, when server validation runs, then product status, variant status, current price, stock quantity, inventory state, checkout attempt state, and attempt ownership/token are validated server-side before any reservation starts.
2. Given cart is valid and stock is available, when reservation runs, then inventory is reserved through Durable Object coordination and/or documented optimistic stock versioning, stock cannot go negative, and reservation result is tied to checkout attempt.
3. Given concurrent checkout attempts target limited stock, when at least 100 simultaneous attempts run in tests, then system prevents oversell and losing attempts receive `INVENTORY_UNAVAILABLE` or documented conflict error.
4. Given cart validation changes price or quantity, when reservation is requested, then reservation does not start, payment handoff remains blocked, and response returns current safe cart summary for customer acceptance/retry.
5. Given reservation fails after any line was reserved, when response returns, then earlier reserved stock is released or rolled back in the same use case and no partial active reservation remains.
6. Given reservation succeeds, when response returns, then response includes checkout attempt and reservation references needed for PayMongo creation and no raw lock details, stock versions, Durable Object names, DB errors, or provider internals are exposed.
7. Given reservation endpoint is called twice for same checkout attempt and same accepted cart, when active reservation already exists, then response is idempotent and does not reserve stock twice; conflicting payloads return `IDEMPOTENCY_CONFLICT` or `CONFLICT_STATE`.
8. Given implementation finishes, when tests run, then tests cover valid reservation, unavailable inventory, stale price/quantity, checkout attempt denial, concurrent oversell prevention with 100 attempts, idempotent retry, partial failure cleanup, safe errors, and `npm run check`; blockers are documented if validation cannot pass.

## Tasks / Subtasks

- [x] Task 1: Lock scope and reuse current checkout stack. (AC: 1-8)
  - [x] Re-read every UPDATE file listed in Current Code Intelligence before editing. Worktree is heavily dirty; preserve owner edits.
  - [x] Extend existing `src/domain/checkout/cart-validation.ts`, `src/server/repositories/CheckoutRepository.ts`, `src/server/services/CheckoutService.ts`, `src/server/controllers/CheckoutController.ts`, and `src/server/routes/checkout.routes.ts`; do not create parallel checkout stack.
  - [x] Keep `POST /api/checkout/cart-validations` read-only and backward compatible for cart/details UI.
  - [x] Add reservation flow after `POST /api/checkout/details` and after accepted cart validation. Recommended endpoint: `POST /api/checkout/attempts/:attemptId/reservations`.
  - [x] Do not create PayMongo checkout sessions, payment records, webhooks, orders, order confirmation emails, payment emails, or fulfillment transitions in this story.
  - [x] Do not trust browser cart, customer ID, role, price, stock, status, or attempt ownership. Browser payload is input for server revalidation only.
  - [x] Preserve guest checkout. Customer auth is optional; signed-in Customer can attach server-side customer ID, guest uses attempt token/secret.

- [x] Task 2: Add secure checkout attempt reservation gate. (AC: 1, 4, 6, 7)
  - [x] Extend `checkout_attempts` schema/migration if needed with reservation-ready fields such as `attempt_token_hash` or equivalent signed attempt secret, `cart_fingerprint`, `reservation_id`, `reservation_expires_at`, `status`, and `updated_request_id`.
  - [x] If adding attempt secret, return opaque token once from `POST /api/checkout/details` and store only hash/server-verifiable form. Never log token or return hash.
  - [x] Reservation route must authorize attempt before validation/reservation:
    - signed-in Customer: `checkout_attempts.customer_id` must match server Customer actor ID.
    - guest: valid attempt token/secret must match the attempt.
    - wrong Customer, Admin/Super Admin cookie, missing token, stale/unknown attempt, or non-reservable status returns safe denial before stock mutation.
  - [x] Only attempts in `DETAILS_CAPTURED` or an explicitly retry-safe state can reserve. Existing active same-cart reservation returns existing reservation; conflicting active reservation returns conflict.
  - [x] Never accept `customerId`, `checkoutEmail`, `paymentStatus`, `orderStatus`, `reservationStatus`, or provider data from browser body.

- [x] Task 3: Define reservation domain contract and state transitions. (AC: 1-7)
  - [x] Add pure domain rules under `src/domain/checkout/**`, recommended `inventory-reservation.ts` plus tests, for reservation input validation, line planning, state transition decisions, and safe output mapping.
  - [x] Reuse `validateCheckoutCart` and `ValidatedCartLine` semantics. Valid cart is prerequisite; `CHANGED` and `BLOCKED` never reserve.
  - [x] Define reservation statuses: recommended `ACTIVE`, `RELEASED`, `EXPIRED`, `FAILED`; keep payment/fulfillment statuses separate.
  - [x] Define checkout attempt statuses at minimum: `DETAILS_CAPTURED`, `INVENTORY_RESERVED`, `RESERVATION_FAILED`; reserve future `PAYMENT_CREATED`/payment states for later stories.
  - [x] Define response data:
    - `attempt: { attemptId, status: "INVENTORY_RESERVED" }`
    - `reservation: { reservationId, status: "ACTIVE", expiresAt }`
    - `cart: CheckoutCartValidationSummary`
    - `next: { paymentAllowed: true, payMongoCreationRequired: true }`
  - [x] Do not expose `stock_version`, `stock_lock_version`, D1 row names, Durable Object object names, internal rollback markers, token hash, or raw provider/runtime errors.
  - [x] `PREORDER` remains sellable per current catalog semantics. If stock is zero, create reservation item with preorder mode and no stock decrement unless product owner changes preorder policy in docs.

- [x] Task 4: Add reservation persistence and atomic stock updates. (AC: 2, 5, 7)
  - [x] Add Drizzle schema and migration for reservation records. Recommended tables:
    - `checkout_reservations`: `id`, `checkout_attempt_id`, `status`, `cart_fingerprint`, `subtotal_centavos`, `expires_at`, `created_request_id`, `created_at`, `updated_at`.
    - `checkout_reservation_items`: `id`, `reservation_id`, `product_id`, `variant_id`, `quantity`, `price_centavos`, `reservation_mode`, `created_at`.
  - [x] Add indexes for `checkout_attempt_id`, `status`, `expires_at`, `variant_id`, and uniqueness preventing more than one active reservation per attempt/cart fingerprint.
  - [x] Add repository methods to read attempt, read current cart lines, create reservation, create reservation items, atomically decrement stock for stock-backed lines, release/rollback reservation items, and mark attempt status.
  - [x] Stock-backed reservation must use conditional update against current stock and version, e.g. `variant.stock >= requestedQty`, `stock_lock_version >= 0`, expected `stock_version`, and active product/variant constraints.
  - [x] On successful stock decrement, update `stock_version`, `updated_at`, and inventory state derived from new stock unless variant is `PREORDER`.
  - [x] On any line failure, release/decrement rollback all prior lines before returning. Partial active reservation is a bug.
  - [x] Use integer centavos only. Do not add money floats.

- [x] Task 5: Implement Durable Object coordination. (AC: 2, 3, 5)
  - [x] Replace placeholder `src/cloudflare/durable-objects/InventoryDurableObject.ts` with reservation coordinator logic, or add an adapter that calls it while keeping class in same file.
  - [x] Use existing `INVENTORY_DURABLE_OBJECT` binding from `wrangler.jsonc`; update generated types only if binding type needs generic RPC support.
  - [x] Recommended MVP strategy: one named DO coordinator for checkout inventory reservation, with D1 compare-and-swap inside coordinator. Alternative per-variant DO strategy is allowed only if sorted acquisition and rollback are documented and tested.
  - [x] DO protocol must be private to Worker code. Client/browser never calls DO directly.
  - [x] Prefer RPC public methods for new DO code on current compatibility date. Fetch handler may remain for health/private fallback if type constraints require it.
  - [x] DO must not import Astro, React, Elysia route context, or UI code. Keep provider access inside Worker-compatible adapter/repository code.
  - [x] Map DO failures to `PROVIDER_UNAVAILABLE` or `INVENTORY_UNAVAILABLE` with safe public messages.

- [x] Task 6: Add reservation endpoint and UI handoff state. (AC: 1, 4, 6, 7)
  - [x] Add route contract for `POST /api/checkout/attempts/:attemptId/reservations` with TypeBox params/body/response schemas, OpenAPI metadata, optional auth, roles `PROSPECT`/`CUSTOMER`, rate-limit class `checkout-payment`, and error codes.
  - [x] Controller returns standard envelopes with request ID using existing helpers.
  - [x] Service order: authorize attempt -> normalize cart items -> load current lines -> validate cart -> reserve through DO/repository -> persist reservation/attempt transition -> return safe response.
  - [x] Feature API helper in `src/features/cart-checkout/api.ts` should call reservation endpoint after checkout details and accepted cart validation.
  - [x] `CheckoutDetailsPage.tsx` and `CheckoutFlow.tsx` should keep Payment step blocked until reservation success; after success, show Payment step as next available without creating PayMongo flow.
  - [x] Pending/error/success copy must follow Direction 04: short, customer-safe, stage-based, no provider jargon.
  - [x] Preserve cart state and validated summary. Do not hide changed/blocked lines or force full page reload on reservation conflict.

- [x] Task 7: Add tests and QA gates. (AC: 1-8)
  - [x] Domain tests for reservation planning, valid cart prerequisite, changed cart no-reserve, blocked cart no-reserve, preorder behavior, idempotent same-cart retry, and conflicting retry.
  - [x] Repository/Miniflare D1 tests for reservation tables, checkout attempt ownership/status checks, atomic stock decrement, inventory state update, reservation item writes, active reservation uniqueness, and rollback on failure.
  - [x] DO/service concurrency test with at least 100 simultaneous attempts against limited stock; assert total active reserved quantity never exceeds starting stock and losing attempts are safe conflicts/unavailable.
  - [x] Route tests for OpenAPI metadata, request ID propagation, optional auth metadata, guest token success, signed-in Customer success, wrong Customer denial, Admin/wrong-realm ignored or denied, invalid attempt, stale cart conflict, unavailable inventory, idempotent retry, and safe envelopes.
  - [x] UI/API tests for reserve-after-details, payment blocked before reservation, payment step available after reservation, stale cart conflict copy, inventory unavailable copy, and retry without duplicate reserve.
  - [x] Update schema invariant tests to reject raw provider/payment/token fields on checkout attempts/reservations.
  - [x] Run targeted tests:
    - `npx vitest run src/domain/checkout/cart-validation.test.ts src/domain/checkout/contact-delivery.test.ts src/domain/checkout/inventory-reservation.test.ts`
    - `npx vitest run src/server/repositories/CheckoutRepository.test.ts src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts src/domain/schema-invariants.test.ts`
    - `npx vitest run src/features/cart-checkout/components/cart-ui.test.tsx src/features/cart-checkout/store.test.ts`
  - [x] Run `npm run check`. Run `npm run build-test` if targeted suites and check pass.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [x] Route auth metadata declares public/optional/required auth, roles, and rate-limit class.
- [x] N/A - Route-level RBAC guard runs before validation or side effects for protected endpoints; reservation endpoint is optional-auth guest/customer but must run attempt ownership/token guard before validation or stock mutation.
- [x] Service/controller enforces actor state before mutation: Customer actor must come from server session; guest must pass attempt token/secret; Admin/Super Admin cookies do not become Customer identity.
- [x] N/A - Brand-scoped reads or writes enforce active brand membership or elevated permission server-side; public checkout reservation uses published storefront catalog only, not brand admin scope.
- [x] Public/customer endpoints explicitly document why brand membership is not required.
- [x] Denial tests cover missing/invalid attempt token, wrong Customer actor, Admin/wrong realm actor, stale attempt, non-reservable status, existing conflicting reservation, and elevated actor path where applicable.
- [x] Error response uses safe envelope codes and does not leak provider/internal authorization details.
- [x] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial/error codes.

## Dev Notes

### Epic Context

- Epic 5 goal: guest or signed-in shoppers submit checkout with required email/contact/delivery details, inventory is reserved/validated, PayMongo state reconciles safely, webhooks are verified/idempotent, and payment emails send to checkout email.
- Story 5.1 is done and created checkout details capture plus `checkout_attempts`.
- Story 5.2 is the first story allowed to claim checkout inventory safety. It must prove no oversell under concurrent attempts.
- Story 5.3 must create PayMongo only from server reservation reference, not raw browser cart.
- Story 5.6 later releases reserved inventory after failed/cancelled payment; 5.2 still needs rollback for same-request failures and enough reservation data for later release.

### Current Code Intelligence

#### READ/UPDATE: `src/domain/checkout/cart-validation.ts`

- Current state: pure validation for browser cart snapshot against server lines; returns `VALID`, `CHANGED`, or `BLOCKED`. Sellable inventory states are `IN_STOCK`, `LOW_STOCK`, and `PREORDER`; `OUT_OF_STOCK`, unpublished products, archived variants, mismatches, and missing items block. Price/quantity changes require customer acceptance.
- What this story changes: reuse same validation before reservation; add reservation domain rules nearby instead of duplicating cart validation semantics.
- Preserve: payload caps, duplicate line rejection, customer-safe reasons, no internal stock/version exposure, and `PREORDER` sellable semantics unless docs change.

#### READ/UPDATE: `src/domain/checkout/contact-delivery.ts`

- Current state: Story 5.1 validates checkout email/contact/delivery details and rejects unknown identity/provider fields.
- What this story changes: no contact/delivery validation rewrite. Reservation should depend on existing checkout attempt created from these details.
- Preserve: PII minimization and normalized safe snapshot.

#### READ/UPDATE: `src/domain/schema/transactions.ts`

- Current state: `checkout_attempts` stores contact/delivery snapshot, nullable `customer_id`, `status` default `DETAILS_CAPTURED`, `created_request_id`, timestamps. `orders` and `order_snapshots` exist but are not complete payment/order flow.
- What this story changes: add reservation tables/fields and attempt state transition support.
- Preserve: nullable Customer reference for guest checkout, snake_case DB names, integer centavos for new money fields, payment/fulfillment separation.

#### READ/UPDATE: `migrations/0024_checkout_attempts.sql`

- Current state: creates `checkout_attempts` for Story 5.1.
- What this story changes: add next migration only; do not edit old migration unless project migration policy explicitly allows it.
- Preserve: remote-first migration habit; do not apply production migrations without review.

#### READ/UPDATE: `src/domain/schema/catalog.ts`

- Current state: `product_variants` has `stock`, `inventory_state`, `is_preorder`, `stock_version`, `stock_lock_version`, `price`, `variation_chain`, `product_id`. Archived variants use `stock_lock_version = -1`.
- What this story changes: reservation uses these fields for conditional stock decrement and state/version updates.
- Preserve: no duplicate variant `status` column; no public exposure of `stock_version` or `stock_lock_version`.

#### READ/UPDATE: `src/server/repositories/CheckoutRepository.ts`

- Current state: `findCartLines` reads published products and active variants; `createCheckoutAttempt` inserts contact snapshot. It filters product status and `stock_lock_version >= 0`.
- What this story changes: add attempt lookup, token/hash verification support, active reservation lookup, reservation creation, reservation item creation, atomic decrement/release methods, and cart fingerprint persistence.
- Preserve: public-only data reads, customer-safe mapping, Drizzle `createDb` pattern, no direct provider calls.

#### READ/UPDATE: `src/server/services/CheckoutService.ts`

- Current state: `validateCart` normalizes request items, calls repository, maps `CHANGED` to `CONFLICT_STATE`, `BLOCKED` to `INVENTORY_UNAVAILABLE`; `saveDetails` validates contact details and creates `DETAILS_CAPTURED` attempt.
- What this story changes: add `reserveInventory`/`reserveCart` use case with attempt guard, revalidation, DO coordination, idempotency, and rollback.
- Preserve: validation before side effects, `AppResult`/`GeneralError`, safe provider failure mapping, and no payment/order creation.

#### READ/UPDATE: `src/server/controllers/CheckoutController.ts`

- Current state: adapts `validateCart` and `saveDetails` to standard `{ data, meta }` or `{ error }` envelopes with request ID.
- What this story changes: add reservation controller method.
- Preserve: public error mapping through `publicErrorMessage` and `apiSuccessWithRequestId`/`apiErrorWithRequestId`.

#### READ/UPDATE: `src/server/routes/checkout.routes.ts`

- Current state: routes `POST /checkout/cart-validations` and `POST /checkout/details`; both use optional auth metadata, `checkout-payment` rate class, TypeBox schemas, and OpenAPI metadata.
- What this story changes: add reservation route and extend response schemas. Existing route descriptions that say "creates no reservation" remain true for those endpoints.
- Preserve: TypeBox schemas, `additionalProperties` protections, route descriptions, optional auth semantics, and existing tests.

#### READ/UPDATE: `src/cloudflare/durable-objects/InventoryDurableObject.ts`

- Current state: placeholder class extends `DurableObject` and returns `"Inventory Durable Object"` from fetch.
- What this story changes: implement real coordination for checkout reservation. This is the first story allowed to change this placeholder.
- Preserve: Worker-compatible code only; class export from `src/cloudflare/worker.ts`.

#### READ/UPDATE: `wrangler.jsonc` and `worker-configuration.d.ts`

- Current state: development/production envs bind `INVENTORY_DURABLE_OBJECT`; generated `Env` marks it optional `DurableObjectNamespace`.
- What this story changes: use binding from runtime env in checkout reservation path. Regenerate types only if needed.
- Preserve: env-scoped bindings; no root-level D1/R2/DO assumptions.

#### READ/UPDATE: `src/features/cart-checkout/api.ts`

- Current state: maps cart validation and checkout details requests.
- What this story changes: add reservation API helper and safe response mapping.
- Preserve: standard envelope handling and safe failure copy.

#### READ/UPDATE: `src/features/cart-checkout/components/CheckoutDetailsPage.tsx`

- Current state: details form, cart validation gate, successful details save, and payment blocked until details/cart validation.
- What this story changes: after details save and accepted cart validation, call reservation endpoint and unlock Payment step only on reservation success.
- Preserve: Direction 04 staged layout, form errors, cart preservation, guest/signed-in behavior, no PayMongo handoff.

#### READ/UPDATE: `src/features/cart-checkout/components/CheckoutFlow.tsx`

- Current state: renders stepper and summary rail; current step uses `aria-current="step"`.
- What this story changes: show reservation pending/success/blocker state and make Payment next-step explicit after reservation.
- Preserve: step labels, stable layout dimensions, `aria-current`, no fake receipt/order state.

#### READ/UPDATE: `src/features/cart-checkout/store.ts`

- Current state: browser cart remains convenience state in `jrw.cart.v1`; validation summaries are applied only when snapshot matches current cart.
- What this story changes: preserve validated cart/reservation result in feature state if needed, but do not make localStorage trusted source of reservation truth.
- Preserve: hydration race fixes from Story 4.5 and cart state through auth/details flow.

### Previous Story Intelligence

- Story 5.1 added `POST /api/checkout/details`, `checkout_attempts`, optional guest/customer auth, signed-in Customer server-side linking, Direction 04 UI, and `npm run build-test`/checkout viewport QA.
- Story 5.1 says no PayMongo, order, reservation, webhook, email, or inventory lock was created. 5.2 starts that reservation boundary.
- Story 4.5 review fixed unpublished data leakage, duplicate cart line stock bypass, payload caps, stale response replay, direct checkout revalidation, changed price visibility, and suggested action display. Do not regress any.
- Story 3.6 added inventory state/stock management and `stock_version`; it explicitly left checkout oversell safety for Epic 5.
- Story 3.8 added order snapshot fields for future orders. 5.2 should preserve line data needed by 5.3/5.5 but not create full orders.

### Git Intelligence Summary

- Recent commits:
  - `83795e5 chore: 5-1 reviewed`
  - `004abac feat: 5-1 implemneted`
  - `c5d0395 feat: 5-1 story created`
  - `98d2e1c docs: retrospective 4 completed`
  - `fc94343 chored: 4-11 reviewed`
- Worktree is heavily dirty across `.agents`, `_bmad-output`, migrations, docs, source, and generated files. Treat unrelated changes as owner changes.
- Current checkout files already include Story 5.1 code. Edit narrowly and preserve existing patterns.

### Architecture Compliance

- Route flow remains Route -> Controller -> Service -> Domain/Repository.
- Business rules and state transitions belong in `src/domain/**`; D1/DO access belongs in repository/infrastructure adapter code.
- Runtime code must be Cloudflare Workers-compatible. No Node-only APIs in request path or Durable Object.
- Public API responses use `{ data, meta }` or `{ error: { code, message, details? } }`.
- Use TypeBox/Elysia `t` schemas for route contracts and OpenAPI.
- D1 remains source of truth; DO coordinates reservation serialization and can use D1 via env binding or repository adapter.
- Payment state and fulfillment/order state stay separate. 5.2 should not introduce a combined `status` that later stories must unwind.
- Brand membership is not required for shopper checkout reservation because only public published storefront sellability data is used.

### Design Direction Fidelity

- Source: `_bmad-output/planning-artifacts/ux-design-directions.html#direction-04`.
- Direction 04: staged checkout with Cart, Details, Payment, Receipt/Confirmation. Reservation success should unlock Payment step; reservation failure should keep user in checkout with safe blocker copy.
- Source: `_bmad-output/planning-artifacts/ux-design-specification.md#CheckoutSteps`.
- Checkout steps must show current/complete/blocked states and current step with `aria-current`.
- Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns`.
- Inventory reservation failure should be inline, text-first, retry-safe, and customer-safe.
- Preserve sharp 1px module style, no shadows/blur, shared `Button` hover/focus contract, responsive text non-overlap, and no `jrw-*` CSS resurrection.

### Latest Technical Information

- Cloudflare Durable Objects are intended for coordination among clients and provide strongly consistent storage per object; SQLite-backed DO storage is generally available and new classes should use SQLite storage configuration. Source: https://developers.cloudflare.com/durable-objects/
- Cloudflare DO storage methods are atomic/isolated, and `transactionSync` rolls back if callback throws. Use that for DO-local reservation metadata if storing coordinator state. Source: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- Cloudflare recommends RPC methods for new Durable Object projects on compatibility dates >= 2024-04-03; fetch handler remains valid for HTTP request/response flows. Current project compatibility date is `2026-04-28`. Source: https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests/
- Cloudflare D1 binding is accessed from Worker `env.DB`; D1 Sessions provide sequential consistency for queries through that session but are not a substitute for checkout-level locking. Use primary reads/conditional writes and DO coordination for reservation. Source: https://developers.cloudflare.com/d1/worker-api/d1-database/
- Drizzle update supports `.returning(...)` and SQLite `UPDATE ... FROM` support exists in Drizzle >= 0.36.3. Repo pins `drizzle-orm` 0.45.2, so returning IDs/versions from reservation updates is acceptable if D1 supports generated SQL. Source: https://orm.drizzle.team/docs/update
- Elysia uses TypeBox by default; keep route contracts in current Elysia/TypeBox style. Source: https://elysiajs.com/patterns/typebox

### Testing Requirements

- Minimum gate:
  - `npx vitest run src/domain/checkout/cart-validation.test.ts src/domain/checkout/contact-delivery.test.ts src/domain/checkout/inventory-reservation.test.ts`
  - `npx vitest run src/server/repositories/CheckoutRepository.test.ts src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts src/domain/schema-invariants.test.ts`
  - `npx vitest run src/features/cart-checkout/components/cart-ui.test.tsx src/features/cart-checkout/store.test.ts`
  - `npm run check`
- Run `npm run build-test` after targeted suites pass because checkout inventory safety is payment-adjacent.
- Add or update Playwright checkout viewport QA only if UI layout/state changes beyond text/buttons already covered by component tests.
- If DO/Miniflare support blocks direct DO integration testing, document blocker and still prove oversell prevention at service/repository level with 100 concurrent attempts and conditional D1 writes.

### Anti-Patterns To Avoid

- Do not create PayMongo checkout from browser cart.
- Do not decrement stock without reservation record and rollback path.
- Do not reserve twice on double click/retry.
- Do not trust localStorage cart state as authority.
- Do not expose raw stock count beyond safe `maxQuantity`, stock versions, lock versions, R2 keys, token hashes, D1 errors, or Durable Object names.
- Do not model brands as sellers/merchants or require brand membership for shopper checkout.
- Do not add card fields, PayMongo tokens, raw provider payloads, webhook code, order confirmation, or emails.
- Do not store money as floats in new checkout/reservation tables.
- Do not use legacy `src/api/**`.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 5.2`
- `_bmad-output/planning-artifacts/prd.md#Functional Requirements`
- `_bmad-output/planning-artifacts/prd.md#Performance & Reliability`
- `_bmad-output/planning-artifacts/architecture.md#Data Architecture`
- `_bmad-output/planning-artifacts/architecture.md#Frontend Architecture`
- `_bmad-output/planning-artifacts/ux-design-specification.md#CheckoutSteps`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/5-1-checkout-identity-contact-and-delivery-validation.md`
- `_bmad-output/implementation-artifacts/4-5-availability-blocking-before-checkout.md`
- `_bmad-output/implementation-artifacts/3-6-manage-stock-quantity-and-inventory-state.md`
- `src/domain/checkout/cart-validation.ts`
- `src/server/routes/checkout.routes.ts`
- `src/server/services/CheckoutService.ts`
- `src/server/repositories/CheckoutRepository.ts`
- `src/domain/schema/transactions.ts`
- `src/domain/schema/catalog.ts`
- `src/cloudflare/durable-objects/InventoryDurableObject.ts`
- `wrangler.jsonc`
- https://developers.cloudflare.com/durable-objects/
- https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests/
- https://developers.cloudflare.com/d1/worker-api/d1-database/
- https://orm.drizzle.team/docs/update
- https://elysiajs.com/patterns/typebox

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npx vitest run src/domain/checkout/cart-validation.test.ts src/domain/checkout/contact-delivery.test.ts src/domain/checkout/inventory-reservation.test.ts`
- `npx vitest run src/server/repositories/CheckoutRepository.test.ts src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts src/domain/schema-invariants.test.ts`
- `npx vitest run src/features/cart-checkout/components/cart-ui.test.tsx src/features/cart-checkout/store.test.ts`
- `npx vitest run src/lib/crypto/opaque-token.test.ts src/server/services/CheckoutService.test.ts src/domain/auth/session-credentials.test.ts src/server/services/AuthService.test.ts`
- `npm run check`
- `npm run build-test`

### Completion Notes List

- Added hashed checkout attempt token gate and reservation endpoint `POST /api/checkout/attempts/:attemptId/reservations`.
- Added reservation domain contract, D1 reservation persistence, conditional stock decrement/release, active reservation idempotency, and safe conflict/denial envelopes.
- Replaced placeholder Inventory Durable Object with private Worker-only reservation coordinator path; runtime routes delegate to DO when binding exists and fall back to direct optimistic stock updates in tests.
- Updated checkout details UI/API to reserve after validated details and unlock Payment step only after reservation success; no PayMongo/order/email/webhook flow added.
- Added tests for stale cart denial, wrong token/customer denial, idempotent retry, partial rollback, reservation persistence, schema safety, route metadata/envelopes, UI handoff, and 100 concurrent oversell prevention.
- Follow-up: moved checkout attempt token generation/hash/verify to reusable `src/lib/crypto/opaque-token.ts`; session token helper now wraps the same abstraction.

### File List

- `_bmad-output/implementation-artifacts/5-2-server-cart-validation-and-inventory-reservation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `migrations/0025_checkout_inventory_reservations.sql`
- `src/cloudflare/durable-objects/InventoryDurableObject.ts`
- `src/domain/checkout/inventory-reservation.ts`
- `src/domain/checkout/inventory-reservation.test.ts`
- `src/domain/schema/transactions.ts`
- `src/domain/schema-invariants.test.ts`
- `src/features/cart-checkout/api.ts`
- `src/features/cart-checkout/components/CheckoutDetailsPage.tsx`
- `src/features/cart-checkout/components/CheckoutFlow.tsx`
- `src/features/cart-checkout/components/cart-ui.test.tsx`
- `src/lib/crypto/opaque-token.ts`
- `src/lib/crypto/opaque-token.test.ts`
- `src/lib/crypto/session-token.ts`
- `src/server/controllers/CheckoutController.ts`
- `src/server/repositories/CheckoutRepository.ts`
- `src/server/repositories/CheckoutRepository.test.ts`
- `src/server/routes/checkout.routes.ts`
- `src/server/routes/checkout.routes.test.ts`
- `src/server/services/CheckoutService.ts`
- `src/server/services/CheckoutService.test.ts`

### Change Log

- 2026-06-12: Implemented Story 5.2 server cart validation and inventory reservation with tests/check/build gates passing.
- 2026-06-12: Added reusable opaque-token crypto helper and switched checkout reservation gate to it.
