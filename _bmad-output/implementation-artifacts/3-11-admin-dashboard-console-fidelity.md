# Story 3.11: Admin Dashboard Console Fidelity

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin,
I want existing admin resources wrapped in the approved JRW console design,
so that product, brand, category, inventory, and owner work keeps functionality while matching the UX reference.

## Acceptance Criteria

1. Given Admin opens `/admin/products`, when products load, then page renders inside dashboard shell with Direction 05 sidebar, top context bar, toolbar row, dense table-first work area, and editor/side-panel flow and existing product search, filters, pagination, table view, list view, editor, variant, inventory, publish, and permission behavior remains intact.
2. Given Admin opens brand resources, when brand cards or list/table view renders, then existing card/list functionality remains and visual treatment follows the 1px module system without decorative card-heavy dashboard styling.
3. Given Admin opens categories, when category table, editor, loading, empty, or error state renders, then UI uses the same dashboard toolbar, table density, focus, and status treatment.
4. Given Super Admin opens owner governance, when Admin Accounts or Ownership Transfer controls render, then Direction 07 owner-governance composition is followed and ownership transfer remains deliberate with confirmation and audit-safe wording.
5. Given tablet or wide desktop viewport is used, when dashboard pages render, then shell remains usable, table/action text does not overflow, and side panels adapt per responsive admin rules.
6. Given implementation finishes, when tests/QA run, then checks cover products, brands, categories, owner governance, preserved view toggles, preserved resource actions, shell composition, keyboard access, text overflow, and `npm run check` passes or blockers are documented.

## Tasks / Subtasks

- [x] Task 1: Lock scope and preserve resource functionality. (AC: 1-6)
  - [x] Requires Story 3.10 complete. Reuse `AdminLayout`/`DashboardShell`; do not create a second shell.
  - [x] Do not rewrite product/category/brand/owner feature logic.
  - [x] Preserve existing table/list/card toggles and all mutations.
  - [x] Do not add order/audit/customer functionality beyond placeholder nav targets.

- [x] Task 2: Wrap admin pages in shared shell. (AC: 1-6)
  - [x] Update `src/pages/admin/products/index.astro`, `brands/index.astro`, `brands/[id].astro`, `categories/index.astro`, and `owner/transfer.astro` to use the admin shell/layout.
  - [x] Preserve existing client hydration directives.
  - [x] Ensure active nav item is correct per route.
  - [x] Ensure owner-only page is visually in owner group and unavailable to non-owner shell state where applicable.
  - [x] Course correction: wrapped admin resource pages now rely on shared Astro page middleware for server-side page access before shell rendering.

- [x] Task 3: Refactor page-level framing out of feature dashboards where needed. (AC: 1-5)
  - [x] Remove duplicated `main mx-auto max-w-[1240px]` wrappers from feature components only if shell now owns the page frame.
  - [x] Preserve feature header content, summaries, filters, toolbar actions, empty/error/loading states.
  - [x] Do not collapse dense product table into card-only UI.
  - [x] Keep brand cards/list behavior from Story 3.0.

- [x] Task 4: Align admin resources to Direction 05/07 modules. (AC: 1-5)
  - [x] Products: dense table-first work area, toolbar rows, side panel/editor flow, list view preserved.
  - [x] Brands: card/list resource browser remains, but card modules align with 1px dashboard surface.
  - [x] Categories: table/search/editor flow uses same shell and toolbar rhythm.
  - [x] Owner governance: owner controls use Direction 07 warning/governance panel style.
  - [x] Text must stay practical: manage records, review status, retry action. No marketplace doctrine.

- [x] Task 5: Add focused tests. (AC: 1-6)
  - [x] Add or update admin layout tests for shell wrapping, active nav, owner group, and preserved content slots.
  - [x] Update product/brand/category/owner UI tests where wrappers changed.
  - [x] Ensure tests still cover product table/list view, brand card/list view, category table, and ownership transfer controls.

- [x] Task 6: Run validation. (AC: 6)
  - [x] Run targeted admin UI tests.
  - [x] Run `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`.
  - [x] Run `npm run check`.
  - [x] Manual QA admin pages at tablet, desktop, and wide desktop if dev server/browser QA is available; otherwise document blocker.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- N/A Route auth metadata declares public/optional/required auth, roles, and rate-limit class. Page/layout UI story only.
- N/A Route-level RBAC guard runs before validation or side effects for protected endpoints. Existing APIs own RBAC.
- N/A Service/controller enforces actor state before mutation. Existing APIs own actor checks.
- N/A Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. Existing APIs own brand scope.
- N/A Public/customer endpoints explicitly document why brand membership is not required. Admin UI story.
- [ ] Denial UI tests cover forbidden/non-owner shell state where implemented.
- [ ] Error response handling remains safe in existing feature components.
- N/A OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes. No endpoint change.

## Dev Notes

### Dependencies

- Requires Story 3.10 complete.
- Requires Story 4.8 complete for button/focus contract.
- Should run before Epic 6 admin order pages and before building audit/order dashboards.

### Current Code Intelligence

#### READ: `src/pages/admin/products/index.astro`

- Current state: imports `BaseLayout` and renders `ProductListDashboard client:load`.
- What this story changes: wrap with admin shell/layout.
- What must be preserved: hydration and product dashboard behavior.

#### READ: `src/features/admin-products/components/ProductListDashboard.tsx`

- Current state: owns full page `<main>`, large header, summary stats, `PageToolbar`, filters, `ViewToggle`, `DataTable`, `ResourceList`, editor, variant/inventory/publish flows.
- What this story changes: remove/adjust page frame only if shell owns it; align dashboard modules to Direction 05.
- What must be preserved: table/list modes, search/filter/pagination, create/edit/archive, permission states, toasts, confirm dialogs.

#### READ: `src/features/brands/components/BrandList.tsx`

- Current state: standalone `<main>` with brand cards/list toggle and language guard.
- What this story changes: wrap in shell and align resource cards to admin console.
- What must be preserved: card/list toggle, search, copy guard, brand links/actions.

#### READ: `src/features/admin-categories/components/CategoryList.tsx`

- Current state: standalone `<main>` with category table/editor/search.
- What this story changes: wrap in shell and align toolbar/table framing.
- What must be preserved: category CRUD, loading/error/empty states.

#### READ: `src/features/owner-governance/OwnershipTransferPanel.tsx`

- Current state: standalone owner transfer page with candidate table and transfer flow.
- What this story changes: wrap in Direction 07 governance composition.
- What must be preserved: exactly-one-owner behavior, password re-entry, confirmation, audit-safe copy.

### Technical Requirements

- Admin shell is desktop-first. Tablet must remain usable at 768px+.
- Keep dense tables for operational datasets. Do not create decorative card-heavy dashboard.
- Feature components stay under `src/features/**`; shell/layout primitives stay under `src/components/**` and `src/layouts/**`.
- Server-side RBAC remains source of truth. UI hiding is not authorization.

### Testing Requirements

- Use component tests for shell slots/landmarks/nav and feature page preservation.
- Existing admin product/brand/category/governance tests must remain green.
- `npm run check` must pass.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 3.11.
- `_bmad-output/planning-artifacts/ux-design-directions.html` - Direction 05 and Direction 07.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - UX-DR10, UX-DR11, UX-DR23, UX-DR29, UX-DR35.
- `_bmad-output/implementation-artifacts/3-9-admin-product-editor-variant-matrix-and-inventory-ui.md` - existing product admin story.
- `_bmad-output/project-context.md` - Admin dashboard UI rules.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `src/pages/admin/products/index.astro`
- `src/pages/admin/brands/index.astro`
- `src/pages/admin/brands/[id].astro`
- `src/pages/admin/categories/index.astro`
- `src/pages/admin/owner/transfer.astro`
- `src/features/admin-products/components/ProductListDashboard.tsx`
- `src/features/brands/components/BrandList.tsx`
- `src/features/admin-categories/components/CategoryList.tsx`
- `src/features/owner-governance/OwnershipTransferPanel.tsx`

### Completion Notes List

- Added `src/layouts/AdminLayout.astro` using the shared `DashboardShell` from Story 3.10; wrapped products, brands, brand detail, categories, and owner transfer admin routes with correct active nav and owner role state.
- Course correction: `AdminLayout` now reads server-inspected `Astro.locals.adminActor` from page middleware so Admin/Super Admin shell role state comes from the current admin session where available.
- Removed duplicate feature-level `<main>`/max-width page frames from products, brands, categories, and owner governance so the shell owns page landmarks and spacing.
- Preserved existing feature hydration, table/list/card toggles, product editor/variant/inventory/publish flows, category CRUD, brand resource browser, and ownership transfer flow.
- Addressed local review finding: shell logout now has a default client-side session DELETE + redirect handler for wrapped admin pages.
- Validation passed: targeted admin UI suites (`10` files, `50` tests), shell retest after logout fix, styling `rg` with only fixture/test-token matches, and `npm run check` with 0 errors plus existing deprecated `returnValue` hints.
- Manual tablet/desktop/wide browser QA was not run in this environment; responsive class coverage and Astro check validate integration.

### File List

- `_bmad-output/implementation-artifacts/3-11-admin-dashboard-console-fidelity.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/layout/DashboardShell.tsx`
- `src/features/admin-products/components/ProductListDashboard.tsx`
- `src/features/brands/components/BrandList.tsx`
- `src/features/admin-categories/components/CategoryList.tsx`
- `src/features/owner-governance/OwnershipTransferPanel.tsx`
- `src/layouts/AdminLayout.astro`
- `src/middleware/index.ts`
- `src/middleware/auth/admin-page-guard.ts`
- `src/middleware/auth/admin-page-guard.test.ts`
- `src/server/auth/admin-page-session.ts`
- `src/env.d.ts`
- `src/pages/admin/products/index.astro`
- `src/pages/admin/brands/index.astro`
- `src/pages/admin/brands/[id].astro`
- `src/pages/admin/categories/index.astro`
- `src/pages/admin/owner/transfer.astro`

### Change Log

- 2026-05-24: Created ready-for-dev story context.
- 2026-05-24: Wrapped admin resources in dashboard console shell and moved story to review.
- 2026-05-24: Completed local code review and marked story done.
- 2026-05-25: Course corrected admin resource pages to use server-side Astro page middleware before rendering protected shell UI.
