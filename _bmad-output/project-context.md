---
project_name: "jrw-webapp"
user_name: "MR. JRW"
date: "2026-05-11"
lastUpdated: "2026-05-26"
sections_completed:
  - technology_stack
  - language_rules
  - framework_rules
  - testing_rules
  - quality_rules
  - workflow_rules
  - anti_patterns
status: "complete"
rule_count: 104
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
- `src/server/routes/**` composes canonical route groups and route modules. Avoid "God files"; add domain route modules instead.
- `src/server/app.ts` is the canonical Elysia composer after Story 1.3. Keep legacy route names out of this composer.
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
- Remote Cloudflare bindings in `wrangler.jsonc` are source of truth even during local app development. Current development `DB` and `STORAGE` bindings use `"remote": true`, so local app flows should assume real remote D1 and R2 unless task explicitly switches to `--local` or test-only mocks.
- Wrangler Cloudflare bindings are environment-scoped only in `wrangler.jsonc`; `DB`, `STORAGE`, Durable Object bindings, and Durable Object migrations live under `env.development` and `env.production`, not root config.
- Any Wrangler command that needs Cloudflare bindings must pass the intended environment explicitly: use `--env development` for development and `--env production` only after production review.
- `npm run db:migrate:remote` applies remote development. Production migration must use `wrangler d1 migrations apply DB --remote --env production` or a reviewed script.
- `npm run db:migrate:local` exists but is not canonical for this project; it still targets development explicitly with `--env development`.
- Regenerate Cloudflare binding types after binding changes with `npm run wrangler-types`; this generates development env binding types.
- Use `import { env } from "cloudflare:workers"` only in adapters, infrastructure, app bridge, or integration wrappers where platform access is expected.
- Do not import `cloudflare:workers` from pure domain rule modules.
- Seed Super Admin through explicit script/review. Warn before replacing owner credentials or changing unique owner behavior.

### Cloudflare Runtime Rules

- Runtime code must be Workers-compatible. Avoid Node-only APIs in request path.
- During local development, treat Cloudflare environment resources as remote by default: D1, R2, and env-scoped Durable Object bindings follow Wrangler env config, not assumed in-memory/local clones, unless command, test harness, or config explicitly opts into local behavior.
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
- Google OAuth is Customer-only for MVP unless Admin OAuth is explicitly approved later.
- Auto-link OAuth by verified email only inside Customer realm when safe. Same Admin email string must not block or link Customer OAuth, and OAuth code must not query Admin account storage.
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
- Use Tailwind CSS v4 utility classes directly in JSX/Astro markup for feature-specific layout, spacing, color, and state. Do not create one-off `jrw-*` or page/BEM CSS classes for single elements.
- Use `src/styles/global.css` only as the Tailwind entrypoint plus font imports, `@theme` brand tokens, spacing/breakpoint tokens, and global base styles. Do not reintroduce deleted `src/styles/features/**`, `src/styles/storefront/**`, or `src/styles/components/_ui.css` class layers.
- Brand tokens live in `src/styles/_colors.css` and `src/styles/_tokens.css`; prefer classes such as `bg-brand-accent`, `text-brand-muted`, `border-brand-border-strong`, `p-grid-sm`, `gap-grid-xs`, `min-h-control-md`, and responsive variants like `xs:`, `md:`, `lg:`, `3xl:` over raw colors/spacing or custom `jrw-*` selectors.
- Shared primitives in `src/components/**` may keep reusable Tailwind class constants inside component files. Feature-specific UI should keep utility classes close to element markup unless true cross-feature reuse belongs in a shared component.
- Use `Button` for button actions and `ButtonLink` for anchor actions that should share the JRW button contract. Do not duplicate long anchor-button class strings in feature code.
- `Button` defaults to `type="button"` for safety. Forms that submit through `Button` must pass `type="submit"` explicitly.
- `Button`, `ButtonLink`, `Input`, and `Select` expose small visual-control props such as `borderTone`, `textSize`, and `controlSize`; add to primitives before duplicating one-off control classes in feature code.
- `IconButton` is removed. Use `Button` with `square`, `aria-label`, and `title` for icon-sized button controls.
- Storefront shell top-level components live at `src/features/storefront-shell/StorefrontHeader.tsx`, `StorefrontFooter.tsx`, `StorefrontHero.tsx`, and `StorefrontHomeHero.tsx`; navigation subparts live under `src/features/storefront-shell/components/Navigation/**`.
- Do not embed storefront-shell hero decisions inside product-catalog components. Routes or shell/home components compose `StorefrontHero`; `ProductCatalog` renders catalog directory, filters, grid, pagination, empty, and error states only.
- Storefront cart trigger lives in `CartAction`: shared `Button`, `lucide-react` `ShoppingCart`, quantity badge, and `CartDrawer`. Do not replace this with custom SVG or a separate icon-button primitive.
- Approved HTML direction fidelity is mandatory for UI stories. Cite `_bmad-output/planning-artifacts/ux-design-directions.html` directions in story ACs and implementation notes before marking UI work done.
- Button and ButtonLink hover/focus must use cobalt outline treatment matching the HTML reference: 2px accent outline with 2px offset, not border-color-only hover.
- Product grid/card changes must preserve accepted storefront layout and match Direction 01 anatomy: grid owns top/left borders, cards own right/bottom borders, media block uses `h-55`, metadata stays compact, and no generic rounded/shadow ecommerce cards.
- Public product metadata should omit missing brand rather than displaying "Brandless"; keep brandless language for admin/domain contexts where it helps operations.
- Admin UI must use Direction 05 dashboard shell and Direction 07 owner-governance composition: sidebar, top context bar, dense tables, role/scope state, owner-only nav group, and logout/session controls.
- Before finishing UI work, run `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`; runtime UI should have no matches except legitimate brand slugs, fixture text, or tests that explicitly assert absence.
- Use cobalt accent sparingly for focus, selected state, primary action, and live status.
- Storefront must be responsive-first with desktop and mobile parity.
- Admin dashboard is desktop-first, dense, table-driven, keyboard-friendly, and operation-focused.
- Do not build marketing landing pages in place of usable storefront/admin flows.
- Use product imagery as primary storefront warmth; avoid decorative gradients/orbs.
- Status badges must include text and must not rely on color alone.
- Destructive or authority-changing actions require deliberate confirmation.
- Ownership transfer needs target eligibility, confirmation phrase, password re-entry, and audit trail.
- UI copy must state what the screen, section, or field does for the user. Prefer "You can manage your list of brands here" over policy explanations.
- Page descriptions should name the user's available work: manage records, edit details, review requests, upload images, check status, retry payment, or view history.
- Helper text should explain immediate field meaning or consequence. Do not use helper text for internal doctrine, architecture notes, legal positioning, payment ownership, or anti-marketplace disclaimers.
- Keep brand UI labels practical: "Brand", "No brand", "Brand members", "Join requests", "Linked products". Use "catalog group" only when it clarifies product assignment.
- Do not put "JRW is seller of record", "single merchant account", "not a tenant", or similar technical/business boundary copy in routine UI. Keep that in PRD, architecture, API docs, audits, or payment/legal contexts where users need it.
- Empty states should say current state plus next action, not abstract domain definitions.
- Permission text should say why action is unavailable and what permission is needed, without over-explaining server architecture.
- Before adding UI text, check: can a normal Admin understand what to do next in one short sentence? If not, rewrite.

### Testing And Quality

- Current repo has limited early Vitest coverage. Do not treat broad test pass/fail as complete feature proof until critical story tests exist.
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
- Auth is realm-specific: Admin auth uses `/api/admin/auth/*` with `jrw_admin_session`; Customer auth uses `/api/customer/auth/*` with `jrw_customer_session`. Generic `/api/auth/*` is removed.
- Server-side RBAC guards are implemented for completed protected Admin/Customer route groups; future protected endpoints must use the same guard pattern.
- Durable Object inventory locking is scaffolded only.
- Storefront/admin UI is partially implemented in current feature modules. Future UI changes must preserve Tailwind utility-first markup and avoid resurrecting deleted `jrw-*` CSS class layers.
- Storefront user overhaul from commit `6959300` is documented in `_bmad-output/implementation-artifacts/storefront-user-overhaul-2026-05-25.md`; follow its component contracts for shell, hero, cart, and button/link actions.
- Storefront catalog manual cleanup from 2026-05-26 is documented in `_bmad-output/implementation-artifacts/storefront-catalog-manual-ui-cleanup-2026-05-26.md`; follow it for ProductCatalog, ProductGrid, ProductCard, ProductCatalogFilters, StorefrontHomeHero, and primitive visual props.
- UI fidelity correction is approved as of 2026-05-24: add shared primitive contract, storefront product-card fidelity, admin shell/auth entry UI, admin dashboard console wrap, and future story UI fidelity gate before expanding checkout/admin/order UI.
- Existing API response shapes are inconsistent; standardize before marking endpoints complete.
- `src/api/**` still has outdated scaffold text and routes. Treat it as migration source only and follow Story 1.3 baseline before removal.
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

Last Updated: 2026-05-26
