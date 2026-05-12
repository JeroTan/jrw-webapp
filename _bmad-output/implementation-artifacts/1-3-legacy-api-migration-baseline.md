# Story 1.3 Legacy API Migration Baseline

Status: baseline

This document refreshes Story 1.1 legacy notes for current Story 1.3 API contract work. It does not make `src/api/**` canonical.

## Freeze Rule

`src/api/**` remains deprecated brownfield scaffolding. New backend/API work belongs under `src/server/**`, with pure rules under `src/domain/**`, adapters under `src/adapter/**`, and shared integration/helpers under `src/lib/**`.

Do not add new routes, controllers, services, containers, config, or endpoint contracts under `src/api/**`.

## Current Canonical State

| Area | Canonical Source | Status | Notes |
| --- | --- | --- | --- |
| Elysia app composer | `src/server/app.ts` | migrated | Canonical JRW app prefix, OpenAPI plugin, CORS, request context, safe error mapping, and `serverRoutes`. |
| Astro API bridge | `src/pages/api/[...slug].ts` | migrated | Thin bridge into module-scoped Elysia app with per-request Astro context binding. |
| Server route container | `src/server/routes/index.ts` | wrapped | Keeps container pattern without registering incomplete legacy routes. |
| CORS middleware | `src/server/middleware/cors.ts` | migrated | Replaces legacy `src/api/config/cors.ts` for canonical app use. |
| API envelopes | `src/lib/api/response.ts` and `src/lib/typebox/api.ts` | migrated | Standard success `{ data, meta }` and error `{ error: { code, message, details? } }` helpers. |
| Route metadata | `src/server/openapi/route-metadata.ts` | migrated | Safe `x-auth`, `x-rate-limit-class`, `x-error-codes`, summaries, descriptions, tags. |

## Legacy Inventory

| Legacy File | Classification | Removal Blocker | Notes |
| --- | --- | --- | --- |
| `src/api/config/cors.ts` | removal-candidate | Delete after no imports remain and `src/server/middleware/cors.ts` remains sole app CORS source. | Canonical replacement already exists. |
| `src/api/container/ApiContainer.ts` | wrapped | Remove after all legacy containers are unregistered and no imports remain. | Pattern preserved by `src/server/routes/index.ts`; do not register legacy endpoints. |
| `src/api/container/SampleContainer.ts` | removal-candidate | Remove after Story 1.3+ contract cleanup confirms sample endpoints are not needed. | Sample-only scaffold. |
| `src/api/routes/SampleRoutes.ts` | removal-candidate | Remove after Story 1.3+ contract cleanup confirms no references. | Contains sample/mock endpoints, including direct `Response.json`. |
| `src/api/controller/SampleController.ts` | removal-candidate | Remove with sample routes/container. | Uses legacy response style. |
| `src/api/container/IdentityContainer.ts` | frozen | Stories 1.6-1.13 replace auth/admin account/ownership contracts. | Migration reference only. |
| `src/api/routes/IdentityRoutes.ts` | frozen | Stories 1.7-1.13 create canonical auth/admin routes under `src/server/**`. | Legacy auth/profile/admin paths are not accepted completion. |
| `src/api/controller/IdentityController.ts` | frozen | Stories 1.7-1.13 rebuild controllers/services with standard envelopes and server-side auth. | Calls mock identity service; legacy response shape. |
| `src/api/container/CatalogContainer.ts` | frozen | Epics 2-3 replace brands/products/categories contracts. | Migration reference only. |
| `src/api/routes/CatalogRoutes.ts` | frozen | Stories 2.1-2.7 and 3.1-3.9 create canonical brand/product/catalog routes. | Legacy `/catalog` and `/admin/catalog` behavior is mock/incomplete. |
| `src/api/controller/CatalogController.ts` | frozen | Epics 2-3 rebuild catalog controllers/services and DTO mapping. | Calls mock catalog service; legacy response shape. |
| `src/api/container/TransactionContainer.ts` | frozen | Epics 5-6 replace checkout/payment/webhook/order contracts. | Migration reference only. |
| `src/api/routes/TransactionRoutes.ts` | frozen | Stories 5.1-5.7 and 6.1-6.6 create canonical checkout/payment/webhook/order routes. | Legacy checkout/orders/webhook behavior is mock and not inventory/payment safe. |
| `src/api/controller/TransactionController.ts` | frozen | Epics 5-6 rebuild payment/order controllers and provider boundaries. | Calls mock transaction service; legacy response shape. |
| `src/api/container/AuditContainer.ts` | frozen | Stories 7.1-7.2 create canonical audit capture/history routes. | Migration reference only. |
| `src/api/routes/AuditRoutes.ts` | frozen | Stories 7.1-7.2 replace with authorized audit/activity contracts. | Legacy audit list is mock/incomplete. |
| `src/api/controller/AuditController.ts` | frozen | Stories 7.1-7.2 rebuild audit controller/service boundaries. | Calls mock audit service; legacy response shape. |

## Drift To Avoid

- Legacy `{ data, message, code }` controller responses. Completed endpoints must use `{ data, meta }` or `{ error: { code, message, details? } }`.
- Mock endpoint behavior from `src/api/**` or `src/domain/services/**` being treated as completion.
- Stale QR Resto, restaurant, menu, seating, or subscription route naming.
- Domain services importing platform bindings such as `cloudflare:workers`; platform access belongs behind adapters/infrastructure.
- New canonical code under `src/api/**`.
- Public docs/examples exposing secrets, tokens, raw provider payloads, environment values, stack traces, or unnecessary PII.

## Removal Plan

1. Remove sample scaffold after Story 1.3 confirms no canonical dependency.
2. Replace Identity legacy files during auth/admin account stories in Epic 1.
3. Replace Catalog legacy files during brand/product stories in Epics 2-3.
4. Replace Transaction legacy files during checkout/payment/order stories in Epics 5-6.
5. Replace Audit legacy files during audit stories in Epic 7.
6. Delete `src/api/**` only after canonical replacements exist, imports are gone, tests pass, and `npm run check` passes. A documented check blocker defers deletion; it does not permit deletion.
