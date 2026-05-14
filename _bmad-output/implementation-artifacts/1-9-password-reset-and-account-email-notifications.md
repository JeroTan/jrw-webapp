# Story 1.9: Password Reset and Account Email Notifications

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Customer or Admin,
I want secure password reset and account-status emails,
so that account recovery and account lifecycle events work without leaking secrets.

## Acceptance Criteria

1. Given user requests password reset for an email, when request is accepted, then system creates reset token with 30-minute expiry and at least 128 bits entropy, and sends reset email through Resend boundary without exposing whether account exists.
2. Given reset token is valid and unexpired, when user submits new password, then password is updated using approved hashing/pepper flow, and token is invalidated after use.
3. Given reset token is invalid, expired, or already used, when reset is submitted, then system returns safe error code, and password remains unchanged.
4. Given email verification resend is requested, when request is accepted, then verification token expiry remains within 24 hours, and max 3 verification/reset requests per hour per email is enforced or documented as release blocker.
5. Given Admin invitation or approval/rejection email is triggered, when account lifecycle state changes require notification, then email payload contains only necessary safe account details, and no password, token, raw auth state, or secret appears in logs.
6. Given transactional email provider fails, when email send fails, then failure is logged with request ID and safe context, and response maps to stable safe error or retryable internal state.
7. Given completed APIs return responses, when password reset or email actions finish, then standard envelopes and OpenAPI metadata are used, and success responses avoid account enumeration.
8. Given implementation finishes, when tests run, then tests cover reset request, valid reset, invalid/expired/reused token, safe enumeration behavior, and provider failure mapping, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Add password reset data model and migration. (AC: 1-4, 8)
  - [ ] Extend `src/domain/schema/identity.ts` with `password_reset_tokens` or equivalent table: `id`, `actor_kind` (`ADMIN` or `CUSTOMER`), `actor_id`, `token_hash`, `expires_at`, `used_at`, `created_request_id`, optional `source_hash`, `created_at`, `updated_at`.
  - [ ] Add unique index on `token_hash`, actor lookup index, active actor+expiry index where `used_at IS NULL`, and cleanup index on `expires_at`.
  - [ ] If using polymorphic `actor_kind` plus `actor_id`, repository must verify actor existence before token creation and before password update. Do not pretend DB foreign keys protect both admin and customer rows.
  - [ ] Generate Drizzle migration in `migrations/` with `npm run db:generate`; review SQL for no unrelated table rebuilds.
  - [ ] Update `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md` with generated filename, reset token ownership, remote development apply evidence or blocker, and dependency on Story 1.8 migration `0011_sticky_avengers.sql`.

- [ ] Add token and password-reset domain helpers. (AC: 1-4, 8)
  - [ ] Add `src/domain/auth/password-reset-token.ts` plus tests, mirroring `email-verification-token.ts` but clamping TTL to 30 minutes.
  - [ ] Reuse `generateSessionToken(32)` and SHA-256 hashing from `src/lib/crypto/session-token.ts`; raw reset token exists only while composing email link/body.
  - [ ] Add account recovery decisions under `src/domain/auth/**` or a focused domain file: valid account, missing account, inactive/suspended account, unverified account, ambiguous admin+customer email collision, expired token, used token, invalid token, password validation failure.
  - [ ] Use approved `hashPassword(...)` / `createCustomerPasswordCredential(...)` PBKDF2-SHA256 flow with `PASSWORD_PEPPER`; do not use `src/lib/crypto/hash.ts` or Node-only crypto.

- [ ] Add repository operations with atomic token consumption. (AC: 1-4, 8)
  - [ ] Extend `src/server/repositories/CustomerAccountRepository.ts` or create `AccountRecoveryRepository.ts`; keep D1/Drizzle access out of domain and routes.
  - [ ] Lookup normalized email across `admins` and `customers`. If same normalized email maps to both tables, return safe public acceptance but create no token and log internal safe conflict.
  - [ ] Create reset token only for eligible active accounts. Do not create reset tokens for missing, suspended, inactive, or unverified accounts; public response remains indistinguishable.
  - [ ] Confirm reset by atomically marking token used and updating target account password hash/salt. Follow Story 1.8 batch pattern: no state where token is used but password unchanged, or password changed while token remains reusable.
  - [ ] Reuse `DrizzleAuthRateLimiter` and `email-token` scope. Combined reset and verification resend attempts must cap at 3 per hour per normalized email plus safe source hash.

- [ ] Add service/controller layer for reset and resend flows. (AC: 1-8)
  - [ ] Add `AccountRecoveryService` / `AccountRecoveryController` or carefully extend `CustomerAccountService` / `CustomerAccountController` without creating a God service.
  - [ ] `POST /api/password-resets`: body `{ email }`; public, `email-token`; valid input returns standard success envelope with `{ accepted: true }` for existing, missing, ineligible, and provider-failed accounts unless rate-limited or request body invalid.
  - [ ] `POST /api/password-resets/confirmations`: body `{ token, password }`; public, `email-token`; valid token updates password and returns `{ reset: true }`; invalid/expired/used token returns safe `RESOURCE_NOT_FOUND` or `CONFLICT_STATE`.
  - [ ] `POST /api/email-verifications/requests`: body `{ email }`; public, `email-token`; returns `{ accepted: true }` without revealing account existence or verification state. For eligible unverified customers, creates new verification credential with <=24h expiry and sends verification email.
  - [ ] Provider failure on reset/resend request should be logged with request ID and safe context, then treated as retryable internal state with public `{ accepted: true }` to prevent enumeration. Confirm endpoint may return stable safe provider/storage errors when applicable.
  - [ ] Do not issue or revoke session cookies during password reset. User signs in through Story 1.7 session route after reset.

- [ ] Extend notification boundary for reset and account lifecycle emails. (AC: 1, 5, 6, 8)
  - [ ] Keep Resend behind provider-free domain ports under `src/domain/notifications/**` and adapter code under `src/adapter/infrastructure/resend/**`.
  - [ ] Refactor existing verification notifier only as needed; preserve its config behavior: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_BASE_URL` / `PUBLIC_APP_BASE_URL`, request URL origin fallback, local dev fallback.
  - [ ] Add reset email method with link target such as `/reset-password?token=...`; escape URL and expiry in HTML; include plain text.
  - [ ] Add Admin invitation/approval/rejection notifier contracts with safe payload fields only. Actual Admin state transitions belong to Story 1.11; this story should provide the boundary and tests without implementing admin account management early.
  - [ ] Never persist, log, return, or document raw password, raw reset token, token hash, provider response body, email provider secret, cookie, or pepper.

- [ ] Wire route contracts and endpoint catalog. (AC: 6-8)
  - [ ] Add TypeBox schemas, response schemas, `routeDetail(...)` metadata, auth metadata, rate-limit class, and error codes.
  - [ ] Add routes in `src/server/routes/auth.routes.ts` or a small route module included by `src/server/routes/index.ts`. Keep route handlers thin.
  - [ ] Update `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md` from planned to concrete rows for password reset request/confirmation and verification resend.
  - [ ] Preserve standard envelopes from `src/lib/api/response.ts`: success `{ data, meta }`; error `{ error: { code, message, details? } }`.

- [ ] Enforce privacy, logging, and account-enumeration rules. (AC: 1, 5-8)
  - [ ] Public reset/resend request success bodies must be identical for existing, missing, already verified, suspended/inactive, ambiguous, and provider-failed accounts.
  - [ ] Logs may include request ID, stable error code, safe actor/resource id, and safe reason labels. Logs must not include email unless already hashed/minimized, raw token, token hash, password, provider payload, phone, address, cookie, JWT, pepper, or stack trace.
  - [ ] Keep customer transactional emails independent from `emailMarketingOptIn`; marketing opt-in cannot disable verification/reset/order/payment/fulfillment notices.
  - [ ] Use stable error codes already in `src/utils/general/error.ts`; add new codes only if absolutely necessary and update `src/lib/api/errors.ts` plus tests.

- [ ] Add focused tests and run validation. (AC: 1-8)
  - [ ] Domain tests: reset credential entropy/hash/30-minute TTL, password validation, token state decisions, ambiguous account email decision, ineligible account no-token decision.
  - [ ] Repository/service tests: reset request for existing/missing/ineligible/ambiguous/provider-failed accounts returns same public success, eligible account creates hashed token only, rate limit caps 3/hour across reset/resend, valid reset updates hash/salt and consumes token, invalid/expired/used token does not mutate password.
  - [ ] Controller/route tests: OpenAPI metadata, standard envelopes, no raw token/password/hash/salt in response, request ID propagation, TypeBox validation, provider/storage errors mapped safely.
  - [ ] Resend adapter tests: reset, verification resend, Admin invitation/approval/rejection payloads, URL escaping, missing config, provider throw with raw payload scrubbed by logging tests.
  - [ ] Schema invariant tests: reset table exists with indexes and no raw token column.
  - [ ] Run targeted Vitest for changed auth/customer/recovery/email tests.
  - [ ] Run `npm run check`. Because story touches schema/routes/provider code, run `npm run build-test` unless blocked; record exact blocker.

## Dev Notes

### Previous Story Intelligence

- Story 1.8 implemented customer registration, email verification, customer profile APIs, `email_verification_tokens`, Resend verification boundary, `email-token` rate limit use, safe logging, route metadata, and endpoint catalog updates.
- Story 1.8 fixed atomic verification by batching token consumption and `customers.email_verified_at` update. Password reset must follow same atomicity standard.
- Story 1.8 completion showed remote development D1 lag can break runtime auth if migrations are not applied. This story depends on sessions/rate limits from 1.7 and email verification/profile migration from 1.8; document remote apply state before runtime verification.
- Story 1.8 established that `PASSWORD_PEPPER` is canonical for password hashing. Do not restore any `JWT_SECRET` fallback for password hashing.
- Recent commits:
  - `45117ec feat: sprint 1-8 implemented` added customer account domain/service/controller/routes, Resend adapter, token schema, route metadata, endpoint catalog, and tests.
  - `9723f11 refactor: auth now works` hardened auth runtime behavior, Resend config, app tests, and safe provider/storage errors.

### Current Files To Update And Preserve

- `src/domain/schema/identity.ts`
  - Current state: `admins`, `customers`, `email_verification_tokens`, `sessions`, and `auth_rate_limits` live here with Drizzle SQLite tables and indexes.
  - Change: add reset token table and relations if needed.
  - Preserve: existing unique owner index, customer profile fields, verification token indexes, session indexes, and rate-limit table.

- `src/domain/auth/email-verification-token.ts`
  - Current state: creates 32-byte opaque verification tokens, SHA-256 hash, max 24h TTL.
  - Change: add separate reset token helper or factor shared helper.
  - Preserve: verification token max TTL and raw-token-only-at-send-time rule.

- `src/lib/crypto/session-token.ts`
  - Current state: `crypto.getRandomValues` for random bytes and `crypto.subtle.digest("SHA-256", ...)` for token hashing.
  - Change: reuse only; no new randomness/hashing primitive needed.
  - Preserve: Workers-compatible Web Crypto path.

- `src/lib/crypto/password.ts`
  - Current state: PBKDF2-SHA256 with secret pepper, salt, constant-time compare; Worker-compatible.
  - Change: call for password reset hash/salt update.
  - Preserve: algorithm string, iteration behavior, `PASSWORD_PEPPER` requirement.

- `src/domain/customers/customer-account.ts`
  - Current state: customer registration/profile validation and email verification token decisions.
  - Change: add resend verification decision only if it stays customer-specific; put cross-admin/customer reset decisions in `src/domain/auth/**`.
  - Preserve: profile validation, email normalization, duplicate handling, and transactional email opt-in rule.

- `src/server/services/CustomerAccountService.ts`
  - Current state: registration, verify email, get/update profile; uses `email-token` limiter and Resend verification notifier.
  - Change: add verification resend or reuse support from new recovery service.
  - Preserve: register provider-failure behavior unless deliberately changed for reset/resend only.

- `src/server/repositories/CustomerAccountRepository.ts`
  - Current state: Drizzle customer CRUD, verification token create/find/use, D1 batch for verification atomicity, shared `DrizzleAuthRateLimiter`.
  - Change: add reset token and account lookup/update operations or move recovery repository to a new file.
  - Preserve: verification batch semantics and email normalization.

- `src/server/routes/auth.routes.ts`
  - Current state: session create/delete/inspect, cookie handling, route metadata, password pepper validation, source IP hashing.
  - Change: add password reset endpoints here or compose a focused auth recovery route module.
  - Preserve: existing session cookie behavior and route response schemas.

- `src/server/routes/customer.routes.ts`
  - Current state: customer registration, email verification confirm, profile get/patch.
  - Change: add verification resend endpoint here or in a focused customer email route module.
  - Preserve: existing registration/profile contract and OpenAPI metadata.

- `src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.ts`
  - Current state: Resend client wrapper, config resolver, HTML escaping, verification URL builder, failing notifier on missing config.
  - Change: extend or factor into reset/account email notifier.
  - Preserve: safe config fallback order and no raw provider payload logging.

- `src/adapter/infrastructure/logging/operational-log.ts`
  - Current state: redacts password/hash/token/secret/cookie/email/provider payload/phone/address/stack-like keys.
  - Change: add tests if reset/provider cases expose new sensitive keys.
  - Preserve: logging must never change account outcomes.

### API Contract Guidance

- `POST /api/password-resets`
  - Auth: public; follow existing public-route metadata convention with `PROSPECT` role, and describe Customer/Admin target-account support in route description.
  - Rate limit: `email-token`.
  - Body: `email`.
  - Success: `202` or `200` standard envelope with `data.accepted = true`. Use one status consistently and document it in endpoint catalog.
  - Public success must not reveal whether account exists, is verified, is suspended, or whether email send succeeded.
  - Expected errors: `VALIDATION_FAILED`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE` only for storage/config failures that affect all requests safely, `INTERNAL_ERROR`.

- `POST /api/password-resets/confirmations`
  - Auth: public.
  - Rate limit: `email-token` or documented recovery-confirm class if added.
  - Body: `token`, `password`.
  - Success: `data.reset = true`; no session returned.
  - Errors: `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `CONFLICT_STATE`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`.

- `POST /api/email-verifications/requests`
  - Auth: public.
  - Rate limit: `email-token`.
  - Body: `email`.
  - Success: `data.accepted = true` with no account-state details.
  - For already verified, missing, suspended/inactive, ambiguous, or provider-failed accounts, same public success shape.

### Account Eligibility Decisions

- Normalize email to lowercase before lookup and rate-limit scope hashing.
- Admin and customer tables can theoretically contain same email. Treat this as ambiguous: create no reset token, send no email, log safe conflict, return public accepted response.
- Password reset should create tokens only for active accounts with verified email. For customer accounts without local password but verified email, resetting may create a local password credential; keep this explicit in tests.
- Suspended/inactive accounts do not get reset tokens. Public response remains accepted to avoid enumeration.
- Verification resend applies to active unverified customers only. Already verified and missing customer cases return same accepted response.

### Admin Lifecycle Email Scope

- This story must not implement Admin account management, approval/rejection state transitions, ownership transfer, or invitations beyond notification contracts.
- Create provider-free notifier methods and tests for Admin invitation, approval, and rejection emails so Story 1.11 can call them.
- Payloads may include safe recipient email, display/admin name when present, status label, request ID, and safe action URL. Payloads must not include password, raw auth state, approval internals, token hash, raw provider payload, or secrets.

### Latest Technical Information

- Package check on 2026-05-14:
  - Installed and latest: `elysia@1.4.28`, `@elysiajs/openapi@1.4.15`, `drizzle-orm@0.45.2`, `jose@6.2.3`.
  - Installed `resend@6.12.2`; latest registry version `6.12.3`. Do not bump just for patch unless tests or lockfile policy require it; current `^6.12.2` range is compatible with fresh install resolving patch updates.
- Resend official SDK docs show `emails.send({ from, to, subject, text/html })`; keep adapter typed around those fields and do not log returned provider payload. Source: https://github.com/resend/resend-node
- Cloudflare Workers Web Crypto docs support `crypto.getRandomValues(...)` and `crypto.subtle.digest(...)`; keep token generation/hash on Web Crypto. Source: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
- Elysia OpenAPI docs support route `detail` metadata and schema-driven OpenAPI output; continue local `routeDetail(...)` plus TypeBox contracts. Source: https://elysiajs.com/tutorial/features/openapi/
- Drizzle docs support SQLite indexes/constraints in schema definitions; use schema-level indexes and review generated migration SQL. Source: https://orm.drizzle.team/docs/indexes-constraints

### Project Structure Notes

- Use Route -> Controller -> Service -> Domain/Repository.
- New backend API work belongs under `src/server/**`; do not add new `src/api/**` routes.
- Domain code must not import Astro, Elysia, D1, Resend, request objects, or Cloudflare bindings.
- Provider wrappers belong under `src/adapter/infrastructure/resend/**` or `src/lib/resend/**`, not `src/utils/**`.
- Tests should stay co-located as `*.test.ts`; shared fakes can live in `src/test/fakes` only if reuse justifies it.
- Update endpoint catalog and migration plan docs as part of implementation; story is not complete with code only.

### Anti-Patterns To Avoid

- Returning different reset/resend success bodies for existing vs missing accounts.
- Returning `verificationEmail.sent` or `resetEmail.sent` from public reset/resend request endpoints.
- Storing raw reset token, logging token hash, or adding raw token examples to OpenAPI.
- Creating password reset in old `src/api/**` scaffold.
- Adding Node `crypto`, `jsonwebtoken`, `bcrypt`, or a new email SDK.
- Using `JWT_SECRET` for password hashing or reset token hashing.
- Building Admin account management, Google OAuth, customer account UI, or full reset UI beyond link targets unless needed for route safety.
- Applying production migrations or changing owner credentials during story implementation.

## References

- Story requirements: `_bmad-output/planning-artifacts/epics.md` Story 1.9.
- PRD requirements: `_bmad-output/planning-artifacts/prd.md` FR59-FR61, auth endpoint areas, rate limits, security/privacy NFRs.
- Architecture rules: `_bmad-output/planning-artifacts/architecture.md` Data Architecture, Authentication & Security, API & Communication Patterns, Architectural Boundaries.
- UX rules: `_bmad-output/planning-artifacts/ux-design-specification.md` Feedback Patterns and Form Patterns.
- Project context: `_bmad-output/project-context.md`.
- Previous story: `_bmad-output/implementation-artifacts/1-8-customer-registration-verification-and-profile.md`.
- Endpoint catalog: `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`.
- Migration plan: `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md`.
- Current code: `src/domain/schema/identity.ts`, `src/domain/auth/email-verification-token.ts`, `src/domain/customers/customer-account.ts`, `src/server/services/CustomerAccountService.ts`, `src/server/repositories/CustomerAccountRepository.ts`, `src/server/routes/auth.routes.ts`, `src/server/routes/customer.routes.ts`, `src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.ts`, `src/adapter/infrastructure/logging/operational-log.ts`.

## Dev Agent Record

### Agent Model Used

TBD by dev agent.

### Debug Log References

TBD by dev agent.

### Completion Notes List

- Story context created from sprint status next backlog item on 2026-05-14.
- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/1-9-password-reset-and-account-email-notifications.md`
