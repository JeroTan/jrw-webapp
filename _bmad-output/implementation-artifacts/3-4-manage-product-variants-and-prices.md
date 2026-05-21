# Story 3.4: Manage Product Variants and Prices

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin,
I want to create, update, archive, and price product variants,
so that customers can choose purchasable options with accurate JRW pricing.

## Acceptance Criteria

1. Given Admin edits product variants, when Admin adds valid variant option/SKU data, then variant is created under product and response uses standard envelope.
2. Given Admin updates variant option, SKU, price, or display metadata, when data is valid, then variant is updated and price is stored as integer centavos, not float.
3. Given Admin archives a variant, when variant has historical order references or stock history, then variant is archived rather than hard-deleted and historical references remain readable.
4. Given Admin submits duplicate option combination, invalid price, missing SKU where required, or invalid metadata, when validation runs, then system returns validation/conflict error and no invalid variant state persists.
5. Given Admin lacks product brand permission, when Admin attempts variant mutation, then brand-scoped guard denies request and no variant state changes.
6. Given product has variants, when product detail/list response includes variant summary, then response exposes customer-safe price/availability data only and internal inventory/provider details are hidden.
7. Given route contract is complete, when API docs are generated, then schemas document variant fields, centavos money format, auth metadata, error codes, and rate-limit class.
8. Given implementation finishes, when tests run, then tests cover create, update price, archive, duplicate option conflict, invalid price, non-member denial, and centavos storage and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Task 1: Confirm scope and current baseline. (AC: 1-8)
  - [ ] Verify Epic 2 is `done` and Stories 3.1, 3.2, 3.3 are `done`; do not reopen.
  - [ ] Confirm this story is the fourth Epic 3 backlog item after Story 3.3.
  - [ ] Confirm existing `product_variants` table in `src/domain/schema/catalog.ts` — current fields include `id`, `name`, `stock`, `price` (real), `sku`, `is_preorder`, `expected_release`, `stock_lock_version`, `variation_chain` (JSON), `image_reference_id`, `product_id`.
  - [ ] Confirm existing `ProductRepository`, `ProductService`, `ProductController`, and product routes from Stories 3.2 and 3.3.
  - [ ] Confirm existing brand membership guards from Story 2.6 and brand endpoints from Epic 2.
  - [ ] Do NOT add images, stock management, publish/archive transitions, or product editor UI variant matrix sections in this story.

- [ ] Task 2: Add variant domain types, schemas, and validation. (AC: 1-4, 7)
  - [ ] Add `ProductVariantRecord` type to `src/domain/products/types.ts`.
  - [ ] Add `CreateProductVariantInput`, `UpdateProductVariantInput`, `ArchiveProductVariantInput` types.
  - [ ] Add Zod schemas for variant create/update/archive in `src/domain/products/schemas.ts`.
  - [ ] Add TypeBox schemas for variant API contracts in `src/domain/products/schemas.ts`.
  - [ ] Enforce: price as integer centavos (not float), SKU uniqueness, valid variation_chain structure.
  - [ ] Add domain validation: duplicate option combination detection per product.

- [ ] Task 3: Add variant repository methods. (AC: 1-4, 6)
  - [ ] Create `VariantRepository` interface and `DrizzleVariantRepository` in `src/server/repositories/VariantRepository.ts`.
  - [ ] Methods: `create`, `findById`, `findBySku`, `listByProductId`, `update`, `archive`, `findDuplicateOptionCombination`.
  - [ ] Use D1/Drizzle patterns consistent with `ProductRepository`.
  - [ ] Price stored as integer centavos in DB (migrate `price` column from `real` to `integer` if needed, or map float→centavos at repository boundary).

- [ ] Task 4: Add variant service use cases. (AC: 1-5)
  - [ ] Create `VariantService` in `src/server/services/VariantService.ts`.
  - [ ] Use cases: `createVariant`, `updateVariant`, `archiveVariant`, `listProductVariants`, `getVariant`.
  - [ ] Service enforces: brand membership guard (reuse `requireBrandMutationPermission` pattern from `ProductService`).
  - [ ] Service validates: price centavos format, SKU uniqueness, no duplicate option combinations per product.
  - [ ] Service returns `AppResult`/`GeneralError` with appropriate error codes.
  - [ ] Variant mutations record audit event through existing audit interface.

- [ ] Task 5: Add variant API routes and controllers. (AC: 1-7)
  - [ ] Create `VariantController` in `src/server/controllers/VariantController.ts`.
  - [ ] Create variant routes under `src/server/routes/variants.routes.ts` with endpoints:
    - `GET /api/admin/products/:productId/variants` — list variants for product
    - `POST /api/admin/products/:productId/variants` — create variant
    - `GET /api/admin/products/:productId/variants/:variantId` — get variant detail
    - `PATCH /api/admin/products/:productId/variants/:variantId` — update variant
    - `POST /api/admin/products/:productId/variants/:variantId/archive` — archive variant
  - [ ] All routes require Admin authentication via existing RBAC guards.
  - [ ] All routes declare TypeBox contracts, OpenAPI metadata, auth, rate-limit class, and error codes.
  - [ ] API JSON uses camelCase; database uses snake_case; controller maps rows to DTOs.
  - [ ] Register variant routes in `src/server/app.ts`.

- [ ] Task 6: Extend product detail/list to include variant summary. (AC: 6)
  - [ ] Extend product detail response to include variant count and price range (min/max centavos).
  - [ ] Extend product list response to include variant count and lowest price.
  - [ ] Variant summary exposes customer-safe data only: count, price range, availability flag.
  - [ ] No internal inventory/provider details in variant summary.

- [ ] Task 7: Add admin variant UI (basic list and create/edit form). (AC: 1-4, 7)
  - [ ] Create `src/features/admin-products/components/VariantList.tsx` — table showing variants for a product.
  - [ ] Create `src/features/admin-products/components/VariantEditor.tsx` — form for create/edit variant.
  - [ ] Variant fields: name, SKU, price (centavos input with currency display), variation_chain (option combinations), preorder toggle.
  - [ ] Variant list: shows name, SKU, price, status, actions (edit, archive).
  - [ ] Use existing `Select`, `Input`, `Button`, `Badge`, `DataTable`, `EmptyState` primitives from `src/components/**`.
  - [ ] Form validation with Zod schema; inline errors for invalid variant data.
  - [ ] Success toast on save; error summary at form top on validation failure.

- [ ] Task 8: Styles and accessibility. (AC: 4-8)
  - [ ] Variant UI uses JRW tokens: 0px corners, 1px borders, no shadows, cobalt for focus/selected.
  - [ ] Variant status uses text labels — not color alone.
  - [ ] Form has visible labels, required markers, inline errors, and error summary.
  - [ ] Variant list keyboard accessible.
  - [ ] Respect `prefers-reduced-motion` for any transitions.

- [ ] Task 9: Targeted tests and checks. (AC: 1-8)
  - [ ] Add domain/service tests in `src/server/services/VariantService.test.ts` covering: create success, update price, archive, duplicate option conflict, invalid price, SKU uniqueness, brand membership denial.
  - [ ] Add route/controller tests in `src/server/routes/variants.routes.test.ts` covering: create, update, archive, list, unauthorized access, duplicate conflict.
  - [ ] Add UI tests in `src/features/admin-products/components/variants-ui.test.ts` covering: variant list rendering, create/edit form, validation errors, empty states.
  - [ ] Run changed-target tests only: `npx vitest run src/server/services/VariantService.test.ts src/server/routes/variants.routes.test.ts src/features/admin-products`.
  - [ ] Run `npm run check` after typed/component changes.
  - [ ] Do not run full `npm run build-test` unless implementation touches broader surfaces or MR. JRW asks for final full verdict.

### Review Findings

_(To be filled during code review)_

## Dev Notes

### Epic Context

- This is the fourth Epic 3 catalog story after Story 3.3 (product brand and category assignment).
- Epic 2 (Brand Collaboration) is complete with brand membership guards established.
- Requirements covered: FR25, FR27; supports FR29, FR31.
- UX supported: UX-DR12 (Product Editor sections), UX-DR13 (VariantMatrix), UX-DR20 (feedback patterns), UX-DR22 (form patterns), UX-DR29 (responsive admin), UX-DR30 (accessibility).
- Business value: Products need variant options (size, color, etc.) with accurate pricing so customers can choose purchasable options. Without variants, products are single-SKU only and cannot support real ecommerce catalogs.

### Current Code Intelligence

#### `src/domain/schema/catalog.ts` — `product_variants` table

- Current state: `product_variants` table has `id`, `name`, `stock` (integer), `price` (real — **needs centavos migration**), `sku` (unique), `is_preorder`, `expected_release`, `stock_lock_version`, `variation_chain` (JSON `VariationChain[]`), `image_reference_id` (FK to `product_photos`), `product_id` (FK to `products`).
- What this story uses: All variant fields. **Critical**: `price` column is currently `real` — must be stored as integer centavos per architecture. Either migrate column or map at repository boundary.
- What this story does NOT change: No stock mutations (Story 3.6), no image uploads (Story 3.5), no publish/archive transitions (Story 3.7).
- Preserve: Existing `product_photos`, `products`, `categories` tables. Do not modify schema for stock/inventory yet.

#### `src/server/repositories/ProductRepository.ts`

- Current state: Has `create`, `findById`, `findBySlug`, `list`, `update`, `assignBrand`, `removeBrand`, `assignCategories`, `removeCategory`, `findOrganization` methods.
- What this story does NOT change: Product repository methods remain as-is. Variant repository is separate.
- Preserve: Existing method signatures, D1/Drizzle access patterns.

#### `src/server/services/ProductService.ts`

- Current state: Has `createProduct`, `getProduct`, `listProducts`, `updateProduct`, `assignProductBrand`, `removeProductBrand`, `assignProductCategories`, `removeProductCategory`, `getProductOrganization` use cases.
- What this story does NOT change: Product service methods remain as-is. Variant service is separate.
- Preserve: Existing `AppResult`/`GeneralError` patterns, existing brand membership guard pattern (`requireBrandMutationPermission`).

#### `src/server/routes/products.routes.ts`

- Current state: Has `GET /api/admin/products`, `POST /api/admin/products`, `GET /api/admin/products/:productId`, `PATCH /api/admin/products/:productId`, `GET /api/admin/products/:productId/organization`, `PATCH /api/admin/products/:productId/brand`, `PATCH /api/admin/products/:productId/categories`.
- What this story adds: Variant routes are in **separate** `variants.routes.ts` file, registered in `src/server/app.ts`.
- Preserve: Existing route composition pattern, guard usage, envelope adaptation, TypeBox contracts.

#### `src/features/admin-products/`

- Current state: Has `ProductList.tsx`, `ProductEditor.tsx`, `api.ts`, `types.ts` from Stories 3.2 and 3.3.
- What this story adds: `VariantList.tsx`, `VariantEditor.tsx`, variant API fetch helpers, variant types.
- Preserve: Existing list and editor behavior, form validation patterns, typed API clients.

#### `src/components/**`

- Current state: `Select`, `Input`, `Button`, `Badge`, `StatusBadge`, `DataTable`, `EmptyState`, `Skeleton`, `PageToolbar`, `SearchInput`, `ConfirmDialog` available.
- What this story uses: `DataTable` for variant list, `Input` for variant fields, `Button` for actions, `Badge` for variant status.
- Preserve: Existing primitive behavior and exports.

### Previous Story Intelligence

- Story 3.3 established product brand/category assignment with PATCH endpoints, organization GET endpoint, brand membership guards, and audit hooks. Reuse the same repository/service/controller/route patterns.
- Story 3.3 review findings: Product editor reset user edits when organization data arrived — avoid same pattern by not overwriting user-edited variant fields when data arrives.
- Story 3.3 used targeted tests plus `npm run check`; use the same targeted style.
- Story 3.2 established product identity CRUD with slug uniqueness, default DRAFT status, admin UI. Variant service should follow same error handling and envelope patterns.
- Story 3.2 review findings: slug conflicts should return error (NOT auto-rename). Apply same principle — return conflict errors for duplicate SKUs/option combinations, not auto-fix.
- Story 3.1 established category CRUD with ACTIVE/ARCHIVED status. Variant archive follows same pattern — soft archive, not hard delete.
- Story 2.6 established brand-scoped product mutation guards. This story's variant mutations must follow the same membership check pattern — check product's `brand_id` and verify Admin membership.

### Git Intelligence

- Recent commits: 3-3 reviewed and implemented, 3-2 product identity CRUD, 3-1 category CRUD, 3-0 component system, brand endpoint work.
- Current relevant pattern: code changes are small, typed, and backed by targeted Vitest files.
- Variant work should follow the same incremental, tested approach.
- No migration needed for this story if price centavos mapping is done at repository boundary. If column migration is preferred, coordinate with MR. JRW.

### Architecture and UX Guardrails

- Astro owns page routing and SEO shells. React feature modules own interactive surfaces.
- Shared primitives go under `src/components/**`; feature-specific variant UI stays under `src/features/admin-products/**`.
- Variant API follows Route -> Controller -> Service -> Domain/Repository.
- JRW visual system: 0px radius, 1px borders, no shadows, no blur, cobalt accent only for focus/selected/primary/live status.
- Admin UI is dense, keyboard-friendly, and operation-focused.
- Status labels must be text-visible and cannot rely on color alone.
- UI copy must state what the screen, section, or field does for the user. Keep technical boundary language in planning docs only.
- **Price must be stored as integer centavos** — never float. Architecture: "New money fields use integer centavos."
- API JSON uses camelCase; database uses snake_case; controllers/services map rows to DTOs.
- Variant archive is soft-delete — historical references must remain readable.
- Duplicate option combinations per product must be rejected with conflict error.
- SKU must be unique across all variants.

### Implementation Guidance

#### Price Centavos Strategy

The `product_variants.price` column is currently `real`. Per architecture, money must be integer centavos. Two approaches:

1. **Repository boundary mapping** (preferred for this story): Keep DB column as `real`, but repository always stores/retrieves as integer centavos. Multiply by 100 on write, divide on read. This avoids migration risk.
2. **Column migration**: Change `price` from `real` to `integer` via Drizzle migration. Requires coordination and migration review.

**Recommendation**: Use approach 1 (boundary mapping) for this story. Document the migration need for Story 3.6 (stock/inventory) when broader schema work happens.

#### Variant Service Permission Check

Variant mutations must check brand membership for the **parent product**:
- Load product by `productId`.
- If product has `brand_id`, check `BrandMembershipRepository` for active membership.
- SUPER_ADMIN bypasses guard.
- Return `BRAND_MEMBERSHIP_REQUIRED` for non-members.

#### Variant API Endpoints

- `GET /api/admin/products/:productId/variants` — list all variants for a product (paginated, default 20, max 100).
- `POST /api/admin/products/:productId/variants` — create new variant under product.
- `GET /api/admin/products/:productId/variants/:variantId` — get single variant detail.
- `PATCH /api/admin/products/:productId/variants/:variantId` — update variant fields.
- `POST /api/admin/products/:productId/variants/:variantId/archive` — archive variant (soft delete).

#### Variant Validation Rules

- SKU: required, unique across all variants, max 64 characters.
- Price: required, integer centavos, must be >= 0.
- Name: required, max 255 characters.
- variation_chain: JSON array of `{ name, group }` objects. Must not be empty for variants with options.
- Duplicate option combination: same `variation_chain` values for same product must be rejected.
- Preorder: boolean flag. If true, `expected_release` should be set (warn but don't block).

#### Variant Summary in Product Responses

- Product detail: include `variantCount`, `priceRangeMin` (centavos), `priceRangeMax` (centavos), `hasAvailableVariants` (boolean).
- Product list: include `variantCount`, `lowestPrice` (centavos).
- These are customer-safe fields — no stock quantities, no internal IDs.

### Files Being Modified

#### NEW: `src/domain/products/types.ts` — variant types

- What this story adds: `ProductVariantRecord`, `CreateProductVariantInput`, `UpdateProductVariantInput`, `ArchiveProductVariantInput`, `VariantListResult`, `ProductVariantSummary` types.
- What must be preserved: Existing product types.

#### NEW: `src/domain/products/schemas.ts` — variant schemas

- What this story adds: Zod and TypeBox schemas for variant create/update/archive/validation.
- What must be preserved: Existing product schemas.

#### NEW: `src/server/repositories/VariantRepository.ts`

- Current state: Does not exist.
- What this story creates: `VariantRepository` interface and `DrizzleVariantRepository` implementation.
- Methods: `create`, `findById`, `findBySku`, `listByProductId`, `update`, `archive`, `findDuplicateOptionCombination`, `getVariantSummaryForProduct`.

#### NEW: `src/server/services/VariantService.ts`

- Current state: Does not exist.
- What this story creates: `VariantService` with variant use cases.
- Use cases: `createVariant`, `updateVariant`, `archiveVariant`, `listProductVariants`, `getVariant`.
- Must reuse: `requireBrandMutationPermission` pattern from `ProductService`.

#### NEW: `src/server/controllers/VariantController.ts`

- Current state: Does not exist.
- What this story creates: `VariantController` adapting service results to API envelopes.
- Must follow: Same envelope adaptation pattern as `ProductController`.

#### NEW: `src/server/routes/variants.routes.ts`

- Current state: Does not exist.
- What this story creates: Variant route module with all variant endpoints.
- Must follow: Same route composition pattern as `products.routes.ts`.

#### UPDATE: `src/server/app.ts`

- Current state: Composes Elysia app with product routes.
- What this story changes: Registers variant routes alongside product routes.
- What must be preserved: Existing route composition, middleware, OpenAPI setup.

#### UPDATE: `src/server/routes/products.routes.ts`

- Current state: Product CRUD and organization routes.
- What this story changes: None — variant routes are separate. Product list/detail responses may include variant summary (optional, coordinated through service layer).
- What must be preserved: All existing route contracts and behavior.

#### UPDATE: `src/features/admin-products/types.ts`

- Current state: TypeScript types for product DTOs, brand/category assignment.
- What this story adds: `ProductVariantRecord`, `CreateVariantInput`, `UpdateVariantInput`, `VariantListResult` types for frontend.
- What must be preserved: Existing type definitions.

#### UPDATE: `src/features/admin-products/api.ts`

- Current state: Typed fetch helpers for product CRUD and organization.
- What this story adds: Fetch helpers for variant CRUD and list operations.
- What must be preserved: Existing API client patterns.

#### NEW: `src/features/admin-products/components/VariantList.tsx`

- Current state: Does not exist.
- What this story creates: Table showing variants for a product with name, SKU, price, status, actions.

#### NEW: `src/features/admin-products/components/VariantEditor.tsx`

- Current state: Does not exist.
- What this story creates: Form for create/edit variant with name, SKU, price, variation_chain, preorder toggle.

#### NEW: `src/server/services/VariantService.test.ts`

- Current state: Does not exist.
- What this story creates: Domain/service tests for variant use cases.

#### NEW: `src/server/routes/variants.routes.test.ts`

- Current state: Does not exist.
- What this story creates: Route/controller tests for variant endpoints.

#### NEW: `src/features/admin-products/components/variants-ui.test.ts`

- Current state: Does not exist.
- What this story creates: UI tests for variant list and editor.

### Project Structure Notes

- Expected new files:
  - `src/domain/products/types.ts` (UPDATE — add variant types)
  - `src/domain/products/schemas.ts` (UPDATE — add variant schemas)
  - `src/server/repositories/VariantRepository.ts` (NEW)
  - `src/server/services/VariantService.ts` (NEW)
  - `src/server/services/VariantService.test.ts` (NEW)
  - `src/server/controllers/VariantController.ts` (NEW)
  - `src/server/routes/variants.routes.ts` (NEW)
  - `src/server/routes/variants.routes.test.ts` (NEW)
  - `src/features/admin-products/types.ts` (UPDATE — add variant types)
  - `src/features/admin-products/api.ts` (UPDATE — add variant fetch helpers)
  - `src/features/admin-products/components/VariantList.tsx` (NEW)
  - `src/features/admin-products/components/VariantEditor.tsx` (NEW)
  - `src/features/admin-products/components/variants-ui.test.ts` (NEW)
  - `src/server/app.ts` (UPDATE — register variant routes)
- Do not modify:
  - `src/domain/schema/catalog.ts` (no schema migration unless MR. JRW approves centavos column change)
  - `src/server/repositories/ProductRepository.ts` (variant repo is separate)
  - `src/server/services/ProductService.ts` (variant service is separate)
  - `src/server/routes/products.routes.ts` (variant routes are separate)
  - `src/features/admin-products/components/ProductEditor.tsx` (variant editor is separate component)
  - `src/features/admin-products/components/ProductList.tsx`
  - `src/domain/brands/**`
  - `src/domain/categories/**`
  - `src/features/brands/**`
  - `src/features/admin-categories/**`
  - PayMongo/payment docs or flows

### Testing Requirements

- Targeted Vitest for domain/service:

```bash
npx vitest run src/server/services/VariantService.test.ts
```

- Targeted Vitest for routes/controllers:

```bash
npx vitest run src/server/routes/variants.routes.test.ts
```

- Targeted Vitest for UI:

```bash
npx vitest run src/features/admin-products/components/variants-ui.test.ts
```

- Type/Astro check after typed changes:

```bash
npm run check
```

- Manual QA focus for MR. JRW final verdict:
  - Variant create: valid data, duplicate SKU rejection, duplicate option combination rejection, invalid price rejection.
  - Variant update: price change, name change, SKU change, archived variant cannot be updated.
  - Variant archive: soft delete, variant remains readable, product still lists archived variant with archived status.
  - Brand membership denial: non-member Admin cannot create/edit/archive variants for branded product.
  - Variant list: shows all variants for product, paginated, with name, SKU, price, status.
  - Price centavos: stored as integer, displayed as currency in UI.
  - Keyboard navigation for variant list and editor.
  - Status badges show text labels.
  - Form validation errors for invalid variant data.

### Latest Technical Information

- No web research required for this story. Use repo-pinned dependencies from `package.json`: Astro `^6.1.9`, React `^19.2.5`, Tailwind CSS `^4.2.4`, Vitest `^4.1.5`, Elysia `1.4.28`, Drizzle ORM `0.45.2`, Zod `4.4.1`.
- Drizzle schema source is `src/domain/schema/*.ts`; migrations output to `migrations/`.
- Development D1: `jrw-database-development`, id `beabfd98-8611-4d58-8f1b-7a972b8af1ed`.
- Production D1: `jrw-database-production`, id `fd08e264-2046-4648-9164-84f66948533e`.
- Remote-first D1 is project standard.
- `product_variants` table exists with `price` as `real` — map to centavos at repository boundary.
- `variation_chain` is JSON array of `{ name: string, group: string }` objects.
- SKU is unique across all variants (enforced by DB unique constraint).
- `stock_lock_version` exists for future optimistic concurrency (Story 3.6).

### References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.4)
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR25, FR27)
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.md` (VariantMatrix UX-DR13, Product Editor UX-DR12, Form Patterns UX-DR22, Feedback Patterns UX-DR20)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (Project Structure, API Layering, Data Architecture, Component Boundaries, Money Format)
- Project context: `_bmad-output/project-context.md` (Architecture And DDD, API Layering, Validation Rules, Data/D1/Migrations, UI And Design Rules, Testing And Quality)
- Design system: `docs/design-by-google-stitch.md` (Content & Microcopy, Layout & Spacing, Components)
- Previous related stories:
  - `_bmad-output/implementation-artifacts/3-3-assign-product-brand-and-categories.md`
  - `_bmad-output/implementation-artifacts/3-2-create-and-edit-product-identity.md`
  - `_bmad-output/implementation-artifacts/3-1-manage-product-categories.md`
- Existing shared primitives: `src/components/**`
- Existing styles: `src/styles/global.css`
- Existing variant schema: `src/domain/schema/catalog.ts` (product_variants table)
- Existing product service patterns: `src/server/services/ProductService.ts`

## Dev Agent Record

### Agent Model Used

_(To be filled by dev agent)_

### Implementation Plan

1. Add variant domain types and schemas (Zod + TypeBox) to `src/domain/products/`.
2. Create `VariantRepository` interface and `DrizzleVariantRepository` implementation.
3. Create `VariantService` with create, update, archive, list, get use cases and brand membership guards.
4. Create `VariantController` adapting service results to API envelopes.
5. Create variant routes in `src/server/routes/variants.routes.ts` with all endpoints.
6. Register variant routes in `src/server/app.ts`.
7. Extend product detail/list responses to include variant summary (optional, coordinate with service layer).
8. Create `VariantList.tsx` and `VariantEditor.tsx` components.
9. Add typed API fetch helpers for variant operations.
10. Add targeted domain/service, route, and UI tests.
11. Run `npm run check` and document any blockers.

### Debug Log References

_(To be filled by dev agent)_

### Completion Notes List

_(To be filled by dev agent)_

### File List

_(To be filled by dev agent)_

## Change Log

- 2026-05-21: Story 3.4 context engine created for product variant and price management API, admin variant UI, brand membership enforcement, centavos price storage, and targeted tests.
