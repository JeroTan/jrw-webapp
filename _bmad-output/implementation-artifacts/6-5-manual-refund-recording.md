# Story 6.5: Manual Refund Recording

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin,
I want to record manual refund status and details for an order or item,
so that JRW can track refund handling without implying automated PayMongo refund execution.

## Acceptance Criteria

1. Active, approved Admin opens `/admin/orders/[id]`; existing Direction 05 admin shell and Direction 06 order truth detail remain intact, and the refund lane exposes a manual "Record refund" action without changing payment, fulfillment, or return lanes.
2. `POST /api/admin/orders/:orderId/refunds` requires Admin auth before controller execution, uses standard `{ data, meta }` / `{ error }` envelopes, accepts only documented TypeBox request fields, returns updated Admin order detail plus the new refund record, and documents schemas, auth metadata, `admin-write` rate-limit class, and error codes.
3. Refund recording supports order-level and item-level targets. Item-level records require a valid `order_snapshots.id` for the same order; Admin detail already exposes `snapshotId` for item selection from Story 6.4.
4. Refund status display may be `REFUND_NOT_REQUESTED` when no refund record exists. Submitted refund statuses follow current `docs/order-status-flow.md` and code labels: `REFUND_PENDING`, `REFUND_APPROVED`, `REFUND_DECLINED`, `REFUND_SENT`, or `REFUND_FAILED`; `REFUND_NOT_REQUESTED` is rejected as a submitted status because it is an idle lane value, not a process step.
5. Do not introduce legacy epic aliases as stored statuses. Map copy/meaning only: `REFUND_REQUESTED` means `REFUND_PENDING`, `REFUND_REJECTED` means `REFUND_DECLINED`, and `REFUND_COMPLETED` means `REFUND_SENT`.
6. Valid transition matrix follows `docs/order-status-flow.md`: no active refund -> `REFUND_PENDING`; `REFUND_PENDING -> REFUND_APPROVED | REFUND_DECLINED | REFUND_FAILED`; `REFUND_APPROVED -> REFUND_SENT`; `REFUND_DECLINED`, `REFUND_FAILED`, and `REFUND_SENT` are terminal.
7. New refund cases require `payment_status = PAYMENT_PAID`. Refund may be recorded for paid cancellations before shipping, paid return-completed cases, or other manual paid-order refund decisions; payment failed/expired/cancelled before settle blocks with `CONFLICT_STATE` and no record.
8. Each refund record retains status, previous status, reason, amount centavos, notes, reference ID, actor, order/item target, request ID, and timestamps. History is append-only/auditable; edits do not overwrite prior records.
9. Refund amount is required, must be a safe positive integer in PHP centavos, and must not exceed the target cap: order-level cap is `orders.total_centavos`; item-level cap is selected `order_snapshots.price_centavos * quantity`. Overlapping order-level and item-level refund targets must be prevented or safely conflict so an order cannot be over-refunded through mixed scopes.
10. `REFUND_SENT` requires a reference ID that identifies the manual refund evidence, payout note, provider dashboard id, or internal support reference. The app must not call PayMongo refund APIs, create PayMongo refund resources, or store provider payloads.
11. Customer and Admin order read models show latest refund status through customer-safe labels and color-independent badges/timeline events. Customer endpoints never expose Admin notes, reference IDs, actor IDs, raw request IDs, or internal/provider details.
12. Tests cover refund domain transition matrix, payment gate, order/item target validation, amount caps and mixed-scope over-refund prevention, append-only history, request-id idempotency mismatch, no PayMongo execution, Admin route RBAC/OpenAPI/envelopes, customer-safe label projection, Admin UI valid/disabled/conflict states, and `npm run check` or documented blocker.

## Tasks / Subtasks

- [x] Add pure refund transition domain rules. (AC: 4, 5, 6, 7, 10, 11)
  - [x] Create `src/domain/orders/refund-transitions.ts` or `src/domain/returns-refunds/refund-transitions.ts`; keep it provider-free and DB-free.
  - [x] Export exact `RefundStatus` union, `RefundDisplayStatus` if needed, label helpers, allowed-next helper, status guard, and transition evaluator.
  - [x] Treat `REFUND_NOT_REQUESTED` as display idle only. It can appear in lanes when no record exists, but must not be accepted as a mutation target.
  - [x] Reject or normalize legacy aliases at the boundary; do not persist `REFUND_REQUESTED`, `REFUND_REJECTED`, or `REFUND_COMPLETED`.
  - [x] Enforce transition matrix from `docs/order-status-flow.md`.
  - [x] Enforce payment-paid gate without requiring delivered fulfillment for every refund case.

- [x] Add append-only refund persistence. (AC: 3, 8, 9, 10)
  - [x] Add Drizzle table in `src/domain/schema/transactions.ts`, recommended name `order_refund_records`.
  - [x] Add migration `migrations/0035_order_refund_records.sql` unless another migration already claimed that number.
  - [x] Columns should include `id`, `order_id`, nullable `order_snapshot_id`, `target_type`, nullable `previous_refund_status`, `refund_status`, `amount_centavos`, `currency`, `reason`, nullable `notes`, nullable `reference_id`, `actor_id`, `request_id`, `created_at`, and `updated_at`.
  - [x] Consider nullable `return_record_id` only if implementation links a refund to a completed return; if added, validate same order/target and keep Customer responses hidden.
  - [x] Add FK to `orders.id` with cascade delete and FK to `order_snapshots.id` with set-null, mirroring `order_return_records`.
  - [x] Add unique index on `request_id`; add indexes on `order_id`, `order_snapshot_id`, `refund_status`, and `created_at`.
  - [x] Add CHECK constraints for allowed `target_type`, allowed `refund_status`, and positive `amount_centavos`.
  - [x] Add relations and schema invariant tests that reject customer contact, provider payload, PayMongo payload/response, tokens, signatures, raw card data, and provider secrets in the refund table.

- [x] Extend `DrizzleOrderRepository` read models and mutation methods. (AC: 2, 3, 7, 8, 9, 11)
  - [x] Load latest refund record per order for Customer list/detail and Admin list/detail; pass latest status and timestamp into `buildCustomerOrderStatusLanes`.
  - [x] Add Admin-only refund history to Admin detail, including safe labels, amount, and target labels.
  - [x] Add a refund transition subject loader with order id/number, payment status, fulfillment status, latest return/refund history, snapshots, order total, and item line totals.
  - [x] Add `recordAdminOrderRefund(...)` that validates same-order item target, amount caps, mixed order/item target conflicts, request-id idempotency, and append-only insert.
  - [x] If an existing `request_id` row is found, accept it only when order, target, previous status, new status, amount, reason, notes, and reference id match exactly; otherwise return stale/conflict instead of reusing another record.
  - [x] Re-check `PAYMENT_PAID`, target existence, and amount cap immediately before append inside repository transaction/fallback path, not only in the service.

- [x] Extend service/controller/routes. (AC: 2, 7, 8, 9, 10, 11)
  - [x] Add `OrderService.recordAdminOrderRefund(...)` using existing Admin-only policy; Super Admin remains denied unless product policy changes intentionally.
  - [x] Validate blank order id, invalid target type, missing item id for item target, unknown item id, unknown status, idle status, legacy alias status, blank reason, invalid/oversized text, missing/invalid amount, over-cap amount, and missing reference id when target status is `REFUND_SENT`.
  - [x] Return `RESOURCE_NOT_FOUND` for unknown order, `VALIDATION_FAILED` for bad body/status/amount/reference/target, `CONFLICT_STATE` for invalid state transitions or stale latest refund state, and `PROVIDER_UNAVAILABLE` for D1 failures.
  - [x] Publish safe audit events with `refund-return.refund_recorded` for first record and `refund-return.status_changed` for later records. Audit failure must never mask a successful refund record.
  - [x] Add `OrderController.recordAdminOrderRefund(...)`.
  - [x] Add route `POST /admin/orders/:orderId/refunds` in `src/server/routes/orders.routes.ts` with TypeBox params/body/response schemas, `routeDetail(...)`, `rbacGuard(adminOrderAuth)`, `admin-write` rate-limit class, and full error code list.
  - [x] Do not add PayMongo SDK calls, PayMongo refund client wrappers, webhook reconciliation, email, payment mutation, inventory mutation, or Customer mutation behavior in this story.

- [x] Extend Admin order UI. (AC: 1, 3, 5, 9, 10, 11)
  - [x] Update `src/features/admin-orders/types.ts` with refund record, refund response, and refund request types.
  - [x] Add `recordAdminOrderRefund(...)` to `src/features/admin-orders/api.ts`.
  - [x] Extend `AdminOrderDetailDashboard.tsx` rather than creating a parallel order detail screen.
  - [x] Reuse patterns from Story 6.4 return actions/history; keep refund controls separate from return controls.
  - [x] Use existing shared primitives: `Button`, `Input`, `Select`, `Textarea`, `StatusBadge`, `Skeleton`, `EmptyState`, and inline alert/toast pattern as appropriate.
  - [x] UI must show visible labels for target type, item, status, amount, reason, notes, and reference ID. Required fields must be clear.
  - [x] Button/copy should be operational and manual: "Record refund", "Save refund record", "Refund pending", "Refund approved", "Refund sent". Do not show raw status codes in routine UI.
  - [x] Disable or explain refund action when payment is not paid, selected item is invalid, amount exceeds target cap, order/item scope conflicts with existing refund scope, or refund status is terminal.
  - [x] On `CONFLICT_STATE`, refresh latest order detail and show allowed next status or safe reason.
  - [x] Show refund history in Admin detail, newest-first, with target label, safe status label, amount, reason, notes, reference ID, actor safe id/label, and timestamp.
  - [x] No visible copy may say PayMongo refund was executed, queued, sent, or created by this app.

- [x] Update customer-safe projection. (AC: 11)
  - [x] Ensure Customer order list/detail and Admin list/detail receive latest refund status from persistence.
  - [x] Keep `REFUND_NOT_REQUESTED` out of customer timeline events; existing `activeSupportTimelineEvents` already suppresses idle values, so preserve that behavior.
  - [x] Hide Admin-only refund details from Customer endpoints while still showing safe refund lane label when a refund exists.

- [x] Add focused tests and validation. (AC: 12)
  - [x] Add domain tests for refund status guards, labels, valid transitions, terminal states, idle rejection, legacy alias rejection/normalization, paid gate, and unknown values.
  - [x] Extend `src/domain/schema-invariants.test.ts` for `order_refund_records`.
  - [x] Extend `src/server/repositories/OrderRepository.test.ts` for append-only history, latest status projection, item target validation, order/item mixed-scope conflict, amount caps, idempotency match/mismatch, repository-side paid gate, and Customer detail hiding notes/reference/actor.
  - [x] Extend `src/server/services/OrderService.test.ts` for Admin allow/deny, Super Admin denial, payment gate, invalid transitions, amount over-cap, `REFUND_SENT` reference requirement, audit publish/failure, and safe errors.
  - [x] Extend `src/server/routes/orders.routes.test.ts` for POST OpenAPI metadata, RBAC denial before controller, success envelope, validation envelope, and conflict envelope.
  - [x] Extend `src/features/admin-orders/admin-orders-ui.test.tsx` for refund form states, disabled reasons, amount validation, successful refresh, conflict refresh, and no raw status/provider-execution wording in visible copy.
  - [x] Extend `src/domain/orders/customer-order-status.test.ts` if label/timeline behavior changes.
  - [x] Run targeted tests plus `npm run check`; prefer `npm run build-test` before moving story to review because this changes schema, API, service, repository, and React UI.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [x] Route auth metadata declares required auth, `roles: ["ADMIN"]`, and `admin-write` rate-limit class.
- [x] Route-level RBAC guard runs before validation or side effects for `POST /api/admin/orders/:orderId/refunds`.
- [x] Service/controller enforces actor state before mutation: authenticated, active, verified, approved.
- [x] Brand-scoped reads or writes: N/A because JRW order refunds are single-store Admin operations, not brand-scoped catalog editing.
- [x] Public/customer endpoints: N/A for the new Admin refund endpoint; existing customer endpoints keep safe refund labels and no Admin refund details.
- [x] Denial tests cover unauthenticated actor, Customer/Prospect wrong role, Super Admin current-policy denial, suspended/inactive/unverified/unapproved Admin, and controller-not-called guard path.
- [x] Error response uses safe envelope codes and does not leak provider/internal authorization, email, phone, address, Admin notes to Customer, reference IDs to Customer, request IDs outside meta, DB errors, or stack details.
- [x] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, request body, response schema, denial codes, validation codes, and conflict codes.

## Code Review Findings

- [x] P2 Docs still described planned `/api/orders/{orderId}/refunds` routes and automated PayMongo refunds. Updated API flow docs, endpoint catalog, and product overview to current Admin-only manual refund recording.
- [x] P3 Story and sprint tracking remained in `review` after implementation validation. Moved story 6.5 and sprint status to `done` after CR.

## Dev Notes

### Current Code Intelligence

- Story 6.4 is done and added manual return recording in:
  - `src/domain/orders/return-transitions.ts`
  - `migrations/0034_order_return_records.sql`
  - `src/domain/schema/transactions.ts`
  - `src/server/repositories/OrderRepository.ts`
  - `src/server/services/OrderService.ts`
  - `src/server/controllers/OrderController.ts`
  - `src/server/routes/orders.routes.ts`
  - `src/features/admin-orders/api.ts`
  - `src/features/admin-orders/types.ts`
  - `src/features/admin-orders/components/AdminOrderDetailDashboard.tsx`
- There is no `order_refund_records` table, refund transition module, refund history DTO, or `recordAdminOrderRefund(...)` endpoint yet.
- `src/domain/orders/customer-order-status.ts` already has safe refund labels for `REFUND_NOT_REQUESTED`, `REFUND_PENDING`, `REFUND_APPROVED`, `REFUND_DECLINED`, `REFUND_SENT`, and `REFUND_FAILED`.
- `buildCustomerOrderStatusLanes(...)` already accepts optional `refundStatus` and `refundUpdatedAt`, but `OrderRepository.buildOrderReadModel(...)` currently passes return status only; 6.5 must feed latest persisted refund status into this helper.
- `buildCustomerOrderTimeline(...)` already suppresses `RETURN_NOT_REQUESTED` and `REFUND_NOT_REQUESTED` from the customer timeline. Preserve that behavior.
- `AdminOrderSnapshotItem` now includes `snapshotId`; item-level refund selection should use that stable snapshot id from `order_snapshots.id`.
- `AdminOrderDetailReadModel` currently includes `returnHistory` only. Add `refundHistory` without removing or reshaping `returnHistory`.
- `orders.routes.ts` already defines `tboxReturnStatus`, `tboxAdminReturnRecord`, `tboxAdminReturnBody`, and `POST /admin/orders/:orderId/returns`. Mirror the structure for refunds but use refund status constants and amount/reference requirements.
- `src/domain/audit/events.ts` already supports `refund-return.return_recorded`, `refund-return.refund_recorded`, and `refund-return.status_changed`; use `refund-return.refund_recorded` and `refund-return.status_changed`.
- `src/server/openapi/documentation.ts` already has a `Returns/Refunds` tag, but current order routes use `tags: ["Orders"]`. Either keep route consistency or deliberately tag refund route with both if local route metadata supports it.
- `PaymentWebhookService.test.ts` has provider `payment.refunded` fixture coverage for webhook parsing, but 6.5 manual refund recording must not depend on provider webhook payloads or mutate provider payment status.

### Previous Story Intelligence

- 6.4 implemented append-only `order_return_records` with `request_id` unique index, target type, optional snapshot target, previous status, amount, reason, notes, reference ID, actor, and timestamps.
- 6.4 review fixed raw request-id exposure in response/client DTOs. For refunds, do not include `requestId` in `refundRecord` response data; keep request id in persistence and response meta only.
- 6.4 review added repository-side paid/delivered gate immediately before append. For refunds, re-check `PAYMENT_PAID`, target validity, and amount cap inside repository append path.
- 6.4 item-target fix allowed separate item-level return records without one returned item disabling remaining purchased items. For refunds, prevent overlapping order/item scope but allow separate item-level refund records for different items when no order-level refund exists.
- 6.4 ran targeted Vitest, `npm run check`, `npm run build-test`, token scan, and `npm run db:migrate:remote` for development D1. Follow same validation discipline.

### Git Intelligence

Recent commits show current order flow:

- `b47a1cc docs: 6-4 reviewed`
- `4c00d6a feat: 6-4 implemented`
- `7b617f8 doc: 6-4 story created`
- `059573d chore: 6-3 reviewed`
- `9365cbe feat: 6-3 implemented`

Actionable read: extend existing order stack and return patterns. Do not create a second refund API stack outside `orders.routes.ts`, `OrderController`, `OrderService`, `OrderRepository`, and `admin-orders`.

### Refund State Model

Display idle:

```ts
REFUND_NOT_REQUESTED
```

Submitted statuses:

```ts
REFUND_PENDING
REFUND_APPROVED
REFUND_DECLINED
REFUND_SENT
REFUND_FAILED
```

Legacy epic aliases and target meaning:

```ts
REFUND_REQUESTED -> REFUND_PENDING
REFUND_REJECTED -> REFUND_DECLINED
REFUND_COMPLETED -> REFUND_SENT
```

Do not persist those alias values.

Allowed transitions:

```ts
no active record -> REFUND_PENDING
REFUND_PENDING -> REFUND_APPROVED | REFUND_DECLINED | REFUND_FAILED
REFUND_APPROVED -> REFUND_SENT
REFUND_DECLINED -> terminal
REFUND_FAILED -> terminal
REFUND_SENT -> terminal
```

Creation gate:

```ts
paymentStatus === "PAYMENT_PAID"
```

Amount caps:

```ts
ORDER target: amountCentavos <= order.totalCentavos
ITEM target: amountCentavos <= orderSnapshot.priceCentavos * orderSnapshot.quantity
```

Conflict reasons to consider:

```ts
AMOUNT_EXCEEDS_TARGET
INVALID_REFUND_TARGET
INVALID_TRANSITION
LEGACY_REFUND_STATUS_ALIAS
MISSING_REFUND_REFERENCE
PAYMENT_NOT_PAID
REQUEST_ID_MISMATCH
SAME_REFUND_STATUS
STALE_REFUND_STATUS
TERMINAL_REFUND_STATUS
UNKNOWN_REFUND_STATUS
UNKNOWN_TARGET_STATUS
```

### API Contract Guidance

Recommended request body:

```ts
type RecordAdminOrderRefundRequest = {
  targetType: "ORDER" | "ITEM";
  orderSnapshotId?: string;
  targetStatus: RefundStatus;
  amountCentavos: number;
  reason: string;
  notes?: string;
  referenceId?: string;
};
```

Recommended success payload:

```ts
type RecordAdminOrderRefundResponse = {
  allowedNextStatuses: RefundStatus[];
  order: AdminOrderDetail;
  refundRecord: {
    id: string;
    targetType: "ORDER" | "ITEM";
    orderSnapshotId: string | null;
    targetLabel: string;
    previousStatus: RefundStatus | null;
    status: RefundStatus;
    statusLabel: string;
    amountCentavos: number;
    currency: "PHP";
    reason: string;
    notes: string | null;
    referenceId: string | null;
    actorId: string | null;
    createdAt: string;
    updatedAt: string;
  };
};
```

Recommended conflict details:

```ts
{
  allowedNextStatuses: RefundStatus[];
  amountCentavos?: number;
  currentStatus?: RefundDisplayStatus;
  maxAmountCentavos?: number;
  paymentStatus?: string;
  reason:
    | "AMOUNT_EXCEEDS_TARGET"
    | "INVALID_REFUND_TARGET"
    | "INVALID_TRANSITION"
    | "PAYMENT_NOT_PAID"
    | "REQUEST_ID_MISMATCH"
    | "STALE_REFUND_STATUS"
    | "TERMINAL_REFUND_STATUS";
  targetStatus?: string;
}
```

### Architecture Compliance

- Follow Route -> Controller -> Service -> Domain/Repository.
- Domain transition rules stay pure and testable without HTTP, D1, PayMongo, Resend, Astro, Elysia, or React.
- Repository handles D1 query, transition subject, snapshot-target validation, amount cap validation, append-only insert, latest refund status projection, and Admin refund-history read model.
- Service orchestrates Admin guard, input validation, domain decision, repository mutation, audit publish, and safe error mapping.
- Controller maps `AppResult` to API envelopes.
- Route owns TypeBox schemas, `routeDetail(...)`, `rbacGuard`, rate class, and OpenAPI docs.
- Schema changes belong in `src/domain/schema/transactions.ts`, `migrations/`, and schema invariant tests.
- Do not import `cloudflare:workers` from domain modules.
- Do not update `orders.payment_status`, `orders.fulfillment_status`, return records, provider payment rows, inventory rows, or PayMongo resources in this story.

### Design Direction Fidelity

- Follow `_bmad-output/planning-artifacts/ux-design-directions.html`:
  - Direction 05 for dashboard shell, sidebar/topbar continuity, dense operational controls.
  - Direction 06 for order truth detail, separate payment/fulfillment/return/refund lanes, and refund lane action placement.
- Follow `_bmad-output/planning-artifacts/ux-design-specification.md#ReturnRefundRecorder`:
  - Type, status, amount, reason, notes, reference ID, actor, timestamp.
  - States: not requested, requested/pending, approved, rejected/declined, sent/failed, validation error.
  - Clear labels and confirmation before saving sensitive records.
- Keep UI copy operational and short. Prefer "manual refund record" or "record refund" over provider explanations.
- Use shared primitives and Tailwind v4 token utilities directly in feature markup.
- No shadows, blur, rounded cards, decorative gradients, `jrw-*` selectors, raw status-code copy, or "PayMongo refund executed" wording in normal UI.
- Done requires UI test assertions or documented manual QA blocker for form states, disabled reasons, amount validation, and conflict refresh.

### Latest Technical Information

- Elysia OpenAPI docs state route `detail` fields are passed into generated OpenAPI operations. Keep `routeDetail(...)`, TypeBox params/body/response schemas, tags, auth metadata, and error codes on the new POST endpoint.
- Elysia lifecycle docs place `transform` before validation. Keep `rbacGuard(adminOrderAuth)` on the route so protected denial runs before handler/controller side effects, matching current routes.
- Drizzle insert docs state `.values(...)` are parameterized and `.returning(...)` can return inserted rows. Use parameterized insert and read back joined snapshot target labels as needed.
- Drizzle transaction docs define transactions as a logical unit that commits or rolls back together. Mirror the 6.4 repository transaction/fallback pattern for D1 explicit transaction limitations.
- PayMongo official docs define a Refund resource as returning full or partial payment amount to the customer's original payment method; they also document amount and payment id fields. This story must not call that API or create/store PayMongo refund payloads. It records manual evidence only.

### Testing Requirements

- Add `src/domain/orders/refund-transitions.test.ts` or equivalent under `src/domain/returns-refunds`.
- Extend `src/domain/schema-invariants.test.ts`.
- Extend `src/server/repositories/OrderRepository.test.ts`; keep D1/Miniflare timeout pattern used by existing repository tests.
- Extend `src/server/services/OrderService.test.ts` with audit publisher stub and deterministic `now`.
- Extend `src/server/routes/orders.routes.test.ts`.
- Extend `src/features/admin-orders/admin-orders-ui.test.tsx`.
- Extend `src/domain/orders/customer-order-status.test.ts` if label/timeline behavior changes.
- Add a negative test that no PayMongo client/SDK/refund API adapter is invoked by manual refund recording.
- Run targeted tests plus `npm run check`; prefer `npm run build-test` before moving story to review because this changes schema, API, service, repository, and React UI.

### Anti-Patterns To Avoid

- Do not treat `REFUND_NOT_REQUESTED` as a submitted transition target.
- Do not persist `REFUND_REQUESTED`, `REFUND_REJECTED`, or `REFUND_COMPLETED`.
- Do not overwrite prior refund records.
- Do not merge refund status into fulfillment/payment/return statuses.
- Do not mutate `orders.payment_status` to `PAYMENT_REFUNDED` from this manual record story.
- Do not mutate PayMongo, payment records, return records, fulfillment records, or inventory.
- Do not send refund emails in this story.
- Do not expose Admin notes, reference IDs, actor IDs, request IDs, checkout email, phone, address, provider ids, tokens, raw provider payloads, stack traces, or DB errors to Customer responses.
- Do not use mutable catalog product data for refund item truth; use `order_snapshots`.
- Do not create a separate refund API stack outside current order route/controller/service/repository path.
- Do not silently allow Super Admin while `/admin/orders` remains Admin-only.
- Do not show raw database status codes in visible UI.
- Do not add generic global state library or optimistic order-status updates.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 6.5: Manual Refund Recording`
- `_bmad-output/planning-artifacts/prd.md#Orders, Fulfillment, Returns & Refunds`
- `_bmad-output/planning-artifacts/prd.md#Reliability & Data Integrity`
- `_bmad-output/planning-artifacts/architecture.md#API & Communication Patterns`
- `_bmad-output/planning-artifacts/architecture.md#Component Boundaries`
- `_bmad-output/planning-artifacts/ux-design-specification.md#Order Operations, Return, Refund`
- `_bmad-output/planning-artifacts/ux-design-specification.md#ReturnRefundRecorder`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-05`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-06`
- `docs/order-status-flow.md`
- `_bmad-output/implementation-artifacts/6-4-manual-return-recording.md`
- Elysia OpenAPI docs: https://elysiajs.com/patterns/openapi
- Elysia lifecycle docs: https://elysiajs.com/essential/life-cycle
- Drizzle insert docs: https://orm.drizzle.team/docs/insert
- Drizzle transaction docs: https://orm.drizzle.team/docs/transactions
- PayMongo Refund resource docs: https://docs.paymongo.com/reference/refund-resource

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Status Review

Moved to review on 2026-07-09 after implementation, targeted tests, full build-test, and remote development D1 migration. Code review completed on 2026-07-10; story moved to done after docs/status fixes.

### Debug Log References

- `npx vitest run src/domain/orders/refund-transitions.test.ts` passed.
- `npx vitest run src/domain/schema-invariants.test.ts` passed.
- `npx vitest run src/server/repositories/OrderRepository.test.ts` passed.
- `npx vitest run src/server/services/OrderService.test.ts` passed.
- `npx vitest run src/server/routes/orders.routes.test.ts` passed.
- `npx vitest run src/features/admin-orders/admin-orders-ui.test.tsx` passed.
- `npx vitest run src/domain/orders/customer-order-status.test.ts` passed.
- Targeted combined suite passed: 7 files, 89 tests.
- `npm run check` passed with existing hints printed by Astro.
- `npm run build-test` passed: 142 files, 974 tests, Astro build complete.
- `npm run db:migrate:remote` applied `0035_order_refund_records.sql` to development D1.
- Code review doc/status pass found stale API/refund docs and updated them.
- Code review targeted suite passed: 7 files, 89 tests.
- Code review `git diff --check` passed with line-ending warnings only.
- Code review `npm run check` passed with existing 11 hints.
- Code review `npm run build-test` passed on rerun: 142 files, 974 tests, Astro build complete.

### Completion Notes List

- Added pure refund transition rules for pending, approved, declined, sent, and failed states, with idle and legacy alias rejection.
- Added append-only `order_refund_records` schema, migration, relations, request-id idempotency, amount caps, and mixed order/item scope conflict checks.
- Projected latest refund lane into Customer/Admin read models while keeping Customer endpoints free of Admin notes, reference IDs, actor IDs, and request IDs.
- Added Admin refund endpoint, service orchestration, controller method, route schema/docs, RBAC guard, and safe audit publishing.
- Added Admin refund form/history panels using shared UI primitives and human labels only.
- Changed Customer refund declined label to `Refund declined`.
- Code review updated stale docs so refund flow points to Admin manual recording and does not imply PayMongo execution.

### File List

- `migrations/0035_order_refund_records.sql`
- `src/domain/orders/customer-order-status.test.ts`
- `src/domain/orders/customer-order-status.ts`
- `src/domain/orders/refund-transitions.test.ts`
- `src/domain/orders/refund-transitions.ts`
- `src/domain/schema-invariants.test.ts`
- `src/domain/schema/transactions.ts`
- `src/features/admin-orders/admin-orders-ui.test.tsx`
- `src/features/admin-orders/api.ts`
- `src/features/admin-orders/components/AdminOrderDetailDashboard.tsx`
- `src/features/admin-orders/types.ts`
- `src/server/controllers/OrderController.ts`
- `src/server/repositories/OrderRepository.test.ts`
- `src/server/repositories/OrderRepository.ts`
- `src/server/routes/orders.routes.test.ts`
- `src/server/routes/orders.routes.ts`
- `src/server/services/OrderService.test.ts`
- `src/server/services/OrderService.ts`
- `docs/api-file-flow.md`
- `docs/jrw-simple-ecommerce-site.md`
- `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`
- `_bmad-output/implementation-artifacts/6-5-manual-refund-recording.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-09: Created ready-for-dev story with refund transition rules, append-only refund records, amount caps, Admin recording UI, customer-safe projection, and no-PayMongo-execution guardrails.
- 2026-07-09: Implemented manual refund recording across domain, schema, repository, service/controller/routes, Admin UI, customer-safe projection, tests, and development D1 migration.
- 2026-07-10: Code review completed; stale refund docs/status fixed and story moved to done.
