# Story 3.6: Manage Stock Quantity and Inventory State

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin,
I want to update stock quantities and inventory state for variants,
so that storefront availability is accurate before checkout reservation exists.

## Acceptance Criteria

1. Given active approved Admin has product permission, when Admin updates variant stock quantity, then stock quantity is saved and response uses standard envelope.
2. Given Admin sets inventory state, when state is valid, then inventory state is one of `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, or `PREORDER` and invalid states are rejected.
3. Given stock quantity and inventory state conflict, when validation runs, then system enforces documented consistency rules or returns conflict/validation error and no invalid inventory state persists.
4. Given Admin lacks product brand permission, when Admin attempts stock mutation, then system returns forbidden error and stock state remains unchanged.
5. Given inventory update succeeds, when audit/event hooks run, then safe actor, product/variant target, old/new stock where safe, timestamp, and request ID are recorded or emitted.
6. Given storefront/product APIs read availability, when inventory state is exposed, then customer-safe availability labels are returned and internal reservation/provider details are hidden.
7. Given checkout inventory reservation comes later, when this story completes, then inventory structure supports future reservation/release with Durable Object and/or stock versioning and this story does not claim checkout oversell safety yet.
8. Given implementation finishes, when tests run, then tests cover stock update, valid states, invalid states, consistency conflict, permission denial, and customer-safe availability output and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Task 1: Confirm scope and current baseline. (AC: 1-8)
  - [ ] Verify Epic 3 is `in-progress` and Stories 3.0-3.5 are `done`; do not reopen.
  - [ ] Confirm this story is the sixth Epic 3 backlog item after Story 3.5.
  - [ ] Confirm existing `product_variants` table in `src/domain/schema/catalog.ts` — current fields include `id`, `product_id`, `sku`, `options`, `price_centavos`, `status`.
  - [ ] Confirm existing `VariantRepository`, `VariantService`, `VariantController`, and variant routes from Story 3.4.
  - [ ] Confirm existing `product_photos` table extensions from Story 3.5.
  - [ ] Confirm existing brand membership guards from Story 2.6.
  - [ ] Confirm existing `InventoryDurableObject` scaffold in `src/adapter/infrastructure/` — do NOT claim inventory safety until locking/reservation logic exists.
  - [ ] Do NOT add checkout reservation, payment flows, or storefront inventory UI beyond availability output.

- [ ] Task 2: Add inventory domain types, schemas, and validation. (AC: 1-3, 6)
  - [ ] Add `InventoryState` enum/type (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, `PREORDER`) to `src/domain/products/types.ts`.
  - [ ] Add `InventoryRecord`, `UpdateStockInput`, `UpdateInventoryStateInput` types.
  - [ ] Add Zod schemas for stock quantity validation (non-negative integer, max reasonable limit) in `src/domain/products/schemas.ts`.
  - [ ] Add TypeBox schemas for inventory API contracts.
  - [ ] Define consistency rules: quantity=0 → `OUT_OF_STOCK`, quantity>0 and below threshold → `LOW_STOCK`, quantity>=threshold → `IN_STOCK`. Threshold configurable or documented default.

- [ ] Task 3: Add stock/inventory repository methods. (AC: 1-4)
  - [ ] Extend `VariantRepository` with `updateStockQuantity`, `updateInventoryState`, `getStockAvailability` methods.
  - [ ] Use D1/Drizzle patterns consistent with existing variant methods.
  - [ ] Stock updates use atomic D1 operations to prevent race conditions at basic level.
  - [ ] `getStockAvailability` returns customer-safe availability labels, not raw quantities for storefront.

- [ ] Task 4: Add inventory service use cases. (AC: 1-5, 7)
  - [ ] Create or extend `InventoryService` in `src/server/services/InventoryService.ts`.
  - [ ] Use cases: `updateStockQuantity`, `updateInventoryState`, `getAvailability`, `validateStateTransition`.
  - [ ] Service enforces: brand membership guard (reuse `requireBrandMutationPermission` pattern).
  - [ ] Service validates: stock quantity non-negative, inventory state valid, consistency between quantity and state.
  - [ ] Service returns `AppResult`/`GeneralError` with appropriate error codes.
  - [ ] Inventory mutations record audit event through existing audit interface.
  - [ ] Structure supports future Durable Object reservation/release — add `stock_version` field or document extension path.

- [ ] Task 5: Add inventory API routes and controllers. (AC: 1-6, 8)
  - [ ] Create `InventoryController` in `src/server/controllers/InventoryController.ts`.
  - [ ] Create inventory routes under `src/server/routes/inventory.routes.ts` with endpoints:
    - `PATCH /api/admin/products/:productId/variants/:variantId/stock` — update stock quantity.
    - `PATCH /api/admin/products/:productId/variants/:variantId/inventory-state` — update inventory state.
    - `GET /api/products/:productId/variants/:variantId/availability` — customer-safe availability (public).
  - [ ] Admin routes require Admin authentication via existing RBAC guards.
  - [ ] Public availability route is accessible without auth but returns customer-safe labels only.
  - [ ] All routes declare TypeBox contracts, OpenAPI metadata, auth, rate-limit class, and error codes.
  - [ ] Register inventory routes in `src/server/app.ts`.

- [ ] Task 6: Extend variant detail/list to include availability. (AC: 6)
  - [ ] Extend variant responses to include `availability` field with customer-safe label.
  - [ ] Map internal state to public labels: `IN_STOCK` → "Available", `LOW_STOCK` → "Low Stock", `OUT_OF_STOCK` → "Unavailable", `PREORDER` → "Preorder".
  - [ ] No raw stock quantities exposed in customer-facing responses unless explicitly required later.

- [ ] Task 7: Add admin inventory UI (basic stock adjuster). (AC: 1-4, 8)
  - [ ] Create `src/features/admin-products/components/InventoryAdjuster.tsx` — stock quantity input with validation.
  - [ ] Create `src/features/admin-products/components/InventoryStateSelector.tsx` — inventory state dropdown/status selector.
  - [ ] Integrate into existing `VariantEditor.tsx` or `VariantList.tsx` as appropriate.
  - [ ] Use existing `Input`, `Select`, `Badge`, `StatusBadge`, `EmptyState`, `Skeleton` primitives.
  - [ ] Validation feedback: negative quantity rejected, invalid state rejected, consistency conflict shown.
  - [ ] Success toast on save; error summary on failure.

- [ ] Task 8: Styles and accessibility. (AC: 4-8)
  - [ ] Inventory UI uses JRW tokens: 0px corners, 1px borders, no shadows, cobalt for focus/selected.
  - [ ] Inventory status badges include text labels — not color alone.
  - [ ] Stock input has visible label and keyboard-accessible controls.
  - [ ] Respect `prefers-reduced-motion` for any transitions.
  - [ ] Error states have clear text descriptions.

- [ ] Task 9: Targeted tests and checks. (AC: 1-8)
  - [ ] Add domain/service tests in `src/server/services/InventoryService.test.ts` covering: stock update success, invalid quantity (negative), valid state transitions, invalid state rejection, consistency conflict, brand membership denial, audit event emission.
  - [ ] Add route/controller tests in `src/server/routes/inventory.routes.test.ts` covering: stock update, state update, availability read, unauthorized access, invalid data, permission denial.
  - [ ] Add UI tests in `src/features/admin-products/components/inventory-ui.test.ts` covering: adjuster rendering, state selector rendering, validation errors, status badge text labels, empty states.
  - [ ] Run changed-target tests only: `npx vitest run src/server/services/InventoryService.test.ts src/server/routes/inventory.routes.test.ts src/features/admin-products`.
  - [ ] Run `npm run check` after typed/component changes.
  - [ ] Do not run full `npm run build-test` unless implementation touches broader surfaces or MR. JRW asks for final full verdict.

### Review Findings

- [ ] [Review][TBD] Stock quantity updates should be atomic — verify D1 write pattern prevents concurrent overwrite.
- [ ] [Review][TBD] Inventory state consistency validation should run before persistence, not after.
- [ ] [Review][TBD] Customer availability endpoint should not expose raw stock counts or internal state names.
- [ ] [Review][TBD] Audit event for stock changes should include old and new quantities where safe.
- [ ] [Review][TBD] Admin inventory UI should not overwrite user-edited variant data when availability data arrives.

## Dev Notes

### Epic Context

- This is the sixth Epic 3 catalog story after Story 3.5 (product images).
- Epic 2 (Brand Collaboration) is complete with brand membership guards established.
- Requirements covered: FR28, FR30; supports FR47 (checkout inventory reservation).
- UX supported: UX-DR13 (Variant Matrix stock/status), UX-DR14 (Inventory Adjuster pattern), UX-DR20 (feedback patterns), UX-DR22 (form patterns), UX-DR26 (status labels), UX-DR29 (responsive admin), UX-DR30 (accessibility).
- Business value: Accurate stock quantities and inventory states are required for storefront availability display and future checkout reservation. Without stock management, customers cannot know if products are available, and checkout cannot prevent overselling.

### Current Code Intelligence

#### `src/domain/schema/catalog.ts` — `product_variants` table

- Current state: `product_variants` table has `id` (cuid2), `product_id` (FK to `products`), `sku` (text), `options` (JSON), `price_centavos` (integer), `status` (text).
- **Gap**: Table may lack `stock_quantity` and `inventory_state` columns — verify existing schema. If present, confirm types and defaults.
- What this story uses: Stock quantity and inventory state fields. **May need to extend schema** if columns don't exist.
- What this story does NOT change: No publish/archive transitions (Story 3.7), no checkout reservation (Epic 5).
- Preserve: Existing `products`, `product_photos`, `categories` tables and relationships.

#### `src/server/repositories/VariantRepository.ts`

- Current state: Has variant CRUD methods from Story 3.4 — `create`, `findById`, `listByProductId`, `update`, `archive`, with SKU uniqueness and duplicate option detection.
- What this story adds: `updateStockQuantity`, `updateInventoryState`, `getStockAvailability` methods.
- What must be preserved: Existing method signatures, D1/Drizzle access patterns, SKU uniqueness logic.

#### `src/server/services/VariantService.ts`

- Current state: Has variant CRUD use cases with brand membership guards from Story 3.4.
- What this story does NOT change: Variant service methods remain as-is. Inventory service is separate or extends carefully.
- Preserve: Existing `AppResult`/`GeneralError` patterns, existing brand membership guard pattern (`requireBrandMutationPermission`).

#### `src/server/routes/variants.routes.ts`

- Current state: Has variant CRUD routes from Story 3.4.
- What this story adds: Inventory routes in **separate** `inventory.routes.ts` file, registered in `src/server/app.ts`.
- Preserve: Existing route composition pattern, guard usage, envelope adaptation, TypeBox contracts.

#### `src/features/admin-products/`

- Current state: Has `ProductList.tsx`, `ProductEditor.tsx`, `VariantList.tsx`, `VariantEditor.tsx`, `ImageUpload.tsx`, `ImageList.tsx`, `api.ts`, `types.ts` from Stories 3.2-3.5.
- What this story adds: `InventoryAdjuster.tsx`, `InventoryStateSelector.tsx`, inventory API fetch helpers, inventory types.
- Preserve: Existing list and editor behavior, form validation patterns, typed API clients, image management UI.

#### `src/components/**`

- Current state: `Select`, `Input`, `Button`, `Badge`, `StatusBadge`, `DataTable`, `EmptyState`, `Skeleton`, `PageToolbar`, `SearchInput`, `ConfirmDialog` available.
- What this story uses: `Input` for stock quantity, `Select` for inventory state, `StatusBadge` for availability display, `Button` for save actions.
- Preserve: Existing primitive behavior and exports.

#### `src/adapter/infrastructure/InventoryDurableObject.ts`

- Current state: Scaffolded only — do NOT claim inventory safety until locking/reservation logic and tests exist.
- What this story does: Structure inventory data to support future DO reservation/release. Add `stock_version` field or document extension path.
- Preserve: DO scaffold — do not modify until Epic 5 checkout reservation story.

### Previous Story Intelligence

- Story 3.5 established product image upload/management with R2 storage, brand membership guards, and admin image UI. Reuse the same repository/service/controller/route patterns for inventory.
- Story 3.5 used targeted tests plus `npm run check`; use the same targeted style.
- Story 3.5 review findings: R2 fallback URLs needed serving route, photo timestamps needed normalization, storage failure logs needed scrubbing, upload needed rollback on DB failure, removing primary needed promotion, nested modal needed keyboard guard. Apply same principles: scrub provider errors, validate before persistence, handle edge cases.
- Story 3.4 established variant CRUD with centavos pricing, SKU uniqueness, duplicate option combination detection, brand membership guards, and admin variant UI. Inventory extends variant data — reuse same patterns.
- Story 3.4 review findings: Variant editor reset user edits when data arrived — avoid same pattern by not overwriting user-edited stock state when availability data arrives.
- Story 3.3 established product brand/category assignment with PATCH endpoints, organization GET endpoint, brand membership guards, and audit hooks. Reuse the same patterns.
- Story 3.2 established product identity CRUD with slug uniqueness, default DRAFT status, admin UI. Inventory service should follow same error handling and envelope patterns.
- Story 2.6 established brand-scoped product mutation guards. This story's stock mutations must follow the same membership check pattern — check product's `brand_id` and verify Admin membership.

### Git Intelligence

- Recent commits: 3-5 reviewed and implemented (product images), 3-4 variant CRUD, 3-3 product brand/category assignment, 3-2 product identity CRUD, 3-1 category CRUD, 3-0 component system.
- Current relevant pattern: code changes are small, typed, and backed by targeted Vitest files.
- Inventory work should follow the same incremental, tested approach.
- Schema migration may be needed for `product_variants` table extensions — coordinate with MR. JRW for remote development migration.

### Architecture and UX Guardrails

- Astro owns page routing and SEO shells. React feature modules own interactive surfaces.
- Shared primitives go under `src/components/**`; feature-specific inventory UI stays under `src/features/admin-products/**`.
- Inventory API follows Route -> Controller -> Service -> Domain/Repository.
- JRW visual system: 0px radius, 1px borders, no shadows, no blur, cobalt accent only for focus/selected/primary/live status.
- Admin UI is dense, keyboard-friendly, and operation-focused.
- Status labels must be text-visible and cannot rely on color alone (NFR26).
- UI copy must state what the screen, section, or field does for the user. Keep technical boundary language in planning docs only.
- API JSON uses camelCase; database uses snake_case; controllers/services map rows to DTOs.
- Inventory state should use `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, `PREORDER` (project-context).
- Durable Object `InventoryDurableObject` is scaffolded only. Do not claim inventory safety until locking/reservation logic and tests exist (project-context).
- Inventory concurrency must use Durable Object coordination and/or documented optimistic concurrency so checkout cannot oversell (project-context).

### Implementation Guidance

#### Schema Check for `product_variants`

Verify if `product_variants` table already has `stock_quantity` and `inventory_state` columns:
- If present: confirm types (`stock_quantity` as integer, `inventory_state` as text with constraint).
- If absent: add columns via Drizzle migration.

```typescript
// Proposed columns if absent:
stock_quantity: integer("stock_quantity").notNull().default(0),
inventory_state: text("inventory_state", { enum: ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "PREORDER"] }).notNull().default("OUT_OF_STOCK"),
stock_version: integer("stock_version").notNull().default(0), // for future optimistic concurrency
```

**Migration approach**: Create Drizzle migration if columns don't exist. Apply to remote development first.

#### Inventory State Consistency Rules

Define and enforce consistency between `stock_quantity` and `inventory_state`:
- `stock_quantity = 0` → `inventory_state` must be `OUT_OF_STOCK`.
- `stock_quantity > 0` and `stock_quantity <= LOW_STOCK_THRESHOLD` → `LOW_STOCK`.
- `stock_quantity > LOW_STOCK_THRESHOLD` → `IN_STOCK`.
- `PREORDER` is independent of quantity — can be set explicitly for preorder products.
- Default `LOW_STOCK_THRESHOLD = 10` (configurable or documented).

When Admin sets quantity, auto-derive state unless explicitly overridden.
When Admin sets state manually, validate against quantity (reject `IN_STOCK` with quantity=0).

#### Inventory Service Permission Check

Stock mutations must check brand membership for the **parent product**:
- Load product by `productId` (via variant's `product_id`).
- If product has `brand_id`, check `BrandMembershipRepository` for active membership.
- SUPER_ADMIN bypasses guard.
- Return `BRAND_MEMBERSHIP_REQUIRED` for non-members.

#### Inventory API Endpoints

- `PATCH /api/admin/products/:productId/variants/:variantId/stock` — update stock quantity (body: `{ quantity: number }`).
- `PATCH /api/admin/products/:productId/variants/:variantId/inventory-state` — update inventory state (body: `{ state: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "PREORDER" }`).
- `GET /api/products/:productId/variants/:variantId/availability` — customer-safe availability (public, no auth required).

#### Customer-Safe Availability Labels

Map internal inventory state to public labels:
- `IN_STOCK` → "Available"
- `LOW_STOCK` → "Low Stock"
- `OUT_OF_STOCK` → "Unavailable"
- `PREORDER` → "Preorder"

Do NOT expose raw stock quantities or internal state names in customer-facing responses.

#### Audit Event for Stock Changes

Record audit event with:
- actor (role, safe identifier)
- action: `stock.quantity_updated` or `inventory.state_changed`
- entity: `variant`
- entityId: variant ID
- safe details: old quantity, new quantity (or old state, new state)
- timestamp
- request ID

Do NOT log raw provider errors, database errors, or internal implementation details.

### Files Being Modified

#### UPDATE: `src/domain/schema/catalog.ts` — extend product_variants table (if needed)

- Current state: Verify existing columns for stock_quantity, inventory_state.
- What this story adds: `stock_quantity`, `inventory_state`, `stock_version` (if absent).
- What must be preserved: Existing table relationships and variant fields.

#### NEW: `migrations/XXXX_add_inventory_columns.sql` — schema migration (if needed)

- Current state: Does not exist (if columns absent).
- What this story creates: Drizzle migration to add inventory columns.
- Must apply to remote development first.

#### UPDATE: `src/domain/products/types.ts` — add inventory types

- What this story adds: `InventoryState` enum, `InventoryRecord`, `UpdateStockInput`, `UpdateInventoryStateInput`, `AvailabilityResult` types.
- What must be preserved: Existing product, variant, and image types.

#### UPDATE: `src/domain/products/schemas.ts` — add inventory schemas

- What this story adds: Zod and TypeBox schemas for stock/inventory validation.
- What must be preserved: Existing product, variant, and image schemas.

#### NEW: `src/server/services/InventoryService.ts`

- Current state: Does not exist.
- What this story creates: `InventoryService` with inventory use cases.
- Use cases: `updateStockQuantity`, `updateInventoryState`, `getAvailability`, `validateStateTransition`.
- Must reuse: `requireBrandMutationPermission` pattern from `ProductService`.

#### NEW: `src/server/controllers/InventoryController.ts`

- Current state: Does not exist.
- What this story creates: `InventoryController` adapting service results to API envelopes.
- Must follow: Same envelope adaptation pattern as `ProductController` and `VariantController`.

#### NEW: `src/server/routes/inventory.routes.ts`

- Current state: Does not exist.
- What this story creates: Inventory route module with all inventory endpoints.
- Must follow: Same route composition pattern as `variants.routes.ts`.

#### UPDATE: `src/server/repositories/VariantRepository.ts`

- Current state: Has variant CRUD methods.
- What this story adds: `updateStockQuantity`, `updateInventoryState`, `getStockAvailability` methods.
- What must be preserved: Existing method signatures and patterns.

#### UPDATE: `src/server/app.ts`

- Current state: Composes Elysia app with product, variant, and image routes.
- What this story changes: Registers inventory routes alongside existing routes.
- What must be preserved: Existing route composition, middleware, OpenAPI setup.

#### UPDATE: `src/features/admin-products/types.ts`

- Current state: TypeScript types for product, variant, and image DTOs.
- What this story adds: `InventoryState`, `AvailabilityResult`, `UpdateStockInput` types for frontend.
- What must be preserved: Existing type definitions.

#### UPDATE: `src/features/admin-products/api.ts`

- Current state: Typed fetch helpers for product, variant, and image operations.
- What this story adds: Fetch helpers for stock update, state update, availability read.
- What must be preserved: Existing API client patterns.

#### NEW: `src/features/admin-products/components/InventoryAdjuster.tsx`

- Current state: Does not exist.
- What this story creates: Stock quantity input component with validation and feedback.

#### NEW: `src/features/admin-products/components/InventoryStateSelector.tsx`

- Current state: Does not exist.
- What this story creates: Inventory state dropdown/status selector component.

#### NEW: `src/server/services/InventoryService.test.ts`

- Current state: Does not exist.
- What this story creates: Domain/service tests for inventory use cases.

#### NEW: `src/server/routes/inventory.routes.test.ts`

- Current state: Does not exist.
- What this story creates: Route/controller tests for inventory endpoints.

#### NEW: `src/features/admin-products/components/inventory-ui.test.ts`

- Current state: Does not exist.
- What this story creates: UI tests for inventory adjuster and state selector.

### Project Structure Notes

- Expected new files:
  - `src/domain/schema/catalog.ts` (UPDATE — extend product_variants if needed)
  - `migrations/XXXX_add_inventory_columns.sql` (NEW — if columns absent)
  - `src/domain/products/types.ts` (UPDATE — add inventory types)
  - `src/domain/products/schemas.ts` (UPDATE — add inventory schemas)
  - `src/server/services/InventoryService.ts` (NEW)
  - `src/server/services/InventoryService.test.ts` (NEW)
  - `src/server/controllers/InventoryController.ts` (NEW)
  - `src/server/routes/inventory.routes.ts` (NEW)
  - `src/server/routes/inventory.routes.test.ts` (NEW)
  - `src/server/repositories/VariantRepository.ts` (UPDATE — add stock methods)
  - `src/features/admin-products/types.ts` (UPDATE — add inventory types)
  - `src/features/admin-products/api.ts` (UPDATE — add inventory fetch helpers)
  - `src/features/admin-products/components/InventoryAdjuster.tsx` (NEW)
  - `src/features/admin-products/components/InventoryStateSelector.tsx` (NEW)
  - `src/features/admin-products/components/inventory-ui.test.ts` (NEW)
  - `src/server/app.ts` (UPDATE — register inventory routes)
- Do not modify:
  - `src/server/repositories/ProductRepository.ts`
  - `src/server/services/ProductService.ts`
  - `src/server/services/ImageService.ts`
  - `src/server/routes/products.routes.ts`
  - `src/server/routes/variants.routes.ts`
  - `src/server/routes/images.routes.ts`
  - `src/adapter/infrastructure/InventoryDurableObject.ts` (scaffold only — do not modify until Epic 5)
  - `src/features/admin-products/components/ProductEditor.tsx`
  - `src/features/admin-products/components/ImageUpload.tsx`
  - `src/features/admin-products/components/ImageList.tsx`
  - `src/domain/brands/**`
  - `src/domain/categories/**`
  - PayMongo/payment docs or flows

### Testing Requirements

- Targeted Vitest for domain/service:

```bash
npx vitest run src/server/services/InventoryService.test.ts
```

- Targeted Vitest for routes/controllers:

```bash
npx vitest run src/server/routes/inventory.routes.test.ts
```

- Targeted Vitest for UI:

```bash
npx vitest run src/features/admin-products/components/inventory-ui.test.ts
```

- Type/Astro check after typed changes:

```bash
npm run check
```

- Manual QA focus for MR. JRW final verdict:
  - Stock update: valid quantity accepted, negative quantity rejected, zero quantity auto-sets OUT_OF_STOCK.
  - Inventory state: all four valid states accepted, invalid state rejected, consistency conflict shown.
  - Availability read: customer-safe labels returned, no raw quantities exposed.
  - Brand membership denial: non-member Admin cannot update stock/state for branded product.
  - Audit event: stock change recorded with actor, old/new values, timestamp, request ID.
  - Keyboard navigation for stock input and state selector.
  - Accessibility: visible labels, aria labels on status badges, error text descriptions.

### Latest Technical Information

- No web research required for this story. Use repo-pinned dependencies from `package.json`: Astro `^6.1.9`, React `^19.2.5`, Tailwind CSS `^4.2.4`, Vitest `^4.1.5`, Elysia `1.4.28`, Drizzle ORM `0.45.2`, Zod `4.4.1`.
- Development D1: `jrw-database-development`, id `beabfd98-8611-4d58-8f1b-7a972b8af1ed`.
- Production D1: `jrw-database-production`, id `fd08e264-2046-4648-9164-84f66948533e`.
- Remote-first D1 is project standard. Apply schema changes to remote development first.
- `product_variants` table may need stock_quantity and inventory_state columns — verify existing schema first.
- `InventoryDurableObject` is scaffolded only — do not modify until Epic 5 checkout reservation.
- NFR16: Inventory reservation/validation must prevent overselling in concurrent checkout test with 100+ simultaneous attempts — this story structures data for that future requirement but does not implement it.

### References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.6)
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR28, FR30, FR47)
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.md` (Variant Matrix UX-DR13, Inventory Adjuster UX-DR14, Feedback Patterns UX-DR20, Form Patterns UX-DR22, Status Labels UX-DR26, Responsive Admin UX-DR29, Accessibility UX-DR30)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (Project Structure, API Layering, Data Architecture, Component Boundaries, Inventory Concurrency)
- Project context: `_bmad-output/project-context.md` (Architecture And DDD, API Layering, Validation Rules, Data/D1/Migrations, Cloudflare Runtime Rules, Ecommerce Domain Rules, UI And Design Rules, Testing And Quality)
- Design system: `docs/design-by-google-stitch.md` (Content & Microcopy, Layout & Spacing, Components)
- Previous related stories:
  - `_bmad-output/implementation-artifacts/3-5-upload-and-manage-product-images.md`
  - `_bmad-output/implementation-artifacts/3-4-manage-product-variants-and-prices.md`
  - `_bmad-output/implementation-artifacts/3-3-assign-product-brand-and-categories.md`
  - `_bmad-output/implementation-artifacts/3-2-create-and-edit-product-identity.md`
- Existing shared primitives: `src/components/**`
- Existing styles: `src/styles/global.css`
- Existing schema: `src/domain/schema/catalog.ts` (product_variants table)
- Existing variant service patterns: `src/server/services/VariantService.ts`
- Existing DO scaffold: `src/adapter/infrastructure/InventoryDurableObject.ts` (do not modify)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Implementation Plan

1. Verify `product_variants` schema for existing stock_quantity and inventory_state columns.
2. Create Drizzle migration for missing columns and apply to remote development.
3. Add inventory domain types and schemas (Zod + TypeBox) to `src/domain/products/`.
4. Extend `VariantRepository` with stock/inventory methods.
5. Create `InventoryService` with stock update, state update, availability, and validation use cases with brand membership guards.
6. Create `InventoryController` adapting service results to API envelopes.
7. Create inventory routes in `src/server/routes/inventory.routes.ts` with admin and public endpoints.
8. Register inventory routes in `src/server/app.ts`.
9. Extend variant responses to include customer-safe availability labels.
10. Create `InventoryAdjuster.tsx` and `InventoryStateSelector.tsx` components.
11. Add typed API fetch helpers for inventory operations.
12. Add targeted domain/service, route, and UI tests.
13. Run `npm run check` and document any blockers.

### Debug Log References

- `npx vitest run`
- `npm run check`

### Completion Notes List

- [To be filled by dev agent]

### File List

- [To be filled by dev agent]

## Change Log

- 2026-05-21: Story 3.6 context engine created for stock quantity and inventory state management API, brand membership enforcement, customer-safe availability output, audit event recording, and targeted tests.
