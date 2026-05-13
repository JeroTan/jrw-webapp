# Story 1.7: Secure Session Authentication

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Super Admin, Admin, or Customer,
I want secure email/password sign-in and sign-out,
so that role-protected areas can identify me without exposing credentials or tokens.

## Acceptance Criteria

1. Given user has active account with password credentials, when user submits valid email/password, then system creates secure HttpOnly session cookie backed by server-side session record, and response uses standard `{ data, meta }` envelope.
2. Given user submits invalid credentials, when sign-in fails, then response uses stable safe error code, and message does not reveal whether email or password was wrong.
3. Given account is suspended, inactive, unverified where required, or not approved where required, when user attempts dashboard sign-in, then system denies access with safe error code, and does not create dashboard-capable session.
4. Given user is signed in, when user signs out, then server invalidates session, and browser cookie is cleared.
5. Given request includes session cookie, when server context derives actor, then typed request context exposes actor ID, role, account status, and request ID, and actor context is scoped per request, not global mutable state.
6. Given password verification runs, when implementation is tested, then tests cover correct password, wrong password, suspended/inactive user, and missing/expired session, and password storage uses salted hashing with secret pepper per architecture.
7. Given rate limit requirements exist, when repeated failed password attempts occur, then auth failure rate limiting is applied or documented as blocker for release, and public errors remain safe.
8. Given validation exists, when story implementation finishes, then `npm run check` passes or blocker is documented, and logs do not emit raw passwords, hashes, session tokens, JWTs, pepper, or cookies.

## Tasks / Subtasks

- [ ] Add canonical session schema and migration. (AC: 1, 4, 5, 6)
  - [ ] Extend `src/domain/schema/identity.ts` with server-side session records for Admin and Customer actors, or create `src/domain/schema/sessions.ts` if separation keeps schema clearer.
  - [ ] Store only hashed session token, actor type/ID, active/revoked state, expiry, created/updated timestamps, optional last-used timestamp, and safe request metadata needed for audit/debug.
  - [ ] Do not store raw session token, raw cookie value, JWT, password, pepper, or provider token.
  - [ ] Add indexes for token hash lookup, actor lookup, active/expiry cleanup, and revoked/session invalidation paths.
  - [ ] Generate Drizzle migration with `npm run db:generate`; inspect SQL for unrelated churn before accepting.

- [ ] Build pure auth/session domain behavior. (AC: 1, 2, 3, 4, 5, 6)
  - [ ] Reuse `src/domain/auth/roles.ts` active roles: `SUPER_ADMIN`, `ADMIN`, `CUSTOMER`, `PROSPECT`; keep `STORE_ADMIN` as deprecated input alias only.
  - [ ] Reuse `src/lib/crypto/password.ts` for PBKDF2 password verification with secret pepper; do not use legacy `src/lib/crypto/hash.ts` for new password verification.
  - [ ] Reuse `src/lib/crypto/session-token.ts` for random token generation and token hashing.
  - [ ] Add pure helpers under `src/domain/auth/**` for account eligibility, credential failure mapping, session expiry/revocation decisions, and actor role derivation.
  - [ ] For current Admin records, derive `SUPER_ADMIN` from `admins.is_owner`; derive non-owner Admin as `ADMIN`.
  - [ ] Customer password sign-in may use existing `customers.password_hash` only if the current hash is compatible with Story 1.7 peppered PBKDF2 requirements; otherwise document customer password sign-in as blocked until Story 1.8 migrates customer registration/password shape.

- [ ] Add repository/service/controller layers under canonical backend. (AC: 1, 2, 3, 4, 5)
  - [ ] Add repositories under `src/server/repositories/**` or `src/adapter/infrastructure/db/**` to load Admin/Customer accounts and create/read/revoke sessions through D1/Drizzle or existing project DB access pattern.
  - [ ] Add `src/server/services/AuthService.ts` or local equivalent to orchestrate sign-in, sign-out, and session inspection without business rules in routes.
  - [ ] Add `src/server/controllers/AuthController.ts` or local equivalent to adapt service results to public envelopes.
  - [ ] Keep transport handlers thin: Route -> Controller -> Service -> Domain/Repository.
  - [ ] Do not add new canonical code under frozen `src/api/**`.

- [ ] Add auth route contracts and wire route group. (AC: 1, 2, 3, 4, 5, 7)
  - [ ] Add `src/server/routes/auth.routes.ts`.
  - [ ] Implement `POST /api/auth/sessions` for email/password sign-in.
  - [ ] Implement `DELETE /api/auth/sessions/current` for sign-out and cookie clear.
  - [ ] Implement `GET /api/auth/session` for current session/actor inspection.
  - [ ] Wire route in `src/server/routes/index.ts` without disrupting `foundationRoutes`.
  - [ ] Use TypeBox request/response schemas from `elysia` `t` and reusable response helpers from `src/lib/typebox/api.ts`.
  - [ ] Add OpenAPI `routeDetail(...)` metadata: tags, summary, description, auth mode, roles, rate-limit class, and error codes.
  - [ ] Update `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md` rows from planned/TBD to concrete auth contracts.

- [ ] Issue and clear secure cookies through Elysia/Astro bridge safely. (AC: 1, 4, 5, 8)
  - [ ] Use Elysia cookie API for set/remove behavior; set `httpOnly: true`, `secure: true` outside local development if needed by current dev mode, `sameSite: "lax"` unless architecture approves stricter behavior, explicit `path: "/"`, and bounded `maxAge` aligned with session expiry.
  - [ ] Cookie value must be opaque random session token, not actor ID and not JWT payload.
  - [ ] Prefer signed cookie support only if it improves tamper detection without replacing server-side token hash lookup; server-side session record remains authority.
  - [ ] Clear cookie on sign-out even if session record is already expired/revoked.
  - [ ] Ensure cookie handling works through `src/pages/api/[...slug].ts` and `src/server/app.ts` without global mutable state.

- [ ] Extend request context with actor derivation. (AC: 5, 8)
  - [ ] Update `src/server/context/request-context.ts` so scoped derive can read session cookie, load active session/account, and expose typed actor data.
  - [ ] Actor context must include actor ID, active role, account status/eligibility flags, and request ID.
  - [ ] Preserve existing `requestId` behavior and `x-request-id` response header.
  - [ ] Avoid cross-request module state; no cached current actor in globals.
  - [ ] Map missing/expired/revoked/invalid cookie to anonymous/Prospect context for public routes and `AUTH_REQUIRED` for protected route use.

- [ ] Implement safe failure behavior and logging. (AC: 2, 3, 7, 8)
  - [ ] Invalid email/password returns non-enumerating `AUTHENTICATION` or chosen stable safe code with generic message.
  - [ ] Suspended/inactive/unverified/not-approved dashboard access returns safe code such as `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`, `ADMIN_APPROVAL_REQUIRED`, or `AUTH_FORBIDDEN` where appropriate.
  - [ ] Reuse `src/lib/api/errors.ts`, `src/lib/api/response.ts`, and existing error-code catalog instead of inventing ad hoc strings.
  - [ ] Log only safe context through operational logger: request ID, safe actor ID if known, role if known, target resource type, stable error code, timestamp.
  - [ ] Add or update redaction tests if logs/errors can include auth details.

- [ ] Address rate limiting release gate. (AC: 7)
  - [ ] Implement max 5 failed auth attempts per 15 minutes per account/email and source IP if feasible in this story.
  - [ ] If durable/session-safe rate limit storage is not ready, document explicit release blocker in story completion notes and endpoint catalog.
  - [ ] Public error for rate limit must be `RATE_LIMITED`; no account existence leak.

- [ ] Add required tests and validation. (AC: 1-8)
  - [ ] Add domain tests for role derivation, account eligibility, credential failure mapping, session expiry, and revocation decisions.
  - [ ] Add service/controller or route tests for valid sign-in, invalid password, unknown email generic failure, suspended/inactive account denial, sign-out invalidation, cookie clear, missing session, expired session, and revoked session.
  - [ ] Add request-context tests proving actor is request-scoped and request ID still propagates.
  - [ ] Add API envelope/OpenAPI metadata tests where existing pattern supports it.
  - [ ] Run `npm run check`.
  - [ ] Run targeted Vitest for changed auth/session tests.
  - [ ] Run `npm run build-test` after schema/routes/session work unless blocked; record exact blocker.

## Dev Notes

### Current State

- Canonical API lives under `src/server/**`; `src/pages/api/[...slug].ts` is the Astro bridge and `src/server/app.ts` composes Elysia with `CloudflareAdapter`, `aot: false`, and `normalize: true`.
- `src/server/routes/index.ts` currently wires only `foundationRoutes`; auth routes are planned but not implemented.
- `src/server/context/request-context.ts` currently derives request ID only. `RequestActorContext` has optional `role` and `safeActorId`, but no session/account lookup.
- `src/lib/api/response.ts` provides `{ data, meta }` / `{ error }` helpers, request ID metadata, and sensitive detail redaction.
- `src/lib/api/errors.ts` maps error codes to safe public messages and HTTP statuses.
- `src/utils/general/error.ts` already includes auth-related codes: `AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `EMAIL_NOT_VERIFIED`, `ADMIN_APPROVAL_REQUIRED`, `ACCOUNT_SUSPENDED`, `VALIDATION_FAILED`, `RATE_LIMITED`, `AUTHENTICATION`, `UNAUTHORIZED`, `FORBIDDEN`, and `INTERNAL_ERROR`.
- `src/domain/auth/roles.ts` defines active roles and `STORE_ADMIN` alias normalization. Do not duplicate role lists.
- `src/lib/crypto/password.ts` already implements PBKDF2-SHA256 with salt and pepper using Web Crypto and constant-time comparison. This is the approved new password path.
- `src/lib/crypto/hash.ts` is legacy salted SHA-256 helper and supports unsalted fallback. Do not use it for new auth password verification.
- `src/lib/crypto/session-token.ts` already generates opaque random session tokens and hashes them with SHA-256.
- `src/domain/schema/identity.ts` has `admins`, `customers`, and `customer_providers`. No session table exists. No admin/customer approval, suspension, verification, or password salt columns exist yet.
- `admins` has `email`, `password_hash`, `is_owner`, timestamps, and `admins_single_owner_idx` unique partial expression index.
- `customers.password_hash` is nullable for OAuth users. Existing schema has no customer verification fields; Story 1.8 owns full customer registration/verification.
- `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md` marks Admin sessions/tokens as missing and owned by Story 1.7.
- `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md` plans auth endpoints: `POST /api/auth/sessions`, `DELETE /api/auth/sessions/current`, `GET /api/auth/session`.

### Required Session Model

- Server-side session record is authority. Cookie contains opaque random token only.
- Store token hash, never raw token. Existing `hashSessionToken(...)` is appropriate for lookup keys.
- Session must support:
  - actor kind: Admin or Customer.
  - actor ID.
  - active/expired/revoked checks.
  - expiry timestamp.
  - revocation timestamp or status.
  - created/updated timestamps.
  - optional last-used timestamp.
  - safe request metadata if needed, such as created request ID and source IP hash, not raw secret material.
- Sign-out must revoke current session and clear cookie. Later stories can add bulk invalidation for account suspension/ownership transfer, but this story should structure data so that future invalidation is easy.
- Missing session must not throw. Public routes can proceed as Prospect/anonymous; protected route guards in Story 1.12 will convert missing actor to `AUTH_REQUIRED`.

### Account Eligibility Rules

- Valid password alone is insufficient for dashboard-capable sessions.
- Super Admin/Admin dashboard access requires active account. If fields for verified/approved/suspended are added now, default/backfill current seeded owner safely and document assumptions.
- If approval/suspension/verification fields are deferred to Story 1.11, this story must still expose a clear account-status shape and document release blocker for dashboard gates that cannot be enforced yet.
- Customer sign-in may create customer session only for accounts with password credentials. OAuth-only customers with `password_hash = null` must fail with safe generic auth behavior or account-state code that does not expose provider details.
- Unknown email and wrong password must produce same public response shape/message.

### API Contract Expectations

- `POST /api/auth/sessions`
  - Request body: email and password using TypeBox schema. Public JSON field names should be camelCase unless existing validation forces migration; do not leak DB snake_case rows.
  - Success response: `{ data: { actor: { id, role, accountStatus }, session: { expiresAt } }, meta: { requestId, code } }` or close equivalent. Do not return token/cookie value.
  - Error codes: `VALIDATION_FAILED`, `AUTHENTICATION`, `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`, `ADMIN_APPROVAL_REQUIRED`, `RATE_LIMITED`, `INTERNAL_ERROR`.
  - Rate-limit class: `auth-password`.
- `DELETE /api/auth/sessions/current`
  - Request: current session cookie.
  - Success response: standard envelope with revocation/cleared status only.
  - Error behavior: idempotent success is acceptable when no active session exists, but document choice in endpoint catalog.
  - Cookie clear must happen regardless of record state.
- `GET /api/auth/session`
  - Request: optional session cookie.
  - Success response: current actor/session summary when active; anonymous/prospect summary or `AUTH_REQUIRED` only if route contract chooses required auth.
  - Do not expose password hash, token hash, raw account status internals, provider metadata, or PII beyond email if explicitly required and safe.

### File Structure Guardrails

Expected touch scope:

- `src/domain/schema/identity.ts` or new `src/domain/schema/sessions.ts`
- `migrations/*.sql` and `migrations/meta/*.json` if schema changes are generated
- `src/domain/auth/**` for pure auth/session decision helpers and tests
- `src/server/routes/auth.routes.ts`
- `src/server/controllers/AuthController.ts`
- `src/server/services/AuthService.ts`
- `src/server/repositories/**` or `src/adapter/infrastructure/db/**` for D1/Drizzle session/account persistence
- `src/server/context/request-context.ts`
- `src/lib/crypto/password.ts` only if tests expose a required correction
- `src/lib/crypto/session-token.ts` only if tests expose a required correction
- `src/lib/typebox/api.ts` only if reusable envelope schemas need an auth-specific extension
- `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`
- `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md` if session migration evidence changes baseline

Avoid:

- New canonical files under `src/api/**`.
- Raw JWT/session payloads in cookies.
- Returning DB rows directly from API.
- New active roles or `STORE_ADMIN` output.
- Customer registration, email verification, password reset, Google OAuth, Admin CRUD, RBAC middleware, or ownership transfer beyond session hooks needed by this story.
- Production D1 migration or production seed/session data changes.
- Logging raw password, password hash, salt, pepper, session token, token hash, JWT, cookie, authorization header, OAuth token, provider payload, or unnecessary PII.

### Previous Story Intelligence

- Story 1.6 completed central role helpers and unique Super Admin owner invariant. Reuse `src/domain/auth/roles.ts`; do not recreate role constants in route metadata, logs, audit, or context.
- Story 1.6 hardened seed flow and owner uniqueness with migrations `0007_stormy_nighthawk.sql` and `0008_boring_yellowjacket.sql`; no production D1 seed or migration was run.
- Story 1.6 confirms current owner representation is `admins.is_owner = true`, not an active `SUPER_ADMIN` row role.
- Story 1.3 froze `src/api/**`; identity legacy routes/controllers/services are migration references only and still use old shapes.
- Story 1.2 established request IDs, safe operational logging, error envelope helpers, and audit event types. Reuse them instead of inventing new response/logging shapes.
- Recent commits: `87f0dac feat: 1-6 code reviewed`, `2621153 feat: 1-6 implemented`, `f23a606 feat: planned 1-6`, `d38c426 feat: 1-5 reviewed`, plus docs update `14f2b8f`.

### Latest Technical Information

- Elysia cookie docs confirm cookie values are reactive, can be set/removed through the cookie object, support `httpOnly`, `secure`, `sameSite`, `maxAge`, and support signed cookie secret rotation. Use this for cookie set/remove mechanics, while server-side session record remains authority. Source: https://elysiajs.com/patterns/cookie
- Cloudflare Workers Web Crypto docs confirm `crypto.subtle` is available in Workers and suited for cryptographic operations. Continue using Web Crypto-compatible password/session helpers; do not add Node-only auth crypto in request path. Source: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
- Cloudflare D1 docs recommend prepared statements with bound parameters for dynamic values and note `.first()` does not alter SQL, so add `LIMIT 1` on lookup queries. Use binds for session/account queries. Source: https://developers.cloudflare.com/d1/worker-api/prepared-statements/
- `jose` v6 is universal ESM and supports Cloudflare Workers. Keep `jose` for signed verification/reset/OAuth tokens in later stories; do not use JWT as browser session authority for this story. Source: https://github.com/panva/jose

### Testing Requirements

- Required:
  - `npm run check`
  - Targeted Vitest for new/changed auth/session tests, for example `npx vitest run src/domain/auth/*.test.ts src/server/**/auth*.test.ts src/server/context/*.test.ts`
- Required if schema changes:
  - `npm run db:generate`
  - inspect generated SQL for session tables/indexes and unrelated churn
  - record migration filename
- Recommended:
  - `npm run build-test` after schema, Elysia route, or request-context changes
- Test cases must include:
  - valid Super Admin/Admin sign-in
  - valid Customer sign-in only when password credential shape is supported
  - unknown email and wrong password sharing same public response
  - suspended/inactive/unverified/not-approved denial where fields exist, or documented blocker where fields do not exist yet
  - missing session
  - expired session
  - revoked session
  - sign-out revokes and clears cookie
  - request ID propagation survives auth failures
  - logs/errors do not include raw passwords, hashes, token/cookie/JWT/pepper/authorization values

### Project Structure Notes

- This story is backend/security/API work. UI sign-in form can remain out of scope unless needed for smoke testing.
- Keep dashboard RBAC route guards for Story 1.12, but Story 1.7 must provide enough actor context for those guards.
- Server state is authority for auth. Frontend must not infer privileged role from local state or public labels.
- If account status columns are introduced now, keep migration scoped to auth/session status only and update D1 migration plan. If deferred, record blocker because AC 3 cannot be fully enforced without status fields.

### References

- `_bmad-output/planning-artifacts/epics.md#Story-1.7-Secure-Session-Authentication`
- `_bmad-output/planning-artifacts/prd.md#Authentication-Model`
- `_bmad-output/planning-artifacts/prd.md#API-Endpoint-Areas`
- `_bmad-output/planning-artifacts/prd.md#Rate-Limits`
- `_bmad-output/planning-artifacts/prd.md#Security-Privacy`
- `_bmad-output/planning-artifacts/architecture.md#Authentication-and-Security`
- `_bmad-output/planning-artifacts/architecture.md#API-and-Communication-Patterns`
- `_bmad-output/planning-artifacts/architecture.md#Project-Structure-and-Boundaries`
- `_bmad-output/project-context.md#Security-And-Privacy`
- `_bmad-output/project-context.md#API-Layering`
- `_bmad-output/project-context.md#Testing-And-Quality`
- `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`
- `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md`
- `_bmad-output/implementation-artifacts/1-6-seed-unique-super-admin-and-deprecated-role-alias.md`
- `src/server/app.ts`
- `src/server/routes/index.ts`
- `src/server/routes/foundation.routes.ts`
- `src/server/context/request-context.ts`
- `src/domain/schema/identity.ts`
- `src/domain/auth/roles.ts`
- `src/lib/crypto/password.ts`
- `src/lib/crypto/session-token.ts`
- `src/lib/api/response.ts`
- `src/lib/api/errors.ts`
- `src/utils/general/error.ts`
- Elysia cookie docs: https://elysiajs.com/patterns/cookie
- Cloudflare Workers Web Crypto docs: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
- Cloudflare D1 prepared statements docs: https://developers.cloudflare.com/d1/worker-api/prepared-statements/
- jose runtime/support docs: https://github.com/panva/jose

## Story Context Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

### File List
