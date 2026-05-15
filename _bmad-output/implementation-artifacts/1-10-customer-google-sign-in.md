# Story 1.10: Customer Google Sign-In

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Customer,
I want to sign in with Google,
so that I can access JRW checkout/account flows without creating separate password credentials.

## Acceptance Criteria

1. Given Prospect or Customer starts Google sign-in, when OAuth flow begins, then system creates OAuth state with 10-minute expiry and at least 128 bits entropy, stores only hashed state/nonce material, and validates state before account linking or session creation.
2. Given Google callback returns a valid authorization code and verified email for a new Customer, when callback processing succeeds, then an active `CUSTOMER` account is created with nullable password credential fields, email marked verified, and no Admin OAuth path enabled.
3. Given Google callback returns a verified email matching an existing Customer, when auto-linking is safe, then provider identity links to that Customer account by Google `sub`, and local profile fields are not overwritten unless local field is empty.
4. Given Google callback returns a known Google `sub` already linked to a Customer, when sign-in succeeds, then that Customer receives a secure HttpOnly session cookie, and no provider access token, refresh token, ID token, or raw OAuth state appears in response, docs, or logs.
5. Given callback email is unverified, missing, mismatched, already linked to a different Customer, collides with Admin email, or otherwise unsafe, when callback is processed, then sign-in is rejected with safe error code, and no account link/session is created.
6. Given OAuth provider returns an error or token/userinfo request fails, when callback is handled, then Customer receives safe failure response or redirect, and operational log includes request ID plus safe provider context only.
7. Given OAuth session routes exist, when docs are generated, then OpenAPI metadata documents auth mode, roles, rate-limit class, request/response contracts or redirect behavior, and stable safe error codes.
8. Given implementation finishes, when tests run, then tests cover valid new-account callback, existing provider sign-in, safe email auto-link, invalid/expired/reused state, unverified/missing email, unsafe collisions, provider error, customer-only role enforcement, no token/log leakage, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Add OAuth state data model and migration. (AC: 1, 5, 8)
  - [ ] Extend `src/domain/schema/identity.ts` with an OAuth state table, suggested name `oauth_state_tokens`: `id`, `provider` (`GOOGLE`), `state_hash`, `nonce_hash`, `redirect_path`, `expires_at`, `used_at`, `created_request_id`, optional `source_hash`, `created_at`, `updated_at`.
  - [ ] Add unique index on `state_hash`, active state lookup index on `provider/state_hash/expires_at` where `used_at IS NULL`, and expiry cleanup index.
  - [ ] Keep raw state, nonce, authorization code, access token, refresh token, ID token, cookies, and provider payloads out of D1.
  - [ ] Review existing `customer_providers`: use `provider = "GOOGLE"` and `provider_user_id = Google sub`. Do not use email as provider identity key.
  - [ ] If changing provider indexes, prefer composite uniqueness on `(provider, provider_user_id)` while preserving current data. If migration risk is high, keep current unique `provider_user_id` for Google-only MVP and document future multi-provider debt.
  - [ ] Generate Drizzle migration with `npm run db:generate`; review SQL for only OAuth-state/provider-index changes.
  - [ ] Update `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md` with generated filename, OAuth state table ownership, provider metadata scrub policy, and remote development apply evidence or blocker.

- [ ] Add provider-free Google OAuth domain decisions. (AC: 1-5, 8)
  - [ ] Add `src/domain/auth/google-oauth.ts` plus tests.
  - [ ] Reuse `generateSessionToken(32)` / SHA-256 helpers from `src/lib/crypto/session-token.ts` for OAuth state and nonce; TTL must clamp to 10 minutes.
  - [ ] Validate `returnTo` / redirect path as same-origin relative path only. Reject absolute URLs, protocol-relative URLs, control chars, and unsafe paths; default to `/`.
  - [ ] Model decisions for state missing/expired/used, provider error, missing code, missing `sub`, missing email, `email_verified !== true`, unsafe admin/customer email collision, provider `sub` linked to another Customer, inactive/suspended Customer, and safe existing Customer link.
  - [ ] Safe auto-link rule: normalized verified Google email may link only to an active Customer when no Admin has same normalized email, the Google `sub` is not linked elsewhere, and existing local profile fields remain authoritative unless empty.
  - [ ] Existing unverified Customer may be marked verified only when Google `email_verified` is true, normalized email matches exactly, and all safe-link checks pass.

- [ ] Add Google OAuth provider boundary. (AC: 2-6, 8)
  - [ ] Add provider-facing code under `src/lib/google/**` or `src/adapter/infrastructure/google-oauth/**`; keep HTTP/JWKS/provider details out of domain and routes.
  - [ ] Build authorization URL with `response_type=code`, `scope=openid email profile`, `client_id`, registered `redirect_uri`, `state`, and `nonce`.
  - [ ] Use `access_type=online`; do not request offline access or persist refresh tokens for sign-in-only MVP.
  - [ ] Exchange callback code with `POST https://oauth2.googleapis.com/token` using form-urlencoded `client_id`, `client_secret`, `code`, `grant_type=authorization_code`, and exact `redirect_uri`.
  - [ ] Verify Google ID token locally with `jose` and Google JWKS. Required checks: signed token, issuer `https://accounts.google.com` or `accounts.google.com`, audience equals `GOOGLE_CLIENT_ID`, `exp` not expired, nonce matches stored nonce hash, `sub` present, `email` present, `email_verified === true`.
  - [ ] Treat Google `sub` as stable provider identity. Use email only for safe auto-link and profile bootstrap.
  - [ ] Ignore unrecognized Google token response fields. Never return, persist, or log access token, refresh token, ID token, auth code, nonce, or raw provider response.
  - [ ] Map Google/network/config failures to `PROVIDER_UNAVAILABLE` or safe `AUTHENTICATION`/`CONFLICT_STATE` decisions with scrubbed logs.

- [ ] Add repository operations with atomic state consumption and linking. (AC: 1-5, 8)
  - [ ] Add `src/server/repositories/GoogleOAuthRepository.ts` or equivalent focused repository.
  - [ ] Operations needed: create OAuth state, find state by hash, atomically consume state once, find provider link by `provider/providerUserId`, find Customer by normalized email, detect Admin email collision, create Customer for Google, create provider link, update only empty Customer profile fields from Google claims, mark email verified when safe, and create server-side session.
  - [ ] State consumption must happen before account linking/session creation and must be single-use. Replayed callback must return conflict/not found and create no session.
  - [ ] Link/create Customer and provider link in one D1 batch/transactional sequence where possible. Avoid state where provider link exists for missing Customer or session exists before link decision.
  - [ ] Preserve `customers.password_hash` and `customers.password_salt` as nullable for OAuth-created accounts; do not create password credentials.
  - [ ] Store provider metadata as minimal safe JSON only, e.g. provider `sub`, normalized email, `email_verified`, optional `name`/`picture` if used for empty fields. Exclude tokens, raw JWT, raw provider payload, locale, and unnecessary PII.

- [ ] Add service/controller/route layer. (AC: 1-7)
  - [ ] Add `GoogleOAuthService` / `GoogleOAuthController`, or extend auth service only if it stays focused. Avoid a God service.
  - [ ] Add canonical routes under `src/server/routes/**`, suggested:
    - `GET /api/oauth/google/sessions`: creates state and redirects to Google authorization URL.
    - `GET /api/oauth/google/callback`: validates callback, consumes state, links/creates Customer, creates session, sets cookie, and redirects to safe `returnTo` or default path.
  - [ ] If implementing Google Identity Services popup mode too, add a separate `POST /api/oauth/google/sessions` only with explicit state/header validation; do not mix popup and redirect semantics in one handler.
  - [ ] Factor session cookie helpers from `src/server/routes/auth.routes.ts` into `src/server/auth/session-cookie.ts` or another shared auth helper so OAuth uses same `jrw_session` flags: HttpOnly, SameSite=Lax, Secure outside local HTTP, path `/`, expiry aligned to session expiry.
  - [ ] Add route options through `src/server/routes/index.ts` and `src/server/app.ts` so operational logger injection works like Auth, AccountRecovery, and Customers.
  - [ ] Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` / `APP_BASE_URL` config resolver. Missing or invalid config must fail safely with `PROVIDER_UNAVAILABLE`.
  - [ ] Update `.env.example` if exact redirect URI env is required. Do not expose secrets in generated docs.
  - [ ] Use route metadata: tags `Auth`, public auth mode with `PROSPECT`/`CUSTOMER` where applicable, rate-limit class `oauth-login` or documented chosen class, and error codes `VALIDATION_FAILED`, `AUTHENTICATION`, `AUTH_FORBIDDEN`, `CONFLICT_STATE`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`.

- [ ] Preserve customer account/profile behavior. (AC: 2-5)
  - [ ] New Google-created Customer response/session role must be `CUSTOMER`; never create `ADMIN`, `SUPER_ADMIN`, `STORE_ADMIN`, approval state, or dashboard access from Google.
  - [ ] Do not overwrite existing `display_name`, `first_name`, `last_name`, or `avatar_url` unless local value is null/empty.
  - [ ] Do not modify phone, delivery/contact fields, email marketing preference, password hash/salt, or Admin fields from Google claims.
  - [ ] Existing suspended/inactive Customer cannot sign in through Google. Existing Admin with same email blocks customer auto-link.
  - [ ] Keep customer transactional email rules untouched; Google sign-in does not opt customer into marketing.

- [ ] Update endpoint catalog and docs. (AC: 7)
  - [ ] Update `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md` from planned Story 1.10 row to concrete implemented routes, DTO/schema names, redirect behavior, rate-limit class, auth metadata, and error codes.
  - [ ] Add docs note that `customer_providers.provider_user_id` stores Google `sub`, not email.
  - [ ] OpenAPI/docs must not include example auth codes, state values, ID tokens, access tokens, refresh tokens, client secret, raw Google response, or provider payload.

- [ ] Add focused tests and run validation. (AC: 1-8)
  - [ ] Domain tests: state/nonce entropy, hash-only state storage, 10-minute TTL clamp, return path safety, provider identity decisions, verified email auto-link, unsafe collision decisions.
  - [ ] Schema invariant tests: OAuth state table exists with hashed state/nonce and indexes; no raw token/code columns; provider table stores safe link fields only.
  - [ ] Service/repository tests: start creates hashed state; callback consumes state once; valid new Customer path; existing provider path; existing Customer auto-link path; suspended/inactive/customer-admin collision rejection; profile fields preserved.
  - [ ] Provider adapter tests: token exchange request shape, ID token verification claims, provider error mapping, no raw token/provider response in logs.
  - [ ] Route/controller tests: redirect status/location, set-cookie flags, safe error redirect/envelope, OpenAPI metadata, request ID propagation, no token leakage in response bodies.
  - [ ] Run targeted Vitest for new domain/service/route/adapter/schema tests.
  - [ ] Run `npm run check`. Because story touches schema/routes/provider code, run `npm run build-test` unless blocked; record exact blocker.

## Dev Notes

### Previous Story Intelligence

- Story 1.9 completed password reset, verification resend, account email notification boundary, atomic per-email recovery rate limiting, provider error redaction, endpoint catalog updates, and D1 migration plan updates.
- Story 1.9 fixed provider failure logging that could leak recipient email and changed recovery rate limiting to atomic `consumeAttempt` scoped per normalized email. OAuth provider errors need same scrub discipline.
- Story 1.9 preserved reset/resend enumeration safety: public responses must not expose missing/ineligible/provider-failed account state. OAuth can fail visibly, but failure reason must stay safe and must not disclose whether an Admin account owns the same email.
- Story 1.9 validation passed full `npm run build-test`; follow same validation bar for provider/auth/schema changes.
- Remote development D1 migrations for Stories 1.8 and 1.9 remain documented blockers in migration plan. If Story 1.10 adds OAuth state migration, record dependency on pending remote apply evidence.
- Recent commits:
  - `6789d36 feat: sprint 1-9 reviewed` hardened provider error redaction and rate-limit behavior.
  - `a96b55c feat: implemented 1-9` added recovery service/routes/repository and Resend account email boundary.
  - `0b9c9c3 log: phase 2 of 1-9` updated customer route tests and route behavior.

### Current Files To Update And Preserve

- `src/domain/schema/identity.ts`
  - Current state: `admins`, `customers`, `email_verification_tokens`, `password_reset_tokens`, `customer_providers`, `sessions`, and `auth_rate_limits`.
  - Change: add OAuth state/nonce table; optionally refine provider indexes if safe.
  - Preserve: unique owner index, customer nullable password fields, email verification/reset token hashes, session indexes, and `customer_providers` relation to `customers`.

- `src/domain/schema-invariants.test.ts`
  - Current state: validates owner, session, rate-limit, customer, email token, and reset token invariants.
  - Change: add OAuth state/provider invariants.
  - Preserve: no raw secret/token/password columns across identity tables.

- `src/lib/crypto/session-token.ts` and `src/domain/auth/session-credentials.ts`
  - Current state: Workers-compatible Web Crypto token generation/hash and session credential creation.
  - Change: reuse for OAuth state/nonce/session; no Node `crypto`.
  - Preserve: raw token only exists during redirect/cookie composition.

- `src/server/routes/auth.routes.ts`
  - Current state: email/password sessions, cookie helper logic, source IP hashing, runtime password pepper validation.
  - Change: factor reusable cookie helpers into `src/server/auth/session-cookie.ts` if OAuth needs them.
  - Preserve: existing session route behavior and cookie flags.

- `src/server/repositories/AuthRepository.ts`
  - Current state: account lookup, session creation/find/revoke/touch, auth rate limiter with `consumeAttempt`.
  - Change: reuse `DrizzleAuthSessionRepository` and `DrizzleAuthRateLimiter`; avoid duplicating session/rate-limit tables.
  - Preserve: Admin-first email/password lookup behavior for password auth. OAuth must do its own Admin collision check before customer auto-link.

- `src/server/app.ts` and `src/server/routes/index.ts`
  - Current state: composes foundation, auth, account recovery, and customer routes with operational logger injection.
  - Change: add Google OAuth route group/options in same style.
  - Preserve: Cloudflare adapter, `aot: false`, `normalize: true`, request context, safe error mapper.

- `src/adapter/infrastructure/logging/operational-log.ts`
  - Current state: scrubs password/hash/JWT/token/secret/cookie/session/email/provider/payment/stack-like keys and sensitive strings including `ya29.` Google access tokens.
  - Change: add OAuth-specific tests if new provider error shapes reveal gaps.
  - Preserve: logging must not change auth outcomes.

- `.env.example`
  - Current state: already has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; no explicit redirect URI.
  - Change: add `GOOGLE_REDIRECT_URI` if config resolver requires it; document fallback to `APP_BASE_URL` plus `/api/oauth/google/callback` only if implemented.
  - Preserve: secrets remain placeholders only.

### API Contract Guidance

- `GET /api/oauth/google/sessions`
  - Auth: public; roles metadata `PROSPECT`, `CUSTOMER`.
  - Query: optional `returnTo` safe relative path.
  - Success: `302` redirect to Google authorization URL.
  - Side effect: create one hashed OAuth state/nonce record with <=10 minute expiry.
  - Errors: `VALIDATION_FAILED`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`.
  - Response/docs: no raw state examples, no client secret, no provider token examples.

- `GET /api/oauth/google/callback`
  - Auth: public; roles metadata `PROSPECT`, `CUSTOMER`.
  - Query: `code`, `state`, optional Google `error`, plus ignored unrecognized fields.
  - Success: `302` redirect to safe `returnTo` or default path and sets `jrw_session`.
  - Failure: safe redirect or standard error envelope; no account link/session on failure.
  - Errors: `VALIDATION_FAILED`, `AUTHENTICATION`, `AUTH_FORBIDDEN`, `CONFLICT_STATE`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`.

- Optional `POST /api/oauth/google/sessions`
  - Only add if implementing Google Identity Services popup/code model.
  - Must validate state/header before code exchange. For popup mode, Google docs require `X-Requested-With: XmlHttpRequest`.
  - Response success can be standard envelope with session summary but still sets HttpOnly cookie and never returns raw session/provider tokens.

### Account Linking Rules

- Provider identity key is Google `sub`; never email.
- New account: create `customers` row with normalized email, `status = ACTIVE`, `email_verified_at = now`, nullable password hash/salt, optional empty-field profile bootstrap from Google `name`/`given_name`/`family_name`/`picture`.
- Existing provider link: sign in linked Customer if Customer is `ACTIVE`. Do not re-link by email.
- Safe auto-link by email: allowed only when Google email is verified, normalized email matches one active Customer, no Admin email collision exists, no existing provider link points to another Customer, and Customer is not suspended/inactive.
- Unsafe cases: Admin email collision, provider `sub` linked to another Customer, email missing/unverified, normalized email mismatch, inactive/suspended Customer, duplicate ambiguous customer/provider state. Return safe error, no session.
- Local profile preservation: Google may fill only null/empty Customer profile fields. Phone, address, marketing preference, password credential, Admin approval/owner fields stay untouched.

### Latest Technical Information

- Google OAuth web server flow docs show redirect to `https://accounts.google.com/o/oauth2/v2/auth` with `response_type=code`, `state`, `redirect_uri`, and `client_id`, then exchanging code at `https://oauth2.googleapis.com/token`. Source: https://developers.google.com/identity/protocols/oauth2/web-server
- Google Identity Services code model docs say redirect mode callback receives `GET` query parameters including `code` and `state`; popup mode requires `X-Requested-With: XmlHttpRequest` before token exchange. Source: https://developers.google.com/identity/oauth2/web/guides/use-code-model
- Google OpenID Connect docs require validating signed ID token, issuer, audience, expiry, and using `sub` as stable unique identifier. Email is not stable enough as primary identity key; `email_verified` is present when `email` scope is requested. Source: https://developers.google.com/identity/openid-connect/openid-connect
- Installed project versions from `package.json`: `jose@^6.2.3`, `elysia@^1.4.28`, `@elysiajs/openapi@^1.4.15`, `drizzle-orm@^0.45.2`, `astro@^6.1.9`, Cloudflare adapter `@astrojs/cloudflare@^13.2.1`.
- Use existing `jose` instead of adding Node-only JWT/OAuth packages. `jose` supports Workers-compatible JWT verification with remote JWKS via Web APIs.

### Project Structure Notes

- Use Route -> Controller -> Service -> Domain/Repository.
- New backend/API work belongs under `src/server/**`; do not add new `src/api/**` routes.
- Domain code must not import Astro, Elysia, D1, Google fetch clients, request objects, or Cloudflare bindings.
- Google provider code belongs under `src/lib/google/**` and/or `src/adapter/infrastructure/google-oauth/**`, not `src/utils/**`.
- Auth/session cookie helpers should be shared instead of copied.
- Tests should stay co-located as `*.test.ts`; shared fakes belong in `src/test/fakes/**` only if reuse justifies it.
- Update endpoint catalog and migration plan docs as implementation artifacts; story is incomplete without docs updates.

### Anti-Patterns To Avoid

- Using Google email as primary provider identity.
- Auto-linking when an Admin has the same email.
- Creating Admin/Super Admin through Google OAuth.
- Returning raw Google tokens, OAuth state, nonce, auth code, or raw session token in JSON.
- Storing access token, refresh token, ID token, raw state, raw nonce, raw auth code, or raw provider payload in D1.
- Logging provider response bodies, ID token claims wholesale, email, auth code, state, nonce, cookie, JWT, Google access token, client secret, or stack trace.
- Adding `google-auth-library`, `jsonwebtoken`, Node `crypto`, or browser-only Google SDK usage in Worker request path without explicit Workers compatibility proof.
- Building storefront/account UI beyond minimal redirect target support unless needed for route smoke tests.
- Applying production migrations or changing owner/admin credentials during this story.

## References

- Story requirements: `_bmad-output/planning-artifacts/epics.md` Story 1.10.
- PRD requirements: `_bmad-output/planning-artifacts/prd.md` FR7, FR8, auth endpoint expectations, Google OAuth integration requirements, security/privacy NFRs.
- Architecture rules: `_bmad-output/planning-artifacts/architecture.md` Authentication & Security, API & Communication Patterns, Architectural Boundaries, Integration Points.
- UX rules: `_bmad-output/planning-artifacts/ux-design-specification.md` Customer purchase journey, feedback patterns, recovery states.
- Project context: `_bmad-output/project-context.md`.
- Previous story: `_bmad-output/implementation-artifacts/1-9-password-reset-and-account-email-notifications.md`.
- Endpoint catalog: `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`.
- Migration plan: `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md`.
- Google OAuth web server docs: https://developers.google.com/identity/protocols/oauth2/web-server
- Google Identity Services code model: https://developers.google.com/identity/oauth2/web/guides/use-code-model
- Google OpenID Connect docs: https://developers.google.com/identity/openid-connect/openid-connect
- Current code: `src/domain/schema/identity.ts`, `src/domain/schema-invariants.test.ts`, `src/domain/auth/auth-decisions.ts`, `src/domain/auth/session-credentials.ts`, `src/lib/crypto/session-token.ts`, `src/server/routes/auth.routes.ts`, `src/server/repositories/AuthRepository.ts`, `src/server/app.ts`, `src/server/routes/index.ts`, `src/adapter/infrastructure/logging/operational-log.ts`, `.env.example`.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Story context created from sprint status next backlog item on 2026-05-15.
- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List
