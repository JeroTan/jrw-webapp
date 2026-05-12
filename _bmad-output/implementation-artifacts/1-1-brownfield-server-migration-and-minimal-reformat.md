# Story 1.1: Brownfield Server Migration and Minimal Reformat

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer/agent,
I want canonical API code under `src/server/**` with thin Astro bridging and migrated useful brownfield patterns,
so that future auth, catalog, checkout, and admin stories build on stable architecture without route drift.

## Acceptance Criteria

1. Given current brownfield API code exists in `src/api/**`, `src/server/app.ts`, and `src/pages/api/[...slug].ts`, when server migration is completed, then `src/server/app.ts` is canonical Elysia app composer and `src/pages/api/[...slug].ts` only injects Astro request context and delegates to a module-scoped `createApp()` instance with `app.handle(request)`.
2. Given architecture requires `src/server/**` ownership, when folders are reconciled, then target server folders exist: `context`, `routes`, `controllers`, `services`, `repositories`, `middleware`, `dto`, `openapi`, and new backend work has documented home under those folders.
3. Given current `src/api/**` contains usable route/controller/container patterns, when migration is done, then useful patterns are moved or wrapped into `src/server/**` and stale/mock/outdated route names are not treated as current JRW behavior.
4. Given `src/api/**` is deprecated brownfield scaffolding, when migration notes are written, then document states which pieces moved, which remain frozen, and which should be removed later, and no future story depends on adding new code under `src/api/**`.
5. Given architecture requires Route -> Controller -> Service -> Domain/Repository, when migrated server code is reviewed, then route modules contain transport contracts/composition only and business rules are not placed in route handlers.
6. Given architecture requires minimal formatting churn, when files are changed, then only touched files are reformatted and no broad repo-wide prettier/reformat pass occurs.
7. Given TypeScript/Astro validation exists, when story implementation finishes, then `npm run check` passes or failures are documented with exact blocker, and no unrelated user changes are reverted.
8. Given story outputs are reviewed, when implementation is accepted, then `src/server/app.ts`, `src/pages/api/[...slug].ts`, target `src/server/**` folders, and migration notes are present, and output summary lists changed files and remaining `src/api/**` freeze/removal candidates.

## Tasks / Subtasks

- [x] Inventory current API foundation and classify migration candidates. (AC: 1, 3, 4)
  - [x] Read `src/server/app.ts`, `src/pages/api/[...slug].ts`, `src/api/container/**`, `src/api/routes/**`, `src/api/controller/**`, `src/domain/services/**`, `src/domain/validation/**`, `src/lib/api/response.ts`, `src/lib/typebox/api.ts`, `src/lib/elysia/**`.
  - [x] Capture current broken/drifted items in migration notes before changing behavior.
  - [x] Identify useful patterns to preserve: Elysia container composition, controller injection, TypeBox route schemas, OpenAPI `detail`, Astro scoped context, CORS plugin shape.

- [x] Rebuild canonical server ownership under `src/server/**`. (AC: 1, 2, 5)
  - [x] Keep `src/server/app.ts` as sole Elysia app composer.
  - [x] Create/keep these tracked folders with real files or `_readme.md`: `src/server/context`, `src/server/routes`, `src/server/controllers`, `src/server/services`, `src/server/repositories`, `src/server/middleware`, `src/server/dto`, `src/server/openapi`.
  - [x] Document each folder responsibility in `src/server/**` readmes or barrel files so later stories know where backend work belongs.
  - [x] Ensure `src/server/app.ts` uses JRW names only. Remove QR Resto Hub title, restaurant/menu/seating/subscriptions route imports, and any other unrelated scaffold drift.

- [x] Make Astro API catch-all a thin bridge. (AC: 1, 7)
  - [x] Update `src/pages/api/[...slug].ts` so it imports `createApp()` from `@/server/app`.
  - [x] Import `env` from `cloudflare:workers` in the bridge only, then pass it as `runtimeEnv` through the existing Astro bridge context.
  - [x] Create one module-scoped app instance with `const app = createApp();` for reuse across requests.
  - [x] Bind per-request Astro data using existing `bindAstroBridgeDecorations(ctx.request, { urlData: ctx.url, astroCookies: ctx.cookies, runtimeEnv: env as Partial<Env> & Record<string, unknown> })`.
  - [x] Delegate to `app.handle(ctx.request)`.
  - [x] Clear request binding in `finally` with `clearAstroBridgeDecorations(ctx.request)`.
  - [x] Keep method exports only. Do not compose OpenAPI, CORS, or domain containers in this bridge.

- [x] Move or wrap brownfield route/container patterns into `src/server/**` without claiming completed endpoint behavior. (AC: 3, 4, 5)
  - [x] Migrate useful container pattern from `src/api/container/ApiContainer.ts` to `src/server/routes` or `src/server/openapi` as appropriate.
  - [x] Prefer JRW route groups named from current PRD/architecture: auth, brands, products, checkout, payments/webhooks, orders, returns-refunds, assets, audit.
  - [x] Mark moved legacy/mock endpoints as migration-only or remove them from canonical app until they satisfy current contracts.
  - [x] Do not add new backend code under `src/api/**`.

- [x] Preserve and reuse existing helpers; fix wrong imports during migration. (AC: 3, 5, 7)
  - [x] Use `src/lib/api/response.ts` for `apiSuccess`, `apiError`, and `resultToApiResponse`.
  - [x] Use `src/lib/typebox/api.ts` for `tboxApiResponse`, `tboxApiSuccess`, `tboxApiError`, and `openApiErrorResponses`.
  - [x] Do not import `@/lib/typebox/wrappers`; that file does not exist.
  - [x] Treat current controllers returning `Response.json({ data, message, code })` as legacy/mock behavior, not accepted completed endpoint shape.

- [x] Write migration notes. (AC: 4, 8)
  - [x] Create `_bmad-output/implementation-artifacts/1-1-legacy-api-migration-notes.md`.
  - [x] Include table: source file, action taken, canonical destination, status (`moved`, `wrapped`, `frozen`, `remove-later`), reason.
  - [x] Include freeze rule: future stories must not add new code under `src/api/**`.
  - [x] List remaining `src/api/**` removal candidates and blockers.

- [x] Validate with minimal churn. (AC: 6, 7, 8)
  - [x] Reformat only touched files.
  - [x] Run `npm run check`.
  - [x] If `npm run check` fails, document exact command output blocker in dev notes and final summary.
  - [x] Output changed file list and `src/api/**` freeze/removal candidates.

### Review Findings

- [x] [Review][Patch] Canonical route container is a no-op, so useful route composition pattern was not migrated [src/server/routes/index.ts:16]
- [x] [Review][Patch] Global error handler maps `NOT_FOUND` and other request/client errors to `INTERNAL_SERVER_ERROR` [src/server/app.ts:23]
- [x] [Review][Defer] Production CORS origin policy remains localhost-only [src/server/middleware/cors.ts:3] — deferred, pre-existing

## Dev Notes

### Current State

- `src/server/app.ts` is not authoritative JRW code yet. It imports `@/server/routes`, which does not exist, and references QR Resto Hub route groups such as `restaurantAdminRoutes`, `menuRoutes`, `seatingQrRoutes`, and `subscriptionsAdsRoutes`. Remove or replace this drift during implementation. [Source: `src/server/app.ts`; `_bmad-output/project-context.md#API-Layering`]
- `src/pages/api/[...slug].ts` currently creates a global Elysia app, registers OpenAPI and CORS, injects Astro context with `.derive`, uses `ApiContainer` from `src/api/**`, then handles requests. AC1 requires this file to become a thin bridge only. [Source: `src/pages/api/[...slug].ts`; `_bmad-output/planning-artifacts/architecture.md#API-&-Communication-Patterns`]
- `src/lib/elysia/astroBridgeContext.ts` already provides `bindAstroBridgeDecorations`, `clearAstroBridgeDecorations`, and `astroBridgeDecorations` backed by a `WeakMap<Request, AstroBridgeDecorations>`. Reuse this instead of inventing new global request state. [Source: `src/lib/elysia/astroBridgeContext.ts`]
- `src/lib/elysia/decorationTypes.ts` already allows `runtimeEnv?: Partial<Env> & Record<string, unknown>` on `AstroBridgeDecorations`; bridge can pass Cloudflare `env` without new global mutable state. Add a typed decoration helper only if downstream server modules need compile-time access to `runtimeEnv` from Elysia context. [Source: `src/lib/elysia/decorationTypes.ts`]
- `src/api/container/ApiContainer.ts` has useful composition shape: a root container registers domain containers and avoids a single "God file". Preserve that pattern under `src/server/**`. [Source: `src/api/container/ApiContainer.ts`]
- `src/api/routes/**` has useful Elysia route patterns: `.group`, TypeBox schemas, route `detail.summary`, `detail.description`, and `detail.tags`. Preserve the pattern, not stale endpoint truth. [Source: `src/api/routes/IdentityRoutes.ts`; `src/api/routes/CatalogRoutes.ts`]
- Several legacy files import `@/lib/typebox/wrappers`, but only `src/lib/typebox/api.ts` and `src/lib/typebox/wrapper.ts` exist. Use `src/lib/typebox/api.ts` for response schema helpers. [Source: `src/lib/typebox/api.ts`; `rg '@/lib/typebox/wrappers' src`]
- `src/api/controller/SampleController.ts` and sample route code return legacy `{ data, message, code }` shapes. Completed endpoints must use `{ data, meta }` or `{ error: { code, message, details? } }`. [Source: `src/lib/api/response.ts`; `_bmad-output/project-context.md#API-Contracts-And-Responses`]
- `src/domain/services/IdentityService.ts` imports `cloudflare:workers`. Project rules say platform access belongs in adapters/infrastructure/app bridge/integration wrappers, not pure domain. Do not replicate that pattern in new `src/server/services`. This story may document it as migration debt if fixing it would exceed AC scope. [Source: `src/domain/services/IdentityService.ts`; `_bmad-output/project-context.md#Cloudflare-Runtime-Rules`]
- `src/adapter/infrastructure/db/client.ts` is an allowed platform adapter and can keep `cloudflare:workers` access. [Source: `src/adapter/infrastructure/db/client.ts`; `_bmad-output/project-context.md#Data-D1-And-Migrations`]
- `vitest` is installed in `package.json`, but no `vitest.config.*` or real test files currently exist. Story AC only requires `npm run check`; add tests only if implementation creates testable nontrivial logic and setup remains small. [Source: `package.json`; `rg --files -g 'vitest.config.*'`]

### Target Architecture

- `src/server/app.ts` composes Elysia with:
  - `prefix: "/api"`
  - `adapter: CloudflareAdapter`
  - `aot: false`
  - `normalize: true`
  - `openapi(...)` configured with JRW title/description
  - `astroBridgeDecorations`
  - canonical server route container(s)
  - safe global error mapping using `apiError`
- Keep `aot: false` because project context explicitly requires it for now. Latest Elysia docs say Cloudflare Workers can use AOT after Elysia 1.4.7, but project architecture has not approved changing this setting. [Source: `_bmad-output/project-context.md#API-Layering`; Elysia Cloudflare Worker docs, 2026-05-12]
- `src/pages/api/[...slug].ts` owns only Astro `APIRoute` method exports, `prerender = false`, module-scoped `const app = createApp()`, and per-request context injection. No OpenAPI config, no CORS config, no domain container registration.
- Preferred bridge shape:

```ts
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  bindAstroBridgeDecorations,
  clearAstroBridgeDecorations,
} from "@/lib/elysia/astroBridgeContext";
import { createApp } from "@/server/app";

export const prerender = false;

const app = createApp();

const handle: APIRoute = async (ctx) => {
  bindAstroBridgeDecorations(ctx.request, {
    urlData: ctx.url,
    astroCookies: ctx.cookies,
    runtimeEnv: env as Partial<Env> & Record<string, unknown>,
  });

  try {
    return await app.handle(ctx.request);
  } finally {
    clearAstroBridgeDecorations(ctx.request);
  }
};
```
- `src/server/routes/index.ts` or equivalent root container owns route registration. Domain-specific routes should be separate modules, not one large file.
- Route files own HTTP method/path, TypeBox params/query/body/response contracts, OpenAPI `detail`, auth metadata, rate-limit class, and error codes. Controllers adapt transport to services. Services orchestrate use cases. Domain/repositories own business rules/data access.
- Current `src/api/**` remains migration source only after this story. Future stories must add code under `src/server/**`, `src/domain/**`, `src/adapter/**`, `src/lib/**`, or feature UI folders as appropriate.

### File Structure Requirements

- Expected touched or new files:
  - `src/server/app.ts`
  - `src/pages/api/[...slug].ts`
  - `src/server/context/**`
  - `src/server/routes/**`
  - `src/server/controllers/**`
  - `src/server/services/**`
  - `src/server/repositories/**`
  - `src/server/middleware/**`
  - `src/server/dto/**`
  - `src/server/openapi/**`
  - `_bmad-output/implementation-artifacts/1-1-legacy-api-migration-notes.md`
- Possible touched helper imports:
  - `src/lib/typebox/api.ts`
  - `src/lib/api/response.ts`
  - `src/lib/elysia/astroBridgeContext.ts`
- Avoid broad moves that rewrite entire `src/api/**` unless necessary. If migration is wrapped instead of moved, document exactly why and where future removal happens.

### Technical Requirements

- Runtime path must remain Cloudflare Workers compatible. Do not add Node-only APIs to request path.
- Do not scaffold a new Astro/Cloudflare project. Existing `astro.config.mjs`, `wrangler.jsonc`, D1/R2/Durable Object bindings, and `src/cloudflare/worker.ts` stay foundational.
- Keep `@/` imports for `src/*`.
- Use installed packages and names from `package.json`: `@elysiajs/openapi`, `@elysiajs/cors`, `elysia`, `@astrojs/cloudflare`, `astro`.
- OpenAPI plugin stays in server composer. Elysia docs support route `detail` for OpenAPI metadata and `/openapi` plus `/openapi/json` output; keep docs generated from route contracts. [Source: Elysia OpenAPI docs, 2026-05-12]
- Cloudflare Astro docs confirm the Cloudflare adapter uses server output for SSR/on-demand rendering; this repo already has `output: "server"` and the Cloudflare adapter configured. Preserve it. [Source: Cloudflare Astro Workers docs, 2026-05-12]
- Elysia Cloudflare Worker docs require `CloudflareAdapter` for Worker runtime and note `.compile()` when exporting Elysia directly as Worker default. This repo routes through Astro's handler and the Astro catch-all delegates with `.handle(request)`, so validate actual local architecture with `npm run check` before adding `.compile()`. [Source: Elysia Cloudflare Worker docs, 2026-05-12]

### Out of Scope

- Do not implement full auth/session/RBAC. Later stories own that.
- Do not implement request ID/logging/audit foundation beyond preserving hooks; Story 1.2 owns that.
- Do not complete catalog, checkout, payment, order, return/refund, or brand endpoints.
- Do not add D1 migrations or schema changes.
- Do not change Cloudflare bindings unless required by a typed blocker.
- Do not run repo-wide prettier or broad reformat.
- Do not delete `src/api/**` unless canonical replacement is complete, `npm run check` passes, and migration notes list removal as intentional.

### Testing Requirements

- Required validation: `npm run check`.
- If implementation adds meaningful helper logic, add focused Vitest tests beside the helper as `*.test.ts`. Keep tests Workers-compatible and avoid provider/network calls.
- If no test is added, dev summary must state why `npm run check` is sufficient for this architecture-only story.
- Any failure must include exact command and blocker text, not a vague "check failed".

### Latest Technical Research

- Cloudflare Workers Astro guide currently recommends the Astro Cloudflare adapter and server output for SSR/on-demand rendering. Current repo already matches that shape through `astro.config.mjs`; do not replace it with a fresh starter. Source: https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/
- Elysia Cloudflare Worker docs currently show `CloudflareAdapter`, note compatibility date at least `2025-06-01`, and say AOT can be used after Elysia 1.4.7 though `aot: false` remains allowed. Project context still mandates `aot: false`; project rule wins until architecture changes. Source: https://elysiajs.com/integrations/cloudflare-worker
- Elysia OpenAPI docs currently support route-level `detail` metadata and generated docs/spec routes. Use installed `@elysiajs/openapi` package, not a new package rename. Source: https://elysiajs.com/plugins/openapi

### References

- `_bmad-output/planning-artifacts/epics.md#Story-1.1-Brownfield-Server-Migration-and-Minimal-Reformat`
- `_bmad-output/planning-artifacts/architecture.md#API-&-Communication-Patterns`
- `_bmad-output/planning-artifacts/architecture.md#Architectural-Boundaries`
- `_bmad-output/planning-artifacts/prd.md#Data-&-Response-Requirements`
- `_bmad-output/project-context.md#Critical-Implementation-Rules`
- `src/server/app.ts`
- `src/pages/api/[...slug].ts`
- `src/lib/elysia/astroBridgeContext.ts`
- `src/lib/api/response.ts`
- `src/lib/typebox/api.ts`

## Change Log

- 2026-05-12: Implemented canonical `src/server/**` API composer, thin Astro bridge, server folder ownership docs, migration notes, legacy helper cleanup, and validation tests.

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- `npx vitest run src/server/app.test.ts src/lib/elysia/astroBridgeContext.test.ts` failed before implementation after alias config with missing `@/server/routes`; confirmed red state.
- `npx vitest run src/server/app.test.ts src/lib/elysia/astroBridgeContext.test.ts` passed after implementation.
- `npx tsc --noEmit --pretty false` passed.
- `npm run check` passed.
- `npx vitest run` passed.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Replaced stale QR Resto `src/server/app.ts` composer with JRW Elysia composer using OpenAPI, CORS middleware, Astro bridge decorations, and canonical `serverRoutes`.
- Converted Astro API catch-all to thin bridge with module-scoped `app`, `runtimeEnv` passthrough, and request cleanup in `finally`.
- Added tracked `src/server/**` ownership folders and readmes for future Route -> Controller -> Service -> Domain/Repository work.
- Preserved brownfield route/container patterns as migration-only while removing canonical dependency on `src/api/**`.
- Moved missing TypeBox response imports to `src/lib/typebox/api.ts`; added legacy response schema helpers so frozen `src/api/**` still type-checks without claiming completion.
- Added migration notes with moved/wrapped/frozen/remove-later status and `src/api/**` freeze rule.
- Added focused Vitest coverage for canonical OpenAPI metadata and Astro bridge context lifecycle.
- Review patches added a canonical foundation route through the server route container and mapped Elysia request/client errors to stable API envelopes.

### File List

- `_bmad-output/implementation-artifacts/1-1-brownfield-server-migration-and-minimal-reformat.md`
- `_bmad-output/implementation-artifacts/1-1-legacy-api-migration-notes.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/api/controller/SampleController.ts`
- `src/api/routes/AuditRoutes.ts`
- `src/api/routes/CatalogRoutes.ts`
- `src/api/routes/IdentityRoutes.ts`
- `src/api/routes/SampleRoutes.ts`
- `src/api/routes/TransactionRoutes.ts`
- `src/domain/validation/audit.ts`
- `src/domain/validation/catalog.ts`
- `src/domain/validation/transactions.ts`
- `src/lib/elysia/astroBridgeContext.test.ts`
- `src/lib/typebox/api.ts`
- `src/lib/zod/wrappers.ts`
- `src/pages/api/[...slug].ts`
- `src/server/app.test.ts`
- `src/server/app.ts`
- `src/server/context/_readme.md`
- `src/server/controllers/_readme.md`
- `src/server/dto/_readme.md`
- `src/server/middleware/_readme.md`
- `src/server/middleware/cors.ts`
- `src/server/openapi/_readme.md`
- `src/server/openapi/documentation.ts`
- `src/server/repositories/_readme.md`
- `src/server/routes/foundation.routes.ts`
- `src/server/routes/_readme.md`
- `src/server/routes/index.ts`
- `src/server/routes/route-groups.ts`
- `src/server/services/_readme.md`
- `src/utils/general/error.ts`
- `vitest.config.ts`
