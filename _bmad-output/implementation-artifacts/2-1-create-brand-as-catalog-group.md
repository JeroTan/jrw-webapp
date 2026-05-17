# Story 2.1: Create Brand as Catalog Group

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin,
I want to create a brand under JRW,
so that products can be organized and collaborated on without creating separate stores or sellers.

## Acceptance Criteria

1. Given active approved Admin is authenticated, when Admin submits valid brand creation data, then brand is created under JRW as catalog/collaboration group, and creator becomes brand member with appropriate membership role.
2. Given Admin submits brand data, when validation runs, then required fields, uniqueness rules, slug/name format, and archived-name conflicts are enforced, and validation errors use standard error envelope.
3. Given brand is created, when response returns, then response uses standard `{ data, meta }` envelope, and brand response never includes seller, merchant, tenant, payout, or PayMongo-owner fields.
4. Given non-Admin or inactive/unapproved Admin attempts brand creation, when request is processed, then system returns forbidden/unauthorized safe error, and no brand is created.
5. Given brand creation succeeds, when audit/event hooks run, then safe actor, action, brand target, timestamp, and request ID are recorded or emitted for later audit story integration, and no secrets or unnecessary PII are logged.
6. Given route contract is complete, when API docs are generated, then endpoint includes body schema, response schema, auth metadata, rate-limit class, and error codes.
7. Given implementation finishes, when tests run, then tests cover create success, invalid data, duplicate conflict, non-Admin denial, and catalog-group-only response shape, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Confirm dependency gate before coding. (AC: 1-7)
  - [ ] Verify Epic 1 stories are complete (sprint status shows all 1.x stories as `done`).
  - [ ] Confirm `brands` and `brand_memberships` schema exist in `src/domain/schema/catalog.ts` or create new `src/domain/schema/brands.ts`.
  - [ ] Confirm RBAC guard middleware from Story 1.12 is registered and functional.
  - [ ] Do not start brand creation without schema foundation and route guard infrastructure.

- [ ] Add brand schema and Drizzle migration. (AC: 1-2, 5)
  - [ ] Create or extend schema for `brands` table with: `id` (cuid2), `name` (unique, not null), `slug` (unique, not null), `description` (nullable text), `status` (enum: `ACTIVE`, `ARCHIVED`), `created_by_admin_id` (FK to `admins.id`), `archived_at` (nullable), `created_at`, `updated_at`.
  - [ ] Create or extend schema for `brand_memberships` table with: `id` (cuid2), `brand_id` (FK to `brands.id`), `admin_id` (FK to `admins.id`), `role` (enum: `OWNER`, `MEMBER`), `status` (enum: `ACTIVE`, `PENDING`, `REVOKED`), `invited_by_admin_id` (FK to `admins.id`, nullable), `created_at`, `updated_at`.
  - [ ] Add unique constraint `uq_brand_memberships_brand_admin` on `(brand_id, admin_id)`.
  - [ ] Add Drizzle migration file under `migrations/` for both tables.
  - [ ] Add Drizzle relations: `brands` has many `brand_memberships`; `brand_memberships` belongs to `brands` and `admins`.
  - [ ] Schema uses snake_case columns; API DTOs map to camelCase.

- [ ] Add pure brand domain rules. (AC: 1-2, 5, 7)
  - [ ] Create `src/domain/brands/brand.ts`.
  - [ ] Add `createBrand(...)` domain function that validates: name not empty, name length bounds (e.g., 2-120 chars), slug format (lowercase alphanumeric + hyphens, no leading/trailing hyphens), description optional with max length.
  - [ ] Add `generateSlug(name: string): string` helper: lowercase, replace spaces/special chars with hyphens, collapse consecutive hyphens, trim hyphens.
  - [ ] Add `validateBrandName(...)`, `validateBrandSlug(...)` returning stable error codes.
  - [ ] Add `BrandCreationResult` type with success/failure shape using `AppResult`/`GeneralError` pattern.
  - [ ] Create `src/domain/brands/brand.test.ts` covering: valid name/slug generation, empty name rejection, name too long, invalid slug chars, leading/trailing hyphens, duplicate slug detection, archived-name conflict logic.

- [ ] Add brand repository boundary. (AC: 1, 3-5)
  - [ ] Create `src/server/repositories/BrandRepository.ts`.
  - [ ] Implement `createBrand(brandData, adminId)`: inserts brand row, returns safe brand DTO (id, name, slug, description, status, createdAt, updatedAt). No internal fields.
  - [ ] Implement `createBrandMembership(brandId, adminId, role, invitedByAdminId)`: inserts membership row with `ACTIVE` status and `OWNER` role for creator.
  - [ ] Implement `findBrandBySlug(slug)`: returns brand DTO or null.
  - [ ] Implement `findBrandByName(name)`: returns brand DTO or null (for uniqueness check, case-insensitive).
  - [ ] Implement `findArchivedBrandByName(name)`: returns archived brand if exists (for archived-name conflict detection).
  - [ ] Reuse existing Drizzle schema from `src/domain/schema/**`; do not add duplicate brand schema.
  - [ ] All DTOs use camelCase; map from snake_case at repository boundary.
  - [ ] Create `src/server/repositories/BrandRepository.test.ts` covering: create success, unique name/slug enforcement, membership creation, archived brand lookup, safe DTO mapping.

- [ ] Add brand service. (AC: 1-5, 7)
  - [ ] Create `src/server/services/BrandService.ts`.
  - [ ] Require authenticated actor with role `ADMIN` or `SUPER_ADMIN`; reuse Story 1.12 `routeGuard(...)` pattern or `evaluateAdminLifecycleActor(...)`.
  - [ ] On create: validate actor is active approved Admin, validate brand data through domain rules, check name/slug uniqueness (including archived-name conflicts), create brand through repository, create brand membership with `OWNER` role, emit audit event.
  - [ ] Return `AUTH_REQUIRED` for missing actor, `AUTH_FORBIDDEN` for non-Admin/inactive/unapproved/suspended actor, `VALIDATION_FAILED` for invalid brand data, `CONFLICT_STATE` for duplicate name/slug or archived-name conflict, `PROVIDER_UNAVAILABLE` for D1/storage failures.
  - [ ] Do not expose internal brand fields, membership internals, or creator PII beyond safe brand DTO.
  - [ ] Create `src/server/services/BrandService.test.ts` covering: Admin create success, SUPER_ADMIN create success, Customer denial, Prospect denial, suspended Admin denial, unapproved Admin denial, invalid data rejection, duplicate name conflict, duplicate slug conflict, archived-name conflict, D1 failure mapping.

- [ ] Add controller and API routes. (AC: 1-7)
  - [ ] Create `src/server/controllers/BrandController.ts`.
  - [ ] Create `src/server/routes/brands.routes.ts` and register it in `src/server/routes/index.ts`.
  - [ ] Endpoint: `POST /api/brands` — create brand.
  - [ ] Request body schema: `name` (string, required, 2-120 chars), `slug` (string, optional, auto-generated if omitted, lowercase alphanumeric + hyphens), `description` (string, optional, max 500 chars).
  - [ ] Response: standard `{ data: brand, meta }` envelope on success; `{ error: { code, message, details? } }` on failure.
  - [ ] Route metadata: `routeDetail(...)` with tag `Brands`, auth `{ mode: "required", roles: ["ADMIN", "SUPER_ADMIN"] }`, rate-limit class `admin-write`, documented error codes.
  - [ ] Controller maps service `AppResult` to public API envelopes; no business rules in controller.
  - [ ] Update `src/server/routes/route-groups.ts` to include brands route group.
  - [ ] Update `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md` with brand endpoints.
  - [ ] Create `src/server/routes/brands.routes.test.ts` covering: anonymous denial, Customer denial, Admin create success, response schema validation, OpenAPI metadata present, error envelope includes request ID.

- [ ] Add audit event emission. (AC: 5)
  - [ ] Use existing `src/domain/audit/events.ts` pattern; add action `brand.created`.
  - [ ] Emit audit event with: actor (admin id), action `brand.created`, entity `brand`, entityId (brand id), safe details (name, slug, timestamp, request ID), no secrets/PII.
  - [ ] If audit persistence adapter is missing, use `NoopAuditEventPublisher` from existing audit module; document that Epic 7 will add full audit persistence.
  - [ ] Add test proving audit event is emitted with safe details and no secret fields.

- [ ] Validate full flow. (AC: 1-7)
  - [ ] Run targeted tests:
    - `npx vitest run src/domain/brands/brand.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts`
  - [ ] Run `npm run check`.
  - [ ] Run `npm run build-test` after targeted tests pass.
  - [ ] Record exact blockers if schema migration or RBAC guard status prevents completion.

### Review Findings

_(To be filled during code review)_

## Dev Notes

### Epic Context

- Story 2.1 opens Epic 2: Brand Collaboration for JRW Catalog Work.
- Requirements covered: FR12; supports FR16, FR17, FR18, FR19, FR20.
- Product truth: JRW is single-store ecommerce. Brands are catalog/collaboration groups only — NOT stores, sellers, merchants, tenants, payout owners, or PayMongo accounts.
- Brand creation is the foundation for all subsequent brand stories: update/archive (2.2), invitations (2.3), join flows (2.4), visibility (2.5), mutation guards (2.6), and UI/language guardrails (2.7).

### Dependency Gate

- All Epic 1 stories (1.1 through 1.13) must be `done` in sprint status before starting Epic 2.
- Story 1.12 (server-side RBAC guards) must be complete and functional — brand creation routes require `ADMIN` or `SUPER_ADMIN` role enforcement.
- Story 1.2 (API envelopes, request context, audit hooks) must be complete — brand endpoints use standard envelopes and audit emission.
- If any Epic 1 story is not `done`, stop and document blocker before proceeding.

### Current Code Intelligence

- `src/domain/schema/catalog.ts`
  - Current: `products` table has a `brand` text column (legacy pattern, not FK). `categories`, `product_categories`, `product_variants` exist.
  - Change: brand schema should be a proper `brands` table with FK relationships. The legacy `products.brand` text column will need migration in a later story (Epic 3 product-brand assignment).
  - Preserve: existing catalog schema; do not modify product/category/variant tables in this story.

- `src/domain/schema/identity.ts`
  - Current: `admins` table with `id`, `email`, `status`, `is_owner`, `email_verified_at`, `approved_at`, etc. `sessions` table with actor kinds.
  - Change: `brand_memberships.admin_id` will FK to `admins.id`; `created_by_admin_id` on brands also FKs to `admins.id`.
  - Preserve: admin identity schema unchanged.

- `src/domain/audit/events.ts`
  - Current: includes `account.ownership_transferred`, `scrubAuditDetails(...)`, `NoopAuditEventPublisher`.
  - Change: add `brand.created` action constant; reuse scrubber and publisher patterns.
  - Preserve: existing audit action constants and scrubbing logic.

- `src/server/routes/index.ts`
  - Current: registers `foundationRoutes`, `authRoutes`, `googleOAuthRoutes`, `accountRecoveryRoutes`, `customerRoutes`, `adminAccountRoutes`, `ownerGovernanceRoutes`.
  - Change: add `brandsRoutes` import and registration.
  - Preserve: existing route registration order; add brands after owner governance.

- `src/server/routes/route-groups.ts`
  - Current: defines `serverRouteGroups` for route organization.
  - Change: add `brands` route group entry.
  - Preserve: existing route group structure.

- `src/server/app.ts`
  - Current: app order is OpenAPI, CORS, error handling, Astro bridge, request context, routes.
  - Change: register brand routes through `serverRoutes`; do not reorder global middleware.
  - Preserve: Cloudflare adapter, `aot: false`, `normalize: true`, safe error mapping.

- `src/server/context/request-context.ts`
  - Current: derives `requestContext.actor` per request from `jrw_session`; invalid/ineligible sessions become anonymous `PROSPECT`.
  - Change: brand routes read only `requestContext.actor`; no duplicate cookie parsing.
  - Preserve: per-request scoping and request ID propagation.

- `src/lib/api/response.ts` and `src/lib/typebox/api.ts`
  - Current: standard envelope helpers, TypeBox schema utilities, `routeDetail(...)` for OpenAPI metadata.
  - Change: use existing response helpers for brand endpoints; add brand-specific TypeBox schemas.
  - Preserve: existing envelope patterns; do not reintroduce legacy `{ data, message, code }`.

- `src/domain/admins/admin-account.ts`
  - Current: `evaluateAdminLifecycleActor(...)` validates Admin eligibility (active, approved, verified).
  - Change: brand service should reuse this evaluator or equivalent RBAC check before allowing brand creation.
  - Preserve: existing Admin lifecycle domain rules.

### Architecture Compliance

- Backend/API flow stays Route -> Controller -> Service -> Domain/Repository.
- Pure brand rules belong in `src/domain/**`; D1/Drizzle, audit emission, and runtime providers belong in `src/server/**` or `src/adapter/**`.
- Public API envelopes remain standard: `{ data, meta }` or `{ error: { code, message, details? } }`.
- All implemented endpoints need TypeBox request/response schemas, OpenAPI detail, auth metadata, rate-limit class, and error codes.
- Server state is authority. UI-only brand controls are insufficient.
- Database naming: `snake_case` tables/columns. API JSON: `camelCase`. Map at repository/service boundary.
- Money fields: integer centavos (not applicable to brand creation, but keep in mind for future brand-scoped product stories).

### D1 / Drizzle Schema Guardrails

- `brands` table: `id` (cuid2 text PK), `name` (text, unique, not null), `slug` (text, unique, not null), `description` (text, nullable), `status` (text enum: `ACTIVE`/`ARCHIVED`), `created_by_admin_id` (text FK to `admins.id`), `archived_at` (text, nullable), `created_at` (text, default CURRENT_TIMESTAMP), `updated_at` (text, default CURRENT_TIMESTAMP).
- `brand_memberships` table: `id` (cuid2 text PK), `brand_id` (text FK to `brands.id`), `admin_id` (text FK to `admins.id`), `role` (text enum: `OWNER`/`MEMBER`), `status` (text enum: `ACTIVE`/`PENDING`/`REVOKED`), `invited_by_admin_id` (text FK to `admins.id`, nullable), `created_at`, `updated_at`.
- Unique constraint: `uq_brand_memberships_brand_admin` on `(brand_id, admin_id)`.
- Indexes: `idx_brands_slug` on `slug`, `idx_brands_status` on `status`, `idx_brand_memberships_admin` on `admin_id`, `idx_brand_memberships_brand` on `brand_id`.
- Migration must be remote-first: development first, production only after review.
- If dev cannot prove current schema supports brand tables with proper FKs, stop and document blocker.

### UI / UX Guardrails

- This story is API/backend only. No UI components are required for Story 2.1.
- UI for brand management comes in Story 2.7 (Brand Membership UI and Language Guardrails).
- Brand language enforcement in API responses: never include seller, merchant, tenant, store owner, payout owner, or PayMongo owner fields in brand DTOs.
- Brand response shape should be clean catalog-group metadata only: id, name, slug, description, status, createdAt, updatedAt.

### Language Guardrails (Critical)

- Use "brand", "catalog group", "brand members" in all copy, comments, and documentation.
- NEVER use: seller, merchant, tenant, store owner, payout owner, PayMongo owner for brands.
- JRW is the seller of record. Brands organize catalog collaboration only.
- This language rule applies to: code comments, variable names where reasonable, API response field descriptions, test descriptions, and audit event details.

### Testing Requirements

Minimum before completion:

- Domain tests for brand name/slug validation, slug generation, and archived-name conflict detection.
- Repository tests for brand creation, membership creation, unique name/slug enforcement, archived brand lookup, and safe DTO mapping.
- Service tests for Admin/SUPER_ADMIN create success, Customer/Prospect/suspended Admin denial, invalid data rejection, duplicate name/slug conflict, archived-name conflict, and D1 failure mapping.
- Route tests for auth denial before controller execution, Admin create success, response schema validation, OpenAPI metadata presence, and error envelope with request ID.
- Audit emission test proving `brand.created` event with safe details and no secret fields.

Validation commands:

```bash
npx vitest run src/domain/brands/brand.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts
npm run check
npm run build-test
```

## References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.1)
- PRD anchors: `_bmad-output/planning-artifacts/prd.md` (FR12; FR16-FR20 support)
- Architecture anchors: `_bmad-output/planning-artifacts/architecture.md` (Brand collaboration boundaries; API & Communication Patterns; Data Architecture; Enforcement Guidelines)
- UX anchors: `_bmad-output/planning-artifacts/ux-design-specification.md` (UX-DR15, UX-DR19; brand language rules; catalog group terminology)
- Project context: `_bmad-output/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/1-13-ownership-transfer-governance.md`
- Endpoint catalog baseline: `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`
- Cloudflare D1 docs: https://developers.cloudflare.com/d1/worker-api/d1-database/
- Drizzle Cloudflare D1 docs: https://orm.drizzle.team/docs/connect-cloudflare-d1
- Elysia lifecycle docs: https://elysiajs.com/essential/life-cycle

## Open Questions

- None.

## Dev Agent Record

### Agent Model Used

_(To be filled by dev agent)_

### Implementation Plan

- Follow vertical slice pattern established in Epic 1: domain rules → repository → service → controller/routes → audit hardening → validation.
- Brand is catalog collaboration group only. Never model as store/seller/tenant.
- Schema first: create `brands` and `brand_memberships` tables with proper FKs and unique constraints.
- Creator automatically becomes brand member with `OWNER` role upon successful brand creation.
- Keep brand authority server-side; route guards enforce `ADMIN`/`SUPER_ADMIN` before controller execution.
- Use standard API envelopes, TypeBox schemas, OpenAPI metadata, and rate-limit class `admin-write`.

### Debug Log References

_(To be filled by dev agent)_

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story includes AC-complete task map, dependency gate, file-level guardrails, current-code intelligence, schema design, language guardrails, and validation commands.

### File List

_(To be filled by dev agent)_

## Change Log

_(To be filled by dev agent)_
