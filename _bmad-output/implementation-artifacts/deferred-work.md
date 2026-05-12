# Deferred Work

## Deferred from: code review of 1-1-brownfield-server-migration-and-minimal-reformat (2026-05-12)

- Production CORS origin policy remains localhost-only [src/server/middleware/cors.ts:3]. Existing brownfield CORS was also localhost-only, and production app origin policy is not defined in Story 1.1.
