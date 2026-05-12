---
project_name: "jrw-webapp"
user_name: "MR. JRW"
date: "2026-05-11"
sections_completed:
  - technology_stack
  - language_rules
  - framework_rules
  - testing_rules
  - quality_rules
  - workflow_rules
  - anti_patterns
status: "complete"
rule_count: 77
optimized_for_llm: true
existing_patterns_found: 18
---

# Project Context for AI Agents

_Critical rules and patterns AI agents must follow when implementing code in this project. Keep this file lean and focused on unobvious project rules._

---

## Source Of Truth

- Current product truth lives in `_bmad-output/planning-artifacts/prd.md`.
- UX truth lives in `_bmad-output/planning-artifacts/ux-design-specification.md` and `docs/design-by-google-stitch.md`.
- Raw intent lives in `raw-prd.txt` and `raw-query.txt`.
- Legacy docs in `docs/jrw-simple-ecommerce-site.md` and `tangram/**` are reference only.
- Do not add obsolete roles, routes, order states, or tenancy rules unless current PRD explicitly requires them.
- Actual code beats old docs when they conflict. Update docs after implementation changes instead of forcing code to match stale artifacts.

## Product Boundaries

- JRW Webapp is single-store ecommerce. JRW is seller of record.
- Brands are catalog organization and collaboration groups only. They are not stores, tenants, sellers, merchants, payout owners, or PayMongo accounts.
- MVP roles are `SUPER_ADMIN`, `ADMIN`, `CUSTOMER`, and `PROSPECT`.
- `STORE_ADMIN` is deprecated alias or migration label for `ADMIN`, not an active separate role.
- Super Admin is unique owner. Exactly one owner must exist.
- Super Admin manages Admin accounts and ownership transfer. Daily catalog/order operations belong to Admin.
- Admin manages products, brands, variants, stock, prices, orders, manual returns/refunds, and audit-visible operational work.
- Customers register or use Google sign-in for purchase and order tracking. Prospects browse storefront before account creation.
- Payment state and fulfillment/order state must stay separate in data, API, and UI.
- Manual refund/return recording is not automated PayMongo refund unless a later story explicitly adds provider refund execution.

## Technology Stack & Versions

Runtime and platform:

- Node `>=22.12.0`
- Astro `6.1.9` with `output: "server"`
- `@astrojs/cloudflare` `13.2.1`
- Cloudflare Workers compatibility date `2026-04-28`
- Cloudflare Workers compatibility flags: `nodejs_compat`, `global_fetch_strictly_public`
- Cloudflare D1 via Drizzle ORM
- Cloudflare Durable Objects for inventory concurrency
- Cloudflare R2 binding `STORAGE` for product assets
- TypeScript `5.9.3` with `astro/tsconfigs/strict`

Frontend:

- React `19.2.5`
- React DOM `19.2.5`
- `@astrojs/react` `5.0.4`
- Tailwind CSS `4.2.4`
- `@tailwindcss/vite` `4.2.4`
- `ahooks` `3.9.7`
- `lodash` `4.18.1`

API and validation:

- Elysia `1.4.28`
- `@elysiajs/openapi` `1.4.15`
- `@elysiajs/cors` `1.4.2`
- Zod `4.4.1`
- Elysia TypeBox helpers through `t` from `elysia`

Data and integrations:

- Drizzle ORM `0.45.2`
- Drizzle Kit `0.31.10`
- Wrangler `4.85.0`
- `@cloudflare/workers-types` `4.20260426.1`
- `jose` `6.2.3`
- `paymongo` `1.3.2`
- `resend` `6.12.2`
- `@paralleldrive/cuid2` `3.3.0`
- `p-queue` `9.2.0`

Tooling:

- Vitest `4.1.5`
- Astro Check `0.9.9`
- Prettier `3.8.3`
- `prettier-plugin-astro` `0.14.1`
- TSX `4.21.0`
- Vite override `^7.3.1`

## Critical Implementation Rules

### Architecture And DDD

- Use Bulletproof React style: organize user-facing UI by feature, not by technical file type.
- `src/features/<feature>/**` owns feature components, hooks, local state, client API calls, schemas, and feature tests.
- `src/components/**` is for generic reusable primitives only: buttons, inputs, modals, tables, badges, drawers, layout primitives.
- When building UI, extract and/or create reusable atomic or modular components under `src/components/**` when behavior is generic across features; keep feature-specific components in `src/features/<feature>/**` until reuse justifies promotion.
- Business rules belong in `src/domain/**` and must be testable without HTTP, D1, Durable Objects, R2, PayMongo, Resend, Google OAuth, or React.
- Domain logic must not depend on Astro `Context`, Elysia `Context`, `Request`, `Response`, Cloudflare bindings, or provider SDKs.
- Infrastructure adapters belong in `src/adapter/infrastructure/**`.
- Application orchestration adapters belong in `src/adapter/application/**`.
- Third-party wrappers and custom integration clients belong in `src/lib/**`.
- Atomic independent helpers belong in `src/utils/**`.
- Do not place provider calls, DB access, or custom SDK wrappers in `src/utils/**`.
- Use fluent modular APIs only where they improve readability for route composition, validators, builders, query composition, or domain workflows.
- Fluent interfaces must stay explicit. Avoid hidden mutation, cross-request shared state, and clever chains that hide failures.

### API Layering

- Target API flow is Route -> Controller -> Service -> Domain/Repository.
- Route files own Elysia route registration, HTTP method/path, TypeBox request/response contracts, OpenAPI `detail`, auth metadata, and route-level middleware.
- Controllers translate transport data into service calls and map service results to public API envelopes.
- Services orchestrate use cases and return `AppResult`/domain result types for meaningful failures.
- Repositories/adapters encapsulate D1, Drizzle, Durable Objects, R2, PayMongo, Resend, Google OAuth, and other external effects.
- `src/pages/api/[...slug].ts` is current Astro-to-Elysia bridge. Keep it thin.
- `src/api/container/**` composes domain route containers. Avoid "God files"; add domain containers instead.
- `src/server/app.ts` contains outdated route names and must not be treated as authoritative JRW API structure until reconciled.
- New endpoints must follow current JRW PRD and architecture, not legacy scaffold naming.
- Elysia app uses `adapter: CloudflareAdapter`, `aot: false`, and `normalize: true`; keep these unless architecture updates Workers compatibility.
- Astro-scoped values such as URL and cookies must be injected per request with scoped `derive`, not stored in global mutable state.

### API Contracts And Responses

- Public API responses must use `{ data, meta }` for success or `{ error: { code, message, details? } }` for failure.
- Use `src/lib/api/response.ts` for response adapters.
- Use `src/lib/typebox/api.ts` and `tboxApiResponse(...)` for Elysia/OpenAPI response schemas.
- Current controllers that return `{ data, message, code }` are legacy/mock shape. Do not use that shape for completed endpoints.
- Every implemented endpoint needs params/query/body/response schemas, OpenAPI tags, summary, description, auth metadata, rate-limit class, and documented error codes.
- Customer-facing errors must not expose database errors, provider payloads, stack traces, tokens, secrets, or raw payment/OAuth details.
- Stable error codes are required. Prefer PRD codes and existing `src/utils/general/error.ts` codes over ad hoc strings.
- Request ID must propagate through logs and safe error responses where useful.

### Validation Rules

- Use TypeBox/Elysia `t` schemas for Elysia route contracts and OpenAPI generation.
- Use Zod for forms, local parsing, and non-Elysia validation where TypeBox contract generation is not needed.
- Reusable TypeBox helpers belong in `src/lib/typebox/**`.
- Reusable Zod wrappers, formatters, and validators belong in `src/lib/zod/**`.
- Domain validation schemas may live under `src/domain/validation/**`, but provider and transport details must not leak into domain decisions.
- Validate before provider calls, before payment handoff, before inventory mutation, and before state transitions.

### Data, D1, And Migrations

- Drizzle schema source is `src/domain/schema/*.ts`.
- Drizzle migration output is `migrations/`.
- D1 database binding is `DB`.
- Development D1: `jrw-database-development`, id `beabfd98-8611-4d58-8f1b-7a972b8af1ed`.
- Production D1: `jrw-database-production`, id `fd08e264-2046-4648-9164-84f66948533e`.
- Remote-first D1 is project standard. Apply schema changes to remote `development` first, then explicit remote `production` after review.
- Root Wrangler D1 binding and `env.development` both point to development D1. Production must use `--env production`.
- `npm run db:migrate:remote` applies remote development. Production migration must use `wrangler d1 migrations apply DB --remote --env production` or a reviewed script.
- `npm run db:migrate:local` exists but is not canonical for this project.
- Regenerate Cloudflare binding types after binding changes with `npm run wrangler-types`.
- Use `import { env } from "cloudflare:workers"` only in adapters, infrastructure, app bridge, or integration wrappers where platform access is expected.
- Do not import `cloudflare:workers` from pure domain rule modules.
- Seed Super Admin through explicit script/review. Warn before replacing owner credentials or changing unique owner behavior.

### Cloudflare Runtime Rules

- Runtime code must be Workers-compatible. Avoid Node-only APIs in request path.
- Node APIs are allowed in scripts such as `scripts/seed-admin.ts`, not in Worker handlers.
- Use `jose` for JWT signing/verification. Do not add Node-only JWT libraries.
- Use Web Crypto-compatible password/token utilities.
- Durable Object `InventoryDurableObject` is scaffolded only. Do not claim inventory safety until locking/reservation logic and tests exist.
- Inventory concurrency must use Durable Object coordination and/or documented optimistic concurrency so checkout cannot oversell.
- R2 image references must preserve historical order snapshots even when product images change later.

### Security And Privacy

- PayMongo checkout must use JRW single merchant account.
- JRW app must never collect raw card details.
- PayMongo webhooks must verify signature before any state mutation.
- Webhooks must be idempotent. Duplicate valid events must not duplicate orders, payments, stock movements, emails, or audit logs.
- Payment success pages must reconcile with JRW server state, not trust redirect params alone.
- Google OAuth is customer-only for MVP unless admin OAuth is explicitly approved later.
- Auto-link OAuth by verified email only when safe.
- Resend handles verification, password reset, order, payment, fulfillment, and admin notices.
- Logs and error events must scrub raw passwords, JWTs, OAuth tokens, PayMongo secrets, raw payment payloads, and unnecessary PII.
- Philippines privacy and ecommerce trust requirements from PRD apply before production launch.

### Ecommerce Domain Rules

- Product can be brandless or assigned to one brand.
- Brand membership gates brand-scoped product visibility and editing.
- Product must support categories, variants, images, price, stock, publish status, and historical order snapshots.
- Product/order snapshots must preserve purchased product name, variant, price, quantity, and image reference at purchase time.
- Product status should use `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- Inventory state should use `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, `PREORDER`.
- Payment statuses and order fulfillment statuses must remain separate.
- Invalid state transitions return conflict-style errors, not silent success.
- Checkout must block unavailable variants before PayMongo handoff.
- Failed/cancelled payments must release reserved stock through immediate logic or documented reconciliation.
- Manual return/refund history must keep actor, status, reason, amount, notes, reference ID, and timestamps.

### UI And Design Rules

- Follow `docs/design-by-google-stitch.md`: sharp 0px corners, 1px grid/borders, no shadows, no blur, no soft generic ecommerce style.
- Use Satoshi for headings/identity and Space Mono for utility/system text when fonts are available.
- Use `src/styles/global.css` as the Tailwind CSS v4 project style surface for `@theme`, `@utility`, and reusable component classes; extract repeated long Tailwind class chains there so feature `className` values stay short and readable.
- Use cobalt accent sparingly for focus, selected state, primary action, and live status.
- Storefront must be responsive-first with desktop and mobile parity.
- Admin dashboard is desktop-first, dense, table-driven, keyboard-friendly, and operation-focused.
- Do not build marketing landing pages in place of usable storefront/admin flows.
- Use product imagery as primary storefront warmth; avoid decorative gradients/orbs.
- Status badges must include text and must not rely on color alone.
- Destructive or authority-changing actions require deliberate confirmation.
- Ownership transfer needs target eligibility, confirmation phrase, password re-entry, and audit trail.

### Testing And Quality

- Current repo has no real test files. Do not treat `npm run test` pass/fail as meaningful until tests exist.
- Add Vitest tests for pure domain rules before wiring risky flows into UI or providers.
- Minimum critical test areas: RBAC, brand membership, product publish rules, inventory reservation/release, payment reconciliation, webhook idempotency, order transitions, return/refund transitions, API envelopes, and auth.
- API route completion requires contract tests or documented contract verification.
- Payment, auth, inventory, and ownership transfer changes require higher review and tests than UI-only changes.
- Use `npm run build-test` for full local gate when tests exist: `astro check && vitest run && astro build`.
- Use `npm run check` for TypeScript/Astro validation after typed changes.

### Naming And Style

- Use `@/` path alias for `src/*` imports.
- Use PascalCase filenames for controllers, services, route modules, containers, and class-like modules already following that pattern.
- Use kebab-case or lowercase for utility files and simple lib helpers already following that pattern.
- Drizzle table and column names use snake_case.
- Keep explicit domain names over generic "manager" or "handler" names.
- Avoid TypeScript `any`; prefer explicit domain types, `unknown` with narrowing, generics, TypeBox `Static`, or validated schema output.
- Keep comments sparse and useful. Do not narrate obvious assignments.

## Current Implementation Warnings

- Most API handlers still return mock data. Mocks are scaffolding, not accepted feature completion.
- Admin login is the only currently functional flow noted by README.
- Authorization middleware and protected route guards are not implemented yet.
- Durable Object inventory locking is scaffolded only.
- Storefront and admin UI are not implemented yet.
- Existing API response shapes are inconsistent; standardize before marking endpoints complete.
- `src/server/app.ts` has outdated scaffold text and routes. Reconcile or remove during API architecture cleanup.
- Old docs mention automated PayMongo refunds and apparel-only scope; current PRD prefers lifestyle products and manual refund/return recording for MVP.

## Usage Guidelines

For AI agents:

- Read this file before implementing code.
- Follow all rules unless user explicitly updates architecture.
- Prefer current PRD over older Tangram artifacts.
- When uncertain, choose stronger domain isolation and safer payment/inventory behavior.
- Update this file when stack, structure, or critical implementation rules change.

For humans:

- Keep this file lean.
- Add only rules agents might miss.
- Remove rules once code structure makes them obvious.
- Review after architecture artifact or major source reorganization.

Last Updated: 2026-05-12
