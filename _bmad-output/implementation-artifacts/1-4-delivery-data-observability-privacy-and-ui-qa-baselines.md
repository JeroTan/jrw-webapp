# Story 1.4: Delivery, Data, Observability, Privacy, and UI QA Baselines

Status: done

## Story

As a developer/agent,
I want migration, delivery, observability, privacy, and UI QA baselines documented before feature implementation,
so that future stories know how to ship database, deployment, logging, customer-data, and user-interface changes safely.

## Acceptance Criteria

1. Given D1 and Drizzle are relational source of truth, when table-by-table migration baseline is written, then each planned table or schema group has owning story, purpose, main relationships, migration timing, and remote development migration evidence policy, and production migration remains explicitly review-gated.
2. Given implementation needs repeatable verification, when CI/check baseline is written, then it documents local check command, intended CI gate command, test command expectations, and Cloudflare binding/type generation expectations, and blockers or missing CI automation are visible before broad feature implementation.
3. Given deployment must be repeatable, when deployment runbook baseline is written, then it documents development deploy command, production deploy review gate, smoke check, rollback notes, and environment-specific migration warning, and production deploy remains review-gated.
4. Given production payments require operations readiness, when observability setup checklist is written, then checklist covers request IDs, Cloudflare logs, error tracking enablement, critical failure categories, safe event context, and launch blockers, and real customer payments remain gated until critical observability items are satisfied or explicitly accepted.
5. Given customer/admin PII requirements apply, when retention/privacy checklist is written, then checklist covers PII fields, data purpose, access scope, retention rule owner, deletion/review notes, and registration/checkout notice needs, and blockers are documented before production launch.
6. Given UI stories require repeatable quality checks, when UI QA baseline is written, then it selects Playwright plus `@axe-core/playwright` or documented equivalent for automated accessibility checks, and it defines responsive screenshot widths `320`, `375`, `390`, `430`, `768`, `1024`, and `1440`.
7. Given UI QA cannot be fully automated, when manual QA checklist is written, then it covers keyboard-only walkthroughs, focus trap/restore, status badge contrast, no color-only status, reduced motion, text overflow, and Lighthouse/WebPageTest storefront performance evidence, and each UI story must record executed checks or blockers.
8. Given validation exists, when story implementation finishes, then migration plan, delivery runbook, observability checklist, retention/privacy checklist, and UI QA baseline exist as referenced artifacts, and `npm run check` passes or blocker is documented.
9. Given story outputs are reviewed, when implementation is accepted, then D1 migration plan, CI/check baseline, deployment runbook, observability checklist, retention/privacy checklist, and UI QA baseline are present, and output summary names each artifact path and any launch blockers still open.

## Tasks / Subtasks

- [x] Create D1 migration plan baseline. (AC: 1, 8, 9)
  - [x] Create `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md`.
  - [x] Inventory current schema files `src/domain/schema/*.ts`, existing `migrations/*.sql`, and `migrations/meta/_journal.json`.
  - [x] Add table-by-table or schema-group table with columns: current/proposed table, owning story, purpose, relationships, migration timing, destructive-change risk, remote development evidence policy, production gate.
  - [x] Include current drift: existing schema uses some legacy/simple fields (`real` money, plain product brand text, combined order status) that future stories must migrate to PRD-aligned centavos, brand relationships, separate payment/fulfillment status, reservation/payment/webhook/return/refund/audit structures.
  - [x] State development D1 migration evidence must name command, environment, migration file(s), timestamp, and success output. Production D1 migration requires explicit human review.

- [x] Create CI/check and delivery runbook baseline. (AC: 2, 3, 8, 9)
  - [x] Create `_bmad-output/implementation-artifacts/1-4-delivery-runbook.md`.
  - [x] Document current local commands from `package.json`: `npm run check`, `npx vitest run`, `npm run build-test`, `npm run wrangler-types`, `npm run db:generate`, `npm run db:migrate:remote`, `npm run deploy-development`, `npm run deploy-production`.
  - [x] Document intended CI gate command as `npm run build-test` once CI has Cloudflare auth/bindings; until then, record missing `.github/workflows/**` as open automation gap.
  - [x] Document `wrangler.jsonc` development and production env names, D1 database names/IDs, R2 bucket names, Durable Object binding, compatibility date, and compatibility flags.
  - [x] Document deployment sequence: validate, generate binding types after binding changes, generate migrations after schema changes, apply remote development migration, deploy development, smoke check, then production review gate.
  - [x] Include rollback notes and warn that Worker rollback does not roll back D1/R2/Durable Object resource state.

- [x] Create observability setup checklist. (AC: 4, 8, 9)
  - [x] Create `_bmad-output/implementation-artifacts/1-4-observability-checklist.md`.
  - [x] Reference existing request ID and logging foundation: `src/utils/request-id.ts`, `src/server/context/request-context.ts`, `src/adapter/infrastructure/logging/operational-log.ts`, `src/server/app.ts`.
  - [x] Checklist must cover request ID propagation, response header, safe error response request ID, structured JSON operational logs, scrubbed details, Cloudflare Workers Logs/observability config, source maps decision, third-party error tracking decision, and launch blockers.
  - [x] Critical failure categories must include unhandled API exceptions, payment webhook failures, checkout/payment reconciliation failures, auth/email verification failures, image upload failures, provider timeouts, and D1 migration/deploy failures.
  - [x] Safe event context must include request ID, actor role, safe actor identifier, target resource identifier, error code, timestamp, environment, and sanitized details only.
  - [x] Real customer payments remain blocked until observability checklist marks critical items satisfied or explicitly accepted by owner.

- [x] Create retention/privacy checklist. (AC: 5, 8, 9)
  - [x] Create `_bmad-output/implementation-artifacts/1-4-retention-privacy-checklist.md`.
  - [x] Cover PII fields from PRD: admin/customer email, password hash, names, phone, address fields, OAuth provider identity, avatar URL, order history, payment metadata, audit actor identifiers, support/contact records when added.
  - [x] For each field/group, document purpose, access scope, owning story, retention owner, retention rule/TBD, deletion/review notes, and whether registration/checkout privacy notice must mention it.
  - [x] Record production launch blockers for missing privacy notice, undefined retention owner, unnecessary PII collection, raw provider payload exposure, raw payment/card data collection, or missing access-control story.
  - [x] Keep PayMongo hosted/controlled payment capture. JRW app must not collect raw card details.

- [x] Create UI QA baseline. (AC: 6, 7, 8, 9)
  - [x] Create `_bmad-output/implementation-artifacts/1-4-ui-qa-baseline.md`.
  - [x] Select Playwright plus `@axe-core/playwright` for automated UI QA unless implementation documents equivalent and why.
  - [x] State current repo does not yet include Playwright or `@axe-core/playwright`; this story may document selected baseline without installing unless adding scripts/tests is explicitly chosen.
  - [x] Define responsive screenshot widths exactly: `320`, `375`, `390`, `430`, `768`, `1024`, `1440`.
  - [x] Include automated checks: smoke navigation, screenshot capture/comparison where stable, axe scan for key pages, no console errors for critical flows, reduced-motion emulation where relevant.
  - [x] Include manual checks: keyboard-only walkthroughs, focus trap/restore for modals/drawers/side panels, status badge contrast, text labels for status, no color-only status, reduced motion, text overflow, sticky action bars not covering content, Lighthouse/WebPageTest storefront performance evidence.
  - [x] Require each future UI story to record executed checks or blockers in completion notes.

- [x] Validate and record evidence. (AC: 8, 9)
  - [x] Run `npm run check`.
  - [x] Run `npx vitest run` if code/scripts/package config changed; if docs-only, note why targeted tests are not required.
  - [x] Confirm all five baseline artifacts exist and are linked from this story completion notes.
  - [x] Summarize open launch blockers and missing automation.

## Dev Notes

### Current State

- Canonical docs before this story:
  - `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md` defines endpoint catalog update rules and planned route groups.
  - `_bmad-output/implementation-artifacts/1-3-legacy-api-migration-baseline.md` freezes `src/api/**` and keeps new backend/API work under `src/server/**`.
  - `_bmad-output/project-context.md` is active agent rule source.
- `package.json` has no CI script beyond local commands and no Playwright packages. Current useful scripts: `check`, `test`, `build-test`, `db:generate`, `db:migrate:remote`, `wrangler-types`, `deploy-development`, `deploy-production`.
- No `.github/workflows/**` files are present. `.github/prompts/**` exists only for prompts.
- `wrangler.jsonc` currently uses:
  - Worker main `src/cloudflare/worker.ts`
  - top-level name `jrw-simple-ecommerce-site`
  - development env name `jrw-ecommerce-development`
  - production env name `jrw-simple-ecommerce-site`
  - D1 binding `DB`
  - development D1 `jrw-database-development` / `beabfd98-8611-4d58-8f1b-7a972b8af1ed`
  - production D1 `jrw-database-production` / `fd08e264-2046-4648-9164-84f66948533e`
  - R2 binding `STORAGE`
  - Durable Object binding `INVENTORY_DURABLE_OBJECT`
  - compatibility date `2026-04-28`
  - flags `nodejs_compat`, `global_fetch_strictly_public`
  - top-level `observability.enabled = true` and `head_sampling_rate = 1`; verify behavior for named env deploys and document if per-env observability is required.
- `drizzle.config.ts` uses schema `./src/domain/schema/*.ts`, output `./migrations`, dialect `sqlite`, driver `d1-http`, and Cloudflare API token from `CLOUDFLARE_API_TOKEN`.
- Current schema files:
  - `src/domain/schema/identity.ts`: `admins`, `customers`, `customer_providers`.
  - `src/domain/schema/catalog.ts`: `products`, `product_photos`, `categories`, `product_categories`, `product_variants`.
  - `src/domain/schema/transactions.ts`: `orders`, `order_snapshots`, `reviews`.
  - `src/domain/schema/audit.ts`: `audit_logs`.
- Current migrations `0000` through `0006` create or alter current schema. `migrations/meta/_journal.json` tracks seven migration entries.
- Observability/logging foundation already exists:
  - `src/utils/request-id.ts` defines `x-request-id`.
  - `src/server/context/request-context.ts` derives request context per request and sets response header.
  - `src/adapter/infrastructure/logging/operational-log.ts` creates structured log events and scrubs passwords, hashes, JWTs, tokens, secrets, cookies, auth headers, signatures, session data, email, PayMongo/provider/payment payloads, card data, pepper, stack, phone, and address.
  - `src/server/app.ts` maps safe error codes, returns public error envelopes, and logs operational failures for internal/provider failures.

### Architecture Constraints

- D1 plus Drizzle is relational source of truth. Drizzle schema source stays under `src/domain/schema/*.ts`; migration output stays in `migrations/`.
- Remote-first D1 standard: apply development remote migrations first. Production migrations require explicit review.
- D1 table and column names use `snake_case`. IDs use `id`; foreign keys use `{entity}_id`; indexes use `idx_{table}_{columns}`; unique constraints use `uq_{table}_{columns}`.
- New money fields use integer centavos, not floating `real`, at API/domain/provider boundaries.
- API responses use `{ data, meta }` or `{ error: { code, message, details? } }`; public JSON is camelCase.
- Logs and error events must scrub secrets, tokens, raw payment payloads, provider payloads, stack traces, raw card data, and unnecessary PII.
- Error tracking is environment-gated. Cloudflare logs/request IDs are MVP baseline; production customer payments should not launch without critical observability accepted.
- UI uses JRW Stitch tokens: 0px radius, 1px borders, no shadows, no blur, Satoshi headings, Space Mono system text, restrained cobalt, visible focus, text-first status.
- UI QA targets WCAG 2.2 AA, 44px mobile touch targets, keyboard support, focus trap/restore, reduced motion, and no color-only status.
- `src/api/**` is migration-only. This story should not add backend/API code there.

### Expected Artifacts

Create these files:

- `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md`
- `_bmad-output/implementation-artifacts/1-4-delivery-runbook.md`
- `_bmad-output/implementation-artifacts/1-4-observability-checklist.md`
- `_bmad-output/implementation-artifacts/1-4-retention-privacy-checklist.md`
- `_bmad-output/implementation-artifacts/1-4-ui-qa-baseline.md`

Update only if needed:

- `_bmad-output/implementation-artifacts/1-4-delivery-data-observability-privacy-and-ui-qa-baselines.md` for completion notes.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` status after implementation/review workflow.
- `_bmad-output/project-context.md` only if story discovers durable new rules agents must follow.
- `README.md` only if command documentation changes are intentionally promoted from baseline artifact to repo-facing docs.

Avoid unless explicitly justified:

- Installing Playwright packages in this story.
- Adding `.github/workflows/**` CI before user/project confirms CI provider and secrets.
- Running production deploy or production D1 migration.
- Deleting or rewriting existing migrations.
- Adding broad app feature code.

### D1 Migration Plan Seed

Use this as starting table content, then expand from current schema and PRD.

| Schema group/table | Current state | Planned owner | Purpose | Key relationships | Timing | Production gate |
| --- | --- | --- | --- | --- | --- | --- |
| `admins` | Exists, minimal owner/password fields | Stories 1.6, 1.11, 1.13 | Super Admin/Admin identity, approval, suspension, ownership | Audit, sessions, ownership transfer | Epic 1 | Review unique owner invariant and seed plan |
| `customers` | Exists, profile/address fields | Stories 1.8, 1.10 | Customer identity/profile/contact | Providers, sessions, orders | Epic 1 | Review privacy notice and retention |
| `customer_providers` | Exists | Story 1.10 | OAuth provider links | Customer | Epic 1 | Verify safe provider metadata retention |
| Session/token tables | Missing | Stories 1.7, 1.8, 1.9 | HttpOnly sessions, verification, reset/OAuth state | Admin/customer | Epic 1 | Security review |
| Brand tables | Missing | Stories 2.1-2.5 | Brand catalog groups and membership | Admins/products | Epic 2 | Confirm brand is not tenant/store/merchant |
| `categories` | Exists, legacy `type` | Story 3.1 | Product category taxonomy | Product categories | Epic 3 | Confirm category model |
| Product tables | Exists with legacy brand text, `real` price | Stories 3.2-3.8 | Products, variants, prices, images, snapshots | Brands/categories/assets/orders | Epic 3 | Migrate money to centavos and stable image refs |
| Inventory tables | Missing except variant stock fields | Stories 3.6, 5.2, 5.6 | Stock, reservations, release/reconciliation | Variants/checkouts/orders | Epics 3 and 5 | Concurrent checkout evidence |
| Checkout tables | Missing | Stories 5.1-5.2 | Checkout attempt, validation, reservation | Customer/cart/payment | Epic 5 | Payment launch gate |
| Payment/webhook tables | Missing | Stories 5.3-5.5 | PayMongo payment state, webhook idempotency | Orders/inventory | Epic 5 | Signature/idempotency evidence |
| `orders`, `order_snapshots` | Exists, combined status and `real` totals | Stories 5.5, 6.1-6.3 | Order headers/items/snapshots/status lanes | Customer/payments/returns/refunds | Epics 5 and 6 | Separate payment and fulfillment state |
| Return/refund tables | Missing | Stories 6.4-6.6 | Manual return/refund history | Orders/admins/audit | Epic 6 | Manual-only refund boundary |
| `audit_logs`/audit events | Exists minimal | Stories 7.1-7.2 | Sensitive action audit and activity history | Actor/target/request ID | Epic 7 | Access scope and safe metadata review |

### Delivery Runbook Seed

- Local validation:
  - `npm run check` for Astro/TypeScript.
  - `npx vitest run` for tests.
  - `npm run build-test` for intended full local gate: `astro check && vitest run && astro build`.
- Binding/type changes:
  - Run `npm run wrangler-types` after `wrangler.jsonc` binding changes.
- Schema changes:
  - Update `src/domain/schema/*.ts`.
  - Run `npm run db:generate`.
  - Review generated SQL before applying.
  - Apply development remote only with `npm run db:migrate:remote`.
  - Production D1 migration command is intentionally not automated by npm script. Use explicit reviewed command only: `wrangler d1 migrations apply DB --remote --env production`.
- Deploy:
  - Development deploy command: `npm run deploy-development`.
  - Production deploy command exists as `npm run deploy-production`, but story must mark it review-gated.
- Smoke checks:
  - Check `GET /api/`.
  - Check `GET /api/openapi/json`.
  - Check representative changed API/page after each future feature deploy.
  - Verify response `x-request-id` header and safe public error shape where feasible.
- Rollback:
  - Worker rollback can restore previous Worker version.
  - D1/R2/Durable Object state is not rolled back by Worker rollback. Any schema/data rollback needs separate reviewed plan.

### Observability Checklist Seed

- Required before real payments:
  - Request ID exists for every API request.
  - Response includes `x-request-id`.
  - Safe errors include request ID where useful.
  - Operational failure logs are structured JSON.
  - Log details scrub raw passwords, hashes, JWTs, tokens, secrets, cookies, auth headers, signatures, sessions, email, phone, address, PayMongo/provider/payment payloads, card data, pepper, and stack traces.
  - Cloudflare Workers Logs/observability is enabled for deployed envs, with sampling rate documented.
  - Critical failure categories have either platform logs or configured error tracking.
  - Third-party error tracking decision is documented as enabled, deferred, or explicitly accepted risk.

### Retention/Privacy Checklist Seed

- Required columns for each PII group: field/group, table/source, purpose, access scope, owning story, retention owner, retention rule, deletion/review notes, privacy notice requirement, launch blocker.
- Minimum groups: admin email/password hash/approval state, customer email/name/phone/address, OAuth provider ID/avatar/provider metadata, order history, payment metadata, audit actor IDs, request IDs/log details, image metadata, support/contact details if later added.
- Block production launch if:
  - Privacy notice missing before registration/checkout.
  - Raw card data or raw provider/payment payloads are collected beyond approved audit/reconciliation need.
  - Retention owner/rule is TBD for customer PII.
  - Admin/customer access scope is undefined.
  - Log/error event scrub evidence is missing.

### UI QA Baseline Seed

- Selected automated baseline: Playwright + `@axe-core/playwright`.
- Required viewport widths: `320`, `375`, `390`, `430`, `768`, `1024`, `1440`.
- Future setup suggestion if project chooses to install tools later:
  - Add `@playwright/test` and `@axe-core/playwright` as dev dependencies.
  - Add `playwright.config.ts` with stable viewport projects.
  - Add script such as `test:e2e`.
  - Store screenshots from one OS/browser baseline in CI to avoid noisy visual diffs.
- Manual QA must cover keyboard-only navigation, focus trap/restore, status text, contrast, reduced motion, text overflow, sticky action bars, and Lighthouse/WebPageTest evidence for storefront.

### Previous Story Intelligence

- Story 1.3 established API contract documentation, endpoint catalog baseline, and legacy migration baseline. Use those artifacts as references, not new endpoint implementation targets.
- Story 1.3 review fixed stale context and OpenAPI safety test overmatching. Avoid global content bans that would reject legitimate future terms like `password`; scrub actual secret values/payloads instead.
- Story 1.3 validation passed `npm run check` after Wrangler login. Cloudflare auth may still be needed for commands that touch remote D1 or deploy.
- Story 1.2 established request-aware envelopes, safe operational logging foundation, audit event port, request context plugin, and `routeDetail(...)`. Build observability checklist on those helpers.
- Story 1.1 established canonical `src/server/**` ownership and thin Astro bridge. Do not reintroduce `src/api/**` as canonical.

### Latest Technical Information

- Cloudflare D1 migrations are `.sql` files in `migrations/`; applied migrations are tracked in a `d1_migrations` table. Binding names can change, so D1 docs advise considering database name to avoid wrong-target migration. Source: https://developers.cloudflare.com/d1/reference/migrations/
- Cloudflare D1 may need `PRAGMA defer_foreign_keys = true` before migrations that would otherwise violate foreign keys. Source: https://developers.cloudflare.com/d1/reference/migrations/
- Cloudflare Workers Logs collect invocation logs, custom logs, errors, and uncaught exceptions when observability is enabled. `head_sampling_rate` ranges from `0` to `1`; `1` logs all requests. Source: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- Cloudflare Worker rollback creates a new active deployment but does not change connected resources; D1/R2/Durable Object changes need separate recovery plan. Source: https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/
- Playwright visual comparisons use `expect(page).toHaveScreenshot()`, but browser rendering varies by OS, browser, hardware, and headless settings; keep screenshot baselines in same environment. Source: https://playwright.dev/docs/test-snapshots
- Playwright accessibility docs use `@axe-core/playwright` and warn automated accessibility tests catch only some issues, so manual assessment remains required. Source: https://playwright.dev/docs/accessibility-testing

### Testing Requirements

- Required:
  - `npm run check`
  - `npx vitest run` if source code, package scripts, Playwright config, or test files change.
- Docs-only acceptable evidence:
  - `npm run check` passes or documented Cloudflare/Wrangler auth blocker.
  - Artifact existence check confirms all expected story outputs.
  - Completion notes list each artifact and open launch blockers.
- Do not claim CI, production deploy, production migration, Playwright automation, or error tracking are implemented unless this story actually implements and verifies them.

### Project Structure Notes

- Story aligns with architecture gaps: exact D1 migration plan, CI/deployment runbook, production observability decision, and data retention/privacy checklist are explicitly called out as remaining gaps.
- No conflict found with current source tree. Current scripts and config support documentation baseline without code changes.
- Treat current schema as brownfield baseline, not final product model. Future stories own schema changes.

### References

- `_bmad-output/planning-artifacts/epics.md#Story-1.4-Delivery-Data-Observability-Privacy-and-UI-QA-Baselines`
- `_bmad-output/planning-artifacts/prd.md#Domain-Specific-Requirements`
- `_bmad-output/planning-artifacts/prd.md#Non-Functional-Requirements`
- `_bmad-output/planning-artifacts/architecture.md#Data-Architecture`
- `_bmad-output/planning-artifacts/architecture.md#Implementation-Readiness-Validation`
- `_bmad-output/planning-artifacts/ux-design-specification.md#Testing-Strategy`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`
- `_bmad-output/implementation-artifacts/1-3-legacy-api-migration-baseline.md`
- `_bmad-output/implementation-artifacts/1-3-api-contract-documentation-and-legacy-migration-baseline.md`
- `package.json`
- `wrangler.jsonc`
- `drizzle.config.ts`
- `src/domain/schema/identity.ts`
- `src/domain/schema/catalog.ts`
- `src/domain/schema/transactions.ts`
- `src/domain/schema/audit.ts`
- `migrations/meta/_journal.json`
- `src/utils/request-id.ts`
- `src/server/context/request-context.ts`
- `src/adapter/infrastructure/logging/operational-log.ts`
- `src/server/app.ts`
- Cloudflare D1 migrations docs: https://developers.cloudflare.com/d1/reference/migrations/
- Cloudflare Workers Logs docs: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- Cloudflare Workers rollback docs: https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/
- Playwright visual comparison docs: https://playwright.dev/docs/test-snapshots
- Playwright accessibility testing docs: https://playwright.dev/docs/accessibility-testing

## Story Context Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12T14:54:42+08:00: Story moved to in-progress in sprint tracking.
- 2026-05-12T15:08:31+08:00: `npm run check` passed with 0 errors, 0 warnings, 22 existing hints.
- 2026-05-12T15:12:27+08:00: `npm run build-test` initially failed in sandbox with `spawn EPERM`; rerun outside sandbox after approval passed.
- 2026-05-12T15:14:45+08:00: `npm run build-test` passed: Astro check 0 errors/0 warnings/22 hints, Vitest 6 files/18 tests passed, Astro build complete.

### Completion Notes List

- Created D1 migration plan baseline with current schema/migration inventory, table/schema ownership, migration timing, remote development evidence policy, production gates, drift notes, and production launch blockers: `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md`.
- Created CI/check and delivery runbook baseline with local commands, intended CI gate, missing `.github/workflows/**` gap, Cloudflare env/binding inventory, deploy sequence, smoke checks, and rollback warnings: `_bmad-output/implementation-artifacts/1-4-delivery-runbook.md`.
- Created observability checklist covering request ID propagation, response headers, safe error request IDs, structured logs, scrubbed details, Cloudflare Workers Logs, source maps/error tracking decisions, critical failure categories, safe event context, and payment launch blockers: `_bmad-output/implementation-artifacts/1-4-observability-checklist.md`.
- Created retention/privacy checklist covering admin/customer PII, OAuth identity/avatar/metadata, order history, payment metadata, audit actor IDs, support/contact records, privacy notice needs, and production launch blockers: `_bmad-output/implementation-artifacts/1-4-retention-privacy-checklist.md`.
- Created UI QA baseline selecting Playwright plus `@axe-core/playwright`, exact viewport widths `320`, `375`, `390`, `430`, `768`, `1024`, `1440`, automated/manual QA expectations, and future-story evidence template: `_bmad-output/implementation-artifacts/1-4-ui-qa-baseline.md`.
- Open launch blockers recorded across artifacts: production D1 migration review gate, missing CI workflow automation, named-env observability verification, third-party error tracking decision, privacy notice/retention owners, payment observability/idempotency gates, missing Playwright/axe automation, and no storefront performance evidence yet.

### File List

- `_bmad-output/implementation-artifacts/1-4-delivery-data-observability-privacy-and-ui-qa-baselines.md`
- `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md`
- `_bmad-output/implementation-artifacts/1-4-delivery-runbook.md`
- `_bmad-output/implementation-artifacts/1-4-observability-checklist.md`
- `_bmad-output/implementation-artifacts/1-4-retention-privacy-checklist.md`
- `_bmad-output/implementation-artifacts/1-4-ui-qa-baseline.md`

### Change Log

- 2026-05-12: Added Story 1.4 baseline artifacts and moved story to review after validation passed.
