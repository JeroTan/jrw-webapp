# Story 1.1 Legacy API Migration Notes

## Freeze Rule

`src/api/**` is deprecated brownfield scaffolding. Future backend/API work must go under `src/server/**`, `src/domain/**`, `src/adapter/**`, or `src/lib/**` as appropriate. Do not add new route, controller, service, container, or config files under `src/api/**`.

## Migration Map

| Source | Action | Canonical Destination | Status | Reason |
|---|---|---|---|---|
| `src/server/app.ts` | Rewritten as JRW Elysia composer | `src/server/app.ts` | moved | Removed QR Resto route drift and made `src/server/**` canonical backend entrypoint. |
| `src/pages/api/[...slug].ts` | Reduced to Astro bridge | `src/pages/api/[...slug].ts` | moved | Bridge now binds Astro request context and delegates to module-scoped `app.handle(request)`. |
| `src/api/container/ApiContainer.ts` | Pattern preserved | `src/server/routes/index.ts` | wrapped | Root route container pattern retained without registering incomplete legacy endpoints. |
| `src/api/config/cors.ts` | Pattern migrated | `src/server/middleware/cors.ts` | moved | CORS belongs in canonical server middleware, not deprecated `src/api/**`. |
| `src/api/routes/**` | Route patterns inventoried | `src/server/routes/**` | frozen | Existing route modules contain useful Elysia/TypeBox/OpenAPI shape, but endpoint behavior is mock/legacy and not accepted completion. |
| `src/api/controller/**` | Controller pattern inventoried | `src/server/controllers/**` | frozen | Current controllers often return legacy `{ data, message, code }`; future controllers must return standard envelopes. |
| `src/domain/services/**` | Left in place | `src/domain/**` or future `src/server/services/**` | frozen | Mock/domain mix remains brownfield debt; later stories should split pure domain rules from app orchestration. |
| `src/lib/typebox/api.ts` | Expanded canonical helper | `src/lib/typebox/api.ts` | moved | Existing imports now target canonical TypeBox API helper instead of missing `@/lib/typebox/wrappers`. |
| `src/lib/zod/wrappers.ts` | Completed missing helper exports | `src/lib/zod/wrappers.ts` | moved | Legacy validation files imported response helpers that did not exist. |

## Remaining `src/api/**` Removal Candidates

| Candidate | Remove After | Blocker |
|---|---|---|
| `src/api/routes/SampleRoutes.ts` | Story 1.2 or API contract cleanup | Sample endpoints are migration-only and return legacy/mock shapes. |
| `src/api/controller/SampleController.ts` | Story 1.2 or API contract cleanup | Sample controller uses `Response.json({ data, message, code })`. |
| `src/api/container/SampleContainer.ts` | Story 1.2 or API contract cleanup | Only supports sample migration scaffolding. |
| `src/api/routes/IdentityRoutes.ts` | Stories 1.6-1.12 | Auth/account stories need canonical `src/server/routes/auth.routes.ts`. |
| `src/api/controller/IdentityController.ts` | Stories 1.6-1.12 | Admin login is useful brownfield behavior but response shape and boundaries need rebuild. |
| `src/api/routes/CatalogRoutes.ts` | Epics 2-3 | Catalog/brand/product stories need current JRW product and brand contracts. |
| `src/api/controller/CatalogController.ts` | Epics 2-3 | Mock catalog behavior is not current completion. |
| `src/api/routes/TransactionRoutes.ts` | Epics 5-6 | Checkout/payment/order stories need inventory-safe PayMongo and order-state contracts. |
| `src/api/controller/TransactionController.ts` | Epics 5-6 | Mock checkout/webhook/order behavior is not accepted. |
| `src/api/routes/AuditRoutes.ts` | Epic 7 | Audit story needs authorized activity model and safe request ID context. |
| `src/api/controller/AuditController.ts` | Epic 7 | Existing behavior is scaffolding. |
| `src/api/config/cors.ts` | After no imports remain | Replaced by `src/server/middleware/cors.ts`; delete when confirmed unused. |

## Useful Patterns Preserved

- Elysia root app composer with Cloudflare adapter and OpenAPI plugin.
- Thin Astro catch-all bridge into Elysia.
- Root container function to avoid one large route file.
- Domain route grouping with TypeBox schemas and OpenAPI `detail`.
- Controller/service separation as brownfield reference only.
- Standard response helpers in `src/lib/api/response.ts`.
- TypeBox response schema helpers in `src/lib/typebox/api.ts`.

## Known Debt

- `src/api/**` still exists because later feature stories own endpoint-by-endpoint replacement.
- Legacy controllers still contain mock behavior and legacy `{ data, message, code }` response shapes.
- `src/domain/services/IdentityService.ts` imports `cloudflare:workers`; future auth refactor should move platform access behind infrastructure adapters.
- Request ID, safe logging, audit event ports, and final API envelope enforcement belong to Story 1.2.
