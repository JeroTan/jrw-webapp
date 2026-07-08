# Story 6.1: Shopper Own-Order Status View

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Shopper,
I want to view my own order status through account history or safe guest receipt/status access,
so that I can track payment, fulfillment, return, and refund state safely.

## Acceptance Criteria

1. Given a Customer is authenticated and active, when they request their order list, then only orders with `orders.customer_id` matching the Customer actor are returned, the response uses the standard `{ data, meta }` envelope, and Admin/Super Admin/anonymous actors cannot read customer orders through this route.
2. Given a Customer opens an order detail from account history, when the order belongs to the authenticated Customer, then the response returns safe order detail with order number, item snapshots, totals, payment lane, fulfillment lane, return lane, refund lane, and timestamps; no PayMongo payload, checkout URL, signatures, raw provider IDs, card data, secrets, tokens, phone, street address, or delivery notes are exposed.
3. Given a Customer attempts to access another Customer order, when the request is processed, then the system returns the documented forbidden/not-found contract without leaking whether the other order exists, and route/controller/service tests prove the repository is not bypassed by query params or browser state.
4. Given a guest Shopper uses receipt/status access, when the existing checkout receipt/status lookup is valid or a new signed guest order-access token is valid, then only that payment/order status is shown; raw email lookup, `?email=`, checkout phone/address lookup, and open order-number lookup do not expose orders.
5. Given an order includes historical product snapshots, when list or detail renders, then product name, variant label/options, unit price, quantity, line total, and optional image reference come from `order_snapshots` only; mutable catalog/product rows may not change historical order display.
6. Given `order_snapshots.image_r2_key` is currently nullable and Epic 5 left frozen image references as debt, when an item snapshot has no image reference, then UI renders a deliberate no-image/initial/text fallback and does not fetch current catalog images as if they were historical snapshots.
7. Given payment, fulfillment, return, and refund status are shown, when Shopper reads list/detail/guest status UI, then each lane uses customer-safe text labels, status values stay separate in data/API/UI, unknown values degrade to safe unavailable labels, and color is never the only status signal.
8. Given `/account/orders` and `/account/orders/[orderId]` render, when viewed on mobile and desktop, then account shell navigation remains intact, order list/detail replace the placeholder, Direction 06 Order Truth Timeline anatomy is followed, 44px touch targets and cobalt 2px focus outlines remain, text does not overflow, and JRW tokens use 0px radius, 1px borders, no shadows, no blur.
9. Given API docs are generated, when OpenAPI is inspected, then order routes include tags, summaries, descriptions, auth metadata, rate-limit class, request/response schemas, pagination bounds, and error codes.
10. Given implementation finishes, when tests and QA run, then checks cover signed-in order list, signed-in order detail, guest receipt/status access, raw email lookup denial, cross-customer denial, snapshot display, safe labels, route metadata, mobile/desktop layout, and `npm run check`; blockers are documented if validation cannot pass.

## Tasks / Subtasks

- [x] Task 1: Lock scope and domain shape. (AC: 1-10)
  - [x] Implement read-only Shopper order status only.
  - [x] Do not implement Admin order list/detail, fulfillment transitions, return/refund mutation, refund payment execution, customer self-service returns, broad guest order search, or audit history UI.
  - [x] Use canonical fields: `orders.payment_status`, `orders.fulfillment_status`, `orders.subtotal_centavos`, `orders.total_centavos`, `orders.currency`, `orders.created_at`, `orders.updated_at`, and `order_snapshots`.
  - [x] Ignore legacy `orders.status`, `orders.status_description`, and `orders.total_amount real` for new customer order APIs except if a compatibility test needs to prove they are not used.
  - [x] Keep return/refund lanes read-only. Until Story 6.4/6.5 adds records, return status is `RETURN_NOT_REQUESTED` and refund status is `REFUND_NOT_REQUESTED`.

- [x] Task 2: Add pure order status/read-model helpers. (AC: 2, 5-7)
  - [x] Add `src/domain/orders/**`, recommended `customer-order-status.ts` or `order-status.ts`.
  - [x] Define public lane values and labels for payment, fulfillment, return, and refund.
  - [x] Map current fulfillment values from code (`ORDER_PLACED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`) and tolerate PRD/future values safely.
  - [x] Format status lanes as data, not JSX: `{ kind, value, label, updatedAt }`.
  - [x] Add pure tests for known labels, unknown fallback, separate status lanes, default return/refund lanes, and no provider/internal labels.

- [x] Task 3: Add customer order repository. (AC: 1-7)
  - [x] Add `src/server/repositories/OrderRepository.ts` and `OrderRepository.test.ts`.
  - [x] Implement `listCustomerOrders({ customerId, page, pageSize })` with default page size 20 and max page size 50 unless existing route pattern requires a different cap.
  - [x] Implement `getCustomerOrderDetail({ customerId, orderIdOrNumber })` using `and(eq(orders.customer_id, customerId), ...)`; never fetch by order ID first and check ownership later in service/UI.
  - [x] Read snapshots from `order_snapshots`; sort deterministically by `snapshot_timestamp`, then `id`.
  - [x] Return safe DTO fields only. Do not return checkout email, phone, street address, barangay, city/province, postal code, provider checkout session ID, provider reference, checkout URL, request IDs, or email send message IDs.
  - [x] For guest receipt/status detail, either extend the existing `findPaymentReturnRecord` path or add a focused guest-read repository method using payment/attempt IDs from signed context. Do not add raw email lookup.

- [x] Task 4: Add order service and controller. (AC: 1-4, 7, 9)
  - [x] Add `src/server/services/OrderService.ts` and `OrderService.test.ts`.
  - [x] Require actor `{ authenticated: true, role: "CUSTOMER", actorId }` for signed-in list/detail.
  - [x] Return `AUTH_REQUIRED` for anonymous signed-in endpoints and `AUTH_FORBIDDEN` for wrong realm if route guard does not already block it.
  - [x] For cross-customer detail, prefer `RESOURCE_NOT_FOUND` to prevent order enumeration unless current endpoint contract explicitly chooses `AUTH_FORBIDDEN`; document whichever is chosen.
  - [x] Add `src/server/controllers/OrderController.ts` as transport adapter only. Keep ownership and read-model decisions in service/repository/domain helpers.
  - [x] Preserve standard `AppResult` and `apiSuccessWithRequestId` / `apiErrorWithRequestId` response patterns.

- [x] Task 5: Add customer order API routes. (AC: 1-4, 9)
  - [x] Add `src/server/routes/orders.routes.ts` and `orders.routes.test.ts`.
  - [x] Recommended paths: `GET /api/customer/orders` and `GET /api/customer/orders/:orderId`.
  - [x] Use `/api/customer/orders*` unless there is a deliberate reason to use `/api/orders*`; `request-context.ts` already treats `/api/customer/` as Customer realm. If `/api/orders*` is chosen, update `sessionRealmForPath` and add regression tests so Customer cookie is used, not Admin cookie.
  - [x] Register route in `src/server/routes/index.ts` and `CreateAppOptions.routes` in `src/server/app.ts`.
  - [x] `serverRouteGroups` already lists `orders`; keep it aligned.
  - [x] Route metadata: auth required `CUSTOMER`, rate-limit class `public-read` or stricter customer read class if existing taxonomy supports it, tags `Orders`, documented errors `AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `RESOURCE_NOT_FOUND`, `VALIDATION_FAILED`, `INTERNAL_ERROR`.
  - [x] Schemas must validate pagination and response DTOs. No additional query properties that look like raw email lookup.
  - [x] OpenAPI test must assert metadata and path docs.

- [x] Task 6: Preserve and extend guest receipt/status access. (AC: 4, 7-8)
  - [x] Existing public `GET /api/checkout/payment-return` is valid guest receipt/status access through server-owned checkout references.
  - [x] Extend existing receipt/status DTO only as needed to include return/refund lanes/timestamps for confirmed orders.
  - [x] If a separate guest order endpoint is introduced, use a signed token carrying internal attempt/payment/order IDs only; do not encode raw email, phone, address, provider session, or checkout URL.
  - [x] Do not reuse `receiptAccountPrefill` token for broad order access unless purpose/name/tests make the scope clear. A new token purpose such as `guest-order-access` is safer if detail page access needs a token.
  - [x] Tests must deny `?email=buyer@example.test`, open order number lookup, mismatched attempt/payment IDs, expired/invalid signed context, and provider-looking IDs.

- [x] Task 7: Build customer account order UI. (AC: 1-8, 10)
  - [x] Replace placeholder in `src/pages/account/orders/index.astro`.
  - [x] Add `src/pages/account/orders/[orderId].astro`.
  - [x] Add React panels under `src/features/customer-account/**`, recommended `CustomerOrdersPanel.tsx` and `CustomerOrderDetailPanel.tsx`, or a focused `orders/` subfolder inside the feature.
  - [x] Extend `src/features/customer-account/api.ts` with typed fetchers and validators for order list/detail.
  - [x] Keep `AccountDashboardShell` navigation and protected page middleware behavior unchanged.
  - [x] List view should show order number, date, item count, total, payment label, fulfillment label, and detail action.
  - [x] Detail view should show snapshot items, totals, and four status lanes. It may omit delivery/contact PII for this story.
  - [x] Loading, empty, forbidden/session-expired, not-found, and provider/unavailable states must use safe copy and no technical internals.
  - [x] Use shared `Button`/`ButtonLink`; no custom SVG, no resurrected `IconButton`, no one-off `jrw-*` CSS classes.

- [x] Task 8: Snapshot image strategy. (AC: 5-6)
  - [x] Minimum accepted: display snapshot item text and a deliberate no-image fallback when `image_r2_key` is null.
  - [x] Do not use current product primary images as historical snapshot images.
  - [x] If adding frozen image reference is chosen in this story, update payment item/order snapshot creation path and create next migration after `0032_checkout_payment_status_email.sql`; apply development D1 only after review.
  - [x] Add tests proving catalog product name/image changes do not alter returned order snapshot DTO.

- [x] Task 9: Validation gates. (AC: 1-10)
  - [x] Domain tests: `npx vitest run src/domain/orders/customer-order-status.test.ts`.
  - [x] Repository/service/route tests: `npx vitest run src/server/repositories/OrderRepository.test.ts src/server/services/OrderService.test.ts src/server/routes/orders.routes.test.ts`.
  - [x] Existing route/context regressions: `npx vitest run src/server/routes/customer.routes.test.ts src/server/routes/payment-return.routes.test.ts src/server/context/request-context.test.ts` if a context test exists, otherwise add coverage in route tests.
  - [x] UI/client tests: `npx vitest run src/features/customer-account/customer-account-ui.test.tsx`.
  - [x] Payment return UI regression if guest DTO changes: `npx vitest run src/features/cart-checkout/components/cart-ui.test.tsx`.
  - [x] Run `npm run check`.
  - [x] Run `npm run build-development` after route/schema/Worker wiring changes.
  - [x] Document responsive/manual QA at 320, 375, 768, 1024, and 1440 widths, or document blocker. Seeded fixture gap from Epic 5 may be blocker.

### Review Findings

- [x] [Review][Patch] Extend D1 repository test timeout [src/server/repositories/OrderRepository.test.ts:238] - Miniflare/D1 setup exceeded Vitest default 5s timeout, so the targeted 6-1 validation suite failed before assertions. Fixed by matching existing D1 repository test timeout policy.
- [x] [Review][Patch] Add customer order pagination controls [src/features/customer-account/CustomerOrdersPanel.tsx:67] - list API supports paged order history, but the account UI always fetched page 1 and gave shoppers no way to reach older orders. Fixed with previous/next controls and UI coverage.

## Endpoint Guard Checklist

Complete for every new or changed endpoint/job. Mark non-applicable items as `N/A` with reason.

- [x] Route auth metadata declares public/optional/required auth, roles, and rate-limit class.
- [x] Route-level RBAC guard runs before validation or side effects for protected endpoints.
- [x] Service/controller enforces actor state before mutation: authenticated, active, verified, approved.
- [x] Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. N/A - own-order Customer reads are not brand-scoped Admin operations.
- [x] Public/customer endpoints explicitly document why brand membership is not required.
- [x] Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable. N/A for brand membership.
- [x] Error response uses safe envelope codes and does not leak provider/internal authorization details.
- [x] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes.

For this story:

- Signed-in order list/detail endpoints are Customer-only. They require `CUSTOMER` actor from Customer realm session and active/verified account state according to current RBAC guard behavior.
- Brand membership is `N/A` because own-order reads are Customer account reads, not brand/catalog Admin reads.
- Admin and Super Admin cookies must not authenticate Customer order routes.
- Guest receipt/status remains public only through high-entropy checkout references or signed guest token. Public endpoint must document why no brand membership is required and why raw email lookup is not supported.
- Denial tests must cover anonymous, Admin, Super Admin, suspended/unverified Customer if guard supports it, cross-customer order, unknown order, raw email lookup, and invalid guest token/context.

## Dev Notes

### Epic Context

- Epic 6 goal: Customers and Admins can track orders; Admins can progress fulfillment and record manual return/refund history with safe customer labels.
- Story 6.1 is read-only Shopper status. It creates the customer-safe order read model that later Epic 6 stories extend.
- Story 6.2 owns Admin order list/detail and PII needed for fulfillment.
- Story 6.3 owns fulfillment transitions and fulfillment emails.
- Story 6.4 and 6.5 own manual return/refund recording.
- Story 6.6 owns broader order truth timeline/status UX polish once lanes have real mutation sources.

### Current Code Intelligence

#### READ/UPDATE: `src/pages/account/orders/index.astro`

- Current state: placeholder inside `AccountDashboardShell`, copy says order history connects later.
- What this story changes: replace placeholder with real customer order list panel, likely `client:load`.
- Preserve: `StorefrontLayout`, full-width account workspace class pattern, `mainAriaLabel="Customer orders"`, protected customer page behavior.

#### NEW: `src/pages/account/orders/[orderId].astro`

- Purpose: protected customer order detail page.
- Use `StorefrontLayout` and `AccountDashboardShell currentSection="orders"`.
- Page guard already protects `/account/orders/*` in `customer-page-guard.ts`; keep route inside that path.

#### READ/UPDATE: `src/features/customer-account/components/AccountDashboardShell.tsx`

- Current state: account sidebar/dropdown has Profile and Orders links; Orders section title/description are generic future-state copy.
- What this story changes: maybe order-specific title/description override from order panels.
- Preserve: sidebar/mobile details behavior, skip link, `aria-current`, 0px/1px token styling, no storefront header chrome inside account workspace.

#### READ/UPDATE: `src/features/customer-account/api.ts`

- Current state: owns Customer account API client helpers, envelope parser, safe error class, registration prefill, profile calls, Google OAuth start URL.
- What this story changes: add order list/detail DTO types, validators, and fetchers.
- Preserve: `credentials: "same-origin"`, safe fallback copy, no Admin auth route imports, no raw email in URLs.

#### READ/UPDATE: `src/features/customer-account/customer-account-ui.test.tsx`

- Current state: asserts account shell, profile/register/sign-in behavior, safe return paths, and no Admin realm coupling.
- What this story changes: add order list/detail UI tests and client fetcher tests.
- Preserve: Admin boundary assertions and safe copy style.

#### READ/UPDATE: `src/server/context/request-context.ts`

- Current state: `/api/customer/`, `/api/customers`, `/api/checkout`, `/api/oauth/google`, and `/api/email-verifications` use Customer realm session; everything else defaults to Admin realm.
- What this story changes: no change if using `/api/customer/orders`. If route path uses `/api/orders`, update `sessionRealmForPath` and add tests.
- Preserve: Admin/Customer realm isolation. Same email string in both realms must not cross-authenticate.

#### READ/UPDATE: `src/server/routes/index.ts` and `src/server/app.ts`

- Current state: no orders route mounted. `serverRouteGroups` already includes `orders`, but `serverRoutes` does not import/use `orders.routes.ts`; `ServerRoutesOptions` has no `orders` option.
- What this story changes: add `ordersRoutes`, `OrderRoutesOptions`, `routes.orders`, and operational logger wiring if service logs failures.
- Preserve: route composition order, thin options pattern, no God route file.

#### NEW: `src/server/routes/orders.routes.ts`

- Purpose: Elysia route module for Customer order list/detail.
- Use TypeBox schemas through `t` and `tboxApiSuccess(...)`.
- Use `routeDetail(...)` for OpenAPI metadata.
- Use `rbacGuard({ mode: "required", roles: ["CUSTOMER"] })` before controller execution.

#### NEW: `src/server/controllers/OrderController.ts`

- Purpose: transport to service adapter, mirroring `CustomerAccountController` and `PaymentReconciliationController`.
- Keep error mapping through existing `errorCodeToHttpStatus`, `publicErrorMessage`, `apiSuccessWithRequestId`, and `apiErrorWithRequestId`.

#### NEW: `src/server/services/OrderService.ts`

- Purpose: actor checks, use-case orchestration, result mapping.
- Keep ownership rules here and repository predicates. Do not rely on UI hiding or route query filters for access control.

#### NEW: `src/server/repositories/OrderRepository.ts`

- Purpose: D1/Drizzle reads for customer-owned orders and snapshots.
- Use typed Drizzle `select`, joins, `and`, `eq`, `or`, `desc`, `asc` patterns already used in repository files.
- List query must filter by `orders.customer_id` before returning rows.
- Detail query must include ownership predicate in SQL.

#### READ/UPDATE: `src/domain/schema/transactions.ts`

- Current state: `orders` has canonical checkout/order columns plus legacy `status` and `total_amount`; `order_snapshots` stores names/variant/options/centavos/quantity and nullable `image_r2_key`.
- What this story changes: likely no schema change. If adding frozen image reference, create next migration after `0032_checkout_payment_status_email.sql`.
- Preserve: money as integer centavos for new DTOs; payment and fulfillment separate.

#### READ/UPDATE: `src/server/repositories/OrderConfirmationRepository.ts`

- Current state: creates orders from paid payments, ensures snapshots, builds public payment receipt, and creates signed account prefill context for confirmed guest receipts.
- What this story changes: may share read-model helpers or extend receipt DTO for return/refund lanes.
- Preserve: one order per payment/attempt/reservation, paid row priority, no public email/contact/provider leakage.

#### READ/UPDATE: `src/domain/payments/payment-receipt.ts` and `src/domain/payments/payment-reconciliation.ts`

- Current state: public receipt labels for payment/fulfillment and return statuses for payment-return.
- What this story changes: extend or compose with order status helpers so guest status and account order detail use consistent labels.
- Preserve: provider-free, UI-free domain helpers.

#### READ/UPDATE: `src/server/routes/payment-return.routes.ts`, `src/features/cart-checkout/api.ts`, and `src/features/cart-checkout/components/PaymentReturnStatus.tsx`

- Current state: public receipt/status access already shows item snapshots, totals, payment status, fulfillment status, inbox reassurance, and optional account CTA.
- What this story changes: only if guest receipt/status must show return/refund lanes/timestamps. Keep public lookup high-entropy and safe.
- Preserve: no raw provider internals, no raw email, no inline duplicate actions, checkout shell receipt step, summary rail action ownership.

#### READ/UPDATE: `src/middleware/auth/customer-page-guard.ts`

- Current state: protects `/account/profile` and `/account/orders` including subpaths; authenticated Customer pages get `locals.customerActor`.
- What this story changes: likely no change.
- Preserve: redirect to sign-in with sanitized `returnTo`; no client-only auth gate as primary protection.

### Previous Epic Intelligence

- Epic 5 completed checkout details, inventory reservation, PayMongo handoff, webhook verification, payment reconciliation, order confirmation, inventory release, receipt/status UI, and payment status emails.
- Epic 5 retrospective warns: order APIs must use canonical `payment_status`, `fulfillment_status`, and centavos fields; legacy `orders.status` and `orders.total_amount real` remain debt.
- Epic 5 retrospective warns: `checkout_payment_items` lacks frozen image reference; `order_snapshots.image_r2_key` may be `null`. Story 6.1 must handle null image snapshots honestly.
- Epic 5 retrospective warns: receipt/status browser QA lacks seeded fixture support. Story 6.1 should document manual QA blocker if no deterministic fixture exists.
- Story 5.7 created safe receipt DTO/UI, inbox reassurance, account CTA, and terminal status email idempotency. Reuse those safety boundaries for guest order status.
- Story 5.5/5.6 fixed duplicate webhook/page-refresh, paid row priority, and inventory release retry behavior. Order reads must not trigger payment/order/inventory side effects.

### Git Intelligence Summary

- Recent commits:
  - `fd79d43 chore: epic 5 reviewed?`
  - `d24955d chore: reviewed 5-7`
  - `a23fe6c chore: error fixing`
  - `9ac863d docs: story 5-7 created`
  - `afe9543 chore: 5-6 reviewed`
- Current repo already includes Story 5.7 code: payment status notifier, `payment_status_email_*` schema/migration, safe receipt DTO, guest account prefill, and account orders placeholder.

### Architecture Compliance

- Use Route -> Controller -> Service -> Domain/Repository layering.
- D1/Drizzle remains source of truth for order reads.
- Domain status label/read-model helpers must be testable without HTTP, D1, PayMongo, Resend, Astro, Elysia, or React.
- Customer order APIs must stay in Customer realm. Do not query Admin account storage or accept Admin cookies.
- Public guest access must remain tied to server-owned checkout references or signed internal ID context. No raw email lookup.
- Payment, fulfillment, return, refund, inventory, and order states stay separate.
- API responses use `{ data, meta }` or `{ error }` with request ID.
- Runtime code must stay Cloudflare Workers-compatible. No Node-only APIs in request path.
- Remote D1 migration policy applies if schema changes: development first, production only after review.

### Design Direction Fidelity

- Source: `_bmad-output/planning-artifacts/ux-design-directions.html#direction-06`.
- Direction 06 is "Order Truth Timeline": payment, fulfillment, return, and refund stay separate, customer labels remain safe, timeline cards use text status labels above lane titles, and timeline grid uses hard 1px borders.
- The account order list/detail should also respect customer account shell rules from existing `AccountDashboardShell`.
- On desktop, detail may use four lane columns when width allows; on mobile, stack lanes with stable order: Payment, Fulfillment, Return, Refund.
- Status labels must include text; color alone is not enough.
- Use JRW Technical Brutalist tokens: 0px radius, 1px borders, no shadows, no blur, Satoshi headings, Space Mono/system labels, cobalt only for focus/primary/selected/live status.
- Button/ButtonLink hover/focus must use 2px cobalt outline with 2px offset.
- Required UI done evidence: component tests asserting visual contract classes, responsive/manual QA notes, or documented QA blocker. Type checks alone are not enough.

### Latest Technical Information

- Elysia OpenAPI docs state route `detail` fields follow OpenAPI V3 and are passed into generated route documentation. Keep route metadata explicit for order list/detail. Source: https://elysiajs.com/patterns/openapi
- Drizzle join docs show typed `select().from(...).leftJoin(...)` patterns; use typed joins/predicates for order/snapshot reads instead of ad hoc string assembly. Source: https://orm.drizzle.team/docs/joins
- Drizzle D1 docs state Drizzle supports Cloudflare D1 and Workers and mirrors SQLite-like query methods. Keep D1 access inside repositories/adapters. Source: https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1
- Astro Cloudflare docs for Astro 6 say Cloudflare environment is determined during build via `CLOUDFLARE_ENV`; run `npm run build-development` after route/schema wiring changes. Source: https://docs.astro.build/en/guides/integrations-guide/cloudflare/

### Testing Requirements

- Minimum targeted suites are listed in Task 9.
- Repository tests must prove SQL ownership predicates prevent cross-customer access.
- Route tests must prove `rbacGuard` blocks before controller execution for anonymous/Admin/Super Admin actors.
- UI tests must assert no raw strings such as `checkout_url`, `providerCheckoutSession`, `PayMongo payload`, raw email lookup, phone, address, token, secret, signature, card, or stack trace appear in rendered order markup.
- Guest tests must prove raw email lookup does not expose orders.
- Snapshot tests must prove current catalog edits do not change returned historical order item name/variant/price/quantity.
- Run `npm run check`. Run `npm run build-development` after route/schema/Worker wiring changes.

### Anti-Patterns To Avoid

- Do not implement `/api/orders?email=...`.
- Do not accept order number alone as guest access.
- Do not use Admin session/cookie to authenticate Customer order routes.
- Do not query Admin account storage from customer order code.
- Do not expose checkout email, phone, address, checkout URL, provider IDs, provider payloads, card data, signatures, tokens, secrets, stack traces, request IDs from internal mutations, or email message IDs.
- Do not combine payment, fulfillment, return, and refund into one `status`.
- Do not use legacy `orders.status` or `orders.total_amount real` for new customer order read models.
- Do not display current catalog image/name as historical order truth.
- Do not add Admin operations, fulfillment transitions, return/refund recorders, or automated PayMongo refund behavior.
- Do not move business logic into React, Astro pages, route handlers, or API client validators.
- Do not create one-off CSS class layers or resurrect `jrw-*`.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 6.1`
- `_bmad-output/planning-artifacts/prd.md#Orders, Fulfillment, Returns & Refunds`
- `_bmad-output/planning-artifacts/prd.md#Technical Constraints`
- `_bmad-output/planning-artifacts/architecture.md#Unified Project Structure`
- `_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping`
- `_bmad-output/planning-artifacts/architecture.md#Data Flow`
- `_bmad-output/planning-artifacts/ux-design-specification.md#OrderTimeline`
- `_bmad-output/planning-artifacts/ux-design-specification.md#OrderReceipt`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-06`
- `docs/design-by-google-stitch.md`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/epic-5-retro-2026-07-08.md`
- `_bmad-output/implementation-artifacts/5-7-checkout-receipt-payment-status-and-payment-emails.md`
- `src/domain/schema/transactions.ts`
- `src/domain/payments/payment-receipt.ts`
- `src/domain/payments/payment-reconciliation.ts`
- `src/server/repositories/OrderConfirmationRepository.ts`
- `src/server/services/PaymentReconciliationService.ts`
- `src/server/routes/payment-return.routes.ts`
- `src/features/cart-checkout/api.ts`
- `src/features/cart-checkout/components/PaymentReturnStatus.tsx`
- `src/pages/account/orders/index.astro`
- `src/pages/account/profile.astro`
- `src/features/customer-account/api.ts`
- `src/features/customer-account/components/AccountDashboardShell.tsx`
- `src/features/customer-account/CustomerProfilePanel.tsx`
- `src/features/customer-account/customer-account-ui.test.tsx`
- `src/middleware/auth/customer-page-guard.ts`
- `src/server/context/request-context.ts`
- `src/server/routes/index.ts`
- `src/server/app.ts`
- https://elysiajs.com/patterns/openapi
- https://orm.drizzle.team/docs/joins
- https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1
- https://docs.astro.build/en/guides/integrations-guide/cloudflare/

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-08: Started implementation. Scope locked to read-only Shopper order status.
- 2026-07-08: Red/green completed for domain lanes, repository ownership, service/controller routes, guest receipt lane extension, account UI, and regression tests.
- 2026-07-08: Manual responsive browser QA blocked by missing seeded authenticated Customer order/session fixture for deterministic `/account/orders` rendering. Component-level mobile/desktop class coverage and build checks passed.

### Implementation Plan

- Add pure customer-safe order status lane helpers.
- Add owned-order repository/service/controller/routes with Customer-only guards.
- Add account order list/detail UI and client fetchers.
- Preserve public checkout payment-return guest receipt access and add return/refund lanes.
- Validate with targeted domain/server/UI tests, `npm run check`, and development build.

### Completion Notes List

- Implemented read-only Customer own-order API at `GET /api/customer/orders` and `GET /api/customer/orders/:orderId` with Customer-only RBAC metadata/guards, `{ data, meta }` envelopes, pagination bounds, OpenAPI metadata, and safe `RESOURCE_NOT_FOUND` detail behavior.
- Added Drizzle order repository using SQL ownership predicates (`orders.customer_id`) and snapshot-only item read models from `order_snapshots`; mutable catalog rows, legacy order status/amount fields, provider IDs, checkout PII, and message IDs are not exposed.
- Added pure customer-safe status lane helpers for payment, fulfillment, return, and refund, plus default read-only return/refund lanes.
- Extended existing checkout payment-return receipt DTO/UI with four status lanes while preserving server-owned guest lookup only; raw email query is ignored and tested as non-lookup.
- Replaced account orders placeholder with list/detail pages and React panels using shared `ButtonLink`/`StatusBadge`, snapshot no-image fallback, four-lane timeline, and safe loading/not-found/error states.
- Code review added account order pagination controls and stabilized D1 repository test timeout.
- Manual viewport QA at 320, 375, 768, 1024, and 1440 remains blocked until seeded authenticated order fixtures exist; component markup assertions cover responsive classes and visual contract.

### File List

- \_bmad-output/implementation-artifacts/6-1-customer-own-order-status-view.md
- \_bmad-output/implementation-artifacts/sprint-status.yaml
- src/domain/orders/customer-order-status.ts
- src/domain/orders/customer-order-status.test.ts
- src/domain/payments/payment-receipt.ts
- src/features/cart-checkout/api.ts
- src/features/cart-checkout/components/PaymentReturnStatus.tsx
- src/features/cart-checkout/components/cart-ui.test.tsx
- src/features/customer-account/CustomerOrderDetailPanel.tsx
- src/features/customer-account/CustomerOrdersPanel.tsx
- src/features/customer-account/api.ts
- src/features/customer-account/customer-account-ui.test.tsx
- src/features/customer-account/index.ts
- src/pages/account/orders/[orderId].astro
- src/pages/account/orders/index.astro
- src/server/app.ts
- src/server/controllers/OrderController.ts
- src/server/repositories/OrderConfirmationRepository.ts
- src/server/repositories/OrderRepository.test.ts
- src/server/repositories/OrderRepository.ts
- src/server/routes/index.ts
- src/server/routes/orders.routes.test.ts
- src/server/routes/orders.routes.ts
- src/server/routes/payment-return.routes.test.ts
- src/server/routes/payment-return.routes.ts
- src/server/services/OrderService.test.ts
- src/server/services/OrderService.ts
- src/server/services/PaymentReconciliationService.test.ts

## Change Log

- 2026-07-08: Story created for Shopper own-order status view; status set to ready-for-dev.
- 2026-07-08: Development started; status set to in-progress.
- 2026-07-08: Implemented Shopper own-order status view/API and moved story to review.
- 2026-07-08: Code review fixed pagination reachability and repository test timeout; status set to done.
