# Story 3.3: Assign Product Brand and Categories

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin,
I want to assign products to zero or one brand and one or more categories,
so that JRW catalog organization stays clear and brand collaboration rules remain enforced.

## Acceptance Criteria

1. Given Admin edits product organization, when Admin assigns no brand, then product remains brandless and brandless state is valid and does not imply missing seller/store.
2. Given Admin assigns product to one brand, when Admin has brand membership or elevated permission, then product brand association is saved and response uses standard envelope.
3. Given Admin assigns product to category or categories, when categories are active and valid, then product-category associations are saved and archived/invalid categories are rejected.
4. Given Admin lacks permission for selected brand, when brand assignment is submitted, then system returns `BRAND_MEMBERSHIP_REQUIRED` or documented forbidden code and product organization remains unchanged.
5. Given Admin attempts to assign multiple brands, when request is validated, then system rejects request and product remains assigned to zero or one brand only.
6. Given brand or category assignment changes, when audit/event hooks run, then safe actor, product target, old/new organization where safe, timestamp, and request ID are recorded or emitted.
7. Given route contract is complete, when API docs are generated, then schemas document zero-or-one brand, category assignment rules, auth metadata, error codes, and rate-limit class.
8. Given implementation finishes, when tests run, then tests cover brandless assignment, valid brand assignment, unauthorized brand assignment, valid category assignment, archived category rejection, and multiple-brand rejection and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Confirm scope and current baseline. (AC: 1-8)
  - [x] Verify Epic 2 is `done` and Stories 3.1, 3.2 are `done`; do not reopen.
  - [x] Confirm this story is the third Epic 3 backlog item after Story 3.2.
  - [x] Confirm existing `products` table in `src/domain/schema/catalog.ts` — current fields include `brand_id`, `slug`, `summary`, `status`.
  - [x] Confirm existing `product_categories` junction table and `categories` table exist.
  - [x] Confirm existing `ProductRepository`, `ProductService`, `ProductController`, and product routes from Story 3.2.
  - [x] Confirm existing brand membership guards from Story 2.6 and brand endpoints from Epic 2.
  - [x] Do NOT add variants, images, stock, pricing, publish/archive transitions, or product editor UI sections in this story.

- [x] Task 2: Add brand assignment domain logic and repository methods. (AC: 1-5, 6)
  - [x] Extend `ProductRepository` with `assignBrand(productId, brandId)` and `removeBrand(productId)` methods.
  - [x] Extend `ProductService` with `assignProductBrand` and `removeProductBrand` use cases.
  - [x] Service enforces: zero-or-one brand invariant, brand membership guard (SUPER_ADMIN exempt, otherwise must be active brand member).
  - [x] Service returns `AppResult`/`GeneralError` with `BRAND_MEMBERSHIP_REQUIRED` for non-members.
  - [x] Brand assignment records audit event through existing audit interface.

- [x] Task 3: Add category assignment domain logic and repository methods. (AC: 3, 6)
  - [x] Extend `ProductRepository` with `assignCategories(productId, categoryIds[])` and `removeCategory(productId, categoryId)` methods.
  - [x] Extend `ProductService` with `assignProductCategories` and `removeProductCategory` use cases.
  - [x] Service enforces: categories must exist, must be ACTIVE status, must not be archived.
  - [x] Service rejects archived/invalid categories with validation error.
  - [x] Category assignment records audit event through existing audit interface.

- [x] Task 4: Add product organization API routes and controllers. (AC: 2-7)
  - [x] Extend `ProductController` with brand/category assignment adaptation methods.
  - [x] Add product organization routes under `src/server/routes/products.routes.ts` with endpoints:
    - `PATCH /api/admin/products/:productId/brand` — assign/remove brand
    - `PATCH /api/admin/products/:productId/categories` — assign/remove categories
    - `GET /api/admin/products/:productId/organization` — current brand + categories
  - [x] All routes require Admin authentication via existing RBAC guards.
  - [x] All routes declare TypeBox contracts, OpenAPI metadata, auth, rate-limit class, and error codes.
  - [x] API JSON uses camelCase; database uses snake_case; controller maps rows to DTOs.

- [x] Task 5: Add admin product organization UI. (AC: 1-3, 5)
  - [x] Extend `src/features/admin-products/components/ProductEditor.tsx` with brand and category assignment sections.
  - [x] Brand section: dropdown/select to choose brand or "No brand"; shows current brand membership status; explains brand is optional catalog group.
  - [x] Category section: multi-select to assign one or more active categories; shows linked category count; rejects archived categories.
  - [x] Brand assignment shows permission denial message when Admin lacks brand membership.
  - [x] Form validation with Zod schema; inline errors for invalid brand/category selection.
  - [x] Success toast on save; error summary at form top on validation failure.
  - [x] Use existing `Select`, `Badge`, `Input` primitives from `src/components/**`.

- [x] Task 6: Extend product list to show brand and category summary. (AC: 1-3)
  - [x] Update `src/features/admin-products/components/ProductList.tsx` to show brand name (or "No brand") and category count in table columns.
  - [x] Add brand filter to product list toolbar (filter by brand or brandless).
  - [x] Add category filter to product list toolbar (filter by category).
  - [x] Ensure list endpoint returns brand name and category count in response.

- [x] Task 7: Styles and accessibility. (AC: 4-8)
  - [x] Product organization UI uses JRW tokens: 0px corners, 1px borders, no shadows, cobalt for focus/selected.
  - [x] Brand/category status uses text labels — not color alone.
  - [x] Form has visible labels, required markers, inline errors, and error summary.
  - [x] Dropdown/multi-select keyboard accessible.
  - [x] Respect `prefers-reduced-motion` for any transitions.
  - [x] Brand copy uses "brand", "catalog group", "brand members" — never seller/merchant/tenant/store owner.

- [x] Task 8: Targeted tests and checks. (AC: 1-8)
  - [x] Extend domain/service tests in `src/domain/products/product.test.ts` covering: brand assignment success, brand membership denial, brandless assignment, category assignment success, archived category rejection, multiple-brand rejection.
  - [x] Extend route/controller tests in `src/server/routes/products.routes.test.ts` covering: brand assign/remove, category assign/remove, unauthorized brand assignment, archived category rejection, zero-or-one brand invariant.
  - [x] Extend UI tests in `src/features/admin-products/components/products-ui.test.ts` covering: brand dropdown, category multi-select, permission denial, empty states, validation errors.
  - [x] Run changed-target tests only: `npx vitest run src/domain/products src/server/routes/products.routes.test.ts src/features/admin-products`.
  - [x] Run `npm run check` after typed/component changes.
  - [x] Do not run full `npm run build-test` unless implementation touches broader surfaces or MR. JRW asks for final full verdict.

### Review Findings

- [x] [Review][Patch] Product editor reset user edits when organization data arrived [src/features/admin-products/components/ProductEditor.tsx:335]
- [x] [Review][Patch] Empty product list offered reset instead of create when no filters were active [src/features/admin-products/components/ProductList.tsx:528]
- [x] [Review][Patch] Category reassignment used split writes without product update verification [src/server/repositories/ProductRepository.ts:489]

## Dev Notes

### Epic Context

- This is the third Epic 3 catalog story after Story 3.2 (product identity).
- Epic 2 (Brand Collaboration) is complete with brand membership guards established.
- Requirements covered: FR23, FR24; supports FR19, FR20.
- UX supported: UX-DR12 (Product Editor sections), UX-DR15 (Brand Member Table language), UX-DR19 (brand language guardrails), UX-DR20 (feedback patterns), UX-DR22 (form patterns), UX-DR29 (responsive admin), UX-DR30 (accessibility).
- Business value: Products need brand and category organization for catalog browsing, brand collaboration, and storefront filtering. Without this, products are unorganized and brand-scoped access cannot function.

### Current Code Intelligence

#### `src/domain/schema/catalog.ts` — `products` table

- Current state: `products` table has `id`, `name`, `slug`, `brand` (legacy string), `brand_id` (FK to brands), `tags`, `summary`, `description`, `status` (DRAFT/PUBLISHED/ARCHIVED), `created_at`, `updated_at`.
- What this story uses: `brand_id` FK already exists. `product_categories` junction table already exists.
- What this story does NOT change: No schema migration needed — tables and relationships already exist.
- Preserve: Existing fields, relationships, and indexes. Do not modify `product_photos`, `product_variants`, `categories` tables.

#### `src/server/services/ProductService.ts`

- Current state: Has `createProduct`, `getProduct`, `listProducts`, `updateProduct` with slug uniqueness, Admin auth requirement, brand membership guard for branded products.
- What this story adds: `assignProductBrand`, `removeProductBrand`, `assignProductCategories`, `removeProductCategory` use cases.
- Preserve: Existing `AppResult`/`GeneralError` return types, existing brand membership guard pattern.

#### `src/server/repositories/ProductRepository.ts`

- Current state: Has `create`, `findById`, `findBySlug`, `list`, `update` methods.
- What this story adds: `assignBrand`, `removeBrand`, `assignCategories`, `removeCategory` methods.
- Preserve: D1 access through Drizzle, existing query patterns.

#### `src/server/routes/products.routes.ts`

- Current state: Has `GET /api/admin/products`, `POST /api/admin/products`, `GET /api/admin/products/:productId`, `PATCH /api/admin/products/:productId`.
- What this story adds: `PATCH /api/admin/products/:productId/brand`, `PATCH /api/admin/products/:productId/categories`, `GET /api/admin/products/:productId/organization`.
- Preserve: Existing route composition pattern, guard usage, envelope adaptation, TypeBox contracts.

#### `src/features/admin-products/`

- Current state: Has `ProductList.tsx`, `ProductEditor.tsx`, `api.ts`, `types.ts` from Story 3.2.
- What this story adds: Brand assignment section, category multi-select section in ProductEditor; brand/category columns and filters in ProductList.
- Preserve: Existing list and editor behavior, form validation patterns, typed API clients.

#### `src/components/**`

- Current state: `Select`, `Input`, `Button`, `Badge`, `StatusBadge`, `DataTable`, `EmptyState`, `Skeleton`, `PageToolbar`, `SearchInput`, `ConfirmDialog` available.
- What this story uses: `Select` for brand dropdown, multi-select pattern for categories, `Badge` for brand/category labels.
- Preserve: Existing primitive behavior and exports.

### Previous Story Intelligence

- Story 3.2 established product identity CRUD with slug uniqueness, default DRAFT status, admin UI. Reuse the same repository/service/controller/route patterns.
- Story 3.2 brand membership guard: if product has `brand_id`, Admin must be brand member or SUPER_ADMIN. This story extends that same guard to brand assignment itself.
- Story 3.2 review findings: slug conflicts should return error (NOT auto-rename). Apply same principle — return conflict errors for invalid assignments, not auto-fix.
- Story 3.2 used targeted tests plus `npm run check`; use the same targeted style.
- Story 3.1 established category CRUD with ACTIVE/ARCHIVED status. This story must reject archived categories from assignment.
- Story 2.6 established brand-scoped product mutation guards. This story's brand assignment must follow the same membership check pattern.

### Git Intelligence

- Recent commits: 3-2 reviewed and implemented, 3-1 category CRUD, 3-0 component system, brand endpoint work.
- Current relevant pattern: code changes are small, typed, and backed by targeted Vitest files.
- Product organization work should follow the same incremental, tested approach.
- No migration needed for this story — schema already supports brand_id and product_categories.

### Architecture and UX Guardrails

- Astro owns page routing and SEO shells. React feature modules own interactive surfaces.
- Shared primitives go under `src/components/**`; feature-specific product UI stays under `src/features/admin-products/**`.
- Product API follows Route -> Controller -> Service -> Domain/Repository.
- JRW visual system: 0px radius, 1px borders, no shadows, no blur, cobalt accent only for focus/selected/primary/live status.
- Admin UI is dense, keyboard-friendly, and operation-focused.
- Status labels must be text-visible and cannot rely on color alone.
- UI copy must state what the screen, section, or field does for the user. Keep technical boundary language in planning docs only.
- Brand copy: use "brand", "catalog group", "brand members"; NEVER use seller, merchant, tenant, store owner, payout owner.
- Brand assignment is optional — product can be brandless. Brandless is valid and should not imply missing seller/store.
- Category assignment: one or more categories allowed. Archived categories must be rejected.
- Zero-or-one brand invariant: system must reject attempts to assign multiple brands.

### Implementation Guidance

- Brand assignment: PATCH endpoint accepts `brand_id` (string | null). Null removes brand association.
- Category assignment: PATCH endpoint accepts `category_ids` (string[]). Replaces existing category assignments.
- Brand membership guard: check `BrandMembershipRepository` for active membership. SUPER_ADMIN bypasses guard.
- Category validation: check each category exists and has `status = ACTIVE`. Reject archived categories.
- Keep brand and category assignment as separate endpoints for clarity.
- Product organization GET endpoint returns current brand (if any) and linked categories list.
- Product list should show brand name (or "No brand") and category count as new columns.
- Product list filters: add brand filter (by brand_id or "brandless") and category filter (by category_id).
- Avoid adding new dependencies. Existing React, Astro, Vitest, Tailwind v4, Zod, TypeBox, and local primitives are enough.
- Do not add storefront product browsing or filtering in this story; that belongs in Epic 4.
- Do not add variant matrix, image upload, stock management, or publish/archive flows.

### Files Being Modified

#### UPDATE: `src/server/repositories/ProductRepository.ts`

- Current state: Has `create`, `findById`, `findBySlug`, `list`, `update` methods using Drizzle.
- What this story changes: Adds `assignBrand`, `removeBrand`, `assignCategories`, `removeCategory` methods.
- What must be preserved: Existing method signatures, D1/Drizzle access patterns.

#### UPDATE: `src/server/services/ProductService.ts`

- Current state: Has `createProduct`, `getProduct`, `listProducts`, `updateProduct` with brand membership guard.
- What this story changes: Adds `assignProductBrand`, `removeProductBrand`, `assignProductCategories`, `removeProductCategory` use cases.
- What must be preserve: Existing `AppResult`/`GeneralError` patterns, existing brand membership guard logic.

#### UPDATE: `src/server/controllers/ProductController.ts`

- Current state: Adapts service results to `{ data, meta }` envelopes for CRUD operations.
- What this story changes: Adds adaptation methods for brand/category assignment results.
- What must be preserved: Existing envelope adaptation patterns.

#### UPDATE: `src/server/routes/products.routes.ts`

- Current state: Has CRUD routes under `/api/admin/products`.
- What this story changes: Adds brand assignment, category assignment, and organization detail routes.
- What must be preserved: Existing route contracts, OpenAPI metadata, guard usage.

#### UPDATE: `src/server/routes/products.routes.test.ts`

- Current state: Tests for CRUD routes from Story 3.2.
- What this story changes: Adds tests for brand/category assignment routes.
- What must be preserved: Existing test coverage.

#### UPDATE: `src/features/admin-products/components/ProductEditor.tsx`

- Current state: Form for product identity fields (name, slug, summary, description).
- What this story changes: Adds brand assignment section and category multi-select section.
- What must be preserved: Existing identity form behavior, validation, dirty-state protection.

#### UPDATE: `src/features/admin-products/components/ProductList.tsx`

- Current state: Table showing name, slug, status, actions.
- What this story changes: Adds brand column, category count column, brand filter, category filter.
- What must be preserved: Existing search, pagination, skeleton/empty states.

#### UPDATE: `src/features/admin-products/api.ts`

- Current state: Typed fetch helpers for product CRUD.
- What this story changes: Adds fetch helpers for brand/category assignment and organization.
- What must be preserved: Existing API client patterns.

#### UPDATE: `src/features/admin-products/types.ts`

- Current state: TypeScript types for product DTOs.
- What this story changes: Adds types for brand assignment, category assignment, organization response.
- What must be preserved: Existing type definitions.

#### UPDATE: `src/domain/products/product.test.ts`

- Current state: Tests for create, slug uniqueness, default DRAFT, list pagination.
- What this story changes: Adds tests for brand assignment, category assignment, membership denial.
- What must be preserved: Existing test coverage.

#### UPDATE: `src/features/admin-products/components/products-ui.test.ts`

- Current state: Tests for list rendering, search, create/edit form, empty/loading states.
- What this story changes: Adds tests for brand dropdown, category multi-select, permission denial.
- What must be preserved: Existing UI test coverage.

### Project Structure Notes

- Expected update paths:
  - `src/server/repositories/ProductRepository.ts` (UPDATE — add brand/category methods)
  - `src/server/services/ProductService.ts` (UPDATE — add brand/category use cases)
  - `src/server/controllers/ProductController.ts` (UPDATE — add brand/category adaptation)
  - `src/server/routes/products.routes.ts` (UPDATE — add brand/category routes)
  - `src/server/routes/products.routes.test.ts` (UPDATE — add brand/category tests)
  - `src/domain/products/product.test.ts` (UPDATE — add brand/category domain tests)
  - `src/features/admin-products/components/ProductEditor.tsx` (UPDATE — add brand/category sections)
  - `src/features/admin-products/components/ProductList.tsx` (UPDATE — add brand/category columns/filters)
  - `src/features/admin-products/api.ts` (UPDATE — add brand/category fetch helpers)
  - `src/features/admin-products/types.ts` (UPDATE — add brand/category types)
  - `src/features/admin-products/components/products-ui.test.ts` (UPDATE — add brand/category UI tests)
- Do not modify:
  - `src/domain/schema/catalog.ts` (no schema changes needed)
  - `src/server/routes/brands.routes.ts`
  - `src/server/routes/categories.routes.ts`
  - `src/domain/brands/**`
  - `src/domain/categories/**`
  - `src/features/brands/**`
  - `src/features/admin-categories/**`
  - D1 migrations (no schema changes)
  - PayMongo/payment docs or flows

### Testing Requirements

- Targeted Vitest for domain/service:

```bash
npx vitest run src/domain/products/product.test.ts
```

- Targeted Vitest for routes/controllers:

```bash
npx vitest run src/server/routes/products.routes.test.ts
```

- Targeted Vitest for UI:

```bash
npx vitest run src/features/admin-products/components/products-ui.test.ts
```

- Type/Astro check after typed changes:

```bash
npm run check
```

- Manual QA focus for MR. JRW final verdict:
  - Product editor brand dropdown: select brand, remove brand, "No brand" state.
  - Product editor category multi-select: add categories, remove categories, archived category rejection.
  - Brand membership denial: non-member Admin sees permission message.
  - Product list: brand column, category count column, brand filter, category filter.
  - Brandless product: valid state, no "missing seller" implication.
  - Multiple brand rejection: API rejects attempt to assign second brand.
  - Keyboard navigation for dropdown and multi-select.
  - Status badges show text labels.
  - Form validation errors for invalid brand/category selection.

### Latest Technical Information

- No web research required for this story. Use repo-pinned dependencies from `package.json`: Astro `^6.1.9`, React `^19.2.5`, Tailwind CSS `^4.2.4`, Vitest `^4.1.5`, Elysia `1.4.28`, Drizzle ORM `0.45.2`, Zod `4.4.1`.
- Drizzle schema source is `src/domain/schema/*.ts`; migrations output to `migrations/`.
- Development D1: `jrw-database-development`, id `beabfd98-8611-4d58-8f1b-7a972b8af1ed`.
- Production D1: `jrw-database-production`, id `fd08e264-2046-4648-9164-84f66948533e`.
- Remote-first D1 is project standard. No schema changes needed for this story.
- Product brand assignment: zero-or-one brand invariant. `brand_id` is nullable FK to `brands`.
- Product category assignment: many-to-many through `product_categories` junction table.
- Brand membership guard: check `brand_memberships` table for active membership. SUPER_ADMIN bypasses.

### References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.3)
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR23, FR24)
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.md` (Product Editor UX-DR12, Brand Language UX-DR19, Form Patterns UX-DR22, Feedback Patterns UX-DR20)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (Project Structure, API Layering, Data Architecture, Component Boundaries)
- Project context: `_bmad-output/project-context.md` (Architecture And DDD, API Layering, Validation Rules, Data/D1/Migrations, UI And Design Rules, Testing And Quality)
- Design system: `docs/design-by-google-stitch.md` (Content & Microcopy, Layout & Spacing, Components)
- Previous related story: `_bmad-output/implementation-artifacts/3-2-create-and-edit-product-identity.md`
- Existing shared primitives: `src/components/**`
- Existing styles: `src/styles/global.css`
- Existing product schema: `src/domain/schema/catalog.ts` (products table, product_categories junction)
- Existing brand membership: `src/domain/schema/catalog.ts` (brand_memberships table)

## Dev Agent Record

### Agent Model Used

_(To be filled by dev agent)_

### Implementation Plan

1. Extend `ProductRepository` with `assignBrand`, `removeBrand`, `assignCategories`, `removeCategory` methods.
2. Extend `ProductService` with brand/category assignment use cases, membership guards, and category validation.
3. Extend `ProductController` with brand/category adaptation methods.
4. Add brand assignment, category assignment, and organization detail routes to `products.routes.ts`.
5. Extend `ProductEditor.tsx` with brand dropdown and category multi-select sections.
6. Extend `ProductList.tsx` with brand column, category count column, brand filter, and category filter.
7. Add typed API fetch helpers for brand/category operations.
8. Add targeted domain/service, route, and UI tests.
9. Run `npm run check` and document any blockers.

### Debug Log References

- 
px vitest run src/domain/products/product.test.ts -> pass (16 tests).
- 
px vitest run src/server/routes/products.routes.test.ts -> pass (13 tests).
- 
px vitest run src/features/admin-products/components/products-ui.test.ts -> pass (5 tests).
- 
px vitest run src/domain/products src/server/routes/products.routes.test.ts src/features/admin-products -> pass (34 tests).
- 
pm run check -> pass (stro check), existing non-blocking hints only.

### Completion Notes List

- Added product organization domain contracts (brand/category assignment payloads, organization DTOs, brandless filter support).
- Extended ProductRepository with brand assign/remove, category replace/remove, category lookup, and product organization read methods.
- Extended ProductService with ssignProductBrand, emoveProductBrand, ssignProductCategories, emoveProductCategory, and getProductOrganization flows, including membership checks, active-category validation, and audit event publishing with safe old/new organization details.
- Extended ProductController and products.routes.ts with product organization endpoints:
  - GET /api/admin/products/:productId/organization`r
  - PATCH /api/admin/products/:productId/brand`r
  - PATCH /api/admin/products/:productId/categories`r
- Extended admin products UI/API/types: editor brand dropdown + category multi-select with validation, membership/status guidance, and list filters wired to query contracts.
- Added/updated targeted tests for domain, routes, and UI coverage of assignment success, denial, archived-category rejection, and multi-brand rejection.
- Validation gates complete: targeted Vitest suites pass and 
pm run check passes.

### File List

- src/domain/products/types.ts`r
- src/domain/products/product.ts`r
- src/domain/products/schemas.ts`r
- src/domain/products/product.test.ts`r
- src/server/repositories/ProductRepository.ts`r
- src/server/services/ProductService.ts`r
- src/server/controllers/ProductController.ts`r
- src/server/routes/products.routes.ts`r
- src/server/routes/products.routes.test.ts`r
- src/features/admin-products/types.ts`r
- src/features/admin-products/api.ts`r
- src/features/admin-products/components/ProductEditor.tsx`r
- src/features/admin-products/components/ProductList.tsx`r
- src/features/admin-products/components/products-ui.test.ts`r
- src/styles/global.css`r

## Change Log

- 2026-05-20: Story 3.3 context engine created for product brand and category assignment API, admin product organization UI, brand/category filters, targeted tests, and brand membership enforcement.

- 2026-05-21: Story 3.3 implementation complete. Added product organization brand/category assignment APIs, audit hooks, admin UI sections and filters, plus targeted domain/route/UI tests and check validation.

