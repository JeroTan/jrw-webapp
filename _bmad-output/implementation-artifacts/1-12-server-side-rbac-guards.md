# Story 1.12: Server-Side RBAC Guards

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As JRW,
I want server-side role guards for Super Admin, Admin, Customer, and Prospect access,
so that protected routes enforce permissions even if UI controls are bypassed.

## Acceptance Criteria

1. Given API route requires authenticated actor, when request has no valid session, then system returns `AUTH_REQUIRED`, and no route action executes.
2. Given API route requires `SUPER_ADMIN`, when a valid non-owner actor such as Admin or Customer calls it, then system returns `AUTH_FORBIDDEN`, and no state changes. Anonymous or invalid sessions still return `AUTH_REQUIRED`.
3. Given API route requires `ADMIN`, when active approved Admin calls it, then request proceeds, and suspended, unapproved, unverified, Customer, Prospect, and anonymous actors are denied.
4. Given API route requires `CUSTOMER`, when Customer calls it, then request proceeds, and Admin/Super Admin access is only allowed if route explicitly documents fallback behavior.
5. Given public storefront route supports `PROSPECT`, when anonymous actor browses public catalog route, then route can proceed with Prospect context, and no protected account/order/admin data is exposed.
6. Given legacy role input uses `STORE_ADMIN`, when RBAC checks normalize role, then it is evaluated as `ADMIN`, and no separate `STORE_ADMIN` permission branch exists.
7. Given guards are used in routes, when route contract docs are generated, then auth metadata documents required roles and errors, and rate-limit class is present for completed endpoints.
8. Given implementation finishes, when tests run, then tests cover allowed/denied paths for each role and account status, and route handlers remain free of business rules beyond guard composition.

## Tasks / Subtasks

- [ ] Add pure RBAC policy evaluator. (AC: 1-6, 8)
  - [ ] Create `src/domain/auth/rbac.ts` with provider-free decisions for `public`, `optional`, and `required` route access using existing `ActiveUserRole`, `ActorRole`, `RouteAuthMetadata`, and stable error codes.
  - [ ] Reuse `normalizeUserRole(...)` from `src/domain/auth/roles.ts` so `STORE_ADMIN` maps to `ADMIN`; do not add `STORE_ADMIN` to active role lists or branch logic.
  - [ ] Treat allowed roles as exact, not hierarchical. If a `CUSTOMER` route allows Super Admin fallback, route metadata must list both roles and explain why.
  - [ ] Return `AUTH_REQUIRED` for missing/anonymous invalid sessions; return `AUTH_FORBIDDEN` for authenticated actors with disallowed roles.
  - [ ] For authenticated allowed-role actors with known ineligible account state, return the safest specific code: `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`, or `ADMIN_APPROVAL_REQUIRED` where request context exposes it.
  - [ ] Add `src/domain/auth/rbac.test.ts` covering Super Admin, Admin, Customer, Prospect, anonymous, `STORE_ADMIN`, suspended, unverified, unapproved, and explicit fallback cases.

- [ ] Add Elysia guard helper under canonical server middleware. (AC: 1-8)
  - [ ] Create `src/server/middleware/rbac.ts` that converts route auth metadata into a `beforeHandle`/guard hook using `requestContext.actor`.
  - [ ] Ensure denial happens before route controller/service factory execution. Prefer throwing `GeneralError` or returning standard API error through existing helpers so `x-request-id` and `{ error }` envelope stay intact.
  - [ ] Keep request context source as `src/server/context/request-context.ts`; do not read cookies or DB again inside guard.
  - [ ] Keep API-specific guard in `src/server/middleware/**`; do not move live auth logic into `src/lib/middleware/**`, which is generic middleware tooling.
  - [ ] Add `src/server/middleware/rbac.test.ts` proving handler/controller callback is not called when guard denies request.

- [ ] Apply guards to completed protected routes without changing public routes. (AC: 1-5, 7, 8)
  - [ ] Update `src/server/routes/admin-accounts.routes.ts` so all Admin Account endpoints are guarded before handlers with `required + SUPER_ADMIN`.
  - [ ] Update `src/server/routes/customer.routes.ts` so `GET /customers/me` and `PATCH /customers/me` are guarded before handlers with `required + CUSTOMER`.
  - [ ] Keep `POST /customers`, `POST /email-verifications`, Google OAuth start/callback, password reset request/confirmation, foundation route, sign-in, sign-out, and session inspection public/optional exactly as documented unless a route contract explicitly changes.
  - [ ] Preserve controller/service authorization checks as defense in depth; story adds route-level enforcement, it does not delete service guards.
  - [ ] Do not add new business endpoints in this story.

- [ ] Keep OpenAPI metadata and endpoint catalog truthful. (AC: 7)
  - [ ] Keep using `routeDetail(...)` from `src/server/openapi/route-metadata.ts`; do not create a second metadata helper.
  - [ ] If guard can emit new error codes for a route, add those codes to route `detail.errorCodes`, response schemas via `openApiErrorResponses(...)`, and `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`.
  - [ ] Add/adjust OpenAPI tests proving protected endpoints still document `x-auth`, `x-rate-limit-class`, and `x-error-codes`.

- [ ] Expand denied-path route tests. (AC: 1-8)
  - [ ] In `src/server/routes/admin-accounts.routes.test.ts`, test anonymous/no cookie, Admin, Customer, and Prospect contexts against at least one read and one mutation endpoint; assert `AUTH_REQUIRED`/`AUTH_FORBIDDEN` and zero controller calls.
  - [ ] In `src/server/routes/customer.routes.test.ts`, test anonymous, Admin, and Super Admin contexts against `/customers/me`; assert denial and zero controller calls.
  - [ ] Add a test-only route or middleware-level test for `required + ADMIN` because current completed routes do not yet expose an Admin-only endpoint.
  - [ ] Add a public Prospect test showing public route still executes with anonymous actor and does not expose protected data.

- [ ] Validate and document completion. (AC: 7, 8)
  - [ ] Run targeted Vitest for RBAC domain/middleware/route tests.
  - [ ] Run `npm run check`.
  - [ ] Run `npm run build-test` if targeted tests and type checks pass.
  - [ ] Record exact blockers if any check fails.

## Dev Notes

### Epic Context

- Story 1.12 finishes Epic 1 role boundary foundation after secure sessions, customer identity, Google OAuth, and Admin lifecycle APIs.
- Primary anchors: FR9 and FR11; NFR7 requires automated tests for protected dashboard role authorization.
- Story 1.13 ownership transfer depends on this story: stale or wrong-role sessions must not retain owner authority.
- No UI implementation required. UX relevance is role clarity: Super Admin, Admin, Customer, and Prospect surfaces must not become interchangeable.

### Current Code Intelligence

- `src/server/context/request-context.ts`
  - Current: Elysia scoped derive creates `requestContext` and `requestId` after `astroBridgeDecorations`; missing/malformed cookie or failed session inspection becomes anonymous `PROSPECT`.
  - Change: guard reads `requestContext.actor`; no duplicate cookie parsing or DB access in guard.
  - Preserve: per-request scoping, `x-request-id` response header, anonymous Prospect fallback.

- `src/server/services/AuthService.ts`
  - Current: `inspectSession` hashes `jrw_session`, checks session state, loads account, and returns anonymous if account is inactive, suspended, unverified, or unapproved.
  - Change: none expected except tests may add fixtures. Guard should not weaken this anonymous downgrade.
  - Preserve: no raw session token in responses/logs; `touchSession` only after valid session/account.

- `src/domain/auth/roles.ts`
  - Current: active roles are `SUPER_ADMIN`, `ADMIN`, `CUSTOMER`, `PROSPECT`; `STORE_ADMIN` aliases to `ADMIN`.
  - Change: reuse these exports for RBAC evaluator.
  - Preserve: no active `STORE_ADMIN` role.

- `src/domain/auth/auth-decisions.ts`
  - Current: derives owner/Admin/Customer role and account/session eligibility.
  - Change: may be reused or lightly extended for RBAC status decisions.
  - Preserve: existing sign-in/session behavior and safe codes.

- `src/server/routes/admin-accounts.routes.ts`
  - Current: all endpoints document `required + SUPER_ADMIN` but handlers still instantiate controller and rely on service `requireOwner(...)` for denial.
  - Change: add before-handler guard so unauthorized requests never execute controller/service work.
  - Preserve: TypeBox schemas, `routeDetail(...)`, safe DTOs, account lifecycle endpoint behavior from Story 1.11.

- `src/server/routes/customer.routes.ts`
  - Current: `/customers/me` routes document `required + CUSTOMER` but rely on service `requireCustomerActor(...)`.
  - Change: add before-handler guard for profile read/update only.
  - Preserve: public registration and verification routes; customer DTO excludes secret/internal fields.

- `src/server/openapi/route-metadata.ts`
  - Current: `RouteAuthMetadata` has `mode` plus exact `roles`; `routeDetail(...)` emits `x-auth`, `x-rate-limit-class`, `x-error-codes`.
  - Change: use metadata shape as guard policy input if possible.
  - Preserve: single metadata helper.

- `src/server/app.ts`
  - Current route order: OpenAPI, CORS, error handling, Astro bridge decorations, request context plugin, then routes.
  - Change: avoid broad reorder. Guard must run inside routes after request context exists.
  - Preserve: Cloudflare adapter, `aot: false`, `normalize: true`, safe `onError` mapping.

- `src/lib/middleware/**`
  - Current: generic middleware builder/pattern matching with tests; readme states API-specific request IDs, actors, and response envelopes stay in server code.
  - Change: none expected.
  - Preserve: generic provider-free builder behavior.

### Previous Story Intelligence

- Story 1.11 added Admin lifecycle APIs, safe Admin DTOs, Super Admin service guard, and route metadata, but route tests mostly prove controller boundary success and schema rejection.
- Story 1.11 review fixed concurrency and provider-email edge cases. Continue pattern: route change plus targeted tests before status change.
- Story 1.11 established `controllerFactory` test seams. Use those seams to assert denied requests do not instantiate/call controllers.
- Do not remove service-level `requireOwner(...)` or `requireCustomerActor(...)`; route guards are first-line enforcement, service guards remain defense in depth.

### Git Intelligence Summary

- `b404a1e feat: 1-11 reviewed`
  - Review patches focused on stale writes, provider-email nonblocking behavior, and safe conflicts. Pattern: security stories need edge-case hardening after happy path.
- `b362503 feat: implemented 1-11`
  - Added vertical slice: domain, repository, service, controller, routes, route tests, docs, migration notes. Pattern: route contract changes need matching tests and artifact updates.
- `a2850aa docs: planned 1-11`
  - Story creation marked sprint status and created comprehensive dev notes. Pattern: story file itself is implementation guide.
- `0245025 chore: reviewed 1-10`
  - OAuth review hardened safe errors and token/provider secrecy. Pattern: auth-adjacent work must protect secrets and exact error surfaces.

### Architecture Compliance

- Backend/API work belongs under `src/server/**`; pure rules belong under `src/domain/**`.
- Route -> Controller -> Service -> Domain/Repository stays intact. Guards belong at route/middleware boundary and must not contain business use-case logic.
- Success envelope remains `{ data, meta }`; error envelope remains `{ error: { code, message, details? } }`.
- Stable error codes: `AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`, `ADMIN_APPROVAL_REQUIRED`, `VALIDATION_FAILED`, `INTERNAL_ERROR`.
- Public route `PROSPECT` means anonymous browsing only. It must never expose protected account, order, admin, audit, payment, or session data.
- Server state is authority for auth and authorization; UI hiding is never enough.

### Library / Framework Requirements

- Current package pins already match latest checked versions on 2026-05-16:
  - `elysia` `1.4.28`
  - `@elysiajs/openapi` `1.4.15`
  - `@elysiajs/cors` `1.4.2`
- Elysia official docs: `guard` bulk-applies hooks/schema to subsequent routes in the same instance; registration order matters.
- Elysia lifecycle docs: `beforeHandle` runs before route handler and is intended for custom validation before handler execution.
- Elysia OpenAPI docs: route `detail` extends the OpenAPI Operation Object; `/openapi` and `/openapi/json` remain generated docs surfaces.
- Use existing `routeDetail(...)`, `openApiErrorResponses(...)`, `apiErrorWithRequestId(...)`, and `GeneralError` mapping before inventing new helpers.

### Anti-Patterns To Avoid

- UI-only authorization.
- Handler-level checks that still instantiate controllers or mutate state before denial.
- Implicit role hierarchy where `SUPER_ADMIN` automatically passes `ADMIN` or `CUSTOMER` routes.
- Active `STORE_ADMIN` branch or docs exposing it as current role.
- Duplicate response-envelope or OpenAPI metadata helpers.
- Moving live server auth into deprecated `src/api/**` or generic `src/lib/middleware/**`.
- Returning `AUTH_FORBIDDEN` for missing/invalid sessions; use `AUTH_REQUIRED`.
- Returning protected data from public Prospect routes.

### Testing Requirements

Minimum required before story completion:

- Domain RBAC matrix: all roles, `STORE_ADMIN`, anonymous, exact role match, explicit fallback, suspended, unverified, unapproved.
- Middleware guard tests: denial before handler, request ID preserved, safe error envelope/codes.
- Admin route tests: denied anonymous/Admin/Customer/Prospect calls do not call Admin controller; Super Admin succeeds.
- Customer route tests: denied anonymous/Admin/Super Admin calls do not call Customer controller; Customer succeeds.
- OpenAPI tests: protected routes document auth metadata, error codes, and rate limit class.
- Regression: foundation/public routes still work for Prospect.

Validation commands:

```bash
npx vitest run src/domain/auth/rbac.test.ts src/server/middleware/rbac.test.ts src/server/routes/admin-accounts.routes.test.ts src/server/routes/customer.routes.test.ts
npm run check
npm run build-test
```

## References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 1, Story 1.12)
- PRD anchors: `_bmad-output/planning-artifacts/prd.md` (FR9, FR11; auth model; error code catalog; NFR7)
- Architecture anchors: `_bmad-output/planning-artifacts/architecture.md` (Authentication & Security; API & Communication Patterns; Structure Patterns; Enforcement Guidelines)
- UX anchors: `_bmad-output/planning-artifacts/ux-design-specification.md` (Role clarity, valid actions, Super Admin governance, sensitive action patterns)
- Project context: `_bmad-output/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/1-11-admin-account-management-and-approval.md`
- Endpoint catalog baseline: `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`
- Elysia guard docs: https://elysiajs.com/tutorial/getting-started/guard/
- Elysia lifecycle docs: https://elysiajs.com/essential/life-cycle
- Elysia OpenAPI plugin docs: https://elysiajs.com/plugins/openapi

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

- Story context generation run only (no feature implementation commands executed).
- 2026-05-16T17:19:46+08:00: Activated `bmad-create-story`, loaded workflow config, project context, sprint status, planning artifacts, previous story, current code, recent git history, and latest Elysia docs.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story includes AC-complete task map, file-level guardrails, current-code intelligence, previous story learnings, git intelligence, latest framework notes, and validation commands.

### File List

- `_bmad-output/implementation-artifacts/1-12-server-side-rbac-guards.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
