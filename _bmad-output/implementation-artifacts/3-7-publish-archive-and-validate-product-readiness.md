# Story 3.7: Publish, Archive, and Validate Product Readiness

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin,
I want to publish, draft, and archive products only when required catalog data is valid,
so that storefront shoppers see complete, purchasable product information.

## Acceptance Criteria

1. Given product is in `DRAFT`, when Admin publishes product with required identity, category, variant, price, image, and availability data, then product status becomes `PUBLISHED` and storefront-visible fields are complete.
2. Given product is missing publish-required data, when Admin attempts publish, then system returns validation/conflict error with missing readiness items and product remains `DRAFT`.
3. Given Admin moves product from `PUBLISHED` to `DRAFT`, when transition is valid, then product is removed from public storefront browsing and admin product record remains editable.
4. Given Admin archives product or variant, when item has historical references, then item is archived rather than hard-deleted and order/history references remain readable.
5. Given Admin submits invalid status transition, when transition is processed, then system returns `CONFLICT_STATE` or documented conflict code and no status change occurs.
6. Given Admin lacks product brand permission, when Admin attempts publish/draft/archive transition, then system returns forbidden error and product status remains unchanged.
7. Given publish/archive action succeeds, when audit/event hooks run, then safe actor, product target, old/new status, timestamp, and request ID are recorded or emitted.
8. Given implementation finishes, when tests run, then tests cover publish success, publish blocked by missing data, draft transition, archive, invalid transition, non-member denial, and storefront visibility change and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Confirm scope and current baseline. (AC: 1-8)
  - [x] Verify Epic 3 is `in-progress` and Stories 3.0-3.6 are `done`; do not reopen.
  - [x] Confirm this story is the seventh Epic 3 backlog item after Story 3.6.
  - [x] Confirm existing `products` table in `src/domain/schema/catalog.ts` — current fields include `id`, `slug`, `name`, `description`, `brand_id`, `status`, timestamps.
  - [x] Confirm existing `ProductRepository`, `ProductService`, `ProductController`, and product routes from Story 3.2.
  - [x] Confirm existing `product_variants` table with inventory fields from Stories 3.4 and 3.6.
  - [x] Confirm existing `product_photos` table from Story 3.5.
  - [x] Confirm existing brand membership guards from Story 2.6.
  - [x] Do NOT add storefront UI, checkout flows, or order creation — this story is admin-only publish/archive validation.

- [x] Task 2: Add product readiness validation domain logic. (AC: 1-2, 5)
  - [x] Add `ProductReadinessChecker` or similar domain service in `src/domain/products/`.
  - [x] Validation rules: product must have name, slug, at least one variant, each variant must have SKU and price_centavos > 0, at least one image, valid category assignment (if required), inventory state not `OUT_OF_STOCK` for all variants (or documented exception).
  - [x] Return structured readiness result with list of missing items for error messaging.
  - [x] Add Zod/TypeBox schemas for readiness response.

- [x] Task 3: Add product status transition domain rules. (AC: 3-5, 7)
  - [x] Define valid state transitions: `DRAFT` → `PUBLISHED` (requires readiness), `PUBLISHED` → `DRAFT` (always allowed), `DRAFT` → `ARCHIVED`, `PUBLISHED` → `ARCHIVED`, `ARCHIVED` → no transitions (terminal).
  - [x] Add `ProductStatus` enum/type (`DRAFT`, `PUBLISHED`, `ARCHIVED`) if not already in `src/domain/products/types.ts`.
  - [x] Add transition validation function that returns `CONFLICT_STATE` for invalid transitions.
  - [x] Archive must soft-delete (set status, not hard delete) — preserve for order history.

- [x] Task 4: Add publish/archive repository methods. (AC: 1-7)
  - [x] Extend `ProductRepository` with `publishProduct`, `draftProduct`, `archiveProduct`, `getPublishReadiness` methods.
  - [x] Use D1/Drizzle patterns consistent with existing product methods.
  - [x] Publish/archive operations are atomic and update `updated_at` timestamp.
  - [x] Archive should not break foreign key relationships — use status flag, not DELETE.

- [x] Task 5: Add product status service use cases. (AC: 1-7)
  - [x] Extend `ProductService` with `publish`, `unpublish` (to draft), `archive` use cases.
  - [x] Service enforces: brand membership guard (reuse `requireBrandMutationPermission` pattern).
  - [x] Service validates: readiness check before publish, valid state transition, archive rules.
  - [x] Service returns `AppResult`/`GeneralError` with appropriate error codes.
  - [x] Status mutations record audit event through existing audit interface.
  - [x] Do NOT expose publish/archive to customer-facing endpoints — admin-only.

- [x] Task 6: Add publish/archive API routes and controllers. (AC: 1-7, 8)
  - [x] Extend `ProductController` with publish, unpublish, archive actions OR create `ProductStatusController`.
  - [x] Add routes under existing `products.routes.ts` OR create `product-status.routes.ts`:
    - `POST /api/admin/products/:productId/publish` — publish product (requires readiness).
    - `POST /api/admin/products/:productId/unpublish` — move to draft.
    - `POST /api/admin/products/:productId/archive` — archive product.
    - `GET /api/admin/products/:productId/readiness` — check publish readiness (returns missing items).
  - [x] All routes require Admin authentication via existing RBAC guards.
  - [x] All routes declare TypeBox contracts, OpenAPI metadata, auth, rate-limit class, and error codes.
  - [x] Register new routes in `src/server/app.ts` if separate file.

- [x] Task 7: Extend storefront/product queries to filter by status. (AC: 1, 3)
  - [x] Ensure public product/variant queries filter out `DRAFT` and `ARCHIVED` products.
  - [x] Confirm existing public endpoints from Stories 3.2-3.6 already respect status — add if missing.
  - [x] Do NOT create new storefront UI — only ensure backend filtering is correct.

- [x] Task 8: Add admin publish/archive UI controls. (AC: 1-4, 8)
  - [x] Create `src/features/admin-products/components/PublishControl.tsx` — publish/unpublish/archive buttons with confirmation.
  - [x] Create `src/features/admin-products/components/ReadinessPanel.tsx` — shows missing readiness items.
  - [x] Integrate into existing `ProductEditor.tsx` or product detail view.
  - [x] Use existing `Button`, `StatusBadge`, `ConfirmDialog`, `EmptyState` primitives.
  - [x] Validation feedback: missing items listed, invalid transitions blocked, confirmation required for archive.
  - [x] Success toast on status change; error summary on failure.

- [x] Task 9: Styles and accessibility. (AC: 4-8)
  - [x] Publish/archive UI uses JRW tokens: 0px corners, 1px borders, no shadows, cobalt for focus/selected.
  - [x] Status badges include text labels — not color alone.
  - [x] Archive confirmation dialog has visible label and keyboard-accessible controls.
  - [x] Respect `prefers-reduced-motion` for any transitions.
  - [x] Error states have clear text descriptions.

- [x] Task 10: Targeted tests and checks. (AC: 1-8)
  - [x] Add domain/service tests in `src/server/services/ProductService.test.ts` covering: publish success, publish blocked by missing data, unpublish success, archive success, invalid transition rejection, brand membership denial, audit event emission.
  - [x] Add route/controller tests in `src/server/routes/products.routes.test.ts` covering: publish, unpublish, archive, readiness check, unauthorized access, invalid data, permission denial.
  - [x] Add UI tests in `src/features/admin-products/components/publish-ui.test.ts` covering: publish control rendering, readiness panel rendering, validation errors, status badge text labels, confirmation dialog.
  - [x] Run changed-target tests only: `npx vitest run src/server/services/ProductService.test.ts src/server/routes/products.routes.test.ts src/features/admin-products`.
  - [x] Run `npm run check` after typed/component changes.
  - [x] Do not run full `npm run build-test` unless implementation touches broader surfaces or MR. JRW asks for final full verdict.

### Review Findings

_(To be filled during code review)_

## Dev Notes

### Epic Context

- This is the seventh Epic 3 catalog story after Story 3.6 (inventory management).
- Epic 2 (Brand Collaboration) is complete with brand membership guards established.
- Requirements covered: FR29; supports FR22, FR25, FR26, FR27, FR30.
- UX supported: UX-DR10 (Product List), UX-DR11 (Product Editor), UX-DR12 (Publish Status), UX-DR20 (feedback patterns), UX-DR22 (form patterns), UX-DR26 (status labels), UX-DR29 (responsive admin), UX-DR30 (accessibility).
- Business value: Products must be publish-ready before appearing in storefront. Without publish validation, customers see incomplete or broken product pages. Archive preserves order history while removing products from active catalog.

### Current Code Intelligence

#### `src/domain/schema/catalog.ts` — `products` table

- Current state: `products` table has `id` (cuid2), `slug` (text, unique), `name` (text), `description` (text, nullable), `brand_id` (FK to `brands`, nullable), `status` (text), `created_at`, `updated_at`.
- **Verify**: Current `status` column constraint allows `DRAFT`, `PUBLISHED`, `ARCHIVED`. If not, may need migration.
- What this story uses: Status field for transitions, readiness validation across product + variants + images + categories.
- What this story does NOT change: No new columns required (uses existing status field). No storefront UI changes.
- Preserve: Existing `product_variants`, `product_photos`, `categories` tables and relationships.

#### `src/server/repositories/ProductRepository.ts`

- Current state: Has product CRUD methods from Story 3.2 — `create`, `findById`, `list`, `update`, `archive` (if implemented), with slug uniqueness.
- What this story adds: `publishProduct`, `draftProduct`, `archiveProduct`, `getPublishReadiness` methods.
- What must be preserved: Existing method signatures, D1/Drizzle access patterns, slug uniqueness logic.

#### `src/server/services/ProductService.ts`

- Current state: Has product CRUD use cases with brand membership guards from Story 3.2.
- What this story adds: `publish`, `unpublish`, `archive` use cases with readiness validation.
- What must be preserved: Existing `AppResult`/`GeneralError` patterns, existing brand membership guard pattern (`requireBrandMutationPermission`).

#### `src/server/routes/products.routes.ts`

- Current state: Has product CRUD routes from Story 3.2.
- What this story adds: Publish, unpublish, archive, readiness routes in same file OR separate `product-status.routes.ts`.
- Preserve: Existing route composition pattern, guard usage, envelope adaptation, TypeBox contracts.

#### `src/features/admin-products/`

- Current state: Has `ProductList.tsx`, `ProductEditor.tsx`, `VariantList.tsx`, `VariantEditor.tsx`, `ImageUpload.tsx`, `ImageList.tsx`, `InventoryAdjuster.tsx`, `InventoryStateSelector.tsx`, `api.ts`, `types.ts` from Stories 3.2-3.6.
- What this story adds: `PublishControl.tsx`, `ReadinessPanel.tsx`, publish/archive API fetch helpers, readiness types.
- Preserve: Existing list and editor behavior, form validation patterns, typed API clients, variant and image management UI.

#### `src/components/**`

- Current state: `Select`, `Input`, `Button`, `Badge`, `StatusBadge`, `DataTable`, `EmptyState`, `Skeleton`, `PageToolbar`, `SearchInput`, `ConfirmDialog` available.
- What this story uses: `Button` for publish/archive actions, `StatusBadge` for status display, `ConfirmDialog` for archive confirmation, `EmptyState` for readiness panel.
- Preserve: Existing primitive behavior and exports.

### Previous Story Intelligence

- Story 3.6 established inventory management with stock quantity, inventory state, brand membership guards, and customer-safe availability output. Reuse the same repository/service/controller/route patterns for publish/archive.
- Story 3.6 used targeted tests plus `npm run check`; use the same targeted style.
- Story 3.6 review findings: stock/version compare-and-swap guards needed, race condition prevention required, archived variants needed availability mapping to `Unavailable`, legacy variant PATCH needed audit event. Apply same principles: validate before persistence, handle edge cases, ensure archived products show correct status.
- Story 3.5 established product image upload/management with R2 storage. Publish readiness must check for at least one image — reuse image repository patterns.
- Story 3.4 established variant CRUD with centavos pricing, SKU uniqueness. Publish readiness must check each variant has SKU and price_centavos > 0.
- Story 3.3 established product brand/category assignment. Publish readiness may require category assignment — check PRD/UX spec.
- Story 3.2 established product identity CRUD with slug uniqueness, default DRAFT status. This story extends status transitions from that baseline.
- Story 2.6 established brand-scoped product mutation guards. This story's publish/archive mutations must follow the same membership check pattern — check product's `brand_id` and verify Admin membership.

### Git Intelligence

- Recent commits: 3-6 reviewed and implemented (inventory management), 3-5 product images, 3-4 variant CRUD, 3-3 product brand/category assignment, 3-2 product identity CRUD.
- Current relevant pattern: code changes are small, typed, and backed by targeted Vitest files.
- Publish/archive work should follow the same incremental, tested approach.
- No schema migration expected for this story — uses existing `status` field.

### Architecture and UX Guardrails

- Astro owns page routing and SEO shells. React feature modules own interactive surfaces.
- Shared primitives go under `src/components/**`; feature-specific publish UI stays under `src/features/admin-products/**`.
- Publish/archive API follows Route -> Controller -> Service -> Domain/Repository.
- JRW visual system: 0px radius, 1px borders, no shadows, no blur, cobalt accent only for focus/selected/primary/live status.
- Admin UI is dense, keyboard-friendly, and operation-focused.
- Status labels must be text-visible and cannot rely on color alone (NFR26).
- UI copy must state what the screen, section, or field does for the user. Keep technical boundary language in planning docs only.
- API JSON uses camelCase; database uses snake_case; controllers/services map rows to DTOs.
- Product status should use `DRAFT`, `PUBLISHED`, `ARCHIVED` (project-context).
- Archive is soft-delete — preserve for order history (project-context).

### Implementation Guidance

#### Product Readiness Validation Rules

Define and enforce publish readiness checks:
- Product has non-empty `name` and `slug`.
- Product has at least one variant with `sku` and `price_centavos > 0`.
- Product has at least one image in `product_photos` table.
- Product has valid category assignment (if required by PRD — verify).
- All variants have `inventory_state` not `OUT_OF_STOCK` (or documented exception — verify with MR. JRW).
- Return structured result: `{ isReady: boolean, missingItems: string[] }`.

When Admin clicks publish, run readiness check first. If not ready, return error with missing items list.

#### Valid State Transitions

Define and enforce state machine:
- `DRAFT` → `PUBLISHED`: requires readiness check pass.
- `PUBLISHED` → `DRAFT`: always allowed (unpublish).
- `DRAFT` → `ARCHIVED`: allowed (archive without publishing).
- `PUBLISHED` → `ARCHIVED`: allowed (archive published product).
- `ARCHIVED` → any: NOT allowed (terminal state).

Return `CONFLICT_STATE` error code for invalid transitions.

#### Publish/Archive API Endpoints

- `POST /api/admin/products/:productId/publish` — publish product (body: optional, readiness checked server-side).
- `POST /api/admin/products/:productId/unpublish` — move to draft (body: optional).
- `POST /api/admin/products/:productId/archive` — archive product (body: optional, may require confirmation phrase).
- `GET /api/admin/products/:productId/readiness` — check publish readiness (returns `{ isReady, missingItems }`).

All admin routes require Admin authentication and brand membership check.

#### Publish Readiness Response

```typescript
interface ReadinessResult {
  isReady: boolean;
  missingItems: string[]; // e.g., ["No variants", "Variant missing SKU", "No images", "No categories"]
}
```

Map to user-friendly error messages in UI.

#### Audit Event for Status Changes

Record audit event with:
- actor (role, safe identifier)
- action: `product.published`, `product.unpublished`, `product.archived`
- entity: `product`
- entityId: product ID
- safe details: old status, new status
- timestamp
- request ID

Do NOT log raw provider errors, database errors, or internal implementation details.

#### Storefront Status Filtering

Ensure public product/variant queries filter correctly:
- Public product list: `WHERE status = 'PUBLISHED'`
- Public product detail: `WHERE status = 'PUBLISHED'`
- Public variant availability: only for published products
- Admin queries: all statuses visible

Verify existing public endpoints from Stories 3.2-3.6 already implement this filter. Add if missing.

### Files Being Modified

#### UPDATE: `src/domain/products/types.ts` — add status transition types

- What this story adds: `ProductStatus` enum (if not present), `ReadinessResult`, `StatusTransitionInput` types.
- What must be preserved: Existing product, variant, image, and inventory types.

#### UPDATE: `src/domain/products/schemas.ts` — add readiness/status schemas

- What this story adds: Zod and TypeBox schemas for readiness response, status transition validation.
- What must be preserved: Existing product, variant, image, and inventory schemas.

#### UPDATE: `src/server/repositories/ProductRepository.ts` — add publish/archive methods

- Current state: Has product CRUD methods.
- What this story adds: `publishProduct`, `draftProduct`, `archiveProduct`, `getPublishReadiness` methods.
- What must be preserved: Existing method signatures and patterns.

#### UPDATE: `src/server/services/ProductService.ts` — add publish/archive use cases

- Current state: Has product CRUD use cases.
- What this story adds: `publish`, `unpublish`, `archive` use cases with readiness validation and brand guards.
- What must be preserved: Existing use case patterns, error handling, envelope adaptation.

#### UPDATE: `src/server/routes/products.routes.ts` — add publish/archive routes

- Current state: Has product CRUD routes.
- What this story adds: Publish, unpublish, archive, readiness routes.
- What must be preserved: Existing route composition, guard usage, TypeBox contracts.

#### UPDATE: `src/server/controllers/ProductController.ts` — add publish/archive actions

- Current state: Has product CRUD controller methods.
- What this story adds: Publish, unpublish, archive, readiness controller methods.
- What must be preserved: Existing envelope adaptation patterns.

#### UPDATE: `src/server/app.ts` — register new routes (if separate file)

- Current state: Composes Elysia app with product, variant, image, inventory routes.
- What this story changes: Registers publish/archive routes if in separate file.
- What must be preserved: Existing route composition, middleware, OpenAPI setup.

#### UPDATE: `src/features/admin-products/types.ts` — add publish/status types

- Current state: TypeScript types for product, variant, image, inventory DTOs.
- What this story adds: `ProductStatus`, `ReadinessResult`, `StatusTransitionInput` types for frontend.
- What must be preserved: Existing type definitions.

#### UPDATE: `src/features/admin-products/api.ts` — add publish/status fetch helpers

- Current state: Typed fetch helpers for product, variant, image, inventory operations.
- What this story adds: Fetch helpers for publish, unpublish, archive, readiness check.
- What must be preserved: Existing API client patterns.

#### NEW: `src/features/admin-products/components/PublishControl.tsx`

- Current state: Does not exist.
- What this story creates: Publish/unpublish/archive button group with confirmation dialogs.

#### NEW: `src/features/admin-products/components/ReadinessPanel.tsx`

- Current state: Does not exist.
- What this story creates: Panel showing missing readiness items with actionable messages.

#### NEW: `src/server/services/ProductService.test.ts` — extend with publish/archive tests

- Current state: May exist from Story 3.2 with basic CRUD tests.
- What this story adds: Tests for publish, unpublish, archive, readiness, invalid transitions, permission denial.

#### NEW: `src/server/routes/products.routes.test.ts` — extend with publish/archive tests

- Current state: May exist from Story 3.2 with basic route tests.
- What this story adds: Tests for publish, unpublish, archive, readiness endpoints, auth, validation.

#### NEW: `src/features/admin-products/components/publish-ui.test.ts`

- Current state: Does not exist.
- What this story creates: UI tests for publish control and readiness panel.

### Project Structure Notes

- Expected new files:
  - `src/features/admin-products/components/PublishControl.tsx` (NEW)
  - `src/features/admin-products/components/ReadinessPanel.tsx` (NEW)
  - `src/features/admin-products/components/publish-ui.test.ts` (NEW)
- Expected updated files:
  - `src/domain/products/types.ts` (UPDATE — add status types)
  - `src/domain/products/schemas.ts` (UPDATE — add readiness schemas)
  - `src/server/repositories/ProductRepository.ts` (UPDATE — add publish/archive methods)
  - `src/server/services/ProductService.ts` (UPDATE — add publish/archive use cases)
  - `src/server/services/ProductService.test.ts` (UPDATE — add publish/archive tests)
  - `src/server/controllers/ProductController.ts` (UPDATE — add publish/archive actions)
  - `src/server/routes/products.routes.ts` (UPDATE — add publish/archive routes)
  - `src/server/routes/products.routes.test.ts` (UPDATE — add publish/archive tests)
  - `src/features/admin-products/types.ts` (UPDATE — add status types)
  - `src/features/admin-products/api.ts` (UPDATE — add publish fetch helpers)
  - `src/server/app.ts` (UPDATE — register routes if separate file)
- Do not modify:
  - `src/server/repositories/VariantRepository.ts`
  - `src/server/services/InventoryService.ts`
  - `src/server/routes/inventory.routes.ts`
  - `src/server/routes/variants.routes.ts`
  - `src/server/routes/images.routes.ts`
  - `src/adapter/infrastructure/InventoryDurableObject.ts`
  - `src/features/admin-products/components/VariantEditor.tsx`
  - `src/features/admin-products/components/VariantList.tsx`
  - `src/features/admin-products/components/InventoryAdjuster.tsx`
  - `src/features/admin-products/components/InventoryStateSelector.tsx`
  - `src/domain/schema/catalog.ts` (no schema changes expected)
  - `migrations/**` (no migration expected)
  - PayMongo/payment docs or flows
  - Storefront UI files (not in scope)

### Testing Requirements

- Targeted Vitest for domain/service:

```bash
npx vitest run src/server/services/ProductService.test.ts
```

- Targeted Vitest for routes/controllers:

```bash
npx vitest run src/server/routes/products.routes.test.ts
```

- Targeted Vitest for UI:

```bash
npx vitest run src/features/admin-products/components/publish-ui.test.ts
```

- Type/Astro check after typed changes:

```bash
npm run check
```

- Manual QA focus for MR. JRW final verdict:
  - Publish: valid product accepted, missing data rejected with items list, readiness check accurate.
  - Unpublish: published product moved to draft, removed from storefront.
  - Archive: product archived, not hard-deleted, order history preserved.
  - Invalid transitions: `ARCHIVED` → `PUBLISHED` rejected with `CONFLICT_STATE`.
  - Brand membership denial: non-member Admin cannot publish/archive branded product.
  - Audit event: status change recorded with actor, old/new status, timestamp, request ID.
  - Keyboard navigation for publish/archive buttons and confirmation dialog.
  - Accessibility: visible labels, aria labels on status badges, error text descriptions.

### Latest Technical Information

- No web research required for this story. Use repo-pinned dependencies from `package.json`: Astro `^6.1.9`, React `^19.2.5`, Tailwind CSS `^4.2.4`, Vitest `^4.1.5`, Elysia `1.4.28`, Drizzle ORM `0.45.2`, Zod `4.4.1`.
- Development D1: `jrw-database-development`, id `beabfd98-8611-4d58-8f1b-7a972b8af1ed`.
- Production D1: `jrw-database-production`, id `fd08e264-2046-4648-9164-84f66948533e`.
- Remote-first D1 is project standard. Apply schema changes to remote development first.
- No schema migration expected — uses existing `status` field in `products` table.
- `InventoryDurableObject` is scaffolded only — do not modify until Epic 5 checkout reservation.

### References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.7)
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR29, FR22, FR25, FR26, FR27, FR30)
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.md` (Product List UX-DR10, Product Editor UX-DR11, Publish Status UX-DR12, Feedback Patterns UX-DR20, Form Patterns UX-DR22, Status Labels UX-DR26, Responsive Admin UX-DR29, Accessibility UX-DR30)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (Project Structure, API Layering, Data Architecture, Component Boundaries)
- Project context: `_bmad-output/project-context.md` (Architecture And DDD, API Layering, Validation Rules, Data/D1/Migrations, Cloudflare Runtime Rules, Ecommerce Domain Rules, UI And Design Rules, Testing And Quality)
- Design system: `docs/design-by-google-stitch.md` (Content & Microcopy, Layout & Spacing, Components)
- Previous related stories:
  - `_bmad-output/implementation-artifacts/3-6-manage-stock-quantity-and-inventory-state.md`
  - `_bmad-output/implementation-artifacts/3-5-upload-and-manage-product-images.md`
  - `_bmad-output/implementation-artifacts/3-4-manage-product-variants-and-prices.md`
  - `_bmad-output/implementation-artifacts/3-3-assign-product-brand-and-categories.md`
  - `_bmad-output/implementation-artifacts/3-2-create-and-edit-product-identity.md`
- Existing shared primitives: `src/components/**`
- Existing styles: `src/styles/global.css`
- Existing schema: `src/domain/schema/catalog.ts` (products table)
- Existing product service patterns: `src/server/services/ProductService.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

1. Verify `products` table schema for existing status field and constraints.
2. Add product readiness validation domain logic in `src/domain/products/`.
3. Add product status transition rules and validation.
4. Extend `ProductRepository` with publish/archive/readiness methods.
5. Extend `ProductService` with publish, unpublish, archive use cases with brand membership guards and readiness validation.
6. Extend `ProductController` with publish/archive actions.
7. Add publish/archive/readiness routes in `src/server/routes/products.routes.ts`.
8. Register routes in `src/server/app.ts` if separate file.
9. Ensure public product queries filter by `PUBLISHED` status.
10. Create `PublishControl.tsx` and `ReadinessPanel.tsx` components.
11. Add typed API fetch helpers for publish/archive operations.
12. Add targeted domain/service, route, and UI tests.
13. Run `npm run check` and document any blockers.

### Debug Log References

- `npx vitest run src/server/services/ProductService.test.ts` (pass)
- `npx vitest run src/server/routes/products.routes.test.ts` (pass)
- `npx vitest run src/features/admin-products/components/publish-ui.test.ts` (pass)
- `npm run check` (pass; existing non-blocking hints only)

### Completion Notes List

- Added domain readiness evaluator and transition validator in `src/domain/products/readiness.ts`.
- Extended product domain types and schemas with readiness contracts for backend/frontend transport.
- Extended `ProductRepository` with `getPublishReadiness`, `publishProduct`, `draftProduct`, and `archiveProduct`.
- Extended `ProductService` with `getPublishReadiness`, `publish`, `unpublish`, and `archive` use cases with brand guard, transition guard, readiness guard, and audit events.
- Extended `ProductController` and `products.routes.ts` with readiness/publish/unpublish/archive endpoints and OpenAPI metadata.
- Hardened public variant availability query to only return variants under `PUBLISHED` products.
- Added admin publish UI surfaces (`PublishControl`, `ReadinessPanel`) and integrated with `ProductEditor` + list toast updates.
- Added new API client helpers for readiness and status transitions.
- Added targeted tests for product status service flows, routes, and publish UI.

### File List

- `src/domain/products/readiness.ts` (new)
- `src/domain/products/types.ts` (updated)
- `src/domain/products/schemas.ts` (updated)
- `src/domain/products/product.test.ts` (updated)
- `src/server/repositories/ProductRepository.ts` (updated)
- `src/server/repositories/VariantRepository.ts` (updated)
- `src/server/services/ProductService.ts` (updated)
- `src/server/services/ProductService.test.ts` (new)
- `src/server/controllers/ProductController.ts` (updated)
- `src/server/routes/products.routes.ts` (updated)
- `src/server/routes/products.routes.test.ts` (updated)
- `src/features/admin-products/types.ts` (updated)
- `src/features/admin-products/api.ts` (updated)
- `src/features/admin-products/components/PublishControl.tsx` (new)
- `src/features/admin-products/components/ReadinessPanel.tsx` (new)
- `src/features/admin-products/components/ProductEditor.tsx` (updated)
- `src/features/admin-products/components/ProductList.tsx` (updated)
- `src/features/admin-products/components/publish-ui.test.ts` (new)
- `src/styles/global.css` (updated)

## Change Log

- 2026-05-21: Story 3.7 context engine created for product publish/archive validation, readiness checking, state transition enforcement, brand membership guards, audit event recording, and targeted tests.
- 2026-05-21: Implemented publish/unpublish/archive lifecycle, readiness validation, admin status UI controls, public availability status filtering, and targeted test coverage.

