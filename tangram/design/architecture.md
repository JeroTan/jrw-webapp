# Architecture Blueprint: JRW Simple E-commerce

## 1. Current Architecture State

The project is in a contract-first backend foundation stage. Features `00001` through `00007` have established the database schema, validation layer, API route contracts, R2 image-reference model, and the first real endpoint implementation: `POST /api/admin/auth/login`.

Most API endpoints are intentionally mocked at this stage. The mock service methods exist to stabilize the Elysia route contracts, Swagger metadata, TypeBox request/response schemas, and controller/service boundaries before each domain receives full D1, Durable Object, PayMongo, Resend, and authorization logic.

## 2. Runtime Topology

- **Frontend and SSR**: Astro server output with React islands for future interactive feature modules.
- **API Boundary**: Astro catch-all route `src/pages/api/[...slug].ts` hosts a global Elysia app under `/api`.
- **Edge Runtime**: Cloudflare Workers via `@astrojs/cloudflare`.
- **Persistence**: Cloudflare D1 accessed through Drizzle ORM.
- **Inventory Concurrency**: Cloudflare Durable Objects are configured and scaffolded, but stock-locking behavior is not implemented yet.
- **Asset Storage**: Cloudflare R2 helpers exist in `src/lib/cloudflare/r2.ts`; catalog responses hydrate consumer-facing image links from stable image IDs.

## 3. Layering Pattern

The backend follows the project constitution's layered API contract:

```text
Route -> Controller -> Service -> Infrastructure / Domain Schema
```

- **Routes** define HTTP method, path, request schemas, response schemas, and OpenAPI metadata.
- **Controllers** translate Elysia/Astro context into service calls and standardized response envelopes.
- **Services** hold the business action. At the current stage, most services still return mock data except `IdentityService.adminLogin`.
- **Infrastructure** wraps external systems such as D1, R2, JWT, hashing, and future third-party integrations.

## 4. Bounded Contexts

- **Identity**: Admin/customer schemas, multi-provider customer identity model, login contract, admin login implementation.
- **Catalog**: Product, variant, category, product photo, image-reference, and review contracts.
- **Transactions**: Checkout, orders, snapshots, order status, and PayMongo webhook contracts.
- **Audit**: Audit log schema and read contract.
- **Inventory**: Durable Object binding and placeholder class for future stock-locking logic.

## 5. Implemented Versus Planned

Implemented now:

- Drizzle schemas and migrations for Identity, Catalog, Transactions, and Audit.
- TypeBox and Zod validation layers.
- Elysia route/controller/service wiring for the major API surface.
- R2 image-key model in schema and helper utilities.
- Functional admin login using D1, WebCrypto password verification, and `jose` JWT generation.
- Remote-first D1 development configuration in `wrangler.jsonc`.

Planned / intentionally not implemented yet:

- Customer auth, registration, profile, and password-reset logic.
- Admin/customer authorization middleware and protected-route guards.
- Catalog CRUD persistence.
- Checkout/order persistence, PayMongo payment flow, and webhook signature verification.
- Durable Object stock-locking and reconciliation logic.
- Resend transactional email flows.
- Storefront UI and Admin Command Center UI.

## 6. Known Alignment Notes

- Route descriptions may mention required authorization tokens before middleware exists. This is a contract target, not current enforcement.
- API mocks are intentional while the project advances feature by feature.
- The Astro starter home page remains as a future UI task and is not evidence of backend/API completion.

## 7. Alignment

- _Source_: Current codebase as of Feature `00007_admin_login`.
- _Source_: `tangram/archive/**/summary.md`.
- _Source_: `tangram/constitution.md`.
