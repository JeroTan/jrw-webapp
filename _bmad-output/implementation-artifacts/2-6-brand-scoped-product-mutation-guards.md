# Story 2.6: Brand-Scoped Product Mutation Guards

Status: done
<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As JRW,
I want brand membership to gate product creation and edits inside a brand,
so that only authorized Admins modify brand-scoped catalog work.

## Acceptance Criteria

1. Given active approved Admin is brand member, when Admin creates product assigned to that brand, then creation is allowed, and product is associated with the brand as catalog group only.
2. Given active approved Admin is brand member, when Admin edits product assigned to that brand, then update is allowed, and product brand association remains valid.
3. Given Admin lacks brand membership and lacks elevated permission, when Admin creates or edits product assigned to that brand, then system returns `BRAND_MEMBERSHIP_REQUIRED` or documented forbidden code, and no product state changes.
4. Given authorized Admin creates or edits brandless product, when brand field is empty, then operation is allowed if Admin has brandless product permission, and brandless state is stored as no brand, not synthetic brand/store.
5. Given product brand assignment changes from one brand to another, when Admin submits reassignment, then system verifies permission for source and target brand scopes, and rejects invalid reassignment with conflict/forbidden error.
6. Given route/controller/service flow handles product mutations, when guards are applied, then membership checks run server-side before domain mutation, and UI-only controls are not relied on for enforcement.
7. Given implementation finishes, when tests run, then tests cover member create/edit, non-member denial, elevated permission, brandless product mutation, invalid reassignment, and no state change on denial, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Confirm dependency gate and prerequisites. (AC: 1-7)
  - [x] Verify Stories 2.1, 2.2, 2.3, 2.4, and 2.5 are `done` in sprint status.
  - [x] Confirm `brands`, `brand_memberships`, and `products` schema exist in `src/domain/schema/catalog.ts`.
  - [x] Confirm RBAC guard middleware from Story 1.12 is registered and functional.
  - [x] Confirm BrandRepository, BrandService, BrandController, and brand routes exist from Stories 2.1-2.5.
  - [x] Confirm product domain rules exist in `src/domain/catalog/product.ts` from Story 2.5.
  - [x] Confirm audit event constants exist in `src/domain/audit/events.ts`.
  - [x] Do not start brand mutation guards without Stories 2.1-2.5 foundation complete.

- [x] Task 2: Add brand mutation guard domain rules. (AC: 1-3, 5-6)
  - [x] Add `requireBrandMembershipForMutation(...)` domain function in `src/domain/catalog/product.ts`.
  - [x] Add input/output types: `BrandMutationGuardInput`, `BrandMutationGuardResult`.
  - [x] Add failure reason types: `BRAND_MEMBERSHIP_REQUIRED`, `BRAND_NOT_FOUND`, `BRAND_ARCHIVED`, `SOURCE_BRAND_PERMISSION_REQUIRED`, `TARGET_BRAND_PERMISSION_REQUIRED`.
  - [x] Domain rules: validate actor is authenticated ADMIN/SUPER_ADMIN, validate actor has ACTIVE membership in target brand OR is SUPER_ADMIN, validate brand exists and is not archived, handle brand reassignment permission checks for both source and target brands.
  - [x] Add `validateBrandlessProductMutation(...)` domain function for brandless product operations.
  - [x] Create `src/domain/catalog/product-mutation.test.ts` covering: member create allowed, member edit allowed, non-member create denied, non-member edit denied, brand reassignment with dual permission, brandless product mutation allowed, SUPER_ADMIN elevated access, archived brand mutation denied.

- [x] Task 3: Extend brand repository with mutation guard queries. (AC: 1-5)
  - [x] Extend `src/server/repositories/BrandRepository.ts` with:
    - [x] `findBrandByIdForMutation(brandId)`: returns brand including archived status for mutation checks.
    - [x] `findMembershipForMutation(brandId, adminId)`: returns membership record for permission check.
    - [x] `findProductBrandAssignment(productId)`: returns current brand assignment for a product (for reassignment checks).
  - [x] All DTOs use camelCase; map from snake_case at repository boundary.
  - [x] Create repository tests covering: find brand for mutation, find membership for mutation, find product brand assignment.

- [x] Task 4: Extend brand service with mutation guard flows. (AC: 1-7)
  - [x] Extend `src/server/services/BrandService.ts` with:
    - [x] `guardBrandProductCreate(input)`: validates actor membership, validates brand exists and is active, returns guard pass/fail.
    - [x] `guardBrandProductUpdate(input)`: validates actor membership for product's current brand, returns guard pass/fail.
    - [x] `guardBrandProductReassignment(input)`: validates actor membership for BOTH source and target brands, returns guard pass/fail.
    - [x] `guardBrandlessProductMutation(input)`: validates actor has brandless product permission, returns guard pass/fail.
    - [x] Return `AUTH_REQUIRED` for missing actor, `AUTH_FORBIDDEN` for non-member, `CONFLICT_STATE` for brand not found/archived, `PROVIDER_UNAVAILABLE` for D1 failures.
  - [x] Create service tests covering: member create guard pass, member edit guard pass, non-member create guard fail, non-member edit guard fail, reassignment dual permission check, brandless mutation guard pass, SUPER_ADMIN elevated access, archived brand guard fail, D1 failure mapping.

- [x] Task 5: Add controller methods and API routes for mutation guards. (AC: 1-7)
  - [x] Extend `src/server/controllers/BrandController.ts` with:
    - [x] `guardBrandProductCreate(input)`: maps service guard result to public API envelope.
    - [x] `guardBrandProductUpdate(input)`: maps service guard result to public API envelope.
    - [x] `guardBrandProductReassignment(input)`: maps service guard result to public API envelope.
    - [x] `guardBrandlessProductMutation(input)`: maps service guard result to public API envelope.
  - [x] Extend `src/server/routes/brands.routes.ts` with:
    - [x] `POST /api/brands/:id/products/guard` â€” guard check before creating product in brand.
    - [x] `POST /api/brands/:id/products/:productId/guard` â€” guard check before editing product in brand.
    - [x] `POST /api/brands/products/:productId/reassign/guard` â€” guard check before reassigning product brand.
    - [x] `POST /api/brands/products/brandless/guard` â€” guard check before creating/editing brandless product.
    - [x] Request/response schemas using TypeBox.
    - [x] Route metadata: `routeDetail(...)` with tag `Brands`, auth `{ mode: "required", roles: ["ADMIN", "SUPER_ADMIN"] }`, rate-limit class `admin-write`, documented error codes.
    - [x] Controller maps service `AppResult` to public API envelopes; no business rules in controller.
  - [x] Create route tests covering: anonymous guard denial, member create guard pass, non-member create guard fail, reassignment dual permission, brandless guard pass, response schema validation, OpenAPI metadata present, error envelope includes request ID.

- [x] Task 6: Validate full flow. (AC: 1-7)
  - [x] Run targeted tests:
    - `npx vitest run src/domain/catalog/product-mutation.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts`
  - [x] Run `npm run check`.
  - [x] Run `npm run build-test` after targeted tests pass.
  - [x] Record exact blockers if any.

### Review Findings

- [x] [Review][Patch] Guard update and reassignment endpoints now deny before leaking product assignment state to non-members. [src/server/services/BrandService.ts:1406]

## Dev Notes

### Epic Context

- Story 2.6 builds on Stories 2.1 (Create Brand), 2.2 (Update/Archive Brand), 2.3 (Invite Admins to Brand), 2.4 (Join Brand by Invitation or Approval), and 2.5 (Brand Member Visibility and Brand Scope).
- Stories 2.1-2.5 established the brand membership system: brands, memberships, invitations, join requests, approvals, and product visibility/scoping. This story adds MUTATION guards on top of the visibility foundation.
- Requirements covered: FR17, FR18, FR20; supports FR19.
- Product truth: JRW is single-store ecommerce. Brands are catalog/collaboration groups only â€” NOT stores, sellers, merchants, tenants, payout owners, or PayMongo accounts.
- Story 2.7 (Brand Membership UI and Language Guardrails) will depend on this story's API contracts for permission states.
- Epic 3 (Catalog, Product Media, and Inventory Operations) will depend on these mutation guards when implementing product CRUD operations.

### Dependency Gate

- Stories 2.1, 2.2, 2.3, 2.4, and 2.5 must be `done` in sprint status before starting this story.
- Story 2.1 established: `brands` table, `brand_memberships` table, BrandRepository, BrandService, BrandController, `POST /api/brands` route, audit emission for `brand.created`.
- Story 2.2 established: `PATCH /api/brands/:id`, `POST /api/brands/:id/archive`, brand membership authorization checks, audit events `brand.updated`/`brand.archived`.
- Story 2.3 established: `POST /api/brands/:id/invite`, PENDING membership creation as invitation, `brand.member_invited` audit event, brand invitation email notification.
- Story 2.4 established: `POST /api/brands/:id/accept`, `POST /api/brands/:id/join`, `POST /api/brands/:id/join/:adminId/approve`, `POST /api/brands/:id/join/:adminId/reject`, PENDINGâ†’ACTIVE/REVOKED transitions, `brand.member_joined` audit event.
- Story 2.5 established: `GET /api/brands/:id/products`, `GET /api/brands/products/brandless`, `GET /api/brands/me`, brand-scoped product visibility, `listBrandScopedProducts(...)` domain function, `findProductsByBrand(...)`, `findBrandlessProducts(...)`, `findBrandsByAdmin(...)` repository methods.
- If Stories 2.1-2.5 are not `done`, stop and document blocker before proceeding.

### Current Code Intelligence

#### `src/domain/catalog/product.ts` (Story 2.5)
  - **Current state:** Contains `listBrandScopedProducts(...)` domain function with input/output types, failure reasons (`BRAND_NOT_FOUND`, `BRAND_MEMBERSHIP_REQUIRED`, `BRAND_ARCHIVED`), pagination normalization, `isActiveBrandMember(...)` helper. Validates actor authentication, role, brand existence, brand status, and membership before returning scoped query parameters.
  - **What this story changes:** Add `requireBrandMembershipForMutation(...)` and `validateBrandlessProductMutation(...)` domain functions. Add mutation-specific failure reasons: `SOURCE_BRAND_PERMISSION_REQUIRED`, `TARGET_BRAND_PERMISSION_REQUIRED`.
  - **What must be preserved:** Existing `listBrandScopedProducts(...)` function, types, helpers, pagination logic. Do not modify existing domain rules.

#### `src/server/repositories/BrandRepository.ts` (Stories 2.1-2.5)
  - **Current state:** Contains all brand CRUD methods, membership methods, product query methods (`findProductsByBrand(...)`, `findBrandlessProducts(...)`, `findBrandsByAdmin(...)`). Uses Drizzle ORM with Drizzle batch for atomic operations. DTO mapping snake_case â†’ camelCase. `products` table has `brand` column (nullable text) that stores brand reference.
  - **What this story changes:** Add `findBrandByIdForMutation(...)`, `findMembershipForMutation(...)`, `findProductBrandAssignment(...)` methods for mutation guard checks.
  - **What must be preserved:** All existing CRUD, membership, and query methods. DTO mapping patterns. Batch operation patterns. Type definitions. The `productBrandScopeClause(...)` and `productBrandlessClause(...)` helpers.

#### `src/server/services/BrandService.ts` (Stories 2.1-2.5)
  - **Current state:** Contains `createBrand(...)`, `updateBrand(...)`, `archiveBrand(...)`, `inviteAdminToBrand(...)`, `acceptBrandInvitation(...)`, `requestBrandJoin(...)`, `approveBrandJoinRequest(...)`, `rejectBrandJoinRequest(...)`, `listBrandScopedProducts(...)`, `listBrandlessProducts(...)`, `listAdminBrands(...)`, `requireAdminActor(...)`, `hasElevatedPermission(...)`, `isActiveBrandMember(...)`, and various helper methods. Uses `evaluateRouteAccess` for RBAC. Returns `AppResult`/`GeneralError` pattern. Audit emission for brand lifecycle events.
  - **What this story changes:** Add `guardBrandProductCreate(...)`, `guardBrandProductUpdate(...)`, `guardBrandProductReassignment(...)`, `guardBrandlessProductMutation(...)` methods. These are guard/check methods that validate permissions BEFORE mutation occurs.
  - **What must be preserved:** All existing create/update/archive/invite/join/visibility flows. Actor validation pattern. Error mapping pattern. Audit publisher pattern. Provider failure detection. Membership check pattern.

#### `src/server/controllers/BrandController.ts` (Stories 2.1-2.5)
  - **Current state:** Contains methods for all brand operations. Maps service `AppResult` to HTTP status + API envelope. Uses `errorCodeToHttpStatus`, `apiSuccessWithRequestId`, `apiErrorWithRequestId`.
  - **What this story changes:** Add guard controller methods that return pass/fail responses for UI to check before allowing mutation actions.
  - **What must be preserved:** Existing error mapping, envelope patterns, type definitions.

#### `src/server/routes/brands.routes.ts` (Stories 2.1-2.5)
  - **Current state:** Contains POST/PATCH routes for brand CRUD, invite, join, approve, reject, archive, and GET routes for product visibility (`GET /api/brands/:id/products`, `GET /api/brands/products/brandless`, `GET /api/brands/me`). TypeBox body/response schemas, RBAC guard, OpenAPI metadata. Tags: `Brands`, auth: required ADMIN/SUPER_ADMIN, rate-limit: `admin-write` for mutations, `admin-read` for GET endpoints.
  - **What this story changes:** Add POST guard routes: `POST /api/brands/:id/products/guard`, `POST /api/brands/:id/products/:productId/guard`, `POST /api/brands/products/:productId/reassign/guard`, `POST /api/brands/products/brandless/guard`. These are permission check endpoints, not mutation endpoints themselves.
  - **What must be preserved:** Existing routes, TypeBox schemas, RBAC guard, route metadata pattern.

#### `src/domain/schema/catalog.ts` (Stories 2.1-2.5)
  - **Current state:** `brands` table has `status` enum (`ACTIVE`, `ARCHIVED`), `archived_at` nullable text. `brand_memberships` table has `status` enum (`ACTIVE`, `PENDING`, `REVOKED`), `role` enum (`OWNER`, `MEMBER`), `invited_by_admin_id` nullable text. `products` table has `brand` column (nullable text) â€” this is the brand reference field. Unique constraint on `(brand_id, admin_id)` for memberships.
  - **What this story changes:** No schema changes needed. The `products.brand` column already exists and is nullable.
  - **What must be preserved:** Existing schema, enums, constraints, indexes, relations.

#### `src/domain/audit/events.ts` (Stories 2.1-2.5)
  - **Current state:** Contains `brand.created`, `brand.updated`, `brand.archived`, `brand.member_invited`, `brand.member_joined`, `brand.member_removed` action constants. `createAuditEvent(...)`, `NoopAuditEventPublisher`, `scrubAuditDetails(...)`.
  - **What this story changes:** No new audit events needed for guard checks. The actual product mutation stories (Epic 3) will emit audit events for product creation/update.
  - **What must be preserved:** Existing audit event structure, scrubbing logic, publisher interface.

#### `src/server/context/request-context.ts` (Epic 1)
  - **Current state after Epic 2.5:** Derives `requestContext.actor` per request from the route realm cookie. Admin brand routes use `jrw_admin_session`; invalid/ineligible/wrong-realm sessions become anonymous `PROSPECT`.
  - **What this story changes:** No changes. Guard routes read `requestContext.actor` as established.
  - **What must be preserved:** Per-request scoping, request ID propagation.

#### `src/lib/api/response.ts` and `src/lib/typebox/api.ts` (Epic 1)
  - **Current state:** Standard envelope helpers, TypeBox schema utilities, `tboxApiSuccess(...)`, `openApiErrorResponses(...)`.
  - **What this story changes:** Reuse existing helpers for guard endpoints. Guard responses use standard envelope with pass/fail result.
  - **What must be preserved:** Existing envelope patterns; do not reintroduce legacy `{ data, message, code }`.

### Brand Mutation Guard Flow â€” Create Product in Brand

- Admin calls `POST /api/brands/:id/products/guard` with `{ productId?: null }` (no product yet, just checking permission to create in this brand).
- Service validates: actor is authenticated ADMIN/SUPER_ADMIN, actor has ACTIVE membership in the target brand OR is SUPER_ADMIN, brand exists and is ACTIVE.
- If brand is ARCHIVED: return `CONFLICT_STATE` with reason `BRAND_ARCHIVED`.
- If actor is not a member: return `AUTH_FORBIDDEN` with reason `BRAND_MEMBERSHIP_REQUIRED`.
- If valid: return success envelope indicating guard passed.
- This guard endpoint is called by UI BEFORE showing the "create product in brand" form or enabling the submit button.

### Brand Mutation Guard Flow â€” Edit Product in Brand

- Admin calls `POST /api/brands/:id/products/:productId/guard`.
- Service validates: actor is authenticated ADMIN/SUPER_ADMIN, actor has ACTIVE membership in the product's current brand OR is SUPER_ADMIN, brand exists and is ACTIVE, product is assigned to this brand.
- If product is not assigned to this brand: return `CONFLICT_STATE` with reason `BRAND_MISMATCH`.
- If actor is not a member: return `AUTH_FORBIDDEN` with reason `BRAND_MEMBERSHIP_REQUIRED`.
- If valid: return success envelope indicating guard passed.

### Brand Mutation Guard Flow â€” Reassign Product Brand

- Admin calls `POST /api/brands/products/:productId/reassign/guard` with `{ targetBrandId }`.
- Service validates: actor is authenticated ADMIN/SUPER_ADMIN, actor has ACTIVE membership in the product's CURRENT brand (source), actor has ACTIVE membership in the TARGET brand, both brands exist and are ACTIVE.
- If actor lacks source brand permission: return `AUTH_FORBIDDEN` with reason `SOURCE_BRAND_PERMISSION_REQUIRED`.
- If actor lacks target brand permission: return `AUTH_FORBIDDEN` with reason `TARGET_BRAND_PERMISSION_REQUIRED`.
- If valid: return success envelope indicating guard passed.

### Brand Mutation Guard Flow â€” Brandless Product Mutation

- Admin calls `POST /api/brands/products/brandless/guard`.
- Service validates: actor is authenticated ADMIN/SUPER_ADMIN.
- Any authenticated ADMIN/SUPER_ADMIN can create/edit brandless products (no brand membership required).
- Return success envelope indicating guard passed.
- This ensures brandless products remain accessible to all admins without brand membership gates.

### Brand Mutation Authorization Matrix

| Action | Required Permission |
|--------|-------------------|
| Create product in brand X | ACTIVE membership in brand X OR SUPER_ADMIN |
| Edit product in brand X | ACTIVE membership in brand X OR SUPER_ADMIN |
| Reassign product from brand X to brand Y | ACTIVE membership in brand X AND ACTIVE membership in brand Y OR SUPER_ADMIN |
| Create/edit brandless product | Any authenticated ADMIN/SUPER_ADMIN |
| Any action on archived brand | Denied â€” `CONFLICT_STATE` / `BRAND_ARCHIVED` |

### Language Guardrails (Critical)

- Use "brand", "catalog group", "brand members" in all copy, comments, and documentation.
- NEVER use: seller, merchant, tenant, store owner, payout owner, PayMongo owner for brands.
- JRW is the seller of record. Brands organize catalog collaboration only.
- This language rule applies to: code comments, variable names where reasonable, API response field descriptions, test descriptions, and audit event details.
- Brandless language: "brandless", "no brand", "catalog organization choice" â€” NOT "missing seller", "unassigned store", "orphan product".

### Testing Requirements

Minimum before completion:

- Domain tests for mutation guards: member create allowed, member edit allowed, non-member create denied, non-member edit denied, brand reassignment with dual permission, brandless product mutation allowed, SUPER_ADMIN elevated access, archived brand mutation denied.
- Repository tests for find brand for mutation, find membership for mutation, find product brand assignment.
- Service tests for member create guard pass, member edit guard pass, non-member create guard fail, non-member edit guard fail, reassignment dual permission check, brandless mutation guard pass, SUPER_ADMIN elevated access, archived brand guard fail, D1 failure mapping.
- Route tests for auth denial before controller execution, member guard pass, non-member guard fail, reassignment guard, brandless guard pass, response schema validation, OpenAPI metadata presence, error envelope with request ID.

Validation commands:

```bash
npx vitest run src/domain/catalog/product-mutation.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts
npm run check
npm run build-test
```

## References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.6)
- PRD anchors: `_bmad-output/planning-artifacts/prd.md` (FR17, FR18, FR20; supports FR19)
- Architecture anchors: `_bmad-output/planning-artifacts/architecture.md` (Brand collaboration boundaries; API & Communication Patterns; Data Architecture; Enforcement Guidelines)
- UX anchors: `_bmad-output/planning-artifacts/ux-design-specification.md` (UX-DR15, UX-DR19; brand language rules; catalog group terminology)
- Project context: `_bmad-output/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/2-5-brand-member-visibility-and-brand-scope.md`
- Existing brand domain: `src/domain/brands/brand.ts`
- Existing product domain: `src/domain/catalog/product.ts`
- Existing brand repository: `src/server/repositories/BrandRepository.ts`
- Existing brand service: `src/server/services/BrandService.ts`
- Existing brand controller: `src/server/controllers/BrandController.ts`
- Existing brand routes: `src/server/routes/brands.routes.ts`
- Existing brand schema: `src/domain/schema/catalog.ts`
- Existing audit events: `src/domain/audit/events.ts`
- Cloudflare D1 docs: https://developers.cloudflare.com/d1/worker-api/d1-database/
- Drizzle Cloudflare D1 docs: https://orm.drizzle.team/docs/connect-cloudflare-d1
- Elysia lifecycle docs: https://elysiajs.com/essential/life-cycle

## Open Questions

- Should guard endpoints be separate POST routes or could they be integrated as middleware on the actual mutation routes? Current design uses separate guard endpoints for UI to check permission before showing forms, but actual mutation routes should ALSO enforce guards server-side (defense in depth).
- Should SUPER_ADMIN be able to mutate products in any brand regardless of membership? Current design says SUPER_ADMIN can mutate any brand's products (elevated permission pattern from Story 2.3/2.4/2.5).
- Should the guard endpoints emit audit events? Current design says NO â€” guard checks are read-only permission validations. Actual product mutations (Epic 3) will emit audit events.
- Should brand reassignment require elevated permission beyond membership in both brands? Current design says membership in both source and target brands is sufficient. If architecture requires elevated permission for reassignment, document and implement.

## Dev Agent Record

### Agent Model Used

_(To be populated by dev agent)_

### Implementation Plan

_(To be populated by dev agent)_

### Debug Log References

- `npx vitest run src/domain/catalog/product-mutation.test.ts`
- `npx vitest run src/domain/catalog/product.test.ts src/domain/catalog/product-mutation.test.ts`
- `npx vitest run src/server/repositories/BrandRepository.test.ts`
- `npx vitest run src/server/services/BrandService.test.ts`
- `npx vitest run src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts`
- `npx vitest run src/domain/catalog/product-mutation.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts`
- `npm run check`
- `npm run build-test`

### Completion Notes List

- Added domain mutation guard decisions in `src/domain/catalog/product.ts`: `requireBrandMembershipForMutation(...)`, `validateBrandlessProductMutation(...)`, and explicit mutation failure reasons.
- Added domain guard test suite `src/domain/catalog/product-mutation.test.ts` covering member allow paths, non-member denial, reassignment dual-scope checks, brandless allow, super-admin elevation, and archived brand denial.
- Extended `BrandRepository` with mutation guard lookups: `findBrandByIdForMutation(...)`, `findMembershipForMutation(...)`, `findProductBrandAssignment(...)`, plus repository tests for each lookup path.
- Extended `BrandService` with pre-mutation guard methods: `guardBrandProductCreate(...)`, `guardBrandProductUpdate(...)`, `guardBrandProductReassignment(...)`, `guardBrandlessProductMutation(...)`, including stable error mapping (`AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `CONFLICT_STATE`, `PROVIDER_UNAVAILABLE`).
- Extended `BrandController` and `brands.routes.ts` with four guard endpoints:
  - `POST /api/brands/:id/products/guard`
  - `POST /api/brands/:id/products/:productId/guard`
  - `POST /api/brands/products/:productId/reassign/guard`
  - `POST /api/brands/products/brandless/guard`
- Added route tests for new guard endpoint metadata, anonymous denial, success envelopes, failure envelopes with request IDs, and reassignment payload validation.
- Validation complete: targeted tests passed, `npm run check` passed, `npm run build-test` passed.
- Blockers: none.

### File List

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/domain/catalog/product.ts`
- `src/domain/catalog/product-mutation.test.ts`
- `src/server/repositories/BrandRepository.ts`
- `src/server/repositories/BrandRepository.test.ts`
- `src/server/services/BrandService.ts`
- `src/server/services/BrandService.test.ts`
- `src/server/controllers/BrandController.ts`
- `src/server/routes/brands.routes.ts`
- `src/server/routes/brands.routes.test.ts`

## Change Log

- 2026-05-18: Story 2.6 context engine created â€” comprehensive developer guide for brand-scoped product mutation guards.
- 2026-05-18: Implemented brand-scoped product mutation guards across domain, repository, service, controller, routes, and tests; validated with targeted tests, `npm run check`, and `npm run build-test`.

## Post-Retro Fix: Product Brand FK Preparation

- 2026-05-19: Added nullable `products.brand_id` FK in Drizzle schema with `ON DELETE SET NULL` and index `idx_products_brand_id`.
- Added migration `migrations/0016_products_brand_id_fk.sql` to backfill `products.brand_id` from legacy `products.brand` by brand id/name/slug, then index FK column.
- Updated `BrandRepository` product scope queries to prefer `products.brand_id` while preserving legacy `products.brand` fallback until remote D1 is migrated and verified.
- Guard assignment lookup now returns FK `brand_id` first; legacy text fallback remains only for pre-backfill rows.
- Targeted tests run only: `npx vitest run src/server/repositories/BrandRepository.test.ts` (pass).
- Status: done. Full `npm run build-test` intentionally left for MR. JRW per Epic 2 retro agreement.

