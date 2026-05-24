# Story 4.4: Cart Add, Update, Remove

Status: ready-for-dev

Prerequisite hold: Do not implement this story until Story 4.8 and Story 4.9 are complete. Story 4.10 must be complete before any new UI-heavy stories are created after this point. This preserves approved UX design-direction fidelity before cart UI extends the storefront.

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Customer or Prospect,
I want to add available variants to cart and update or remove cart items,
so that I can prepare my purchase before checkout.

## Acceptance Criteria

1. Given user selects available published variant, when user adds item to cart, then cart contains product/variant ID, quantity, current display snapshot summary, and price shown to user and cart count updates visibly.
2. Given user updates cart item quantity, when quantity is valid, then cart item quantity and subtotal update and UI shows pending/success state without layout shift.
3. Given user removes cart item, when remove action succeeds, then item is removed and empty cart state appears when no items remain.
4. Given user attempts invalid quantity, when quantity is below minimum, above allowed limit, or not numeric, then validation error appears and prior valid cart state remains.
5. Given cart drawer opens on desktop, when drawer is active, then focus is trapped and restored on close and cart shows line items, quantities, price, stock warnings, subtotal, and checkout action.
6. Given user views cart on mobile, when cart summary/action appears, then sticky cart/action behavior does not cover content and controls meet 44px touch target guidance.
7. Given product becomes unavailable after cart add, when cart refreshes or user changes quantity, then cart marks stale/unavailable item with text reason and checkout action is blocked until resolved.
8. Given implementation finishes, when tests/QA run, then checks cover add, update, remove, invalid quantity, empty cart, drawer focus, mobile sticky behavior, stale inventory display, and safe price display and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Task 1: Lock scope, reuse points, and anti-patterns before coding. (AC: 1-8)
  - [ ] Reuse Story 4.3 public detail path and selected-variant state. Add-to-cart starts from product detail with selected variant, not from product grid cards.
  - [ ] Reuse existing public detail endpoint for best-effort cart refresh. Do not create cart mutation endpoints, DB cart tables, or auth-coupled server cart persistence in this story.
  - [ ] Persist storefront cart in browser `localStorage` under feature namespace so Prospect and Customer can keep cart across routes without session cookie coupling.
  - [ ] Treat local cart as UX state only. Server validation remains checkout authority in Stories 4.5 and 5.2.
  - [ ] Merge repeated adds for same `productId + variantId` into one line item by increasing quantity instead of creating duplicates.
  - [ ] Use quantity-sum, not distinct-line count, for visible cart badge updates.
  - [ ] Do not parse formatted currency strings. Carry numeric centavos in cart data and derive display labels from numeric values.
  - [ ] Do not expose raw stock counts, stock versions, archived admin-only language, R2 keys, or provider/internal errors in public cart UI.

- [ ] Task 2: Define browser-safe cart contract and pure cart rules. (AC: 1-4, 7-8)
  - [ ] Create pure domain rules under `src/domain/checkout/**` for add, update, remove, merge, subtotal, quantity validation, stale marking, and checkout blocking so business logic stays testable outside React.
  - [ ] Reuse naming and quantity limits from `src/domain/snapshots/**` where browser-safe, especially `SNAPSHOT_QUANTITY_MAX`, snapshot field names, and variant option structures.
  - [ ] Define cart item snapshot shape that at minimum stores: `productId`, `productSlug`, `productName`, `variantId`, `variantLabel`, `variantOptions`, `priceCentavos`, `priceLabel`, `quantity`, public image URL/alt, and customer-safe availability text.
  - [ ] Keep snapshot immutable-per-write: update quantity/stale flags without mutating previous in-memory objects so store subscribers stay predictable.
  - [ ] Add validation helpers that reject non-integer, `< 1`, `> SNAPSHOT_QUANTITY_MAX`, or mismatched product/variant payloads while preserving prior valid state.

- [ ] Task 3: Create shared cart store and storage synchronization. (AC: 1-4, 7-8)
  - [ ] Create `src/features/cart-checkout/**` external store and custom hooks using `useSyncExternalStore` for shared header/detail/cart-page access.
  - [ ] Keep `subscribe`, `getSnapshot`, and `getServerSnapshot` stable and module-scoped so React does not resubscribe on every render.
  - [ ] Implement safe `localStorage` read/write with `try/catch` browser guards similar to existing storage helpers in brand feature code.
  - [ ] Manually notify same-tab subscribers after writes and also listen for `window` `storage` events for cross-tab sync. Do not rely on `storage` event alone.
  - [ ] Provide derived selectors for `totalQuantity`, `lineItemCount`, `subtotalCentavos`, `hasBlockingIssues`, and `staleItemCount`.

- [ ] Task 4: Extend public detail DTOs only where cart needs missing safe data. (AC: 1-2, 7-8)
  - [ ] Update public detail DTOs/contracts to include numeric price data needed for cart math, recommended `priceCentavos` on detail product and detail variant records.
  - [ ] If selected variant image or variant option data is not sufficient for cart snapshot rendering, extend DTOs with safe public fields only. Do not expose stock quantity or internal image keys.
  - [ ] Update existing public detail TypeBox schemas, repository mapping, service tests, and route OpenAPI coverage to match the new safe cart-supporting fields.
  - [ ] Remove stale action copy such as "Cart actions are not active on this page yet" once real cart add is wired.

- [ ] Task 5: Build cart UI surfaces with correct boundaries. (AC: 1-6, 8)
  - [ ] Create feature UI under `src/features/cart-checkout/**` for `CartDrawer`, `CartPage`, shared line-item rows, quantity controls, subtotal summary, empty state, stale warning state, and sticky mobile summary/action surface.
  - [ ] Keep cart-specific UI in feature module. Only generic overlay/control primitives belong in `src/components/ui/**`.
  - [ ] Preferred path: add a minimal reusable `Drawer` primitive in `src/components/ui/**` with focus trap/restore semantics derived from current `Modal` behavior, then compose it from `CartDrawer`.
  - [ ] Acceptable fallback: if a reusable `Drawer` cannot be introduced without over-scoping, implement the thinnest feature-local desktop drawer while preserving WAI focus rules and avoiding unrelated primitive refactors.
  - [ ] Share cart line-item and totals rendering between desktop drawer and `/cart` page so stale-state logic and validation copy do not drift.
  - [ ] Mobile sticky cart/action area must reserve bottom padding in page content so summary bar never covers controls or text.
  - [ ] Quantity controls must remain at least 44px high/wide on mobile and keep visible labels or accessible names.

- [ ] Task 6: Integrate cart actions into existing storefront entry points. (AC: 1-6, 8)
  - [ ] Update `src/features/product-detail/components/ProductDetailPage.tsx` to add selected available variant to cart with pending/success feedback, while still blocking unavailable variants.
  - [ ] Use selected variant plus current product detail summary to build cart snapshot. Do not fetch admin or alternate endpoints from the client to add one item.
  - [ ] Update `src/features/storefront-shell/components/StorefrontHeader.tsx` so cart badge reflects live store quantity and cart trigger opens drawer on desktop.
  - [ ] Update `src/layouts/StorefrontLayout.astro` hydration strategy so immediately visible cart controls are interactive on page load. Prefer `client:load` for cart-aware header/cart islands.
  - [ ] Replace `/cart` placeholder page with real cart page backed by same cart store and shared cart UI components.
  - [ ] Preserve Story 4.3 SSR detail route and SEO behavior. Do not move product detail loading into client-only fetches.

- [ ] Task 7: Handle stale or unavailable cart items honestly. (AC: 4-7, 8)
  - [ ] Add client fetch helper that reuses existing `GET /api/storefront/catalog/products/:slug` endpoint for per-item refresh on cart page load, manual refresh, and quantity changes.
  - [ ] If product detail now 404s, selected variant no longer exists, or selected variant becomes unavailable, mark line item stale with customer-safe text reason and block checkout action until item is removed or corrected.
  - [ ] If refresh fails due to provider/runtime issue, preserve current snapshot, surface safe retry copy, and keep checkout action blocked until state is trustworthy again.
  - [ ] Keep prior valid quantity/value in UI when invalid quantity input or failed refresh occurs.
  - [ ] Do not claim stock reservation or oversell safety here. This is display-level stale detection only.

- [ ] Task 8: Keep checkout entry truthful without skipping future stories. (AC: 5-7)
  - [ ] Cart surfaces must show a checkout action, but the action must match current app reality. If no real `/checkout` route exists yet, use honest interim CTA copy and target rather than fake successful checkout behavior.
  - [ ] Recommended interim behavior: valid cart CTA routes to current account/next-step surface with copy that sign-in or next checkout step continues there; stale or refresh-failed cart disables CTA with text reason.
  - [ ] Do not create PayMongo, reservation, or order flows in this story.

- [ ] Task 9: Add focused tests and QA. (AC: 1-8)
  - [ ] Add pure domain tests for add/merge/update/remove, subtotal math, invalid quantity rejection, stale marking, and checkout-block rules.
  - [ ] Add store tests for localStorage hydration, same-tab publish/subscribe, and cross-tab `storage` event synchronization.
  - [ ] Add UI tests covering product detail add, cart badge count, drawer open/close, focus trap/restore, quantity pending/error states, empty cart, stale inventory text, and mobile sticky summary rendering.
  - [ ] If public detail DTO changes, extend route/service/repository tests and OpenAPI assertions for added safe fields.
  - [ ] Run `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages` to confirm no runtime styling regressions.
  - [ ] Run targeted Vitest suites, then `npm run check`, and `npm run build` if no blocker appears.
  - [ ] Manual QA at 320, 375, 390, 430, 768, 1024, and 1440px covering add-to-cart, drawer focus, cart page, sticky summary non-overlap, keyboard-only flow, and reduced-motion behavior.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [ ] Route auth metadata for existing public detail endpoint still declares public auth, `PROSPECT` access, and `public-read` rate-limit class after contract changes.
- N/A Route-level RBAC guard runs before validation or side effects for protected endpoints. Story 4.4 should not add protected cart mutation endpoints.
- N/A Service/controller enforces actor state before mutation: authenticated, active, verified, approved. Browser cart state is local-only in this story.
- N/A Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. Public cart uses published storefront product data only.
- [ ] Public/customer endpoint docs explain why brand membership is not required for cart refresh/product detail reads.
- N/A Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable. Story 4.4 should reuse public read endpoints only.
- [ ] Error response uses safe envelope codes and does not leak provider/internal inventory details during cart refresh.
- [ ] OpenAPI/endpoint catalog reflects any changed public detail response fields.

## Dev Notes

### Epic Context

- Story 4.4 sits immediately after Story 4.3 and before checkout validation/payment stories:
  - Story 4.3 delivered real public product detail SSR, variant selection, and truthful action-state groundwork.
  - Story 4.4 adds real browser cart behavior and cart UI surfaces.
  - Story 4.5 blocks unavailable variants before checkout with authoritative validation.
  - Epic 5 then introduces checkout identity, reservation, payment creation, webhook reconciliation, and order confirmation.
- Story 4.4 must give users a usable cart without pretending inventory is reserved or checkout is complete.
- Requirements covered: FR35, FR36, FR37; supports FR38.
- Relevant NFRs and UX requirements: NFR21, NFR23, NFR24, NFR28, NFR40, NFR45; UX-DR6, UX-DR20, UX-DR21, UX-DR24, UX-DR28, UX-DR30, UX-DR31, UX-DR32.

### Previous Story Intelligence

- Story 4.3 already exposes selected variant state inside `ProductDetailPage` and public detail DTOs. Reuse that state instead of re-querying or duplicating variant selection logic.
- Story 4.3 kept SSR detail route canonical and warned against fake cart behavior. Preserve page-level SSR/SEO and replace placeholder action with real add-to-cart only.
- Story 4.3 public detail stack already exists: route -> controller -> service -> repository, with safe envelopes and public auth metadata. Reuse it for cart refresh instead of adding parallel storefront APIs.
- Story 4.3 detail DTO currently exposes public-safe image, availability, category, and variant structures but lacks numeric price data for cart math. Extend only the missing safe fields.
- Story 4.3 explicitly left drawer/shared primitive work for later. Story 4.4 is first real cart consumer, so keep any primitive expansion narrow and cart-driven.

### Git Intelligence

- `a12b54e` (`feat: 4-3 story implemented and update project context to use remote as always`) added the real product-detail feature, public detail route/service/repository flow, and layout metadata plumbing. Extend those files before inventing new surfaces.
- `4b181b1` (`refactor: product ui`) shows recent UI work pattern: typed incremental refactors in feature modules with matching tests, not one giant page file.
- `c977536` (`chore: 4-3 reviewed`) added review patches and focused regressions. Expect Story 4.4 to need similar follow-up around focus, metadata, and shared state edge cases.
- Recent repo pattern favors small typed helpers, feature-local tests, then `npm run check`. Match that workflow.

### Latest Technical Intelligence (2026-05-24)

- Astro official docs still describe `client:load` as high-priority hydration for immediately visible interactive UI. That fits header cart controls and cart page interactions better than delayed hydration when badge count and drawer trigger must respond immediately.
- Astro official docs also state `client:only` skips server rendering entirely. Prefer SSR plus `client:load` for cart surfaces when feasible so page shell and accessible structure exist before hydration; only fall back to `client:only` if browser-only storage coupling makes SSR mismatch unacceptable.
- React official docs recommend `useSyncExternalStore` when components read mutable data outside React. Cart state persisted in browser storage and shared across header/detail/cart page matches that model better than ad hoc duplicated `useState`.
- React official docs also frame `useEffect` as synchronization with external systems. Use effects for storage event listeners and refresh fetches, not for core cart math that belongs in pure domain helpers.
- MDN documents that the `storage` event does not fire in the same window that made the change. Same-tab cart updates therefore need explicit store notifications in addition to cross-tab `storage` listeners.
- WAI dialog guidance still requires focus to move inside an open modal/drawer, remain trapped with `Tab` / `Shift+Tab`, close on `Escape`, and return to the invoking element when closed. WCAG H102 also recommends returning focus to invoker and choosing initial focus carefully when dialog content is long.
- No library upgrade is required for this story. Stay on repo-pinned React/Astro APIs and current project versions from `_bmad-output/project-context.md`.

### Story Scope Boundaries

**IN SCOPE**

- Browser cart persistence for Prospect and Customer using local storage backed shared store
- Add-to-cart from product detail for selected available variant
- Cart badge/count visibility in storefront header
- Desktop cart drawer with focus trap/restore
- Real `/cart` page with empty, active, invalid-quantity, and stale-item states
- Mobile sticky cart summary/action behavior that does not cover page content
- Best-effort stale/unavailable refresh using existing public detail endpoint
- Safe numeric subtotal calculation using centavos
- Focused DTO contract extension if public detail lacks data cart math needs

**OUT OF SCOPE**

- Product-grid quick-add without variant selection
- Server-side cart persistence, cart DB schema, authenticated cart merge, or cookie cart
- Inventory reservation, stock locking, or oversell prevention
- Real checkout page, payment creation, PayMongo handoff, orders, or webhooks
- Brand/admin/private product reads
- New global state library
- Broad primitive redesign beyond minimal cart-driven overlay/control needs

### Cart State And Snapshot Guidance

- Recommended cart line key: `productId + "::" + variantId`.
- Recommended count semantics: badge shows total quantity across all line items.
- Recommended quantity limit: reuse `SNAPSHOT_QUANTITY_MAX` from `src/domain/snapshots/schemas.ts` for hard validation until business sets a stricter cart cap.
- Recommended subtotal source: sum `priceCentavos * quantity` from persisted numeric fields, then derive formatted display label. Never reverse-parse `priceLabel`.
- Recommended stale flags:
  - `ACTIVE`: current snapshot is usable
  - `STALE`: refresh could not verify current catalog state
  - `UNAVAILABLE`: product/variant no longer sellable in public storefront
- Recommended blocking rule: any `STALE` or `UNAVAILABLE` item blocks checkout CTA until resolved.
- Recommended add behavior: adding same selected variant increments quantity; adding a different variant creates a new line item.
- Recommended remove behavior: remove action remains available even when item is stale/unavailable.
- Recommended public snapshot fields should align where possible with `BuiltOrderSnapshot`, but do not import server-only repositories/builder code into browser bundle.

### Current Code Intelligence

#### READ: `src/features/product-detail/components/ProductDetailPage.tsx`

- Current state: selected variant and image state already exist, but cart action button is always disabled and only shows placeholder reason text.
- What this story changes: wire selected available variant into cart store with pending/success feedback and honest stale handling.
- What must be preserved: selected variant/image sync, customer-safe availability text, SSR detail route wrapper, and no admin/internal language leakage.

#### READ: `src/pages/products/[slug].astro`

- Current state: SSR Astro page loads detail data server-side, sets `Astro.response.status`, and hydrates `ProductDetailPage` with `client:load`.
- What this story changes: likely no route-level data-flow change; add-to-cart should happen inside hydrated React component only.
- What must be preserved: `export const prerender = false`, page-level status handling, canonical/social metadata wiring, and non-leaky error states.

#### READ: `src/features/storefront-shell/components/StorefrontHeader.tsx`

- Current state: cart badge is hardcoded `0` and cart trigger is a simple GET form to `/cart`.
- What this story changes: live cart quantity badge, desktop drawer trigger, accessible label updates, and possibly post-add open behavior.
- What must be preserved: responsive header layout, search behavior, native links/forms, and no stretched-mobile desktop regression.

#### READ: `src/layouts/StorefrontLayout.astro`

- Current state: header/footer shell is server-rendered only; no direct client hydration directive is applied to cart-aware shell components.
- What this story changes: add hydration path for immediately visible cart controls, likely via `client:load`.
- What must be preserved: skip link, `main` landmark, shared storefront shell, and layout-level metadata props.

#### READ: `src/pages/cart/index.astro`

- Current state: placeholder-only storefront page.
- What this story changes: replace placeholder with real cart page backed by shared store and feature UI.
- What must be preserved: storefront layout wrapper and customer-safe route copy/metadata.

#### READ: `src/components/ui/Modal.tsx`

- Current state: focus trap, `Escape`, return-focus, backdrop close, and dialog semantics already exist, but layout is centered modal, not edge-aligned drawer.
- What this story changes: either extract reusable focus-trap logic into minimal `Drawer` primitive or extend overlay behavior just enough for desktop cart drawer.
- What must be preserved: keyboard trap correctness, return focus on close, visible close action, and no hidden cross-dialog shared mutable state.

#### READ: `src/domain/products/public-types.ts` + `src/server/repositories/PublicCatalogRepository.ts` + `src/server/routes/public-catalog.routes.ts`

- Current state: public detail route already returns safe product, gallery, variants, action, and metadata data, but detail variant/product pricing is display-only (`priceLabel`) and action reason still says cart is inactive.
- What this story changes: add numeric price fields and any minimal safe cart snapshot helpers needed by client cart flows, plus update placeholder action semantics.
- What must be preserved: public auth metadata, safe envelopes, no raw stock exposure, no archived-product leakage, and route/controller/service/repository layering.

#### READ: `src/domain/snapshots/schemas.ts` + `src/domain/snapshots/types.ts` + `src/domain/snapshots/snapshot-builder.ts`

- Current state: order snapshot field names, quantity limits, option structures, and numeric price conventions already exist on server side.
- What this story changes: reuse those field names and limits as cart-shape guardrails where browser-safe; do not duplicate conflicting quantity or variant-option abstractions.
- What must be preserved: server-only snapshot builder remains provider/repository based and should not be imported into client bundles.

#### READ: `src/features/brands/components/BrandList.tsx`

- Current state: safe browser storage access uses `try/catch` wrappers and pure read/write helpers.
- What this story changes: nothing directly, but it is a good local pattern for browser-storage safety.
- What must be preserved: avoid unsafe direct storage reads during SSR.

#### READ: `src/pages/account/index.astro`

- Current state: account route is still placeholder copy that promises sign-in/account work later.
- What this story changes: likely only truthful cart CTA targeting/copy decisions, not full auth flow.
- What must be preserved: do not imply checkout already exists if next-step route is still placeholder.

### Testing Guidance

Targeted Vitest commands:

```bash
npx vitest run src/domain/checkout/**/*.test.ts
npx vitest run src/features/cart-checkout/**/*.test.tsx
npx vitest run src/server/routes/public-catalog.routes.test.ts
npx vitest run src/server/services/PublicCatalogService.test.ts
```

Validation commands:

```bash
npm run check
npm run build
```

Manual QA checklist:

- 320 / 375 / 390 / 430px: add-to-cart from detail, sticky summary/action non-overlap, 44px quantity/remove/checkout controls, no text clipping.
- 768 / 1024 / 1440px: header badge, desktop drawer width/alignment, drawer scroll behavior, subtotal visibility, no stretched-mobile layout.
- Keyboard-only: add-to-cart, open drawer, trap `Tab`, `Shift+Tab`, `Escape`, return focus to trigger, update quantity, remove item, reach checkout CTA.
- Stale cases: missing product, variant removed, variant unavailable, refresh failure, invalid quantity, empty cart after last removal.
- Reduced motion: drawer transitions and pending-state feedback respect `prefers-reduced-motion`.

### Project Structure Notes

Recommended new domain files:

- `src/domain/checkout/storefront-cart.ts`
- `src/domain/checkout/storefront-cart.test.ts`
- Optional: `src/domain/checkout/types.ts`
- Optional: `src/domain/checkout/schemas.ts`

Recommended new feature files:

- `src/features/cart-checkout/storefront-cart-store.ts`
- `src/features/cart-checkout/api.ts`
- `src/features/cart-checkout/index.ts`
- `src/features/cart-checkout/types.ts`
- `src/features/cart-checkout/components/CartDrawer.tsx`
- `src/features/cart-checkout/components/CartPage.tsx`
- `src/features/cart-checkout/components/CartLineItem.tsx`
- `src/features/cart-checkout/components/CartSummaryBar.tsx`
- `src/features/cart-checkout/components/cart-ui.test.tsx`

Recommended shared primitive additions or updates:

- Preferred: `src/components/ui/Drawer.tsx`
- `src/components/ui/index.ts`
- Optional refactor: extract shared focus helper if both `Modal` and `Drawer` use it

Expected update files:

- `src/features/product-detail/components/ProductDetailPage.tsx`
- `src/features/storefront-shell/components/StorefrontHeader.tsx`
- `src/layouts/StorefrontLayout.astro`
- `src/pages/cart/index.astro`
- `src/domain/products/public-types.ts`
- `src/server/repositories/PublicCatalogRepository.ts`
- `src/server/routes/public-catalog.routes.ts`
- `src/server/routes/public-catalog.routes.test.ts`
- `src/server/services/PublicCatalogService.test.ts`

Do not modify unless no safe alternative exists:

- `src/pages/products/[slug].astro` beyond cart island wiring already handled inside hydrated component
- `src/api/**`
- Admin product/catalog routes or repositories
- Durable Object inventory reservation logic
- Payment/order/auth route groups

### Assumptions And Follow-Up Flags

- Assumption: storefront cart persists in `localStorage`, not `sessionStorage`, because Prospect cart should survive route changes and normal browser reopen behavior until server cart exists.
- Assumption: interim checkout CTA may point to existing account/next-step surface until dedicated checkout route lands, but copy must stay honest.
- Follow-up for Story 4.5: authoritative availability and price validation before checkout.
- Follow-up for Story 4.7: broaden shared storefront/cart primitives only if Story 4.4 reveals repeated overlay/control patterns worth promoting.

### References

- `_bmad-output/planning-artifacts/epics.md`
  - `## Epic 4: Product-First Storefront and Cart`
  - `### Story 4.4: Cart Add, Update, Remove`
  - `UX-DR6`, `UX-DR24`, `UX-DR28`, `UX-DR30`, `UX-DR31`, `UX-DR32`
- `_bmad-output/planning-artifacts/prd.md`
  - `### Storefront & Customer Shopping`
  - `### Reliability & Data Integrity`
  - `### Accessibility`
- `_bmad-output/planning-artifacts/architecture.md`
  - `### Frontend Architecture`
  - `### Structure Patterns`
  - `### State Management Patterns`
  - `### Component Boundaries`
  - `### Requirements to Structure Mapping`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `### Prospect To Customer Purchase`
  - `### CartDrawer`
  - `### Feedback Patterns`
  - `### Modal And Overlay Patterns`
  - `### Responsive Strategy`
  - `### Accessibility Strategy`
  - `### Testing Strategy`
- `_bmad-output/project-context.md`
  - `Technology Stack & Versions`
  - `Critical Implementation Rules`
  - `UI And Design Rules`
  - `Testing And Quality`
- `_bmad-output/implementation-artifacts/4-3-product-detail-experience.md`
  - `### Previous Story Intelligence`
  - `### Review Findings`
  - `### Current Code Intelligence`
- `_bmad-output/implementation-artifacts/spec-storefront-react-feature-boundary.md`
  - `Intent`
  - `Code Map`
- `src/domain/snapshots/schemas.ts`
- `src/domain/snapshots/types.ts`
- `src/domain/snapshots/snapshot-builder.ts`
- Official docs
  - Astro template directives reference: [https://docs.astro.build/en/reference/directives-reference/](https://docs.astro.build/en/reference/directives-reference/)
  - React `useSyncExternalStore`: [https://react.dev/reference/react/useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
  - React effects guidance: [https://react.dev/learn/synchronizing-with-effects](https://react.dev/learn/synchronizing-with-effects)
  - MDN `storage` event: [https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)
  - WAI modal dialog pattern: [https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
  - WCAG H102: [https://www.w3.org/WAI/WCAG22/Techniques/html/H102](https://www.w3.org/WAI/WCAG22/Techniques/html/H102)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `git log --oneline -n 5`
- `src/features/product-detail/components/ProductDetailPage.tsx`
- `src/pages/products/[slug].astro`
- `src/features/storefront-shell/components/StorefrontHeader.tsx`
- `src/layouts/StorefrontLayout.astro`
- `src/pages/cart/index.astro`
- `src/components/ui/Modal.tsx`
- `src/domain/products/public-types.ts`
- `src/server/repositories/PublicCatalogRepository.ts`
- `src/server/routes/public-catalog.routes.ts`
- `src/domain/snapshots/schemas.ts`
- `src/domain/snapshots/types.ts`
- `src/domain/snapshots/snapshot-builder.ts`
- `src/features/brands/components/BrandList.tsx`
- `src/pages/account/index.astro`

### Completion Notes List

- Story 4.4 context synthesized from Epic 4, PRD, architecture, UX spec, project context, Story 4.3 implementation notes, and current storefront code.
- Guardrails added for browser cart persistence, centavo-safe subtotal math, quantity validation, stale-item handling, and honest checkout boundary behavior.
- Reuse guidance added for Story 4.3 public detail endpoint, snapshot field names, browser storage safety patterns, and existing overlay focus-trap behavior.
- Latest technical guidance added from official Astro, React, MDN, and WAI sources.

### File List

- `_bmad-output/implementation-artifacts/4-4-cart-add-update-remove.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
