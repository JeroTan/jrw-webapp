# Story 6.3: Fulfillment Status Transitions and Emails

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin,
I want to move orders through valid fulfillment statuses,
so that Customers can track delivery progress.

## Acceptance Criteria

1. Active, approved Admin opens `/admin/orders/[id]`; existing Direction 05 admin shell and Direction 06 order truth detail remain intact, and a fulfillment action panel shows only valid next fulfillment actions with disabled reasons for invalid actions.
2. `PATCH /api/admin/orders/:orderId/fulfillment` requires Admin auth before controller execution, uses standard `{ data, meta }` / `{ error }` envelopes, accepts body `{ targetStatus }`, returns updated order detail plus transition/email result, and documents schemas, auth metadata, `admin-write` rate-limit class, and error codes.
3. Valid transition matrix follows `docs/order-status-flow.md`: `ORDER_PLACED -> PROCESSING | CANCELLED`, `PROCESSING -> SHIPPED | CANCELLED`, `SHIPPED -> DELIVERED`; `DELIVERED` and `CANCELLED` are terminal for fulfillment.
4. Fulfillment progression and cancellation require `payment_status = PAYMENT_PAID`. `PAYMENT_PENDING`, `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, and `PAYMENT_CANCELLED` block with safe `CONFLICT_STATE` detail and do not change fulfillment.
5. Invalid or stale transitions return `CONFLICT_STATE` or documented conflict code, preserve existing fulfillment status, and tell UI allowed next statuses or safe reason. Payment lane remains unchanged for every fulfillment transition.
6. Fulfillment update persists atomically with old status, new status, actor, order target, timestamp, request ID, and email-send state. Concurrent requests cannot silently overwrite a newer fulfillment status.
7. Fulfillment status update email is sent or durably queued/tracked for retry. Email failure is logged with safe operational context and marks email state retryable/failed without rolling back valid fulfillment state.
8. Audit/event hook emits or records safe actor, order target, old/new fulfillment status, timestamp, and request ID. Audit failure never masks successful fulfillment update.
9. Customer/Admin order views show updated safe fulfillment labels while payment, return, and refund lanes remain separate. `RETURN_NOT_REQUESTED` and `REFUND_NOT_REQUESTED` stay idle lane values and are not transition steps.
10. Tests cover domain transition matrix, repository atomic update and concurrency conflict, service payment gate, route RBAC/OpenAPI/envelopes, email success/failure, audit event, Admin UI valid/disabled/conflict states, and `npm run check` or documented blocker.

## Tasks / Subtasks

- [x] Add pure fulfillment transition domain rules. (AC: 3, 4, 5, 9)
  - [x] Created `src/domain/orders/fulfillment-transitions.ts`.
  - [x] Exported exact `FulfillmentStatus` union and status guard/label helpers.
  - [x] Exported allowed-next and transition decision helpers with safe reason codes.
  - [x] Enforced `PAYMENT_PAID` gate.
  - [x] Added unit tests for valid paths, terminal states, unpaid states, unknown values, and no payment-lane mutation.

- [x] Add durable fulfillment transition/email tracking. (AC: 6, 7, 8)
  - [x] Added `order_fulfillment_events` schema and relations.
  - [x] Added old/new fulfillment, actor, request, timestamp, and email state columns.
  - [x] Added `order_id`, `email_status`, `created_at`, and unique `request_id` indexes.
  - [x] Added `migrations/0033_order_fulfillment_events.sql`.
  - [x] Updated schema invariant tests and kept table separate from Epic 7 audit.

- [x] Extend `DrizzleOrderRepository` with mutation and email-claim methods. (AC: 4, 5, 6, 7)
  - [x] Added transition subject loader with payment/fulfillment/contact/order/snapshot data.
  - [x] Added conditional fulfillment update guarded by current status and paid payment status.
  - [x] Added transition-event insert/find and same-request idempotency handling.
  - [x] Added fulfillment email claim, sent, failed, and email payload methods.
  - [x] Preserved Customer/Admin read contracts from 6.1/6.2.

- [x] Extend `OrderService` with Admin fulfillment use case. (AC: 2, 4, 5, 6, 7, 8)
  - [x] Added `updateAdminOrderFulfillment(...)`.
  - [x] Reused Admin-only policy; Super Admin remains denied.
  - [x] Validated blank order id and unknown target as `VALIDATION_FAILED`.
  - [x] Returned `RESOURCE_NOT_FOUND` for unknown orders and `CONFLICT_STATE` for invalid payment/status/stale transitions.
  - [x] Persisted fulfillment/event before email/audit side effects; D1 local explicit transaction limitation falls back to same conditional update/event sequence.
  - [x] Sent/claimed email after persistence; email failure returns success with `email.status = "FAILED"`.
  - [x] Published safe audit events with `order.status_changed`, `order.fulfilled`, or `order.cancelled`.
  - [x] Logged email failures through `OperationalLogger` with safe details.

- [x] Add fulfillment status email domain and Resend adapter. (AC: 7)
  - [x] Created `src/domain/notifications/fulfillment-status-email.ts`.
  - [x] Created `src/adapter/infrastructure/resend/FulfillmentStatusEmailNotifier.ts`.
  - [x] Reused existing email template/config helpers.
  - [x] Kept email payload customer-safe with status label, order number, status URL, and snapshot items.
  - [x] Missing config uses failing notifier fallback.

- [x] Extend controller/routes/OpenAPI. (AC: 2, 5, 7)
  - [x] Added `OrderController.updateAdminOrderFulfillment(...)`.
  - [x] Added `PATCH /api/admin/orders/:orderId/fulfillment`.
  - [x] Added TypeBox body schema with supported target statuses and `additionalProperties: false`.
  - [x] Added response schema for updated `order`, `transition`, `email`, and `allowedNextStatuses`.
  - [x] Added conflict/provider/validation/auth error codes.
  - [x] Added runtime wiring for `operationalLogger` and fulfillment email notifier; `createApp(...)` passes canonical logger.
  - [x] Kept `rbacGuard(adminOrderAuth)` on route before controller construction.

- [x] Update Admin order detail UI. (AC: 1, 5, 7, 9)
  - [x] Extended `AdminOrderDetailDashboard.tsx` with fulfillment action panel.
  - [x] Show valid next action buttons only and safe blocked-state reasons.
  - [x] On success, reconciles order detail and shows email state alert.
  - [x] On `CONFLICT_STATE`, refreshes latest detail and shows safe reason.
  - [x] Kept payment, fulfillment, return, refund lanes separate with no return/refund controls.
  - [x] Kept dense square controls using shared `src/components` primitives.

- [x] Add focused tests. (AC: 3, 4, 5, 6, 7, 8, 10)
  - [x] Domain tests cover matrix, payment gate, terminal states, and unknown values.
  - [x] Repository tests cover conditional update, stale conflict, event insert, email claim/mark, and email payload.
  - [x] Service tests cover Admin allow/deny, non-paid conflict, stale conflict, email failure non-rollback, and audit publish/failure.
  - [x] Route tests cover OpenAPI metadata, RBAC denial before controller, success envelope, and conflict envelope.
  - [x] UI tests cover valid buttons, blocked reasons, and no return/refund controls.

- [x] Run validation gates. (AC: 10)
  - [x] Focused Vitest suite: 8 files, 59 tests passed.
  - [x] `npm run check`: passed with existing hints only.
  - [x] `npm run build-test`: passed; includes check, 140 test files / 939 tests, and development Astro build.
  - [x] Token scan ran; hits are existing `jrw-studio` fixtures and tests, not new CSS/token selectors.
  - [x] Manual/admin viewport QA: not run; no authenticated Admin browser fixture/session was established in this turn.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [x] Route auth metadata declares required auth, `roles: ["ADMIN"]`, and `admin-write` rate-limit class.
- [x] Route-level RBAC guard runs before validation or side effects for `PATCH /api/admin/orders/:orderId/fulfillment`.
- [x] Service/controller enforces actor state before mutation: authenticated, active, verified, approved.
- [x] Brand-scoped reads or writes: N/A because JRW order fulfillment is single-store Admin operations, not brand-scoped catalog editing.
- [x] Public/customer endpoints: N/A for new 6.3 work; existing Customer order endpoints remain unchanged and read-only.
- [x] Denial tests cover unauthenticated actor, Customer/Prospect wrong role, Super Admin current-policy denial, suspended/inactive/unverified/unapproved Admin.
- [x] Error response uses safe envelope codes and does not leak provider/internal authorization, email, phone, address, or stack details.
- [x] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, request body, response schema, denial codes, and conflict codes.

## Code Review Findings

- [x] [P1] Fulfillment request-id idempotency accepted an existing `order_fulfillment_events.request_id` without checking same order, old status, and target status. A reused request ID could return a prior transition for another order and silently skip the requested order. Fixed by requiring exact idempotency match and returning stale conflict details for mismatches.
- [x] [P2] Route guard coverage did not directly exercise `PATCH /api/admin/orders/:orderId/fulfillment` denial before controller construction. Added direct denial assertions for anonymous, Customer, Prospect, and Super Admin contexts.

## Dev Notes

### Current Code Intelligence

- Story 6.2 is done and added Admin order list/detail in:
  - `src/features/admin-orders/api.ts`
  - `src/features/admin-orders/types.ts`
  - `src/features/admin-orders/components/AdminOrderListDashboard.tsx`
  - `src/features/admin-orders/components/AdminOrderDetailDashboard.tsx`
  - `src/pages/admin/orders/index.astro`
  - `src/pages/admin/orders/[id].astro`
  - `src/server/repositories/OrderRepository.ts`
  - `src/server/services/OrderService.ts`
  - `src/server/controllers/OrderController.ts`
  - `src/server/routes/orders.routes.ts`
- `AdminOrderDetailDashboard.tsx` currently renders read-only lanes, customer-safe timeline projection, snapshot items, fulfillment contact, and shipping data. 6.3 should extend this page instead of creating a parallel detail surface.
- `OrderRepository` currently has Customer read methods and Admin read methods. It does not yet mutate fulfillment status and does not have fulfillment email/event persistence.
- `OrderService` currently injects only `repository`. 6.3 needs service options for email notifier, audit publisher, operational logger, and `now` if tests need deterministic timestamps.
- `orders.routes.ts` has `customerOrderAuth` and `adminOrderAuth`; Admin read endpoints use `admin-read`. New fulfillment mutation must use `admin-write`.
- `orderActor(...)` currently omits `safeActorId`. Add it if audit needs safe actor identity.
- `src/domain/audit/events.ts` already supports `order.status_changed`, `order.fulfilled`, `order.cancelled`, safe detail scrubbing, and `NoopAuditEventPublisher`.
- Existing email notifiers:
  - `src/domain/notifications/order-confirmation-email.ts`
  - `src/domain/notifications/payment-status-email.ts`
  - `src/adapter/infrastructure/resend/OrderConfirmationEmailNotifier.ts`
  - `src/adapter/infrastructure/resend/PaymentStatusEmailNotifier.ts`
- Existing email status pattern uses `PENDING`, `SENDING`, `SENT`, `FAILED`, claim stale `SENDING`, provider message id, and operational logging. Follow that pattern for fulfillment updates.
- Existing schema has `orders.fulfillment_status`, `orders.updated_request_id`, and order-confirmation email columns, but no fulfillment-status email columns or event table.

### Previous Story Intelligence

- 6.2 review fixes:
  - Snapshot images must come from `order_snapshots.image_r2_key`, not mutable current catalog photos.
  - Date-only filters need inclusive end-of-day behavior.
  - Admin detail now renders snapshot image route `/assets/products/...` when `imageR2Key` exists.
- 6.2 validation passed: targeted order tests, full Vitest suite, `npm run check`, `npm run build-development`, and token scan.
- 6.2 kept Super Admin denied on daily Admin order pages per current page guard/API policy. Preserve unless Product intentionally changes policy.
- 6.2 was read-only by design. 6.3 owns fulfillment mutation, emails, and event hook integration.

### Git Intelligence

Recent commits show current order flow:

- `d5c625f chore: 6-2 reviewed`
- `e70958d feat: 6-2 bug fixing and implementation`
- `770078b feat: 6-2 implemented`
- `3d097a7 docs: story 6-2 created`
- `8d4befc fix: adjust backfill`

Actionable read: extend existing `orders.routes.ts`, `OrderController`, `OrderService`, `OrderRepository`, and `admin-orders` UI. Do not create a second order stack.

### Transition Matrix

Allowed fulfillment transitions:

```ts
ORDER_PLACED -> PROCESSING | CANCELLED
PROCESSING -> SHIPPED | CANCELLED
SHIPPED -> DELIVERED
DELIVERED -> terminal
CANCELLED -> terminal
```

Payment gate:

```ts
paymentStatus must equal "PAYMENT_PAID"
```

Blocked cases:

- `PAYMENT_PENDING`, `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, `PAYMENT_CANCELLED`: no fulfillment mutation.
- `SHIPPED -> CANCELLED`: blocked; return support path belongs later.
- `DELIVERED -> *`: blocked; return support path belongs Story 6.4.
- `CANCELLED -> *`: blocked.
- Same-status target: conflict/no-op response, no duplicate email.

### Data And Email Persistence Guidance

Preferred table:

```ts
order_fulfillment_events {
  id: text primary key
  order_id: text not null references orders.id
  actor_id: text
  old_fulfillment_status: text not null
  new_fulfillment_status: text not null
  request_id: text not null
  email_status: text not null default "PENDING"
  email_sent_at: text
  email_last_attempt_at: text
  email_message_id: text
  created_at: text not null default CURRENT_TIMESTAMP
  updated_at: text not null default CURRENT_TIMESTAMP
}
```

Use a migration and schema invariant tests. Do not rely only on `orders.updated_request_id` for email retry; it cannot track multiple status-change emails.

Recommended API success payload:

```ts
type FulfillmentTransitionResponse = {
  order: AdminOrderDetail;
  transition: {
    eventId: string;
    oldStatus: FulfillmentStatus;
    newStatus: FulfillmentStatus;
  };
  email: {
    status: "PENDING" | "SENDING" | "SENT" | "FAILED";
  };
  allowedNextStatuses: FulfillmentStatus[];
};
```

Recommended conflict details:

```ts
{
  reason: "INVALID_TRANSITION" | "PAYMENT_NOT_PAID" | "STALE_FULFILLMENT_STATUS" | "TERMINAL_FULFILLMENT_STATUS";
  currentStatus?: FulfillmentStatus;
  paymentStatus?: string;
  allowedNextStatuses: FulfillmentStatus[];
}
```

### Architecture Compliance

- Follow Route -> Controller -> Service -> Domain/Repository.
- Domain transition rules stay pure and testable without HTTP, D1, Resend, or React.
- Repository handles D1 transaction/update/event/email-state mechanics.
- Service orchestrates Admin guard, domain decision, repository mutation, email send, audit publish, and operational logs.
- Controller maps `AppResult` to API envelopes.
- Route owns TypeBox schemas, `routeDetail(...)`, `rbacGuard`, rate class, and OpenAPI docs.
- Resend adapter belongs under `src/adapter/infrastructure/resend/**`; domain notifier interface belongs under `src/domain/notifications/**`.
- Schema changes belong in `src/domain/schema/transactions.ts`, `migrations/`, and schema invariant tests.
- Do not import `cloudflare:workers` from domain modules.

### Design Direction Fidelity

- Follow `_bmad-output/planning-artifacts/ux-design-directions.html`:
  - Direction 05 for dashboard shell, sidebar/topbar continuity, dense operational controls.
  - Direction 06 for order truth detail and separate payment/fulfillment/return/refund lanes.
- Follow `_bmad-output/planning-artifacts/ux-design-specification.md#OrderStatusPanel`:
  - Payment lane, fulfillment lane, return lane, refund lane, valid next actions.
  - Disabled actions explain why.
  - Conflict rolls back UI and shows allowed next status.
- Keep UI copy operational: "Mark processing", "Mark shipped", "Mark delivered", "Cancel before shipping"; avoid provider jargon and internal architecture copy.
- Use shared `Button`, `StatusBadge`, `Toast`/alert, `EmptyState`, and existing Tailwind token utilities.
- No shadows, blur, rounded cards, decorative gradients, or `jrw-*` selectors.

### Latest Technical Information

- Elysia OpenAPI docs state route `detail` extends OpenAPI operation metadata; keep `routeDetail(...)` and TypeBox schemas on the new PATCH endpoint so `/api/openapi/json` documents auth, body, response, and errors.
- Elysia lifecycle docs describe route hooks as request interceptors; keep `rbacGuard(adminOrderAuth)` on the route so protected denial happens before handler/controller side effects.
- Drizzle update docs show `.update(...).set(...).where(...).returning(...)`; use conditional `where(and(eq(orderId), eq(currentStatus), eq(paymentStatus)))` or a transaction/read-back equivalent to prevent stale overwrites.
- Drizzle transaction docs support grouping statements as one logical unit; persist `orders` update and `order_fulfillment_events` insert in one transaction where D1/Drizzle support allows.
- Resend official docs require API key and verified sender/domain; use existing config resolver and failing notifier fallback so missing config does not crash request handling.

### Testing Requirements

- Add `src/domain/orders/fulfillment-transitions.test.ts`.
- Extend `src/server/repositories/OrderRepository.test.ts`; keep Miniflare/D1 timeout at `20_000`.
- Extend `src/server/services/OrderService.test.ts` with email notifier stub, audit publisher stub, and operational logger stub.
- Extend `src/server/routes/orders.routes.test.ts` for PATCH OpenAPI and RBAC denial before controller.
- Extend `src/features/admin-orders/admin-orders-ui.test.tsx`.
- Add Resend adapter tests for fulfillment email template and provider error mapping.
- Run targeted tests plus `npm run check`; run `npm run build-development` because schema, routes, and UI change.

### Anti-Patterns To Avoid

- Do not merge payment status and fulfillment status.
- Do not mutate `payment_status`, return lane, refund lane, provider payment, or inventory in this story.
- Do not implement manual return/refund recording; Stories 6.4 and 6.5 own that.
- Do not cancel after shipping or delivery.
- Do not allow fulfillment progression when payment is not `PAYMENT_PAID`.
- Do not send email before DB transition commits.
- Do not rollback valid fulfillment update because email or audit failed.
- Do not send duplicate emails on retry/stale concurrent requests.
- Do not expose checkout email, phone, address, provider ids, checkout URLs, tokens, raw provider payloads, stack traces, or message ids in public/customer responses.
- Do not widen Customer order endpoints or add Customer mutation endpoints.
- Do not silently allow Super Admin while `/admin/orders` guard and Admin order APIs remain Admin-only.
- Do not use existing `orders.status` or `total_amount` as fulfillment truth.
- Do not add route/controller business rules that belong in domain/service/repository layers.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 6.3: Fulfillment Status Transitions and Emails`
- `_bmad-output/planning-artifacts/prd.md#Orders, Fulfillment, Returns & Refunds`
- `_bmad-output/planning-artifacts/prd.md#Notifications`
- `_bmad-output/planning-artifacts/architecture.md#Data Flow`
- `_bmad-output/planning-artifacts/ux-design-specification.md#OrderStatusPanel`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-05`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-06`
- `docs/order-status-flow.md`
- `docs/design-by-google-stitch.md`
- `_bmad-output/implementation-artifacts/6-2-admin-order-list-and-detail.md`
- Elysia OpenAPI docs: https://elysiajs.com/patterns/openapi
- Elysia lifecycle docs: https://elysiajs.com/essential/life-cycle
- Drizzle update docs: https://orm.drizzle.team/docs/update
- Drizzle transaction docs: https://orm.drizzle.team/docs/transactions
- Resend Node email docs: https://resend.com/docs/send-with-nodejs
- Resend send-email API docs: https://resend.com/docs/api-reference/emails/send-email

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npx vitest run src/domain/orders/fulfillment-transitions.test.ts src/domain/notifications/fulfillment-status-email.test.ts src/adapter/infrastructure/resend/FulfillmentStatusEmailNotifier.test.ts src/domain/schema-invariants.test.ts src/server/repositories/OrderRepository.test.ts src/server/services/OrderService.test.ts src/server/routes/orders.routes.test.ts src/features/admin-orders/admin-orders-ui.test.tsx`
- `npx vitest run src/server/repositories/OrderRepository.test.ts`
- `npx vitest run src/server/routes/orders.routes.test.ts`
- `npm run check`
- `git diff --check`
- `npm run build-test`
- `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`

### Completion Notes List

- Added pure fulfillment transition matrix and labels with payment-paid gate and safe conflict reasons.
- Added `order_fulfillment_events` persistence with request id idempotency, email state, migration, and schema invariant coverage.
- Added Admin fulfillment PATCH API with RBAC, OpenAPI metadata, standard envelopes, service orchestration, audit events, operational logging, and Resend fulfillment email notifier.
- Extended Admin order detail with a right-rail fulfillment action panel using shared primitives, full-width action buttons, blocked reasons, success email state messaging, and conflict refresh.
- Follow-up UX tweak moved the existing two-column snapshot/actions workspace near the top, with fulfillment actions kept in the right rail.
- Follow-up copy cleanup removed raw status codes and machine-oriented labels from Admin order UI.
- Code review fixed request-id idempotency mismatch handling for fulfillment events and added direct PATCH route denial coverage.
- Validation passed via focused Vitest suite, `npm run check`, and `npm run build-test`.
- Manual authenticated Admin browser QA was not run because no Admin browser fixture/session was established in this turn.

### File List

- `migrations/0033_order_fulfillment_events.sql`
- `src/adapter/infrastructure/resend/FulfillmentStatusEmailNotifier.test.ts`
- `src/adapter/infrastructure/resend/FulfillmentStatusEmailNotifier.ts`
- `src/domain/notifications/fulfillment-status-email.test.ts`
- `src/domain/notifications/fulfillment-status-email.ts`
- `src/domain/orders/fulfillment-transitions.test.ts`
- `src/domain/orders/fulfillment-transitions.ts`
- `src/domain/schema-invariants.test.ts`
- `src/domain/schema/transactions.ts`
- `src/features/admin-orders/admin-orders-ui.test.tsx`
- `src/features/admin-orders/api.ts`
- `src/features/admin-orders/components/AdminOrderDetailDashboard.tsx`
- `src/features/admin-orders/types.ts`
- `src/server/app.ts`
- `src/server/controllers/OrderController.ts`
- `src/server/repositories/OrderRepository.test.ts`
- `src/server/repositories/OrderRepository.ts`
- `src/server/routes/orders.routes.test.ts`
- `src/server/routes/orders.routes.ts`
- `src/server/services/OrderService.test.ts`
- `src/server/services/OrderService.ts`

## Change Log

- 2026-07-09: Created ready-for-dev story with fulfillment transition, email persistence, audit hook, Admin UI, and validation guardrails.
- 2026-07-09: Implemented fulfillment transition API, event/email tracking, Admin UI actions, tests, and validation; moved to review.
- 2026-07-09: Moved the existing Admin fulfillment actions right rail near the top of the order detail page for faster operations.
- 2026-07-09: Replaced machine-level Admin order UI labels/status text with human-facing copy.
- 2026-07-09: Code review fixed fulfillment request-id mismatch idempotency, added direct PATCH denial regression coverage, and moved story to done.
