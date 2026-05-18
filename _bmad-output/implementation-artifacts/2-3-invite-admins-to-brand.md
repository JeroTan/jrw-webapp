# Story 2.3: Invite Admins to Brand

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a brand member Admin with permission,
I want to invite another Admin to a brand,
so that JRW catalog work can be shared inside a brand group.

## Acceptance Criteria

1. Given active approved Admin has permission to invite to a brand, when Admin invites another existing Admin, then pending brand membership invitation is created, and invited Admin is notified when email notifications are enabled.
2. Given invite target is not an Admin, is suspended, or does not exist, when invitation is submitted, then system returns safe validation/error response, and no pending membership is created.
3. Given duplicate active membership or pending invite already exists, when invitation is submitted, then system returns conflict error, and no duplicate invitation is created.
4. Given inviting Admin is not brand member and lacks elevated permission, when invitation is submitted, then system returns forbidden error, and no invitation is created.
5. Given invitation is created, when response returns, then response uses standard envelope, and does not expose unnecessary invited Admin PII.
6. Given invitation succeeds, when audit/event hooks run, then safe actor, target Admin, brand target, action, timestamp, and request ID are recorded or emitted.
7. Given route contract is complete, when API docs are generated, then endpoint includes auth metadata, schemas, rate-limit class, and error codes.
8. Given implementation finishes, when tests run, then tests cover invite success, non-Admin target, suspended target, duplicate invite, non-member denial, and safe notification payload, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Confirm dependency gate and prerequisites. (AC: 1-8)
  - [x] Verify Story 2.2 is `done` in sprint status.
  - [x] Confirm `brands` and `brand_memberships` schema exist in `src/domain/schema/catalog.ts`.
  - [x] Confirm RBAC guard middleware from Story 1.12 is registered and functional.
  - [x] Confirm BrandRepository, BrandService, BrandController, and brand routes exist from Stories 2.1/2.2.
  - [x] Confirm audit event `brand.member_invited` exists in `src/domain/audit/events.ts` (pre-defined).
  - [x] Do not start brand invitation flow without Stories 2.1 + 2.2 foundation complete.

- [x] Task 2: Add brand invitation domain rules. (AC: 1-3, 6)
  - [x] Add `createBrandInvitation(...)` domain function in `src/domain/brands/brand.ts`.
  - [x] Add `validateBrandInvitationTarget(...)` that validates target admin is eligible (exists, is ADMIN role, not suspended, not already member, not already pending).
  - [x] Add `BrandInvitationDraft` type with success/failure shape using `AppResult`/`GeneralError` pattern.
  - [x] Domain function receives: inviting actor, target admin ID, brand ID, current brand membership state, existing membership state.
  - [x] Return `VALIDATION_FAILED` for non-Admin target, suspended target, or missing target.
  - [x] Return `CONFLICT_STATE` for duplicate active membership or pending invitation.
  - [x] Create `src/domain/brands/brand.test.ts` additions covering: valid invitation draft, non-Admin target rejection, suspended target rejection, duplicate active membership conflict, duplicate pending invite conflict.

- [x] Task 3: Extend brand repository boundary for invitations. (AC: 1-3, 6)
  - [x] Extend `src/server/repositories/BrandRepository.ts` with:
    - [x] `createBrandMembership(input)`: creates PENDING membership with `invitedByAdminId` set (already exists from Story 2.1 â€” confirm it supports PENDING status).
    - [x] `findMembershipByBrandAndAdmin(brandId, adminId)`: already exists from Story 2.2 â€” confirm it returns PENDING memberships too.
    - [x] `findAdminById(adminId)`: returns admin record or null (for target validation â€” check if exists in existing account repository or needs to be added).
    - [x] `findAdminByEmail(email)`: if needed for target lookup by email instead of ID.
  - [x] If admin lookup repository does not exist, check `src/server/repositories/` for account-related repository from Epic 1 stories.
  - [x] All DTOs use camelCase; map from snake_case at repository boundary.
  - [x] Create `src/server/repositories/BrandRepository.test.ts` additions covering: PENDING membership creation, find membership for pending invite, admin lookup for target validation.

- [x] Task 4: Extend brand service with invitation flow. (AC: 1-6, 8)
  - [x] Extend `src/server/services/BrandService.ts` with:
    - [x] `inviteAdminToBrand(input)`: validates actor is brand member (OWNER or MEMBER) or has elevated SUPER_ADMIN permission, validates target admin exists and is eligible, checks for duplicate membership/invite, creates PENDING membership through repository, emits audit event `brand.member_invited`, sends notification email when enabled.
    - [x] Actor validation: must have ACTIVE membership in target brand with role OWNER or MEMBER, OR be SUPER_ADMIN.
    - [x] Target validation: must exist as ADMIN role, not suspended, not already member (ACTIVE/PENDING), not already has pending invite to this brand.
    - [x] Return `AUTH_REQUIRED` for missing actor, `AUTH_FORBIDDEN` for non-member/ineligible actor, `VALIDATION_FAILED` for invalid target, `CONFLICT_STATE` for duplicate membership/invite, `PROVIDER_UNAVAILABLE` for D1 failures.
    - [x] Do not expose internal membership details or target admin PII beyond safe admin ID and role.
    - [x] Email notification: use existing notification boundary pattern from Epic 1 (check `src/domain/notifications/account-emails.ts` for pattern). Add `sendBrandInvitationEmail` to notification boundary if not present.
  - [x] Create `src/server/services/BrandService.test.ts` additions covering: OWNER invite success, MEMBER invite success, SUPER_ADMIN elevated invite success, non-member invite denial, suspended target rejection, non-Admin target rejection, duplicate active membership conflict, duplicate pending invite conflict, target not found, safe notification payload, audit event emission, D1 failure mapping.

- [x] Task 5: Add controller method and API route. (AC: 1-7, 8)
  - [x] Extend `src/server/controllers/BrandController.ts` with:
    - [x] `inviteAdminToBrand(input)`: maps service result to public API envelope.
  - [x] Extend `src/server/routes/brands.routes.ts` with:
    - [x] `POST /api/brands/:id/invite` â€” invite admin to brand.
    - [x] Request body schema: `adminId` (string, required) â€” the target admin to invite. Optionally support `email` for lookup if adminId not known.
    - [x] Response: standard `{ data: invitation, meta }` envelope on success; `{ error: { code, message, details? } }` on failure.
    - [x] Invitation response shape: `{ id, brandId, adminId, role, status, invitedByAdminId, createdAt, updatedAt }` â€” safe membership DTO, no PII.
    - [x] Route metadata: `routeDetail(...)` with tag `Brands`, auth `{ mode: "required", roles: ["ADMIN", "SUPER_ADMIN"] }`, rate-limit class `admin-write`, documented error codes.
    - [x] Controller maps service `AppResult` to public API envelopes; no business rules in controller.
  - [x] Create `src/server/routes/brands.routes.test.ts` additions covering: anonymous invite denial, non-member invite denial, OWNER invite success, response schema validation, OpenAPI metadata present, error envelope includes request ID, duplicate invite returns 409.

- [x] Task 6: Add audit event emission for invitation. (AC: 6)
  - [x] Use existing `src/domain/audit/events.ts` pattern; `brand.member_invited` action constant already exists.
  - [x] Emit `brand.member_invited` audit event with: actor (inviting admin id), action `brand.member_invited`, entity `brand`, entityId (brand id), safe details (target admin id, brand id, timestamp, request ID), no secrets/PII.
  - [x] Add tests proving audit event is emitted with safe details and no secret fields.

- [x] Task 7: Add brand invitation email notification. (AC: 1)
  - [x] Check existing notification boundary in `src/domain/notifications/account-emails.ts`.
  - [x] Add `BrandInvitationEmailInput` type: `{ toEmail: string; brandName: string; invitedByDisplayName: string; actionUrl: string; requestId: string }`.
  - [x] Add `sendBrandInvitationEmail(input)` to `AccountEmailNotifier` interface.
  - [x] If Resend adapter exists under `src/adapter/infrastructure/` or `src/lib/`, extend it to support brand invitation email template.
  - [x] If email sending is not yet implemented for this type, use noop/placeholder pattern consistent with existing notification boundary â€” document as blocker if email send is required for completion.
  - [x] Add tests proving notification boundary is called with correct payload and email field is scrubbed from audit logs.

- [x] Task 8: Validate full flow. (AC: 1-8)
  - [x] Run targeted tests:
    - `npx vitest run src/domain/brands/brand.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts`
  - [x] Run `npm run check`.
  - [x] Run `npm run build-test` after targeted tests pass.
  - [x] Record exact blockers if any.

### Review Findings

_None yet â€” story not implemented._

## Dev Notes

### Epic Context

- Story 2.3 builds on Stories 2.1 (Create Brand) and 2.2 (Update/Archive Brand) which established `brands` and `brand_memberships` tables, brand CRUD flow, and audit emission for brand events.
- Requirements covered: FR15; supports FR14.
- Product truth: JRW is single-store ecommerce. Brands are catalog/collaboration groups only â€” NOT stores, sellers, merchants, tenants, payout owners, or PayMongo accounts.
- Brand invitation is the third story in Epic 2. Foundation from 2.1 and 2.2 must be complete before starting.
- Story 2.4 (Join Brand by Invitation or Approval) will consume the PENDING memberships created by this story.

### Dependency Gate

- Stories 2.1 and 2.2 must be `done` in sprint status before starting this story.
- Story 2.1 established: `brands` table, `brand_memberships` table, BrandRepository, BrandService, BrandController, `POST /api/brands` route, audit emission for `brand.created`.
- Story 2.2 established: `PATCH /api/brands/:id`, `POST /api/brands/:id/archive`, brand membership authorization checks, audit events `brand.updated`/`brand.archived`.
- If Stories 2.1/2.2 are not `done`, stop and document blocker before proceeding.

### Current Code Intelligence

#### `src/domain/brands/brand.ts` (Stories 2.1 + 2.2)

- **Current state:** Contains `createBrand(...)`, `updateBrand(...)`, `archiveBrand(...)`, `generateSlug(...)`, `validateBrandName(...)`, `validateBrandSlug(...)`, `validateBrandUpdate(...)`, `detectBrandCreateConflict(...)`, `detectBrandUpdateConflict(...)`. Validation constants: name 2-120 chars, slug pattern, description max 500.
- **What this story changes:** Add `createBrandInvitation(...)` domain function. Add `validateBrandInvitationTarget(...)` for target eligibility validation.
- **What must be preserved:** Existing create/update/archive flows, slug generation, conflict detection, validation constants. Do not modify existing domain logic.

#### `src/server/repositories/BrandRepository.ts` (Stories 2.1 + 2.2)

- **Current state:** Contains `createBrand(...)`, `createBrandMembership(...)`, `createBrandWithOwnerMembership(...)`, `updateBrand(...)`, `archiveBrand(...)`, `findBrandBySlug(...)`, `findBrandByName(...)`, `findArchivedBrandByName(...)`, `findBrandById(...)`, `findBrandByIdIncludingArchived(...)`, `findBrandByNameExcluding(...)`, `findBrandBySlugExcluding(...)`, `findArchivedBrandByNameExcluding(...)`, `findMembershipByBrandAndAdmin(...)`. Uses Drizzle batch for atomic brand+membership creation. DTO mapping snake_case â†’ camelCase.
- **What this story changes:** Reuse `createBrandMembership(...)` for creating PENDING memberships. May need to add admin lookup method â€” check if account repository exists from Epic 1 (Story 1.11 Admin Account Management). If not, may need minimal admin lookup query.
- **What must be preserved:** Existing create/update/archive methods, DTO mapping, batch pattern, type definitions. Do not modify existing repository methods.

#### `src/server/services/BrandService.ts` (Stories 2.1 + 2.2)

- **Current state:** Contains `createBrand(...)`, `updateBrand(...)`, `archiveBrand(...)`, `requireAdminActor(...)`, `hasElevatedPermission(...)`, `isActiveBrandMember(...)`, `extractUpdatePatch(...)`. Audit emission for `brand.created`, `brand.updated`, `brand.archived`. Uses `evaluateRouteAccess` for RBAC. Returns `AppResult`/`GeneralError` pattern.
- **What this story changes:** Add `inviteAdminToBrand(...)` method. Add target admin eligibility validation. Add PENDING membership creation. Add audit event `brand.member_invited`. Add email notification through notification boundary.
- **What must be preserved:** Existing create/update/archive flows, actor validation, error mapping, audit publisher pattern, provider failure detection, membership check pattern.

#### `src/server/controllers/BrandController.ts` (Stories 2.1 + 2.2)

- **Current state:** Contains `createBrand(...)`, `updateBrand(...)`, `archiveBrand(...)` methods. Maps service `AppResult` to HTTP status + API envelope. Uses `errorCodeToHttpStatus`, `apiSuccessWithRequestId`, `apiErrorWithRequestId`.
- **What this story changes:** Add `inviteAdminToBrand(...)` controller method.
- **What must be preserved:** Existing error mapping, envelope patterns, type definitions.

#### `src/server/routes/brands.routes.ts` (Stories 2.1 + 2.2)

- **Current state:** Contains `POST /api/brands`, `PATCH /api/brands/:id`, `POST /api/brands/:id/archive` routes with TypeBox body/response schemas, RBAC guard, OpenAPI metadata. Tags: `Brands`, auth: required ADMIN/SUPER_ADMIN, rate-limit: `admin-write`.
- **What this story changes:** Add `POST /api/brands/:id/invite` route with its own schema, guard, and OpenAPI metadata.
- **What must be preserved:** Existing routes, TypeBox schemas, RBAC guard, route metadata pattern.

#### `src/domain/schema/catalog.ts` (Stories 2.1 + 2.2)

- **Current state:** `brands` table has `status` enum (`ACTIVE`, `ARCHIVED`), `archived_at` nullable text. `brand_memberships` table has `status` enum (`ACTIVE`, `PENDING`, `REVOKED`), `role` enum (`OWNER`, `MEMBER`), `invited_by_admin_id` nullable text.
- **What this story changes:** No schema changes needed. `PENDING` status and `invited_by_admin_id` already exist from Story 2.1.
- **What must be preserved:** Existing schema, enums, constraints, indexes, relations.

#### `src/domain/audit/events.ts` (Stories 2.1 + 2.2)

- **Current state:** Contains `brand.created`, `brand.updated`, `brand.archived`, `brand.member_invited`, `brand.member_joined`, `brand.member_removed` action constants. `createAuditEvent(...)`, `NoopAuditEventPublisher`, `scrubAuditDetails(...)`.
- **What this story changes:** Use existing `brand.member_invited` action constant. No new constants needed.
- **What must be preserved:** Existing audit event structure, scrubbing logic, publisher interface.

#### `src/domain/notifications/account-emails.ts` (Epic 1)

- **Current state:** Contains `AccountEmailNotifier` interface with `sendVerificationEmail`, `sendPasswordResetEmail`, `sendAdminInvitationEmail`, `sendAdminApprovalEmail`, `sendAdminRejectionEmail`. `EmailSendResult` type. Input types for each email.
- **What this story changes:** Add `BrandInvitationEmailInput` type and `sendBrandInvitationEmail` to notification interface. Extend Resend adapter if implemented.
- **What must be preserved:** Existing email types and interface methods.

#### `src/server/context/request-context.ts` (Epic 1)

- **Current state:** Derives `requestContext.actor` per request from `jrw_session`. Invalid/ineligible sessions become anonymous `PROSPECT`.
- **What this story changes:** No changes. Brand routes read `requestContext.actor` as established.
- **What must be preserved:** Per-request scoping, request ID propagation.

#### `src/lib/api/response.ts` and `src/lib/typebox/api.ts` (Epic 1)

- **Current state:** Standard envelope helpers, TypeBox schema utilities, `tboxApiSuccess(...)`, `openApiErrorResponses(...)`.
- **What this story changes:** Reuse existing helpers for brand invitation endpoint.
- **What must be preserved:** Existing envelope patterns; do not reintroduce legacy `{ data, message, code }`.

### Architecture Compliance

- Backend/API flow stays Route -> Controller -> Service -> Domain/Repository.
- Pure brand invitation rules belong in `src/domain/**`; D1/Drizzle, audit emission, and runtime providers belong in `src/server/**` or `src/adapter/**`.
- Public API envelopes remain standard: `{ data, meta }` or `{ error: { code, message, details? } }`.
- All implemented endpoints need TypeBox request/response schemas, OpenAPI detail, auth metadata, rate-limit class, and error codes.
- Server state is authority. UI-only invitation controls are insufficient.
- Database naming: `snake_case` tables/columns. API JSON: `camelCase`. Map at repository/service boundary.
- Brand membership must be enforced server-side, not only in UI.
- Invitation creates PENDING membership â€” not ACTIVE. Story 2.4 will handle acceptance.

### Brand Invitation Authorization

- **Inviting actor requirements:**
  - Must be authenticated ADMIN or SUPER_ADMIN (route-level RBAC guard).
  - Must have ACTIVE membership in the target brand with role OWNER or MEMBER (service-level check).
  - SUPER_ADMIN has elevated permission to invite without brand membership (service-level check).
- **Target admin requirements:**
  - Must exist as an account with ADMIN role.
  - Must not be suspended.
  - Must not already have ACTIVE membership in the target brand.
  - Must not already have PENDING invitation to the target brand.
- **Non-members receive `AUTH_FORBIDDEN`.**
- **Suspended/ineligible targets receive `VALIDATION_FAILED`.**
- **Duplicate membership/invite receives `CONFLICT_STATE`.**
- Route-level RBAC guard still requires `ADMIN` or `SUPER_ADMIN` role (from Story 2.1 pattern).
- The service layer adds the brand-specific membership check AND target eligibility check on top of the route-level RBAC guard.

### PENDING Membership Creation

- Use existing `createBrandMembership(...)` repository method from Story 2.1.
- Set `status = "PENDING"`, `role = "MEMBER"`, `invitedByAdminId = inviting actor ID`.
- The membership record is the invitation â€” no separate invitation table needed.
- Story 2.4 will accept/reject these PENDING memberships.

### D1 / Drizzle Schema Guardrails

- No new schema changes needed for this story. `brand_memberships` table already has `status` (`ACTIVE`, `PENDING`, `REVOKED`), `role` (`OWNER`, `MEMBER`), and `invited_by_admin_id` columns from Story 2.1.
- Invitation operation: `INSERT INTO brand_memberships (id, brand_id, admin_id, role, status, invited_by_admin_id, created_at, updated_at) VALUES (...)` with `status = 'PENDING'`.
- Use Drizzle `.insert().values().returning()` pattern consistent with Story 2.1 insert pattern.
- If dev cannot prove current schema supports PENDING membership creation, stop and document blocker.

### Admin Lookup for Target Validation

- Need to verify target admin exists and has ADMIN role before creating invitation.
- Check if account repository exists from Epic 1 stories (Story 1.11 Admin Account Management).
- Look for repository under `src/server/repositories/` with account/admin lookup methods.
- If no account repository exists, add minimal admin lookup to BrandRepository or create separate account repository.
- Lookup should return: admin ID, role, account status (active/suspended), email (for notification).
- Do NOT expose admin email in API response â€” only use for email notification.

### UI / UX Guardrails

- This story is API/backend only. No UI components are required for Story 2.3.
- UI for brand invitation management comes in Story 2.7 (Brand Membership UI and Language Guardrails).
- Invitation response shape should be safe membership DTO: id, brandId, adminId, role, status, invitedByAdminId, createdAt, updatedAt.
- Do NOT include target admin email, name, or other PII in API response.

### Language Guardrails (Critical)

- Use "brand", "catalog group", "brand members" in all copy, comments, and documentation.
- NEVER use: seller, merchant, tenant, store owner, payout owner, PayMongo owner for brands.
- JRW is the seller of record. Brands organize catalog collaboration only.
- This language rule applies to: code comments, variable names where reasonable, API response field descriptions, test descriptions, and audit event details.
- Invitation language: "invite", "brand invitation", "pending invitation" â€” NOT "add member", "assign to store", "grant seller access".

### Testing Requirements

Minimum before completion:

- Domain tests for brand invitation validation: valid invitation draft, non-Admin target rejection, suspended target rejection, duplicate active membership conflict, duplicate pending invite conflict.
- Repository tests for PENDING membership creation, find membership for pending invite, admin lookup for target validation.
- Service tests for OWNER invite success, MEMBER invite success, SUPER_ADMIN elevated invite success, non-member invite denial, suspended target rejection, non-Admin target rejection, duplicate active membership conflict, duplicate pending invite conflict, target not found, safe notification payload, audit event emission, D1 failure mapping.
- Route tests for auth denial before controller execution, non-member invite denial, OWNER invite success, response schema validation, OpenAPI metadata presence, error envelope with request ID, duplicate invite returns 409.
- Audit emission tests proving `brand.member_invited` event with safe details and no secret fields.

Validation commands:

```bash
npx vitest run src/domain/brands/brand.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts
npm run check
npm run build-test
```

## References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.3)
- PRD anchors: `_bmad-output/planning-artifacts/prd.md` (FR15; FR14 support)
- Architecture anchors: `_bmad-output/planning-artifacts/architecture.md` (Brand collaboration boundaries; API & Communication Patterns; Data Architecture; Enforcement Guidelines)
- UX anchors: `_bmad-output/planning-artifacts/ux-design-specification.md` (UX-DR15, UX-DR19; brand language rules; catalog group terminology)
- Project context: `_bmad-output/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/2-2-update-and-archive-brand.md`
- Existing brand domain: `src/domain/brands/brand.ts`
- Existing brand repository: `src/server/repositories/BrandRepository.ts`
- Existing brand service: `src/server/services/BrandService.ts`
- Existing brand controller: `src/server/controllers/BrandController.ts`
- Existing brand routes: `src/server/routes/brands.routes.ts`
- Existing brand schema: `src/domain/schema/catalog.ts`
- Existing audit events: `src/domain/audit/events.ts`
- Existing notification boundary: `src/domain/notifications/account-emails.ts`
- Cloudflare D1 docs: https://developers.cloudflare.com/d1/worker-api/d1-database/
- Drizzle Cloudflare D1 docs: https://orm.drizzle.team/docs/connect-cloudflare-d1
- Elysia lifecycle docs: https://elysiajs.com/essential/life-cycle

## Open Questions

- Does an account/admin lookup repository already exist from Epic 1 (Story 1.11)? Need to verify before implementation.
- Is email notification send required for story completion, or is audit event emission sufficient with email as follow-up? Check if Resend adapter is implemented for other email types.

## Dev Agent Record

### Agent Model Used

- GPT-5.5 (Codex)

### Implementation Plan

- Follow vertical slice pattern established in Epic 1 and Stories 2.1/2.2: domain rules â†’ repository â†’ service â†’ controller/routes â†’ audit hardening â†’ notification â†’ validation.
- Brand is catalog collaboration group only. Never model as store/seller/tenant.
- No schema changes needed â€” `PENDING` status and `invited_by_admin_id` columns already exist from Story 2.1.
- Invitation creates PENDING membership with role MEMBER, invitedByAdminId set to inviting actor.
- SUPER_ADMIN has elevated permission to invite without brand membership.
- Target admin must exist, be ADMIN role, not suspended, not already member, not already pending.
- Keep brand authority server-side; route guards enforce ADMIN/SUPER_ADMIN before controller execution, service layer enforces brand membership + target eligibility.
- Use standard API envelopes, TypeBox schemas, OpenAPI metadata, and rate-limit class `admin-write`.
- Audit event: `brand.member_invited` (with target admin id, brand id, timestamp).
- Email notification through existing notification boundary pattern.

### Debug Log References

- Dependency gate checks passed: Story 2.2 status confirmed `done`; schema, RBAC guard, brand stack, and `brand.member_invited` constant verified.
- `npx vitest run src/domain/brands/brand.test.ts src/server/repositories/BrandRepository.test.ts src/server/services/BrandService.test.ts src/server/routes/brands.routes.test.ts` ✅ (57/57 passing).
- `npm run check` ✅ (`astro check` passed; two existing TypeScript hints only).
- `npm run build-test` ❌ blocked by pre-existing timeout failures in `src/server/repositories/OwnershipTransferRepository.test.ts` (2 tests exceed 5000ms default timeout).

### Completion Notes List

- ✅ Added domain invitation rules: `createBrandInvitation(...)`, `validateBrandInvitationTarget(...)`, invitation draft/error shapes.
- ✅ Extended BrandRepository with `findAdminById(...)` and `findAdminByEmail(...)`; preserved snake_case→camelCase boundary mapping.
- ✅ Added brand invitation service flow with actor membership/elevated checks, target validation, duplicate detection, PENDING membership creation, audit emission, and notification dispatch hook.
- ✅ Added controller + route contract for `POST /api/brands/:id/invite` with TypeBox schemas, OpenAPI metadata, RBAC guard, standard response envelopes, and documented errors.
- ✅ Extended notification boundary with `BrandInvitationEmailInput` + `sendBrandInvitationEmail(...)`; implemented Resend adapter method + tests.
- ✅ Added/updated domain, repository, service, and route tests for invite success/failure matrix, safe notification payload, and audit safety.
- ⚠️ Blocker recorded: full `npm run build-test` remains red due unrelated OwnershipTransferRepository timeout tests.

### File List

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-3-invite-admins-to-brand.md`
- `src/domain/brands/brand.ts`
- `src/domain/brands/brand.test.ts`
- `src/server/repositories/BrandRepository.ts`
- `src/server/repositories/BrandRepository.test.ts`
- `src/server/services/BrandService.ts`
- `src/server/services/BrandService.test.ts`
- `src/server/controllers/BrandController.ts`
- `src/server/routes/brands.routes.ts`
- `src/server/routes/brands.routes.test.ts`
- `src/domain/notifications/account-emails.ts`
- `src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.ts`
- `src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.test.ts`
- `src/server/services/AccountRecoveryService.test.ts`
- `src/server/services/AdminAccountService.test.ts`

## Change Log

- 2026-05-17: Story 2.3 context engine created â€” comprehensive developer guide for brand invitation API.
- 2026-05-18: Implemented brand invitation domain/repository/service/controller/route flow, added audit + email notification support, and completed invite test matrix. `npm run build-test` blocked by pre-existing `OwnershipTransferRepository` test timeouts.
