# Story 2.5: Brand Member Visibility and Brand Scope

Status: done
<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a brand member Admin,
I want to see products assigned to brands I belong to and brandless products I am authorized to manage,
so that my catalog workspace matches my JRW collaboration scope.

## Acceptance Criteria

1. Given active approved Admin belongs to a brand, when Admin lists brand-scoped products, then products assigned to that brand are visible, and response uses standard envelope with request ID.
2. Given Admin belongs to multiple brands, when Admin filters by brand scope, then only products in selected authorized brand scope are returned, and inactive/archived brand visibility follows documented rules.
3. Given authorized Admin accesses brandless products, when brandless scope is requested, then brandless products are visible/manageable according to Admin permission, and UI/API labels brandless as catalog organization choice, not missing seller/store.
4. Given Admin does not belong to a brand and lacks elevated permission, when Admin requests that brand scope, then system returns forbidden or empty authorized result per documented contract, and no product details leak.
5. Given brand scope is returned to UI, when response includes brand metadata, then metadata uses brand/catalog group language only, and no seller, merchant, tenant, payout owner, or PayMongo ownership fields appear.
6. Given route contract is complete, when docs are generated, then query params, response schemas, auth metadata, rate-limit class, and error codes are documented.
7. Given implementation finishes, when tests run, then tests cover single-brand visibility, multi-brand filtering, brandless visibility, non-member denial/no leakage, and archived brand behavior, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Confirm dependency gate and prerequisites. (AC: 1-7)
  - [x] Verify Stories 2.1, 2.2, 2.3, and 2.4 are `done` in sprint status.
  - [x] Confirm `brands` and `brand_memberships` schema exist in `src/domain/schema/catalog.ts`.
  - [x] Confirm RBAC guard middleware from Story 1.12 is registered and functional.
  - [x] Confirm BrandRepository, BrandService, BrandController, and brand routes exist from Stories 2.1/2.2/2.3/2.4.
  - [x] Confirm product domain, repository, service, controller, and routes exist or will be created in Epic 3.
  - [x] Confirm audit event `brand.member_joined` exists in `src/domain/audit/events.ts` (pre-defined).
  - [x] Do not start brand visibility flow without Stories 2.1 + 2.2 + 2.3 + 2.4 foundation complete.

- [x] Task 2: Add brand-scoped product query domain rules. (AC: 1-2, 4-5)
  - [x] Add `listBrandScopedProducts(...)` domain function in `src/domain/catalog/product.ts` (or `src/domain/brands/brand.ts` if product domain not yet established).
  - [x] Add input/output types: `ListBrandScopedProductsInput`, `ListBrandScopedProductsResult`.
  - [x] Add failure reason types: `BRAND_NOT_FOUND`, `BRAND_MEMBERSHIP_REQUIRED`, `BRAND_ARCHIVED`.
  - [x] Domain rules: validate actor is authenticated ADMIN/SUPER_ADMIN, validate actor has ACTIVE membership in target brand OR is SUPER_ADMIN, validate brand exists, handle archived brand visibility per documented rules.
  - [x] Create `src/domain/catalog/product.test.ts` (or extend brand tests) covering: valid brand scope query, multi-brand filtering, archived brand behavior, non-member denial, SUPER_ADMIN elevated access.

- [x] Task 3: Extend brand repository boundary for scoped product queries. (AC: 1-2, 4)
  - [x] Extend `src/server/repositories/BrandRepository.ts` or create `src/server/repositories/ProductRepository.ts` with:
    - [x] `findProductsByBrand(brandId, options?)`: returns products assigned to a brand with pagination.
    - [x] `findBrandlessProducts(options?)`: returns products with no brand assignment.
    - [x] `findBrandsByAdmin(adminId)`: returns all brands where admin has ACTIVE membership.
    - [x] `findBrandByIdIncludingArchived(brandId)`: reuse existing method for archived brand checks.
  - [x] All DTOs use camelCase; map from snake_case at repository boundary.
  - [x] Create repository tests covering: find products by brand, find brandless products, find brands by admin, archived brand visibility.

- [x] Task 4: Extend brand service with visibility flows. (AC: 1-5, 7)
  - [x] Extend `src/server/services/BrandService.ts` or create `src/server/services/ProductService.ts` with:
    - [x] `listBrandScopedProducts(input)`: validates actor membership, validates brand exists, returns paginated products for brand scope.
    - [x] `listBrandlessProducts(input)`: validates actor has elevated permission or brandless access, returns paginated brandless products.
    - [x] `listAdminBrands(input)`: returns all brands where actor has ACTIVE membership.
    - [x] Return `AUTH_REQUIRED` for missing actor, `AUTH_FORBIDDEN` for non-member, `CONFLICT_STATE` for brand not found/archived, `PROVIDER_UNAVAILABLE` for D1 failures.
  - [x] Create service tests covering: single-brand visibility success, multi-brand filtering, brandless visibility, non-member denial, archived brand behavior, SUPER_ADMIN elevated access, D1 failure mapping.

- [x] Task 5: Add controller methods and API routes. (AC: 1-7)
  - [x] Extend `src/server/controllers/BrandController.ts` or create `src/server/controllers/ProductController.ts` with:
    - [x] `listBrandScopedProducts(input)`: maps service result to public API envelope.
    - [x] `listBrandlessProducts(input)`: maps service result to public API envelope.
    - [x] `listAdminBrands(input)`: maps service result to public API envelope.
  - [x] Extend `src/server/routes/brands.routes.ts` or add `src/server/routes/products.routes.ts` with:
    - [x] `GET /api/brands/:id/products` — list products for a brand scope.
    - [x] `GET /api/brands/products/brandless` — list brandless products.
    - [x] `GET /api/brands/me` — list brands where current admin is a member.
    - [x] Query params: `page`, `pageSize`, `status` (optional filter).
    - [x] Request/response schemas using TypeBox.
    - [x] Route metadata: `routeDetail(...)` with tag `Brands` or `Products`, auth `{ mode: "required", roles: ["ADMIN", "SUPER_ADMIN"] }`, rate-limit class `admin-read`, documented error codes.
    - [x] Controller maps service `AppResult` to public API envelopes; no business rules in controller.
  - [x] Create route tests covering: anonymous list denial, brand scope list success, brandless list success, admin brands list success, non-member denial, response schema validation, OpenAPI metadata present, error envelope includes request ID.

- [x] Task 6: Validate full flow. (AC: 1-7)
  - [x] Run targeted tests:
    - `npx vitest run src/domain/catalog/product.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts`
  - [x] Run `npm run check`.
  - [x] Run `npm run build-test` after targeted tests pass.
  - [x] Record exact blockers if any.

### Review Findings

- [x] [Review][Patch] Brand product scope ignored legacy brand references [src/server/repositories/BrandRepository.ts:661] - fixed: repository now matches brand id, name, or slug and returns scoped `brandId`.
- [x] [Review][Patch] Brandless scope missed blank legacy brand values [src/server/repositories/BrandRepository.ts:693] - fixed: null and blank product brand values both normalize as brandless.
- [x] [Review][Patch] Read route error metadata omitted RBAC account-state errors [src/server/routes/brands.routes.ts:264] - fixed: metadata now documents `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`, and `ADMIN_APPROVAL_REQUIRED`.

## Dev Notes

### Epic Context

- Story 2.5 builds on Stories 2.1 (Create Brand), 2.2 (Update/Archive Brand), 2.3 (Invite Admins to Brand), and 2.4 (Join Brand by Invitation or Approval).
- Stories 2.1-2.4 established the brand membership system: brands, memberships, invitations, join requests, approvals. This story consumes that foundation to provide visibility/scoping.
- Requirements covered: FR16, FR19; supports FR20.
- Product truth: JRW is single-store ecommerce. Brands are catalog/collaboration groups only — NOT stores, sellers, merchants, tenants, payout owners, or PayMongo accounts.
- Story 2.6 (Brand-Scoped Product Mutation Guards) will depend on this story being complete.
- Story 2.7 (Brand Membership UI and Language Guardrails) will depend on this story's API contracts.

### Dependency Gate

- Stories 2.1, 2.2, 2.3, and 2.4 must be `done` in sprint status before starting this story.
- Story 2.1 established: `brands` table, `brand_memberships` table, BrandRepository, BrandService, BrandController, `POST /api/brands` route, audit emission for `brand.created`.
- Story 2.2 established: `PATCH /api/brands/:id`, `POST /api/brands/:id/archive`, brand membership authorization checks, audit events `brand.updated`/`brand.archived`.
- Story 2.3 established: `POST /api/brands/:id/invite`, PENDING membership creation as invitation, `brand.member_invited` audit event, brand invitation email notification.
- Story 2.4 established: `POST /api/brands/:id/accept`, `POST /api/brands/:id/join`, `POST /api/brands/:id/join/:adminId/approve`, `POST /api/brands/:id/join/:adminId/reject`, PENDING→ACTIVE/REVOKED transitions, `brand.member_joined` audit event.
- If Stories 2.1/2.2/2.3/2.4 are not `done`, stop and document blocker before proceeding.

### Current Code Intelligence

#### `src/server/repositories/BrandRepository.ts` (Stories 2.1 + 2.2 + 2.3 + 2.4)
  - **Current state:** Contains `createBrand(...)`, `createBrandMembership(...)`, `createBrandWithOwnerMembership(...)`, `updateBrand(...)`, `archiveBrand(...)`, `findBrandBySlug(...)`, `findBrandByName(...)`, `findArchivedBrandByName(...)`, `findBrandById(...)`, `findBrandByIdIncludingArchived(...)`, `findBrandByNameExcluding(...)`, `findBrandBySlugExcluding(...)`, `findArchivedBrandByNameExcluding(...)`, `findMembershipByBrandAndAdmin(...)`, `findAdminById(...)`, `findAdminByEmail(...)`, `updateMembershipStatus(...)`, `findPendingInvitationByAdminAndBrand(...)`, `findPendingJoinRequestByAdminAndBrand(...)`, `findActiveBrandMembers(...)`. Uses Drizzle batch for atomic brand+membership creation. DTO mapping snake_case → camelCase.
  - **What this story changes:** Add `findProductsByBrand(...)`, `findBrandlessProducts(...)`, `findBrandsByAdmin(...)`. These query products by brand scope or return brands for an admin.
  - **What must be preserved:** Existing create/update/archive/find methods, DTO mapping, batch pattern, type definitions. Do not modify existing repository methods.

#### `src/server/services/BrandService.ts` (Stories 2.1 + 2.2 + 2.3 + 2.4)
  - **Current state:** Contains `createBrand(...)`, `updateBrand(...)`, `archiveBrand(...)`, `inviteAdminToBrand(...)`, `acceptBrandInvitation(...)`, `requestBrandJoin(...)`, `approveBrandJoinRequest(...)`, `rejectBrandJoinRequest(...)`, `requireAdminActor(...)`, `hasElevatedPermission(...)`, `isActiveBrandMember(...)`, `extractUpdatePatch(...)`, `extractInviteTarget(...)`, `findInviteTargetAdmin(...)`, `sendBrandInvitationEmail(...)`. Audit emission for `brand.created`, `brand.updated`, `brand.archived`, `brand.member_invited`, `brand.member_joined`, `brand.member_removed`. Uses `evaluateRouteAccess` for RBAC. Returns `AppResult`/`GeneralError` pattern.
  - **What this story changes:** Add `listBrandScopedProducts(...)`, `listBrandlessProducts(...)`, `listAdminBrands(...)` methods. Add brand membership validation for product visibility. Add pagination support.
  - **What must be preserved:** Existing create/update/archive/invite/join flows, actor validation, error mapping, audit publisher pattern, provider failure detection, membership check pattern, email notification pattern.

#### `src/server/controllers/BrandController.ts` (Stories 2.1 + 2.2 + 2.3 + 2.4)
  - **Current state:** Contains `createBrand(...)`, `updateBrand(...)`, `archiveBrand(...)`, `inviteAdminToBrand(...)`, `acceptBrandInvitation(...)`, `requestBrandJoin(...)`, `approveBrandJoinRequest(...)`, `rejectBrandJoinRequest(...)` methods. Maps service `AppResult` to HTTP status + API envelope. Uses `errorCodeToHttpStatus`, `apiSuccessWithRequestId`, `apiErrorWithRequestId`.
  - **What this story changes:** Add `listBrandScopedProducts(...)`, `listBrandlessProducts(...)`, `listAdminBrands(...)` controller methods.
  - **What must be preserved:** Existing error mapping, envelope patterns, type definitions.

#### `src/server/routes/brands.routes.ts` (Stories 2.1 + 2.2 + 2.3 + 2.4)
  - **Current state:** Contains `POST /api/brands`, `PATCH /api/brands/:id`, `POST /api/brands/:id/invite`, `POST /api/brands/:id/accept`, `POST /api/brands/:id/join`, `POST /api/brands/:id/join/:adminId/approve`, `POST /api/brands/:id/join/:adminId/reject`, `POST /api/brands/:id/archive` routes with TypeBox body/response schemas, RBAC guard, OpenAPI metadata. Tags: `Brands`, auth: required ADMIN/SUPER_ADMIN, rate-limit: `admin-write`.
  - **What this story changes:** Add `GET /api/brands/:id/products`, `GET /api/brands/products/brandless`, `GET /api/brands/me` routes with query param schemas, RBAC guard, and OpenAPI metadata. Use rate-limit class `admin-read` for GET endpoints.
  - **What must be preserved:** Existing routes, TypeBox schemas, RBAC guard, route metadata pattern.

#### `src/domain/schema/catalog.ts` (Stories 2.1 + 2.2 + 2.3 + 2.4)
  - **Current state:** `brands` table has `status` enum (`ACTIVE`, `ARCHIVED`), `archived_at` nullable text. `brand_memberships` table has `status` enum (`ACTIVE`, `PENDING`, `REVOKED`), `role` enum (`OWNER`, `MEMBER`), `invited_by_admin_id` nullable text. Unique constraint on `(brand_id, admin_id)`. Products table may or may not exist yet depending on Epic 3 progress.
  - **What this story changes:** No schema changes needed for brand visibility. If products table exists, ensure it has `brand_id` nullable foreign key to `brands`.
  - **What must be preserved:** Existing schema, enums, constraints, indexes, relations.

#### `src/domain/audit/events.ts` (Stories 2.1 + 2.2 + 2.3 + 2.4)
  - **Current state:** Contains `brand.created`, `brand.updated`, `brand.archived`, `brand.member_invited`, `brand.member_joined`, `brand.member_removed` action constants. `createAuditEvent(...)`, `NoopAuditEventPublisher`, `scrubAuditDetails(...)`.
  - **What this story changes:** No new audit events needed. This story is read-only visibility; audit emission is not required for list operations.
  - **What must be preserved:** Existing audit event structure, scrubbing logic, publisher interface.

#### `src/server/context/request-context.ts` (Epic 1)
  - **Current state after Epic 2.5:** Derives `requestContext.actor` per request from the route realm cookie. Admin brand routes use `jrw_admin_session`; invalid/ineligible/wrong-realm sessions become anonymous `PROSPECT`.
  - **What this story changes:** No changes. Brand routes read `requestContext.actor` as established.
  - **What must be preserved:** Per-request scoping, request ID propagation.

#### `src/lib/api/response.ts` and `src/lib/typebox/api.ts` (Epic 1)
  - **Current state:** Standard envelope helpers, TypeBox schema utilities, `tboxApiSuccess(...)`, `openApiErrorResponses(...)`.
  - **What this story changes:** Reuse existing helpers for brand product list endpoints. Add pagination response schema if not already present.
  - **What must be preserved:** Existing envelope patterns; do not reintroduce legacy `{ data, message, code }`.

### Architecture Compliance

- Backend/API flow stays Route -> Controller -> Service -> Domain/Repository.
- Pure brand visibility rules belong in `src/domain/**`; D1/Drizzle, audit emission, and runtime providers belong in `src/server/**` or `src/adapter/**`.
- Public API envelopes remain standard: `{ data, meta }` or `{ error: { code, message, details? } }`.
- All implemented endpoints need TypeBox request/response schemas, OpenAPI detail, auth metadata, rate-limit class, and error codes.
- Server state is authority. UI-only visibility controls are insufficient.
- Database naming: `snake_case` tables/columns. API JSON: `camelCase`. Map at repository/service boundary.
- Brand membership must be enforced server-side, not only in UI.
- Pagination: default page size 20, maximum page size 100 (NFR5).

### Brand Scope Query Flow

- Admin calls `GET /api/brands/:id/products?page=1&pageSize=20`.
- Service validates: actor is authenticated ADMIN/SUPER_ADMIN, actor has ACTIVE membership in the target brand OR is SUPER_ADMIN, brand exists.
- If brand is ARCHIVED: return empty result or documented behavior (do not leak products from archived brands unless explicitly allowed).
- If valid: repository returns paginated products assigned to the brand.
- Return standard envelope with product list and pagination metadata.
- Error cases: brand not found → `CONFLICT_STATE`, actor not a member → `AUTH_FORBIDDEN`, brand archived → `CONFLICT_STATE` or empty result per contract.

### Brandless Product Query Flow

- Admin calls `GET /api/brands/products/brandless?page=1&pageSize=20`.
- Service validates: actor is authenticated ADMIN/SUPER_ADMIN, actor has permission to view brandless products (all ADMIN/SUPER_ADMIN can view brandless).
- If valid: repository returns paginated products with `brand_id = NULL`.
- Return standard envelope with product list and pagination metadata.
- Error cases: no permission → `AUTH_FORBIDDEN`.

### Admin Brands List Flow

- Admin calls `GET /api/brands/me?page=1&pageSize=20`.
- Service validates: actor is authenticated ADMIN/SUPER_ADMIN.
- If valid: repository returns all brands where actor has ACTIVE membership.
- Return standard envelope with brand list and pagination metadata.
- SUPER_ADMIN returns all brands they are members of (same query, elevated permission doesn't change scope).

### Brand Visibility Authorization

- **List brand products:** Must have ACTIVE membership in the target brand with role OWNER or MEMBER, OR be SUPER_ADMIN.
- **List brandless products:** Any authenticated ADMIN/SUPER_ADMIN can view brandless products.
- **List admin brands:** Returns only brands where actor has ACTIVE membership.
- Route-level RBAC guard still requires `ADMIN` or `SUPER_ADMIN` role (from Story 2.1 pattern).
- The service layer adds the brand-specific membership check on top of the route-level RBAC guard.

### Archived Brand Visibility

- Archived brands should NOT return products by default.
- If admin requests products for an archived brand, return `CONFLICT_STATE` with reason `BRAND_ARCHIVED` or return empty result with documented behavior.
- Document the chosen behavior in the story file and tests.
- SUPER_ADMIN may have elevated visibility for archived brands if architecture allows — document if implemented.

### Pagination Standards

- Default page size: 20.
- Maximum page size: 100.
- Query params: `page` (default 1), `pageSize` (default 20, max 100).
- Response includes pagination metadata: `page`, `pageSize`, `totalItems`, `totalPages`.
- Use standard pagination helper if one exists in `src/lib/**` or `src/utils/**`.

### Language Guardrails (Critical)

- Use "brand", "catalog group", "brand members" in all copy, comments, and documentation.
- NEVER use: seller, merchant, tenant, store owner, payout owner, PayMongo owner for brands.
- JRW is the seller of record. Brands organize catalog collaboration only.
- This language rule applies to: code comments, variable names where reasonable, API response field descriptions, test descriptions, and audit event details.
- Brandless language: "brandless", "no brand", "catalog organization choice" — NOT "missing seller", "unassigned store", "orphan product".

### Testing Requirements

Minimum before completion:

- Domain tests for brand scope query: valid brand scope, multi-brand filtering, archived brand behavior, non-member denial, SUPER_ADMIN elevated access.
- Repository tests for find products by brand, find brandless products, find brands by admin, archived brand visibility.
- Service tests for single-brand visibility success, multi-brand filtering, brandless visibility, non-member denial, archived brand behavior, SUPER_ADMIN elevated access, D1 failure mapping.
- Route tests for auth denial before controller execution, brand scope list success, brandless list success, admin brands list success, non-member denial, response schema validation, OpenAPI metadata presence, error envelope with request ID.

Validation commands:

```bash
npx vitest run src/domain/catalog/product.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts
npm run check
npm run build-test
```

## References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.5)
- PRD anchors: `_bmad-output/planning-artifacts/prd.md` (FR16, FR19; supports FR20)
- Architecture anchors: `_bmad-output/planning-artifacts/architecture.md` (Brand collaboration boundaries; API & Communication Patterns; Data Architecture; Enforcement Guidelines)
- UX anchors: `_bmad-output/planning-artifacts/ux-design-specification.md` (UX-DR15, UX-DR19; brand language rules; catalog group terminology)
- Project context: `_bmad-output/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/2-4-join-brand-by-invitation-or-approval.md`
- Existing brand domain: `src/domain/brands/brand.ts`
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

- Should archived brand product visibility return empty result or `CONFLICT_STATE` error? Current design leans toward `CONFLICT_STATE` with reason `BRAND_ARCHIVED` for explicit feedback.
- Should SUPER_ADMIN be able to view products for any brand regardless of membership? Current design says SUPER_ADMIN can view any brand's products (elevated permission pattern from Story 2.3/2.4).
- Is there a need for a combined "all my brands' products" endpoint? Currently separate per-brand queries; could be added as follow-up if UX requires.
- Should product response include brand metadata (name, slug) or just brandId? Current design includes brandId; full brand metadata can be fetched via `GET /api/brands/me` or individual brand endpoints.

## Dev Agent Record

### Agent Model Used

- GPT-5 Codex

### Implementation Plan

- Follow vertical slice pattern established in Epic 1 and Stories 2.1/2.2/2.3/2.4: domain rules → repository → service → controller/routes → validation.
- Brand is catalog collaboration group only. Never model as store/seller/tenant.
- No schema changes needed — brand membership and product brand_id already exist.
- Brand scope query: validates ACTIVE membership, returns paginated products for brand.
- Brandless query: validates ADMIN/SUPER_ADMIN, returns paginated products with no brand.
- Admin brands list: returns all brands where actor has ACTIVE membership.
- Keep brand authority server-side; route guards enforce ADMIN/SUPER_ADMIN before controller execution, service layer enforces brand membership + scope checks.
- Use standard API envelopes, TypeBox schemas, OpenAPI metadata, and rate-limit class `admin-read` for GET endpoints.
- No audit events needed for read-only visibility operations.

### Debug Log References

- `npx vitest run src/domain/catalog/product.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts` (pass).
- `npm run check` (pass after fixing new type errors).
- `npm run build-test` (pass).

### Completion Notes List

- Added domain visibility decision module for brand-scoped access with explicit failure reasons: `BRAND_NOT_FOUND`, `BRAND_MEMBERSHIP_REQUIRED`, `BRAND_ARCHIVED`.
- Extended `BrandRepository` with `findProductsByBrand(...)`, `findBrandlessProducts(...)`, and `findBrandsByAdmin(...)`, including pagination metadata and camelCase DTO mapping.
- Extended `BrandService` with `listBrandScopedProducts(...)`, `listBrandlessProducts(...)`, and `listAdminBrands(...)`, including actor/membership checks and provider failure mapping.
- Extended `BrandController` and `brands.routes.ts` with:
  - `GET /api/brands/:id/products`
  - `GET /api/brands/products/brandless`
  - `GET /api/brands/me`
- Added TypeBox query/response contracts, OpenAPI metadata, auth metadata, and `admin-read` rate-limit class support for read endpoints.
- Added/updated tests across domain, repository, service, and route layers for multi-brand filtering, brandless visibility, non-member denial, archived behavior, request-ID envelope shape, and OpenAPI docs.

### File List

- src/domain/catalog/product.ts
- src/domain/catalog/product.test.ts
- src/server/repositories/BrandRepository.ts
- src/server/repositories/BrandRepository.test.ts
- src/server/services/BrandService.ts
- src/server/services/BrandService.test.ts
- src/server/controllers/BrandController.ts
- src/server/routes/brands.routes.ts
- src/server/routes/brands.routes.test.ts
- src/server/openapi/route-metadata.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/2-5-brand-member-visibility-and-brand-scope.md

## Change Log

- 2026-05-18: Story 2.5 context engine created — comprehensive developer guide for brand member visibility and brand scope API.
- 2026-05-18: Implemented brand member visibility and brand scope APIs with full domain/repository/service/controller/route coverage and validation gates passing.
