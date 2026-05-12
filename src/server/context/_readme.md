# Server Context

Request-scoped context helpers live here. Astro-specific data enters through `src/pages/api/[...slug].ts` and `src/lib/elysia/astroBridgeContext.ts`.

Do not store request data in global mutable state.
