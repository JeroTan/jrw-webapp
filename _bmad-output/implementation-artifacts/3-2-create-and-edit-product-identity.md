# Story 3.2: Create and Edit Product Identity

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin,
I want to create and edit core product identity,
so that JRW can maintain accurate product records before variants, media, stock, and publishing.

## Acceptance Criteria

1. Given active approved Admin is authenticated, when Admin creates product with valid core fields, then product is created in `DRAFT` status by default and response uses standard `{ data, meta }` envelope.
2. Given Admin edits product name, slug, description, summary, SKU/base metadata, or display fields, when update data is valid, then product identity is updated and product status remains unchanged unless explicitly changed by publish/archive story.
3. Given product data is invalid, missing required fields, or slug conflicts, when create/update is submitted, then system returns validation/conflict error envelope and no partial invalid product state persists.
4. Given non-Admin or inactive/unapproved Admin attempts product mutation, when request is processed, then system returns forbidden/unauthorized error and no product state changes.
5. Given Admin lists products, when list endpoint is called, then pagination uses default page size 20 and maximum 100 and filters for status, brand, category, search, and archive state are documented where available.
6. Given product identity APIs are completed, when API docs are generated, then endpoints include schemas, auth metadata, rate-limit class, pagination params, and error codes.
7. Given implementation finishes, when tests run, then tests cover create draft, edit identity, invalid data, duplicate slug, non-Admin denial, and paginated list and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Task 1: Confirm scope and current baseline. (AC: 1-7)
  - [ ] Verify Epic 2 is `done` and Story 3.1 is `done`; do not reopen.
  - [ ] Verify this story is the second Epic 3 backlog item after Story 3.1.
  - [ ] Confirm existing `products` table in `src/domain/schema/catalog.ts` — current fields: `id`, `name`, `brand` (legacy), `brand_id`, `tags`, `description`, `created_at`, `updated_at`.
  - [ ] Confirm no existing product routes, controller, service, repository, or UI exist yet.
  - [ ] Confirm existing shared primitives from Story 3.0 and category UI from 3.1 are available.
  - [ ] Do not add variants, images, stock, pricing, brand assignment, categories, or publish/archive logic in this story.

- [ ] Task 2: Extend product domain schema and types. (AC: 1-3, 5)
  - [ ] Extend `products` table in `src/domain/schema/catalog.ts` with missing fields: `slug`, `summary`, `status` (`DRAFT`/`PUBLISHED`/`ARCHIVED`), ensure `slug` has unique index.
  - [ ] Add product DTO types in `src/domain/products/types.ts` for create, update, list, and detail responses.
  - [ ] Add product validation schemas: Zod for forms, TypeBox for API contracts.
  - [ ] Ensure slug generation is unique and handles conflicts with numeric suffixes.
  - [ ] Default status on create is `DRAFT`.

- [ ] Task 3: Add product repository and service layer. (AC: 1-4)
  - [ ] Add `ProductRepository` under `src/server/repositories/ProductRepository.ts` with methods: `create`, `findById`, `findBySlug`, `list`, `update`.
  - [ ] Add `ProductService` under `src/server/services/ProductService.ts` with use cases: `createProduct`, `getProduct`, `listProducts`, `updateProduct`.
  - [ ] Service layer enforces: slug uniqueness, Admin auth requirement, status defaults to DRAFT.
  - [ ] Service returns `AppResult`/`GeneralError` patterns; no business rules in controllers.
  - [ ] List method supports pagination (default 20, max 100), `status` filter, `brand_id` filter, `category_id` filter, search by name/slug.
  - [ ] Brand membership guard: if product has `brand_id`, Admin must be brand member or have elevated permission.

- [ ] Task 4: Add product API routes and controllers. (AC: 1-6)
  - [ ] Add `ProductController` under `src/server/controllers/ProductController.ts` adapting service results to `{ data, meta }` envelopes.
  - [ ] Add product routes under `src/server/routes/products.routes.ts` with endpoints:
    - `GET /api/admin/products` — list with pagination and filters
    - `POST /api/admin/products` — create
    - `GET /api/admin/products/:productId` — detail
    - `PATCH /api/admin/products/:productId` — update identity fields
  - [ ] All routes require Admin authentication via existing RBAC guards.
  - [ ] All routes declare TypeBox contracts, OpenAPI metadata, auth, rate-limit class, and error codes.
  - [ ] Register product routes in `src/server/app.ts` composer.
  - [ ] API JSON uses camelCase; database uses snake_case; controller maps rows to DTOs.

- [ ] Task 5: Add admin product list UI. (AC: 1-3, 5)
  - [ ] Create `src/features/admin-products/` folder structure.
  - [ ] Add `src/features/admin-products/api.ts` with typed fetch helpers for product CRUD.
  - [ ] Add `src/features/admin-products/components/ProductList.tsx` as React island for `/admin/products`.
  - [ ] Use Story 3.0 resource browser primitives: `PageToolbar`, `SearchInput`, `DataTable`, `EmptyState`, `Skeleton`.
  - [ ] Product list table shows: name, slug, status, brand (if any), linked category count, actions (Edit).
  - [ ] Search filters by product name and slug, case-insensitive.
  - [ ] Loading skeleton mirrors table structure with stable dimensions.
  - [ ] Empty state says "No products exist" with "Create first product" action.

- [ ] Task 6: Add admin product create/edit UI. (AC: 1-2, 3)
  - [ ] Add `src/features/admin-products/components/ProductEditor.tsx` as side panel or modal form.
  - [ ] Form fields: name (required), slug (auto-generated but editable), summary (optional), description (required).
  - [ ] Form validation with Zod schema; inline errors for required fields, slug conflicts.
  - [ ] Create and update use same form component with different submission handlers.
  - [ ] Success toast on save; error summary at form top on validation failure.
  - [ ] Dirty-state protection: warn before navigating away with unsaved changes.

- [ ] Task 7: Styles and accessibility. (AC: 4-7)
  - [ ] Product UI uses JRW tokens: 0px corners, 1px borders, no shadows, cobalt for focus/selected.
  - [ ] Status badges use text labels: "Draft", "Published", "Archived" — not color alone.
  - [ ] Table rows keyboard accessible; actions reachable via keyboard.
  - [ ] Form has visible labels, required markers, inline errors, and error summary.
  - [ ] Respect `prefers-reduced-motion` for any transitions.

- [ ] Task 8: Targeted tests and checks. (AC: 1-7)
  - [ ] Add domain/service tests in `src/domain/products/product.test.ts` covering: create success, slug uniqueness, default DRAFT status, invalid data, list pagination.
  - [ ] Add route/controller tests in `src/server/routes/products.routes.test.ts` covering: create/update success, invalid data, duplicate slug, non-Admin denial, pagination.
  - [ ] Add UI tests in `src/features/admin-products/components/products-ui.test.ts` covering: list rendering, search filtering, create/edit form, empty/loading states.
  - [ ] Run changed-target tests only: `npx vitest run src/domain/products src/server/routes/products.routes.test.ts src/features/admin-products`.
  - [ ] Run `npm run check` after typed/component changes.
  - [ ] Do not run full `npm run build-test` unless implementation touches broader surfaces or MR. JRW asks for final full verdict.

### Review Findings

- [ ] [Review][Patch] Document any review findings here after code review.

## Dev Notes

### Epic Context

- This is the second Epic 3 catalog story after Story 3.1 (product categories).
- Epic 2 (Brand Collaboration) is complete. Products are the core catalog entity in Epic 3.
- Requirements covered: FR22; supports FR29.
- UX supported: UX-DR12 (Product Editor), UX-DR20 (feedback patterns), UX-DR22 (form patterns), UX-DR29 (responsive admin), UX-DR30 (accessibility).
- Business value: Product identity is the foundation for all subsequent product work — variants, images, pricing, stock, brand/category assignment, and publishing.

### Current Code Intelligence

#### `src/domain/schema/catalog.ts` — `products` table

- Current state: `products` table exists with fields: `id`, `name`, `brand` (legacy string), `brand_id`, `tags` (JSON array), `description`, `created_at`, `updated_at`.
- What this story adds: `slug` (unique text), `summary` (optional text), `status` (enum: DRAFT/PUBLISHED/ARCHIVED, default DRAFT).
- What this story does NOT add: variants, images, stock, pricing, publish/archive transitions (Story 3.7), brand/category assignment (Story 3.3).
- Preserve: Existing `products` table relationships with `brands`, `product_photos`, `product_variants`, `product_categories`. Do not modify existing fields.
- Migration needed: Add `slug`, `summary`, `status` columns to existing `products` table. Generate unique slugs from existing `name` values.

#### `src/server/routes/`

- Current state: Route modules for auth, brands, categories, webhooks following TypeBox contracts and OpenAPI metadata.
- What this story adds: `products.routes.ts` with CRUD endpoints under `/api/admin/products`.
- Preserve: Existing route composition pattern, guard usage, envelope adaptation.

#### `src/server/services/` and `src/server/repositories/`

- Current state: Service and repository pattern established for brands, categories, auth.
- What this story adds: `ProductService` and `ProductRepository` following same pattern.
- Preserve: `AppResult`/`GeneralError` return types, D1 access through Drizzle, no business rules in controllers.

#### `src/features/`

- Current state: `src/features/brands/` and `src/features/admin-categories/` with components, api.ts, types.ts structure.
- What this story adds: `src/features/admin-products/` with same structure.
- Preserve: Feature module organization, typed API clients, React island pattern.

#### `src/components/**`

- Current state: Story 3.0 created `SearchInput`, `ViewToggle`, `ResourceCard`, `ResourceList`, `PageToolbar`, `DataTable`, `EmptyState`, `Skeleton`, `Button`, `Input`, `ConfirmDialog`. Story 3.1 added category-specific UI using these.
- What this story uses: All of the above for product list and editor.
- Preserve: Existing primitive behavior and exports.

### Previous Story Intelligence

- Story 3.1 established category CRUD with slug uniqueness, archive transitions, pagination, and admin UI. Reuse the same patterns for products.
- Story 3.1 slug generation: auto-generated from name, editable, handles conflicts with numeric suffixes (e.g., `shirts`, `shirts-1`).
- Story 3.1 validation used targeted tests plus `npm run check`; use the same targeted style.
- Story 3.1 review findings: slug conflicts were auto-renamed instead of returning conflict — fix this for products (return conflict error, not auto-rename).
- Story 3.1 component inventory documented all primitives; this story should reuse them.
- Category migration used manual SQL (`0017_category_admin_baseline.sql`) after non-TTY block on `npm run db:generate`. Expect same for product migration.

### Git Intelligence

- Recent commits: 3-1 reviewed and implemented, 3-0 implemented, UI/UX correct-course, brand endpoint work.
- Current relevant pattern: code changes are small, typed, and backed by targeted Vitest files.
- Product work should follow the same incremental, tested approach.
- Migration approach: manual SQL migration files in `migrations/` directory.

### Architecture and UX Guardrails

- Astro owns page routing and SEO shells. React feature modules own interactive surfaces.
- Shared primitives go under `src/components/**`; feature-specific product UI stays under `src/features/admin-products/**`.
- Product API follows Route -> Controller -> Service -> Domain/Repository.
- `src/styles/global.css` is the Tailwind CSS v4 project style surface for reusable component classes and design tokens.
- JRW visual system: 0px radius, 1px borders, no shadows, no blur, cobalt accent only for focus/selected/primary/live status.
- Admin UI is dense, keyboard-friendly, and operation-focused.
- Status labels must be text-visible and cannot rely on color alone.
- UI copy must state what the screen, section, or field does for the user. Keep technical boundary language in planning docs only.
- Product is a catalog entity, not a seller/store/tenant.
- Product status defaults to `DRAFT` on create — products are not visible on storefront until published (Story 3.7).
- This story does NOT include brand assignment (Story 3.3), variants (3.4), images (3.5), stock (3.6), or publish/archive (3.7).

### Implementation Guidance

- Extend existing `products` table — do not recreate. Add `slug`, `summary`, `status` columns.
- Slug should be auto-generated from name but editable; handle conflicts by returning error (NOT auto-rename like category bug).
- Default status on create is `DRAFT`.
- List endpoint should support: pagination (default 20, max 100), status filter, brand_id filter, search by name/slug.
- Brand membership guard: if product has `brand_id`, Admin must be brand member or have elevated permission. For brandless products, any Admin can create/edit.
- Keep create and edit forms unified with different submission handlers.
- Avoid adding pagination changes in this story; use existing API pagination pattern.
- Avoid adding new dependencies. Existing React, Astro, Vitest, Tailwind v4, Zod, TypeBox, and local primitives are enough.
- Do not add storefront product browsing in this story; that belongs in Epic 4.
- Do not add variant matrix, image upload, stock management, or publish/archive flows.

### Files Being Modified

#### UPDATE: `src/domain/schema/catalog.ts`

- Current state: Defines `products` table with `id`, `name`, `brand`, `brand_id`, `tags`, `description`, `created_at`, `updated_at`. Also defines relationships with brands, photos, variants, categories.
- What this story changes: Adds `slug`, `summary`, `status` columns to `products` table. Adds unique index on `slug`.
- What must be preserved: Existing fields, relationships, and indexes. Do not modify `product_photos`, `product_variants`, `product_categories` tables.

#### UPDATE: `src/server/app.ts`

- Current state: Composes Elysia app with route groups for auth, brands, categories, etc.
- What this story changes: Registers product routes in the composer.
- What must be preserved: Existing route registrations, middleware, OpenAPI setup.

#### UPDATE: `src/server/routes/index.ts` and `src/server/routes/route-groups.ts`

- Current state: Exports and groups route modules.
- What this story changes: Adds product routes to exports/groups.
- What must be preserved: Existing route group structure.

### Project Structure Notes

- Expected update paths:
  - `src/domain/schema/catalog.ts` (UPDATE — add product fields)
  - `src/domain/products/types.ts` (NEW)
  - `src/domain/products/schemas.ts` (NEW — Zod + TypeBox)
  - `src/domain/products/product.ts` (NEW — domain helpers)
  - `src/domain/products/product.test.ts` (NEW)
  - `src/server/repositories/ProductRepository.ts` (NEW)
  - `src/server/services/ProductService.ts` (NEW)
  - `src/server/controllers/ProductController.ts` (NEW)
  - `src/server/routes/products.routes.ts` (NEW)
  - `src/server/routes/products.routes.test.ts` (NEW)
  - `src/server/routes/index.ts` (UPDATE — export product routes)
  - `src/server/routes/route-groups.ts` (UPDATE — add product group)
  - `src/server/app.ts` (UPDATE — register product routes)
  - `src/features/admin-products/api.ts` (NEW)
  - `src/features/admin-products/types.ts` (NEW)
  - `src/features/admin-products/components/ProductList.tsx` (NEW)
  - `src/features/admin-products/components/ProductEditor.tsx` (NEW)
  - `src/features/admin-products/components/products-ui.test.ts` (NEW)
  - `src/pages/admin/products/index.astro` (NEW — Astro page with React island)
  - `migrations/` (NEW — Drizzle migration for product schema extension)
- Optional update paths:
  - `src/lib/typebox/api.ts` (UPDATE — if product schemas needed)
  - `src/lib/zod/products.ts` (NEW — if Zod schemas separated)
- Do not modify:
  - `src/server/routes/brands.routes.ts`
  - `src/server/routes/categories.routes.ts`
  - `src/domain/brands/**`
  - `src/domain/categories/**`
  - `src/features/brands/**`
  - `src/features/admin-categories/**`
  - `src/domain/schema/` tables other than `products`
  - D1 migrations for other tables
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
  - `/admin/products` list with table rendering.
  - Create product with valid data (name, description).
  - Update product name, slug, summary, description.
  - Search by name and slug.
  - Empty state and loading skeleton.
  - Duplicate slug conflict error.
  - Non-Admin denial (if testable).
  - Keyboard navigation for table actions and form.
  - Status badges show text labels ("Draft").
  - Default status is DRAFT on create.

### Latest Technical Information

- No web research required for this story. Use repo-pinned dependencies from `package.json`: Astro `^6.1.9`, React `^19.2.5`, Tailwind CSS `^4.2.4`, Vitest `^4.1.5`, Elysia `1.4.28`, Drizzle ORM `0.45.2`, Zod `4.4.1`.
- Drizzle schema source is `src/domain/schema/*.ts`; migrations output to `migrations/`.
- Development D1: `jrw-database-development`, id `beabfd98-8611-4d58-8f1b-7a972b8af1ed`.
- Production D1: `jrw-database-production`, id `fd08e264-2046-4648-9164-84f66948533e`.
- Remote-first D1 is project standard. Apply schema changes to remote `development` first, then explicit remote `production` after review.
- Product status enum: `DRAFT`, `PUBLISHED`, `ARCHIVED`. Only `DRAFT` is relevant for create in this story.

### References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.2)
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR22)
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.md` (Product Editor UX-DR12, Form Patterns UX-DR22, Feedback Patterns UX-DR20)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (Project Structure, API Layering, Data Architecture, Component Boundaries)
- Project context: `_bmad-output/project-context.md` (Architecture And DDD, API Layering, Validation Rules, Data/D1/Migrations, UI And Design Rules, Testing And Quality)
- Design system: `docs/design-by-google-stitch.md` (Content & Microcopy, Layout & Spacing, Components)
- Previous related story: `_bmad-output/implementation-artifacts/3-1-manage-product-categories.md`
- Existing shared primitives: `src/components/**`
- Existing styles: `src/styles/global.css`
- Existing product schema: `src/domain/schema/catalog.ts` (products table)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Implementation Plan

1. Extend product domain schema in `catalog.ts` with `slug`, `summary`, `status` columns and unique slug index.
2. Add product domain types, Zod validation, and TypeBox contract schemas.
3. Add `ProductRepository` and `ProductService` with CRUD operations, slug uniqueness, and default DRAFT status.
4. Add `ProductController` and product routes under `/api/admin/products` with full TypeBox/OpenAPI contracts.
5. Register product routes in `src/server/app.ts` via route groups.
6. Add `src/features/admin-products/` with typed API client, `ProductList` React island, and `ProductEditor` form.
7. Create `/admin/products` Astro page with React island.
8. Add targeted domain/service, route, and UI tests.
9. Run `npm run check` and document any blockers.
10. Create manual migration for product schema extension.

### Debug Log References

- [To be filled after implementation]

### Completion Notes List

- [To be filled after implementation]

### File List

- [To be filled after implementation]

## Change Log

- 2026-05-20: Story 3.2 context engine created for product identity CRUD API, admin product list UI, create/edit form, targeted tests, and Drizzle schema extension.
