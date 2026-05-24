# Story 3.11: Admin Dashboard Console Fidelity

Status: ready-for-dev

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

- [ ] Task 1: Lock scope and preserve resource functionality. (AC: 1-6)
  - [ ] Requires Story 3.10 complete. Reuse `AdminLayout`/`DashboardShell`; do not create a second shell.
  - [ ] Do not rewrite product/category/brand/owner feature logic.
  - [ ] Preserve existing table/list/card toggles and all mutations.
  - [ ] Do not add order/audit/customer functionality beyond placeholder nav targets.

- [ ] Task 2: Wrap admin pages in shared shell. (AC: 1-6)
  - [ ] Update `src/pages/admin/products/index.astro`, `brands/index.astro`, `brands/[id].astro`, `categories/index.astro`, and `owner/transfer.astro` to use the admin shell/layout.
  - [ ] Preserve existing client hydration directives.
  - [ ] Ensure active nav item is correct per route.
  - [ ] Ensure owner-only page is visually in owner group and unavailable to non-owner shell state where applicable.

- [ ] Task 3: Refactor page-level framing out of feature dashboards where needed. (AC: 1-5)
  - [ ] Remove duplicated `main mx-auto max-w-[1240px]` wrappers from feature components only if shell now owns the page frame.
  - [ ] Preserve feature header content, summaries, filters, toolbar actions, empty/error/loading states.
  - [ ] Do not collapse dense product table into card-only UI.
  - [ ] Keep brand cards/list behavior from Story 3.0.

- [ ] Task 4: Align admin resources to Direction 05/07 modules. (AC: 1-5)
  - [ ] Products: dense table-first work area, toolbar rows, side panel/editor flow, list view preserved.
  - [ ] Brands: card/list resource browser remains, but card modules align with 1px dashboard surface.
  - [ ] Categories: table/search/editor flow uses same shell and toolbar rhythm.
  - [ ] Owner governance: owner controls use Direction 07 warning/governance panel style.
  - [ ] Text must stay practical: manage records, review status, retry action. No marketplace doctrine.

- [ ] Task 5: Add focused tests. (AC: 1-6)
  - [ ] Add or update admin layout tests for shell wrapping, active nav, owner group, and preserved content slots.
  - [ ] Update product/brand/category/owner UI tests where wrappers changed.
  - [ ] Ensure tests still cover product table/list view, brand card/list view, category table, and ownership transfer controls.

- [ ] Task 6: Run validation. (AC: 6)
  - [ ] Run targeted admin UI tests.
  - [ ] Run `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`.
  - [ ] Run `npm run check`.
  - [ ] Manual QA admin pages at tablet, desktop, and wide desktop if dev server/browser QA is available; otherwise document blocker.

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

- Story context created only. No implementation performed.

### File List

- `_bmad-output/implementation-artifacts/3-11-admin-dashboard-console-fidelity.md`

### Change Log

- 2026-05-24: Created ready-for-dev story context.
