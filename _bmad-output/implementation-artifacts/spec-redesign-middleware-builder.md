---
title: 'Redesign Middleware Builder Library'
type: 'refactor'
created: '2026-05-13T00:00:00+08:00'
status: 'done'
baseline_commit: '6951ea61bb35fc9a0d14e308fc1326e7fd4b9361'
context:
  - '{project-root}/_bmad-output/project-context.md'
---

<frozen-after-approval reason="human-owned intent -- do not modify unless human renegotiates">

## Intent

**Problem:** Middleware builder code copied from a Next.js project lives under `src/utils/middleware/**`, uses Next-style continuation language and `Env`, logs directly, and does not match Astro/Cloudflare Workers boundaries. Code quality is weak enough that incremental patching may preserve wrong abstractions.

**Approach:** Redesign it as a small framework-neutral library under `src/lib/middleware/**` that composes ordered route-scoped middleware for standard Web `Request`/`Response` flows. Keep API explicit, testable, Workers-safe, and usable by Astro page middleware or future server adapters without importing Astro/Elysia context types.

## Boundaries & Constraints

**Always:** Use `src/lib/middleware/**` as the library home; remove or replace the copied `src/utils/middleware/**` implementation. Use Web standard `Request`, `Response`, `URL`, and plain context objects. Keep helpers pure except handler execution. Return `Response | undefined` for intercepted requests; `undefined` means continue to the host framework. Support route patterns, method filters, ordered handlers, and short-circuiting.

**Ask First:** Adding external dependencies, changing Astro page middleware entry behavior, or wiring the builder into live auth/page guards.

**Never:** Keep Next.js terminology or behavior as public API. Do not import `cloudflare:workers`, Astro middleware types, Elysia types, DB clients, auth services, or domain business rules in the builder. Do not log inside the builder by default. Do not use globals for request state.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Matching route intercepts | Request path and method match a route with handler returning `Response` | Runner returns that `Response` and stops later handlers/routes | N/A |
| Matching route continues | Matching handlers return `undefined`/void | Runner continues through later matching route blocks, then returns `undefined` | N/A |
| Method mismatch | Path matches but method not included in route method filter | Route block skipped | N/A |
| Pattern matching | Static, wildcard, and named-segment patterns are configured | Path matching is deterministic and documented by tests | Invalid empty patterns fail fast |
| Handler error | Handler throws | Error propagates to caller; host framework owns safe error envelope/logging | N/A |

</frozen-after-approval>

## Code Map

- `src/utils/middleware/builder.ts` -- copied Next.js-style builder to replace or migrate away from.
- `src/utils/middleware/types.ts` -- copied handler/config types to replace or migrate away from.
- `src/lib/**` -- correct home for reusable framework/provider wrappers and builders.
- `src/middleware/_readme.md` -- Astro page middleware folder guidance; builder may be referenced later but should not be wired by this refactor.
- `src/server/middleware/_readme.md` -- Elysia middleware boundary; builder must not blur API route middleware with page middleware.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/middleware/types.ts` -- Define framework-neutral types for middleware handlers, context, route config, runner options, and result semantics.
- [x] `src/lib/middleware/patterns.ts` -- Implement deterministic path matching without ad hoc unsafe regex construction.
- [x] `src/lib/middleware/builder.ts` -- Implement fluent builder and immutable-ish route registration with explicit `run(...)` result semantics.
- [x] `src/lib/middleware/index.ts` -- Export public API from one stable entry point.
- [x] `src/lib/middleware/*.test.ts` -- Cover I/O matrix: intercept, continue, method mismatch, pattern variants, handler error propagation, and route order.
- [x] `src/utils/middleware/**` -- Remove copied Next.js implementation or replace with compatibility re-exports only if needed by existing imports.

**Acceptance Criteria:**
- Given no handler returns a response, when builder runs for any request, then result is `undefined` and no direct logging occurs.
- Given a matching handler returns `Response`, when builder runs, then that response is returned and remaining handlers are not invoked.
- Given route methods exclude the request method, when path matches, then handlers for that route do not run.
- Given wildcard or named path patterns, when paths are tested, then expected matches and misses are covered by Vitest.
- Given code imports middleware builder from `@/lib/middleware`, when `npm run check` runs, then TypeScript passes without Next.js or Cloudflare binding assumptions.

## Design Notes

Prefer simple public API:

```ts
const middleware = createMiddlewarePipeline()
  .route("/admin/**").methods("GET", "POST").use(requireAdmin)
  .route("/checkout/:id").use(loadCheckout);

const response = await middleware.run({ request, locals });
if (response) return response;
```

Handlers receive a single object (`{ request, url, params, context }`) and return `Response | void | Promise<Response | void>`. No `next()` function is needed because the builder controls continuation by return value.

## Verification

**Commands:**
- `npx vitest run src\lib\middleware\builder.test.ts` -- passed: 1 file, 10 tests.
- `npm run check` -- passed: 0 errors, 0 warnings, 22 existing hints.

## Suggested Review Order

**Pipeline Contract**

- Entry point exposes framework-neutral builder and run contract.
  [`builder.ts:17`](../../src/lib/middleware/builder.ts#L17)

- Route registration validates patterns before runtime.
  [`builder.ts:28`](../../src/lib/middleware/builder.ts#L28)

- Runner returns first `Response` and otherwise continues.
  [`builder.ts:44`](../../src/lib/middleware/builder.ts#L44)

- Route builder normalizes methods and requires handlers.
  [`builder.ts:96`](../../src/lib/middleware/builder.ts#L96)

**Pattern Matching**

- Matcher avoids generated regex and returns named params.
  [`patterns.ts:17`](../../src/lib/middleware/patterns.ts#L17)

- Recursive matcher supports `*`, `**`, static, and named segments.
  [`patterns.ts:100`](../../src/lib/middleware/patterns.ts#L100)

- Param decoding stays local and failure-tolerant.
  [`patterns.ts:161`](../../src/lib/middleware/patterns.ts#L161)

**Public Surface**

- Handler invocation shape carries request, URL, params, context.
  [`types.ts:9`](../../src/lib/middleware/types.ts#L9)

- Stable barrel exports public API from `@/lib/middleware`.
  [`index.ts:1`](../../src/lib/middleware/index.ts#L1)

**Verification**

- Pipeline tests cover continue, intercept, method skip, order, errors.
  [`builder.test.ts:5`](../../src/lib/middleware/builder.test.ts#L5)

- Pattern tests cover static, named, wildcard, deep wildcard, invalid patterns.
  [`builder.test.ts:108`](../../src/lib/middleware/builder.test.ts#L108)
