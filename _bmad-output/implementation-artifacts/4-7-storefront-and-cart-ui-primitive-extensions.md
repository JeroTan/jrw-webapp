# Story 4.7: Storefront and Cart UI Primitive Extensions

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Customer, Prospect, Admin, or Super Admin,
I want storefront and cart UI to extend the shared primitive kit instead of creating duplicate controls,
so that storefront, checkout, dashboard, and governance flows behave predictably while each epic can add only the components it needs.

## Acceptance Criteria

1. Given Story 1.5 baseline primitives already exist, when storefront and cart UI need common controls, then they reuse or extend existing `Button`, `ButtonLink`, `Input`, `Select`, `Checkbox`, `Toggle`, `Badge`, `StatusBadge`, `Tabs`, `Modal`, `Toast`, `ConfirmDialog`, `EmptyState`, and `Skeleton`, duplicate feature-local versions of those base controls are not introduced, and styling composes Tailwind utilities and JRW brand tokens directly instead of recreating feature/storefront CSS class layers.
2. Given storefront and cart flows need reusable UI beyond Epic 1 baseline, when missing generic primitives are implemented, then shared extensions exist for `SegmentedControl`, `Drawer`, `SidePanel`, and `Pagination` where needed by storefront/cart flows, and feature components such as `ProductCard`, `ProductGrid`, `ProductDetailPanel`, and `CartDrawer` stay under `src/features/**` while composing shared primitives.
3. Given future checkout or order stories need additional generic primitives, when a later epic requires components such as `Stepper` or timeline/list variants, then that epic can add them under the appropriate `src/components/**` area if reused across features, and otherwise keeps them local to the feature module.
4. Given primitives render interactive controls, when keyboard navigation and focus are tested, then controls are reachable and operable by keyboard, and unfamiliar icon buttons have accessible names/tooltips.
5. Given primitives render statuses, errors, loading, and empty states, when UI states are shown, then status is text-labeled, errors are associated with controls, skeletons keep stable dimensions, and empty states provide safe next action.
6. Given modal, drawer, side panel, and confirmation primitives are used, when overlays open and close, then focus is trapped, restored on close, and destructive actions require explicit action.
7. Given responsive constraints apply, when primitives are used in narrow and wide layouts, then text does not overflow buttons, badges, tabs, counters, or table cells, and touch targets meet 44px guidance where used in customer/mobile flows.
8. Given implementation finishes, when tests/QA run, then checks cover primitive rendering, focus, labels, disabled/loading/error states, overlay focus management, reduced motion, and text overflow, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Lock scope and inventory current primitives before coding. (AC: 1-8)
  - [x] Re-read every UPDATE file listed in Current Code Intelligence before editing.
  - [x] Confirm current shared exports in `src/components/ui/index.ts`, `src/components/feedback/index.ts`, `src/components/data-display/index.ts`, and `src/components/index.ts`.
  - [x] Add only generic primitive work. Do not change product data flows, cart domain rules, checkout validation, admin auth, PayMongo, inventory reservation, order flows, or route contracts.
  - [x] Keep feature components under `src/features/**`: `ProductCard`, `ProductGrid`, `ProductCatalogFilters`, `ProductDetailPage`, `CartDrawer`, `CartSummary`, `CheckoutFlow`.
  - [x] Update `src/components/_readme.md` with concise inventory notes for any added primitive and exact usage boundaries.
  - [x] Do not add a new UI library, CSS module, page CSS layer, or runtime `jrw-*` selector.

- [x] Task 2: Add `SegmentedControl` for generic two-or-more option selection. (AC: 1-5, 7-8)
  - [x] Create `src/components/ui/SegmentedControl.tsx` and export it from `src/components/ui/index.ts`.
  - [x] Use `role="group"` plus `aria-pressed` buttons for toggle/choice controls that do not own tab panels. Do not misuse `Tabs` for plain view/filter toggles.
  - [x] Keep option labels stable while state changes; expose selected state through `aria-pressed`, visible text/color, and token-driven classes.
  - [x] Support controlled `value`, `onChange`, `options`, `label`, disabled options, optional `size`/`textSize`/`borderTone` only if needed by current callers.
  - [x] Include 4.8 outline contract: `hover:outline-2`, `hover:outline-offset-2`, `hover:outline-brand-accent`, `focus-visible:outline-2`, `focus-visible:outline-offset-2`, `focus-visible:outline-brand-accent`.
  - [x] Decide whether `ViewToggle` composes `SegmentedControl` internally. Preserve `ViewToggle` public API and current admin call sites if refactoring it.
  - [x] Add tests in `src/components/primitives.test.ts` for role, label, selected state, disabled option, no text overflow class, and 2px outline contract.

- [x] Task 3: Add `SidePanel` without duplicating modal/drawer focus logic. (AC: 2, 4, 6-8)
  - [x] Create `src/components/ui/SidePanel.tsx` and export it from `src/components/ui/index.ts`.
  - [x] Make it a generic focused work panel for admin/product/order editing and possible future storefront detail panels, not a cart-specific component.
  - [x] Required props: `open`, `onClose`, `title`, optional `description`, optional `footer`, `closeLabel`, `children`, `className`.
  - [x] Semantics: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, optional `aria-describedby` only for simple descriptions.
  - [x] Behavior: move focus inside on open, trap `Tab` and `Shift+Tab`, close on `Escape`, restore focus on close, include visible close `Button`.
  - [x] Responsive shape: desktop right-side panel with width constraints suitable for dense work; narrow viewports become full-screen panel. Use 0px radius, 1px borders, no shadow/blur.
  - [x] Reuse or extract focus-trap helpers from `Modal` and `Drawer` only if it reduces duplication without changing their behavior. Do not create hidden global mutable focus state.
  - [x] Add tests for dialog semantics, title/description IDs, close label/title, full-screen narrow classes, and focus-helper behavior where testable.

- [x] Task 4: Tighten `Drawer`, `Modal`, and `ConfirmDialog` overlay contract. (AC: 4, 6-8)
  - [x] Preserve existing `Drawer` API because `CartDrawer` already depends on it.
  - [x] Preserve existing `Modal` and `ConfirmDialog` APIs.
  - [x] If focus helper is extracted, prove `Drawer` and `Modal` still render `role="dialog"`, `aria-modal="true"`, visible close action, and same public labels.
  - [x] Keep `ConfirmDialog` deliberate for destructive/high-impact actions: danger tone, explicit confirm label, cancel action, no silent close-only destructive path.
  - [x] Do not change cart drawer copy, best-effort refresh behavior, or checkout validation flow in this task.

- [x] Task 5: Normalize pagination without breaking SSR catalog links or admin callbacks. (AC: 1-2, 4-8)
  - [x] Re-read `src/components/ui/Pagination.tsx`, `src/features/product-catalog/components/CatalogPagination.tsx`, `src/features/admin-products/components/AdminInventoryDashboard.tsx`, and `src/features/admin-products/components/ProductListDashboard.tsx`.
  - [x] Keep callback-driven `Pagination` working for admin/product dashboards.
  - [x] Update shared `Pagination` page controls to match 4.8 outline contract and accessible disabled/selected states. Raw page buttons must not use border-color-only hover.
  - [x] For storefront SSR query links, either extend shared pagination with link-item support or refactor `CatalogPagination` to compose shared `ButtonLink`/pagination constants. Preserve crawlable `<a href>` pagination and current `buildCatalogHref` behavior.
  - [x] Keep page size selector visible/labelled through existing `Select`; do not hide form semantics from assistive tech.
  - [x] Add tests proving selected page uses `aria-current="page"`, disabled prev/next are non-interactive, long totals do not overflow, and storefront pagination keeps real links.

- [x] Task 6: Confirm existing primitives handle status, error, loading, empty, and skeleton states. (AC: 1, 4-8)
  - [x] Re-read `Badge`, `StatusBadge`, `EmptyState`, `Skeleton`, `Input`, `InputBox`, `Select`, `Checkbox`, `Toggle`, `Tabs`, `DataTable`, `ResourceCard`, and `ResourceList`.
  - [x] Add only missing tests or tiny props needed by storefront/cart flows. Do not redesign visual anatomy.
  - [x] Ensure statuses include text labels and do not rely on color alone.
  - [x] Ensure errors use `aria-invalid`/`aria-describedby` where fields are involved.
  - [x] Ensure skeletons have stable dimensions and respect reduced motion through Tailwind `motion-safe:`.

- [x] Task 7: Keep feature consumers local and remove duplicate control styling only where safe. (AC: 1-3, 7-8)
  - [x] `CartDrawer` remains feature-local and composes shared `Drawer`.
  - [x] `CheckoutFlow` local stepper remains local in this story. Do not add shared `Stepper` until Epic 5 needs reuse across checkout/payment/order surfaces.
  - [x] `ProductDetailPage` and child modules remain under `src/features/product-detail/**`; do not move them to shared components.
  - [x] `ProductCatalogFilters` continues to use shared `CheckboxGroup`, `Input`, `Button`, and `ButtonLink`.
  - [x] Replace one-off page/control classes in `CatalogPagination` only if replacement preserves SSR link semantics and product catalog tests.
  - [x] Do not touch public catalog repositories/services/routes unless a UI test proves current pagination/control data contract is broken. No endpoint work expected.

- [x] Task 8: Update tests and QA evidence. (AC: 4-8)
  - [x] Extend `src/components/primitives.test.ts` for `SegmentedControl`, `SidePanel`, pagination outline contract, overlay semantics, status/empty/loading primitives, and inventory/readme export coverage.
  - [x] Update `src/features/product-catalog/components/product-catalog-ui.test.tsx` if `CatalogPagination` changes.
  - [x] Run `npx vitest run src/components/primitives.test.ts src/features/product-catalog/components/product-catalog-ui.test.tsx src/features/cart-checkout/components/cart-ui.test.tsx`.
  - [x] Run `npm run check`.
  - [x] Run styling guard: `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`.
  - [x] If `Drawer`, `SidePanel`, `CatalogPagination`, or cart-visible controls change, run `npm run qa:checkout-viewports`; run `npm run qa:storefront` and `npm run qa:accessibility` when local Playwright is available.
  - [x] Record any QA blocker honestly in this story under Dev Agent Record.

### Review Findings

- [x] [Review][Patch] Dialog focus trap could select non-tabbable or hidden controls and restore focus into a replaced dialog [src/components/ui/dialog-focus.ts:12] — patched focusable filtering, focus leak recovery, and guarded restore behavior.
- [x] [Review][Patch] Storefront pagination duplicated shared control styling instead of composing shared primitives [src/features/product-catalog/components/CatalogPagination.tsx:2] — patched to use shared pagination helpers and `ButtonLink` while preserving real SSR `href` links.
- [x] [Review][Patch] Pagination summaries and edge states lacked long-total and disabled-control coverage [src/components/ui/Pagination.tsx:19] — patched overflow-safe summary classes plus long-total and first/last edge tests.
- [x] [Review][Patch] Disabled pagination and segmented controls kept hover outline styling [src/components/ui/Pagination.tsx:23] — patched button controls to use `enabled:hover:*` and added assertions.
- [x] [Review][Patch] Responsive QA could check overflow before font/layout settling [tests/qa/storefront-responsive.spec.ts:49] — patched route open helper to wait for full load and `document.fonts.ready`; full storefront QA now passes.
- [x] [Review][Patch] Category archive confirmation used generic danger confirm label [src/features/admin-categories/components/CategoryList.tsx:453] — patched explicit `Archive category` confirm label.
- [x] [Review][Dismiss] Hover outline utility style concern — existing project contract and passing visual/test guard use Tailwind outline utilities; no separate patch needed.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- N/A Route auth metadata declares public/optional/required auth, roles, and rate-limit class. UI primitive-only story.
- N/A Route-level RBAC guard runs before validation or side effects for protected endpoints. No endpoint changes expected.
- N/A Service/controller enforces actor state before mutation: authenticated, active, verified, approved. No service/controller changes expected.
- N/A Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. No brand-scoped backend work expected.
- N/A Public/customer endpoints explicitly document why brand membership is not required. Existing published storefront reads remain unchanged.
- N/A Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable. No protected actor path expected.
- N/A Error response uses safe envelope codes and does not leak provider/internal authorization details. No endpoint response changes expected.
- N/A OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes. No OpenAPI changes expected.

## Dev Notes

### Epic Context

- Epic 4 goal: Prospects browse JRW storefront, inspect products, understand availability, and Customers manage cart before checkout.
- Story 4.7 is a primitive-hardening bridge after storefront/cart implementation and QA. It should make shared UI stronger before Epic 5 checkout/payment/order UI grows.
- Requirements covered: UX-DR2; supports FR32-FR58 UI flows and FR78.
- This story is not a redesign. It fills generic primitive gaps and removes duplicate control styling where current code proves need.

### Design Direction Fidelity

- Cite `_bmad-output/planning-artifacts/ux-design-directions.html` Direction 02 for cart drawer/product detail overlay behavior, Direction 03 for mobile commerce parity, and Direction 04 for checkout control progression when visible storefront/cart surfaces are touched.
- If admin side-panel examples are touched, cite Direction 05 for dashboard shell/table/side-panel composition.
- Preserve accepted storefront page layout. Do not move hero, filters, product grid, product cards, product detail modules, cart drawer content, or checkout step layout unless a primitive change requires a tiny local class adjustment.
- Shared primitives must cover hover, focus-visible, status, empty, loading, disabled, and error states.
- Button-like controls must keep cobalt 2px outline with 2px offset on hover/focus-visible.
- Done requires component class assertions and, for visible storefront/cart changes, responsive/manual QA notes or documented QA blocker. `npm run check` alone is not enough for UI completion.

### Previous Story Intelligence

- Story 4.4 added `Drawer`, browser cart store, cart drawer/page, shared cart line items, quantity controls, `CartSummary`, and local cart validation states.
- Story 4.5 added authoritative checkout-entry validation, updated `CartSummary`/`CheckoutFlow`, and kept direct `/checkout` from bypassing cart validation.
- Story 4.6 added Playwright storefront QA helpers, accessibility scans, viewport specs, performance evidence, and scripts `qa:storefront` and `qa:accessibility`. It also fixed `ResponsiveFilterPanel` and accent contrast.
- Story 4.8 locked `Button`/button-like hover/focus to cobalt `outline-2` with `outline-offset-2`.
- Story 4.9 locked Direction 01 product-card anatomy and Direction 02 product-detail module language.
- Story 4.10 requires future UI stories to cite exact design directions and include visual QA evidence.
- Story 4.11 is currently `review` and current source already includes product detail modules, dynamic variant chips, quantity controls, Buy/add-cart/share controls, brand summary, recommendations, and sanitized markdown. Do not roll these back.

### Git Intelligence

- Recent commits:
  - `0d8b5d0 feat: 4-6 story implemented`
  - `1c732f4 docs: 4-6 story created`
  - `b00e6ae refactor: manual removal of text because it is unnecesssary ui`
  - `a2e5285 refactor: super admin middleware`
  - `aa8c689 chore: 4-5 reviewed`
- Pattern: recent work adds focused story artifacts, then source changes with targeted tests and QA evidence. Match that style.
- Worktree may be dirty. Preserve unrelated edits and avoid broad formatting churn.

### Current Code Intelligence

#### READ/UPDATE: `src/components/ui/index.ts`

- Current state: exports `Button`, `ButtonLink`, `Checkbox`, `CheckboxGroup`, `ConfirmDialog`, `CleanButton`, `Drawer`, `Input`, `InputBox`, `Label`, `Modal`, `Pagination`, `ResponsiveFilterPanel`, `Select`, `SearchInput`, `Tabs`, `Textarea`, `Toggle`, and `ViewToggle`.
- What this story changes: add `SegmentedControl` and `SidePanel` exports. Keep existing exports stable.
- Preserve: import paths used by feature modules.

#### READ/UPDATE: `src/components/index.ts`

- Current state: re-exports `data-display`, `feedback`, `layout`, and `ui`.
- What this story changes: likely no direct edit if subfolder indexes export correctly.
- Preserve: single public component barrel.

#### READ/UPDATE: `src/components/_readme.md`

- Current state: inventory lists `PageToolbar`, shell notes, `SearchInput`, `ViewToggle`, `ResourceCard`, `ResourceList`, `DataTable`, `EmptyState`, and `Skeleton`.
- What this story changes: add concise notes for `SegmentedControl`, `Drawer`, `SidePanel`, and `Pagination` boundaries.
- Preserve: short inventory style and copy rules.

#### READ/UPDATE: `src/components/ui/Button.tsx`

- Current state: shared button has `enabled:hover:outline-2`, `enabled:hover:outline-offset-2`, `enabled:hover:outline-brand-accent`, `focus-visible:outline-2`, `focus-visible:outline-offset-2`, `focus-visible:outline-brand-accent`, default `type="button"`, square mode, loading state, `borderTone`, `paddingX`, `textSize`.
- What this story changes: probably none.
- Preserve: 4.8 visual contract, loading behavior, default non-submit safety, no shadow/blur.

#### READ/UPDATE: `src/components/ui/ButtonLink.tsx`

- Current state: anchor action primitive mirrors button sizing and outline contract, supports `disabled`, `loading`, `square`, `borderTone`, `paddingX`, `textSize`.
- What this story changes: reuse for link pagination or storefront action links where safe.
- Preserve: `href` removal on disabled and `aria-disabled`.

#### READ/UPDATE: `src/components/ui/ViewToggle.tsx`

- Current state: mode control uses `role="group"` and `aria-pressed`; hover/focus outline is `outline-1` with negative offset, so it does not match the 4.8 2px/2px treatment.
- What this story changes: either update `ViewToggle` to use `SegmentedControl` internally or align its outline contract directly without breaking `ViewToggleProps`.
- Preserve: selected state, `onChange(value)`, and admin callers in brands/products.

#### READ/UPDATE: `src/components/ui/Tabs.tsx`

- Current state: accessible tabs with `role="tablist"`, `role="tab"`, `aria-selected`, roving focus using arrow/Home/End keys, and `role="tabpanel"`.
- What this story changes: likely none.
- Preserve: use `Tabs` only for tabbed panels. Do not use it as generic segmented choice control without panels.

#### READ/UPDATE: `src/components/ui/Modal.tsx`

- Current state: centered dialog with focus trap, Escape close, backdrop close, focus restore, visible close button, optional footer.
- What this story changes: only if extracting a shared focus trap helper.
- Preserve: API, semantics, and close behavior.

#### READ/UPDATE: `src/components/ui/Drawer.tsx`

- Current state: right-side modal drawer with focus trap, Escape close, backdrop close, focus restore, visible close button, title/description, and responsive full-width behavior on small screens.
- What this story changes: only if extracting shared focus trap helper or tiny class alignment is required.
- Preserve: `CartDrawer` behavior, title/description props, `onClose`, `open`, close label.

#### READ/UPDATE: `src/components/ui/ConfirmDialog.tsx`

- Current state: small wrapper around `Modal` with cancel and confirm buttons, `tone="danger"` support.
- What this story changes: likely none unless tests need destructive-action contract coverage.
- Preserve: explicit confirm/cancel actions.

#### READ/UPDATE: `src/components/ui/Pagination.tsx`

- Current state: callback-driven page controls with page size `Select`, selected page via `aria-current="page"`, but page buttons use raw classes with border-color-only hover.
- What this story changes: align buttons with 4.8 outline contract and keep admin callback API.
- Preserve: `page`, `pageSize`, `totalItems`, `totalPages`, `disabled`, `pageSizeOptions`, `onPageChange`, `onPageSizeChange`.

#### READ/UPDATE: `src/features/product-catalog/components/CatalogPagination.tsx`

- Current state: storefront SSR pagination uses crawlable `<a href>` links from `buildCatalogHref`, but duplicates raw pagination classes and border-color-only focus/hover.
- What this story changes: reuse shared link/button styling or shared pagination link support while preserving SSR links.
- Preserve: query params, real hrefs, `aria-current="page"`, no hydration requirement.

#### READ/UPDATE: `src/features/product-catalog/ProductCatalog.tsx`

- Current state: catalog container owns category directory, responsive filter panel, product grid, pagination, empty/error states; no hero ownership.
- What this story changes: only pagination/control composition if required.
- Preserve: category/filter/search behavior and page layout.

#### READ/UPDATE: `src/features/product-catalog/components/ProductCatalogFilters.tsx`

- Current state: uses shared `CheckboxGroup`, `Input`, `Button`, `ButtonLink`, and feature-specific query helpers.
- What this story changes: none expected. Do not replace filter checkboxes with `SegmentedControl`.
- Preserve: form GET semantics and query persistence.

#### READ/UPDATE: `src/features/cart-checkout/components/CartDrawer.tsx`

- Current state: composes shared `Drawer`, refreshes visible cart lines best-effort, renders `CartLineItems`, `CartSummary`, and "See full cart page".
- What this story changes: likely none unless `Drawer` internals are refactored.
- Preserve: best-effort refresh and visible cart state.

#### READ/UPDATE: `src/features/cart-checkout/components/CartSummary.tsx`

- Current state: uses `Button`, validation action, refresh icon button using `Button square`, pending/status copy, disabled empty state.
- What this story changes: none expected.
- Preserve: validation before navigation; do not restore blind checkout link.

#### READ/UPDATE: `src/features/cart-checkout/components/CheckoutFlow.tsx`

- Current state: local checkout stepper with `aria-current="step"` and summary rail. Stepper is feature-local.
- What this story changes: none unless tests prove primitive collision. Do not extract shared `Stepper` yet.
- Preserve: Direction 04 checkout progression and no payment/order promises beyond current placeholders.

#### READ/UPDATE: `src/features/cart-checkout/components/CartLineItems.tsx`

- Current state: uses `Button`, `Input`, `Label`, `StatusBadge`, `ButtonLink`, lucide icons, text-first blocked states, and accessible quantity group.
- What this story changes: none expected.
- Preserve: quantity validation, remove action, no raw stock/internal details.

#### READ/UPDATE: `src/features/product-detail/components/product-variant-selector/VariantSelectorOption.tsx`

- Current state: variant chips use `aria-pressed` for selected option state.
- What this story changes: no required edit. This can inform `SegmentedControl` styling, but variant selection remains feature-specific.
- Preserve: product-specific option logic stays in product detail.

#### READ/UPDATE: `src/components/primitives.test.ts`

- Current state: covers button outline, square button labels, loading state, input errors, checkbox sizes, data table empty, pagination, modal, drawer, search input, view toggle, resource primitives, skeleton, token checks.
- What this story changes: add coverage for `SegmentedControl`, `SidePanel`, updated pagination outline/link contract, overlay semantics, and readme/export expectations.
- Preserve: existing tests and intent.

### Project Structure Notes

Expected new files:

- `src/components/ui/SegmentedControl.tsx`
- `src/components/ui/SidePanel.tsx`

Expected update files:

- `src/components/ui/index.ts`
- `src/components/_readme.md`
- `src/components/primitives.test.ts`
- `src/components/ui/ViewToggle.tsx` if it composes/aligned with `SegmentedControl`
- `src/components/ui/Pagination.tsx`
- `src/features/product-catalog/components/CatalogPagination.tsx` if storefront link pagination is normalized
- `src/features/product-catalog/components/product-catalog-ui.test.tsx` if `CatalogPagination` markup changes

Allowed small refactor only if needed:

- `src/components/ui/Modal.tsx`
- `src/components/ui/Drawer.tsx`
- A small local helper such as `src/components/ui/focus-trap.ts` or `src/components/ui/useModalFocusTrap.ts`

Avoid:

- `src/api/**`
- `src/server/**` endpoint/controller/service/repository files
- `src/domain/checkout/**` cart logic
- `src/features/product-detail/**` unless a primitive import changes safely
- `src/features/cart-checkout/store.ts` and `api.ts`
- Any migration, provider, PayMongo, order, inventory reservation, auth, or email file

### Latest Technical Information

- WAI-ARIA APG Dialog Modal Pattern requires focus to move inside the dialog, `Tab`/`Shift+Tab` to stay inside, `Escape` to close, visible close control, `role="dialog"`, `aria-modal="true"`, labelled dialog title, and focus return to invoking element unless workflow requires another target. Use this for `SidePanel`, `Drawer`, and `Modal`. Source: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- WAI-ARIA APG Tabs Pattern applies only when tabs control associated `tabpanel` content with `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-controls`, and `aria-selected`. Use existing `Tabs` for tab panels, not generic segmented choices. Source: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- WAI-ARIA APG Button Pattern says toggle buttons use `aria-pressed` and keep labels stable when state changes. This fits `SegmentedControl` and existing `ViewToggle`. Source: https://www.w3.org/WAI/ARIA/apg/patterns/button/
- Tailwind v4.3 docs include ARIA variants such as `aria-pressed`, `aria-selected`, `aria-disabled`, and `aria-busy`; project Tailwind v4.2.4 should already support the variants used in current code, so prefer existing project-compatible utilities over upgrading. Source: https://tailwindcss.com/docs/hover-focus-and-other-states
- Tailwind outline docs show `outline-2` and `outline-offset-2` utilities. Keep Story 4.8 cobalt outline contract instead of border-color-only hover. Source: https://tailwindcss.com/docs/outline-style and https://tailwindcss.com/docs/outline-offset
- React 19.2 docs state `forwardRef` is no longer necessary and `ref` can be passed as a prop, with `forwardRef` deprecated in a future release. Do not introduce `forwardRef` unless local TypeScript/component patterns require it; avoid imperative handles when `open`/`onClose` props express behavior. Source: https://react.dev/reference/react/forwardRef

### Testing Requirements

Required:

```bash
npx vitest run src/components/primitives.test.ts src/features/product-catalog/components/product-catalog-ui.test.tsx src/features/cart-checkout/components/cart-ui.test.tsx
npm run check
rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages
```

Conditional:

```bash
npm run qa:checkout-viewports
npm run qa:storefront
npm run qa:accessibility
```

Run conditional Playwright gates if visible storefront/cart controls, overlays, or pagination markup change and local browser install is available. Otherwise document blocker and the exact unrun command.

### Assumptions And Follow-Up Flags

- Assumption: `Drawer` and `Pagination` already exist, so this story should harden them instead of recreating them.
- Assumption: `SegmentedControl` and `SidePanel` are missing and are the only new shared primitives needed now.
- Assumption: `Stepper` remains feature-local until Epic 5 proves reuse across checkout/payment/order surfaces.
- Follow-up: Epic 5 checkout/payment stories may add shared `Stepper`, `OrderReceipt`, timeline/list variants, or payment-state components if reused across customer/admin views.

### References

- `_bmad-output/planning-artifacts/epics.md` - `### Story 4.7: Storefront and Cart UI Primitive Extensions`
- `_bmad-output/planning-artifacts/epics.md` - UX-DR2, UX-DR6, UX-DR7, UX-DR24, UX-DR28, UX-DR30, UX-DR31, UX-DR34, UX-DR35
- `_bmad-output/planning-artifacts/architecture.md` - Component Boundaries, Visual System Boundaries, Requirements to Structure Mapping
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Design System Foundation, Component Strategy, Modal And Overlay Patterns, Responsive Design & Accessibility
- `_bmad-output/planning-artifacts/ux-design-directions.html` - Directions 02, 03, 04, and 05 if admin side-panel examples change
- `_bmad-output/project-context.md` - Technology Stack & Versions, Critical Implementation Rules, UI And Design Rules, Testing And Quality
- `_bmad-output/implementation-artifacts/4-4-cart-add-update-remove.md` - Drawer/cart implementation and follow-up primitive note
- `_bmad-output/implementation-artifacts/4-5-availability-blocking-before-checkout.md` - cart validation and checkout flow behavior
- `_bmad-output/implementation-artifacts/4-6-storefront-responsive-accessibility-and-performance-qa.md` - QA helper/scripts and accessibility/performance evidence
- `_bmad-output/implementation-artifacts/4-8-shared-primitive-visual-contract.md` - button outline contract
- `_bmad-output/implementation-artifacts/4-9-storefront-product-card-and-detail-fidelity.md` - product card/detail visual contract
- `_bmad-output/implementation-artifacts/4-10-future-story-ui-fidelity-gate.md` - future UI story fidelity requirements
- `_bmad-output/implementation-artifacts/4-11-product-detail-composition-content-and-recommendations.md` - current product detail modules to preserve
- `src/components/_readme.md`
- `src/components/primitives.test.ts`
- `src/components/ui/Button.tsx`
- `src/components/ui/ButtonLink.tsx`
- `src/components/ui/Drawer.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/Pagination.tsx`
- `src/components/ui/Tabs.tsx`
- `src/components/ui/ViewToggle.tsx`
- `src/features/product-catalog/components/CatalogPagination.tsx`
- `src/features/cart-checkout/components/CartDrawer.tsx`
- `src/features/cart-checkout/components/CheckoutFlow.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npx vitest run src/components/primitives.test.ts src/features/product-catalog/components/product-catalog-ui.test.tsx` - red then green after primitive implementation.
- `npx vitest run src/components/primitives.test.ts src/features/product-catalog/components/product-catalog-ui.test.tsx src/features/cart-checkout/components/cart-ui.test.tsx src/features/storefront-shell/storefront-shell-ui.test.tsx` - 49 tests passed.
- `npx vitest run src/components/primitives.test.ts src/features/product-catalog/components/product-catalog-ui.test.tsx` - 35 tests passed after review patches.
- `npx vitest run src/features/admin-categories/components/categories-ui.test.ts` - 6 tests passed after archive confirmation label patch.
- `npm run check` - passed; 0 errors, existing hints remain in unrelated files.
- `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages` - only slugs and negative assertions; no runtime `jrw-*` selector additions.
- `npm run qa:accessibility` - 7 passed after review patches.
- `npm run qa:checkout-viewports` - 14 passed after review patches; one earlier parallel attempt failed with `EADDRINUSE` on inspector port, then solo rerun passed.
- `npm run qa:storefront` - 66 passed after route helper now waits for full load plus font readiness.
- `npx playwright test tests/qa/storefront-responsive.spec.ts --project=chromium --grep "header, filter"` - passed after focus helper/base outline fixes.

### Completion Notes List

- Added shared `SegmentedControl` and refactored `ViewToggle` to compose it without changing public API.
- Added shared `SidePanel` and extracted dialog focus trap helper used by `Modal`, `Drawer`, and `SidePanel`.
- Aligned `Button`, `ButtonLink`, `Pagination`, and storefront `CatalogPagination` with 2px cobalt outline and 2px offset behavior.
- Hardened global focus-visible CSS for reduced-motion QA and improved Playwright focus polling/navigation stability.
- Updated component inventory docs and tests for primitive boundaries, SSR pagination links, overlay semantics, focus, disabled state, and docs coverage.
- Preserved cart, checkout, product detail, endpoint, inventory, payment, and route contracts.

### File List

- `_bmad-output/implementation-artifacts/4-7-storefront-and-cart-ui-primitive-extensions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/_readme.md`
- `src/components/primitives.test.ts`
- `src/components/ui/Button.tsx`
- `src/components/ui/ButtonLink.tsx`
- `src/components/ui/Drawer.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/Pagination.tsx`
- `src/components/ui/SegmentedControl.tsx`
- `src/components/ui/SidePanel.tsx`
- `src/components/ui/ViewToggle.tsx`
- `src/components/ui/dialog-focus.ts`
- `src/components/ui/index.ts`
- `src/features/admin-categories/components/CategoryList.tsx`
- `src/features/product-catalog/components/CatalogPagination.tsx`
- `src/features/product-catalog/components/product-catalog-ui.test.tsx`
- `src/features/storefront-shell/StorefrontHeader.tsx`
- `src/features/storefront-shell/storefront-shell-ui.test.tsx`
- `src/layouts/StorefrontLayout.astro`
- `src/styles/_base.css`
- `tests/qa/helpers/overflow.ts`
- `tests/qa/storefront-responsive.spec.ts`

## Change Log

- 2026-06-11: Implemented storefront/cart primitive extensions and moved story to review.
