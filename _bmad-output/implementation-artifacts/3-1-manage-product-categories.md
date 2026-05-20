# Story 3.1: Manage Product Categories

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin,
I want to create, update, archive, and view product categories,
so that JRW storefront and admin catalog can organize products clearly.

## Acceptance Criteria

1. Given active approved Admin is authenticated, when Admin creates category with valid data, then category is created and response uses standard `{ data, meta }` envelope.
2. Given Admin updates category name, slug, sort order, or visibility fields, when update data is valid, then category is updated and updated category remains usable for product assignment.
3. Given Admin archives category, when category has linked products or history, then category is archived rather than hard-deleted and historical product/order references remain readable.
4. Given category data is invalid or slug conflicts, when create/update is submitted, then system returns validation/conflict error envelope and no invalid state persists.
5. Given non-Admin or inactive/unapproved Admin attempts category mutation, when request is processed, then system returns forbidden/unauthorized error and no category state changes.
6. Given category list endpoint is called, when categories are returned, then pagination uses default page size 20 and maximum 100 and archived/visible filters are documented.
7. Given route contract is complete, when API docs are generated, then endpoints include schemas, auth metadata, rate-limit class, pagination params, and error codes.
8. Given implementation finishes, when tests run, then tests cover create, update, archive, list pagination, invalid data, duplicate slug, and non-Admin denial and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Confirm scope and current baseline. (AC: 1-8)
  - [x] Verify Epic 2 and Story 3.0 remain `done`; do not reopen Epic 2 or Story 3.0.
  - [x] Verify this story is the first Epic 3 backlog item after Story 3.0 bridge.
  - [x] Confirm no existing category routes, schema, or UI exist yet.
  - [x] Confirm existing shared primitives from Story 3.0: `DataTable`, `Input`, `Button`, `EmptyState`, `Skeleton`, `SearchInput`, `ViewToggle`, `ResourceCard`, `ResourceList`, `PageToolbar`.
  - [x] Do not add product, variant, brand, or inventory changes in this story.

- [x] Task 2: Add category domain schema and types. (AC: 1-4, 6)
  - [x] Add `categories` table to `src/domain/schema/categories.ts` with fields: `id`, `name`, `slug`, `description`, `sort_order`, `is_visible`, `status` (`ACTIVE`/`ARCHIVED`), `created_at`, `updated_at`.
  - [x] Add category DTO types in `src/domain/categories/types.ts` for create, update, list, and detail responses.
  - [x] Add category validation schemas: Zod for forms, TypeBox for API contracts.
  - [x] Ensure slug generation is unique and handles conflicts with numeric suffixes.
  - [x] Run `npm run db:generate` and document migration path.

- [x] Task 3: Add category repository and service layer. (AC: 1-5)
  - [x] Add `CategoryRepository` under `src/server/repositories/CategoryRepository.ts` with methods: `create`, `findById`, `findBySlug`, `list`, `update`, `archive`.
  - [x] Add `CategoryService` under `src/server/services/CategoryService.ts` with use cases: `createCategory`, `getCategory`, `listCategories`, `updateCategory`, `archiveCategory`.
  - [x] Service layer enforces: slug uniqueness, status transitions (ACTIVE → ARCHIVED only), Admin auth requirement.
  - [x] Service returns `AppResult`/`GeneralError` patterns; no business rules in controllers.
  - [x] List method supports pagination (default 20, max 100), `status` filter, `is_visible` filter.

- [x] Task 4: Add category API routes and controllers. (AC: 1-7)
  - [x] Add `CategoryController` under `src/server/controllers/CategoryController.ts` adapting service results to `{ data, meta }` envelopes.
  - [x] Add category routes under `src/server/routes/categories.routes.ts` with endpoints:
    - `GET /api/admin/categories` — list with pagination and filters
    - `POST /api/admin/categories` — create
    - `GET /api/admin/categories/:categoryId` — detail
    - `PATCH /api/admin/categories/:categoryId` — update
    - `DELETE /api/admin/categories/:categoryId` — archive (soft delete)
  - [x] All routes require Admin authentication via existing RBAC guards.
  - [x] All routes declare TypeBox contracts, OpenAPI metadata, auth, rate-limit class, and error codes.
  - [x] Register category routes in `src/server/app.ts` composer.
  - [x] API JSON uses camelCase; database uses snake_case; controller maps rows to DTOs.

- [x] Task 5: Add admin category list UI. (AC: 1-3, 5-6)
  - [x] Create `src/features/admin-categories/` folder structure.
  - [x] Add `src/features/admin-categories/api.ts` with typed fetch helpers for category CRUD.
  - [x] Add `src/features/admin-categories/components/CategoryList.tsx` as React island for `/admin/categories`.
  - [x] Use Story 3.0 resource browser primitives: `PageToolbar`, `SearchInput`, `DataTable`, `EmptyState`, `Skeleton`.
  - [x] Category list table shows: name, slug, status, sort order, visibility, linked product count (if available), actions (Edit, Archive).
  - [x] Search filters by category name and slug, case-insensitive, client-side for initial implementation.
  - [x] Loading skeleton mirrors table structure with stable dimensions.
  - [x] Empty state says "No categories exist" with "Create first category" action.
  - [x] Archive confirmation uses `ConfirmDialog` primitive.

- [x] Task 6: Add admin category create/edit UI. (AC: 1-2, 4)
  - [x] Add `src/features/admin-categories/components/CategoryEditor.tsx` as side panel or modal form.
  - [x] Form fields: name (required), slug (auto-generated but editable), description (optional), sort order (number), visibility toggle.
  - [x] Form validation with Zod schema; inline errors for required fields, slug conflicts.
  - [x] Create and update use same form component with different submission handlers.
  - [x] Success toast on save; error summary at form top on validation failure.
  - [x] Dirty-state protection: warn before navigating away with unsaved changes.

- [x] Task 7: Styles and accessibility. (AC: 5-8)
  - [x] Category UI uses JRW tokens: 0px corners, 1px borders, no shadows, cobalt for focus/selected.
  - [x] Status badges use text labels: "Active", "Archived" — not color alone.
  - [x] Table rows keyboard accessible; actions reachable via keyboard.
  - [x] Form has visible labels, required markers, inline errors, and error summary.
  - [x] Confirm dialog traps focus and restores on close.
  - [x] Respect `prefers-reduced-motion` for any transitions.

- [x] Task 8: Targeted tests and checks. (AC: 1-8)
  - [x] Add domain/service tests in `src/domain/categories/category.test.ts` covering: create success, slug uniqueness, archive transition, invalid status, list pagination.
  - [x] Add route/controller tests in `src/server/routes/categories.routes.test.ts` covering: create/update/archive success, invalid data, duplicate slug, non-Admin denial, pagination.
  - [x] Add UI tests in `src/features/admin-categories/components/categories-ui.test.ts` covering: list rendering, search filtering, create/edit form, archive confirmation, empty/loading states.
  - [x] Run changed-target tests only: `npx vitest run src/domain/categories src/server/routes/categories.routes.test.ts src/features/admin-categories`.
  - [x] Run `npm run check` after typed/component changes.
  - [x] Do not run full `npm run build-test` unless implementation touches broader surfaces or MR. JRW asks for final full verdict.

### Review Findings

- [x] [Review][Patch] Explicit slug conflicts were auto-renamed instead of returning conflict [src/server/services/CategoryService.ts] — fixed.
- [x] [Review][Patch] Service coerced non-boolean visibility to `false` before validation [src/server/services/CategoryService.ts] — fixed.
- [x] [Review][Patch] Category editor did not auto-generate an editable slug from the category name [src/features/admin-categories/components/CategoryEditor.tsx] — fixed.
- [x] [Review][Patch] Legacy category migration could emit invalid slug characters [migrations/0017_category_admin_baseline.sql] — fixed.

## Dev Notes

### Epic Context

- This is the first Epic 3 catalog story after Story 3.0 (admin resource browser bridge).
- Epic 2 (Brand Collaboration) is complete. Categories are foundational for product organization in Epic 3.
- Requirements covered: FR21.
- UX supported: UX-DR11 (admin resource browsing), UX-DR20 (feedback patterns), UX-DR22 (form patterns), UX-DR29 (responsive admin), UX-DR30 (accessibility).
- Business value: Categories enable product organization for both admin catalog management and storefront browsing (Epic 4).

### Current Code Intelligence

#### `src/domain/schema/`

- Current state: Existing schema files for admins, brands, brand_memberships, products, variants, sessions, etc.
- What this story adds: `categories` table with `id`, `name`, `slug`, `description`, `sort_order`, `is_visible`, `status`, `created_at`, `updated_at`.
- Preserve: Existing table patterns, Drizzle conventions, snake_case columns.

#### `src/server/routes/`

- Current state: Route modules for auth, brands, products, webhooks following TypeBox contracts and OpenAPI metadata.
- What this story adds: `categories.routes.ts` with CRUD endpoints under `/api/admin/categories`.
- Preserve: Existing route composition pattern, guard usage, envelope adaptation.

#### `src/server/services/` and `src/server/repositories/`

- Current state: Service and repository pattern established for brands, products, auth.
- What this story adds: `CategoryService` and `CategoryRepository` following same pattern.
- Preserve: `AppResult`/`GeneralError` return types, D1 access through Drizzle, no business rules in controllers.

#### `src/features/`

- Current state: `src/features/brands/` with components, api.ts, types.ts structure.
- What this story adds: `src/features/admin-categories/` with same structure.
- Preserve: Feature module organization, typed API clients, React island pattern.

#### `src/components/**`

- Current state: Story 3.0 created `SearchInput`, `ViewToggle`, `ResourceCard`, `ResourceList`, `PageToolbar`, `DataTable`, `EmptyState`, `Skeleton`, `Button`, `Input`, `ConfirmDialog`.
- What this story uses: All of the above for category list and editor.
- Preserve: Existing primitive behavior and exports.

### Previous Story Intelligence

- Story 3.0 established admin resource browser primitives and patterns. Reuse them; do not recreate.
- Story 3.0 confirmed JRW visual system: 0px radius, 1px borders, no shadows, cobalt accent only for focus/selected/primary/live status.
- Story 3.0 validation used targeted tests plus `npm run check`; user wants the same targeted style for changed surfaces.
- Story 3.0 component inventory documented all primitives; this story should update inventory if new components are added (none expected).

### Git Intelligence

- Recent commits show brand endpoint/UI work, Story 3.0 implementation, and docs correct-course for UI/UX design.
- Current relevant pattern: code changes should be small, typed, and backed by targeted Vitest files rather than broad unrelated churn.
- Category work should follow the same incremental, tested approach.

### Architecture and UX Guardrails

- Astro owns page routing and SEO shells. React feature modules own interactive surfaces.
- Shared primitives go under `src/components/**`; feature-specific category UI stays under `src/features/admin-categories/**`.
- Category API follows Route -> Controller -> Service -> Domain/Repository.
- `src/styles/global.css` is the Tailwind CSS v4 project style surface for reusable component classes and design tokens.
- JRW visual system: 0px radius, 1px borders, no shadows, no blur, cobalt accent only for focus/selected/primary/live status.
- Admin UI is dense, keyboard-friendly, and operation-focused.
- Status labels must be text-visible and cannot rely on color alone.
- UI copy must state what the screen, section, or field does for the user. Keep technical boundary language in planning docs only.
- Category is a catalog organization tool, not a seller/store/tenant.

### Implementation Guidance

- Prefer extracting pure helpers for slug generation and validation if it makes targeted tests simple.
- Slug should be auto-generated from name but editable; handle conflicts with numeric suffixes (e.g., `shirts`, `shirts-1`, `shirts-2`).
- Archive is soft delete: set `status = 'ARCHIVED'`, do not hard-delete.
- Linked product count can use existing product-category relationship if available; if not, show `N/A` without blocking the page.
- Keep create and edit forms unified with different submission handlers.
- Avoid adding pagination changes in this story; use existing API pagination pattern (default 20, max 100).
- Avoid adding new dependencies. Existing React, Astro, Vitest, Tailwind v4, Zod, TypeBox, and local primitives are enough.
- Do not add storefront category browsing in this story; that belongs in Epic 4.

### Project Structure Notes

- Expected update paths:
  - `src/domain/schema/categories.ts` (NEW)
  - `src/domain/categories/types.ts` (NEW)
  - `src/domain/categories/category.test.ts` (NEW)
  - `src/server/repositories/CategoryRepository.ts` (NEW)
  - `src/server/services/CategoryService.ts` (NEW)
  - `src/server/controllers/CategoryController.ts` (NEW)
  - `src/server/routes/categories.routes.ts` (NEW)
  - `src/server/app.ts` (UPDATE — register category routes)
  - `src/features/admin-categories/api.ts` (NEW)
  - `src/features/admin-categories/components/CategoryList.tsx` (NEW)
  - `src/features/admin-categories/components/CategoryEditor.tsx` (NEW)
  - `src/features/admin-categories/components/categories-ui.test.ts` (NEW)
  - `src/pages/admin/categories/index.astro` (NEW — Astro page with React island)
  - `migrations/` (NEW — Drizzle migration for categories table)
- Optional update paths:
  - `src/components/_readme.md` (UPDATE — if new primitives added, none expected)
  - `src/lib/typebox/api.ts` (UPDATE — if category schemas needed)
  - `src/lib/zod/categories.ts` (NEW — if Zod schemas separated)
- Do not modify:
  - `src/server/**` brand routes
  - `src/domain/brands/**`
  - `src/domain/products/**` (yet — categories will link later)
  - `src/features/brands/**`
  - D1 migrations for other tables
  - PayMongo/payment docs or flows

### Testing Requirements

- Targeted Vitest for domain/service:

```bash
npx vitest run src/domain/categories/category.test.ts
```

- Targeted Vitest for routes/controllers:

```bash
npx vitest run src/server/routes/categories.routes.test.ts
```

- Targeted Vitest for UI:

```bash
npx vitest run src/features/admin-categories/components/categories-ui.test.ts
```

- Type/Astro check after typed changes:

```bash
npm run check
```

- Manual QA focus for MR. JRW final verdict:
  - `/admin/categories` list with table rendering.
  - Create category with valid data.
  - Update category name, slug, sort order, visibility.
  - Archive category with confirmation.
  - Search by name and slug.
  - Empty state and loading skeleton.
  - Duplicate slug conflict error.
  - Non-Admin denial (if testable).
  - Keyboard navigation for table actions and form.
  - Status badges show text labels.

### Latest Technical Information

- No web research required for this story. Use repo-pinned dependencies from `package.json`: Astro `^6.1.9`, React `^19.2.5`, Tailwind CSS `^4.2.4`, Vitest `^4.1.5`, Elysia `1.4.28`, Drizzle ORM `0.45.2`, Zod `4.4.1`.
- Drizzle schema source is `src/domain/schema/*.ts`; migrations output to `migrations/`.
- Development D1: `jrw-database-development`, id `beabfd98-8611-4d58-8f1b-7a972b8af1ed`.
- Production D1: `jrw-database-production`, id `fd08e264-2046-4648-9164-84f66948533e`.
- Remote-first D1 is project standard. Apply schema changes to remote `development` first, then explicit remote `production` after review.

### References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.1)
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR21)
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.md` (Admin Resource Browsing, Form Patterns, Feedback Patterns, Status Labels)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (Project Structure, API Layering, Data Architecture, Component Boundaries)
- Project context: `_bmad-output/project-context.md` (Architecture And DDD, API Layering, Validation Rules, Data/D1/Migrations, UI And Design Rules, Testing And Quality)
- Design system: `docs/design-by-google-stitch.md` (Content & Microcopy, Layout & Spacing, Components)
- Previous related story: `_bmad-output/implementation-artifacts/3-0-admin-resource-browser-and-component-system.md`
- Existing shared primitives: `src/components/**`
- Existing styles: `src/styles/global.css`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

1. Add category domain schema, types, and validation schemas (Zod + TypeBox).
2. Add `CategoryRepository` and `CategoryService` with CRUD and archive operations.
3. Add `CategoryController` and category routes under `/api/admin/categories` with full TypeBox/OpenAPI contracts.
4. Register category routes in `src/server/app.ts`.
5. Add `src/features/admin-categories/` with typed API client, `CategoryList` React island, and `CategoryEditor` form.
6. Create `/admin/categories` Astro page with React island.
7. Add targeted domain/service, route, and UI tests.
8. Run `npm run check` and document any blockers.

### Debug Log References

- `npx vitest run src/domain/categories src/server/routes/categories.routes.test.ts src/features/admin-categories` (pass, 17 tests)
- `npm run check` (pass; no errors; existing unrelated hints retained)
- `npm run db:generate` attempted, blocked by non-TTY Drizzle prompt; migration applied manually in `migrations/0017_category_admin_baseline.sql`

### Completion Notes List

- Added category domain model (`types`, `schemas`, `category` helpers) with slug normalization/uniqueness, pagination normalization, and archive transition guards.
- Extended schema baseline in `src/domain/schema/catalog.ts` to category fields required by this story (`slug`, `description`, `sort_order`, `is_visible`, `status`, timestamps) and added indexes.
- Added manual migration `0017_category_admin_baseline.sql` to migrate legacy category table shape to admin-ready shape and preserve product-category links.
- Implemented backend vertical slice: `CategoryRepository`, `CategoryService`, `CategoryController`, and `categories.routes.ts` with RBAC + OpenAPI metadata + `{ data, meta }` envelope.
- Registered category routes in server composition (`src/server/routes/index.ts`, `src/server/app.ts`, route-groups update).
- Added admin category UI feature (`api.ts`, `CategoryList`, `CategoryEditor`, `/admin/categories` Astro page) with search, loading/empty states, create/edit modal, archive confirm dialog, and toast feedback.
- Added story-targeted tests: domain helpers, route contracts/guards, and UI rendering/filter/editor/archive message coverage.

### File List

- `migrations/0017_category_admin_baseline.sql`
- `src/domain/schema/catalog.ts`
- `src/domain/categories/types.ts`
- `src/domain/categories/schemas.ts`
- `src/domain/categories/category.ts`
- `src/domain/categories/category.test.ts`
- `src/server/repositories/CategoryRepository.ts`
- `src/server/services/CategoryService.ts`
- `src/server/controllers/CategoryController.ts`
- `src/server/routes/categories.routes.ts`
- `src/server/routes/categories.routes.test.ts`
- `src/server/routes/index.ts`
- `src/server/routes/route-groups.ts`
- `src/server/app.ts`
- `src/features/admin-categories/types.ts`
- `src/features/admin-categories/api.ts`
- `src/features/admin-categories/components/CategoryEditor.tsx`
- `src/features/admin-categories/components/CategoryList.tsx`
- `src/features/admin-categories/components/categories-ui.test.ts`
- `src/pages/admin/categories/index.astro`
- `src/styles/global.css`

## Change Log

- 2026-05-20: Story 3.1 context engine created for product category CRUD API, admin category list UI, create/edit form, archive with confirmation, targeted tests, and Drizzle schema/migration.
- 2026-05-20: Implemented category admin CRUD backend + UI + tests; added manual migration `0017_category_admin_baseline.sql` after non-TTY block on `npm run db:generate`.
