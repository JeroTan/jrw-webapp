# Story 6.4: Manual Return Recording

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin,
I want to record manual return status and details for an order or item,
so that JRW can track return handling without automating provider refunds.

## Acceptance Criteria

1. Active, approved Admin opens `/admin/orders/[id]`; existing Direction 05 admin shell and Direction 06 order truth detail remain intact, and the return lane exposes a manual "Record return" action without changing payment, fulfillment, or refund lanes.
2. `POST /api/admin/orders/:orderId/returns` requires Admin auth before controller execution, uses standard `{ data, meta }` / `{ error }` envelopes, accepts only documented TypeBox request fields, returns updated Admin order detail plus the new return record, and documents schemas, auth metadata, `admin-write` rate-limit class, and error codes.
3. Return recording supports order-level and item-level targets. Item-level records require a valid `order_snapshots.id` for the same order; Admin detail exposes a stable item identifier for selection without exposing mutable catalog truth as order truth.
4. Return status display may be `RETURN_NOT_REQUESTED` when no return record exists. Submitted return statuses must be one of `RETURN_REQUESTED`, `RETURN_APPROVED`, `RETURN_REJECTED`, `RETURN_RECEIVED`, `RETURN_COMPLETED`, or `RETURN_CANCELLED`; `RETURN_NOT_REQUESTED` is rejected as a submitted status because it is an idle lane value, not a process step.
5. Valid transition matrix follows `docs/order-status-flow.md`: no active return -> `RETURN_REQUESTED`; `RETURN_REQUESTED -> RETURN_APPROVED | RETURN_REJECTED | RETURN_CANCELLED`; `RETURN_APPROVED -> RETURN_RECEIVED`; `RETURN_RECEIVED -> RETURN_COMPLETED`; `RETURN_REJECTED`, `RETURN_CANCELLED`, and `RETURN_COMPLETED` are terminal.
6. New return cases require `payment_status = PAYMENT_PAID` and `fulfillment_status = DELIVERED`. Non-paid orders, cancelled orders before shipping, shipped-not-delivered orders, and stale/terminal return states return `CONFLICT_STATE` or documented conflict code and do not append a return record.
7. Each return record retains status, previous status, reason, optional amount centavos, notes, reference ID, actor, order/item target, request ID, and timestamps. History is append-only/auditable; edits do not overwrite prior records.
8. Invalid status, invalid transition, invalid target item, invalid amount, duplicate/mismatched request ID, and unauthorized actor attempts return safe validation/conflict/auth errors and add no return history.
9. Customer and Admin order read models show latest return status through customer-safe labels and color-independent badges/timeline events. Customer endpoints never expose Admin notes, reference IDs, actor IDs, raw request IDs, or internal/provider details.
10. Tests cover return domain transition matrix, delivered/payment gates, order/item target validation, append-only history, request-id idempotency mismatch, Admin route RBAC/OpenAPI/envelopes, customer-safe label projection, Admin UI valid/disabled/conflict states, and `npm run check` or documented blocker.

## Tasks / Subtasks

- [ ] Add pure return transition domain rules. (AC: 4, 5, 6, 8, 9)
  - [ ] Create `src/domain/orders/return-transitions.ts` or `src/domain/returns-refunds/return-transitions.ts`; keep it provider-free and DB-free.
  - [ ] Export exact `ReturnStatus` union for submitted statuses, `ReturnDisplayStatus` if needed, label helpers, allowed-next helper, status guard, and transition evaluator.
  - [ ] Treat `RETURN_NOT_REQUESTED` as display idle only. It can appear in lanes when no record exists, but must not be accepted as a mutation target.
  - [ ] Enforce transition matrix from `docs/order-status-flow.md`.
  - [ ] Enforce new-case gate: payment paid and delivered fulfillment.

- [ ] Add append-only return persistence. (AC: 3, 7, 8)
  - [ ] Add Drizzle table in `src/domain/schema/transactions.ts`, recommended name `order_return_records`.
  - [ ] Add migration `migrations/0034_order_return_records.sql` unless another migration already claimed that number.
  - [ ] Columns should include `id`, `order_id`, nullable `order_snapshot_id`, `target_type`, nullable `previous_return_status`, `return_status`, nullable `amount_centavos`, `currency`, `reason`, nullable `notes`, nullable `reference_id`, `actor_id`, `request_id`, `created_at`, and `updated_at`.
  - [ ] Add FK to `orders.id` with cascade delete and FK to `order_snapshots.id` with cascade or set-null chosen deliberately.
  - [ ] Add unique index on `request_id`; add indexes on `order_id`, `order_snapshot_id`, `return_status`, and `created_at`.
  - [ ] Add relations and schema invariant tests that reject customer contact, provider payload, tokens, signatures, raw PayMongo fields, and card data in the return table.

- [ ] Extend `DrizzleOrderRepository` read models and mutation methods. (AC: 2, 3, 6, 7, 8, 9)
  - [ ] Load latest return record per order for Customer list/detail and Admin list/detail; pass latest status and timestamp into `buildCustomerOrderStatusLanes`.
  - [ ] Add Admin-only return history to Admin detail, including safe labels and target labels.
  - [ ] Expose `snapshotId` or equivalent stable item id only where Admin return selection needs it. Avoid adding internal item ids to Customer responses unless explicitly documented and tested.
  - [ ] Add a transition subject loader with order id/number, payment status, fulfillment status, current latest return status, snapshots, and totals.
  - [ ] Add `recordAdminOrderReturn(...)` that validates same-order item target, appends a record, and returns updated Admin detail.
  - [ ] Copy 6.3 request-id learning: if an existing `request_id` row is found, accept it only when order, target, previous status, new status, and submitted details match; otherwise return stale/conflict instead of silently reusing another record.

- [ ] Extend service/controller/routes. (AC: 2, 6, 7, 8, 9)
  - [ ] Add `OrderService.recordAdminOrderReturn(...)` using existing Admin-only policy; Super Admin remains denied unless product policy changes intentionally.
  - [ ] Validate blank order id, invalid target type, missing item id for item target, unknown item id, unknown status, idle status, blank reason, oversized text, and invalid amount.
  - [ ] Return `RESOURCE_NOT_FOUND` for unknown order, `VALIDATION_FAILED` for bad body/status/amount, `CONFLICT_STATE` for invalid state transitions or stale latest return state, and `PROVIDER_UNAVAILABLE` for D1 failures.
  - [ ] Publish safe audit events with `refund-return.return_recorded` for first record and `refund-return.status_changed` for later records. Audit failure must never mask a successful return record.
  - [ ] Add `OrderController.recordAdminOrderReturn(...)`.
  - [ ] Add route `POST /admin/orders/:orderId/returns` in `src/server/routes/orders.routes.ts` with TypeBox params/body/response schemas, `routeDetail(...)`, `rbacGuard(adminOrderAuth)`, `admin-write` rate-limit class, and full error code list.
  - [ ] Do not add email, PayMongo refund, inventory, or Customer mutation behavior in this story.

- [ ] Extend Admin order UI. (AC: 1, 3, 8, 9)
  - [ ] Update `src/features/admin-orders/types.ts` with return record, return response, and Admin item selection fields.
  - [ ] Add `recordAdminOrderReturn(...)` to `src/features/admin-orders/api.ts`.
  - [ ] Extend `AdminOrderDetailDashboard.tsx` rather than creating a parallel order detail screen.
  - [ ] Use existing shared primitives: `Button`, `Input`, `Select`, `Textarea`, `Modal` or `Drawer`, `StatusBadge`, `Skeleton`, `EmptyState`, and `Toast`/inline alert as appropriate.
  - [ ] UI must show visible labels for target type, item, status, amount, reason, notes, and reference ID. Required fields must be clear.
  - [ ] Button copy should be operational: "Record return", "Save return record", "Return requested", "Return approved", "Return received", "Return completed". Do not show raw status codes in routine UI.
  - [ ] Disable or explain return action when payment is not paid, fulfillment is not delivered, return is terminal, or selected item is invalid.
  - [ ] On `CONFLICT_STATE`, refresh latest order detail and show allowed next status or safe reason.
  - [ ] Show return history in Admin detail, newest-first, with target label, safe status label, amount when present, reason, notes, reference ID, actor safe id/label, and timestamp.

- [ ] Update customer-safe projection. (AC: 9)
  - [ ] Ensure Customer order list/detail and Admin list/detail receive latest return status from persistence.
  - [ ] Keep `RETURN_NOT_REQUESTED` out of customer timeline events; existing `activeSupportTimelineEvents` already suppresses idle values, so preserve that behavior.
  - [ ] Hide Admin-only return details from Customer endpoints while still showing safe return lane label when a return exists.

- [ ] Add focused tests and validation. (AC: 10)
  - [ ] Add domain tests for return status guards, labels, valid transitions, terminal states, idle rejection, paid/delivered gate, and unknown values.
  - [ ] Extend `src/domain/schema-invariants.test.ts` for `order_return_records`.
  - [ ] Extend `src/server/repositories/OrderRepository.test.ts` for append-only history, latest status projection, item target validation, idempotency match/mismatch, and customer detail hiding notes.
  - [ ] Extend `src/server/services/OrderService.test.ts` for Admin allow/deny, Super Admin denial, payment/fulfillment gates, invalid transitions, audit publish/failure, and safe errors.
  - [ ] Extend `src/server/routes/orders.routes.test.ts` for POST OpenAPI metadata, RBAC denial before controller, success envelope, validation envelope, and conflict envelope.
  - [ ] Extend `src/features/admin-orders/admin-orders-ui.test.tsx` for return form states, disabled reasons, successful refresh, conflict refresh, and no raw status codes in visible copy.
  - [ ] Run targeted tests plus `npm run check`; run `npm run build-test` if route/schema/UI changes are broad enough or document blocker.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [ ] Route auth metadata declares required auth, `roles: ["ADMIN"]`, and `admin-write` rate-limit class.
- [ ] Route-level RBAC guard runs before validation or side effects for `POST /api/admin/orders/:orderId/returns`.
- [ ] Service/controller enforces actor state before mutation: authenticated, active, verified, approved.
- [ ] Brand-scoped reads or writes: N/A because JRW order returns are single-store Admin operations, not brand-scoped catalog editing.
- [ ] Public/customer endpoints document why brand membership is not required and expose safe labels only.
- [ ] Denial tests cover unauthenticated actor, Customer/Prospect wrong role, Super Admin current-policy denial, suspended/inactive/unverified/unapproved Admin, and controller-not-called guard path.
- [ ] Error response uses safe envelope codes and does not leak provider/internal authorization, email, phone, address, notes to Customer, reference IDs to Customer, request IDs outside meta, DB errors, or stack details.
- [ ] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, request body, response schema, denial codes, validation codes, and conflict codes.

## Dev Notes

### Current Code Intelligence

- Story 6.3 is done and added fulfillment transition/event/email patterns in:
  - `src/domain/orders/fulfillment-transitions.ts`
  - `src/domain/notifications/fulfillment-status-email.ts`
  - `src/adapter/infrastructure/resend/FulfillmentStatusEmailNotifier.ts`
  - `src/domain/schema/transactions.ts`
  - `migrations/0033_order_fulfillment_events.sql`
  - `src/server/repositories/OrderRepository.ts`
  - `src/server/services/OrderService.ts`
  - `src/server/controllers/OrderController.ts`
  - `src/server/routes/orders.routes.ts`
  - `src/features/admin-orders/api.ts`
  - `src/features/admin-orders/types.ts`
  - `src/features/admin-orders/components/AdminOrderDetailDashboard.tsx`
- `src/domain/orders/customer-order-status.ts` already has safe labels for `RETURN_NOT_REQUESTED`, `RETURN_REQUESTED`, `RETURN_APPROVED`, `RETURN_REJECTED`, `RETURN_RECEIVED`, `RETURN_COMPLETED`, and `RETURN_CANCELLED`.
- `buildCustomerOrderStatusLanes(...)` already accepts optional `returnStatus` and `refundStatus`, but `OrderRepository.buildOrderReadModel(...)` currently passes only payment/fulfillment. 6.4 must feed latest persisted return status into this helper.
- `buildCustomerOrderTimeline(...)` already suppresses `RETURN_NOT_REQUESTED` and `REFUND_NOT_REQUESTED` from the customer timeline. Preserve that exact behavior.
- `src/domain/schema/transactions.ts` currently has `orders`, `order_fulfillment_events`, and `order_snapshots`, but no return/refund history table.
- `order_snapshots.id` exists but current Admin item DTO does not expose it. Item-level return recording needs a stable snapshot item id for Admin selection.
- `OrderRepository.transitionAdminOrderFulfillment(...)` contains reusable patterns for D1 transaction fallback, conditional state checks, request-id uniqueness, read-back, and updated Admin detail response.
- `OrderService.requireAdminActor(...)` is local to `OrderService.ts`; new return use case should reuse this path and preserve current Admin-only policy.
- `orders.routes.ts` already defines `adminOrderAuth`, `adminOrderErrors`, `tboxLane`, Admin order schemas, `rbacGuard(adminOrderAuth)`, and `routeDetail(...)` patterns for the fulfillment mutation.
- `src/domain/audit/events.ts` already supports `refund-return.return_recorded`, `refund-return.refund_recorded`, and `refund-return.status_changed`; use those instead of inventing audit action strings.
- `AdminOrderDetailDashboard.tsx` currently renders status lanes, customer-safe timeline, purchased items, fulfillment actions, customer contact, and shipping in Direction 06 style. Add return recording inside this surface.
- Shared UI primitives already include `Button`, `Input`, `Select`, `Textarea`, `Modal`, `Drawer`, `ConfirmDialog`, `SegmentedControl`, `StatusBadge`, `Skeleton`, `EmptyState`, and `Toast`.

### Previous Story Intelligence

- 6.3 code review fixed a request-id idempotency bug where a reused request id could be accepted without checking same order/status tuple. Apply the same exact-match rule to return records.
- 6.3 kept fulfillment email/audit side effects from rolling back successful domain state. 6.4 has no email; audit failure still must not mask successful return persistence.
- 6.3 UI deliberately did not add return/refund controls. This story owns the return action only; leave refund recording for Story 6.5.
- 6.3 validation passed focused Vitest, `npm run check`, and `npm run build-test`. Follow that test discipline for schema/routes/UI changes.
- Manual authenticated Admin browser QA was not available in 6.3. If skipped again, document blocker clearly in Dev Agent Record.

### Git Intelligence

Recent commits show current order flow:

- `059573d chore: 6-3 reviewed`
- `1e98901 chore: added scroll loading more`
- `9365cbe feat: 6-3 implemented`
- `b164edb docs: 6-3 story created`
- `d5c625f chore: 6-2 reviewed`

Actionable read: extend the existing order stack. Do not create new parallel route/service/repository/UI modules for returns when `orders.routes.ts`, `OrderController`, `OrderService`, `OrderRepository`, and `admin-orders` already own the order surface.

### Return State Model

Display idle:

```ts
RETURN_NOT_REQUESTED
```

Submitted statuses:

```ts
RETURN_REQUESTED
RETURN_APPROVED
RETURN_REJECTED
RETURN_RECEIVED
RETURN_COMPLETED
RETURN_CANCELLED
```

Allowed transitions:

```ts
no active record -> RETURN_REQUESTED
RETURN_REQUESTED -> RETURN_APPROVED | RETURN_REJECTED | RETURN_CANCELLED
RETURN_APPROVED -> RETURN_RECEIVED
RETURN_RECEIVED -> RETURN_COMPLETED
RETURN_REJECTED -> terminal
RETURN_CANCELLED -> terminal
RETURN_COMPLETED -> terminal
```

Creation gates:

```ts
paymentStatus === "PAYMENT_PAID"
fulfillmentStatus === "DELIVERED"
```

Conflict reasons to consider:

```ts
INVALID_TRANSITION
PAYMENT_NOT_PAID
FULFILLMENT_NOT_DELIVERED
SAME_RETURN_STATUS
STALE_RETURN_STATUS
TERMINAL_RETURN_STATUS
UNKNOWN_RETURN_STATUS
UNKNOWN_TARGET_STATUS
INVALID_RETURN_TARGET
REQUEST_ID_MISMATCH
```

### API Contract Guidance

Recommended request body:

```ts
type RecordAdminOrderReturnRequest = {
  targetType: "ORDER" | "ITEM";
  orderSnapshotId?: string;
  targetStatus: ReturnStatus;
  amountCentavos?: number;
  reason: string;
  notes?: string;
  referenceId?: string;
};
```

Recommended success payload:

```ts
type RecordAdminOrderReturnResponse = {
  allowedNextStatuses: ReturnStatus[];
  order: AdminOrderDetail;
  returnRecord: {
    id: string;
    targetType: "ORDER" | "ITEM";
    orderSnapshotId: string | null;
    targetLabel: string;
    previousStatus: ReturnDisplayStatus | null;
    status: ReturnStatus;
    statusLabel: string;
    amountCentavos: number | null;
    currency: "PHP";
    reason: string;
    notes: string | null;
    referenceId: string | null;
    actorId: string | null;
    createdAt: string;
  };
};
```

Recommended conflict details:

```ts
{
  allowedNextStatuses: ReturnStatus[];
  currentStatus?: ReturnDisplayStatus;
  fulfillmentStatus?: string;
  paymentStatus?: string;
  reason:
    | "INVALID_TRANSITION"
    | "PAYMENT_NOT_PAID"
    | "FULFILLMENT_NOT_DELIVERED"
    | "STALE_RETURN_STATUS"
    | "TERMINAL_RETURN_STATUS"
    | "INVALID_RETURN_TARGET"
    | "REQUEST_ID_MISMATCH";
  targetStatus?: string;
}
```

### Architecture Compliance

- Follow Route -> Controller -> Service -> Domain/Repository.
- Domain transition rules stay pure and testable without HTTP, D1, PayMongo, Resend, Astro, Elysia, or React.
- Repository handles D1 query, transition subject, snapshot-target validation, append-only insert, latest return status projection, and Admin return-history read model.
- Service orchestrates Admin guard, input validation, domain decision, repository mutation, audit publish, and safe error mapping.
- Controller maps `AppResult` to API envelopes.
- Route owns TypeBox schemas, `routeDetail(...)`, `rbacGuard`, rate class, and OpenAPI docs.
- Schema changes belong in `src/domain/schema/transactions.ts`, `migrations/`, and schema invariant tests.
- Do not import `cloudflare:workers` from domain modules.
- Do not update `orders.payment_status`, `orders.fulfillment_status`, provider payment rows, inventory rows, or refund records in this story.

### Design Direction Fidelity

- Follow `_bmad-output/planning-artifacts/ux-design-directions.html`:
  - Direction 05 for dashboard shell, sidebar/topbar continuity, dense operational controls.
  - Direction 06 for order truth detail, separate payment/fulfillment/return/refund lanes, and "Record Return" action placement.
- Follow `_bmad-output/planning-artifacts/ux-design-specification.md#ReturnRefundRecorder`:
  - Type, status, amount, reason, notes, reference ID, actor, timestamp.
  - States: not requested, requested, approved, rejected, received/completed, validation error.
  - Clear labels and confirmation before saving sensitive records.
- Keep UI copy operational and short. Avoid routine copy that explains internal architecture or provider boundaries.
- Use shared primitives and Tailwind v4 token utilities directly in feature markup.
- No shadows, blur, rounded cards, decorative gradients, `jrw-*` selectors, or raw status-code copy in normal UI.
- Done requires UI test assertions or documented manual QA blocker for form states, disabled reasons, and conflict refresh.

### Latest Technical Information

- Elysia OpenAPI docs confirm route `detail` fields describe generated operations and route schemas drive OpenAPI output. Keep `routeDetail(...)`, TypeBox body/params/response schemas, tags, auth metadata, and error codes on the new POST endpoint.
- Elysia lifecycle docs describe `transform` hooks running before validation. Keep `rbacGuard(adminOrderAuth)` on the route so auth denial runs before handler/controller side effects, matching existing route pattern.
- Drizzle insert docs support `.insert(...).values(...).returning(...)` and conflict handling. Use parameterized insert and return the inserted return record for API response.
- Drizzle update docs support `.update(...).set(...).where(...).returning(...)`, but 6.4 should usually append to `order_return_records` instead of updating previous records.
- Drizzle transaction docs support grouping statements with `db.transaction(...)`; mirror the 6.3 repository fallback for D1 explicit transaction limitations if multiple statements must behave as one unit.

### Testing Requirements

- Add `src/domain/orders/return-transitions.test.ts` or equivalent under `src/domain/returns-refunds`.
- Extend `src/domain/schema-invariants.test.ts`.
- Extend `src/server/repositories/OrderRepository.test.ts`; keep D1/Miniflare timeout pattern used by existing repository tests.
- Extend `src/server/services/OrderService.test.ts` with audit publisher stub and deterministic `now`.
- Extend `src/server/routes/orders.routes.test.ts`.
- Extend `src/features/admin-orders/admin-orders-ui.test.tsx`.
- Extend `src/domain/orders/customer-order-status.test.ts` if label/timeline behavior changes.
- Run targeted tests plus `npm run check`; prefer `npm run build-test` before moving story to review because this changes schema, API, service, repository, and React UI.

### Anti-Patterns To Avoid

- Do not treat `RETURN_NOT_REQUESTED` as a submitted transition target.
- Do not overwrite prior return records.
- Do not merge return status into fulfillment/payment/refund statuses.
- Do not mutate PayMongo, payment records, refund records, or inventory.
- Do not send return emails in this story.
- Do not expose Admin notes, reference IDs, actor IDs, request IDs, checkout email, phone, address, provider ids, tokens, raw provider payloads, stack traces, or DB errors to Customer responses.
- Do not use mutable catalog product data for return item truth; use `order_snapshots`.
- Do not create a separate return API stack outside current order route/controller/service/repository path.
- Do not silently allow Super Admin while `/admin/orders` remains Admin-only.
- Do not show raw database status codes in visible UI.
- Do not add generic global state library or optimistic order-status updates.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 6.4: Manual Return Recording`
- `_bmad-output/planning-artifacts/prd.md#Orders, Fulfillment, Returns & Refunds`
- `_bmad-output/planning-artifacts/prd.md#Reliability & Data Integrity`
- `_bmad-output/planning-artifacts/architecture.md#API & Communication Patterns`
- `_bmad-output/planning-artifacts/architecture.md#Component Boundaries`
- `_bmad-output/planning-artifacts/ux-design-specification.md#Order Operations, Return, Refund`
- `_bmad-output/planning-artifacts/ux-design-specification.md#ReturnRefundRecorder`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-05`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-06`
- `docs/order-status-flow.md`
- `_bmad-output/implementation-artifacts/6-3-fulfillment-status-transitions-and-emails.md`
- Elysia OpenAPI docs: https://elysiajs.com/patterns/openapi
- Elysia lifecycle docs: https://elysiajs.com/essential/life-cycle
- Drizzle insert docs: https://orm.drizzle.team/docs/insert
- Drizzle update docs: https://orm.drizzle.team/docs/update
- Drizzle transaction docs: https://orm.drizzle.team/docs/transactions

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-07-09: Created ready-for-dev story with return transition rules, append-only return records, Admin recording UI, customer-safe projection, and validation guardrails.
