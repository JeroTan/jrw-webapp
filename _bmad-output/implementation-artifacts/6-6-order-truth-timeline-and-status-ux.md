# Story 6.6: Order Truth Timeline and Status UX

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Customer or Admin,
I want order status displayed in separate truthful lanes,
so that payment, fulfillment, return, and refund state are understandable.

## Acceptance Criteria

1. Customer and Admin order detail use a shared order-truth presentation for four lanes: payment, fulfillment, return, and refund. Lane labels are text-based, color-independent, and never merge payment with fulfillment, return, or refund.
2. Customer order list still shows one latest meaningful customer-safe event, but customer order detail shows four safe lane summaries plus newest-first timeline events. Idle `RETURN_NOT_REQUESTED` and `REFUND_NOT_REQUESTED` may appear in lane summaries but must not render as timeline events.
3. Customer-facing UI never renders raw status codes, provider names/payloads, webhook details, Admin notes, reference IDs, actor IDs, request IDs, checkout email, phone, address, tokens, signatures, secrets, or card/payment internals.
4. Admin order detail follows Direction 05 shell continuity and Direction 06 order truth layout: dense operational page, four lane cards, newest updates, and action panels for fulfillment, return, and refund without creating a second order detail screen.
5. Admin timeline/lane UI shows valid next actions only where actions exist. Unavailable actions or terminal states show safe disabled reasons, including payment-not-paid, return-before-delivery, terminal fulfillment/return/refund status, invalid current status, scope conflicts, amount cap conflicts, and missing reference ID for sent refund evidence.
6. On `CONFLICT_STATE` from fulfillment, return, or refund actions, Admin UI refreshes latest order detail, removes stale pending/busy state, and shows a safe conflict message that includes current status and allowed next actions when the server returns those details.
7. Manual return/refund UX keeps wording explicit: "manual return record", "record refund", "refund sent", or equivalent. UI must not imply PayMongo refund execution, provider refund creation, automatic payout, email send for refund/return, inventory mutation, or customer mutation.
8. Return/refund recorder anatomy remains complete: target type, item, status/action, amount where relevant, reason, notes, reference ID, actor/history metadata, timestamp, validation error, and confirmation before save for high-impact record/status changes.
9. Existing split money field (`CentavosAmountInput`) remains used for refund amount. Do not restore single raw-centavos inputs in Admin order refund UI or Admin product price UI.
10. Responsive/accessibility QA covers customer order list, customer order detail, Admin order detail, lane cards, timeline events, collapsible action panels, and recorders at mobile/tablet/desktop widths. Layout must not overflow at 320px; keyboard users can reach actions and understand disabled reasons.
11. UI fidelity gate passes: Direction 06 timeline spacing honors UX-DR27 badge/title/copy spacing; status badges use text plus tone; no shadows, blur, rounded cards, decorative gradients, or `jrw-*` runtime class layers are introduced.
12. Tests/QA cover customer timeline, Admin timeline, separate lanes, safe labels, idle suppression from timeline events, disabled action reasons, conflict refresh/rollback, split refund amount field preservation, no provider/internal copy, accessibility basics, and `npm run check` or documented blocker.

## Tasks / Subtasks

- [ ] Create or extract shared order-truth display components. (AC: 1, 2, 4, 10, 11)
  - [ ] Preferred home: `src/components/data-display/OrderTruthTimeline.tsx` and, if needed, `OrderStatusLanes.tsx`; keep feature-specific action panels in feature modules.
  - [ ] Inputs should accept `CustomerOrderStatusLanes`, `CustomerOrderTimelineEvent[]`, optional heading/eyebrow, and mode-specific copy without exposing raw `lane.value` text.
  - [ ] Use `StatusBadge`, Tailwind v4 token utilities, sharp borders, stable grid dimensions, and responsive tracks. Do not add a new timeline library.
  - [ ] Preserve existing `buildCustomerOrderTimeline(...)` as domain source of customer-safe events unless tests prove it needs a small extension.

- [ ] Update Customer order surfaces. (AC: 1, 2, 3, 10, 11)
  - [ ] Update `src/features/customer-account/CustomerOrdersPanel.tsx` only as needed to preserve latest-event card behavior and safe label checks.
  - [ ] Update `src/features/customer-account/CustomerOrderDetailPanel.tsx` to render four lane summaries plus newest-first timeline via shared component.
  - [ ] Keep order snapshot item display, product image paths, totals, shallow account navigation, and sign-in redirect behavior unchanged.
  - [ ] Keep idle return/refund values out of customer timeline events.

- [ ] Update Admin order detail surface. (AC: 4, 5, 6, 7, 8, 9, 10, 11)
  - [ ] Update `src/features/admin-orders/components/AdminOrderDetailDashboard.tsx`; do not create a parallel Admin order detail screen.
  - [ ] Replace local `LanePanel` and duplicated timeline markup with shared order-truth components.
  - [ ] Keep existing `FulfillmentActionsPanel`, `ReturnActionsPanel`, `ReturnHistoryPanel`, `RefundActionsPanel`, and `RefundHistoryPanel` unless extraction reduces duplication without changing behavior.
  - [ ] Preserve recent `CentavosAmountInput` refund amount UI and product-price split-field change.
  - [ ] Keep collapsed return/refund action panels behavior unless UX requires a specific panel open state.
  - [ ] Add safe disabled reason copy for terminal statuses and blocked actions; avoid raw status-code copy.

- [ ] Improve conflict feedback and rollback. (AC: 5, 6, 12)
  - [ ] For fulfillment, return, and refund catch paths, continue best-effort `fetchAdminOrderDetail(...)` refresh on 409.
  - [ ] Use `AdminOrderApiFailure.details` when present to show current status and allowed next labels through existing label helpers.
  - [ ] Clear busy/loading state after failed actions and never leave buttons in pending state after conflict.
  - [ ] Keep messages customer-safe/admin-safe: no DB errors, stack traces, request IDs, provider payloads, or raw status codes.

- [ ] Add confirmation for high-impact return/refund record saves if not already covered. (AC: 8)
  - [ ] Use existing `ConfirmDialog` or established modal pattern from `src/components/ui` rather than browser `confirm` if a custom dialog already fits.
  - [ ] Confirmation copy must say manual record/status save and scope target; it must not imply provider automation.
  - [ ] Preserve keyboard focus and Escape/cancel behavior.

- [ ] Add focused tests and QA evidence. (AC: 1-12)
  - [ ] Extend `src/domain/orders/customer-order-status.test.ts` only if event/lane mapping changes.
  - [ ] Add shared component tests if new components contain branching display logic.
  - [ ] Extend `src/features/customer-account/customer-account-ui.test.tsx` for four lane summaries on detail, idle suppression from timeline, no raw codes/provider/PII, and responsive class contracts.
  - [ ] Extend `src/features/admin-orders/admin-orders-ui.test.tsx` for shared lane/timeline structure, disabled reasons, conflict message detail rendering, collapsed panels, split refund amount field preservation, no PayMongo/provider execution wording, and no raw status-code copy.
  - [ ] Run targeted tests: `npx vitest run src/domain/orders/customer-order-status.test.ts src/features/customer-account/customer-account-ui.test.tsx src/features/admin-orders/admin-orders-ui.test.tsx`.
  - [ ] Run `npm run check`; prefer `npm run build-test` because this story touches both customer and Admin order UI.
  - [ ] Add manual QA notes or documented blocker for 320, 375, 390, 430, 768, 1024, and 1440px order detail readability and keyboard walkthrough.

## Endpoint Guard Checklist

Expected status is N/A because this story is UI-first. If implementation changes endpoint contracts for conflict details or response shape, replace N/A items with completed endpoint evidence and tests.

- [x] Route auth metadata declares public/optional/required auth, roles, and rate-limit class. N/A - no endpoint change expected.
- [x] Route-level RBAC guard runs before validation or side effects for protected endpoints. N/A - no endpoint change expected.
- [x] Service/controller enforces actor state before mutation: authenticated, active, verified, approved. N/A - no endpoint change expected.
- [x] Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. N/A - JRW orders are single-store Admin/Customer ownership scoped.
- [x] Public/customer endpoints explicitly document why brand membership is not required. N/A - no endpoint change expected.
- [x] Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable. N/A - no endpoint change expected.
- [x] Error response uses safe envelope codes and does not leak provider/internal authorization details. N/A - no endpoint change expected.
- [x] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes. N/A - no endpoint change expected.

## Dev Notes

### Current Code Intelligence

- Customer-safe lane/event source already exists in `src/domain/orders/customer-order-status.ts`.
  - `buildCustomerOrderStatusLanes(...)` builds separate `payment`, `fulfillment`, `return`, and `refund` lanes.
  - `buildCustomerOrderTimeline(...)` builds newest-first events and suppresses `RETURN_NOT_REQUESTED` and `REFUND_NOT_REQUESTED`.
  - Existing tests verify safe labels and no raw status codes in timeline JSON.
- Customer order list uses latest timeline event in `src/features/customer-account/CustomerOrdersPanel.tsx`.
  - Preserve latest-event summary card behavior.
  - It currently imports `StatusBadge` and builds latest event from lane data.
- Customer order detail in `src/features/customer-account/CustomerOrderDetailPanel.tsx` currently renders only timeline events, not four lane summary cards.
  - This is main customer UI gap for Story 6.6.
- Admin order detail in `src/features/admin-orders/components/AdminOrderDetailDashboard.tsx` already renders:
  - local `LanePanel` around lines 292-308,
  - separate status overview around lines 1256-1274,
  - timeline markup around lines 1276-1317,
  - conflict refresh catch blocks around lines 1521-1614,
  - return/refund action/history panels.
  Replace duplicated status/timeline markup with shared component rather than adding another implementation.
- Admin order types already carry `CustomerOrderStatusLane` for `payment`, `fulfillment`, `return`, and `refund` in `src/features/admin-orders/types.ts`.
- Customer account API types already carry lane objects in `src/features/customer-account/api.ts`; response validators require `kind`, `label`, `value`, and `updatedAt`.
- Admin mutation API already surfaces `AdminOrderApiFailure.details` in `src/features/admin-orders/api.ts`. Use that for safe conflict detail copy before considering API changes.
- Order repository already projects latest return/refund status into read models in `src/server/repositories/OrderRepository.ts`. Do not re-query from UI.
- Order service already returns `allowedNextStatuses`, `currentStatus`, `paymentStatus`, `fulfillmentStatus`, `maxAmountCentavos`, and conflict `reason` details for stale/blocked fulfillment, return, and refund paths. UI should consume safe parts.
- `src/pages/account/orders/[orderId].astro` and `src/pages/admin/orders/[id].astro` compose the current React islands; no page-routing change expected.

### Previous Story Intelligence

- Story 6.5 completed manual refund recording and made refund status append-only, scoped to order/item, and separate from payment/fulfillment/return lanes.
- 6.5 added `order_refund_records`, refund transition rules, Admin refund endpoint, Admin UI refund form/history, and customer-safe refund projection.
- 6.5 review fixed stale docs and confirmed no PayMongo refund execution. Preserve that language boundary.
- 6.5 recent UI follow-up added `CentavosAmountInput` and changed refund/product price input away from raw centavos. Story 6.6 must not regress this.
- 6.4/6.5 both use conflict refresh after stale return/refund state. 6.6 should improve copy and allowed-next guidance, not remove refresh.

### Git Intelligence

Recent commits:

- `0c05a43 chore: 6-5 reviewed`
- `544d7f4 style: update price field`
- `bee64c3 style: made it collapasable`
- `85cad61 feat: 6-5 implemented`
- `f28bf4d docs: 6-5 story created`

Actionable read:

- Current branch has just stabilized refund UI/docs. Avoid broad backend refactors.
- Preserve collapsible return/refund panels and split amount field unless directly improving accessibility.
- Use current order stack and tests; do not invent a new status module or global state layer.

### Architecture Compliance

- Follow feature boundaries:
  - shared display primitives in `src/components/data-display/**`,
  - customer account UI in `src/features/customer-account/**`,
  - Admin order UI in `src/features/admin-orders/**`,
  - status business labels/timeline projection in `src/domain/orders/**`.
- Do not add provider calls, DB access, auth checks, or request objects to shared UI components.
- Keep API shape stable unless conflict detail rendering proves missing server data. If endpoint contracts change, update TypeBox schemas, OpenAPI metadata, route tests, and endpoint guard checklist.
- Do not mutate order statuses from the shared timeline component. It is display-only.
- Do not introduce new dependencies.
- Do not add `src/styles/features/**`, `src/styles/storefront/**`, one-off `jrw-*` classes, shadows, blur, rounded cards, or decorative gradients.

### Design Direction Fidelity

- Cite and follow `_bmad-output/planning-artifacts/ux-design-directions.html#direction-05` for Admin shell continuity.
- Cite and follow `_bmad-output/planning-artifacts/ux-design-directions.html#direction-06` for order truth timeline:
  - four equal lane cards on desktop,
  - payment, fulfillment, return, refund titles,
  - status badge above title,
  - concise lane description,
  - manual return/refund action placement near order operations.
- Follow `_bmad-output/planning-artifacts/ux-design-specification.md#OrderTimeline` for customer-safe order status tracking.
- Follow `_bmad-output/planning-artifacts/ux-design-specification.md#OrderStatusPanel` for Admin valid next action, disabled reason, pending update, and conflict rollback states.
- Follow `_bmad-output/planning-artifacts/ux-design-specification.md#ReturnRefundRecorder` for manual record anatomy and validation states.
- UX-DR26 in epics uses older public label examples for return/refund requested/rejected/completed. Current implemented status truth from 6.4/6.5 is authoritative:
  - return: `RETURN_REQUESTED`, `RETURN_APPROVED`, `RETURN_REJECTED`, `RETURN_RECEIVED`, `RETURN_COMPLETED`, `RETURN_CANCELLED`;
  - refund: `REFUND_PENDING`, `REFUND_APPROVED`, `REFUND_DECLINED`, `REFUND_SENT`, `REFUND_FAILED`;
  - idle values are lane summaries only, not timeline process steps.

### Status Model Guardrails

Payment statuses remain payment-only:

```ts
PAYMENT_PENDING
PAYMENT_PAID
PAYMENT_FAILED
PAYMENT_EXPIRED
PAYMENT_CANCELLED
PAYMENT_REFUNDED
```

Fulfillment statuses remain fulfillment-only:

```ts
ORDER_PLACED
PROCESSING
SHIPPED
DELIVERED
CANCELLED
```

Return idle and process statuses:

```ts
RETURN_NOT_REQUESTED // lane summary only
RETURN_REQUESTED
RETURN_APPROVED
RETURN_REJECTED
RETURN_RECEIVED
RETURN_COMPLETED
RETURN_CANCELLED
```

Refund idle and process statuses:

```ts
REFUND_NOT_REQUESTED // lane summary only
REFUND_PENDING
REFUND_APPROVED
REFUND_DECLINED
REFUND_SENT
REFUND_FAILED
```

Do not render raw codes in visible UI. Use existing label helpers:

- `customerOrderStatusLaneLabel(...)`
- `fulfillmentStatusLabel(...)`
- `returnStatusLabel(...)`
- `refundStatusLabel(...)`

### Conflict Feedback Guidance

Safe conflict detail pattern:

```ts
type ConflictDetails = {
  allowedNextStatuses?: string[];
  currentStatus?: string;
  maxAmountCentavos?: number;
  reason?: string;
  targetStatus?: string;
};
```

UI message examples:

- Fulfillment stale: "Order status changed. Current fulfillment: Processing. Next: Mark as shipped, Cancel order."
- Return stale: "Return status changed. Current return: Return approved. Next: Mark received."
- Refund stale/cap: "Refund status changed. Current refund: Refund approved. Next: Mark sent." or "Refund amount is above current target maximum PHP 39.98."

Do not show:

```ts
STALE_REFUND_STATUS
REFUND_APPROVED
requestId
SQL error
PayMongo payload
```

### Testing Requirements

- Customer UI tests must assert:
  - four lane summaries on detail,
  - newest-first timeline,
  - no raw codes/provider/PII,
  - idle return/refund not in timeline,
  - mobile-safe layout classes or QA note.
- Admin UI tests must assert:
  - Direction 06 four-lane structure,
  - action panels remain present and keyboard-reachable,
  - disabled reasons show text,
  - conflict detail messages use safe labels,
  - split refund amount fields remain,
  - no PayMongo execution wording.
- Domain tests remain source for safe mapping if component tests rely on lane/event objects.
- Run `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages` before done; runtime UI should have no matches except legitimate fixture/test cases.

### Anti-Patterns To Avoid

- Do not create another order status source outside `customer-order-status.ts`.
- Do not merge lanes into a single "overall status".
- Do not show idle return/refund as customer timeline events.
- Do not put provider/webhook/payment payload language in Customer UI.
- Do not expose Admin-only notes/reference/actor/request data to Customer UI.
- Do not restore raw centavos UI fields.
- Do not duplicate `LanePanel`/timeline markup in both customer and admin features after extracting shared display.
- Do not change D1 schema, return/refund tables, PayMongo integration, inventory logic, or email behavior for this UI story.
- Do not silently allow Super Admin on Admin order operations if existing policy denies it.
- Do not use optimistic global state libraries for one order detail page.

### Latest Technical Information

- No external web research required. This story should not add or upgrade libraries.
- Use project-pinned versions from `_bmad-output/project-context.md`: React 19.2.5, Astro 6.1.9, Tailwind CSS 4.2.4, TypeScript 5.9.3, Vitest 4.1.5.
- Network access was not needed because work uses existing in-repo patterns and project-pinned packages.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 6.6: Order Truth Timeline and Status UX`
- `_bmad-output/planning-artifacts/epics.md#UX Design Requirements`
- `_bmad-output/planning-artifacts/prd.md#Orders, Fulfillment, Returns & Refunds`
- `_bmad-output/planning-artifacts/prd.md#Reliability & Data Integrity`
- `_bmad-output/planning-artifacts/prd.md#Accessibility`
- `_bmad-output/planning-artifacts/architecture.md#Component Boundaries`
- `_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping`
- `_bmad-output/planning-artifacts/ux-design-specification.md#Order Operations, Return, Refund`
- `_bmad-output/planning-artifacts/ux-design-specification.md#OrderTimeline`
- `_bmad-output/planning-artifacts/ux-design-specification.md#OrderStatusPanel`
- `_bmad-output/planning-artifacts/ux-design-specification.md#ReturnRefundRecorder`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-05`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-06`
- `docs/order-status-flow.md`
- `_bmad-output/implementation-artifacts/6-4-manual-return-recording.md`
- `_bmad-output/implementation-artifacts/6-5-manual-refund-recording.md`
- `src/domain/orders/customer-order-status.ts`
- `src/features/customer-account/CustomerOrdersPanel.tsx`
- `src/features/customer-account/CustomerOrderDetailPanel.tsx`
- `src/features/admin-orders/components/AdminOrderDetailDashboard.tsx`
- `src/features/admin-orders/types.ts`
- `src/features/admin-orders/api.ts`
- `src/server/repositories/OrderRepository.ts`
- `src/server/services/OrderService.ts`
- `src/server/routes/orders.routes.ts`

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-07-10: Created ready-for-dev story with shared order-truth timeline guidance, existing code intelligence, conflict UX guardrails, design direction fidelity, and focused test/QA requirements.
