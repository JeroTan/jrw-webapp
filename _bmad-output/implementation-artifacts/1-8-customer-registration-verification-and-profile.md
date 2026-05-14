# Story 1.8: Customer Registration, Verification, and Profile

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Customer,
I want to register, verify my email, and manage basic profile details,
so that I can build trusted checkout/account identity before buying from JRW.

## Acceptance Criteria

1. Given Prospect submits valid registration details, when registration succeeds, then a Customer account is created with `CUSTOMER` role and verification email request is queued/sent through the notification boundary.
2. Given registration email already belongs to an existing account, when Prospect registers, then system returns a safe account/validation response and does not reveal sensitive account state beyond allowed UX.
3. Given verification token is valid and unexpired, when Customer verifies email, then account email is marked verified and token cannot be reused.
4. Given verification token is expired, invalid, or already used, when Customer attempts verification, then system returns safe error code and no account state changes.
5. Given Customer is authenticated, when Customer updates profile fields, then display name, phone number, default delivery/contact details, and email preference update where supported and PII changes are validated/minimized to allowed fields.
6. Given profile/registration APIs are completed, when responses are returned, then standard success/error envelopes are used and OpenAPI metadata documents auth, request body, responses, rate-limit class, and error codes.
7. Given privacy/security requirements exist, when implementation finishes, then tests cover registration, verification success/failure, token reuse prevention, and profile update validation and logs do not emit raw passwords, tokens, unnecessary PII, or secrets.
8. Given validation exists, when story implementation finishes, then `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Add customer registration, verification-token, and profile schema changes. (AC: 1, 3, 5, 7)
  - [x] Extend `src/domain/schema/identity.ts` for customer profile gaps: `display_name` and an email preference field such as `email_marketing_opt_in`; preserve existing `first_name`, `last_name`, `phone`, `street_address`, `barangay`, `city_province`, `postal_code`, and `avatar_url`.
  - [x] Add `email_verification_tokens` or equivalent focused table with `id`, `customer_id`, `token_hash`, `expires_at`, `used_at`, `created_request_id`, optional safe source hash, and timestamps.
  - [x] Store only token hash, never raw verification token. Token must have at least 128 bits entropy and expire within 24 hours.
  - [x] Add indexes for token hash lookup, customer lookup, active/unexpired lookup, and cleanup by `expires_at`.
  - [x] Generate migration with `npm run db:generate`; inspect SQL for unrelated churn and D1-safe table rebuild behavior before accepting.
  - [x] Update `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md` with generated migration filename, token/profile ownership, and any remote-development evidence or blocker.

- [x] Build pure customer identity/domain helpers. (AC: 1-5, 7)
  - [x] Reuse `src/lib/crypto/password.ts` for PBKDF2-SHA256 password hashing with secret pepper; do not use legacy `src/lib/crypto/hash.ts`.
  - [x] Reuse `src/lib/crypto/session-token.ts` entropy/hash primitives or add a small focused wrapper under `src/domain/auth/**` for verification tokens.
  - [x] Normalize customer emails to lowercase before lookup and insert; add tests for case-insensitive duplicate prevention.
  - [x] Define registration decisions for new customer, duplicate email, invalid password/profile input, and provider/email send failure.
  - [x] Define verification decisions for valid token, expired token, already-used token, invalid token, and customer not found.
  - [x] Define profile update validation for `displayName`, `phone`, address/contact fields, and email preference. Transactional emails are required and must not be disabled by marketing preference.
  - [x] Customer role remains derived from actor kind (`CUSTOMER`), not a new persisted role string.

- [x] Add repositories/services/controllers under canonical backend. (AC: 1-7)
  - [x] Add customer repository methods under `src/server/repositories/**` or `src/adapter/infrastructure/db/**` for customer create/read/update, duplicate email lookup, token create/read/use, and email-token rate-limit bucket if reused.
  - [x] Add `CustomerAccountService` or equivalent under `src/server/services/**` for registration, verification, profile read/update, and verification email dispatch orchestration.
  - [x] Add `CustomerAccountController` or equivalent under `src/server/controllers/**` to map service results to public envelopes.
  - [x] Keep route handlers thin: Route -> Controller -> Service -> Domain/Repository.
  - [x] Do not add canonical code under frozen `src/api/**`.

- [x] Add Resend notification boundary for verification email. (AC: 1, 6, 7)
  - [x] Add provider-free email/notification port under `src/domain/notifications/**` or service-local interface.
  - [x] Add Resend adapter under `src/adapter/infrastructure/resend/**` or `src/lib/resend/**` per architecture. Do not put provider calls in `src/utils/**`.
  - [x] Runtime config should require safe sender/base URL values, for example `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and app base URL. Missing config maps to safe provider/internal error.
  - [x] Send verification email with raw token only inside email link/body. Do not return token in API response, persist it, log it, or expose it in OpenAPI examples.
  - [x] If no queue exists, do not claim queued delivery. Direct send failure must map to a stable safe error or retryable state, log safe context, and leave unverified account/token recoverable by Story 1.9 resend flow.

- [x] Add route contracts and wire auth/customer endpoints. (AC: 1-6)
  - [x] Implement `POST /api/customers` for public customer registration.
  - [x] Implement `POST /api/email-verifications` for verification-token confirmation.
  - [x] Implement `GET /api/customers/me` for authenticated customer profile summary.
  - [x] Implement `PATCH /api/customers/me` for authenticated customer profile update.
  - [x] Use TypeBox/Elysia `t` schemas in route contracts and reusable envelope schemas from `src/lib/typebox/api.ts`.
  - [x] Add OpenAPI `routeDetail(...)` metadata: tags, summary, description, auth mode, roles, rate-limit class, and error codes.
  - [x] Wire new route group through `src/server/routes/index.ts` without disrupting `foundationRoutes` or existing auth session routes.
  - [x] Update `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md` rows with concrete customer/profile contracts.

- [x] Enforce auth, privacy, and rate-limit behavior. (AC: 2, 5-7)
  - [x] Registration duplicate email must not reveal verification state, suspension state, provider linkage, password presence, or account internals.
  - [x] `GET/PATCH /api/customers/me` requires authenticated `CUSTOMER`. Missing session returns `AUTH_REQUIRED`; non-customer actor returns `AUTH_FORBIDDEN`.
  - [x] Do not build broad RBAC middleware ahead of Story 1.12; add only the minimal customer guard needed here or a clearly reusable helper.
  - [x] Apply `email-token` rate limiting for verification token creation/send attempts: max 3 per hour per normalized email and safe source scope, or document exact release blocker.
  - [x] Logs and error details must scrub password, password hash/salt, verification token/hash, session cookie/token, phone, address, and email where unnecessary.
  - [x] Public responses must not include password hash/salt, token hash, raw token, provider metadata, raw account status internals, or unnecessary PII.

- [x] Add required tests and validation. (AC: 1-8)
  - [x] Add schema/invariant tests for customer profile fields and verification token table/indexes.
  - [x] Add domain tests for password hashing path, email normalization, duplicate decisions, token expiry, token reuse prevention, and profile validation.
  - [x] Add service/controller/route tests for registration success, duplicate registration, invalid registration, provider failure, valid verification, expired/invalid/used token, token reuse no-op/failure, profile read, profile update, non-customer denial, and missing-session denial.
  - [x] Add integration-style test proving Story 1.7 sign-in blocks unverified customer and succeeds after verification when credentials are compatible.
  - [x] Add safe logging/redaction tests covering raw password, raw token, token hash, phone, address, session cookie, and provider error payload.
  - [x] Run targeted Vitest for changed customer/auth/email tests.
  - [x] Run `npm run check`.
  - [x] Run `npm run build-test` after schema/routes/provider work unless blocked; record exact blocker.

## Dev Notes

### Current State

- Canonical API lives under `src/server/**`; `src/pages/api/[...slug].ts` remains thin Astro-to-Elysia bridge. New backend work belongs under `src/server/**`, not `src/api/**`.
- `src/server/app.ts` composes Elysia with `CloudflareAdapter`, `aot: false`, `normalize: true`, OpenAPI, CORS, request context, global safe error mapping, and `serverRoutes(...)`.
- Existing completed auth endpoints are `POST /api/auth/sessions`, `DELETE /api/auth/sessions/current`, and `GET /api/auth/session`.
- `src/server/context/request-context.ts` derives request ID and actor context from `jrw_session`. Missing/invalid session becomes anonymous `PROSPECT`.
- `src/server/services/AuthService.ts` blocks customer sign-in when `email_verified_at` is missing. Story 1.8 must make newly registered customers compatible with this by hashing passwords with the approved PBKDF2 path and setting `email_verified_at` only after successful token verification.
- `src/domain/schema/identity.ts` already has `customers` with `email`, nullable `password_hash`, `password_salt`, `status`, `email_verified_at`, `avatar_url`, `first_name`, `last_name`, `phone`, address fields, and timestamps.
- `src/domain/schema/identity.ts` has no verification token table and no explicit `display_name` or email preference field.
- `src/lib/crypto/password.ts` is approved password hashing/verification. It uses Web Crypto PBKDF2-SHA256, salted hash, and secret pepper.
- `src/lib/crypto/session-token.ts` generates opaque random 32-byte base64url tokens and SHA-256 hashes. This is suitable for verification-token entropy/hash reuse.
- `src/lib/api/response.ts`, `src/lib/api/errors.ts`, and `src/lib/typebox/api.ts` provide standard envelopes, safe public messages, request ID metadata, and TypeBox response schemas.
- No Resend adapter currently exists under `src/lib/**` or `src/adapter/**`. Add one through notification boundary instead of calling provider SDK from routes/domain.
- Endpoint catalog currently reserves `POST /api/customers` and `POST /api/email-verifications` for Stories 1.8/1.9, but does not yet list profile endpoints. Story 1.8 must update the catalog.
- D1 migration plan still lists verification/reset/OAuth state tables as missing and customers as Story 1.8-owned. Update it after migration generation.

### API Contract Expectations

`POST /api/customers`

- Public endpoint for Prospect registration.
- Body: `email`, `password`, optional `displayName`, `phone`, default delivery/contact fields, optional email preference.
- Success: standard envelope with safe customer summary and verification email dispatch status. No raw token.
- Error codes: `VALIDATION_FAILED`, `CONFLICT_STATE` or safe duplicate-account code, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`.
- Rate-limit class: `email-token` or registration-specific class documented in route metadata.
- Do not issue session cookie on registration. Customer signs in through Story 1.7 after verification.

`POST /api/email-verifications`

- Public token confirmation endpoint.
- Body: `token`.
- Success: standard envelope with `{ verified: true }` or safe customer summary.
- Error codes: `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `CONFLICT_STATE`, `RATE_LIMITED`, `INTERNAL_ERROR`.
- Token consume must be single-use and atomic: update only where token hash matches, `used_at IS NULL`, and `expires_at > now`.

`GET /api/customers/me`

- Required auth endpoint for active `CUSTOMER` session.
- Success: safe profile DTO only.
- Error codes: `AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `RESOURCE_NOT_FOUND`, `INTERNAL_ERROR`.
- Rate-limit class: `public-read`.

`PATCH /api/customers/me`

- Required auth endpoint for active `CUSTOMER` session.
- Body: profile fields only. Do not accept role, status, email verification state, password, provider metadata, token fields, or arbitrary JSON.
- Success: safe updated profile DTO.
- Error codes: `VALIDATION_FAILED`, `AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `RESOURCE_NOT_FOUND`, `INTERNAL_ERROR`.
- Rate-limit class: `customer-write` or documented equivalent.

### Profile DTO Requirements

- Public customer profile may include `id`, `email`, `emailVerified`, `displayName`, `phone`, delivery/contact fields, and email preference.
- Exclude `password_hash`, `password_salt`, `status` internals unless needed as safe public account status, token data, provider metadata, raw timestamps not needed by UX, and address fields not requested by endpoint.
- `avatar_url` should remain read-only unless this story explicitly supports avatar editing. Do not add image upload.
- Email preference must not disable required transactional emails such as verification, password reset, order, payment, or fulfillment notices.

### Verification Token Requirements

- Raw token exists only at creation time and inside verification email/link.
- Persist only SHA-256 token hash.
- Entropy must be at least 128 bits; prefer 32 random bytes using existing `generateSessionToken()`.
- Expiry must be <= 24 hours from creation.
- Verification must set `customers.email_verified_at` and `used_at` once.
- Expired/invalid/used token must not mutate account state.
- Duplicate verification should return safe conflict/not-found behavior without revealing token hash or customer internals.

### Previous Story Intelligence

- Story 1.7 implemented server-side session records, `jrw_session` cookie handling, request-context actor derivation, auth route contracts, auth rate limiting, and PBKDF2 credential verification.
- Customer password sign-in currently rejects customers without PBKDF2 hash+salt or without `email_verified_at`. Story 1.8 must create customer credentials in this supported shape.
- Story 1.7 established `AuthService`, `AuthController`, `AuthRepository`, `auth.routes.ts`, and route tests. Follow these patterns for customer account code instead of inventing parallel response/cookie/error shapes.
- Story 1.7 added D1-backed `auth_rate_limits`; reuse or factor this instead of creating unrelated rate-limit tables if it fits email-token rate limits.
- Story 1.6 established role helpers and unique Super Admin. Do not add `STORE_ADMIN` output or role lists in customer code.
- Story 1.2 established safe logging and response envelopes. Reuse `createOperationalLogEvent(...)`, `apiSuccessWithRequestId(...)`, and `apiErrorWithRequestId(...)`.

### Git Intelligence

- Recent `6951ea6 feat: 1-7 implemented` added auth/session schema, routes, repositories, services, controller tests, request-context tests, and endpoint catalog updates. Use these as nearest implementation pattern.
- Recent `b82e344 feat: added middleware function` changed middleware builder files under `src/lib/middleware/**` and `src/middleware/_readme.md`; unrelated to Story 1.8 unless local customer guard work intentionally uses middleware builder primitives.
- Worktree was clean before story creation. Do not revert unrelated future user edits.

### Latest Technical Information

- Elysia cookie docs describe reactive cookie values, `.set(...)`, `.remove()`, and cookie attributes including `httpOnly`, `secure`, `sameSite`, `maxAge`, and `path`. Story 1.8 should reuse Story 1.7 session cookie behavior, not create new auth cookies. Source: https://elysiajs.com/patterns/cookie
- Cloudflare Workers Web Crypto docs confirm `crypto.subtle`, `crypto.getRandomValues(...)`, and `crypto.randomUUID()` are available in Workers. Use Web Crypto-compatible hashing/token generation; do not add Node-only crypto on request path. Source: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
- Cloudflare D1 prepared statement docs recommend bound parameters and note `.first()` does not add `LIMIT 1`; add explicit `.limit(1)`/SQL limit on lookup paths. Source: https://developers.cloudflare.com/d1/worker-api/prepared-statements/
- Drizzle insert docs support SQLite `.returning()` and conflict helpers. Use Drizzle APIs for insert/update/upsert where they keep code clear and typed. Source: https://orm.drizzle.team/docs/insert
- Resend email docs require `from`, `to`, and `subject`, and support `html`/`text`. Use necessary safe fields only; avoid logging provider response bodies with PII. Source: https://resend.com/docs/api-reference/emails/send-email

### File Structure Guardrails

Expected touch scope:

- `src/domain/schema/identity.ts`
- `migrations/*.sql` and `migrations/meta/*.json`
- `src/domain/auth/**` or `src/domain/customers/**` for pure registration/token/profile rules
- `src/domain/notifications/**` if adding provider-free notification port
- `src/server/routes/customer.routes.ts` or route name aligned with local pattern
- `src/server/controllers/CustomerAccountController.ts`
- `src/server/services/CustomerAccountService.ts`
- `src/server/repositories/**` or `src/adapter/infrastructure/db/**`
- `src/adapter/infrastructure/resend/**` or `src/lib/resend/**`
- `src/server/routes/index.ts`
- `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`
- `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md`

Avoid:

- New canonical code under `src/api/**`.
- Raw token, token hash, password, hash, salt, pepper, cookie, provider payload, phone, or address in logs.
- Returning raw DB rows from API.
- Issuing a session before email verification unless a later approved story changes auth policy.
- Building password reset, verification resend, Google OAuth, broad RBAC guard framework, customer orders, or checkout UI in this story.
- Adding marketplace/store/tenant/seller semantics to customer or brand language.
- Production D1 migration or real email-domain changes without explicit review.

### Testing Requirements

- Required:
  - `npm run db:generate` after schema changes.
  - Targeted Vitest for customer registration/token/profile code and affected auth/session code.
  - `npm run check`.
- Required after schema/routes/provider wiring unless blocked:
  - `npm run build-test`.
- Tests must prove:
  - Valid registration creates lowercased customer email, PBKDF2 hash+salt, unverified account, verification token hash, and no raw token persistence.
  - Duplicate registration cannot create another customer and does not expose sensitive account state.
  - Verification succeeds once, sets `email_verified_at`, and rejects reuse.
  - Expired/invalid/used token does not mutate account state.
  - Unverified customer cannot sign in through existing Story 1.7 auth path; verified customer can.
  - Profile update validates and trims allowed fields only.
  - Non-customer or anonymous actor cannot read/update `/api/customers/me`.
  - Provider/send failure maps safely and logs only request ID, safe actor/target context, and stable error code.
  - OpenAPI metadata and endpoint catalog match implemented routes.

### Project Structure Notes

- This story is backend/API/security work. UI forms are out of scope unless needed for a minimal smoke path.
- Keep provider effects behind ports/adapters so registration rules can be tested without Resend, D1, Elysia, Astro, or React.
- If D1 transaction support or email provider delivery cannot guarantee account+token+email consistency, document exact behavior in completion notes and endpoint catalog.
- Keep profile data minimal because phone/address are PII and production launch requires privacy notice/retention owner from Story 1.4 baseline.

### References

- `_bmad-output/planning-artifacts/epics.md#Story-1.8-Customer-Registration-Verification-and-Profile`
- `_bmad-output/planning-artifacts/epics.md#Story-1.7-Secure-Session-Authentication`
- `_bmad-output/planning-artifacts/prd.md#Authentication-Model`
- `_bmad-output/planning-artifacts/prd.md#API-Endpoint-Areas`
- `_bmad-output/planning-artifacts/prd.md#Rate-Limits`
- `_bmad-output/planning-artifacts/prd.md#Data--Response-Requirements`
- `_bmad-output/planning-artifacts/prd.md#Security--Privacy`
- `_bmad-output/planning-artifacts/architecture.md#Authentication--Security`
- `_bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns`
- `_bmad-output/planning-artifacts/architecture.md#Project-Structure--Boundaries`
- `_bmad-output/planning-artifacts/ux-design-specification.md#UX-Consistency-Patterns`
- `_bmad-output/project-context.md#Security-And-Privacy`
- `_bmad-output/project-context.md#API-Layering`
- `_bmad-output/project-context.md#Testing-And-Quality`
- `_bmad-output/implementation-artifacts/1-7-secure-session-authentication.md`
- `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`
- `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md`
- `src/domain/schema/identity.ts`
- `src/lib/crypto/password.ts`
- `src/lib/crypto/session-token.ts`
- `src/server/services/AuthService.ts`
- `src/server/controllers/AuthController.ts`
- `src/server/repositories/AuthRepository.ts`
- `src/server/routes/auth.routes.ts`
- `src/server/context/request-context.ts`
- `src/lib/api/response.ts`
- `src/lib/api/errors.ts`
- `src/lib/typebox/api.ts`
- Elysia cookie docs: https://elysiajs.com/patterns/cookie
- Cloudflare Workers Web Crypto docs: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
- Cloudflare D1 prepared statements docs: https://developers.cloudflare.com/d1/worker-api/prepared-statements/
- Drizzle insert docs: https://orm.drizzle.team/docs/insert
- Resend send email docs: https://resend.com/docs/api-reference/emails/send-email

## Story Context Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Extend identity schema and D1 migration first so registration/profile/token storage has durable tables and indexes.
- Keep customer account rules in pure domain helpers, then orchestrate effects through repository/service/controller layers.
- Hide Resend behind a provider-free notification port and keep raw verification tokens out of persistence, logs, responses, and OpenAPI examples.
- Wire thin Elysia routes with TypeBox contracts, standard envelopes, OpenAPI metadata, and minimal customer-only profile guard.

### Debug Log References

- 2026-05-13: `npx vitest src/domain/schema-invariants.test.ts --run` failed after red-phase schema tests, then passed after schema/table/index implementation.
- 2026-05-13: `npm run db:generate` generated `migrations/0011_sticky_avengers.sql`; SQL review found only token table/indexes and customer profile columns, no table rebuild.
- 2026-05-13: `npx vitest src/domain/customers/customer-account.test.ts src/domain/auth/email-verification-token.test.ts --run` failed for missing red-phase modules, then passed after domain helper implementation.
- 2026-05-13: `npx vitest src/server/services/CustomerAccountService.test.ts src/server/controllers/CustomerAccountController.test.ts --run` failed for missing red-phase modules, then passed after service/controller implementation and safe controller messages.
- 2026-05-13: `npx vitest src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.test.ts src/server/services/CustomerAccountService.test.ts --run` failed for missing red-phase Resend adapter, then passed after notification port/adapter implementation.
- 2026-05-13: `npx vitest src/server/routes/customer.routes.test.ts --run` failed for missing red-phase routes, then passed after customer route wiring and catalog update.
- 2026-05-13: `npx vitest src/server/services/CustomerAccountService.test.ts src/server/routes/customer.routes.test.ts --run` passed after hardening assertions for email-token rate-limit scope and profile field rejection.
- 2026-05-13: `npx vitest src/server/services/AuthService.test.ts src/adapter/infrastructure/logging/operational-log.test.ts --run` passed after Story 1.7 customer sign-in compatibility and expanded redaction coverage.
- 2026-05-13: `npx vitest src/domain/schema-invariants.test.ts src/domain/customers/customer-account.test.ts src/domain/auth/email-verification-token.test.ts src/server/services/CustomerAccountService.test.ts src/server/controllers/CustomerAccountController.test.ts src/server/routes/customer.routes.test.ts src/server/routes/auth.routes.test.ts src/server/services/AuthService.test.ts src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.test.ts src/adapter/infrastructure/logging/operational-log.test.ts src/lib/api/response.test.ts --run` passed: 45 tests.
- 2026-05-13: `npm run check` passed with existing legacy warnings only.
- 2026-05-13: `npm run build-test` passed: `astro check`, 100 Vitest tests, and `astro build`.
- 2026-05-13: `npx vitest src/domain/auth/super-admin-seed.test.ts src/server/routes/auth.routes.test.ts src/server/routes/customer.routes.test.ts --run` passed after enforcing canonical `PASSWORD_PEPPER` usage only.
- 2026-05-13: `npm run build-test` initially hit a stale Vite optimizer cache after timeout; stopped stale local `jrw-webapp` dev-server Node processes, cleared `node_modules/.vite`, then reran successfully.
- 2026-05-13: `npm run check` passed after D1 batch atomicity fix for email verification.
- 2026-05-13: `npx vitest src/server/services/CustomerAccountService.test.ts src/server/controllers/CustomerAccountController.test.ts src/server/routes/customer.routes.test.ts --run` passed after D1 batch atomicity fix.
- 2026-05-13: Final `npm run build-test` passed after review fixes: `astro check`, 100 Vitest tests, and `astro build`.

### Completion Notes List

- Added customer profile schema fields and hashed email verification token storage with lookup/cleanup indexes.
- Documented Story 1.8 migration filename, SQL scope, and remote-development blocker in D1 migration plan.
- Added pure customer account helpers for normalized registration/profile validation, duplicate decisions, verification token state, PBKDF2 password creation, and verification-token hash/TTL generation.
- Added customer repository, account service, and controller for registration, verification, profile read/update, safe provider failure handling, and minimal customer actor guard.
- Added provider-free verification email port plus Resend adapter requiring `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and app base URL; missing config returns safe provider failure.
- Added customer route contracts/OpenAPI metadata for registration, email verification, profile read, and profile update; updated endpoint catalog to complete Story 1.8 rows.
- Enforced minimal customer-only profile guard, duplicate safe conflict behavior, hashed 3/hour email-token rate-limit scope, and route rejection for unsupported profile mutation fields.
- Added Story 1.7 auth compatibility test proving unverified customer sign-in is blocked and verified PBKDF2 customer credentials can sign in.
- Enforced canonical `PASSWORD_PEPPER` usage in docs, auth route, customer route, and seed script; `JWT_SECRET` remains JWT signing secret only.
- Fixed review finding: email verification now batches token consumption and customer email verification so both DB updates commit together.
- Full validation passed. Remote D1 migration apply remains intentionally unrun and documented as development evidence blocker.

### File List

- `src/domain/schema/identity.ts`
- `src/domain/schema-invariants.test.ts`
- `migrations/0011_sticky_avengers.sql`
- `migrations/meta/0011_snapshot.json`
- `migrations/meta/_journal.json`
- `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md`
- `src/domain/auth/email-verification-token.ts`
- `src/domain/auth/email-verification-token.test.ts`
- `src/domain/customers/customer-account.ts`
- `src/domain/customers/customer-account.test.ts`
- `src/domain/notifications/customer-verification-email.ts`
- `src/server/repositories/CustomerAccountRepository.ts`
- `src/server/services/CustomerAccountService.ts`
- `src/server/services/CustomerAccountService.test.ts`
- `src/server/controllers/CustomerAccountController.ts`
- `src/server/controllers/CustomerAccountController.test.ts`
- `src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.ts`
- `src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.test.ts`
- `.env.example`
- `src/server/routes/customer.routes.ts`
- `src/server/routes/customer.routes.test.ts`
- `src/server/routes/index.ts`
- `src/server/routes/route-groups.ts`
- `src/server/openapi/route-metadata.ts`
- `src/server/app.ts`
- `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`
- `src/server/services/AuthService.test.ts`
- `src/adapter/infrastructure/logging/operational-log.test.ts`
- `src/server/routes/auth.routes.ts`
- `scripts/seed-super-admin.ts`

### Change Log

- 2026-05-13: Implemented Story 1.8 customer registration, verification, profile APIs, schema migration, Resend boundary, privacy/rate-limit guardrails, tests, and validation.
- 2026-05-13: Code review completed; fixed canonical `PASSWORD_PEPPER` alignment and atomic email verification update, then moved story to `done`.

## Senior Developer Review (AI)

### Review Outcome

Approve

### Review Date

2026-05-13

### Action Items

- [x] [High] Enforce canonical `PASSWORD_PEPPER` usage only across runtime routes, seed script, and example env.
- [x] [Medium] Make email verification token consumption and customer email verification commit together through D1 batch.

### Summary

Clean review after fixes. No unresolved decision-needed, patch, or deferred items remain.

## Handoff Note for BMad Quick Dev

Added 2026-05-13 after runtime smoke-test pause.

Next work should focus on local runtime verification, not feature work:

- `astro.config.mjs` now keeps server-only deps out of the client optimizer and precompiles Worker server deps through a Vite `configEnvironment` plugin. This targets Cloudflare `workerd` dev failures from CommonJS-only dependency output.
- Runtime code and seed script now use `PASSWORD_PEPPER` only for password hashing. Do not restore `JWT_SECRET` fallback.
- User's failing `POST /api/auth/sessions` payload used placeholder email/password. Earlier `.env` inspection also showed placeholder `PASSWORD_PEPPER`; with placeholder pepper, auth route correctly returns `INTERNAL_ERROR` before credential check.
- Before auth curl can pass, replace local `.env` placeholders with real non-placeholder values: `PASSWORD_PEPPER`, `JWT_SECRET`, `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD`. Also set `RESEND_FROM_EMAIL` before customer registration email tests. Verification links use `APP_BASE_URL`/`PUBLIC_APP_BASE_URL` first, request URL origin second, and `http://localhost:4321` last.
- Run/check DB setup for same environment used by dev server. Current `seed:super-admin` script executes Wrangler D1 remote by design; if `astro dev` uses local D1, add/use local seed path or test with matching remote-backed runtime.
- Suggested fast smoke commands after env/DB ready:
  - `npm run dev -- --host 127.0.0.1 --port 4322 --force`
  - `curl.exe -i http://127.0.0.1:4322/api/openapi/json`
  - `curl.exe -i -X POST http://127.0.0.1:4322/api/auth/sessions -H "content-type: application/json" --data-raw "{\"email\":\"<seed email>\",\"password\":\"<seed password>\"}"`
  - `curl.exe -i http://127.0.0.1:4322/api/auth/session --cookie "<jrw_session cookie from sign-in>"`
- If `.vite` cache deletion is needed on Windows, stop any `jrw-webapp` dev Node process first. Locked cache files caused `Access to the path is denied` during cleanup.
- Latest validation before pause:
  - `npx vitest src/domain/auth/super-admin-seed.test.ts src/server/routes/auth.routes.test.ts src/server/routes/customer.routes.test.ts --run` passed: 16 tests.
  - `npm run check` passed: 0 errors; existing legacy unused-parameter hints only.
- 2026-05-14 runtime smoke follow-up:
  - `npm ci` restored missing local packages; before install, `npm run check` failed because `astro` bin was missing from `node_modules`.
  - `npm run check` passed after dependency restore and config update: 0 errors; existing legacy unused-parameter hints only.
  - `npm run dev -- --host 127.0.0.1 --port 4322 --force` via local Astro bin starts successfully.
  - `curl.exe -i http://127.0.0.1:4322/api/openapi/json` now returns `200 OK` with OpenAPI JSON. Earlier `module is not defined` Worker dev failure is fixed.
  - `curl.exe -i http://127.0.0.1:4322/api/auth/session` and placeholder `POST /api/auth/sessions` returned standard JSON `INTERNAL_ERROR` while `.env` lacked a valid `PASSWORD_PEPPER`. Shell-only `PASSWORD_PEPPER=...` did not reach Cloudflare Worker env; set it in `.env`.
  - `npm run build-test` passed: `astro check`, 100 Vitest tests, and `astro build`.
  - Admin auth curl was retried after `.env` had a valid `PASSWORD_PEPPER`. `npm run wrangler-dev` needed `cross-env CLOUDFLARE_ENV=development` during `astro build`; without it, generated `dist/server/wrangler.json` omitted env-scoped `DB`/`STORAGE`/Durable Object bindings.
  - After the `wrangler-dev` script fix, `GET /api/auth/session` returned `200 OK` unauthenticated through Wrangler dev with `DB` bound.
  - `npm run dev -- --host 127.0.0.1 --port 4322 --force` was then used for the actual Astro dev target. `curl.exe http://127.0.0.1:4322/api/openapi/json` returned `200 OK`; `curl.exe http://127.0.0.1:4322/api/auth/session` returned `200 OK` unauthenticated; `POST /api/auth/sessions` returned `500 INTERNAL_ERROR`.
  - `POST /api/auth/sessions` still fails because remote development D1 has only migrations `0000` through `0006` applied. Current auth needs at least `0009_luxuriant_wendigo.sql` (`sessions`, admin `password_salt`/`status`/verification columns) and `0010_bent_liz_osborn.sql` (`auth_rate_limits`). Apply reviewed remote development migrations before expecting admin sign-in to work.
  - 2026-05-14 follow-up: `npm run db:migrate:remote` applied remote development migrations `0007` through `0011`.
  - Existing owner row was preserved, `.env` seed email was aligned to that owner, and `npm run seed:super-admin -- --replace-owner-credentials REVIEWED_OWNER_CREDENTIAL_REPLACEMENT` replaced development owner credentials with the `.env` password and set owner active/verified/approved.
  - `scripts/seed-super-admin.ts` now launches Wrangler through `cmd.exe /c npx` on Windows Node so the seed script works from this WSL-backed workspace.
  - Astro dev auth curl passed on the selected dev port: `POST /api/auth/sessions` returned `200 OK` with `SUPER_ADMIN`; `GET /api/auth/session` with the cookie returned `200 OK` authenticated.
  - Auth storage/config failures now return safe actionable details instead of a bare `500`: missing `DB`/invalid `PASSWORD_PEPPER` maps to `PROVIDER_UNAVAILABLE` with safe `reason`, and D1/schema storage exceptions map to `PROVIDER_UNAVAILABLE` with `reason: auth_storage_unavailable`.
