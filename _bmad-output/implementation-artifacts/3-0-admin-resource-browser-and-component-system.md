# Story 3.0: Admin Resource Browser and Component System

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin,
I want searchable resource pages with clear card/list/table patterns,
so that brands, catalog records, and future admin resources are easy to scan and manage.

## Acceptance Criteria

1. Given Admin opens `/admin/brands`, when brands load, then the default view shows responsive brand cards with brand name, status, member count, pending invites/requests, linked product count, and primary action, and card design follows the sharp 1px JRW module style.
2. Given Admin uses the brand resource toolbar, when Admin searches by brand name or slug, then matching cards/list rows are shown, and the empty search state says no matching brands and offers a clear reset action.
3. Given Admin changes view mode, when the card/list toggle is used, then the selected mode persists during the current page session, and both modes expose the same important fields and actions.
4. Given brand data is loading, when the skeleton renders, then skeleton dimensions match the target card/list layout, and pulse animation respects reduced motion using the approved skeleton standard.
5. Given component inventory is documented, when future admin pages are built, then specs exist for DashboardShell, SidebarNav, TopBar, Footer, PageToolbar, SearchInput, ViewToggle, ResourceCard, ResourceList, DataTable, EmptyState, and Skeleton.
6. Given accessibility QA runs, when keyboard and screen-reader checks are performed, then search, view toggle, card actions, list actions, focus states, status labels, and empty/loading states are usable without relying on color alone.
7. Given implementation finishes, when tests/checks run, then tests cover search filtering, card/list toggle, brand card copy, skeleton markup, reduced-motion behavior where testable, and accessibility basics, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Confirm scope and current baseline. (AC: 1-7)
  - [x] Verify `epic-2`, Story 2.7, and Epic 2 retrospective remain `done`; do not reopen Epic 2.
  - [x] Verify this story is the first Epic 3 backlog item and only changes admin resource browsing/component system surfaces.
  - [x] Confirm existing brand UI routes: `/admin/brands` and `/admin/brands/:id`.
  - [x] Confirm current component baseline: `DataTable`, `Input`, `Button`, `EmptyState`, `Skeleton`, and `StatusBadge` exist.
  - [x] Do not add backend schema, route, or domain changes for this story unless a small typed client fix is required by the existing UI.

- [x] Task 2: Add or formalize shared resource browser primitives. (AC: 3, 5-6)
  - [x] Add `SearchInput` under `src/components/ui/` if a thin wrapper around existing `Input` reduces repeated search markup.
  - [x] Add `ViewToggle` under `src/components/ui/` for card/list/table mode controls. Use accessible buttons or radio-style controls with selected state announced.
  - [x] Add `ResourceCard` and `ResourceList` under `src/components/data-display/` only as reusable display primitives. Keep brand-specific fields in `src/features/brands/**`.
  - [x] Add `PageToolbar` or local toolbar classes only if needed; if made reusable, place it in `src/components/layout/` and export it.
  - [x] Update barrel exports in `src/components/ui/index.ts`, `src/components/data-display/index.ts`, and `src/components/index.ts` as needed.
  - [x] Update `src/components/_readme.md` with component inventory/spec notes for DashboardShell, SidebarNav, TopBar, Footer, PageToolbar, SearchInput, ViewToggle, ResourceCard, ResourceList, DataTable, EmptyState, and Skeleton. Do not duplicate long planning docs.

- [x] Task 3: Convert BrandList into a resource browser. (AC: 1-3, 6)
  - [x] Update `src/features/brands/components/BrandList.tsx` so card view is the default view.
  - [x] Add toolbar with left-aligned search and right-aligned card/list view toggle.
  - [x] Search client-side by brand `name` and `slug`, case-insensitive, trimmed.
  - [x] Persist selected view for the current page session with `sessionStorage`; guard `window` access for Astro/SSR safety.
  - [x] Brand card must show: brand name, slug, status, brand members, pending invites, pending join requests, linked products, and `Open detail`.
  - [x] Linked product count can use existing `fetchBrandProducts(brand.id).totalItems`; if the endpoint fails or is unavailable, show `Unavailable` without blocking the whole page.
  - [x] List mode can keep `DataTable`, but it must expose the same key fields and primary action as cards.
  - [x] Preserve existing language guard behavior and approved copy. Routine UI must not mention seller-of-record, tenant, merchant, store owner, payout owner, or PayMongo ownership.

- [x] Task 4: Loading, empty, responsive, and accessibility states. (AC: 2, 4, 6)
  - [x] Loading skeleton should mirror card/list structure with stable dimensions, not generic loose lines only.
  - [x] Use the approved skeleton standard: current centralized `jrw-skeleton` CSS is acceptable because it pulses only under `prefers-reduced-motion: no-preference`; Tailwind surfaces may use `motion-safe:animate-pulse`.
  - [x] Add filtered-empty state: "No matching brands." plus reset action.
  - [x] Add unfiltered empty state with next action language, not abstract brand doctrine.
  - [x] Ensure card grid, toolbar, and list view work at mobile/tablet/desktop widths without overlapping text.
  - [x] Ensure search has visible label, toggle has accessible names and selected state, links are keyboard reachable, and status/counts are text-visible.

- [x] Task 5: Styles stay in JRW system. (AC: 1, 4, 6)
  - [x] Add reusable CSS in `src/styles/global.css` for resource browser/card/list/toolbar classes where class chains would repeat.
  - [x] Keep sharp 0px corners, 1px borders, no shadows, no blur, no decorative gradients/orbs.
  - [x] Use stable dimensions via grid tracks, min/max widths, and fixed control heights where possible.
  - [x] Do not scale font size with viewport width inside compact cards/toolbars.

- [x] Task 6: Targeted tests and checks only. (AC: 1-7)
  - [x] Update `src/features/brands/components/brands-ui.test.ts` for brand card copy, no forbidden copy, search/filter helper behavior if extracted, view toggle markup, and skeleton/resource browser markup.
  - [x] Add shared component tests in `src/components/primitives.test.ts` only for changed/new primitives.
  - [x] If DOM interaction harness is unavailable, test pure helpers for filtering/view persistence and static markup for controls; do not add a new test library without clear need.
  - [x] Run changed-target tests only: `npx vitest run src/features/brands/components/brands-ui.test.ts` plus any changed shared primitive tests.
  - [x] Run `npm run check` after typed/component changes.
  - [x] Do not run full `npm run build-test` unless implementation touches broader build surfaces or MR. JRW asks for final full verdict.

## Dev Notes

### Epic Context

- This is a bridge story added after Epic 2 retrospective and before Epic 3 catalog/product work.
- Epic 2 remains complete. This story uses the brand UI from Story 2.7 as the first admin resource browser implementation.
- Requirements covered: FR76 and FR77.
- UX supported: UX-DR10, UX-DR11, UX-DR21, UX-DR23, UX-DR29, UX-DR34.
- Business value: Admin resource pages should support quick scanning through card/list/table views without losing operational density.

### Current Code Intelligence

#### `src/features/brands/components/BrandList.tsx`

- Current state: React island for `/admin/brands`; loads `fetchBrandList()`, then loads members/invites/join-request counts per brand. Renders header metrics, language guard status, and `DataTable` only.
- Current copy: `You can manage your list of brands here.` Keep this direction. Do not reintroduce policy copy.
- What this story changes: add search state, view-mode state, card default, list fallback, product counts, filtered empty state, and skeleton structure.
- Preserve: `validateBrandCopy(...)`, status badges, current `Open detail` route format, failed load `EmptyState`, and active-flag cleanup inside `useEffect`.

#### `src/features/brands/api.ts`

- Current state: typed fetch helpers for brand list/detail/members/invites/join requests/products/session/actions. `fetchBrandProducts(brandId)` returns paginated `BrandProductListResult` with `totalItems`.
- What this story may use: product count from `fetchBrandProducts(brand.id).totalItems`.
- Preserve: envelope reader, `ApiFailure`, `isNotFoundFailure`, and existing endpoint paths. Do not add new API endpoints for counts in this story.

#### `src/features/brands/types.ts`

- Current state: Brand DTOs, membership DTOs, product DTOs, permissions, and actor type.
- What this story may add: local UI-only view mode/count helper types in `BrandList.tsx` or a small adjacent helper file if tests need pure functions.
- Preserve: existing DTO names and API shapes.

#### `src/components/data-display/DataTable.tsx`

- Current state: generic table with columns, caption, loading row, empty row, and row id function.
- What this story uses: list mode can keep `DataTable`.
- Preserve: existing public props and behavior. If extending, keep backward compatible.

#### `src/components/feedback/Skeleton.tsx` and `src/styles/global.css`

- Current state: `Skeleton` renders `jrw-skeleton` and `jrw-skeleton__line`; global CSS pulses only inside `@media (prefers-reduced-motion: no-preference)`.
- What this story changes: add className variants or wrapper markup for card/list skeleton dimensions if needed.
- Preserve: reduced-motion safe behavior and `role="status"` with `aria-label`.

#### Existing shared component folders

- `src/components/ui/` currently has `Button`, `Checkbox`, `ConfirmDialog`, `IconButton`, `Input`, `Modal`, `Select`, `Tabs`, `Textarea`, `Toggle`.
- `src/components/data-display/` currently has `DataTable` only.
- `src/components/feedback/` currently has `Badge`, `EmptyState`, `Skeleton`, `StatusBadge`, `Toast`.
- Missing for this story: `SearchInput`, `ViewToggle`, `ResourceCard`, `ResourceList`, and possibly `PageToolbar`.

### Previous Story Intelligence

- Story 2.7 created the current brand UI module and tests. Reuse it; do not replace the feature structure.
- Story 2.7 language rules are still active: UI copy says what Admin can do next and must not teach seller-of-record or marketplace boundaries.
- Story 2.7 validation used targeted brand tests plus `npm run check`; user wants the same targeted style for changed surfaces.
- Post-retro notes confirmed canonical routes are `/admin/brands` and `/admin/brands/:id`; old aliases are not the primary implementation target.

### Git Intelligence

- Recent commits show brand endpoint/UI work followed by docs correct-course for UI/UX design.
- Current relevant pattern: code changes should be small, typed, and backed by targeted Vitest files rather than broad unrelated churn.

### Architecture and UX Guardrails

- Astro owns page routing and SEO shells. React feature modules own interactive surfaces.
- Shared primitives go under `src/components/**`; feature-specific brand UI stays under `src/features/brands/**`.
- `src/styles/global.css` is the Tailwind CSS v4 project style surface for reusable component classes and design tokens.
- JRW visual system: 0px radius, 1px borders, no shadows, no blur, cobalt accent only for focus/selected/primary/live status.
- Admin UI is dense, keyboard-friendly, and operation-focused.
- Status labels must be text-visible and cannot rely on color alone.
- UI copy must state what the screen, section, or field does for the user. Keep seller-of-record, tenant, marketplace, payment ownership, and payout language in technical/business docs only.

### Implementation Guidance

- Prefer extracting pure helpers for `filterBrands(...)`, `readViewMode(...)`, and `writeViewMode(...)` if it makes targeted tests simple.
- Use session-only persistence. Do not use local storage for long-term preference yet.
- Keep card/list field parity: if cards show product count and pending counts, list mode should expose the same information.
- Keep `Unavailable` for per-brand count failures. Do not turn partial count failures into page failure.
- Avoid adding pagination changes in this story; current `fetchBrandList()` reads first 100 brands.
- Avoid adding new dependencies. Existing React, Astro, Vitest, Tailwind v4, and local primitives are enough.

### Project Structure Notes

- Expected update paths:
  - `src/features/brands/components/BrandList.tsx`
  - `src/features/brands/components/brands-ui.test.ts`
  - `src/components/ui/SearchInput.tsx` if added
  - `src/components/ui/ViewToggle.tsx` if added
  - `src/components/data-display/ResourceCard.tsx` if added
  - `src/components/data-display/ResourceList.tsx` if added
  - `src/components/_readme.md`
  - `src/components/ui/index.ts`
  - `src/components/data-display/index.ts`
  - `src/styles/global.css`
- Optional update paths:
  - `src/components/layout/PageToolbar.tsx` and `src/components/layout/index.ts` if reusable toolbar is created.
  - `src/components/primitives.test.ts` if shared primitive behavior changes.
- Do not modify:
  - `src/server/**` brand routes
  - `src/domain/brands/**`
  - D1 migrations
  - PayMongo/payment docs or flows

### Testing Requirements

- Targeted Vitest:

```bash
npx vitest run src/features/brands/components/brands-ui.test.ts
```

- If shared primitive tests changed:

```bash
npx vitest run src/components/primitives.test.ts src/features/brands/components/brands-ui.test.ts
```

- Type/Astro check after typed changes:

```bash
npm run check
```

- Manual QA focus for MR. JRW final verdict:
  - `/admin/brands` default card view.
  - Search by brand name and slug.
  - Reset filtered empty state.
  - Card/list toggle persistence during current page session.
  - Reduced-motion skeleton behavior.
  - Mobile/tablet card grid and toolbar wrapping.
  - No routine UI copy that says seller-of-record, tenant, merchant, store owner, payout owner, or PayMongo owner.

### Latest Technical Information

- No web research required for this story. Use repo-pinned dependencies from `package.json`: Astro `^6.1.9`, React `^19.2.5`, Tailwind CSS `^4.2.4`, Vitest `^4.1.5`.
- Tailwind is available, but current project pattern centralizes repeated reusable UI styles in `src/styles/global.css`. Use `motion-safe:animate-pulse` only where Tailwind utilities are already the clearer fit.

### References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.0)
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR76, FR77)
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.md` (Component Strategy, ResourceBrowser, Feedback Patterns, Navigation Patterns, Content/Microcopy)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (Loading State Patterns, Component Boundaries, Visual System Boundaries)
- Project context: `_bmad-output/project-context.md` (UI And Design Rules, Testing And Quality)
- Design system: `docs/design-by-google-stitch.md` (Content & Microcopy, Layout & Spacing, Components)
- Previous related story: `_bmad-output/implementation-artifacts/2-7-brand-membership-ui-and-language-guardrails.md`
- Existing feature files: `src/features/brands/components/BrandList.tsx`, `src/features/brands/api.ts`, `src/features/brands/types.ts`
- Existing shared primitives: `src/components/**`
- Existing styles: `src/styles/global.css`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

1. Add failing targeted tests for resource primitives, brand search/view persistence, skeleton markup, and reduced-motion skeleton CSS.
2. Add shared `SearchInput`, `ViewToggle`, `ResourceCard`, `ResourceList`, and `PageToolbar` primitives with exports.
3. Convert `BrandList` into card-default resource browser with search, session view persistence, linked product counts, list parity, and safe empty/loading states.
4. Add JRW global CSS for toolbar, resource cards/list, view toggle, and responsive wrapping.
5. Update component inventory docs and run changed-target tests plus `npm run check`.

### Debug Log References

- `npx vitest run src\components\primitives.test.ts src\features\brands\components\brands-ui.test.ts` - red phase failed as expected before primitives/helpers existed.
- `npx vitest run src\components\primitives.test.ts src\features\brands\components\brands-ui.test.ts` - pass, 2 files, 16 tests.
- `npm run check` - pass, 0 errors. Existing hints remain in `src/pages/brand/[id].astro` and `src/pages/brands/[id].astro` for unused redirect params.
- `git diff --check` - pass, CRLF warnings only.
- `npx vitest run src\components\primitives.test.ts src\features\brands\components\brands-ui.test.ts` - pass after skeleton pulse polish, 2 files, 17 tests.
- `npm run check` - pass after skeleton pulse polish, 0 errors. Existing hints remain in `src/pages/brand/[id].astro` and `src/pages/brands/[id].astro`.

### Completion Notes List

- Added shared resource browser primitives: `SearchInput`, `ViewToggle`, `ResourceCard`, `ResourceList`, and `PageToolbar`.
- Converted `/admin/brands` list into searchable resource browser with card default, list toggle, session-only view persistence, filtered empty reset, and card/list field parity.
- Added linked product counts through existing `fetchBrandProducts`; count failures show `Unavailable` without failing the whole brand page.
- Added stable resource-card skeleton layout using existing reduced-motion-safe `jrw-skeleton` pulse standard.
- Added component inventory docs for shell, toolbar, search, toggle, card/list/table, empty, and skeleton patterns.
- Added targeted tests for new primitives, brand filtering, view persistence, skeleton markup, reduced-motion CSS, and copy guard expectations.
- Replaced stepped custom skeleton animation with Tailwind `motion-safe:animate-pulse` on skeleton lines to remove jerky opacity steps while preserving reduced-motion behavior.
- Full `npm run build-test` not run per MR. JRW instruction to test only changed scope; final full verdict remains with MR. JRW.

### File List

- `_bmad-output/implementation-artifacts/3-0-admin-resource-browser-and-component-system.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/_readme.md`
- `src/components/data-display/ResourceCard.tsx`
- `src/components/data-display/ResourceList.tsx`
- `src/components/data-display/index.ts`
- `src/components/feedback/Skeleton.tsx`
- `src/components/index.ts`
- `src/components/layout/PageToolbar.tsx`
- `src/components/layout/index.ts`
- `src/components/primitives.test.ts`
- `src/components/ui/SearchInput.tsx`
- `src/components/ui/ViewToggle.tsx`
- `src/components/ui/index.ts`
- `src/features/brands/components/BrandList.tsx`
- `src/features/brands/components/brands-ui.test.ts`
- `src/styles/global.css`

## Change Log

- 2026-05-20: Replaced custom stepped skeleton pulse with Tailwind `motion-safe:animate-pulse` and updated targeted tests.
- 2026-05-20: Implemented Story 3.0 admin resource browser, shared browse primitives, brand card/list/search UI, skeleton/card styles, component inventory docs, and targeted tests.
- 2026-05-20: Story 3.0 context engine created for admin resource browser, brand card/list/search UI, component inventory, skeleton standard, and targeted test scope.
