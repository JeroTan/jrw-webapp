---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - "_bmad-output/project-context.md"
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/prd-validation-report.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
  - "_bmad-output/planning-artifacts/ux-design-directions.html"
  - "docs/design-by-google-stitch.md"
  - "docs/jrw-simple-ecommerce-site.md"
  - "raw-query.txt"
  - "raw-prd.txt"
  - "tangram/**/*.md"
workflowType: "architecture"
workflowStatus: "complete"
lastStep: 8
status: "complete"
completedAt: "2026-05-11"
lastEdited: "2026-05-24"
project_name: "jrw-webapp"
user_name: "MR. JRW"
date: "2026-05-11"
sourcePriority:
  primary:
    - "_bmad-output/project-context.md"
    - "_bmad-output/planning-artifacts/prd.md"
    - "_bmad-output/planning-artifacts/prd-validation-report.md"
    - "_bmad-output/planning-artifacts/ux-design-specification.md"
    - "_bmad-output/planning-artifacts/ux-design-directions.html"
    - "docs/design-by-google-stitch.md"
  historicalReference:
    - "docs/jrw-simple-ecommerce-site.md"
    - "raw-query.txt"
    - "raw-prd.txt"
    - "tangram/**/*.md"
notes:
  - "JRW is single-store ecommerce; brands are catalog/collaboration groups, not stores, sellers, merchants, tenants, payout owners, or PayMongo accounts."
  - "Do not add obsolete domain roles, routes, order states, tenancy rules, or operational behavior unless current PRD explicitly requires them."
  - "UI styling correction: use Tailwind utilities and JRW theme tokens directly in markup; do not recreate one-off jrw-* runtime class layers."
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
JRW Webapp is single-store ecommerce with four active user states: `SUPER_ADMIN`, `ADMIN`, `CUSTOMER`, and `PROSPECT`. `STORE_ADMIN` is deprecated and must map into `ADMIN`, not remain separate.

Architecturally, requirements split into nine capability areas: identity/RBAC, owner governance, brand collaboration, catalog/inventory, storefront shopping, checkout/payments, orders/returns/refunds, notifications, audit/observability, and architecture/API documentation.

Core domain rule: JRW is seller of record. Brands are catalog/collaboration groups only, not stores, tenants, merchants, PayMongo accounts, sellers, or payout owners.

**Non-Functional Requirements:**
Architecture must support inventory-safe checkout, PayMongo webhook verification/idempotency, email verification, Google OAuth customer login, role and brand authorization, consistent API envelopes, OpenAPI contracts, request IDs, safe logs, WCAG 2.2 AA, responsive storefront parity, and dense admin dashboard workflows.

Business rules must stay testable without HTTP, D1, Durable Objects, R2, PayMongo, Resend, Google OAuth, Astro, Elysia, or React.

**Scale & Complexity:**
This is medium-high complexity for MVP because payment, inventory, identity, role governance, brand-scoped access, audit logs, and customer/admin UI must work together.

- Primary domain: single-store ecommerce with brand collaboration
- Technical domain: full-stack web app plus API backend on Cloudflare
- Complexity level: medium-high
- Estimated architectural components: 11 major modules

### Technical Constraints & Dependencies

Current accepted stack from project context:
- Astro server output on Cloudflare Workers
- React islands / feature modules
- Tailwind CSS v4 with JRW Technical Brutalist tokens
- Elysia API through Astro catch-all route
- TypeBox/Elysia contracts for API and OpenAPI
- Zod for forms and non-Elysia validation
- Cloudflare D1 with Drizzle ORM
- Durable Objects for inventory concurrency
- R2 for product assets
- PayMongo single JRW merchant account
- Resend email
- Google OAuth for customers
- `jose` and Web Crypto-compatible auth helpers
- Vitest for domain/service tests

Brownfield constraints:
- Existing source has partial API foundation and many mock handlers.
- Admin login is current real flow.
- API authorization guards are implemented for protected endpoints; Astro page middleware must gate protected admin routes before dashboard shell rendering.
- Durable Object inventory safety is scaffolded only.
- Storefront/admin UI is partially implemented and now uses Tailwind utility-first markup with JRW theme tokens.
- `src/server/app.ts` contains outdated scaffold text and must be reconciled.
- Existing `src/lib/**` and `src/utils/**` helpers must be inspected and reused when fit.

### Cross-Cutting Concerns Identified

- Role enforcement for Super Admin, Admin, Customer, Prospect
- Unique Super Admin ownership and transfer safety
- Admin approval and email verification gates
- Customer email verification and Google account linking
- Brand membership gating without marketplace tenancy
- Product, variant, image, price, stock, and publish state integrity
- Inventory reservation/release and oversell prevention
- Payment state separate from fulfillment state
- PayMongo webhook signature verification and idempotency
- Manual return/refund records without automated provider refund semantics
- Product/order snapshots for audit-safe history
- API response envelope consistency
- OpenAPI contract coverage
- Request ID propagation, safe logs, and error tracking
- Philippines privacy/ecommerce trust requirements
- Responsive storefront, dense admin dashboard, WCAG 2.2 AA
- Legacy route/mock cleanup and migration/deprecation plan

## Starter Template Evaluation

### Primary Technology Domain

JRW is a brownfield full-stack Cloudflare Workers web application: Astro SSR shell, React feature islands, Elysia API backend, D1/Drizzle persistence, Durable Object inventory coordination, and R2 product assets.

### Starter Options Considered

**Existing Astro + Cloudflare foundation**
Selected. Current repo already has Astro server output, Cloudflare adapter, React integration, Tailwind Vite plugin, env-scoped Wrangler bindings, D1, R2, and Durable Object scaffolding. Rebuild should reconcile this foundation, not scaffold over it.

**Cloudflare C3 Astro starter**
Best clean-room option if starting from an empty repo. Official Cloudflare docs recommend `npm create cloudflare@latest -- my-astro-app --framework=astro`.

**Astro minimal + `astro add cloudflare`**
Valid for an existing Astro project, but the current repo already has Cloudflare adapter and server output.

**Vite React SPA + Workers API**
Rejected. Storefront needs Astro SSR/SEO/product pages, not SPA-first architecture.

**Next.js/React Router/SvelteKit on Workers**
Rejected. Adds migration cost without solving current JRW requirements better than the existing Astro foundation.

**API-only Elysia/Hono starter**
Rejected. JRW needs storefront, checkout, admin UI, and product pages in one web app.

### Selected Starter: Existing Cloudflare Astro Foundation

**Rationale for Selection:**
Current repo already matches the target platform. Keeping it preserves Cloudflare bindings, D1/Drizzle setup, Astro page routing, React integration, Tailwind setup, and existing helper libraries. Architecture work should reorganize and complete the brownfield codebase rather than create a new project shell.

**Initialization Command:**

```bash
# Current repo: no new initializer.
# Clean-room reference only:
npm create cloudflare@latest -- jrw-webapp --framework=astro
npx astro add react
npx astro add cloudflare
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript on Node `>=22.12.0`, deployed to Cloudflare Workers. Astro 6 requires Node 22+, matching current repo intent.

**Styling Solution:**
Tailwind CSS v4 through Vite plugin. JRW design tokens come from `docs/design-by-google-stitch.md`, not a generic component library.

**UI Styling Architecture Correction (2026-05-24):**
JRW UI is Tailwind utility-first. Runtime JSX/Astro markup should use Tailwind classes plus project theme tokens directly, for example `bg-brand-accent`, `text-brand-muted`, `border-brand-border-strong`, `p-grid-sm`, `gap-grid-xs`, `min-h-control-md`, and responsive variants such as `xs:`, `md:`, `lg:`, and `3xl:`. Do not create one-off `jrw-*` or page/BEM selectors for feature elements.

`src/styles/global.css` is only the Tailwind entrypoint plus imports for fonts, brand/theme tokens, spacing/breakpoint tokens, and global base styles. Shared primitives in `src/components/**` may hold repeated Tailwind class constants inside component files; feature-specific UI keeps utilities close to markup unless cross-feature reuse justifies promotion into a shared component.

**Build Tooling:**
Astro + Vite build pipeline, Cloudflare adapter, Wrangler deploys, and env-scoped D1/R2/Durable Object bindings in `wrangler.jsonc`.

**Testing Framework:**
Vitest exists but tests are mostly absent. Starter provides tooling only; architecture must require domain, service, API contract, auth, inventory, payment, and RBAC tests.

**Code Organization:**
Starter gives Astro pages and integration shell. JRW architecture must define final source tree: `src/features/**`, `src/components/**`, `src/domain/**`, `src/server/**`, `src/adapter/**`, `src/lib/**`, and `src/utils/**`.

**Development Experience:**
Use `npm run dev` for Astro development, `npm run wrangler-dev` for Cloudflare-specific runtime checks, `npm run check` for Astro/TS validation, and `npm run build-test` when meaningful tests exist.

**Note:** First implementation story should reconcile existing brownfield foundation and remove outdated route drift from `src/server/app.ts`, not scaffold a fresh app over current work.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Keep the existing Cloudflare Astro foundation; no fresh scaffold.
- Canonical API entrypoint becomes `src/server/app.ts`; Astro catch-all stays a thin bridge.
- Use Route -> Controller -> Service -> Domain/Repository.
- Use D1 + Drizzle as relational source of truth; remote-first migrations.
- Use TypeBox/Elysia for API contracts and OpenAPI; Zod for forms and non-Elysia parsing.
- Use HttpOnly secure browser sessions; keep `jose` token helpers for signed auth tokens.
- Enforce RBAC and brand membership server-side, not UI-only.
- Gate protected admin Astro pages with page middleware before rendering shell UI; client session checks may refresh state but must not be the first-line page guard.
- Use Durable Object plus optimistic stock versioning for inventory reservation/release.
- Use the single JRW PayMongo merchant account; webhooks must be signature-verified and idempotent.
- Use R2 stable image references; order snapshots preserve purchased state.
- Use standard API envelopes: `{ data, meta }` or `{ error: { code, message, details? } }`.
- Add Vitest tests for domain/service rules before risky provider/UI wiring.

**Important Decisions (Shape Architecture):**
- Frontend uses Astro pages plus React feature islands.
- UI uses local primitives, JRW Stitch tokens, and Tailwind utility classes in markup; no full component library and no one-off `jrw-*` runtime class layer.
- Payment, fulfillment, return, refund, inventory, and product status remain separate.
- Manual return/refund records are admin operations, not PayMongo refund execution.
- Error tracking is env-gated; Cloudflare logs/request IDs are MVP baseline.

**Deferred Decisions (Post-MVP):**
- Automated PayMongo refunds.
- Marketplace/multi-store/sub-merchant payout model.
- Admin OAuth.
- Courier/COD integrations.
- Full analytics/reporting.
- Sentry or equivalent hardening beyond request IDs unless production payments demand it.

### Data Architecture

D1 is the source of truth. Drizzle schema remains under `src/domain/schema/*.ts` unless Step 6 changes the source tree. Required schema evolution: Admin approval/email verification, customer verification, brands, brand memberships, product status, inventory reservations, payment records, webhook events/idempotency keys, manual return/refund history, and richer audit logs.

Migrations stay remote-first: development first, production only after review. Cache public catalog and image metadata conservatively; never cache stock, payment, order, or session state as authority.

### Authentication & Security

Browser auth uses secure HttpOnly cookies backed by server-side session records. `jose` remains approved for JWT/JWE-style helpers: email verification, reset tokens, OAuth state, and signed short-lived internal tokens.

Super Admin remains unique. Ownership transfer requires eligible Admin, confirmation phrase, password re-entry, and audit log. Admin dashboard access requires a Super Admin-created active Admin account.

### API & Communication Patterns

Elysia remains the API framework. `src/pages/api/[...slug].ts` should import `createApp()` from `src/server/app.ts`, bind Astro request data per request, and call `.handle(request)`. Current `src/api/**` can be migrated or wrapped, but new JRW route groups should live under `src/server/**`.

OpenAPI is generated from Elysia route contracts. Each completed endpoint needs params/query/body/response schemas, tags, summary, auth metadata, rate-limit class, and error codes.

### Frontend Architecture

Astro owns routing and SEO pages. React owns interactive storefront, checkout, admin dashboard, and governance surfaces. Feature code lives under `src/features/<feature>/**`; shared primitives live under `src/components/**`.

State approach: URL/server data for browsable catalog, local React state for UI interactions, server validation before checkout, and server state as authority for cart checkout, payment, orders, inventory, and auth.

### Infrastructure & Deployment

Cloudflare Workers hosts SSR/API. D1, R2, and Durable Objects are first-class bindings scoped under `env.development` and `env.production` in `wrangler.jsonc`; root Wrangler config does not define default D1/R2/Durable Object bindings. Wrangler commands that need bindings must pass an explicit environment. Use `npm run dev` for app work, `npm run wrangler-dev` for Cloudflare behavior, `npm run check` for typed validation, and `npm run build-test` once tests exist.

### Decision Impact Analysis

**Implementation Sequence:**
1. Reconcile `src/server/app.ts` and `src/pages/api/[...slug].ts`; remove outdated route drift.
2. Standardize API envelopes, error codes, request IDs, and OpenAPI helpers.
3. Add schema migrations for roles, verification, approval, brands, status separation, reservations, payments, webhooks, returns/refunds.
4. Implement auth/session/RBAC/brand guards.
5. Implement catalog/brand/product domain rules and tests.
6. Implement inventory reservation/release with Durable Object and tests.
7. Implement PayMongo checkout/webhooks/idempotency.
8. Implement storefront, checkout, customer order tracking, admin dashboard, governance UI.

**Cross-Component Dependencies:**
Auth gates admin/customer UI. Brand membership gates catalog edits. Inventory reservation gates PayMongo handoff. Webhooks drive payment state. Payment state and fulfillment state feed order timeline. Audit logging cuts across all sensitive actions.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
14 conflict areas: DB naming, API naming, file naming, DTO shape, money format, status enums, error envelopes, request IDs, auth guards, provider wrappers, event names, state authority, test placement, and legacy migration.

### Naming Patterns

**Database Naming Conventions:**
- Tables use plural `snake_case`: `admins`, `brand_memberships`, `payment_events`.
- Columns use `snake_case`: `brand_id`, `created_at`, `payment_status`.
- IDs use primary key `id`; foreign keys use `{entity}_id`.
- Indexes use `idx_{table}_{columns}`; unique constraints use `uq_{table}_{columns}`.
- Status values use uppercase strings: `PUBLISHED`, `PAYMENT_PAID`, `ORDER_SHIPPED`.
- New money fields use integer centavos: `price_centavos`, `amount_centavos`.

**API Naming Conventions:**
- REST paths use plural kebab-case nouns: `/api/products`, `/api/brand-memberships`.
- Route params use Elysia syntax with camelCase names: `/:productId`.
- Query/body/response JSON uses camelCase.
- DB rows may stay snake_case; map to camelCase DTOs at controller/service boundary.
- Headers use lowercase constants in code, for example `x-request-id`.

**Code Naming Conventions:**
- Controllers, services, containers, route modules, and class-like modules use PascalCase files/classes.
- Utility/lib helpers use kebab-case or lowercase files matching existing local pattern.
- React components use PascalCase `.tsx`.
- Hooks use `useThing.ts`.
- Domain constants use PascalCase type names and uppercase enum values.

### Structure Patterns

**Project Organization:**
- `src/server/app.ts` composes the API.
- `src/pages/api/[...slug].ts` only bridges Astro to Elysia.
- API flow is Route -> Controller -> Service -> Domain/Repository.
- `src/features/<feature>/**` owns feature UI, hooks, client API, local schemas, and feature tests.
- `src/components/**` owns shared primitives/layout only.
- `src/domain/**` owns business rules and Drizzle schema.
- `src/adapter/**` owns infrastructure/application adapters.
- `src/lib/**` owns third-party wrappers and integration clients.
- `src/utils/**` owns atomic provider-free helpers.

**File Structure Patterns:**
- Co-locate pure domain/service tests as `*.test.ts`.
- Shared fixtures live in `src/test/fixtures/**`.
- Provider mocks/fakes live near adapter tests.
- No feature-specific business rules belong in `utils` or generic UI components.

### Format Patterns

**API Response Formats:**
- Success response is `{ data, meta }`.
- Error response is `{ error: { code, message, details? } }`.
- Include `meta.requestId` when available.
- Use `src/lib/api/response.ts` and `src/lib/typebox/api.ts`.
- Do not use legacy `{ data, message, code }` for completed endpoints.

**Data Exchange Formats:**
- Dates/times use ISO 8601 UTC strings.
- Money uses centavos integers in API/domain/provider boundaries.
- Booleans use `true`/`false` in API; D1 may use integer boolean only in schema.
- Public errors never expose DB/provider stacks, raw PayMongo payloads, secrets, or tokens.

### Communication Patterns

**Event System Patterns:**
- Event names use lower dot form: `order.status_changed`, `payment.webhook_processed`.
- Event payload base is `eventId`, `requestId`, `actor`, `target`, `occurredAt`, and `version`.
- Webhook events require idempotency key before mutation.
- Audit events include actor, action, entity, entityId, safe details, timestamp, and requestId.

**State Management Patterns:**
- Server state is authority for auth, cart checkout, inventory, payment, and order status.
- Frontend local state only handles UI interaction, form drafts, filters, and optimistic display.
- Do not add a global state library in MVP unless a story proves need.
- Checkout/payment/order updates are not optimistic.

### Process Patterns

**Error Handling Patterns:**
- Domain/services return `AppResult`/`GeneralError`.
- Controllers adapt results to public API envelopes.
- Provider adapters normalize provider failures before the service layer sees them.
- Validate before provider calls, inventory mutation, payment handoff, and state transitions.

**Loading State Patterns:**
- Buttons show pending state for mutations.
- Tables, grids, cards, and lists use stable skeletons.
- Skeleton pulse behavior is centralized and reduced-motion safe.
- Checkout shows blocking validation before PayMongo handoff.
- Admin conflict responses rollback stale UI and show allowed next action.

### Enforcement Guidelines

**All AI Agents MUST:**
- Read `_bmad-output/project-context.md` and this architecture before coding.
- Reuse existing helpers before adding new wrappers.
- Keep route handlers free of business rules.
- Add tests before marking auth, payment, inventory, RBAC, ownership transfer, or webhook work complete.
- Update architecture/project-context when introducing new cross-cutting patterns.

**Pattern Enforcement:**
- Run `npm run check` for typed changes.
- Run `npm run build-test` once tests exist.
- Code review rejects new ad hoc envelopes, raw provider errors, UI-only authorization, and duplicated wrappers.

### Pattern Examples

**Good Examples:**
- `POST /api/products/:productId/variants`
- `brand_memberships.brand_id`
- `order.status_changed`
- `src/lib/paymongo/PayMongoClient.ts`
- `src/features/admin-products/components/ProductEditor.tsx`
- `{ data: product, meta: { requestId } }`

**Anti-Patterns:**
- Business rules inside Elysia route handlers.
- Brands modeled as stores, tenants, sellers, or PayMongo owners.
- API JSON leaking snake_case DB rows directly.
- Money stored as floats in new payment/order tables.
- Mixing payment and fulfillment into one `status`.
- Introducing outdated route names into JRW routes.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
jrw-webapp/
|-- .github/
|   `-- workflows/
|       `-- ci.yml
|-- _bmad-output/
|-- docs/
|-- migrations/
|-- public/
|   `-- assets/
|-- scripts/
|   `-- seed-super-admin.ts
|-- src/
|   |-- env.d.ts
|   |-- pages/
|   |   |-- index.astro
|   |   |-- products/
|   |   |   `-- [productSlug].astro
|   |   |-- categories/
|   |   |   `-- [categorySlug].astro
|   |   |-- brands/
|   |   |   `-- [brandSlug].astro
|   |   |-- checkout/
|   |   |   |-- index.astro
|   |   |   `-- success.astro
|   |   |-- account/
|   |   |   |-- index.astro
|   |   |   `-- orders/
|   |   |       `-- [orderId].astro
|   |   |-- admin/
|   |   |   |-- index.astro
|   |   |   |-- products/index.astro
|   |   |   |-- brands/index.astro
|   |   |   |-- orders/index.astro
|   |   |   |-- customers/index.astro
|   |   |   |-- audit/index.astro
|   |   |   `-- owner/
|   |   |       |-- admins/index.astro
|   |   |       `-- transfer.astro
|   |   `-- api/
|   |       `-- [...slug].ts
|   |-- styles/
|   |   |-- global.css
|   |   `-- tokens.css
|   |-- components/
|   |   |-- ui/
|   |   |-- layout/
|   |   |-- feedback/
|   |   |-- navigation/
|   |   `-- data-display/
|   |-- features/
|   |   |-- storefront/
|   |   |-- product-catalog/
|   |   |-- cart-checkout/
|   |   |-- customer-account/
|   |   |-- admin-dashboard/
|   |   |-- admin-products/
|   |   |-- admin-brands/
|   |   |-- admin-orders/
|   |   |-- admin-customers/
|   |   |-- super-admin/
|   |   `-- audit-activity/
|   |-- domain/
|   |   |-- auth/
|   |   |-- admins/
|   |   |-- brands/
|   |   |-- catalog/
|   |   |-- inventory/
|   |   |-- checkout/
|   |   |-- payments/
|   |   |-- orders/
|   |   |-- returns-refunds/
|   |   |-- notifications/
|   |   |-- audit/
|   |   |-- schema/
|   |   `-- validation/
|   |-- server/
|   |   |-- app.ts
|   |   |-- context/
|   |   |-- routes/
|   |   |-- controllers/
|   |   |-- services/
|   |   |-- repositories/
|   |   |-- middleware/
|   |   |-- dto/
|   |   `-- openapi/
|   |-- adapter/
|   |   |-- application/
|   |   `-- infrastructure/
|   |       |-- db/
|   |       |-- durable-objects/
|   |       |-- r2/
|   |       |-- paymongo/
|   |       |-- resend/
|   |       |-- google-oauth/
|   |       `-- logging/
|   |-- cloudflare/
|   |   |-- worker.ts
|   |   `-- durable-objects/
|   |       `-- InventoryDurableObject.ts
|   |-- lib/
|   |   |-- api/
|   |   |-- crypto/
|   |   |-- elysia/
|   |   |-- paymongo/
|   |   |-- resend/
|   |   |-- google/
|   |   |-- r2/
|   |   |-- typebox/
|   |   `-- zod/
|   |-- utils/
|   `-- test/
|       |-- fixtures/
|       |-- fakes/
|       `-- setup.ts
|-- astro.config.mjs
|-- drizzle.config.ts
|-- package.json
|-- tsconfig.json
|-- vitest.config.ts
`-- wrangler.jsonc
```

### Architectural Boundaries

**API Boundaries:**
`src/server/**` is the canonical backend/API home. `src/server/app.ts` composes Elysia. `src/pages/api/[...slug].ts` only injects Astro request data and delegates to `src/server/app.ts`.

Current `src/api/**` is deprecated brownfield API scaffolding. Implementation should migrate useful route, controller, service, and container patterns into `src/server/**`, then freeze or remove `src/api/**`. All new backend API work belongs under `src/server/**`.

Routes declare TypeBox contracts, OpenAPI metadata, auth metadata, rate-limit class, and error codes. Routes do not contain business rules.

**Component Boundaries:**
Astro owns page routing and SEO shells. React feature modules own interactive surfaces. Shared primitives go in `src/components/**`; feature-specific UI stays in `src/features/**`.

`src/components/**` is intentionally narrow:
- `src/components/ui/**` for `Button`, `IconButton`, `Input`, `SearchInput`, `SegmentedControl`, `ViewToggle`, modal/drawer triggers, tabs, badges, and low-level interactive controls.
- `src/components/layout/**` for `DashboardShell`, storefront shell, page frames, sidebar slots, top bars, and footer layout.
- `src/components/feedback/**` for `Skeleton`, empty states, toasts, and error states.
- `src/components/navigation/**` for `SidebarNav`, `TopNav`, breadcrumbs, tabs, menus, and view toggles when navigation-like.
- `src/components/data-display/**` for `DataTable`, `ResourceCard`, `ResourceList`, status indicators, timelines, and list primitives.

**Service Boundaries:**
Controllers adapt transport data. Services orchestrate use cases. Domain modules enforce business rules. Repositories/adapters handle D1, Durable Objects, R2, PayMongo, Resend, and Google OAuth.

**Data Boundaries:**
D1 is source of truth. Durable Objects coordinate inventory reservation/release only. R2 stores product assets. PayMongo, Resend, and Google OAuth stay behind `src/lib/**` clients and `src/adapter/infrastructure/**` adapters.

**Visual System Boundaries:**
JRW UI uses `docs/design-by-google-stitch.md` and `_bmad-output/planning-artifacts/ux-design-directions.html`: sharp 0px corners, 1px borders, no shadows, no blur, Satoshi headings, Space Mono utility text, cobalt accent, dense dashboard tables, responsive storefront parity, and product imagery as warmth. Implementation uses Tailwind v4 theme tokens and utility classes directly in JSX/Astro. CSS files define tokens/base only; they do not hide feature-specific layout behind `jrw-*` selectors.

Approved UI fidelity boundaries from 2026-05-24:
- `Button` and `IconButton` hover/focus must use cobalt 2px outline with 2px offset, not border-color-only feedback.
- Product cards must match Direction 01 anatomy while preserving accepted storefront page layout.
- Admin pages must use `DashboardShell`, sidebar, top context bar, role/scope state, session/logout controls, and owner-only navigation before new admin screens expand.
- Admin sign-in, logout, and password reset UI must use existing Admin auth routes; Admin registration UI is out of MVP scope.

### Requirements to Structure Mapping

- Roles/accounts: `src/domain/auth`, `src/domain/admins`, `src/features/super-admin`, `src/server/routes/auth.routes.ts`
- Brands: `src/domain/brands`, `src/features/admin-brands`, `src/server/routes/brands.routes.ts`
- Catalog/inventory: `src/domain/catalog`, `src/domain/inventory`, `src/features/admin-products`, `src/server/routes/products.routes.ts`
- Storefront: `src/pages/index.astro`, `src/features/storefront`, `src/features/product-catalog`
- Checkout/payments: `src/domain/checkout`, `src/domain/payments`, `src/features/cart-checkout`, `src/server/routes/checkout.routes.ts`, `src/server/routes/webhooks.routes.ts`
- Orders/returns/refunds: `src/domain/orders`, `src/domain/returns-refunds`, `src/features/admin-orders`, `src/server/routes/orders.routes.ts`
- Notifications: `src/domain/notifications`, `src/adapter/infrastructure/resend`
- Audit/observability: `src/domain/audit`, `src/features/audit-activity`, `src/server/routes/audit.routes.ts`

### Integration Points

**Internal Communication:**
Frontend features call typed API clients. Routes call controllers. Controllers call services. Services call domain rules and repositories. Repositories use infrastructure adapters.

**External Integrations:**
PayMongo, Resend, Google OAuth, R2, Durable Objects, D1/Drizzle, and error tracking integrations are wrapped in `src/lib/**` and adapted through `src/adapter/infrastructure/**`.

**Data Flow:**
Prospect storefront reads published catalog. Customer checkout validates cart and reserves inventory before PayMongo handoff. Webhooks reconcile payment state. Services update payment/order/fulfillment lanes separately. Admin actions mutate catalog, orders, returns/refunds, and audit logs through server-side guards.

### File Organization Patterns

**Configuration Files:**
Root config owns Astro, Wrangler, Drizzle, TypeScript, Tailwind/Vite, Vitest, package scripts, and environment examples. Wrangler binding config is env-scoped only; package scripts must not rely on root-level D1/R2/Durable Object bindings.

**Source Organization:**
Feature UI, shared components, domain rules, API layers, repositories, provider adapters, middleware, and utilities remain physically separate.

**Test Organization:**
Domain/service tests are co-located as `*.test.ts`. Shared fixtures live in `src/test/fixtures`. Provider fakes live in `src/test/fakes` or beside adapter tests.

**Asset Organization:**
Static public assets live in `public/assets`. Uploaded product media lives in R2. Order snapshots store stable image references so historical orders survive catalog image changes.

### Development Workflow Integration

**Development Server Structure:**
Astro dev runs pages and React islands. Elysia API is exposed through the Astro catch-all bridge, with the real app composed in `src/server/app.ts`.

**Build Process Structure:**
Astro builds for Cloudflare Workers. Wrangler deploys with D1, R2, and Durable Object bindings selected by explicit environment. Drizzle generates SQL into `migrations/`.

**Deployment Structure:**
Remote development D1 receives migrations first. Production D1 migration is explicit review-only. Binding changes require regenerated Cloudflare types for the intended environment; development type generation uses `wrangler types --env development`.

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**
Astro + React + Elysia + Cloudflare Workers + D1/Drizzle + Durable Objects + R2 are coherent. The `src/server/**` canonical backend rule resolves current `src/api/**` vs reference-architecture drift.

**Pattern Consistency:**
Naming, API envelopes, route/controller/service/domain layering, provider adapters, money format, status separation, request IDs, and tests align with decisions.

**Structure Alignment:**
Structure supports storefront, admin dashboard, Super Admin governance, brand collaboration, checkout/payment, orders, returns/refunds, notifications, audit, and observability.

### Requirements Coverage Validation

**Feature Coverage:**
All PRD feature areas map to domains, features, routes, adapters, or infrastructure.

**Functional Requirements Coverage:**
FR1-FR79 are architecturally supported by identity/RBAC, admin governance, brands, catalog, storefront, checkout, payments, orders/returns/refunds, notifications, audit, API contract structure, resource browsing, component-level UI specifications, Tailwind token rules, and approved design-direction fidelity gates.

**Non-Functional Requirements Coverage:**
Performance, security/privacy, reliability, accessibility, integration, observability, and maintainability are addressed through Cloudflare runtime, server-side guards, Durable Object inventory coordination, OpenAPI contracts, request IDs, safe logs, WCAG-oriented UI rules, and domain tests.

### Implementation Readiness Validation

**Decision Completeness:**
Critical decisions are documented. Stack versions live in project context/package metadata. Architecture avoids re-scaffolding and gives first implementation sequence.

**Structure Completeness:**
Project tree is specific enough for agents. Main gap: exact endpoint catalog and final D1 schema table list belong in epics/stories or API contract docs.

**Pattern Completeness:**
Major AI conflict points are covered: file placement, response shape, status enums, provider boundaries, server authority, test placement, and legacy migration.

### Gap Analysis Results

**Critical Gaps:**
None.

**Important Gaps:**
- Exact D1 migration plan/table-by-table schema still needed during implementation.
- Endpoint-level API contract table still needed.
- CI workflow commands need finalization once tests exist.
- `src/api/**` migration/removal should be the first backend cleanup story.

**Nice-to-Have Gaps:**
- Deployment runbook.
- Observability dashboard/error-tracking setup.
- Data retention/privacy operations checklist.

### Validation Issues Addressed

- Strengthened `src/server/**` as canonical backend home.
- Marked `src/api/**` deprecated and migration-only.
- Confirmed server-first architecture organization while removing outdated domain leakage.
- Preserved JRW single-store/payment/brand boundaries.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clear brownfield path, no fresh scaffold confusion.
- `src/server/**` backend ownership is explicit.
- Strong payment/inventory/auth separation.
- Brand model cannot drift into marketplace/store tenancy.
- AI implementation patterns are specific enough to prevent common conflicts.

**Areas for Future Enhancement:**
- Full endpoint catalog.
- Detailed D1 schema/migration spec.
- CI/deployment runbook.
- Production observability/error tracking decision.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow this architecture and `_bmad-output/project-context.md`.
- Put new backend/API work under `src/server/**`.
- Treat `src/api/**` as migration source only.
- Keep routes free of business rules.
- Test auth, RBAC, brand access, inventory, payment webhooks, order transitions, and returns/refunds before marking complete.

**First Implementation Priority:**
Reconcile `src/server/app.ts` and `src/pages/api/[...slug].ts`, migrate useful `src/api/**` patterns into `src/server/**`, and remove outdated route drift.
