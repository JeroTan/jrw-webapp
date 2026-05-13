# Middleware Builder Library

This folder owns a small framework-neutral middleware pipeline builder.

Use it when several request checks must run in order and any check may stop the request by returning a `Response`. It is safe to call from Astro page middleware, API adapters, or tests because it only depends on Web standard `Request`, `Response`, and `URL`.

Import from the public entry point:

```ts
import { createMiddlewarePipeline } from "@/lib/middleware";
```

## Mental Model

- `route(pattern)` starts a route block.
- `methods(...)` optionally limits that block to HTTP methods.
- `use(...)` registers one or more handlers for that block.
- `run(...)` evaluates matching blocks in registration order.
- A handler returning `Response` stops the pipeline.
- A handler returning `undefined` or nothing continues the pipeline.
- Thrown errors are not caught here; the host framework owns logging and error envelopes.

Patterns support:

- Static paths: `/admin`
- Named segments: `/orders/:id`
- Single segment wildcard: `/assets/*`
- Deep wildcard: `/admin/**`

## Human Developer Guide

Keep this library generic. Put framework-specific code in the caller, not in `src/lib/middleware/**`.

Good uses:

- Shared route gating.
- Request preflight checks.
- Reusable page/API guard composition.
- Small testable middleware chains.

Avoid:

- Astro types in this folder.
- Elysia types in this folder.
- `Env`, D1, R2, auth service, or domain imports here.
- Logging here.
- Next.js-style `next()` callbacks.

### Basic Example

```ts
import { createMiddlewarePipeline } from "@/lib/middleware";

const pipeline = createMiddlewarePipeline()
  .route("/admin/**")
  .methods("GET", "POST")
  .use(({ request }) => {
    const session = request.headers.get("cookie");

    if (!session) {
      return Response.redirect(new URL("/login", request.url));
    }
  })
  .route("/health")
  .use(() => new Response("ok"));

const response = await pipeline.run({
  request: new Request("https://jrw.test/admin/products"),
});

if (response) {
  return response;
}
```

### Shared Context Example

Use `context` for request-scoped data supplied by the caller.

```ts
import { createMiddlewarePipeline } from "@/lib/middleware";

interface GuardContext extends Record<string, unknown> {
  actor?: {
    id: string;
    role: "admin" | "customer";
  };
}

const requireAdmin = createMiddlewarePipeline<GuardContext>()
  .route("/admin/**")
  .use(({ context }) => {
    if (context.actor?.role !== "admin") {
      return new Response("Forbidden", { status: 403 });
    }
  });

const response = await requireAdmin.run({
  request,
  context: {
    actor: {
      id: "user_123",
      role: "admin",
    },
  },
});
```

### Astro Page Middleware Example

Keep `src/middleware/index.ts` thin. Build or import a pipeline, then return intercepted responses before calling `next()`.

```ts
import { defineMiddleware } from "astro:middleware";
import { createMiddlewarePipeline } from "@/lib/middleware";

const pageMiddleware = createMiddlewarePipeline()
  .route("/admin/**")
  .use(({ request }) => {
    const isSignedIn = request.headers.get("cookie")?.includes("session=");

    if (!isSignedIn) {
      return Response.redirect(new URL("/login", request.url));
    }
  });

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await pageMiddleware.run({
    request: context.request,
    context: {
      locals: context.locals,
    },
  });

  if (response) {
    return response;
  }

  return next();
});
```

### API Adapter Example

API middleware still lives under `src/server/**`. This builder may be used there as a helper, but API-specific request IDs, actors, and response envelopes stay in server code.

```ts
import { createMiddlewarePipeline } from "@/lib/middleware";

const apiGuards = createMiddlewarePipeline()
  .route("/api/admin/**")
  .methods("GET", "POST", "PATCH", "DELETE")
  .use(({ request }) => {
    if (!request.headers.has("authorization")) {
      return Response.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required.",
          },
        },
        { status: 401 },
      );
    }
  });

const response = await apiGuards.run({ request });

if (response) {
  return response;
}
```

## AI Agent Guide

When modifying this folder:

- Preserve framework neutrality.
- Add behavior through tests first or alongside code.
- Import public API as `@/lib/middleware` in consumers.
- Keep path matching deterministic; do not generate regex from user patterns.
- Keep continuation semantics as `undefined`, not `next()`.
- Do not catch or log handler errors inside the builder.
- Do not wire live auth, DB, or page middleware unless user asks for that wiring.

When using this folder from generated code:

- Build pipelines near the caller or in a focused module.
- Pass request-specific data through `context`.
- Return `Response` only when request should stop.
- Let caller decide what to do when `run(...)` returns `undefined`.

Small AI-safe template:

```ts
import { createMiddlewarePipeline } from "@/lib/middleware";

export const pipeline = createMiddlewarePipeline()
  .route("/example/**")
  .use(({ request, params, context }) => {
    void request;
    void params;
    void context;
  });
```

## Verification

Run focused tests after changes:

```sh
npx vitest run src\lib\middleware\builder.test.ts
```

Run project check before handing off:

```sh
npm run check
```
