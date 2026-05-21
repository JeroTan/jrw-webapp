# Story 3.9: Admin Product Editor, Variant Matrix, and Inventory UI

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin,
I want table-first catalog screens and focused product editing controls,
So that I can manage product identity, variants, images, prices, stock, brand, categories, and publish status efficiently.

## Acceptance Criteria

1. Given Admin opens Products dashboard, when page loads, then table-first product list shows product name, brand/category, status, stock/availability, price summary, and updated timestamp and filters/search/pagination align with API contracts.
2. Given Admin creates or edits product, when Product Editor opens, then sections appear for identity, media, brand, categories, variants, pricing, inventory, and publish status and required fields, inline errors, form summary, dirty state, and saving state are visible.
3. Given Admin manages variants, when Variant Matrix renders, then rows support SKU/options, price, stock, status, duplicate option warnings, low-stock/archived states, and keyboard row actions.
4. Given Admin manages inventory, when Inventory Adjuster is used, then quantity/state changes validate before submit and stale/conflict responses rollback UI and show allowed next action.
5. Given Admin publishes product, when product is not publish-ready, then UI shows missing readiness items from server response and publish action is blocked without hiding draft save.
6. Given Admin lacks brand permission, when product belongs to unauthorized brand scope, then UI hides/disables mutations with safe reason and server denial remains source of truth.
7. Given design system rules apply, when catalog UI is reviewed, then UI uses sharp 0px corners, 1px borders, no shadows/blur, text status badges, visible focus, and no card-heavy dashboard layout.
8. Given responsive/accessibility QA runs, when product editor/table is tested, then tablet/desktop layouts work, narrow side panels become full-screen as needed, keyboard navigation works, labels/errors are associated, and text does not overflow buttons/badges/table cells.
9. Given implementation finishes, when tests/checks run, then UI tests or documented QA cover product list, editor sections, variant matrix, inventory adjuster, publish readiness, permission states, and accessibility basics and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Confirm scope and current baseline. (AC: 1-9)
  - [x] Verify Epic 3 is `in-progress` and Stories 3.0-3.8 are `done`; do not reopen.
  - [x] Confirm this story is the ninth Epic 3 backlog item after Story 3.8.
  - [x] Confirm existing `src/features/admin-products/` components: ProductEditor, VariantList, VariantEditor, InventoryAdjuster, ImageList, ImageUpload, PublishControl, ReadinessPanel, ProductList.
  - [x] Confirm existing `src/components/ui/` primitives: Button, IconButton, Input, Textarea, Select, Checkbox, Toggle, Badge, StatusBadge, Tabs, Modal, ConfirmDialog.
  - [x] Confirm existing `src/components/data-display/` primitives: DataTable, ResourceCard, ResourceList.
  - [x] Confirm existing `src/components/feedback/` primitives: Skeleton, Toast, EmptyState, Badge, StatusBadge.
  - [x] Confirm existing `src/components/layout/` primitives: PageToolbar.
  - [x] Confirm existing product API routes from Stories 3.2-3.7: products, variants, images, inventory, publish.
  - [x] Do NOT create new backend API endpoints — this story is UI integration and enhancement only.

- [x] Task 2: Build table-first Products dashboard page. (AC: 1, 7-9)
  - [x] Create `src/pages/admin/products/index.astro` as Astro shell page.
  - [x] Create `src/features/admin-products/components/ProductListDashboard.tsx` as React island.
  - [x] Product list table shows: product name, brand/category, status, stock/availability, price summary, updated timestamp.
  - [x] Integrate search filter using existing `SearchInput` primitive.
  - [x] Integrate pagination using existing or new `Pagination` primitive.
  - [x] Integrate view toggle (table/list) using existing `ViewToggle` primitive.
  - [x] Use existing `DataTable` component with columns mapped to `ProductRecord` type.
  - [x] Loading state uses `Skeleton` with stable dimensions.
  - [x] Empty state uses `EmptyState` with "Create first product" action.
  - [x] Error state uses `EmptyState` with retry action.
  - [x] Follow JRW Technical Brutalist tokens: 0px radius, 1px borders, no shadows/blur.
  - [x] Keyboard navigation works for table rows, search, pagination, and actions.

- [x] Task 3: Extend Product Editor with variant matrix and inventory sections. (AC: 2-4, 7-9)
  - [x] Review existing `ProductEditor.tsx` — currently has identity, media, brand, categories, publish sections.
  - [x] Add Variant Matrix section to Product Editor (or integrate existing `VariantList` as embedded section).
  - [x] Add Inventory Adjuster section to Product Editor (or integrate existing `InventoryAdjuster` as embedded section).
  - [x] Ensure all sections show required fields, inline errors, form summary, dirty state, and saving state.
  - [x] Dirty state protection: warn before leaving editor with unsaved changes.
  - [x] Form summary shows all validation errors at top of form.
  - [x] Inline errors appear below each invalid field.
  - [x] Saving state shows button pending state and disables form during save.

- [x] Task 4: Implement Variant Matrix with full CRUD operations. (AC: 3, 7-9)
  - [x] Review existing `VariantList.tsx` and `VariantEditor.tsx` — already have base CRUD.
  - [x] Enhance variant matrix to support: SKU/options display, price in centavos, stock quantity, status badges.
  - [x] Add duplicate option combination warnings when creating/editing variants.
  - [x] Add low-stock visual indicator when `inventoryState` is `LOW_STOCK` or `OUT_OF_STOCK`.
  - [x] Add archived state visual indicator with disabled actions.
  - [x] Keyboard row actions: Tab through rows, Enter to edit, Escape to cancel.
  - [x] Use existing `DataTable` for variant matrix rendering.
  - [x] Variant editor uses existing `VariantEditor` modal component.
  - [x] Archive action requires confirmation via `ConfirmDialog`.

- [x] Task 5: Implement Inventory Adjuster with validation and conflict handling. (AC: 4, 7-9)
  - [x] Review existing `InventoryAdjuster.tsx` — already has base adjuster.
  - [x] Ensure quantity/state changes validate before submit (non-negative quantity, valid inventory state).
  - [x] Stale/conflict responses rollback UI and show allowed next action.
  - [x] Use `CONFLICT_STATE` error code for stale inventory updates.
  - [x] Show rollback messaging with allowed next action on conflict.
  - [x] Inventory state selector uses existing `InventoryStateSelector` component.
  - [x] Audit-ready reason field for stock changes (optional but recommended).

- [x] Task 6: Integrate publish readiness UI. (AC: 5, 7-9)
  - [x] Review existing `PublishControl.tsx` and `ReadinessPanel.tsx` — already have publish UI.
  - [x] Ensure publish action is blocked when product is not publish-ready.
  - [x] Show missing readiness items from server response in `ReadinessPanel`.
  - [x] Draft save remains available even when publish is blocked.
  - [x] Publish button shows disabled state with tooltip explaining why blocked.
  - [x] Status badges use text labels, not color alone.

- [x] Task 7: Implement brand permission UI guards. (AC: 6, 7-9)
  - [x] Review existing brand membership guard patterns from Stories 2.6 and 3.6.
  - [x] UI hides/disables mutations when Admin lacks brand permission.
  - [x] Show safe reason for disabled actions (e.g., "You need active membership in this product brand.").
  - [x] Server denial remains source of truth — UI guards are convenience only.
  - [x] Forbidden state uses `EmptyState` or inline message with safe explanation.

- [x] Task 8: Responsive and accessibility QA. (AC: 7-9)
  - [x] Tablet (768px+) and desktop (1024px+) layouts work for product list and editor.
  - [x] Narrow viewports: side panels become full-screen panels.
  - [x] Keyboard navigation works for all interactive elements.
  - [x] Labels are associated with inputs via `htmlFor`/`id`.
  - [x] Errors are associated with inputs via `aria-describedby`.
  - [x] Text does not overflow buttons, badges, table cells.
  - [x] Focus is visible on all interactive elements.
  - [x] Reduced motion respects `prefers-reduced-motion`.
  - [x] Status badges include text labels (not color-only).

- [x] Task 9: Add UI tests and run validation. (AC: 9)
  - [x] Add component tests for ProductListDashboard, ProductEditor, VariantMatrix, InventoryAdjuster.
  - [x] Test product list rendering, search, pagination, empty/error states.
  - [x] Test product editor form validation, dirty state, save flow.
  - [x] Test variant matrix CRUD, duplicate warnings, low-stock states.
  - [x] Test inventory adjuster validation, conflict rollback.
  - [x] Test publish readiness blocking, disabled states.
  - [x] Test brand permission guards, forbidden states.
  - [x] Run targeted tests: `npx vitest run src/features/admin-products`.
  - [x] Run `npm run check` after typed changes.

### Dev Notes

### Epic Context

- This is the ninth and final Epic 3 catalog story after Story 3.8 (product snapshot preservation).
- Epic 3 covers: categories (3.1), product identity (3.2), brand/categories assignment (3.3), variants/prices (3.4), images (3.5), inventory (3.6), publish/archive (3.7), snapshots (3.8), and now the full admin UI (3.9).
- Epic 2 (Brand Collaboration) is complete with brand membership guards established.
- Requirements covered: Supports FR21-FR31; UX-DR10, UX-DR11, UX-DR12, UX-DR13, UX-DR14, UX-DR20, UX-DR21, UX-DR22, UX-DR29, UX-DR30, UX-DR31, UX-DR32.
- UX supported: DashboardShell (UX-DR10), admin resource browsing (UX-DR11), ProductEditor (UX-DR12), VariantMatrix (UX-DR13), InventoryAdjuster (UX-DR14), feedback patterns (UX-DR20), loading/conflict patterns (UX-DR21), form patterns (UX-DR22), responsive admin (UX-DR29), accessibility (UX-DR30), responsive QA (UX-DR31), accessibility QA (UX-DR32).
- Business value: Admins need a usable, efficient interface to manage the entire product catalog. Without this UI, all the backend API work from Stories 3.0-3.8 has no admin-facing surface. This story ties together all previous catalog work into a cohesive admin experience.

### Current Code Intelligence

#### `src/features/admin-products/` — existing components

- Current state: Has ProductEditor, VariantList, VariantEditor, InventoryAdjuster, ImageList, ImageUpload, PublishControl, ReadinessPanel, ProductList, and test files.
- **ProductEditor.tsx**: Modal-based editor with identity, media, brand, categories, and publish sections. Uses existing primitives (Modal, Input, Select, Textarea, Button). Has form validation, dirty state, image management, and publish controls.
- **VariantList.tsx**: Table-based variant list with search, create/edit/archive actions. Uses DataTable, SearchInput, PageToolbar, Skeleton, EmptyState, Toast. Has variant CRUD integration with API.
- **VariantEditor.tsx**: Modal-based variant editor with name, SKU, price (centavos), stock, preorder, variation chain. Uses existing primitives.
- **InventoryAdjuster.tsx**: Stock quantity and inventory state adjustment with validation.
- **PublishControl.tsx**: Publish/unpublish/archive actions with status display.
- **ReadinessPanel.tsx**: Shows missing readiness items for publish validation.
- **What this story uses**: All existing components as baseline.
- **What this story adds**: ProductListDashboard page, variant matrix enhancements, inventory adjuster enhancements, brand permission UI guards, responsive/accessibility improvements.
- **What must be preserved**: Existing component APIs, test files, and patterns. Do not break existing functionality.

#### `src/components/` — existing primitives

- **ui/**: Button, IconButton, Input, Textarea, Select, Checkbox, Toggle, Badge, StatusBadge, Tabs, Modal, ConfirmDialog, SearchInput, ViewToggle.
- **data-display/**: DataTable, ResourceCard, ResourceList.
- **feedback/**: Skeleton, Toast, EmptyState, Badge, StatusBadge.
- **layout/**: PageToolbar.
- What this story uses: All existing primitives for composition.
- What this story may add: Pagination primitive if not already existing (check `src/components/ui/` and `src/components/data-display/`).

#### `src/pages/admin/products/index.astro` — product list page

- Current state: May exist as basic Astro shell from Story 3.0.
- What this story changes: Adds full React island for ProductListDashboard with table, search, pagination, filters.
- What must be preserved: Astro page routing, SEO metadata, shared layout imports.

### Previous Story Intelligence

- Story 3.8 established product snapshot preservation with snapshot builder domain service, order snapshot schema extension, admin snapshot APIs, and tests. This story does NOT touch snapshot code — snapshots are consumed by Epic 6 (orders).
- Story 3.8 used targeted tests plus `npm run check`; use the same targeted style.
- Story 3.7 established product publish/archive lifecycle with readiness validation, state transitions, brand membership guards. Reuse the same publish UI patterns (PublishControl, ReadinessPanel) already in place.
- Story 3.6 established inventory management with stock quantity, inventory state, brand membership guards. Reuse the same InventoryAdjuster patterns already in place.
- Story 3.5 established product image upload/management with R2 storage. Reuse the same ImageList and ImageUpload patterns already in place.
- Story 3.4 established variant CRUD with centavos pricing, SKU uniqueness, variation_chain JSON. Reuse the same VariantList and VariantEditor patterns already in place.
- Story 3.2 established product identity CRUD with slug uniqueness. Reuse the same ProductEditor patterns already in place.
- Story 3.0 established admin resource browser and component system with DashboardShell, DataTable, SearchInput, ViewToggle, PageToolbar. Reuse the same patterns for product list dashboard.

### Git Intelligence

- Recent commits: 3-8 snapshot preservation, 3-7 publish/archive, 3-6 inventory management, 3-5 product images, 3-4 variant CRUD, 3-3 product brand/category assignment, 3-2 product identity CRUD, 3-1 categories, 3-0 admin resource browser.
- Current relevant pattern: code changes are small, typed, and backed by targeted Vitest files.
- UI work should follow the same incremental, tested approach.
- Existing components are well-structured — this story is primarily integration and enhancement, not ground-up creation.

### Architecture and UX Guardrails

- Astro owns page routing and SEO shells. React feature modules own interactive surfaces.
- Product list dashboard is Astro page with React island for interactive table.
- Product Editor, Variant Matrix, Inventory Adjuster are React feature components under `src/features/admin-products/`.
- UI uses local primitives and JRW Stitch tokens, not a full external component library.
- Follow `docs/design-by-google-stitch.md`: sharp 0px corners, 1px borders, no shadows, no blur, Satoshi headings, Space Mono utility text, cobalt accent.
- Admin dashboard is desktop-first, dense, table-driven, keyboard-friendly, and operation-focused.
- Use `src/styles/global.css` as the Tailwind CSS v4 project style surface for `@theme`, `@utility`, and reusable component classes.
- Status badges must include text and must not rely on color alone.
- Destructive or authority-changing actions require deliberate confirmation.
- UI copy must state what the screen, section, or field does for the user.
- Empty states should say current state plus next action, not abstract domain definitions.
- Permission text should say why action is unavailable and what permission is needed.
- Server state is authority for product data; frontend local state only handles UI interaction, form drafts, filters.
- Brand membership guards are enforced server-side; UI guards are convenience only.
- Do NOT build storefront UI, checkout flows, or order creation — this story is admin catalog UI only.

### Implementation Guidance

#### Product List Dashboard

The product list dashboard should be a table-first view showing:
- Product name (clickable to open editor)
- Brand/category assignment
- Status badge (DRAFT/PUBLISHED/ARCHIVED)
- Stock/availability summary
- Price range summary
- Updated timestamp
- Actions: Edit, Archive

Use existing `DataTable` component with columns mapped to `ProductRecord` type.
Integrate `SearchInput` for filtering by product name or SKU.
Integrate `Pagination` for page navigation (default page size 20, max 100).
Integrate `ViewToggle` for table/list view switching (optional).
Loading state uses `Skeleton` with stable dimensions.
Empty state uses `EmptyState` with "Create first product" action.
Error state uses `EmptyState` with retry action.

#### Variant Matrix Enhancements

The variant matrix should enhance the existing `VariantList` component:
- Show variant name, SKU, price (centavos), stock quantity, inventory state, status.
- Duplicate option combination warnings: when creating/editing, check if same variation_chain already exists for this product.
- Low-stock visual indicator: show warning badge when `inventoryState` is `LOW_STOCK`.
- Out-of-stock visual indicator: show disabled state when `inventoryState` is `OUT_OF_STOCK`.
- Archived state: show archived badge and disable edit/archive actions.
- Keyboard row actions: Tab through rows, Enter to edit, Escape to cancel.
- Use existing `DataTable` for rendering.
- Use existing `VariantEditor` modal for create/edit.

#### Inventory Adjuster Enhancements

The inventory adjuster should enhance the existing `InventoryAdjuster` component:
- Quantity validation: non-negative integer, max allowed limit.
- Inventory state validation: must be one of `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, `PREORDER`.
- Stale/conflict handling: if `CONFLICT_STATE` error from server, rollback UI to previous state and show allowed next action.
- Audit-ready reason field: optional text field for stock change reason.
- Use existing `InventoryStateSelector` component.
- Show rollback messaging with allowed next action on conflict.

#### Brand Permission UI Guards

Brand permission UI guards should:
- Check Admin's brand membership before showing mutation actions.
- Hide/disable edit, archive, publish actions when Admin lacks brand permission.
- Show safe reason: "You need active membership in this product brand."
- Server denial remains source of truth — UI guards are convenience only.
- Use existing brand membership check patterns from Stories 2.6 and 3.6.

#### Responsive and Accessibility

- Tablet (768px+) and desktop (1024px+) layouts work for product list and editor.
- Narrow viewports: side panels become full-screen panels.
- Keyboard navigation works for all interactive elements.
- Labels are associated with inputs via `htmlFor`/`id`.
- Errors are associated with inputs via `aria-describedby`.
- Text does not overflow buttons, badges, table cells.
- Focus is visible on all interactive elements.
- Reduced motion respects `prefers-reduced-motion`.
- Status badges include text labels (not color-only).

### Files Being Modified

#### UPDATE: `src/pages/admin/products/index.astro` — product list dashboard page

- Current state: May exist as basic Astro shell from Story 3.0.
- What this story adds: Full React island for ProductListDashboard with table, search, pagination, filters.
- What must be preserved: Astro page routing, SEO metadata, shared layout imports.

#### NEW: `src/features/admin-products/components/ProductListDashboard.tsx`

- Current state: Does not exist.
- What this story creates: Main product list dashboard component with table, search, pagination, filters, actions.
- Uses existing `DataTable`, `SearchInput`, `Pagination`, `ViewToggle`, `Skeleton`, `EmptyState`, `Toast`.

#### UPDATE: `src/features/admin-products/components/ProductEditor.tsx` — extend with variant/inventory sections

- Current state: Has identity, media, brand, categories, publish sections.
- What this story adds: Variant Matrix section, Inventory Adjuster section (or integration of existing components).
- What must be preserved: Existing form validation, dirty state, image management, publish controls.

#### UPDATE: `src/features/admin-products/components/VariantList.tsx` — enhance variant matrix

- Current state: Has basic variant list with search, create/edit/archive.
- What this story adds: Duplicate option warnings, low-stock/out-of-stock indicators, archived state visuals, keyboard row actions.
- What must be preserved: Existing CRUD operations, API integration, test files.

#### UPDATE: `src/features/admin-products/components/InventoryAdjuster.tsx` — enhance inventory adjuster

- Current state: Has basic stock quantity and inventory state adjustment.
- What this story adds: Stale/conflict rollback UI, audit-ready reason field, enhanced validation.
- What must be preserved: Existing API integration, test files.

#### UPDATE: `src/features/admin-products/components/PublishControl.tsx` — enhance publish blocking

- Current state: Has publish/unpublish/archive actions.
- What this story adds: Publish blocking when not publish-ready, disabled state with tooltip.
- What must be preserved: Existing status display, API integration.

#### UPDATE: `src/features/admin-products/api.ts` — add any missing API calls

- Current state: Has product, variant, image, inventory, publish API calls.
- What this story adds: May add brand membership check API call if needed.
- What must be preserved: Existing API call signatures, error handling.

#### UPDATE: `src/features/admin-products/types.ts` — add any missing types

- Current state: Has ProductRecord, ProductVariantRecord, ProductPhotoRecord, etc.
- What this story adds: May add types for dashboard state, pagination, filters.
- What must be preserved: Existing type definitions.

#### NEW: `src/components/ui/Pagination.tsx` (if not existing)

- Current state: Check if Pagination exists in `src/components/ui/`.
- What this story creates: Pagination component with page numbers, prev/next, page size selector.
- Uses JRW tokens: 0px radius, 1px borders, cobalt accent for active page.

#### NEW: `src/features/admin-products/components/ProductListDashboard.test.tsx`

- Current state: Does not exist.
- What this story creates: Component tests for product list dashboard — rendering, search, pagination, empty/error states, keyboard navigation.

#### UPDATE: `src/features/admin-products/components/products-ui.test.ts` — extend existing tests

- Current state: Has existing product UI tests.
- What this story adds: Tests for new dashboard, enhanced variant matrix, enhanced inventory adjuster, brand permission guards.
- What must be preserved: Existing test coverage.

### Project Structure Notes

- Expected new files:
  - `src/features/admin-products/components/ProductListDashboard.tsx` (NEW)
  - `src/features/admin-products/components/ProductListDashboard.test.tsx` (NEW)
  - `src/components/ui/Pagination.tsx` (NEW — if not existing)
- Expected updated files:
  - `src/pages/admin/products/index.astro` (UPDATE — add React island)
  - `src/features/admin-products/components/ProductEditor.tsx` (UPDATE — add variant/inventory sections)
  - `src/features/admin-products/components/VariantList.tsx` (UPDATE — enhance variant matrix)
  - `src/features/admin-products/components/InventoryAdjuster.tsx` (UPDATE — enhance adjuster)
  - `src/features/admin-products/components/PublishControl.tsx` (UPDATE — enhance publish blocking)
  - `src/features/admin-products/api.ts` (UPDATE — add brand membership check if needed)
  - `src/features/admin-products/types.ts` (UPDATE — add dashboard types)
  - `src/features/admin-products/components/products-ui.test.ts` (UPDATE — extend tests)
- Do not modify:
  - `src/domain/schema/catalog.ts` (no catalog schema changes)
  - `src/domain/schema/transactions.ts` (no transaction schema changes)
  - `src/server/routes/products.routes.ts` (no API route changes)
  - `src/server/routes/variants.routes.ts` (no API route changes)
  - `src/server/routes/inventory.routes.ts` (no API route changes)
  - `src/server/routes/images.routes.ts` (no API route changes)
  - `src/server/repositories/ProductRepository.ts` (no repository changes)
  - `src/server/repositories/VariantRepository.ts` (no repository changes)
  - `src/server/services/ProductService.ts` (no service changes)
  - `src/domain/products/**` (no domain changes)
  - `src/domain/snapshots/**` (not in scope — Epic 6 consumes snapshots)
  - `src/features/storefront/**` (not in scope)
  - `src/features/cart-checkout/**` (not in scope)
  - PayMongo/payment docs or flows
  - Checkout/order creation flows (Epic 5)

### Testing Requirements

- Targeted Vitest for product list dashboard:

```bash
npx vitest run src/features/admin-products/components/ProductListDashboard.test.tsx
```

- Targeted Vitest for variant matrix:

```bash
npx vitest run src/features/admin-products/components/variants-ui.test.ts
```

- Targeted Vitest for inventory adjuster:

```bash
npx vitest run src/features/admin-products/components/inventory-ui.test.ts
```

- Targeted Vitest for product editor:

```bash
npx vitest run src/features/admin-products/components/products-ui.test.ts
```

- Type/Astro check after typed changes:

```bash
npm run check
```

- Manual QA focus for MR. JRW final verdict:
  - Product list: table renders with correct columns, search filters products, pagination works, empty/error states display correctly.
  - Product editor: form validation works, dirty state warns before leaving, save flow succeeds, image management works, publish controls work.
  - Variant matrix: CRUD operations work, duplicate warnings appear, low-stock/out-of-stock indicators display, keyboard navigation works.
  - Inventory adjuster: quantity validation works, conflict rollback shows allowed next action, audit reason field is optional.
  - Publish readiness: publish blocked when not ready, missing items shown, draft save available.
  - Brand permissions: mutations disabled when no membership, safe reason shown.
  - Responsive: tablet/desktop layouts work, narrow viewports adapt, text does not overflow.
  - Accessibility: keyboard navigation works, labels associated, errors associated, focus visible, reduced motion respected.

### Latest Technical Information

- No web research required for this story. Use repo-pinned dependencies from `package.json`: Astro `^6.1.9`, React `^19.2.5`, Tailwind CSS `^4.2.4`, Vitest `^4.1.5`, Elysia `1.4.28`, Drizzle ORM `0.45.2`, Zod `4.4.1`.
- Development D1: `jrw-database-development`, id `beabfd98-8611-4d58-8f1b-7a972b8af1ed`.
- Production D1: `jrw-database-production`, id `fd08e264-2046-4648-9164-84f66948533e`.
- Remote-first D1 is project standard. No schema changes needed for this story.
- `InventoryDurableObject` is scaffolded only — not relevant for this story (UI only).

### References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.9)
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR21-FR31, NFR23-NFR30)
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.md` (DashboardShell UX-DR10, admin resource browsing UX-DR11, ProductEditor UX-DR12, VariantMatrix UX-DR13, InventoryAdjuster UX-DR14, feedback patterns UX-DR20, loading/conflict patterns UX-DR21, form patterns UX-DR22, responsive admin UX-DR29, accessibility UX-DR30, responsive QA UX-DR31, accessibility QA UX-DR32)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (Project Structure, Frontend Architecture, UI and Design Rules)
- Project context: `_bmad-output/project-context.md` (Architecture And DDD, UI And Design Rules, Testing And Quality)
- Previous related stories:
  - `_bmad-output/implementation-artifacts/3-8-preserve-product-snapshot-fields-for-future-orders.md`
  - `_bmad-output/implementation-artifacts/3-7-publish-archive-and-validate-product-readiness.md`
  - `_bmad-output/implementation-artifacts/3-6-manage-stock-quantity-and-inventory-state.md`
  - `_bmad-output/implementation-artifacts/3-5-upload-and-manage-product-images.md`
  - `_bmad-output/implementation-artifacts/3-4-manage-product-variants-and-prices.md`
  - `_bmad-output/implementation-artifacts/3-2-create-and-edit-product-identity.md`
  - `_bmad-output/implementation-artifacts/3-0-admin-resource-browser-and-component-system.md`
- Existing components: `src/features/admin-products/components/**`, `src/components/ui/**`, `src/components/data-display/**`, `src/components/feedback/**`, `src/components/layout/**`
- Existing API routes: `src/server/routes/products.routes.ts`, `src/server/routes/variants.routes.ts`, `src/server/routes/inventory.routes.ts`, `src/server/routes/images.routes.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

1. Review existing `src/features/admin-products/` components and `src/components/` primitives.
2. Create `ProductListDashboard.tsx` with table, search, pagination, filters.
3. Create or update `src/pages/admin/products/index.astro` with React island.
4. Extend `ProductEditor.tsx` with variant matrix and inventory sections.
5. Enhance `VariantList.tsx` with duplicate warnings, stock indicators, keyboard actions.
6. Enhance `InventoryAdjuster.tsx` with conflict rollback, audit reason field.
7. Enhance `PublishControl.tsx` with publish blocking, disabled states.
8. Add brand permission UI guards.
9. Add component tests for new and updated components.
10. Run `npm run check` and document any blockers.

### Debug Log References

- `npx vitest run src/features/admin-products/components` (pass)
- `npm run check` (pass; 0 errors, 0 warnings, existing hints only)

### Completion Notes List

- Built new table-first `ProductListDashboard` with search, brand/category filters, table/list toggle, and pagination primitive.
- Routed `/admin/products` Astro page to dashboard island and preserved create/edit modal flow.
- Extended `ProductEditor` with embedded variant matrix and dedicated inventory adjuster section, including validation, rollback-on-conflict messaging, and optional audit reason input.
- Enhanced `VariantList` with option-combination duplicate warnings, inventory-state badges, archived read-only behavior, confirm-dialog archive, and keyboard row actions.
- Added publish guard messaging and mutation lock behavior for brand-scope permission limits while preserving server as source of truth.
- Added/updated component tests for dashboard, variant matrix, inventory adjuster, publish guard, and editor coverage.

### File List

- `src/pages/admin/products/index.astro`
- `src/components/ui/Pagination.tsx`
- `src/components/ui/index.ts`
- `src/styles/global.css`
- `src/features/admin-products/api.ts`
- `src/features/admin-products/components/ProductListDashboard.tsx`
- `src/features/admin-products/components/ProductList.tsx`
- `src/features/admin-products/components/ProductEditor.tsx`
- `src/features/admin-products/components/VariantList.tsx`
- `src/features/admin-products/components/InventoryAdjuster.tsx`
- `src/features/admin-products/components/PublishControl.tsx`
- `src/features/admin-products/components/ProductListDashboard.test.tsx`
- `src/features/admin-products/components/products-ui.test.ts`
- `src/features/admin-products/components/variants-ui.test.ts`
- `src/features/admin-products/components/inventory-ui.test.ts`
- `src/features/admin-products/components/publish-ui.test.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/3-9-admin-product-editor-variant-matrix-and-inventory-ui.md`

## Change Log

- 2026-05-21: Story 3.9 context engine created for admin product editor, variant matrix, inventory UI, table-first product list, brand permission guards, responsive/accessibility QA, and targeted tests.
- 2026-05-21: Implemented Story 3.9 UI surfaces (dashboard, editor variant/inventory integration, permission guards), added pagination primitive, and completed targeted/admin checks.
