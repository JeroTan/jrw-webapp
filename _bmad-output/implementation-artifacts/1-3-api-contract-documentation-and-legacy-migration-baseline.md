# Story 1.3: API Contract Documentation and Legacy Migration Baseline

Status: done

## Story

As a developer/agent,
I want machine-readable API contract documentation, endpoint catalog baseline, and explicit legacy migration notes,
so that future endpoint stories know current contracts, auth metadata, errors, endpoint ownership, and deprecated paths.

## Acceptance Criteria

1. Given Elysia route contracts exist under `src/server/**`, when OpenAPI setup is completed, then implemented endpoints expose machine-readable API docs and docs include params, query, body, responses, tags, summaries, descriptions, auth metadata, rate-limit class, and documented error codes where endpoint is considered complete.
2. Given route modules define contracts, when new endpoint stories add or modify routes, then contracts use TypeBox/Elysia schemas and reusable response schemas come from `src/lib/typebox/api.ts`.
3. Given legacy API files exist under `src/api/**`, when migration notes are written, then notes list migrated, wrapped, frozen, and removal-candidate modules and notes warn that new backend/API work belongs under `src/server/**`.
4. Given MVP route groups are known, when endpoint catalog baseline is written, then each route group has a table row for known or planned method/path, owning story, auth mode, roles, rate-limit class, primary DTO/schema, error codes, and implementation status and later feature stories must update the catalog when endpoints are added or changed.
5. Given `src/server/app.ts` had outdated route drift, when docs are reviewed, then outdated scaffold routes are identified or removed and current JRW route naming follows plural kebab-case nouns.
6. Given API docs may expose sensitive areas, when docs are generated, then docs show public contract metadata only and no secrets, tokens, raw provider payloads, or environment values appear.
7. Given architecture requires endpoint-level API contract table, when baseline API contract and migration documentation are created, then initial contract/migration document exists as baseline and later feature stories can extend it per endpoint.
8. Given validation exists, when story implementation finishes, then `npm run check` passes or blocker is documented and docs generation route/build path is documented.
9. Given story outputs are reviewed, when implementation is accepted, then OpenAPI docs route/build path, endpoint catalog baseline, and legacy migration notes exist as referenced artifacts and output summary names each artifact path and how later endpoint stories update it.

## Tasks / Subtasks

- [x] Confirm runtime OpenAPI contract exposure. (AC: 1, 6, 8, 9)
  - [x] Verify `src/server/app.ts` keeps `openapi({ documentation: openApiDocumentation })` in canonical app composer.
  - [x] Document current docs UI route and JSON spec route, expected as `GET /api/openapi` and `GET /api/openapi/json` unless implementation changes plugin path/specPath.
  - [x] Add or extend a focused test that reads `/api/openapi/json` and asserts the Foundation route appears with summary, description, tags, response schema, `x-auth`, `x-rate-limit-class`, and `x-error-codes`.
  - [x] Verify generated docs/spec contain no secrets, tokens, provider payloads, environment values, or legacy QR Resto wording.

- [x] Create endpoint catalog baseline artifact. (AC: 4, 7, 9)
  - [x] Create `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`.
  - [x] Include required columns: method/path, route group, owning story, auth mode, roles, rate-limit class, primary DTO/schema, documented error codes, implementation status, notes.
  - [x] Mark `GET /api/` as the only current completed canonical endpoint unless current code proves more.
  - [x] Add planned rows for MVP route groups from `src/server/routes/route-groups.ts`: admin-auth, customer-auth, brands, products, checkout, payments, webhooks, orders, returns-refunds, assets, audit.
  - [x] Include update rule: every future endpoint story must update this catalog when route method/path, schema, auth, role, rate-limit, or error-code behavior changes.

- [x] Refresh legacy API migration baseline. (AC: 3, 5, 7, 9)
  - [x] Create `_bmad-output/implementation-artifacts/1-3-legacy-api-migration-baseline.md` or update `_bmad-output/implementation-artifacts/1-1-legacy-api-migration-notes.md` with a clear Story 1.3 section.
  - [x] Preserve Story 1.1 freeze rule: no new backend/API code under `src/api/**`.
  - [x] Classify remaining legacy files as migrated, wrapped, frozen, or removal-candidate.
  - [x] Name removal blockers by future story or epic; do not delete `src/api/**` in this story unless replacement is complete and tests/check pass.
  - [x] Call out drift to avoid: legacy `{ data, message, code }` responses, mock endpoint behavior, stale QR Resto naming, domain services importing platform bindings.

- [x] Keep route contract conventions explicit. (AC: 1, 2, 4, 6)
  - [x] Reuse `src/server/openapi/route-metadata.ts` and `routeDetail(...)` instead of creating duplicate metadata helpers.
  - [x] Reuse `src/lib/typebox/api.ts` helpers for success/error response schemas.
  - [x] Document route-level expectations in the catalog or `src/server/openapi/_readme.md`: params/query/body/response schemas, tags, summary, description, auth metadata, rate-limit class, and error codes.
  - [x] Keep public API JSON camelCase; map DB snake_case rows to DTOs at controller/service boundary in later endpoint stories.

- [x] Validate and record evidence. (AC: 8, 9)
  - [x] Run `npx vitest run src/server/app.test.ts src/server/openapi/route-metadata.test.ts` or broader relevant tests.
  - [x] Run `npm run check`.
  - [x] Document exact blockers if validation fails for pre-existing or unrelated reasons.
  - [x] Add completion notes listing docs/spec route, endpoint catalog path, migration baseline path, and future update rule.

### Review Findings

- [x] [Review][Patch] Project context still points agents at legacy API ownership and stale `src/server/app.ts` warnings [`_bmad-output/project-context.md:126`]
- [x] [Review][Patch] Endpoint catalog uses `SYSTEM` in the Roles column, conflicting with the MVP role set [`_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md:38`]
- [x] [Review][Patch] Planned endpoint rows use `TBD` methods instead of known or planned method/path entries required by AC4 [`_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md:33`]
- [x] [Review][Patch] OpenAPI safety test bans valid future contract words such as `password` and `secret` across the whole spec [`src/server/app.test.ts:63`]
- [x] [Review][Patch] OpenAPI response schema test only checks `responses["200"]` exists, not the `{ data, meta }` schema shape [`src/server/app.test.ts:55`]
- [x] [Review][Patch] Legacy removal plan allows deletion when `npm run check` is still blocked if blocker is documented [`_bmad-output/implementation-artifacts/1-3-legacy-api-migration-baseline.md:62`]

## Dev Notes

### Current State

- `src/server/app.ts` is the canonical Elysia composer with `/api` prefix, `CloudflareAdapter`, `aot: false`, `normalize: true`, OpenAPI, CORS, global safe `onError`, Astro bridge decorations, request context plugin, and `serverRoutes`. [Source: `src/server/app.ts`; `_bmad-output/implementation-artifacts/1-2-api-foundation-envelopes-request-context-and-operational-hooks.md#Completion-Notes-List`]
- `src/pages/api/[...slug].ts` is a thin Astro bridge with module-scoped `createApp()`, per-request Astro context binding, `runtimeEnv`, and `finally` cleanup. Preserve this shape. [Source: `src/pages/api/[...slug].ts`; `_bmad-output/implementation-artifacts/1-1-brownfield-server-migration-and-minimal-reformat.md#Completion-Notes-List`]
- `src/server/openapi/documentation.ts` owns OpenAPI `info` and tags for Foundation, Auth, Brands, Products, Checkout, Payments, Orders, Returns/Refunds, Assets, and Audit. [Source: `src/server/openapi/documentation.ts`]
- `src/server/openapi/route-metadata.ts` already provides `routeDetail(...)` with safe `x-auth`, `x-rate-limit-class`, `x-error-codes`, and `deprecated` metadata. Extend it only if needed; do not create another helper. [Source: `src/server/openapi/route-metadata.ts`; `src/server/openapi/route-metadata.test.ts`]
- `src/server/routes/foundation.routes.ts` is the current canonical completed endpoint example. It uses `routeDetail(...)`, `tboxApiSuccess(...)`, `openApiErrorResponses(...)`, and `apiSuccessWithRequestId(...)`. [Source: `src/server/routes/foundation.routes.ts`]
- `src/server/routes/route-groups.ts` lists planned canonical route groups: admin-auth, customer-auth, brands, products, checkout, payments, webhooks, orders, returns-refunds, assets, audit. Use these for endpoint catalog baseline. [Source: `src/server/routes/route-groups.ts`]
- `src/lib/typebox/api.ts` owns reusable TypeBox response schemas: `tboxApiSuccess`, `tboxApiError`, `tboxApiResponse`, `tboxPaginatedResponse`, `openApiErrorResponses`, plus legacy-only helpers. [Source: `src/lib/typebox/api.ts`]
- `src/api/**` still exists as deprecated brownfield scaffolding. It is migration source only, not canonical endpoint completion. [Source: `_bmad-output/implementation-artifacts/1-1-legacy-api-migration-notes.md`]

### Architecture Constraints

- Canonical backend/API work belongs under `src/server/**`; `src/pages/api/[...slug].ts` only bridges Astro to Elysia; current `src/api/**` is deprecated brownfield scaffolding. [Source: `_bmad-output/planning-artifacts/architecture.md#Architectural-Boundaries`]
- Routes declare TypeBox contracts, OpenAPI metadata, auth metadata, rate-limit class, and error codes. Routes do not contain business rules. [Source: `_bmad-output/planning-artifacts/architecture.md#Architectural-Boundaries`]
- Public success envelope is `{ data, meta }`; public error envelope is `{ error: { code, message, details? } }`; include `meta.requestId` on success when available. [Source: `_bmad-output/project-context.md#API-Contracts-And-Responses`]
- Every implemented endpoint needs params/query/body/response schemas, OpenAPI tags, summary, description, auth metadata, rate-limit class, and documented error codes before completion. [Source: `_bmad-output/project-context.md#API-Contracts-And-Responses`; `_bmad-output/planning-artifacts/prd.md#Data-&-Response-Requirements`]
- API route names use plural kebab-case nouns and camelCase route params. Avoid stale restaurant/menu/seating/subscription route names. [Source: `_bmad-output/planning-artifacts/architecture.md#Naming-Patterns`]
- Machine-readable API contract documentation must cover every implemented endpoint before release. [Source: `_bmad-output/planning-artifacts/prd.md#Functional-Requirements`; `_bmad-output/planning-artifacts/prd.md#Data-&-Response-Requirements`]

### File Structure Requirements

- Expected touched or new files:
  - `_bmad-output/implementation-artifacts/1-3-api-contract-documentation-and-legacy-migration-baseline.md`
  - `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`
  - `_bmad-output/implementation-artifacts/1-3-legacy-api-migration-baseline.md` or `_bmad-output/implementation-artifacts/1-1-legacy-api-migration-notes.md`
  - `src/server/app.test.ts`
  - `src/server/openapi/route-metadata.test.ts` if helper behavior changes
  - `src/server/openapi/_readme.md` or `src/server/routes/_readme.md` only if code-level docs need update
  - `src/server/openapi/documentation.ts` only if OpenAPI documentation metadata is incomplete
  - `src/server/openapi/route-metadata.ts` only if current helper cannot represent required safe metadata
  - `src/server/routes/foundation.routes.ts` only if current Foundation route metadata/schema is incomplete
- Avoid:
  - New canonical code under `src/api/**`
  - Replacing `@elysiajs/openapi` or renaming imports to another package
  - Recreating API envelope helpers outside `src/lib/api/response.ts` or `src/lib/typebox/api.ts`
  - Adding auth/session/RBAC, D1 migrations, product/checkout/payment endpoints, rate limiter implementation, UI, or provider integrations
  - Exposing secrets, tokens, raw provider payloads, environment values, stack traces, or unnecessary PII in docs/spec/examples
  - Broad repo formatting or deleting legacy files outside explicit scope

### Implementation Guidance

- Treat Story 1.3 as documentation and contract baseline, not broad feature implementation.
- Keep machine-readable source of truth generated from Elysia route contracts. Do not maintain a separate handwritten OpenAPI JSON file unless explicitly justified.
- Expected runtime docs path is prefixed by app prefix: `/api/openapi` for UI and `/api/openapi/json` for raw spec. Existing tests already use `/api/openapi/json`.
- Endpoint catalog should distinguish statuses such as `complete`, `planned`, `migration-only`, `frozen`, and `remove-later`.
- For planned endpoints, prefer route groups and owning story references over inventing detailed DTOs before those stories exist. Use `TBD in Story X.Y` where exact schema belongs to a later story.
- Legacy migration baseline should summarize the current `src/api/**` inventory and reference Story 1.1 notes rather than copying every line blindly.
- If generated OpenAPI lacks custom metadata for a completed endpoint, fix the route metadata helper or route detail, then test it.
- If Elysia/OpenAPI serializes extension fields differently than expected, document actual safe output and adjust tests to stable public contract metadata.

### Previous Story Intelligence

- Story 1.1 established canonical `src/server/**` ownership, thin Astro bridge, JRW OpenAPI composer, server route container, server folder readmes, and first legacy migration notes. Do not reintroduce `src/api/container/ApiContainer.ts` into canonical app. [Source: `_bmad-output/implementation-artifacts/1-1-brownfield-server-migration-and-minimal-reformat.md`]
- Story 1.1 preserved brownfield route/controller patterns only as migration reference and froze legacy/mock endpoints. [Source: `_bmad-output/implementation-artifacts/1-1-legacy-api-migration-notes.md`]
- Story 1.2 added request-aware success/error envelopes, canonical error mapping, safe operational logging foundation, audit event port, request context plugin, `routeDetail(...)`, and focused tests. Build on those helpers. [Source: `_bmad-output/implementation-artifacts/1-2-api-foundation-envelopes-request-context-and-operational-hooks.md#Completion-Notes-List`]
- Story 1.2 validation passed `npx vitest run`, targeted tests, and `npm run check`; existing legacy hints are in frozen `src/api/**`. [Source: `_bmad-output/implementation-artifacts/1-2-api-foundation-envelopes-request-context-and-operational-hooks.md#Debug-Log-References`]

### Latest Technical Information

- Installed package is `@elysiajs/openapi` `^1.4.15`; use the installed package and current imports. [Source: `package.json`]
- Elysia OpenAPI plugin exposes documentation UI at `/openapi` and raw spec at `/openapi/json` by default; current app prefix makes this `/api/openapi` and `/api/openapi/json`. Source: https://elysiajs.com/plugins/openapi
- Elysia route `detail` extends the OpenAPI Operation Object and supports `summary`, `description`, `tags`, `deprecated`, and related operation metadata. Source: https://elysiajs.com/plugins/openapi
- Elysia relies on runtime schemas such as TypeBox route schemas to generate OpenAPI documentation. Keep route schemas in code rather than static JSON. Source: https://elysiajs.com/patterns/openapi

### Testing Requirements

- Required validation:
  - `npx vitest run src/server/app.test.ts src/server/openapi/route-metadata.test.ts`
  - `npm run check`
- Minimum coverage:
  - `/api/openapi/json` returns 200 and JRW API metadata.
  - Generated spec includes current completed `GET /api/` Foundation endpoint.
  - Foundation operation includes safe summary, description, tags, response schema, `x-auth`, `x-rate-limit-class`, and `x-error-codes`.
  - Spec/docs do not contain legacy QR Resto wording, secrets, tokens, raw provider payload examples, or environment values.
  - Endpoint catalog and legacy migration baseline artifact paths are named in completion notes.

### Project Structure Notes

- This story aligns with the architecture gap: exact endpoint-level catalog is still needed before broad endpoint implementation. [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation-Readiness-Validation`]
- No conflict found with current source tree. Current OpenAPI helper and route metadata helper already exist; this story should harden documentation and cataloging around them.
- Treat `_bmad-output/project-context.md` as active rule source. It requires `src/server/**` canonical API work, standard envelopes, TypeBox/Elysia route contracts, and no new code under deprecated `src/api/**`.

### References

- `_bmad-output/planning-artifacts/epics.md#Story-1.3-API-Contract-Documentation-and-Legacy-Migration-Baseline`
- `_bmad-output/planning-artifacts/prd.md#Data-&-Response-Requirements`
- `_bmad-output/planning-artifacts/prd.md#Functional-Requirements`
- `_bmad-output/planning-artifacts/architecture.md#API-&-Communication-Patterns`
- `_bmad-output/planning-artifacts/architecture.md#Naming-Patterns`
- `_bmad-output/planning-artifacts/architecture.md#Architectural-Boundaries`
- `_bmad-output/project-context.md#API-Contracts-And-Responses`
- `_bmad-output/implementation-artifacts/1-1-brownfield-server-migration-and-minimal-reformat.md`
- `_bmad-output/implementation-artifacts/1-1-legacy-api-migration-notes.md`
- `_bmad-output/implementation-artifacts/1-2-api-foundation-envelopes-request-context-and-operational-hooks.md`
- `src/server/app.ts`
- `src/pages/api/[...slug].ts`
- `src/server/openapi/documentation.ts`
- `src/server/openapi/route-metadata.ts`
- `src/server/routes/foundation.routes.ts`
- `src/server/routes/route-groups.ts`
- `src/lib/typebox/api.ts`
- `src/lib/api/response.ts`
- Elysia OpenAPI plugin docs: https://elysiajs.com/plugins/openapi
- Elysia OpenAPI pattern docs: https://elysiajs.com/patterns/openapi

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-12T13:37:49+08:00 - Red gate: `npx vitest run src/server/app.test.ts src/server/openapi/route-metadata.test.ts` failed after adding focused OpenAPI spec coverage; assertion overmatched public provider label.
- 2026-05-12T13:38:48+08:00 - Green gate: `npx vitest run src/server/app.test.ts src/server/openapi/route-metadata.test.ts` passed, 2 files / 11 tests.
- 2026-05-12T13:39:39+08:00 - Regression: `npx vitest run` passed, 6 files / 18 tests.
- 2026-05-12T13:41:01+08:00 - Check blocker: `npm run check` failed because Wrangler remote proxy requires login: "Failed to fetch auth token: 401 Unauthorized".
- 2026-05-12T13:43:53+08:00 - Catalog validation: required columns and all `src/server/routes/route-groups.ts` MVP groups present in `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`; `npx vitest run` passed, 6 files / 18 tests.
- 2026-05-12T13:46:24+08:00 - Legacy baseline validation: all known `src/api/**` files classified in `_bmad-output/implementation-artifacts/1-3-legacy-api-migration-baseline.md`; freeze rule and drift warnings present; `npx vitest run` passed, 6 files / 18 tests.
- 2026-05-12T13:49:07+08:00 - Route convention validation: `src/server/openapi/_readme.md` names `routeDetail(...)`, TypeBox API helpers, route schema expectations, and camelCase DTO boundary; `npx vitest run` passed, 6 files / 18 tests.
- 2026-05-12T13:49:53+08:00 - Required validation: `npx vitest run src/server/app.test.ts src/server/openapi/route-metadata.test.ts` passed, 2 files / 11 tests.
- 2026-05-12T13:51:05+08:00 - Required check blocker: `npm run check` failed during `astro check` because Cloudflare/Wrangler remote proxy requires login: "Failed to fetch auth token: 400 Bad Request" and "You must be logged in to use wrangler dev in remote mode. Try logging in, or run wrangler dev --local."
- 2026-05-12T13:52:49+08:00 - Final regression: `npx vitest run` passed, 6 files / 18 tests. No unchecked task/subtask checkboxes remain.
- 2026-05-12T14:21:50+08:00 - Review patch validation: `npx vitest run src/server/app.test.ts src/server/openapi/route-metadata.test.ts` passed, 2 files / 11 tests.
- 2026-05-12T14:23:44+08:00 - Required check passed after Wrangler login: `npm run check` passed with 0 errors, 0 warnings, and 22 hints.
- 2026-05-12T14:25:19+08:00 - Final review regression: `npx vitest run` passed, 6 files / 18 tests.

### Completion Notes List

- Runtime OpenAPI exposure confirmed in `src/server/app.ts`; docs UI route is `GET /api/openapi`, JSON spec route is `GET /api/openapi/json`.
- Added focused OpenAPI JSON coverage for completed Foundation endpoint metadata, `{ data, meta }` response schema, error envelope schema, and safe generated spec content.
- Created endpoint catalog baseline at `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md` with `GET /api/` as the only completed canonical endpoint and planned method/path anchors for all MVP route groups.
- Created Story 1.3 legacy migration baseline at `_bmad-output/implementation-artifacts/1-3-legacy-api-migration-baseline.md`; preserved `src/api/**` freeze rule and requires `npm run check` pass before legacy deletion.
- Updated `src/server/openapi/_readme.md` with route contract conventions for `routeDetail(...)`, TypeBox response helpers, schema coverage, and camelCase API DTOs.
- Updated `_bmad-output/project-context.md` so agents treat `src/server/routes/**` and `src/server/app.ts` as canonical while keeping `src/api/**` migration-only.
- Future endpoint stories must update `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md` whenever route method/path, schema, auth, role, rate-limit, or error-code behavior changes.
- `npm run check` passes after Wrangler login; Astro reported 0 errors, 0 warnings, and 22 hints from legacy scaffold files.
- Story status moved to `done`; sprint status updated to `done`.

### File List

- _bmad-output/implementation-artifacts/1-3-api-contract-documentation-and-legacy-migration-baseline.md
- _bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md
- _bmad-output/implementation-artifacts/1-3-legacy-api-migration-baseline.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/project-context.md
- src/server/app.test.ts
- src/server/openapi/_readme.md
- src/server/openapi/route-metadata.ts
