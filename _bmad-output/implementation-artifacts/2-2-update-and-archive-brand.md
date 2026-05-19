# Story 2.2: Update and Archive Brand

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin with brand permission,
I want to update and archive a brand,
so that JRW can keep brand catalog groups accurate without deleting historical product/order context.

## Acceptance Criteria

1. Given active approved Admin is brand member or has elevated Admin permission, when Admin updates allowed brand fields, then brand details are updated, and response uses standard `{ data, meta }` envelope.
2. Given Admin submits invalid brand update data, when validation runs, then required, format, uniqueness, and conflict rules are enforced, and response uses standard error envelope.
3. Given brand has historical products or orders, when Admin archives brand, then brand is marked archived rather than hard-deleted, and historical product/order references remain readable.
4. Given archived brand exists, when storefront/catalog responses expose brand data, then archived brand behavior follows documented visibility rules, and archived brand cannot be used for new product assignment unless explicitly allowed later.
5. Given non-member Admin without elevated permission attempts update/archive, when request is processed, then system returns forbidden error, and brand state remains unchanged.
6. Given brand update/archive succeeds, when audit/event hooks run, then safe actor, action, brand target, old/new state where safe, timestamp, and request ID are recorded or emitted.
7. Given route contract is complete, when API docs are generated, then update/archive endpoints include auth metadata, request/response schemas, rate-limit class, and error codes.
8. Given implementation finishes, when tests run, then tests cover update success, archive success, invalid data, duplicate conflict, non-member denial, and historical-reference preservation, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Confirm dependency gate and prerequisites. (AC: 1-8)
  - [x] Verify Story 2.1 is `done` in sprint status.
  - [x] Confirm `brands` and `brand_memberships` schema exist in `src/domain/schema/catalog.ts`.
  - [x] Confirm RBAC guard middleware from Story 1.12 is registered and functional.
  - [x] Confirm BrandRepository, BrandService, BrandController, and brand routes exist from Story 2.1.
  - [x] Do not start brand update/archive without Story 2.1 foundation complete.

- [x] Task 2: Add brand update domain rules. (AC: 1-2, 6)
  - [x] Extend `src/domain/brands/brand.ts` with `updateBrand(...)` domain function.
  - [x] Add `validateBrandUpdate(...)` that reuses existing name/slug/description validators from Story 2.1.
  - [x] Add `BrandUpdateResult` type with success/failure shape using `AppResult`/`GeneralError` pattern.
  - [x] Support partial updates: name, slug, description are individually optional in update input.
  - [x] If name changes, re-validate name rules (length 2-120, uniqueness including archived-name conflicts).
  - [x] If slug changes, re-validate slug rules (format, uniqueness).
  - [x] If description changes, validate max length 500.
  - [x] Create `src/domain/brands/brand.test.ts` additions covering: valid partial update, name change with conflict, slug change with conflict, description-only update, invalid name on update, invalid slug on update.

- [x] Task 3: Add brand archive domain rules. (AC: 3-4, 6)
  - [x] Add `archiveBrand(...)` domain function in `src/domain/brands/brand.ts`.
  - [x] Add `BrandArchiveResult` type with success/failure shape.
  - [x] Archive is irreversible in MVP (no unarchive flow yet).
  - [x] Archive sets `status = "ARCHIVED"` and `archived_at = timestamp`.
  - [x] Create domain test covering: archive success, already-archived rejection.

- [x] Task 4: Extend brand repository boundary. (AC: 1-4, 6)
  - [x] Extend `src/server/repositories/BrandRepository.ts` with:
    - [x] `updateBrand(brandId, updateData)`: updates allowed fields, returns updated brand DTO.
    - [x] `archiveBrand(brandId, timestamp)`: sets status to ARCHIVED and archived_at, returns updated brand DTO.
    - [x] `findBrandById(brandId)`: returns brand DTO or null (for lookup by ID before update/archive).
    - [x] `findBrandByIdIncludingArchived(brandId)`: returns brand DTO regardless of status (for archive operation on already-active brand).
    - [x] `findBrandByNameExcluding(brandId, name)`: for uniqueness check excluding self during name update.
    - [x] `findArchivedBrandByNameExcluding(brandId, name)`: for archived-name conflict check excluding self.
    - [x] `findBrandBySlugExcluding(brandId, slug)`: for slug uniqueness check excluding self.
  - [x] Reuse existing Drizzle schema from `src/domain/schema/catalog.ts`; do not add duplicate schema.
  - [x] All DTOs use camelCase; map from snake_case at repository boundary.
  - [x] Create `src/server/repositories/BrandRepository.test.ts` additions covering: update success (full and partial), archive success, find by ID, find by ID including archived, uniqueness checks excluding self.

- [x] Task 5: Extend brand service. (AC: 1-6, 8)
  - [x] Extend `src/server/services/BrandService.ts` with:
    - [x] `updateBrand(input)`: validates actor is brand member (OWNER or MEMBER) or has elevated permission, validates update data through domain rules, checks name/slug uniqueness excluding self, updates brand through repository, emits audit event `brand.updated`.
    - [x] `archiveBrand(input)`: validates actor is brand member (OWNER or MEMBER) or has elevated permission, validates brand exists and is not already archived, archives brand through repository, emits audit event `brand.archived`.
    - [x] Brand membership check: actor must have ACTIVE membership in the target brand with role OWNER or MEMBER. Non-members get `AUTH_FORBIDDEN`.
    - [x] Return `AUTH_REQUIRED` for missing actor, `AUTH_FORBIDDEN` for non-member/ineligible actor, `VALIDATION_FAILED` for invalid update data, `CONFLICT_STATE` for duplicate name/slug or already-archived, `PROVIDER_UNAVAILABLE` for D1 failures.
    - [x] Do not expose internal brand fields or membership internals beyond safe brand DTO.
  - [x] Create `src/server/services/BrandService.test.ts` additions covering: OWNER update success, MEMBER update success, non-member update denial, suspended member denial, valid partial update, duplicate name conflict on update, duplicate slug conflict on update, archived-name conflict on update, OWNER archive success, MEMBER archive success, non-member archive denial, already-archived rejection, D1 failure mapping.

- [x] Task 6: Add controller methods and API routes. (AC: 1-7, 8)
  - [x] Extend `src/server/controllers/BrandController.ts` with:
    - [x] `updateBrand(input)`: maps service result to public API envelope.
    - [x] `archiveBrand(input)`: maps service result to public API envelope.
  - [x] Extend `src/server/routes/brands.routes.ts` with:
    - [x] `PATCH /api/brands/:id` — update brand.
    - [x] `POST /api/brands/:id/archive` — archive brand (POST for action, not DELETE).
    - [x] Request body schema for PATCH: `name` (optional, string, 2-120 chars), `slug` (optional, string, format pattern), `description` (optional, string, max 500 chars). At least one field required.
    - [x] Archive endpoint has no body; brand ID in path.
    - [x] Response: standard `{ data: brand, meta }` envelope on success; `{ error: { code, message, details? } }` on failure.
    - [x] Route metadata: `routeDetail(...)` with tag `Brands`, auth `{ mode: "required", roles: ["ADMIN", "SUPER_ADMIN"] }`, rate-limit class `admin-write`, documented error codes.
    - [x] Controller maps service `AppResult` to public API envelopes; no business rules in controller.
  - [x] Create `src/server/routes/brands.routes.test.ts` additions covering: anonymous update denial, non-member update denial, OWNER update success, response schema validation, anonymous archive denial, non-member archive denial, OWNER archive success, OpenAPI metadata present, error envelope includes request ID.

- [x] Task 7: Add audit event emission for update and archive. (AC: 6)
  - [x] Use existing `src/domain/audit/events.ts` pattern; add action constants `brand.updated` and `brand.archived`.
  - [x] Emit `brand.updated` audit event with: actor (admin id), action `brand.updated`, entity `brand`, entityId (brand id), safe details (changed fields with old/new values where safe, timestamp, request ID), no secrets/PII.
  - [x] Emit `brand.archived` audit event with: actor (admin id), action `brand.archived`, entity `brand`, entityId (brand id), safe details (brand name, slug, timestamp, request ID), no secrets/PII.
  - [x] Add tests proving audit events are emitted with safe details and no secret fields.

- [x] Task 8: Validate full flow. (AC: 1-8)
  - [x] Run targeted tests:
    - `npx vitest run src/domain/brands/brand.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts`
  - [x] Run `npm run check`.
  - [x] Run `npm run build-test` after targeted tests pass.
  - [x] Record exact blockers if any.

### Review Findings

- [x] [Review][Patch] Update route contract did not allow explicit description clearing and service could silently coerce invalid update field types [`src/server/routes/brands.routes.ts`:57] [`src/server/services/BrandService.ts`:159] - fixed by allowing `description: null` in `PATCH /api/brands/:id`, rejecting non-string/non-null update fields with `VALIDATION_FAILED`, and adding route/service coverage.
- [x] [Review][Patch] Concurrent unique-key races during brand update mapped to `PROVIDER_UNAVAILABLE` instead of `CONFLICT_STATE` [`src/server/services/BrandService.ts`:464] - fixed by mapping SQLite unique-constraint failures from update persistence to stable conflict response and adding regression coverage.

## Dev Notes

### Epic Context

- Story 2.2 builds on Story 2.1 (Create Brand as Catalog Group) which established `brands` and `brand_memberships` tables, brand creation flow, and audit emission for `brand.created`.
- Requirements covered: FR13; supports FR16, FR17, FR18, FR19, FR20.
- Product truth: JRW is single-store ecommerce. Brands are catalog/collaboration groups only — NOT stores, sellers, merchants, tenants, payout owners, or PayMongo accounts.
- Brand update/archive is the second story in Epic 2. Foundation from 2.1 must be complete before starting.

### Dependency Gate

- Story 2.1 must be `done` in sprint status before starting this story.
- Story 2.1 established: `brands` table, `brand_memberships` table, BrandRepository, BrandService, BrandController, `POST /api/brands` route, audit emission for `brand.created`.
- If Story 2.1 is not `done`, stop and document blocker before proceeding.

### Current Code Intelligence

#### `src/domain/brands/brand.ts` (Story 2.1)
  - **Current state:** Contains `createBrand(...)`, `generateSlug(...)`, `validateBrandName(...)`, `validateBrandSlug(...)`, `detectBrandCreateConflict(...)`. Validation constants: name 2-120 chars, slug pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`, description max 500.
  - **What this story changes:** Add `updateBrand(...)` and `archiveBrand(...)` domain functions. Add `validateBrandUpdate(...)` for partial update validation.
  - **What must be preserved:** Existing create flow, slug generation, conflict detection, validation constants. Do not modify existing create logic.

#### `src/server/repositories/BrandRepository.ts` (Story 2.1)
  - **Current state:** Contains `createBrand(...)`, `createBrandMembership(...)`, `createBrandWithOwnerMembership(...)`, `findBrandBySlug(...)`, `findBrandByName(...)`, `findArchivedBrandByName(...)`. Uses Drizzle batch for atomic brand+membership creation. DTO mapping snake_case → camelCase.
  - **What this story changes:** Add `updateBrand(...)`, `archiveBrand(...)`, `findBrandById(...)`, `findBrandByIdIncludingArchived(...)`, `findBrandByNameExcluding(...)`, `findBrandBySlugExcluding(...)`, `findArchivedBrandByNameExcluding(...)`.
  - **What must be preserved:** Existing create methods, DTO mapping, batch pattern, type definitions. Do not modify existing repository methods.

#### `src/server/services/BrandService.ts` (Story 2.1)
  - **Current state:** Contains `createBrand(...)`, `requireCreateActor(...)`, audit emission for `brand.created`. Uses `evaluateRouteAccess` for RBAC. Returns `AppResult`/`GeneralError` pattern.
  - **What this story changes:** Add `updateBrand(...)` and `archiveBrand(...)` methods. Add brand membership check (actor must have ACTIVE membership in target brand). Add audit events `brand.updated` and `brand.archived`.
  - **What must be preserved:** Existing create flow, actor validation, error mapping, audit publisher pattern, provider failure detection.

#### `src/server/controllers/BrandController.ts` (Story 2.1)
  - **Current state:** Contains `createBrand(...)` method. Maps service `AppResult` to HTTP status + API envelope. Uses `errorCodeToHttpStatus`, `apiSuccessWithRequestId`, `apiErrorWithRequestId`.
  - **What this story changes:** Add `updateBrand(...)` and `archiveBrand(...)` controller methods.
  - **What must be preserved:** Existing error mapping, envelope patterns, type definitions.

#### `src/server/routes/brands.routes.ts` (Story 2.1)
  - **Current state:** Contains `POST /api/brands` route with TypeBox body/response schemas, RBAC guard, OpenAPI metadata. Tags: `Brands`, auth: required ADMIN/SUPER_ADMIN, rate-limit: `admin-write`.
  - **What this story changes:** Add `PATCH /api/brands/:id` and `POST /api/brands/:id/archive` routes with their own schemas, guards, and OpenAPI metadata.
  - **What must be preserved:** Existing POST /brands route, TypeBox schemas, RBAC guard, route metadata pattern.

#### `src/domain/schema/catalog.ts` (Story 2.1)
  - **Current state:** `brands` table has `status` enum (`ACTIVE`, `ARCHIVED`), `archived_at` nullable text. `brand_memberships` table has `status` enum (`ACTIVE`, `PENDING`, `REVOKED`), `role` enum (`OWNER`, `MEMBER`).
  - **What this story changes:** No schema changes needed. `status` and `archived_at` columns already exist from Story 2.1.
  - **What must be preserved:** Existing schema, enums, constraints, indexes, relations.

#### `src/domain/audit/events.ts` (Story 2.1)
  - **Current state:** Contains `brand.created` action, `createAuditEvent(...)`, `NoopAuditEventPublisher`, `scrubAuditDetails(...)`.
  - **What this story changes:** Add `brand.updated` and `brand.archived` action constants.
  - **What must be preserved:** Existing audit event structure, scrubbing logic, publisher interface.

#### `src/server/context/request-context.ts` (Story 2.1)
  - **Current state after Epic 2.5:** Derives `requestContext.actor` per request from the route realm cookie. Admin brand routes use `jrw_admin_session`; invalid/ineligible/wrong-realm sessions become anonymous `PROSPECT`.
  - **What this story changes:** No changes. Brand routes read `requestContext.actor` as established.
  - **What must be preserved:** Per-request scoping, request ID propagation.

#### `src/lib/api/response.ts` and `src/lib/typebox/api.ts` (Story 2.1)
  - **Current state:** Standard envelope helpers, TypeBox schema utilities, `tboxApiSuccess(...)`, `openApiErrorResponses(...)`.
  - **What this story changes:** Reuse existing helpers for brand update/archive endpoints.
  - **What must be preserved:** Existing envelope patterns; do not reintroduce legacy `{ data, message, code }`.

### Architecture Compliance

- Backend/API flow stays Route -> Controller -> Service -> Domain/Repository.
- Pure brand rules belong in `src/domain/**`; D1/Drizzle, audit emission, and runtime providers belong in `src/server/**` or `src/adapter/**`.
- Public API envelopes remain standard: `{ data, meta }` or `{ error: { code, message, details? } }`.
- All implemented endpoints need TypeBox request/response schemas, OpenAPI detail, auth metadata, rate-limit class, and error codes.
- Server state is authority. UI-only brand controls are insufficient.
- Database naming: `snake_case` tables/columns. API JSON: `camelCase`. Map at repository/service boundary.
- Brand membership must be enforced server-side, not only in UI.
- Archive is soft-delete only. No hard deletes for brands.

### Brand Membership Check for Update/Archive

- Actor must have an **ACTIVE** membership in the target brand.
- Allowed roles: `OWNER` or `MEMBER`.
- Non-members receive `AUTH_FORBIDDEN`.
- Suspended/revoked membership members receive `AUTH_FORBIDDEN`.
- PENDING membership members receive `AUTH_FORBIDDEN` (must accept invitation first).
- This check runs in the service layer, not in the route-level RBAC guard.
- Route-level RBAC guard still requires `ADMIN` or `SUPER_ADMIN` role (from Story 2.1 pattern).
- The service layer adds the brand-specific membership check on top of the route-level RBAC guard.

### D1 / Drizzle Schema Guardrails

- No new schema changes needed for this story. `brands` table already has `status` (`ACTIVE`/`ARCHIVED`) and `archived_at` columns from Story 2.1.
- Update operation: `UPDATE brands SET name = ?, slug = ?, description = ?, updated_at = ? WHERE id = ?`.
- Archive operation: `UPDATE brands SET status = 'ARCHIVED', archived_at = ?, updated_at = ? WHERE id = ?`.
- Use Drizzle `.update().set().where().returning()` pattern consistent with Story 2.1 insert pattern.
- If dev cannot prove current schema supports update/archive operations, stop and document blocker.

### UI / UX Guardrails

- This story is API/backend only. No UI components are required for Story 2.2.
- UI for brand management comes in Story 2.7 (Brand Membership UI and Language Guardrails).
- Brand response shape should remain clean catalog-group metadata only: id, name, slug, description, status, createdAt, updatedAt.
- Archived brand response still returns full brand DTO with `status: "ARCHIVED"` and `archivedAt` timestamp.

### Language Guardrails (Critical)

- Use "brand", "catalog group", "brand members" in all copy, comments, and documentation.
- NEVER use: seller, merchant, tenant, store owner, payout owner, PayMongo owner for brands.
- JRW is the seller of record. Brands organize catalog collaboration only.
- This language rule applies to: code comments, variable names where reasonable, API response field descriptions, test descriptions, and audit event details.

### Testing Requirements

Minimum before completion:

- Domain tests for brand update validation (partial and full), name/slug conflict detection on update, archive domain rules, already-archived rejection.
- Repository tests for update success (full and partial), archive success, find by ID, find by ID including archived, uniqueness checks excluding self.
- Service tests for OWNER/MEMBER update success, non-member update denial, suspended member denial, duplicate name/slug conflict on update, archived-name conflict on update, OWNER/MEMBER archive success, non-member archive denial, already-archived rejection, D1 failure mapping.
- Route tests for auth denial before controller execution, non-member denial, OWNER update/archive success, response schema validation, OpenAPI metadata presence, error envelope with request ID.
- Audit emission tests proving `brand.updated` and `brand.archived` events with safe details and no secret fields.

Validation commands:

```bash
npx vitest run src/domain/brands/brand.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts
npm run check
npm run build-test
```

## References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.2)
- PRD anchors: `_bmad-output/planning-artifacts/prd.md` (FR13; FR16-FR20 support)
- Architecture anchors: `_bmad-output/planning-artifacts/architecture.md` (Brand collaboration boundaries; API & Communication Patterns; Data Architecture; Enforcement Guidelines)
- UX anchors: `_bmad-output/planning-artifacts/ux-design-specification.md` (UX-DR15, UX-DR19; brand language rules; catalog group terminology)
- Project context: `_bmad-output/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/2-1-create-brand-as-catalog-group.md`
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

- None.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Codex CLI agent)

### Implementation Plan

- Follow vertical slice pattern established in Epic 1 and Story 2.1: domain rules → repository → service → controller/routes → audit hardening → validation.
- Brand is catalog collaboration group only. Never model as store/seller/tenant.
- No schema changes needed — `status` and `archived_at` columns already exist from Story 2.1.
- Update supports partial updates (name, slug, description individually optional). At least one field required.
- Archive is soft-delete: sets `status = "ARCHIVED"` and `archived_at = timestamp`. Irreversible in MVP.
- Brand membership check: actor must have ACTIVE membership in target brand with role OWNER or MEMBER.
- Keep brand authority server-side; route guards enforce `ADMIN`/`SUPER_ADMIN` before controller execution, service layer enforces brand membership.
- Use standard API envelopes, TypeBox schemas, OpenAPI metadata, and rate-limit class `admin-write`.
- Audit events: `brand.updated` (with old/new safe values) and `brand.archived` (with brand name, slug, timestamp).

### Debug Log References

- `npx vitest run src/domain/brands/brand.test.ts`
- `npx vitest run src/server/repositories/BrandRepository.test.ts`
- `npx vitest run src/server/services/BrandService.test.ts`
- `npx vitest run src/server/routes/brands.routes.test.ts`
- `npx vitest run src/domain/brands/brand.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts`
- `npm run check`
- `npm run build-test`

### Completion Notes List

- Implemented brand domain update/archive rules with reusable validation and conflict handling (`validateBrandUpdate`, `updateBrand`, `archiveBrand`).
- Extended brand repository with update/archive mutations, ID lookups, uniqueness-excluding checks, and membership lookup for service authorization checks.
- Added brand service `updateBrand` and `archiveBrand` flows with RBAC + brand membership authorization, conflict/provider mapping, and safe audit emission (`brand.updated`, `brand.archived`).
- Added controller and route support for `PATCH /api/brands/:id` and `POST /api/brands/:id/archive` with TypeBox contracts, OpenAPI metadata, and standardized API envelopes.
- Expanded test coverage across domain/repository/service/routes and validated full regression gates (`check` + `build-test`) without blockers.
- Applied review patches for explicit nullable description updates, strict update field type rejection, and stable unique-constraint conflict mapping.

### File List

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-2-update-and-archive-brand.md`
- `src/domain/brands/brand.ts`
- `src/domain/brands/brand.test.ts`
- `src/server/repositories/BrandRepository.ts`
- `src/server/repositories/BrandRepository.test.ts`
- `src/server/services/BrandService.ts`
- `src/server/services/BrandService.test.ts`
- `src/server/controllers/BrandController.ts`
- `src/server/routes/brands.routes.ts`
- `src/server/routes/brands.routes.test.ts`

## Change Log

- 2026-05-17: Implemented Story 2.2 brand update/archive vertical slice (domain, repository, service, controller/routes, tests) and passed `npm run check` + `npm run build-test`.
- 2026-05-17: Applied code review fixes for nullable description update contract, strict update field typing, and update unique-constraint race mapping; validated with targeted Vitest, `npm run check`, and `npm run build-test`; story moved to done.
