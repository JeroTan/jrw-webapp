# Story 2.4: Join Brand by Invitation or Approval

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin,
I want to join a brand through invitation or approval,
so that I can collaborate on products assigned to that brand.

## Acceptance Criteria

1. Given Admin has pending valid brand invitation, when Admin accepts invitation, then active brand membership is created, and invitation is marked accepted and cannot be reused.
2. Given invitation is expired, revoked, already accepted, or not for current Admin, when Admin accepts invitation, then system returns safe error code, and no membership changes occur.
3. Given Admin requests to join a brand that allows approval flow, when request is submitted, then pending join request is created, and authorized brand member/elevated Admin can approve or reject it.
4. Given authorized approver approves join request, when approval succeeds, then active brand membership is created, and request is marked approved.
5. Given unauthorized Admin attempts to approve/reject join request, when action is submitted, then system returns forbidden error, and request state remains unchanged.
6. Given duplicate active membership or pending request exists, when Admin requests join, then system returns conflict response, and duplicate membership/request is not created.
7. Given membership state changes, when audit/event hooks run, then safe actor, target Admin, brand target, action, timestamp, and request ID are recorded or emitted.
8. Given implementation finishes, when tests run, then tests cover invite accept, invalid invite, join request, approval, rejection, unauthorized approval, duplicate conflict, and audit/event emission, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Task 1: Confirm dependency gate and prerequisites. (AC: 1-8)
  - [ ] Verify Story 2.3 is `done` in sprint status.
  - [ ] Confirm `brands` and `brand_memberships` schema exist in `src/domain/schema/catalog.ts`.
  - [ ] Confirm RBAC guard middleware from Story 1.12 is registered and functional.
  - [ ] Confirm BrandRepository, BrandService, BrandController, and brand routes exist from Stories 2.1/2.2/2.3.
  - [ ] Confirm audit event `brand.member_joined` exists in `src/domain/audit/events.ts` (pre-defined).
  - [ ] Do not start brand join flow without Stories 2.1 + 2.2 + 2.3 foundation complete.

- [ ] Task 2: Add brand join domain rules. (AC: 1-2, 6-7)
  - [ ] Add `acceptBrandInvitation(...)` domain function in `src/domain/brands/brand.ts`.
  - [ ] Add `requestBrandJoin(...)` domain function in `src/domain/brands/brand.ts`.
  - [ ] Add `approveBrandJoinRequest(...)` domain function in `src/domain/brands/brand.ts`.
  - [ ] Add `rejectBrandJoinRequest(...)` domain function in `src/domain/brands/brand.ts`.
  - [ ] Add input/output types: `AcceptBrandInvitationInput`, `AcceptBrandInvitationResult`, `RequestBrandJoinInput`, `RequestBrandJoinResult`, `ApproveBrandJoinRequestInput`, `RejectBrandJoinRequestInput`.
  - [ ] Add failure reason types for join flow: `INVITATION_NOT_FOUND`, `INVITATION_NOT_PENDING`, `INVITATION_NOT_FOR_ACTOR`, `INVITATION_REVOKED`, `JOIN_REQUEST_NOT_FOUND`, `JOIN_REQUEST_NOT_PENDING`, `APPROVER_NOT_AUTHORIZED`.
  - [ ] Create `src/domain/brands/brand.test.ts` additions covering: valid invitation accept, invalid invitation (not pending, not for actor, revoked), valid join request, duplicate membership conflict, duplicate pending request conflict, valid approval, unauthorized approval rejection, valid rejection.

- [ ] Task 3: Extend brand repository boundary for join flow. (AC: 1-4, 6-7)
  - [ ] Extend `src/server/repositories/BrandRepository.ts` with:
    - [ ] `updateMembershipStatus(membershipId, brandId, adminId, newStatus, newRole?)`: transitions PENDING → ACTIVE for accept/approve, or PENDING → REVOKED for reject.
    - [ ] `findPendingInvitationByAdminAndBrand(adminId, brandId)`: finds PENDING membership where adminId matches AND status is PENDING (for invitation accept).
    - [ ] `findPendingJoinRequestByAdminAndBrand(adminId, brandId)`: finds PENDING membership created as join request (no invitedByAdminId or self-requested).
    - [ ] `findActiveBrandMembers(brandId)`: returns all ACTIVE memberships for a brand (for authorization checks on approve/reject).
  - [ ] All DTOs use camelCase; map from snake_case at repository boundary.
  - [ ] Create `src/server/repositories/BrandRepository.test.ts` additions covering: PENDING → ACTIVE transition, PENDING → REVOKED transition, find pending invitation, find pending join request, find active brand members.

- [ ] Task 4: Extend brand service with join/approval flows. (AC: 1-7, 8)
  - [ ] Extend `src/server/services/BrandService.ts` with:
    - [ ] `acceptBrandInvitation(input)`: validates actor has PENDING invitation for target brand, validates invitation is for current actor, transitions membership to ACTIVE, emits `brand.member_joined` audit event.
    - [ ] `requestBrandJoin(input)`: validates actor is not already member (ACTIVE/PENDING), validates brand exists and is not archived, creates PENDING membership (no invitedByAdminId), emits `brand.member_joined` audit event for request creation.
    - [ ] `approveBrandJoinRequest(input)`: validates approver is brand member (OWNER/MEMBER) or SUPER_ADMIN, validates join request exists and is PENDING, transitions to ACTIVE, emits `brand.member_joined` audit event.
    - [ ] `rejectBrandJoinRequest(input)`: validates same authorization as approve, transitions PENDING → REVOKED, emits audit event.
    - [ ] Return `AUTH_REQUIRED` for missing actor, `AUTH_FORBIDDEN` for unauthorized approver, `VALIDATION_FAILED` for invalid target/state, `CONFLICT_STATE` for duplicate membership/request, `PROVIDER_UNAVAILABLE` for D1 failures.
  - [ ] Create `src/server/services/BrandService.test.ts` additions covering: invitation accept success, accept wrong actor denial, accept already-accepted denial, accept revoked invitation denial, join request success, duplicate membership conflict, duplicate pending request conflict, approval success by OWNER, approval success by MEMBER, approval success by SUPER_ADMIN, unauthorized approval denial, rejection success, D1 failure mapping, audit event emission for each flow.

- [ ] Task 5: Add controller methods and API routes. (AC: 1-8)
  - [ ] Extend `src/server/controllers/BrandController.ts` with:
    - [ ] `acceptBrandInvitation(input)`: maps service result to public API envelope.
    - [ ] `requestBrandJoin(input)`: maps service result to public API envelope.
    - [ ] `approveBrandJoinRequest(input)`: maps service result to public API envelope.
    - [ ] `rejectBrandJoinRequest(input)`: maps service result to public API envelope.
  - [ ] Extend `src/server/routes/brands.routes.ts` with:
    - [ ] `POST /api/brands/:id/accept` — accept pending invitation.
    - [ ] `POST /api/brands/:id/join` — request to join brand.
    - [ ] `POST /api/brands/:id/join/:adminId/approve` — approve join request.
    - [ ] `POST /api/brands/:id/join/:adminId/reject` — reject join request.
    - [ ] Request/response schemas for each endpoint using TypeBox.
    - [ ] Route metadata: `routeDetail(...)` with tag `Brands`, auth `{ mode: "required", roles: ["ADMIN", "SUPER_ADMIN"] }`, rate-limit class `admin-write`, documented error codes.
    - [ ] Controller maps service `AppResult` to public API envelopes; no business rules in controller.
  - [ ] Create `src/server/routes/brands.routes.test.ts` additions covering: anonymous accept/join/approve/reject denial, accept success, join success, approve success, unauthorized approve denial, reject success, response schema validation, OpenAPI metadata present, error envelope includes request ID, duplicate join returns 409.

- [ ] Task 6: Add audit event emission for join/approval flows. (AC: 7)
  - [ ] Use existing `src/domain/audit/events.ts` pattern; `brand.member_joined` action constant already exists.
  - [ ] Emit `brand.member_joined` audit event for: invitation accept, join request approval.
  - [ ] Safe details: actor (approver or accepting admin id), action `brand.member_joined`, entity `brand`, entityId (brand id), target admin id, timestamp, request ID.
  - [ ] No secrets/PII in audit details.
  - [ ] Add tests proving audit events are emitted with safe details and no secret fields.

- [ ] Task 7: Validate full flow. (AC: 1-8)
  - [ ] Run targeted tests:
    - `npx vitest run src/domain/brands/brand.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts`
  - [ ] Run `npm run check`.
  - [ ] Run `npm run build-test` after targeted tests pass.
  - [ ] Record exact blockers if any.

### Review Findings

_None yet — story not implemented._

## Dev Notes

### Epic Context

- Story 2.4 builds on Stories 2.1 (Create Brand), 2.2 (Update/Archive Brand), and 2.3 (Invite Admins to Brand).
- Story 2.3 created PENDING memberships as invitations. This story consumes them: Admins accept those PENDING memberships to become ACTIVE members.
- Requirements covered: FR14; supports FR16, FR17, FR18.
- Product truth: JRW is single-store ecommerce. Brands are catalog/collaboration groups only — NOT stores, sellers, merchants, tenants, payout owners, or PayMongo accounts.
- Story 2.5 (Brand Member Visibility and Brand Scope) will depend on this story being complete.

### Dependency Gate

- Stories 2.1, 2.2, and 2.3 must be `done` in sprint status before starting this story.
- Story 2.1 established: `brands` table, `brand_memberships` table, BrandRepository, BrandService, BrandController, `POST /api/brands` route, audit emission for `brand.created`.
- Story 2.2 established: `PATCH /api/brands/:id`, `POST /api/brands/:id/archive`, brand membership authorization checks, audit events `brand.updated`/`brand.archived`.
- Story 2.3 established: `POST /api/brands/:id/invite`, PENDING membership creation as invitation, `brand.member_invited` audit event, brand invitation email notification.
- If Stories 2.1/2.2/2.3 are not `done`, stop and document blocker before proceeding.

### Current Code Intelligence

#### `src/domain/brands/brand.ts` (Stories 2.1 + 2.2 + 2.3)
  - **Current state:** Contains `createBrand(...)`, `updateBrand(...)`, `archiveBrand(...)`, `createBrandInvitation(...)`, `validateBrandInvitationTarget(...)`, plus validation helpers. Types for invitation actor, target, membership state, failure reasons.
  - **What this story changes:** Add `acceptBrandInvitation(...)`, `requestBrandJoin(...)`, `approveBrandJoinRequest(...)`, `rejectBrandJoinRequest(...)` domain functions. Add corresponding input/output types and failure reasons.
  - **What must be preserved:** Existing create/update/archive/invitation flows, validation constants, invitation types. Do not modify existing domain logic.

#### `src/server/repositories/BrandRepository.ts` (Stories 2.1 + 2.2 + 2.3)
  - **Current state:** Contains `createBrand(...)`, `createBrandMembership(...)`, `createBrandWithOwnerMembership(...)`, `updateBrand(...)`, `archiveBrand(...)`, `findBrandBySlug(...)`, `findBrandByName(...)`, `findArchivedBrandByName(...)`, `findBrandById(...)`, `findBrandByIdIncludingArchived(...)`, `findBrandByNameExcluding(...)`, `findBrandBySlugExcluding(...)`, `findArchivedBrandByNameExcluding(...)`, `findMembershipByBrandAndAdmin(...)`, `findAdminById(...)`, `findAdminByEmail(...)`. Uses Drizzle batch for atomic brand+membership creation. DTO mapping snake_case → camelCase.
  - **What this story changes:** Add `updateMembershipStatus(...)` for PENDING → ACTIVE and PENDING → REVOKED transitions. Add `findPendingInvitationByAdminAndBrand(...)` and `findPendingJoinRequestByAdminAndBrand(...)`. Add `findActiveBrandMembers(...)`.
  - **What must be preserved:** Existing create/update/archive/find methods, DTO mapping, batch pattern, type definitions. Do not modify existing repository methods.

#### `src/server/services/BrandService.ts` (Stories 2.1 + 2.2 + 2.3)
  - **Current state:** Contains `createBrand(...)`, `updateBrand(...)`, `archiveBrand(...)`, `inviteAdminToBrand(...)`, `requireAdminActor(...)`, `hasElevatedPermission(...)`, `isActiveBrandMember(...)`, `extractUpdatePatch(...)`, `extractInviteTarget(...)`, `findInviteTargetAdmin(...)`, `sendBrandInvitationEmail(...)`. Audit emission for `brand.created`, `brand.updated`, `brand.archived`, `brand.member_invited`. Uses `evaluateRouteAccess` for RBAC. Returns `AppResult`/`GeneralError` pattern.
  - **What this story changes:** Add `acceptBrandInvitation(...)`, `requestBrandJoin(...)`, `approveBrandJoinRequest(...)`, `rejectBrandJoinRequest(...)` methods. Add authorization checks for approve/reject (must be brand member or SUPER_ADMIN). Add audit event `brand.member_joined` for accept and approve flows.
  - **What must be preserved:** Existing create/update/archive/invite flows, actor validation, error mapping, audit publisher pattern, provider failure detection, membership check pattern, email notification pattern.

#### `src/server/controllers/BrandController.ts` (Stories 2.1 + 2.2 + 2.3)
  - **Current state:** Contains `createBrand(...)`, `updateBrand(...)`, `archiveBrand(...)`, `inviteAdminToBrand(...)` methods. Maps service `AppResult` to HTTP status + API envelope. Uses `errorCodeToHttpStatus`, `apiSuccessWithRequestId`, `apiErrorWithRequestId`.
  - **What this story changes:** Add `acceptBrandInvitation(...)`, `requestBrandJoin(...)`, `approveBrandJoinRequest(...)`, `rejectBrandJoinRequest(...)` controller methods.
  - **What must be preserved:** Existing error mapping, envelope patterns, type definitions.

#### `src/server/routes/brands.routes.ts` (Stories 2.1 + 2.2 + 2.3)
  - **Current state:** Contains `POST /api/brands`, `PATCH /api/brands/:id`, `POST /api/brands/:id/invite`, `POST /api/brands/:id/archive` routes with TypeBox body/response schemas, RBAC guard, OpenAPI metadata. Tags: `Brands`, auth: required ADMIN/SUPER_ADMIN, rate-limit: `admin-write`.
  - **What this story changes:** Add `POST /api/brands/:id/accept`, `POST /api/brands/:id/join`, `POST /api/brands/:id/join/:adminId/approve`, `POST /api/brands/:id/join/:adminId/reject` routes with their own schemas, guards, and OpenAPI metadata.
  - **What must be preserved:** Existing routes, TypeBox schemas, RBAC guard, route metadata pattern.

#### `src/domain/schema/catalog.ts` (Stories 2.1 + 2.2 + 2.3)
  - **Current state:** `brands` table has `status` enum (`ACTIVE`, `ARCHIVED`), `archived_at` nullable text. `brand_memberships` table has `status` enum (`ACTIVE`, `PENDING`, `REVOKED`), `role` enum (`OWNER`, `MEMBER`), `invited_by_admin_id` nullable text. Unique constraint on `(brand_id, admin_id)`.
  - **What this story changes:** No schema changes needed. `PENDING` status, `REVOKED` status, and `invited_by_admin_id` already exist from Story 2.1.
  - **What must be preserved:** Existing schema, enums, constraints, indexes, relations.

#### `src/domain/audit/events.ts` (Stories 2.1 + 2.2 + 2.3)
  - **Current state:** Contains `brand.created`, `brand.updated`, `brand.archived`, `brand.member_invited`, `brand.member_joined`, `brand.member_removed` action constants. `createAuditEvent(...)`, `NoopAuditEventPublisher`, `scrubAuditDetails(...)`.
  - **What this story changes:** Use existing `brand.member_joined` action constant. No new constants needed.
  - **What must be preserved:** Existing audit event structure, scrubbing logic, publisher interface.

#### `src/server/context/request-context.ts` (Epic 1)
  - **Current state:** Derives `requestContext.actor` per request from `jrw_session`. Invalid/ineligible sessions become anonymous `PROSPECT`.
  - **What this story changes:** No changes. Brand routes read `requestContext.actor` as established.
  - **What must be preserved:** Per-request scoping, request ID propagation.

#### `src/lib/api/response.ts` and `src/lib/typebox/api.ts` (Epic 1)
  - **Current state:** Standard envelope helpers, TypeBox schema utilities, `tboxApiSuccess(...)`, `openApiErrorResponses(...)`.
  - **What this story changes:** Reuse existing helpers for brand join endpoints.
  - **What must be preserved:** Existing envelope patterns; do not reintroduce legacy `{ data, message, code }`.

### Architecture Compliance

- Backend/API flow stays Route -> Controller -> Service -> Domain/Repository.
- Pure brand join rules belong in `src/domain/**`; D1/Drizzle, audit emission, and runtime providers belong in `src/server/**` or `src/adapter/**`.
- Public API envelopes remain standard: `{ data, meta }` or `{ error: { code, message, details? } }`.
- All implemented endpoints need TypeBox request/response schemas, OpenAPI detail, auth metadata, rate-limit class, and error codes.
- Server state is authority. UI-only join controls are insufficient.
- Database naming: `snake_case` tables/columns. API JSON: `camelCase`. Map at repository/service boundary.
- Brand membership must be enforced server-side, not only in UI.

### Invitation Accept Flow

- Admin calls `POST /api/brands/:id/accept` with their authenticated session.
- Service validates: actor is authenticated ADMIN/SUPER_ADMIN, actor has PENDING membership for the brand, PENDING membership's adminId matches actor's ID.
- If valid: repository transitions membership status from PENDING → ACTIVE.
- Emit `brand.member_joined` audit event.
- Return standard envelope with updated membership record.
- Error cases: no PENDING invitation found → `VALIDATION_FAILED`, PENDING membership belongs to different admin → `AUTH_FORBIDDEN`, membership already ACTIVE → `CONFLICT_STATE`, membership REVOKED → `VALIDATION_FAILED`.

### Join Request Flow

- Admin calls `POST /api/brands/:id/join` with their authenticated session.
- Service validates: actor is authenticated ADMIN/SUPER_ADMIN, brand exists and is ACTIVE, actor does not already have ACTIVE or PENDING membership for the brand.
- If valid: repository creates PENDING membership with `invitedByAdminId = null` (distinguishes from invitation-created PENDING).
- Emit `brand.member_joined` audit event for request creation.
- Return standard envelope with created PENDING membership record.
- Error cases: brand not found or archived → `CONFLICT_STATE`, actor already has ACTIVE membership → `CONFLICT_STATE`, actor already has PENDING membership/request → `CONFLICT_STATE`.

### Approve/Reject Join Request Flow

- Authorized Admin (brand OWNER/MEMBER or SUPER_ADMIN) calls `POST /api/brands/:id/join/:adminId/approve` or `POST /api/brands/:id/join/:adminId/reject`.
- Service validates: approver is authenticated ADMIN/SUPER_ADMIN, approver has ACTIVE membership in brand (OWNER/MEMBER) OR is SUPER_ADMIN, join request exists and is PENDING for the target admin.
- If approve: repository transitions membership status from PENDING → ACTIVE.
- If reject: repository transitions membership status from PENDING → REVOKED.
- Emit `brand.member_joined` audit event for approval.
- Return standard envelope with updated membership record.
- Error cases: approver not authorized → `AUTH_FORBIDDEN`, join request not found → `VALIDATION_FAILED`, request not PENDING → `CONFLICT_STATE`.

### Brand Join Authorization

- **Accept invitation:** Any authenticated ADMIN/SUPER_ADMIN can accept their own PENDING invitation.
- **Request join:** Any authenticated ADMIN/SUPER_ADMIN can request to join an ACTIVE brand.
- **Approve/reject:** Must have ACTIVE membership in the target brand with role OWNER or MEMBER, OR be SUPER_ADMIN.
- Route-level RBAC guard still requires `ADMIN` or `SUPER_ADMIN` role (from Story 2.1 pattern).
- The service layer adds the brand-specific membership check on top of the route-level RBAC guard.

### PENDING Membership Distinction

- Invitation-created PENDING: `invited_by_admin_id` is set (from Story 2.3).
- Join-request-created PENDING: `invited_by_admin_id` is NULL.
- This distinction allows the service layer to differentiate between "accepting an invitation" and "approving a join request."
- Both transition to ACTIVE when accepted/approved.
- Both transition to REVOKED when rejected/revoked.

### D1 / Drizzle Schema Guardrails

- No new schema changes needed for this story. `brand_memberships` table already has `status` (`ACTIVE`, `PENDING`, `REVOKED`), `role` (`OWNER`, `MEMBER`), and `invited_by_admin_id` columns from Story 2.1.
- Update operation: `UPDATE brand_memberships SET status = 'ACTIVE', updated_at = ? WHERE id = ? AND brand_id = ? AND admin_id = ? AND status = 'PENDING'`.
- Use Drizzle `.update().set().where().returning()` pattern consistent with Story 2.2 update pattern.
- If dev cannot prove current schema supports PENDING → ACTIVE transition, stop and document blocker.

### UI / UX Guardrails

- This story is API/backend only. No UI components are required for Story 2.4.
- UI for brand join/approval management comes in Story 2.7 (Brand Membership UI and Language Guardrails).
- Response shapes should be safe membership DTOs: id, brandId, adminId, role, status, invitedByAdminId, createdAt, updatedAt.
- Do NOT include target admin email, name, or other PII in API responses.

### Language Guardrails (Critical)

- Use "brand", "catalog group", "brand members" in all copy, comments, and documentation.
- NEVER use: seller, merchant, tenant, store owner, payout owner, PayMongo owner for brands.
- JRW is the seller of record. Brands organize catalog collaboration only.
- This language rule applies to: code comments, variable names where reasonable, API response field descriptions, test descriptions, and audit event details.
- Join language: "join brand", "join request", "pending join request", "accept invitation" — NOT "add to store", "grant seller access", "assign merchant".

### Testing Requirements

Minimum before completion:

- Domain tests for join flow: valid invitation accept, invalid invitation (not pending, not for actor, revoked), valid join request, duplicate membership conflict, duplicate pending request conflict, valid approval, unauthorized approval rejection, valid rejection.
- Repository tests for PENDING → ACTIVE transition, PENDING → REVOKED transition, find pending invitation, find pending join request, find active brand members.
- Service tests for invitation accept success, accept wrong actor denial, accept already-accepted denial, accept revoked invitation denial, join request success, duplicate membership conflict, duplicate pending request conflict, approval success by OWNER, approval success by MEMBER, approval success by SUPER_ADMIN, unauthorized approval denial, rejection success, D1 failure mapping, audit event emission for each flow.
- Route tests for auth denial before controller execution, accept success, join success, approve success, unauthorized approve denial, reject success, response schema validation, OpenAPI metadata presence, error envelope with request ID, duplicate join returns 409.
- Audit emission tests proving `brand.member_joined` event with safe details and no secret fields.

Validation commands:

```bash
npx vitest run src/domain/brands/brand.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts
npm run check
npm run build-test
```

## References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.4)
- PRD anchors: `_bmad-output/planning-artifacts/prd.md` (FR14; FR16, FR17, FR18 support)
- Architecture anchors: `_bmad-output/planning-artifacts/architecture.md` (Brand collaboration boundaries; API & Communication Patterns; Data Architecture; Enforcement Guidelines)
- UX anchors: `_bmad-output/planning-artifacts/ux-design-specification.md` (UX-DR15, UX-DR19; brand language rules; catalog group terminology)
- Project context: `_bmad-output/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/2-3-invite-admins-to-brand.md`
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

- Should join request creation emit a notification email to brand owners/members? If so, extend notification boundary with `BrandJoinRequestEmailInput` type.
- Is there a timeout/expiry for PENDING join requests? Currently no expiry field in schema. If needed, document as follow-up story.
- Should SUPER_ADMIN be able to approve join requests for any brand without membership? Current design says yes (elevated permission pattern from Story 2.3).

## Dev Agent Record

### Agent Model Used

- _Not yet set_

### Implementation Plan

- Follow vertical slice pattern established in Epic 1 and Stories 2.1/2.2/2.3: domain rules → repository → service → controller/routes → audit hardening → validation.
- Brand is catalog collaboration group only. Never model as store/seller/tenant.
- No schema changes needed — `PENDING`, `REVOKED` statuses and `invited_by_admin_id` column already exist from Story 2.1.
- Invitation accept: validates PENDING membership belongs to actor, transitions PENDING → ACTIVE.
- Join request: creates PENDING membership with `invitedByAdminId = null`.
- Approve/reject: validates approver is brand member (OWNER/MEMBER) or SUPER_ADMIN, transitions PENDING → ACTIVE or PENDING → REVOKED.
- Keep brand authority server-side; route guards enforce ADMIN/SUPER_ADMIN before controller execution, service layer enforces brand membership + state checks.
- Use standard API envelopes, TypeBox schemas, OpenAPI metadata, and rate-limit class `admin-write`.
- Audit event: `brand.member_joined` (with actor, brand id, target admin id, timestamp).

### Debug Log References

- _Not yet set_

### Completion Notes List

- _Not yet set_

### File List

- _Not yet set_

## Change Log

- 2026-05-18: Story 2.4 context engine created — comprehensive developer guide for brand join by invitation or approval API.
