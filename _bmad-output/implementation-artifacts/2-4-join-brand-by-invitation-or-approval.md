# Story 2.4: Join Brand by Invitation or Approval

Status: done

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

- [x] Task 1: Confirm dependency gate and prerequisites. (AC: 1-8)
  - [x] Verify Story 2.3 is `done` in sprint status.
  - [x] Confirm `brands` and `brand_memberships` schema exist in `src/domain/schema/catalog.ts`.
  - [x] Confirm RBAC guard middleware from Story 1.12 is registered and functional.
  - [x] Confirm BrandRepository, BrandService, BrandController, and brand routes exist from Stories 2.1/2.2/2.3.
  - [x] Confirm audit event `brand.member_joined` exists in `src/domain/audit/events.ts` (pre-defined).
  - [x] Do not start brand join flow without Stories 2.1 + 2.2 + 2.3 foundation complete.

- [x] Task 2: Add brand join domain rules. (AC: 1-2, 6-7)
  - [x] Add `acceptBrandInvitation(...)` domain function in `src/domain/brands/brand.ts`.
  - [x] Add `requestBrandJoin(...)` domain function in `src/domain/brands/brand.ts`.
  - [x] Add `approveBrandJoinRequest(...)` domain function in `src/domain/brands/brand.ts`.
  - [x] Add `rejectBrandJoinRequest(...)` domain function in `src/domain/brands/brand.ts`.
  - [x] Add input/output types: `AcceptBrandInvitationInput`, `AcceptBrandInvitationResult`, `RequestBrandJoinInput`, `RequestBrandJoinResult`, `ApproveBrandJoinRequestInput`, `RejectBrandJoinRequestInput`.
  - [x] Add failure reason types for join flow: `INVITATION_NOT_FOUND`, `INVITATION_NOT_PENDING`, `INVITATION_NOT_FOR_ACTOR`, `INVITATION_REVOKED`, `JOIN_REQUEST_NOT_FOUND`, `JOIN_REQUEST_NOT_PENDING`, `APPROVER_NOT_AUTHORIZED`.
  - [x] Create `src/domain/brands/brand.test.ts` additions covering: valid invitation accept, invalid invitation (not pending, not for actor, revoked), valid join request, duplicate membership conflict, duplicate pending request conflict, valid approval, unauthorized approval rejection, valid rejection.

- [x] Task 3: Extend brand repository boundary for join flow. (AC: 1-4, 6-7)
  - [x] Extend `src/server/repositories/BrandRepository.ts` with:
    - [x] `updateMembershipStatus(membershipId, brandId, adminId, newStatus, newRole?)`: transitions PENDING â†’ ACTIVE for accept/approve, or PENDING â†’ REVOKED for reject.
    - [x] `findPendingInvitationByAdminAndBrand(adminId, brandId)`: finds PENDING membership where adminId matches AND status is PENDING (for invitation accept).
    - [x] `findPendingJoinRequestByAdminAndBrand(adminId, brandId)`: finds PENDING membership created as join request (no invitedByAdminId or self-requested).
    - [x] `findActiveBrandMembers(brandId)`: returns all ACTIVE memberships for a brand (for authorization checks on approve/reject).
  - [x] All DTOs use camelCase; map from snake_case at repository boundary.
  - [x] Create `src/server/repositories/BrandRepository.test.ts` additions covering: PENDING â†’ ACTIVE transition, PENDING â†’ REVOKED transition, find pending invitation, find pending join request, find active brand members.

- [x] Task 4: Extend brand service with join/approval flows. (AC: 1-7, 8)
  - [x] Extend `src/server/services/BrandService.ts` with:
    - [x] `acceptBrandInvitation(input)`: validates actor has PENDING invitation for target brand, validates invitation is for current actor, transitions membership to ACTIVE, emits `brand.member_joined` audit event.
    - [x] `requestBrandJoin(input)`: validates actor is not already member (ACTIVE/PENDING), validates brand exists and is not archived, creates PENDING membership (no invitedByAdminId), emits `brand.member_joined` audit event for request creation.
    - [x] `approveBrandJoinRequest(input)`: validates approver is brand member (OWNER/MEMBER) or SUPER_ADMIN, validates join request exists and is PENDING, transitions to ACTIVE, emits `brand.member_joined` audit event.
    - [x] `rejectBrandJoinRequest(input)`: validates same authorization as approve, transitions PENDING â†’ REVOKED, emits audit event.
    - [x] Return `AUTH_REQUIRED` for missing actor, `AUTH_FORBIDDEN` for unauthorized approver, `VALIDATION_FAILED` for invalid target/state, `CONFLICT_STATE` for duplicate membership/request, `PROVIDER_UNAVAILABLE` for D1 failures.
  - [x] Create `src/server/services/BrandService.test.ts` additions covering: invitation accept success, accept wrong actor denial, accept already-accepted denial, accept revoked invitation denial, join request success, duplicate membership conflict, duplicate pending request conflict, approval success by OWNER, approval success by MEMBER, approval success by SUPER_ADMIN, unauthorized approval denial, rejection success, D1 failure mapping, audit event emission for each flow.

- [x] Task 5: Add controller methods and API routes. (AC: 1-8)
  - [x] Extend `src/server/controllers/BrandController.ts` with:
    - [x] `acceptBrandInvitation(input)`: maps service result to public API envelope.
    - [x] `requestBrandJoin(input)`: maps service result to public API envelope.
    - [x] `approveBrandJoinRequest(input)`: maps service result to public API envelope.
    - [x] `rejectBrandJoinRequest(input)`: maps service result to public API envelope.
  - [x] Extend `src/server/routes/brands.routes.ts` with:
    - [x] `POST /api/brands/:id/accept` â€” accept pending invitation.
    - [x] `POST /api/brands/:id/join` â€” request to join brand.
    - [x] `POST /api/brands/:id/join/:adminId/approve` â€” approve join request.
    - [x] `POST /api/brands/:id/join/:adminId/reject` â€” reject join request.
    - [x] Request/response schemas for each endpoint using TypeBox.
    - [x] Route metadata: `routeDetail(...)` with tag `Brands`, auth `{ mode: "required", roles: ["ADMIN", "SUPER_ADMIN"] }`, rate-limit class `admin-write`, documented error codes.
    - [x] Controller maps service `AppResult` to public API envelopes; no business rules in controller.
  - [x] Create `src/server/routes/brands.routes.test.ts` additions covering: anonymous accept/join/approve/reject denial, accept success, join success, approve success, unauthorized approve denial, reject success, response schema validation, OpenAPI metadata present, error envelope includes request ID, duplicate join returns 409.

- [x] Task 6: Add audit event emission for join/approval flows. (AC: 7)
  - [x] Use existing `src/domain/audit/events.ts` pattern; `brand.member_joined` action constant already exists.
  - [x] Emit `brand.member_joined` audit event for: invitation accept, join request approval.
  - [x] Safe details: actor (approver or accepting admin id), action `brand.member_joined`, entity `brand`, entityId (brand id), target admin id, timestamp, request ID.
  - [x] No secrets/PII in audit details.
  - [x] Add tests proving audit events are emitted with safe details and no secret fields.

- [x] Task 7: Validate full flow. (AC: 1-8)
  - [x] Run targeted tests:
    - `npx vitest run src/domain/brands/brand.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts`
  - [x] Run `npm run check`.
  - [x] Run `npm run build-test` after targeted tests pass.
  - [x] Record exact blockers if any.

### Review Findings

_None yet â€” story not implemented._

## Dev Notes

### Epic Context

- Story 2.4 builds on Stories 2.1 (Create Brand), 2.2 (Update/Archive Brand), and 2.3 (Invite Admins to Brand).
- Story 2.3 created PENDING memberships as invitations. This story consumes them: Admins accept those PENDING memberships to become ACTIVE members.
- Requirements covered: FR14; supports FR16, FR17, FR18.
- Product truth: JRW is single-store ecommerce. Brands are catalog/collaboration groups only â€” NOT stores, sellers, merchants, tenants, payout owners, or PayMongo accounts.
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
  - **Current state:** Contains `createBrand(...)`, `createBrandMembership(...)`, `createBrandWithOwnerMembership(...)`, `updateBrand(...)`, `archiveBrand(...)`, `findBrandBySlug(...)`, `findBrandByName(...)`, `findArchivedBrandByName(...)`, `findBrandById(...)`, `findBrandByIdIncludingArchived(...)`, `findBrandByNameExcluding(...)`, `findBrandBySlugExcluding(...)`, `findArchivedBrandByNameExcluding(...)`, `findMembershipByBrandAndAdmin(...)`, `findAdminById(...)`, `findAdminByEmail(...)`. Uses Drizzle batch for atomic brand+membership creation. DTO mapping snake_case â†’ camelCase.
  - **What this story changes:** Add `updateMembershipStatus(...)` for PENDING â†’ ACTIVE and PENDING â†’ REVOKED transitions. Add `findPendingInvitationByAdminAndBrand(...)` and `findPendingJoinRequestByAdminAndBrand(...)`. Add `findActiveBrandMembers(...)`.
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
- If valid: repository transitions membership status from PENDING â†’ ACTIVE.
- Emit `brand.member_joined` audit event.
- Return standard envelope with updated membership record.
- Error cases: no PENDING invitation found â†’ `VALIDATION_FAILED`, PENDING membership belongs to different admin â†’ `AUTH_FORBIDDEN`, membership already ACTIVE â†’ `CONFLICT_STATE`, membership REVOKED â†’ `VALIDATION_FAILED`.

### Join Request Flow

- Admin calls `POST /api/brands/:id/join` with their authenticated session.
- Service validates: actor is authenticated ADMIN/SUPER_ADMIN, brand exists and is ACTIVE, actor does not already have ACTIVE or PENDING membership for the brand.
- If valid: repository creates PENDING membership with `invitedByAdminId = null` (distinguishes from invitation-created PENDING).
- Emit `brand.member_joined` audit event for request creation.
- Return standard envelope with created PENDING membership record.
- Error cases: brand not found or archived â†’ `CONFLICT_STATE`, actor already has ACTIVE membership â†’ `CONFLICT_STATE`, actor already has PENDING membership/request â†’ `CONFLICT_STATE`.

### Approve/Reject Join Request Flow

- Authorized Admin (brand OWNER/MEMBER or SUPER_ADMIN) calls `POST /api/brands/:id/join/:adminId/approve` or `POST /api/brands/:id/join/:adminId/reject`.
- Service validates: approver is authenticated ADMIN/SUPER_ADMIN, approver has ACTIVE membership in brand (OWNER/MEMBER) OR is SUPER_ADMIN, join request exists and is PENDING for the target admin.
- If approve: repository transitions membership status from PENDING â†’ ACTIVE.
- If reject: repository transitions membership status from PENDING â†’ REVOKED.
- Emit `brand.member_joined` audit event for approval.
- Return standard envelope with updated membership record.
- Error cases: approver not authorized â†’ `AUTH_FORBIDDEN`, join request not found â†’ `VALIDATION_FAILED`, request not PENDING â†’ `CONFLICT_STATE`.

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
- If dev cannot prove current schema supports PENDING â†’ ACTIVE transition, stop and document blocker.

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
- Join language: "join brand", "join request", "pending join request", "accept invitation" â€” NOT "add to store", "grant seller access", "assign merchant".

### Testing Requirements

Minimum before completion:

- Domain tests for join flow: valid invitation accept, invalid invitation (not pending, not for actor, revoked), valid join request, duplicate membership conflict, duplicate pending request conflict, valid approval, unauthorized approval rejection, valid rejection.
- Repository tests for PENDING â†’ ACTIVE transition, PENDING â†’ REVOKED transition, find pending invitation, find pending join request, find active brand members.
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

- GPT-5 Codex

### Implementation Plan

- Follow vertical slice pattern established in Epic 1 and Stories 2.1/2.2/2.3: domain rules â†’ repository â†’ service â†’ controller/routes â†’ audit hardening â†’ validation.
- Brand is catalog collaboration group only. Never model as store/seller/tenant.
- No schema changes needed â€” `PENDING`, `REVOKED` statuses and `invited_by_admin_id` column already exist from Story 2.1.
- Invitation accept: validates PENDING membership belongs to actor, transitions PENDING â†’ ACTIVE.
- Join request: creates PENDING membership with `invitedByAdminId = null`.
- Approve/reject: validates approver is brand member (OWNER/MEMBER) or SUPER_ADMIN, transitions PENDING â†’ ACTIVE or PENDING â†’ REVOKED.
- Keep brand authority server-side; route guards enforce ADMIN/SUPER_ADMIN before controller execution, service layer enforces brand membership + state checks.
- Use standard API envelopes, TypeBox schemas, OpenAPI metadata, and rate-limit class `admin-write`.
- Audit event: `brand.member_joined` (with actor, brand id, target admin id, timestamp).

### Debug Log References

- 2026-05-18T08:51:00+08:00: Dependency gate checked; Story 2.3 in sprint status = review.
- 2026-05-18T08:59:00+08:00: User override received to proceed with Story 2.4 implementation.
- 2026-05-18T09:19:00+08:00: npx vitest run src/domain/brands/brand.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts passed (78 tests).
- 2026-05-18T09:27:00+08:00: npm run check passed (0 errors, 2 existing hints).
- 2026-05-18T09:31:00+08:00: npm run build-test failed due pre-existing src/server/repositories/OwnershipTransferRepository.test.ts timeouts (2 tests), unrelated to Story 2.4 changes.

### Completion Notes List

- Implemented full brand join flow: invitation accept, join request create, approve request, reject request.
- Added domain join rules and failure reasons with pure domain tests.
- Extended repository with pending invitation/join request queries, pending-status transitions, and active-member query.
- Extended service/controller/routes with 4 new API endpoints and standard envelopes.
- Added audit emission coverage for join flow transitions with safe detail assertions.
- Validation: targeted tests and npm run check passed.
- Blocker recorded: npm run build-test failed from unrelated pre-existing OwnershipTransferRepository timeout tests.

### File List

- _bmad-output/implementation-artifacts/2-4-join-brand-by-invitation-or-approval.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/domain/brands/brand.ts
- src/domain/brands/brand.test.ts
- src/server/repositories/BrandRepository.ts
- src/server/repositories/BrandRepository.test.ts
- src/server/services/BrandService.ts
- src/server/services/BrandService.test.ts
- src/server/controllers/BrandController.ts
- src/server/routes/brands.routes.ts
- src/server/routes/brands.routes.test.ts
## Change Log

- 2026-05-18: Story 2.4 context engine created â€” comprehensive developer guide for brand join by invitation or approval API.
- 2026-05-18: Development halted at Task 1 dependency gate because Story 2.3 remains `review` in sprint status.

- 2026-05-18: Implemented brand join by invitation or approval flow end-to-end across domain, repository, service, controller, routes, and tests.
- 2026-05-18: Validation complete for targeted flow and type checks; full build-test blocked by unrelated pre-existing OwnershipTransferRepository test timeouts.


