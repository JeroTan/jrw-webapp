# Story 1.2: API Foundation, Envelopes, Request Context, and Operational Hooks

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer/agent and API consumer,
I want consistent API envelopes, stable request context, safe operational logging, and typed audit/event hooks,
so that completed endpoints behave predictably and sensitive future stories do not invent response, logging, or audit shapes.

## Acceptance Criteria

1. Given server routes return successful responses, when a completed endpoint responds, then response shape is `{ data, meta }` and `meta.requestId` is included when request context has one.
2. Given server routes return errors, when validation, auth, conflict, provider, or internal failures occur, then response shape is `{ error: { code, message, details? } }` and public messages do not expose DB errors, provider payloads, stacks, secrets, or tokens.
3. Given request enters API through Astro bridge, when Elysia handles request, then request context reads `x-request-id` or generates request ID and typed context exposes request ID to controllers/services without global mutable state.
4. Given successful or failed API actions need operational visibility, when safe logging hooks are added, then log context supports request ID, actor role, safe actor identifier, target resource identifier, error code where applicable, and timestamp, and logs reject or scrub secrets, tokens, raw provider payloads, cookies, passwords, and unnecessary PII.
5. Given sensitive future stories need audit behavior before Epic 7 viewing exists, when audit/event foundation is added, then a typed audit event interface or port exists for account, brand, catalog, inventory, payment, refund/return, and order actions, and future sensitive stories must record or enqueue audit events through this interface instead of deferring audit semantics to Epic 7.
6. Given TypeBox/Elysia contracts are required, when API response helpers are added or reconciled, then `src/lib/api/response.ts` and `src/lib/typebox/api.ts` support standard success/error schema reuse and route contracts can describe params, query, body, responses, tags, auth metadata, rate-limit class, and error codes.
7. Given legacy/mock handlers may still exist, when completed endpoints are reviewed, then they do not return legacy `{ data, message, code }` shape and any remaining legacy/mock endpoint is marked migration-only, not accepted completion.
8. Given architecture requires Route -> Controller -> Service -> Domain/Repository, when envelope helpers are used, then controllers adapt service/domain results into public envelopes and response helpers contain no business rules.
9. Given validation exists, when story implementation finishes, then response envelope, request ID, safe log context, and audit interface examples or tests cover success and error paths and `npm run check` passes or blocker is documented.
10. Given story outputs are reviewed, when implementation is accepted, then response helper example/test, request ID propagation example/test, safe log context example/test, and audit event interface example/test are present and the output summary identifies where future stories must import or call those helpers.

## Tasks / Subtasks

- [x] Reconcile current API foundation before adding new patterns. (AC: 1, 2, 6, 7, 8)
  - [x] Read `src/lib/api/response.ts`, `src/lib/api/errors.ts`, `src/lib/typebox/api.ts`, `src/utils/general/error.ts`, `src/utils/general/result.ts`, `src/utils/request-id.ts`, `src/server/app.ts`, `src/server/routes/foundation.routes.ts`, and `src/lib/elysia/astroBridgeContext.ts`.
  - [x] Reuse existing `apiSuccess`, `apiError`, `resultToApiResponse`, `tboxApiSuccess`, `tboxApiError`, `openApiErrorResponses`, and `REQUEST_ID_HEADER`; extend them only where required.
  - [x] Do not add new API code under `src/api/**`; leave legacy/mock modules frozen and migration-only.

- [x] Establish request context middleware/plugin under canonical server ownership. (AC: 1, 3, 9, 10)
  - [x] Add request-scoped context in `src/server/context/**` or `src/server/middleware/**` that derives `requestId` from `x-request-id` using `src/utils/request-id.ts`.
  - [x] Generate a request ID when header is missing or blank; avoid global mutable request state.
  - [x] Expose typed context fields to routes/controllers/services, with room for later `actor` data from Story 1.7/1.12.
  - [x] Set `X-Request-Id` response header where safe so operational support can correlate API responses and logs.
  - [x] Keep `src/pages/api/[...slug].ts` thin; request ID logic belongs in Elysia server context, not Astro bridge.

- [x] Make standard envelopes request-context aware. (AC: 1, 2, 6, 8, 9)
  - [x] Update success helper usage so completed endpoints can include `{ meta: { requestId } }`.
  - [x] Update error helper flow so safe public errors can include request ID in `details` or response headers without changing the required error envelope shape.
  - [x] Preserve `resultToApiResponse` as controller adapter from `AppResult`/`GeneralError` to public envelopes.
  - [x] Do not put JRW business rules inside response helpers.

- [x] Align canonical error codes and safe messages. (AC: 2, 6, 9)
  - [x] Add or reconcile PRD canonical codes needed by completed endpoints: `AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `EMAIL_NOT_VERIFIED`, `ADMIN_APPROVAL_REQUIRED`, `ACCOUNT_SUSPENDED`, `BRAND_MEMBERSHIP_REQUIRED`, `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `CONFLICT_STATE`, `INVENTORY_UNAVAILABLE`, `PAYMENT_REQUIRED`, `PAYMENT_FAILED`, `WEBHOOK_INVALID_SIGNATURE`, `IDEMPOTENCY_CONFLICT`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, and `INTERNAL_ERROR`.
  - [x] Keep existing codes only as compatibility aliases if needed by brownfield code/tests; completed `src/server/**` endpoints should prefer PRD canonical codes.
  - [x] Map Elysia validation/parse/not-found/internal errors to stable safe public messages.
  - [x] Ensure provider/DB/stack details are never exposed unless explicitly safe and structured.

- [x] Add reusable OpenAPI route metadata helper. (AC: 6, 10)
  - [x] Add helper/types under `src/server/openapi/**` or `src/lib/typebox/api.ts` so route contracts can consistently declare tags, summary, description, auth metadata, rate-limit class, and error codes.
  - [x] Use OpenAPI `detail` plus safe `x-*` extension metadata for auth/rate-limit/error-code data if needed.
  - [x] Update `src/server/routes/foundation.routes.ts` as the example completed endpoint using standard response schemas and metadata.
  - [x] Do not expose secrets, tokens, environment values, or provider payloads in generated OpenAPI metadata.

- [x] Add safe operational logging foundation. (AC: 4, 9, 10)
  - [x] Define `OperationalLogContext`/event type with request ID, actor role, safe actor identifier, target resource identifier, error code, timestamp, and optional safe details.
  - [x] Add a scrubber/redactor for common sensitive keys and values: password, password hash, JWT, OAuth token, session cookie, PayMongo secret, raw payment payload, pepper, phone/address where unnecessary, and stack traces.
  - [x] Place output adapter under `src/adapter/infrastructure/logging/**` if it writes to console/platform logs; keep provider-specific tracking out of scope until Story 7.4.
  - [x] Wire global error path in `src/server/app.ts` only enough to prove request ID and safe error context are available; do not add noisy success logging for every request unless justified.

- [x] Add typed audit/event foundation. (AC: 5, 9, 10)
  - [x] Add domain-facing audit/event types or port under `src/domain/audit/**` or another architecture-aligned location.
  - [x] Event payload base must include `eventId`, `requestId`, `actor`, `target`, `occurredAt`, and `version`.
  - [x] Audit events must support actor, action, entity, entityId, safe details, timestamp, and request ID.
  - [x] Cover future action/entity groups: account, brand, catalog, inventory, payment, refund/return, and order.
  - [x] Provide a no-op or in-memory example publisher only if tests need it; do not implement full audit persistence or Epic 7 query UI.

- [x] Add focused tests/examples for new foundation behavior. (AC: 1, 2, 3, 4, 5, 6, 9, 10)
  - [x] Add/extend Vitest tests for success envelope with request ID.
  - [x] Add/extend Vitest tests for error envelope with safe message and no leaked stack/provider payload.
  - [x] Add/extend Vitest tests for incoming `x-request-id`, generated request ID, response header, and per-request isolation.
  - [x] Add tests for logging scrubber rejecting/redacting sensitive values.
  - [x] Add tests for audit/event type helper or example publisher shape.
  - [x] Run `npx vitest run` for touched tests and `npm run check`; document exact blocker if either fails.

### Review Findings

- [x] [Review][Patch] Error handler regenerates request ID on missing-header failures [src/server/app.ts:57]
- [x] [Review][Patch] Operational logger failure can replace safe error response [src/server/app.ts:64]
- [x] [Review][Patch] Response validation failures are returned as client validation errors [src/server/app.ts:26]
- [x] [Review][Patch] Log redactor misses generic provider payload, signature, token, and PII fields [src/adapter/infrastructure/logging/operational-log.ts:34]
- [x] [Review][Patch] Public error detail helpers still allow raw unsafe details [src/lib/api/response.ts:57]
- [x] [Review][Patch] Result adapter cannot propagate request ID into success or error envelopes [src/lib/api/response.ts:29]
- [x] [Review][Patch] Webhook invalid signature errors fall through to HTTP 500 [src/lib/api/errors.ts:39]
- [x] [Review][Patch] Audit safeDetails are copied without scrubbing or guardrails [src/domain/audit/events.ts:75]
- [x] [Review][Patch] Audit action accepts any string instead of typed lower-dot actions [src/domain/audit/events.ts:38]
- [x] [Review][Patch] Audit target entityId is optional despite required traceability [src/domain/audit/events.ts:32]

## Dev Notes

### Current State

- `src/server/app.ts` is canonical Elysia composer with `/api` prefix, `CloudflareAdapter`, `aot: false`, OpenAPI, CORS, global `onError`, `astroBridgeDecorations`, and `serverRoutes`. Request context middleware does not exist yet. [Source: `src/server/app.ts`]
- `src/pages/api/[...slug].ts` was reduced in Story 1.1 to a thin Astro bridge with module-scoped `createApp()`, per-request Astro context binding, `runtimeEnv`, and `finally` cleanup. Keep that shape. [Source: `_bmad-output/implementation-artifacts/1-1-brownfield-server-migration-and-minimal-reformat.md#Dev-Notes`]
- `src/server/routes/foundation.routes.ts` is the only canonical example route. It returns `apiSuccess(..., { code: "SUCCESS" })` and does not yet include `meta.requestId`. Use it as first completed endpoint example for this story. [Source: `src/server/routes/foundation.routes.ts`]
- `src/lib/api/response.ts` already defines standard `ApiMeta`, `ApiSuccess`, `ApiError`, `apiSuccess`, `apiError`, and `resultToApiResponse`. Extend this file instead of creating a duplicate response wrapper. [Source: `src/lib/api/response.ts`]
- `src/lib/typebox/api.ts` already defines `tboxApiMeta` with optional `requestId`, `tboxApiSuccess`, `tboxApiError`, `tboxApiResponse`, `tboxPaginatedResponse`, legacy-only helpers, and `openApiErrorResponses`. Extend existing helpers for route metadata/schema reuse. [Source: `src/lib/typebox/api.ts`]
- `src/utils/request-id.ts` already provides `REQUEST_ID_HEADER = "x-request-id"`, `createRequestId()`, and `getOrCreateRequestId(headers)`. Reuse it; do not invent a second request ID helper. [Source: `src/utils/request-id.ts`]
- `src/lib/api/errors.ts` maps some existing internal code names to HTTP status and safe messages. It currently does not fully match the PRD canonical error code catalog. Reconcile additively so brownfield code is not broken without reason. [Source: `src/lib/api/errors.ts`; `_bmad-output/planning-artifacts/prd.md#Error-Code-Catalog`]
- `src/utils/general/error.ts` currently has legacy/generic codes such as `VALIDATION`, `NOT_FOUND`, `CONFLICT`, and `TOO_MANY_REQUESTS`, plus Story 1.1 `LogicError`. PRD wants canonical completed-endpoint codes such as `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `CONFLICT_STATE`, `RATE_LIMITED`, and provider/payment/auth-specific codes. [Source: `src/utils/general/error.ts`; `_bmad-output/planning-artifacts/prd.md#Error-Code-Catalog`]
- `src/lib/elysia/astroBridgeContext.ts` uses a `WeakMap<Request, AstroBridgeDecorations>` for Astro-only data. Do not use this as general request context storage for request IDs; request ID can be derived directly from headers inside Elysia context. [Source: `src/lib/elysia/astroBridgeContext.ts`]
- `src/domain/schema/audit.ts` is legacy schema with `admin_id`, `action`, `entity`, `entity_id`, `details`, and `created_at`; it lacks request ID and current actor model. Do not force DB persistence in this story unless necessary. The acceptance target is a typed interface/port for future sensitive stories. [Source: `src/domain/schema/audit.ts`; `_bmad-output/planning-artifacts/architecture.md#Communication-Patterns`]
- `src/api/**` remains deprecated brownfield scaffolding. Legacy controllers still return `{ data, message, code }`; do not treat those as completed endpoints. [Source: `_bmad-output/implementation-artifacts/1-1-legacy-api-migration-notes.md`]

### Architecture Constraints

- Canonical backend/API home is `src/server/**`; `src/pages/api/[...slug].ts` only bridges Astro into Elysia; current `src/api/**` is frozen migration source. [Source: `_bmad-output/planning-artifacts/architecture.md#Architectural-Boundaries`]
- API flow is Route -> Controller -> Service -> Domain/Repository. Routes declare TypeBox contracts, OpenAPI metadata, auth metadata, rate-limit class, and error codes. Routes must not contain business rules. [Source: `_bmad-output/planning-artifacts/architecture.md#Architectural-Boundaries`]
- Public API JSON uses camelCase. DB rows may be snake_case; map rows to camelCase DTOs at controller/service boundary. [Source: `_bmad-output/planning-artifacts/architecture.md#Naming-Patterns`]
- Success response is `{ data, meta }`; error response is `{ error: { code, message, details? } }`; include `meta.requestId` when available. [Source: `_bmad-output/planning-artifacts/architecture.md#Format-Patterns`]
- Domain/services return `AppResult`/`GeneralError`; controllers adapt results to public API envelopes; provider adapters normalize provider failures before services consume them. [Source: `_bmad-output/planning-artifacts/architecture.md#Process-Patterns`]
- Event names use lower dot form. Event payload base is `eventId`, `requestId`, `actor`, `target`, `occurredAt`, and `version`. Audit events include actor, action, entity, entityId, safe details, timestamp, and requestId. [Source: `_bmad-output/planning-artifacts/architecture.md#Communication-Patterns`]
- Operational logs must avoid secrets, tokens, raw payment payloads, and unnecessary PII. Every API request must have a request ID visible in logs and error responses where safe. [Source: `_bmad-output/planning-artifacts/prd.md#Observability`]

### File Structure Requirements

- Expected touched or new files:
  - `src/server/app.ts`
  - `src/server/routes/foundation.routes.ts`
  - `src/server/context/**`
  - `src/server/middleware/**` if request context/logging is implemented as middleware
  - `src/server/openapi/**`
  - `src/lib/api/response.ts`
  - `src/lib/api/errors.ts`
  - `src/lib/typebox/api.ts`
  - `src/utils/general/error.ts`
  - `src/utils/request-id.ts` only if existing behavior is insufficient
  - `src/adapter/infrastructure/logging/**`
  - `src/domain/audit/**`
  - focused `*.test.ts` files beside changed helpers
- Avoid:
  - New code under `src/api/**`
  - Business rules in `src/lib/api/**`, `src/server/routes/**`, or logging helpers
  - D1 migrations or audit persistence unless a narrow compile blocker appears
  - Full auth/session/RBAC, PayMongo, error-tracking provider, audit viewing UI, or rate limiter implementation
  - Broad repo formatting

### Implementation Guidance

- Register request-context plugin before routes that need `requestId`. Ensure global error handling can derive or reuse the same request ID for errors. If plugin ordering makes derived fields unavailable in `onError`, call `getOrCreateRequestId(request.headers)` there and set the response header consistently.
- For success responses, prefer an explicit helper pattern such as `apiSuccess(data, { requestId, code })` or a small context adapter. Keep helper names consistent with existing `apiSuccess`/`apiError`.
- For error responses, keep envelope shape strict. Request ID can appear in `error.details.requestId` and/or `X-Request-Id` header where safe. Do not add top-level `meta` to error responses unless architecture is updated.
- For logging, prefer allowlisted structured event builders and redaction over raw `console.log(error)`. Stack traces may be logged only if scrubbed and environment policy allows; public responses never include stack traces.
- For audit foundation, define types and a port so future services can depend on an interface, not a storage implementation. Example direction: `AuditEvent`, `AuditActor`, `AuditTarget`, `AuditEventPublisher`, `NoopAuditEventPublisher`.
- For OpenAPI metadata, use route `detail` because Elysia OpenAPI supports operation metadata. Put auth/rate-limit/error-code metadata into safe extension fields such as `x-auth`, `x-rate-limit-class`, and `x-error-codes` if local helper chooses that route.

### Previous Story Intelligence

- Story 1.1 established canonical `src/server/**` ownership, thin Astro bridge, JRW route groups, and migration notes. Build from those files; do not reintroduce `src/api/container/ApiContainer.ts` into canonical app.
- Story 1.1 added focused Vitest tests and `vitest.config.ts`; tests now run with `npx vitest run`.
- Story 1.1 review patched `src/server/routes/index.ts` so the canonical route container registers `foundationRoutes`. Keep route composition through `serverRoutes(app)` and domain route modules, not one large app file.
- Story 1.1 global `onError` currently maps Elysia codes to generic existing codes. Story 1.2 should refine this to canonical safe codes and request-aware error responses.
- Story 1.1 migration notes explicitly say request ID, safe logging, audit event ports, and final API envelope enforcement belong to Story 1.2. This is the intended next cross-cutting foundation.

### Latest Technical Information

- Elysia context should be extended with `state`, `decorate`, `derive`, or `resolve` only when the property is global state, request/response-associated, or derived from existing context. Request ID fits derived request context, not global mutable state. Source: https://elysiajs.com/patterns/extends-context
- Elysia `onError` is intended for custom error messages, fail-safe handling, and logging/analytics; it must be registered before handlers it should apply to. Source: https://elysiajs.com/essential/life-cycle
- Elysia OpenAPI route `detail` extends the OpenAPI Operation Object and supports summary, description, tags, and safe operation metadata. Source: https://elysiajs.com/plugins/openapi

### Testing Requirements

- Required validation:
  - `npx vitest run` for touched tests.
  - `npm run check`.
- Minimum tests:
  - Success response includes `{ data, meta: { requestId } }` for foundation route or equivalent completed example.
  - Missing `x-request-id` generates request ID; provided `x-request-id` is preserved; response exposes `X-Request-Id`.
  - Error response uses `{ error: { code, message, details? } }`, maps validation/not-found/internal cases to safe canonical codes, and includes request ID where policy says safe.
  - Scrubber redacts password, cookie/session token, JWT/OAuth token, PayMongo secret/raw payment payload, and stack/provider detail samples.
  - Audit/event type helper or publisher example accepts account/brand/catalog/inventory/payment/refund-return/order event shapes with request ID and safe details.
- If full `npx vitest run` or `npm run check` fails for pre-existing unrelated reasons, document exact command and blocker in Dev Agent Record and final summary.

### References

- `_bmad-output/planning-artifacts/epics.md#Story-1.2-API-Foundation-Envelopes-Request-Context-and-Operational-Hooks`
- `_bmad-output/planning-artifacts/architecture.md#Format-Patterns`
- `_bmad-output/planning-artifacts/architecture.md#Communication-Patterns`
- `_bmad-output/planning-artifacts/architecture.md#Architectural-Boundaries`
- `_bmad-output/planning-artifacts/prd.md#Error-Code-Catalog`
- `_bmad-output/planning-artifacts/prd.md#Observability`
- `_bmad-output/project-context.md#API-Contracts-And-Responses`
- `_bmad-output/implementation-artifacts/1-1-brownfield-server-migration-and-minimal-reformat.md`
- `_bmad-output/implementation-artifacts/1-1-legacy-api-migration-notes.md`
- `src/server/app.ts`
- `src/server/routes/foundation.routes.ts`
- `src/lib/api/response.ts`
- `src/lib/api/errors.ts`
- `src/lib/typebox/api.ts`
- `src/utils/request-id.ts`
- `src/lib/elysia/astroBridgeContext.ts`
- `src/domain/schema/audit.ts`

## Change Log

- 2026-05-12: Created ready-for-dev story context for API foundation, request context, safe logging, and audit/event hooks.
- 2026-05-12: Implemented request-aware API foundation, canonical error codes, OpenAPI metadata helper, safe operational logging foundation, audit event port, and focused tests.

## Dev Agent Record

### Agent Model Used

GPT-5

### Implementation Plan

- Add tests first around request ID propagation, envelopes, safe errors, logging redaction, audit event shape, and OpenAPI metadata.
- Extend existing helpers instead of replacing them: `src/lib/api/response.ts`, `src/lib/typebox/api.ts`, `src/utils/request-id.ts`.
- Keep request context in canonical Elysia server context, logging in infrastructure adapter, and audit/event contracts in domain.
- Use foundation route as completed endpoint example for request-aware success envelopes and route metadata.

### Debug Log References

- Red phase: `npx vitest run src/server/app.test.ts src/adapter/infrastructure/logging/operational-log.test.ts src/domain/audit/events.test.ts src/server/openapi/route-metadata.test.ts` failed on missing implementation modules.
- Green phase targeted validation: `npx vitest run src/server/app.test.ts src/adapter/infrastructure/logging/operational-log.test.ts src/domain/audit/events.test.ts src/server/openapi/route-metadata.test.ts` passed.
- Type/Astro validation: `npm run check` passed. Existing legacy unused-parameter hints remain in frozen `src/api/**`.
- Full regression: `npx vitest run` passed.
- Review patch validation: `npx vitest run` passed 6 test files / 17 tests.
- Review patch Type/Astro validation: `npm run check` passed with 0 errors and existing legacy hints only.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added `requestContextPlugin` with request ID derivation from `x-request-id`, generated fallback IDs, typed context decorations, and `X-Request-Id` response header.
- Updated foundation route to include `meta.requestId` and safe OpenAPI metadata for auth, rate-limit class, and documented error codes.
- Added canonical PRD error codes while keeping legacy compatibility codes for brownfield modules.
- Updated global Elysia error mapping to safe request-aware envelopes with canonical completed-endpoint codes and scrubbed operational logging for internal/provider failures.
- Added safe operational logging event builder, redactor, noop logger, and console logger adapter under infrastructure logging.
- Added typed audit event foundation and no-op publisher under `src/domain/audit/**` for future sensitive stories.
- Added focused Vitest coverage for success envelopes, generated/provided request IDs, safe error envelopes, logging scrubber, audit event port, and OpenAPI metadata helper.
- Resolved review findings by preserving generated request IDs on error paths, guarding logger failures, mapping response contract validation to safe internal errors, strengthening public/log/audit redaction, typing audit actions, and requiring audit target IDs.

### File List

- `_bmad-output/implementation-artifacts/1-2-api-foundation-envelopes-request-context-and-operational-hooks.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/adapter/infrastructure/logging/operational-log.test.ts`
- `src/adapter/infrastructure/logging/operational-log.ts`
- `src/domain/audit/events.test.ts`
- `src/domain/audit/events.ts`
- `src/lib/api/errors.ts`
- `src/lib/api/response.test.ts`
- `src/lib/api/response.ts`
- `src/lib/typebox/api.ts`
- `src/server/app.test.ts`
- `src/server/app.ts`
- `src/server/context/request-context.ts`
- `src/server/openapi/route-metadata.test.ts`
- `src/server/openapi/route-metadata.ts`
- `src/server/routes/foundation.routes.ts`
- `src/utils/general/error.ts`
