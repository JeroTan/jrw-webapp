# Story 1.11: Admin Account Management and Approval

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As Super Admin,
I want to create, inspect, update, suspend, reactivate, approve, and reject Admin accounts,
so that only trusted operators can access JRW dashboard.

## Acceptance Criteria

1. Given Super Admin is authenticated, when Super Admin creates Admin account, then Admin account is created with `ADMIN` role, and invitation or setup email is sent when enabled.
2. Given Admin self-registration is enabled, when prospective Admin verifies email, then account remains pending approval until Super Admin or authorized owner approves, and dashboard access is blocked before approval.
3. Given Super Admin approves or rejects verified Admin registration, when action succeeds, then Admin account status changes accordingly, and approval/rejection notice is sent when enabled.
4. Given Super Admin suspends Admin, when suspension succeeds, then Admin loses dashboard access and active dashboard-capable sessions are invalidated or blocked, and suspension reason is captured where supported.
5. Given Super Admin reactivates Admin, when reactivation succeeds, then Admin may sign in if email verified and approved, and role remains `ADMIN`, not `SUPER_ADMIN`.
6. Given Super Admin views Admin accounts, when list/detail endpoints respond, then response includes safe admin account fields only, and secrets, password hashes, tokens, and internal auth state are hidden.
7. Given non-owner or Customer attempts Admin management, when protected action is requested, then system returns forbidden error code, and no account state changes.
8. Given account management APIs are completed, when docs are generated, then OpenAPI metadata includes auth requirement, body/response schemas, error codes, and rate-limit class.
9. Given implementation finishes, when tests run, then tests cover create, inspect, update, suspend, reactivate, approve/reject, non-owner denial, and dashboard access gate, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Add admin-lifecycle domain decisions and input validation. (AC: 1-7, 9)
  - [x] Create `src/domain/admins/admin-account.ts` with pure decisions for create/update/approve/reject/suspend/reactivate transitions and actor authorization (`SUPER_ADMIN` only for privileged mutations).
  - [x] Add `src/domain/admins/admin-account.test.ts` covering happy-path and denied transitions.
  - [x] Keep `STORE_ADMIN -> ADMIN` alias behavior from `src/domain/auth/roles.ts`; no new active roles.

- [x] Extend admin persistence model only where required by ACs. (AC: 1-5, 9)
  - [x] Reuse existing `admins.status`, `admins.email_verified_at`, and `admins.approved_at` before adding new columns.
  - [x] Add optional metadata fields only if needed to satisfy API/UX requirements (for example suspension reason and rejection reason) and keep migration minimal/surgical.
  - [x] Update `src/domain/schema/identity.ts` and `src/domain/schema-invariants.test.ts` for any new fields/indexes.
  - [x] If schema changes, generate migration and update `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md` with ownership and remote apply evidence/blocker.

- [x] Implement Admin account repository with safe DTO mapping and atomic writes. (AC: 1-6)
  - [x] Add `src/server/repositories/AdminAccountRepository.ts` with methods for list/detail/create/update/status transitions.
  - [x] Never return `password_hash`, `password_salt`, reset token hashes, session token hashes, or provider metadata in response DTOs.
  - [x] Add atomic session invalidation helper for target Admin (`sessions.actor_kind = 'ADMIN'` and `actor_id = targetAdminId`) during suspend/reject flows.

- [x] Implement service orchestration and authorization gates. (AC: 1-7, 9)
  - [x] Add `src/server/services/AdminAccountService.ts` returning `AppResult` + stable error codes.
  - [x] Enforce actor guard: only authenticated `SUPER_ADMIN` may mutate Admin accounts in this story.
  - [x] Keep owner invariant: no mutation path can create second owner or promote Admin to owner (ownership transfer belongs to Story 1.13).
  - [x] Ensure suspended/unapproved Admin cannot pass dashboard session inspection after status change.

- [x] Implement controller + routes + OpenAPI metadata. (AC: 1, 3, 6-8)
  - [x] Add `src/server/controllers/AdminAccountController.ts` with safe envelope mapping.
  - [x] Add `src/server/routes/admin-accounts.routes.ts` with TypeBox request/response contracts and `routeDetail(...)` metadata.
  - [x] Route set for this story:
    - `GET /api/admin-accounts`
    - `POST /api/admin-accounts`
    - `GET /api/admin-accounts/:adminAccountId`
    - `PATCH /api/admin-accounts/:adminAccountId`
    - `POST /api/admin-accounts/:adminAccountId/approvals`
    - `POST /api/admin-accounts/:adminAccountId/suspensions`
    - `DELETE /api/admin-accounts/:adminAccountId/suspensions` (reactivate)
  - [x] Wire route module in `src/server/routes/index.ts` and `src/server/app.ts` through existing options pattern.

- [x] Wire Admin lifecycle email notifications using existing Resend boundary. (AC: 1, 3)
  - [x] Reuse `createAccountEmailNotifier(...)` and `AccountEmailNotifier` methods (`sendAdminInvitationEmail`, `sendAdminApprovalEmail`, `sendAdminRejectionEmail`).
  - [x] Email send must be feature-flagged/config-gated (enabled vs disabled) and failures mapped safely (`PROVIDER_UNAVAILABLE` or non-blocking policy documented per endpoint).
  - [x] Log only safe provider context (request ID, operation, status); never log raw payload/tokens/addresses beyond existing scrub rules.

- [x] Invalidate/deny dashboard sessions on suspension/rejection. (AC: 4, 5, 7)
  - [x] On suspend/reject, revoke active Admin sessions in persistence and ensure `AuthService.inspectSession` sees revoked/ineligible state.
  - [x] Preserve existing customer and owner session behavior.
  - [x] Add regression tests that previously-valid Admin cookie becomes unauthorized/anonymous after suspension.

- [x] Add tests and docs updates before marking complete. (AC: 8, 9)
  - [x] Domain tests: transition/authorization matrix.
  - [x] Repository tests: atomic state change + session invalidation.
  - [x] Service tests: create/inspect/update/suspend/reactivate/approve/reject + non-owner denial.
  - [x] Route tests: OpenAPI metadata (`x-auth`, `x-rate-limit-class`, `x-error-codes`) + envelope/codes.
  - [x] Update `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md` row for Story 1.11 from `planned` to `complete` with concrete schemas and codes.
  - [x] Run `npm run check` and record exact blocker if failing.

## Dev Notes

### Epic Context

- Story 1.11 is governance core for Epic 1 before Story 1.12 (RBAC guards) and Story 1.13 (ownership transfer).
- This story must keep Story 1.7 auth/session guarantees intact while adding Super Admin-administered Admin lifecycle controls.
- `FR2`, `FR4`, and `FR61` are primary requirement anchors; do not expand into ownership transfer mechanics yet.

### Previous Story Intelligence (from Story 1.10)

- Reuse existing route/controller/service/repository layering. Story 1.10 already proved this shape with strong tests and safe error mapping.
- Keep secret-scrubbing discipline: responses/logs/docs must not leak raw tokens/codes/provider payloads.
- Reuse shared `session-cookie` and `requestContext` patterns. Do not copy/paste alternate cookie/session logic.
- Use `routeDetail(...)` metadata consistently; OpenAPI rows must include auth, rate-limit class, error codes.
- Update implementation artifacts (`endpoint catalog`, `migration plan`, `sprint-status`) as part of done criteria.

### Git Intelligence Summary

Recent commit patterns show stable implementation conventions to follow:

- `0245025 chore: reviewed 1-10`
  - Hardened safe error details and callback/session safety with focused tests.
  - Pattern: patch security/race edges before final status transition.
- `711e269 refactor: story 1-10 update queryparams of google`
  - Small route-contract refinements with matching route tests.
  - Pattern: schema/metadata updates must be test-backed.
- `1ecccbb feat: story 1-10 done but needs recheck`
  - End-to-end addition: schema + repository + service + route + docs + tests.
  - Pattern: complete vertical slice in one story, then quality hardening commit.
- `6789d36 feat: sprint 1-9 reviewed`
  - Logging scrub + auth/account recovery guardrail patches.
  - Pattern: provider/log safety is mandatory before story close.

### Current Files To Update And Preserve

- `src/domain/schema/identity.ts`
  - Current: `admins` already has `status`, `email_verified_at`, `approved_at`, unique single-owner index.
  - Change: add only minimal lifecycle metadata needed for AC completeness.
  - Preserve: `admins_single_owner_idx`, existing status enums, session and token table contracts.

- `src/domain/auth/auth-decisions.ts`
  - Current: Admin eligibility blocks unverified/unapproved non-owner accounts.
  - Change: keep logic compatible with new approval/suspension flows.
  - Preserve: safe code mapping (`EMAIL_NOT_VERIFIED`, `ADMIN_APPROVAL_REQUIRED`, `ACCOUNT_SUSPENDED`).

- `src/server/services/AuthService.ts`
  - Current: sign-in/inspect rely on account status + session state.
  - Change: ensure admin lifecycle changes immediately reflect in session inspection/sign-in eligibility.
  - Preserve: generic credential failure behavior and safe operational logging.

- `src/server/repositories/AuthRepository.ts`
  - Current: account lookup and session persistence.
  - Change: reuse for session revocation patterns; do not fork session semantics.
  - Preserve: Admin-first email lookup precedence, token-hash-only session storage.

- `src/server/context/request-context.ts`
  - Current: derives actor context from session inspection.
  - Change: none or minimal; ensure admin lifecycle updates propagate through inspection.
  - Preserve: anonymous prospect fallback and request ID propagation.

- `src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.ts`
  - Current: already supports admin invitation/approval/rejection email methods.
  - Change: use existing notifier methods from admin service.
  - Preserve: provider error scrubbing and safe console event format.

- `src/domain/notifications/account-emails.ts`
  - Current: admin lifecycle notifier contract exists.
  - Change: reuse contract, avoid duplicate notifier interface.

- `src/server/openapi/route-metadata.ts`
  - Current: supports `x-auth`, `x-rate-limit-class`, `x-error-codes`.
  - Change: likely no logic change; use it consistently in new routes.

- `src/server/routes/index.ts` and `src/server/app.ts`
  - Current: compose foundation + auth + google-oauth + recovery + customer routes with injected logger.
  - Change: register admin account routes in same composition style.
  - Preserve: Cloudflare adapter options (`aot: false`, `normalize: true`) and error envelope behavior.

### API Contract Guidance

Endpoint family for Story 1.11 should move from planned to concrete in catalog:

- `GET /api/admin-accounts`
  - Auth: required.
  - Roles: `SUPER_ADMIN`.
  - Rate-limit class: `admin-write` (or documented `public-read` for list only if chosen consistently).
  - Success: safe list DTO only.
  - Errors: `AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `RESOURCE_NOT_FOUND` (if scoped lookup), `INTERNAL_ERROR`.

- `POST /api/admin-accounts`
  - Auth: required.
  - Roles: `SUPER_ADMIN`.
  - Creates Admin with `ADMIN` role only.
  - Errors include `VALIDATION_FAILED`, `CONFLICT_STATE`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`.

- `GET /api/admin-accounts/:adminAccountId`
  - Auth: required.
  - Roles: `SUPER_ADMIN`.
  - Return safe account fields only.

- `PATCH /api/admin-accounts/:adminAccountId`
  - Auth: required.
  - Roles: `SUPER_ADMIN`.
  - Update allowed editable fields only; protect role/owner invariants.

- `POST /api/admin-accounts/:adminAccountId/approvals`
  - Auth: required.
  - Roles: `SUPER_ADMIN`.
  - Accept explicit action (`approve` | `reject`) with safe reason constraints.

- Suspension/Reactivate routes
  - Auth: required.
  - Roles: `SUPER_ADMIN`.
  - Enforce session revocation on suspension/rejection; reactivation must not auto-promote role.

All endpoints must use:
- Success envelope `{ data, meta }`.
- Error envelope `{ error: { code, message, details? } }`.
- OpenAPI metadata via `routeDetail(...)`.
- No raw password hashes, token hashes, session token, or internal provider payloads in DTO/docs.

### Session and Authorization Guardrails

- Dashboard eligibility remains: `status === ACTIVE` and email verified and approved for non-owner Admin.
- Suspension/rejection flow must revoke or block active sessions immediately.
- `SUPER_ADMIN` uniqueness invariant must remain untouched.
- Non-owner Admin and Customer must receive forbidden response on admin lifecycle mutation attempts.

### Testing Requirements

Minimum coverage needed for AC sign-off:

- Domain unit tests:
  - create/update/suspend/reactivate/approve/reject transitions.
  - invalid transitions and forbidden actor attempts.
- Repository tests:
  - atomic admin status mutation + session revocation.
  - safe DTO mapping excludes secret/internal columns.
- Service tests:
  - create account success and duplicate handling.
  - inspect list/detail.
  - approve/reject paths with optional notification behavior.
  - suspend/reactivate including dashboard eligibility impact.
  - non-owner denial.
- Route/controller tests:
  - input validation, envelope shape, error mapping, OpenAPI metadata fields.
- Regression tests:
  - Story 1.7 auth session behavior still valid.
  - Story 1.9/1.10 flows not broken by new admin logic.

### Latest Technical Information

- Elysia OpenAPI plugin docs confirm docs route defaults (`/openapi`, `/openapi/json`) and plugin-driven contract metadata flow. Use existing project pattern; avoid custom doc generators.
  - Source: https://elysiajs.com/plugins/openapi

- Google OAuth web-server docs still define standard auth-code redirect endpoint and token exchange endpoint (`/o/oauth2/v2/auth`, `https://oauth2.googleapis.com/token`), and page currently shows updated date 2025-09-15. Keep existing Story 1.10 integration stable while extending admin lifecycle features.
  - Source: https://developers.google.com/identity/protocols/oauth2/web-server

- Google OpenID Connect docs explicitly require stable identity key usage from `sub`; page currently shows updated date 2026-05-13. Do not regress customer/provider identity semantics while touching auth-adjacent code.
  - Source: https://developers.google.com/identity/openid-connect/openid-connect

- Resend docs state idempotency keys are supported for `POST /emails` with 24-hour lifespan. For invitation/approval/rejection notifications, optional idempotency usage can reduce duplicate sends on retries.
  - Source: https://resend.com/docs/dashboard/emails/idempotency-keys

- `jose` docs continue to center `jwtVerify` and `createRemoteJWKSet` for OIDC/JWT verification paths already used in project. Keep Worker-compatible `jose` usage; do not introduce Node-only JWT libs.
  - Source: https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md

### Project Structure Notes

- Backend/API changes belong in `src/server/**`; do not add new canonical behavior to deprecated `src/api/**`.
- Business rules stay provider/transport free in `src/domain/**`.
- Reuse existing notifier boundaries and safe logging boundaries.
- Keep admin governance UI concerns out of this API story unless required for contract verification.

### Anti-Patterns To Avoid

- Creating or exposing `STORE_ADMIN` as active role.
- Returning `password_hash`, `password_salt`, reset token hashes, session hashes, or provider payloads.
- Allowing non-owner Admin/Customer to mutate Admin lifecycle.
- Suspending Admin without revoking/blocking active dashboard sessions.
- Implementing ownership transfer in this story (belongs to Story 1.13).
- Ad hoc error codes, ad hoc envelopes, or route metadata omissions.
- Silent provider/email failure handling without safe operational trace.

## References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Story 1.11, Epic 1)
- PRD anchors: `_bmad-output/planning-artifacts/prd.md` (FR2, FR4, FR61; auth model; endpoint areas; error catalog)
- Architecture anchors: `_bmad-output/planning-artifacts/architecture.md` (Auth/Security; API layering; structure; boundaries)
- UX anchors: `_bmad-output/planning-artifacts/ux-design-specification.md` (Super Admin governance direction, dashboard shell, ownership/sensitive action patterns)
- Project context: `_bmad-output/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/1-10-customer-google-sign-in.md`
- Endpoint catalog baseline: `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`
- Latest docs:
  - https://elysiajs.com/plugins/openapi
  - https://developers.google.com/identity/protocols/oauth2/web-server
  - https://developers.google.com/identity/openid-connect/openid-connect
  - https://resend.com/docs/dashboard/emails/idempotency-keys
  - https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context generation run only (no feature implementation commands executed).
- 2026-05-16T12:33+08:00: Activated `bmad-dev-story`, loaded workflow config, project context, sprint status, and Story 1.11.
- 2026-05-16T12:40+08:00: Red domain test failed as expected: missing `src/domain/admins/admin-account.ts`.
- 2026-05-16T12:56+08:00: Domain lifecycle tests passed (`src/domain/admins/admin-account.test.ts`).
- 2026-05-16T12:57+08:00: Red schema invariant test failed as expected: missing `suspension_reason` and `rejection_reason`.
- 2026-05-16T13:06+08:00: Repository/schema tests passed after safe mapper and target-session invalidation helper.
- 2026-05-16T13:11+08:00: Service/domain/repository tests passed after orchestration and notification gate.
- 2026-05-16T13:18+08:00: Admin route/OpenAPI tests passed after controller, routes, and app wiring.
- 2026-05-16T13:20+08:00: Auth regression test passed after `inspectSession` dashboard eligibility check.
- 2026-05-16T13:25+08:00: `cmd.exe /c npm run check` passed with existing legacy unused-parameter warnings in deprecated `src/api/**`.
- 2026-05-16T13:27+08:00: `cmd.exe /c npm run build-test` passed: `astro check`, 166 Vitest tests, and Astro build.

### Implementation Plan

- Built pure Admin lifecycle domain decisions first, then persisted minimal reason metadata.
- Added Drizzle repository methods that return safe Admin records only and revoke target Admin sessions on suspend/reject through batch writes.
- Added service orchestration with `SUPER_ADMIN` actor guard, duplicate checks, owner immutability, PBKDF2 password hashing, lifecycle email feature gate, and stable `AppResult` error codes.
- Added controller/routes with TypeBox contracts, `{ data, meta }` / `{ error }` envelopes, `routeDetail(...)` metadata, and app route wiring.
- Hardened `AuthService.inspectSession` so active but unapproved/unverified non-owner Admin sessions become anonymous.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story includes AC-complete task map, file-level guardrails, test matrix, previous-story learnings, git intelligence, and latest technical references.
- Implemented Admin lifecycle domain model for create/update/approve/reject/suspend/reactivate and `SUPER_ADMIN` authorization.
- Added nullable Admin lifecycle reason columns (`suspension_reason`, `rejection_reason`) plus migration `0014_admin_lifecycle_reasons.sql`; `db:generate` was blocked by local WSL bridge error, so SQL and Drizzle snapshot were written manually and documented.
- Implemented safe Admin repository, service, controller, and routes for all Story 1.11 endpoints.
- Wired feature-gated Admin invitation/approval/rejection emails through existing `createAccountEmailNotifier(...)`.
- Added session revocation for suspend/reject and `AuthService.inspectSession` dashboard eligibility blocking for unapproved Admin sessions.
- Updated endpoint catalog and migration plan.
- Validation passed: `cmd.exe /c npm run check`; `cmd.exe /c npm run build-test` (`astro check`, 166 tests, Astro build).

### File List

- `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`
- `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md`
- `_bmad-output/implementation-artifacts/1-11-admin-account-management-and-approval.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `migrations/0014_admin_lifecycle_reasons.sql`
- `migrations/meta/0014_snapshot.json`
- `migrations/meta/_journal.json`
- `src/domain/admins/admin-account.test.ts`
- `src/domain/admins/admin-account.ts`
- `src/domain/schema-invariants.test.ts`
- `src/domain/schema/identity.ts`
- `src/server/app.ts`
- `src/server/controllers/AdminAccountController.ts`
- `src/server/repositories/AdminAccountRepository.test.ts`
- `src/server/repositories/AdminAccountRepository.ts`
- `src/server/routes/admin-accounts.routes.test.ts`
- `src/server/routes/admin-accounts.routes.ts`
- `src/server/routes/index.ts`
- `src/server/services/AdminAccountService.test.ts`
- `src/server/services/AdminAccountService.ts`
- `src/server/services/AuthService.test.ts`
- `src/server/services/AuthService.ts`

### Change Log

- 2026-05-16: Story 1.11 context created and marked ready-for-dev.
- 2026-05-16: Implemented Story 1.11 Admin account lifecycle APIs, session gating, tests, migration docs, endpoint catalog update; marked ready for review.

### Review Findings

- [x] [Review][Patch] Lifecycle email failures returned `PROVIDER_UNAVAILABLE` after persisted Admin changes [`src/server/services/AdminAccountService.ts`:282] - fixed by making feature-gated lifecycle emails non-blocking after create/approve/reject persistence, returning `sent: false` for failed invitation sends and preserving successful account state.
- [x] [Review][Patch] Stale concurrent lifecycle writes could overwrite newer Admin state [`src/server/services/AdminAccountService.ts`:342] [`src/server/repositories/AdminAccountRepository.ts`:233] - fixed with expected `updatedAt`/status predicates on update, approve, reject, suspend, and reactivate writes, plus `CONFLICT_STATE` mapping when stale writes affect zero rows.
- [x] [Review][Superseded by Epic 2.5] Admin creation/update initially considered Customer email conflicts. Identity realm correction removed cross-realm Customer lookup: Admin creation/update now checks only `admins.email`, while same email in `customers` is allowed as an unrelated Customer account. Same-table unique create/update races still map to `CONFLICT_STATE`.
- [x] [Review][Dismiss] Reactivated rejected Admin remains `ACTIVE` but dashboard-ineligible until approved [`src/domain/admins/admin-account.ts`:385] - dismissed for this review because AC5 explicitly gates sign-in on verified and approved, so this is not a dashboard-access bypass.

### Review Debug Log References

- 2026-05-19 - Epic 2.5 identity realm correction confirmed Admin account service/repository no longer imports or queries Customer account storage for Admin create/update email checks. Super Admin can create Admin with email already present in `customers` when no duplicate exists in `admins`.

- 2026-05-16T15:19+08:00: Targeted `cmd.exe /c npx vitest run src/server/services/AdminAccountService.test.ts src/server/repositories/AdminAccountRepository.test.ts` passed: 8 tests.
- 2026-05-16T15:21+08:00: `cmd.exe /c npm run check` passed with 0 errors; existing legacy unused-parameter hints remain in deprecated `src/api/**`.
- 2026-05-16T15:35+08:00: `cmd.exe /c npm run build-test` passed after final review patch: `astro check`, 37 Vitest files / 167 tests, and Astro build.
