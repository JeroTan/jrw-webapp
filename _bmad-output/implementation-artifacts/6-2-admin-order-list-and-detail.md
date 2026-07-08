# Story 6.2: Admin Order List and Detail

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin,
I want to view order list and order details,
so that JRW can operate fulfillment, returns, refunds, and customer support.

## Acceptance Criteria

1. Active, approved Admin opens `/admin/orders`; UI uses the existing `AdminLayout`/`DashboardShell`, Direction 05 admin dashboard composition, dense table/list patterns, and real API data. Orders show order number, customer-safe summary, redacted contact summary, item count, totals, payment lane, fulfillment lane, return/refund indicators, created/updated timestamps, filters, empty/loading/error states, and row navigation to detail.
2. `GET /api/admin/orders` requires Admin auth before controller execution. It returns standard `{ data, meta }` envelopes, supports `page` default `1`, `pageSize` default `20`, `pageSize` max `100`, stable newest-first pagination by `created_at` then `id`, and documented filters for current schema-backed fields: `search`, `paymentStatus`, `fulfillmentStatus`, `createdFrom`, `createdTo`. Return/refund filters are out of scope until durable return/refund storage exists; idle return/refund indicators still render.
3. Admin opens `/admin/orders/[orderId]` or `GET /api/admin/orders/:orderId`; detail loads by order id or order number and shows snapshot items, totals, shipping/contact data needed for fulfillment, payment lane, fulfillment lane, return lane, refund lane, and audit-safe timestamps.
4. Product names, variant labels/options, purchased prices, quantities, and image references come from `order_snapshots` only. Current catalog mutations must not rewrite historical order truth.
5. Payment, fulfillment, return, and refund lanes stay separate and follow `docs/order-status-flow.md`. `RETURN_NOT_REQUESTED` and `REFUND_NOT_REQUESTED` are idle lane values, not process steps; do not draw arrows or actionable transitions from them.
6. Story is read-only. Do not implement fulfillment mutations, cancellation, manual return recording, manual refund recording, provider refund execution, email sending, or audit-event writes here. Those belong to Stories 6.3, 6.4, 6.5, and Epic 7.
7. Unauthorized actors, including anonymous users, Customers, Prospects, inactive/suspended/unverified/unapproved Admins, and Super Admin under current daily-operations policy, receive safe 401/403-style envelopes or page redirects with no order data leak.
8. API docs expose schemas, auth metadata, pagination/filter params, `admin-read` rate-limit class, and error codes for list/detail.
9. PII exposure is deliberate: list excludes full phone/address and provider/internal ids; detail includes only fulfillment-needed contact/shipping fields. Provider payloads, checkout URLs, tokens, raw PayMongo ids, `checkout_attempt_id`, `reservation_id`, request ids, email message ids, secrets, and raw card/provider details never return.
10. Tests cover repository pagination/filters/detail/snapshot usage, service actor denial, route OpenAPI metadata, route-level RBAC denial before controller, safe list/detail exposure, UI states, and `npm run check` or documented blocker.

## Tasks / Subtasks

- [ ] Extend order read models for Admin list/detail without breaking Customer order contracts. (AC: 1, 2, 3, 9)
  - [ ] Preserve existing `CustomerOrderReadModel`, `CustomerOrderDetailReadModel`, and customer page-size max `50`.
  - [ ] Add Admin-specific types rather than widening Customer shapes with PII.
  - [ ] Add list-safe customer/contact summary. Recommended fields: `customerLabel`, `checkoutEmailMasked`, `customerKind`, and no phone/address on list.
  - [ ] Add detail-only fulfillment contact: `fullName`, `checkoutEmail`, `phone`, `shippingAddress`, `shippingType`.

- [ ] Add Admin repository reads in `src/server/repositories/OrderRepository.ts`. (AC: 2, 3, 4, 9)
  - [ ] Add `listAdminOrders(input)` with normalized `page`, `pageSize` max `100`, filters, count query, stable `orderBy(desc(orders.created_at), desc(orders.id))`, and snapshot summary aggregation.
  - [ ] Add `getAdminOrderDetail(input)` by `orders.id` or `orders.order_number`.
  - [ ] Reuse snapshot helpers and `buildCustomerOrderStatusLanes(...)` where useful; do not join mutable product/variant tables for item truth.
  - [ ] Keep filters parameterized with Drizzle `eq`, `and`, `or`, `like`/SQL bindings; no string-concatenated SQL.
  - [ ] Return `PROVIDER_UNAVAILABLE` for D1/provider-like failures where surrounding services use that pattern.

- [ ] Extend `OrderService` with Admin use cases. (AC: 2, 3, 7)
  - [ ] Use `evaluateRouteAccess` with `auth: { mode: "required", roles: ["ADMIN"] }`, mirroring product/snapshot services.
  - [ ] Deny missing actor/id, Customer/Prospect, Super Admin, suspended/inactive/unverified/unapproved Admin before repository calls.
  - [ ] Trim and validate `orderIdOrNumber`; empty detail lookup returns `VALIDATION_FAILED`.
  - [ ] Unknown order returns `RESOURCE_NOT_FOUND`.

- [ ] Extend `OrderController` and `orders.routes.ts` for Admin list/detail. (AC: 2, 3, 7, 8)
  - [ ] Add `GET /api/admin/orders`.
  - [ ] Add `GET /api/admin/orders/:orderId`.
  - [ ] Add TypeBox params/query/response schemas with `additionalProperties: false`.
  - [ ] Add `routeDetail(...)` metadata: tags `["Orders"]`, `x-auth` required Admin, `x-rate-limit-class: "admin-read"`, and error codes `AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`, `ADMIN_APPROVAL_REQUIRED`, `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`.
  - [ ] Keep route-level `rbacGuard(adminOrderAuth)` before controller construction. Route tests must prove `controllerFactory` is not called on denial.

- [ ] Build Admin order UI under `src/features/admin-orders/**` and pages under `src/pages/admin/orders/**`. (AC: 1, 3, 5)
  - [ ] Add `src/pages/admin/orders/index.astro` using `AdminLayout activeHref="/admin/orders"`.
  - [ ] Add `src/pages/admin/orders/[id].astro` using same layout and `Astro.params.id`.
  - [ ] Create API client in `src/features/admin-orders/api.ts`; do not import `admin-products` feature-owned fetch helper. A tiny local fetch wrapper is acceptable, or promote a shared helper only if done cleanly.
  - [ ] Use `DataTable`, `Pagination`, `ButtonLink`, `Input`/`SearchInput`, `Select`, `StatusBadge`, `Skeleton`, `EmptyState`, and `Toast`/alert patterns already present.
  - [ ] Detail view may reuse `buildCustomerOrderTimeline(...)` for safe projection, but must make clear this is read-only order truth, not mutation control.
  - [ ] Show payment, fulfillment, return, refund as separate lanes; idle return/refund can appear as lane summary but not as timeline steps or transitions.
  - [ ] Use Direction 05 for shell/table density and Direction 06 for order truth timeline/detail composition. Do not add rounded cards, shadows, blur, gradient/orb decoration, or custom `jrw-*` CSS.

- [ ] Preserve current page guard behavior. (AC: 1, 7)
  - [ ] `src/middleware/auth/admin-page-guard.ts` already treats `/admin/orders` as daily Admin area and requires `ADMIN`.
  - [ ] Do not silently widen `/admin/orders` to Super Admin. If Product wants Super Admin to view orders, update page guard, API auth metadata, service guard, tests, and UX intentionally in this story implementation.

- [ ] Add focused tests. (AC: 2, 3, 4, 7, 8, 9, 10)
  - [ ] Extend `OrderRepository.test.ts` with Admin list pagination max `100`, search/status/date filters, stable sorting, snapshot aggregation, list PII redaction, and detail contact allowlist.
  - [ ] Keep Miniflare/D1 repository test timeout at `20_000` to match 6.1 test fix.
  - [ ] Extend `OrderService.test.ts` for Admin allow/deny paths and not-found/validation errors.
  - [ ] Extend `orders.routes.test.ts` for OpenAPI metadata, route-level denial before controller, success envelopes, invalid query rejection, and no provider/internal leakage.
  - [ ] Add `src/features/admin-orders/admin-orders-ui.test.tsx` or equivalent for filters, pagination, table links, detail lanes, empty/loading/error states, and no disabled mutation controls pretending to work.

- [ ] Run validation gates. (AC: 10)
  - [ ] `npx vitest run src/server/repositories/OrderRepository.test.ts src/server/services/OrderService.test.ts src/server/routes/orders.routes.test.ts src/features/admin-orders/admin-orders-ui.test.tsx`
  - [ ] `npm run check`
  - [ ] `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`
  - [ ] Manual/admin viewport QA if an authenticated Admin fixture is available; otherwise document blocker with exact missing fixture.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [ ] Route auth metadata declares public/optional/required auth, roles, and rate-limit class.
- [ ] Route-level RBAC guard runs before validation or side effects for protected endpoints.
- [ ] Service/controller enforces actor state before reads: authenticated, active, verified, approved.
- [ ] Brand-scoped reads or writes: N/A for 6.2 because order list/detail is JRW single-store Admin operations, not brand-scoped catalog editing.
- [ ] Public/customer endpoints: N/A for new 6.2 work; existing Customer order endpoints must remain unchanged.
- [ ] Denial tests cover unauthenticated actor, Customer/Prospect wrong role, Super Admin current-policy denial, and invalid Admin account state. Missing brand membership is N/A.
- [ ] Error response uses safe envelope codes and does not leak provider/internal authorization details.
- [ ] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes.

## Dev Notes

### Current Code Intelligence

- Existing Customer order work from Story 6.1 lives in:
  - `src/domain/orders/customer-order-status.ts`
  - `src/server/repositories/OrderRepository.ts`
  - `src/server/services/OrderService.ts`
  - `src/server/controllers/OrderController.ts`
  - `src/server/routes/orders.routes.ts`
  - `src/features/customer-account/CustomerOrdersPanel.tsx`
  - `src/features/customer-account/CustomerOrderDetailPanel.tsx`
- `OrderRepository` currently exposes only Customer-scoped reads:
  - `listCustomerOrders({ customerId, page, pageSize })`, default `20`, max `50`.
  - `getCustomerOrderDetail({ customerId, orderIdOrNumber })`.
  - Ownership predicate is `orders.customer_id = customerId`.
  - It returns snapshot-derived item counts/totals and safe lanes, and intentionally hides checkout/contact/provider fields.
- `OrderService` currently has `requireCustomerActor(...)` with direct role checks. Admin methods should follow newer service pattern from `ProductService`/`SnapshotService`: call `evaluateRouteAccess(...)`, then verify `decision.actorRole === "ADMIN"`.
- `orders.routes.ts` already mounts customer endpoints and local TypeBox schemas. Add Admin schemas carefully without changing customer endpoint contract or pagination max.
- `serverRoutes(...)` already includes `ordersRoutes(routes, options.orders)`, so no route composer work should be needed unless signatures change.
- `src/domain/schema/transactions.ts` has `orders` columns for contact/shipping/payment/fulfillment and `order_snapshots` for item truth. There is no durable return/refund table in current schema; Story 6.2 should not invent one.
- `src/components/layout/DashboardShell.tsx` already contains `/admin/orders` navigation, but `src/pages/admin/orders/**` does not exist yet.
- `src/layouts/AdminLayout.astro` wraps admin screens with `DashboardShell`.
- `src/middleware/auth/admin-page-guard.ts` requires `ADMIN` for `/admin/orders` and redirects Super Admin away from daily Admin pages.
- `src/components/data-display/DataTable.tsx`, `src/components/ui/Pagination.tsx`, and `src/components/feedback/StatusBadge.tsx` are ready shared primitives for this UI.

### Previous Story Intelligence

- Story 6.1 is `done` and established the order read path, snapshot-only item display, customer-safe lanes, standard envelopes, and customer route tests.
- 6.1 review fix: D1 repository tests needed `20_000` timeout because Miniflare/D1 setup exceeded Vitest default timeout.
- 6.1 route tests assert OpenAPI metadata and denial before controller execution. Use same style for Admin routes.
- 6.1 UI uses `StatusBadge`, snapshot fallback text, and `buildCustomerOrderTimeline(...)`; reuse only where it fits Admin read-only truth.
- 6.1 intentionally excluded PII/provider internals from Customer endpoints. Admin detail may include needed fulfillment contact, but Admin list and both endpoints must still exclude provider internals.

### Git Intelligence

Recent commits show current flow:

- `8d4befc fix: adjust backfill`
- `05c3a55 chore: 6-1 reviewed`
- `33af181 feat: 6-1 implemented`
- `45456e3 docs: 6-1 story created`
- `fd79d43 chore: epic 5 reviewed?`

Actionable read: build on 6.1 order modules instead of creating parallel route/service stacks.

### Architecture Compliance

- Follow Route -> Controller -> Service -> Domain/Repository.
- Routes own Elysia path, TypeBox query/params/response schemas, OpenAPI `detail`, auth metadata, rate-limit class, and `rbacGuard`.
- Controllers map service results to `apiSuccessWithRequestId(...)` / `apiErrorWithRequestId(...)`.
- Services own actor/eligibility checks and use-case orchestration.
- Repositories own D1/Drizzle reads only.
- Domain helpers should stay pure and independent of Astro/Elysia/D1.
- Use `@/` imports and existing PascalCase file patterns for controllers/services/repositories/components.
- Do not touch `src/api/**`; it is deprecated scaffold territory.

### Design Direction Fidelity

- Cite and follow `_bmad-output/planning-artifacts/ux-design-directions.html`:
  - Direction 05: admin dashboard shell, sidebar, top context bar, dense resource table.
  - Direction 06: order truth timeline/detail composition.
- Follow `_bmad-output/planning-artifacts/ux-design-specification.md`:
  - Admin screens are desktop-first, table-driven, keyboard-friendly, and dense.
  - `OrderStatusPanel` anatomy is payment lane, fulfillment lane, return lane, refund lane, valid next actions. For this story, render lanes read-only; do not create active mutation controls.
  - Empty orders state says orders appear after checkout/payment flow creates them.
- Follow `docs/design-by-google-stitch.md`: sharp 0px corners, 1px borders, no shadows, no blur, Satoshi identity headings, Space Mono/system text for operational data, cobalt only for focus/selected/primary.
- Shared primitive states required: loading, empty, error, disabled, hover, focus-visible, table row navigation, filter controls, pagination.
- UI completion requires component tests or documented manual QA with viewport notes; `astro check` alone is not enough.

### Data Contract Guidance

Recommended Admin list response:

```ts
type AdminOrderListResult = {
  items: AdminOrderSummary[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

type AdminOrderSummary = {
  orderId: string;
  orderNumber: string;
  customerLabel: string;
  checkoutEmailMasked: string | null;
  customerKind: "CUSTOMER" | "GUEST";
  itemCount: number;
  totalQuantity: number;
  subtotalCentavos: number;
  totalCentavos: number;
  currency: "PHP";
  payment: CustomerOrderStatusLane;
  fulfillment: CustomerOrderStatusLane;
  return: CustomerOrderStatusLane;
  refund: CustomerOrderStatusLane;
  createdAt: string;
  updatedAt: string;
};
```

Recommended Admin detail response extends summary with:

```ts
type AdminOrderDetail = AdminOrderSummary & {
  contact: {
    fullName: string | null;
    checkoutEmail: string | null;
    phone: string | null;
  };
  shippingAddress: {
    streetAddress: string | null;
    barangay: string | null;
    cityProvince: string | null;
    postalCode: string | null;
    shippingType: string;
  };
  items: CustomerOrderSnapshotItem[];
};
```

Do not expose these fields in Admin API responses: `payment_id`, `checkout_attempt_id`, `reservation_id`, `created_request_id`, `updated_request_id`, `order_confirmation_email_message_id`, raw provider payloads, checkout URLs, token/secret/signature values, raw card details.

### Latest Technical Information

- Elysia OpenAPI official docs still describe runtime schemas as the source for generated OpenAPI documentation. Keep TypeBox route schemas and `routeDetail(...)` metadata on Admin endpoints so `/api/openapi/json` includes contracts and custom `x-*` metadata.
- Elysia lifecycle docs describe route hooks/guards as the way to run checks before handlers. Keep `transform: rbacGuard(adminOrderAuth)` on each Admin order route and test denial before controller construction.
- Drizzle official docs confirm `where(and(...))`, parameterized values, `limit`, `offset`, and `orderBy`. For consistent pagination, use `orderBy(desc(created_at), desc(id))` because `created_at` alone is not unique.
- Astro Cloudflare docs confirm server/on-demand rendered routes under the Cloudflare adapter. Admin Astro pages should remain normal server-rendered pages wrapped by existing middleware/session guard; no static prerender for protected Admin routes.

### Testing Requirements

- Repository:
  - Admin list default page/pageSize and clamps to max `100`.
  - Filter combinations for `search`, `paymentStatus`, `fulfillmentStatus`, `createdFrom`, `createdTo`.
  - Stable newest-first order by timestamp and id.
  - Detail by order id and order number.
  - Snapshot item display ignores changed current product/variant records.
  - List omits full contact/provider internals; detail allows only fulfillment contact/shipping fields.
- Service:
  - Active approved Admin succeeds.
  - Anonymous, Customer, Prospect, Super Admin, suspended, inactive, unverified, and unapproved Admin fail before repository calls.
  - Empty detail id fails validation; unknown order fails not found.
- Routes:
  - `/api/openapi/json` documents both Admin endpoints with auth, rate limit, error codes, query/params/response schemas.
  - `controllerFactory` is not called on denied requests.
  - Invalid extra query params return `VALIDATION_FAILED`.
  - Success responses include `meta.requestId`.
- UI:
  - List renders filters, table rows, status badges, pagination, empty/loading/error states.
  - Detail renders lanes, timeline/detail sections, snapshot items, totals, contact/shipping allowlist, and back link.
  - No working mutation controls appear in this read-only story.

### Anti-Patterns To Avoid

- Do not create a separate `admin-order.routes.ts` stack unless there is a clear route-composition reason. Existing `orders.routes.ts` owns order endpoints.
- Do not widen Customer endpoints or add raw email lookup.
- Do not change Customer order pagination max from `50`.
- Do not use `orders.status` or `total_amount` as source of truth when `payment_status`, `fulfillment_status`, `subtotal_centavos`, and `total_centavos` exist.
- Do not query current product/catalog tables for purchased item display.
- Do not expose full contact fields on list responses.
- Do not expose provider ids/payloads, checkout URLs, tokens, secrets, request ids, or email message ids.
- Do not implement return/refund storage or mutations in this story just to make indicators look active.
- Do not show idle return/refund as timeline steps or arrows.
- Do not silently allow Super Admin on daily Admin order pages while the existing guard and API pattern require only `ADMIN`.
- Do not make mock-only UI. Screens must call real Admin order API and handle failure states.
- Do not add feature CSS files or `jrw-*` selectors.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 6.2: Admin Order List and Detail`
- `_bmad-output/planning-artifacts/prd.md#Orders, Fulfillment, Returns & Refunds`
- `_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping`
- `_bmad-output/planning-artifacts/ux-design-specification.md#OrderTimeline`
- `_bmad-output/planning-artifacts/ux-design-specification.md#OrderStatusPanel`
- `_bmad-output/planning-artifacts/ux-design-specification.md#Information Architecture`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-05`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-06`
- `docs/order-status-flow.md`
- `docs/design-by-google-stitch.md`
- `_bmad-output/implementation-artifacts/6-1-customer-own-order-status-view.md`
- Elysia OpenAPI docs: https://elysiajs.com/patterns/openapi
- Elysia lifecycle/guard docs: https://elysiajs.com/essential/life-cycle
- Drizzle select docs: https://orm.drizzle.team/docs/select
- Drizzle limit/offset pagination docs: https://orm.drizzle.team/docs/guides/limit-offset-pagination
- Astro Cloudflare adapter docs: https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- Cloudflare Astro Workers docs: https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-07-08: Created ready-for-dev story with Admin order read-model/API/UI guardrails and sprint tracker context.
