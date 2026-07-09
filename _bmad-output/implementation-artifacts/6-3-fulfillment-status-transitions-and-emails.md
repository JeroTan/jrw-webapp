# Story 6.3: Fulfillment Status Transitions and Emails

Status: ready-for-dev

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

- [ ] Add pure fulfillment transition domain rules. (AC: 3, 4, 5, 9)
  - [ ] Create `src/domain/orders/fulfillment-transitions.ts`.
  - [ ] Export exact `FulfillmentStatus` union: `ORDER_PLACED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`.
  - [ ] Export helper(s) for allowed next statuses and transition decision with safe reason codes.
  - [ ] Enforce payment gate: only `PAYMENT_PAID` allows fulfillment movement.
  - [ ] Unit test valid paths, terminal states, non-paid payment states, unknown values, and no payment-status mutation.

- [ ] Add durable fulfillment transition/email tracking. (AC: 6, 7, 8)
  - [ ] Add schema table under `src/domain/schema/transactions.ts`; recommended name `order_fulfillment_events`.
  - [ ] Recommended columns: `id`, `order_id`, `actor_id`, `old_fulfillment_status`, `new_fulfillment_status`, `request_id`, `email_status`, `email_sent_at`, `email_last_attempt_at`, `email_message_id`, `created_at`, `updated_at`.
  - [ ] Add indexes for `order_id`, `email_status`, and `created_at`; add uniqueness/idempotency around `request_id` or equivalent safe request key.
  - [ ] Generate migration under `migrations/` and update `src/domain/schema-invariants.test.ts`.
  - [ ] Do not use this table as Epic 7 audit replacement; it supports fulfillment email retry and transition result lookup only.

- [ ] Extend `DrizzleOrderRepository` with mutation and email-claim methods. (AC: 4, 5, 6, 7)
  - [ ] Add method to load current fulfillment transition subject by order id or order number with `payment_status`, `fulfillment_status`, `checkout_email`, `order_number`, totals, and snapshot items needed for email.
  - [ ] Add conditional update method that changes `orders.fulfillment_status`, `orders.updated_at`, and `orders.updated_request_id` only when current status still matches expected status.
  - [ ] Add transition-event insert/find methods for idempotent same-request handling.
  - [ ] Add email claim/mark methods mirroring existing order/payment email pattern: claim `PENDING`/`FAILED` or stale `SENDING`, mark `SENT`, mark `FAILED`.
  - [ ] Preserve Customer and Admin read contracts from 6.1/6.2.

- [ ] Extend `OrderService` with Admin fulfillment use case. (AC: 2, 4, 5, 6, 7, 8)
  - [ ] Add `updateAdminOrderFulfillment(...)`.
  - [ ] Reuse current Admin guard policy: `auth: { mode: "required", roles: ["ADMIN"] }`; Super Admin remains denied unless page guard/API policy intentionally changes everywhere.
  - [ ] Validate `orderIdOrNumber` and `targetStatus`; empty or unknown target returns `VALIDATION_FAILED`.
  - [ ] Unknown order returns `RESOURCE_NOT_FOUND`; invalid payment/status/stale transition returns `CONFLICT_STATE`.
  - [ ] On valid transition, update fulfillment and event atomically before email/audit side effects.
  - [ ] Send/claim fulfillment email after domain state persists; email failure returns success with `email.status = "FAILED"` and safe details, not rollback.
  - [ ] Publish `createAuditEvent({ action: "order.status_changed", target: { entity: "order" } })` with safe details. Use `order.fulfilled` only if existing convention clearly needs a separate delivered event.
  - [ ] Use `OperationalLogger` for email/audit/provider failures; logs must scrub checkout email, phone, address, provider payloads, tokens, and stack traces.

- [ ] Add fulfillment status email domain and Resend adapter. (AC: 7)
  - [ ] Create `src/domain/notifications/fulfillment-status-email.ts`.
  - [ ] Create `src/adapter/infrastructure/resend/FulfillmentStatusEmailNotifier.ts`.
  - [ ] Reuse existing `email-template` helpers and `resolveResendVerificationEmailConfig(...)`.
  - [ ] Email copy uses customer-safe fulfillment labels, order number, status URL, and no provider/internal ids.
  - [ ] Missing config uses failing notifier like order confirmation/payment status email notifiers.

- [ ] Extend controller/routes/OpenAPI. (AC: 2, 5, 7)
  - [ ] Add `OrderController.updateAdminOrderFulfillment(...)`.
  - [ ] Add `PATCH /api/admin/orders/:orderId/fulfillment` in `src/server/routes/orders.routes.ts`.
  - [ ] Body schema allows only supported target statuses; `additionalProperties: false`.
  - [ ] Response schema includes updated `order`, `transition`, `email`, and `allowedNextStatuses`.
  - [ ] Error codes include `AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`, `ADMIN_APPROVAL_REQUIRED`, `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `CONFLICT_STATE`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`.
  - [ ] Extend `OrderRoutesOptions`/runtime controller wiring with `operationalLogger` and fulfillment email notifier creation. Update `createApp(...)` to pass canonical operational logger into orders routes.
  - [ ] Keep `transform: rbacGuard(adminOrderAuth)` before controller construction.

- [ ] Update Admin order detail UI. (AC: 1, 5, 7, 9)
  - [ ] Add feature component under `src/features/admin-orders/components/` for fulfillment actions or extend `AdminOrderDetailDashboard.tsx` cleanly.
  - [ ] Show valid next action buttons only; show disabled rows/reasons for blocked states.
  - [ ] On success, refresh/reconcile order detail and show email state (`SENT`, `SENDING`, `FAILED`) in a safe toast/alert.
  - [ ] On `CONFLICT_STATE`, roll back optimistic UI and show allowed next statuses/safe reason from API.
  - [ ] Keep payment, fulfillment, return, refund lanes separate; do not add return/refund mutation controls.
  - [ ] Keep Direction 05/06 styling: dense, bordered, square, keyboard-friendly, no shadows, no `jrw-*` CSS.

- [ ] Add focused tests. (AC: 3, 4, 5, 6, 7, 8, 10)
  - [ ] Domain tests: transition matrix, payment gate, terminal states, cancellation before shipping only.
  - [ ] Repository tests: atomic update, stale status conflict, event insertion/idempotency, email claim/mark success/failure, snapshot/email payload.
  - [ ] Service tests: Admin allow/deny, invalid target, invalid transition, non-paid payment block, email success/failure non-rollback, audit event publish.
  - [ ] Route tests: OpenAPI metadata, RBAC denial before controller, success envelope, validation rejection, conflict envelope, no provider/PII leak.
  - [ ] UI tests: valid action buttons, disabled reasons, success refresh, conflict rollback, email failure alert, no return/refund controls.

- [ ] Run validation gates. (AC: 10)
  - [ ] `npx vitest run src/domain/orders/fulfillment-transitions.test.ts src/server/repositories/OrderRepository.test.ts src/server/services/OrderService.test.ts src/server/routes/orders.routes.test.ts src/features/admin-orders/admin-orders-ui.test.tsx`
  - [ ] `npm run check`
  - [ ] `npm run build-development` if schema/routes/UI changed broadly.
  - [ ] `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`
  - [ ] Manual/admin viewport QA if authenticated Admin fixture/session is available; otherwise document exact blocker.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [ ] Route auth metadata declares required auth, `roles: ["ADMIN"]`, and `admin-write` rate-limit class.
- [ ] Route-level RBAC guard runs before validation or side effects for `PATCH /api/admin/orders/:orderId/fulfillment`.
- [ ] Service/controller enforces actor state before mutation: authenticated, active, verified, approved.
- [ ] Brand-scoped reads or writes: N/A because JRW order fulfillment is single-store Admin operations, not brand-scoped catalog editing.
- [ ] Public/customer endpoints: N/A for new 6.3 work; existing Customer order endpoints must remain unchanged and read-only.
- [ ] Denial tests cover unauthenticated actor, Customer/Prospect wrong role, Super Admin current-policy denial, suspended/inactive/unverified/unapproved Admin.
- [ ] Error response uses safe envelope codes and does not leak provider/internal authorization, email, phone, address, or stack details.
- [ ] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, request body, response schema, denial codes, and conflict codes.

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-07-09: Created ready-for-dev story with fulfillment transition, email persistence, audit hook, Admin UI, and validation guardrails.
