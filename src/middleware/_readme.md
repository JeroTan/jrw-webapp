# Astro Middleware

This folder owns Astro page/site middleware.

`src/middleware/index.ts` is the entry point Astro loads. Keep it thin: compose small middleware modules from this folder instead of putting all logic in the root file.

## Use This Folder For

- Page redirects and route gating.
- Storefront/admin page access checks.
- Locale, URL, and browser-facing request handling.
- Page-level response headers that are not API contract concerns.

## Modularization Pattern

- `index.ts` composes and exports the root `onRequest`.
- Put focused modules beside it, grouped by concern when needed.
- Keep page middleware free of API response-envelope logic.
- Keep provider, DB, and auth business rules in `src/server/**`, `src/adapter/**`, or `src/domain/**`; call those helpers instead of duplicating rules here.

Example shape:

```text
src/middleware/
  index.ts
  auth/
    admin-page-guard.ts
    customer-page-guard.ts
  headers/
    security-headers.ts
  routing/
    canonical-paths.ts
```

## Boundary

API middleware is separate. API request context, request IDs, actor derivation, error envelopes, and Elysia route hooks live under `src/server/**`.

Use this folder for Astro page middleware only. If behavior must affect `/api/**`, implement it as an Elysia plugin or route hook under `src/server/**`.
