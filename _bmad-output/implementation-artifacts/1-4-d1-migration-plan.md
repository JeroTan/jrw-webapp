# Story 1.4 D1 Migration Plan Baseline

Status: baseline
Owner: Story 1.4
Last updated: 2026-05-22

## Purpose

This baseline records current D1/Drizzle state, future schema ownership, migration timing, and evidence required before database changes reach production.

D1 plus Drizzle remains relational source of truth. Drizzle schema source stays in `src/domain/schema/*.ts`; migration output stays in `migrations/`.

## Current Inventory

| Area | Current source | Notes |
| --- | --- | --- |
| Schema files | `src/domain/schema/identity.ts`, `src/domain/schema/catalog.ts`, `src/domain/schema/transactions.ts`, `src/domain/schema/audit.ts` | Current brownfield schema, not final PRD model. |
| Migration files | `migrations/0000_classy_menace.sql` through `migrations/0022_price_centavos_integer.sql` | Twenty-three SQL migration files exist. Remote development evidence is recorded through `0022_price_centavos_integer.sql`. |
| Migration journal | `migrations/meta/_journal.json` | Version `7`, dialect `sqlite`, entries idx `0` through `14`; manual SQL files `0015` through `0022` are not journaled snapshots. |
| Drizzle config | `drizzle.config.ts` | Schema glob `./src/domain/schema/*.ts`, output `./migrations`, driver `d1-http`. |
| Development D1 | `jrw-database-development` / `beabfd98-8611-4d58-8f1b-7a972b8af1ed` | Remote-first development target. |
| Production D1 | `jrw-database-production` / `fd08e264-2046-4648-9164-84f66948533e` | Human review required before any migration. |

## Migration Evidence Policy

Development remote migration evidence must record:

- Command run.
- Environment and D1 database name/id.
- Migration file names applied.
- Timestamp.
- Success output or exact blocker.

Production migration remains review-gated. Use explicit reviewed command only:

```powershell
wrangler d1 migrations apply DB --remote --env production
```

Do not use Worker deploy rollback as database rollback. D1 data/schema rollback needs separate reviewed SQL/data recovery plan. For table rebuilds or foreign-key-sensitive migrations, evaluate `PRAGMA defer_foreign_keys = true` or equivalent D1-safe migration ordering during generated SQL review.

## Non-TTY Migration Workflow

Local investigation on 2026-05-22 showed `drizzle-kit generate` has no `--yes` or `--force` flag in pinned `drizzle-kit@0.31.10`. Because migration metadata is behind manual migrations `0015` through `0022`, do not rely on `npm run db:generate` until the journal drift is intentionally reconciled. Use `npm run db:migration:manual -- <name>` to create a numbered manual SQL migration, review SQL directly, then apply with Wrangler. Wrangler `d1 migrations apply` documents that confirmation is skipped in CI/non-interactive shells while still capturing a backup.

## Story 1.8 Migration Evidence

| Timestamp | Command | Target | Migration | SQL review | Remote development evidence |
| --- | --- | --- | --- | --- | --- |
| 2026-05-13 | `npm run db:generate` | Local Drizzle generation for development D1 schema | `migrations/0011_sticky_avengers.sql` | Adds `email_verification_tokens`, four token indexes, `customers.display_name`, and `customers.email_marketing_opt_in`; no unrelated table rebuild generated. | Not applied remotely during implementation. Remote apply remains pending with `npm run db:migrate:remote` against `jrw-database-development` / `beabfd98-8611-4d58-8f1b-7a972b8af1ed`. |

## Story 1.9 Migration Evidence

| Timestamp | Command | Target | Migration | SQL review | Remote development evidence |
| --- | --- | --- | --- | --- | --- |
| 2026-05-15T08:12+08:00 | `npm run db:generate` | Local Drizzle generation for development D1 schema | `migrations/0012_public_morlocks.sql` | Adds `password_reset_tokens` with polymorphic `actor_kind`/`actor_id`, hashed token column, 30-minute-capable expiry/used timestamps, request/source metadata, unique token hash index, actor lookup index, active actor+expiry partial index, and expiry cleanup index. No unrelated table rebuild generated. Depends on Story 1.8 migration `0011_sticky_avengers.sql`. Reset token ownership is application-verified because the table intentionally has no DB foreign key across both `admins` and `customers`. | Not applied remotely during implementation. Remote apply remains pending with `npm run db:migrate:remote` against `jrw-database-development` / `beabfd98-8611-4d58-8f1b-7a972b8af1ed`; release blocker until development apply evidence is recorded. |

## Story 1.10 Migration Evidence

| Timestamp | Command | Target | Migration | SQL review | Remote development evidence |
| --- | --- | --- | --- | --- | --- |
| 2026-05-15T15:05+08:00 | `npm run db:generate` | Local Drizzle generation for development D1 schema | `migrations/0013_wakeful_crystal.sql` | Adds `oauth_state_tokens` with `provider`, hashed `state_hash`, hashed `nonce_hash`, safe `redirect_path`, expiry/used timestamps, request/source metadata, unique state-hash index, active provider/state/expiry partial index, and expiry cleanup index. Adds `customer_providers_provider_user_idx` composite uniqueness on `(provider, provider_user_id)` plus `customer_providers_customer_idx`. No table rebuilds, raw OAuth state/nonce/code/token columns, or unrelated schema changes generated. Provider metadata scrub policy: store only Google `sub`, normalized email, `email_verified`, and optional display/avatar values used for empty Customer fields; never store access tokens, refresh tokens, ID tokens, auth codes, raw state/nonce, raw JWT, locale, or raw provider payload. | Not applied remotely during implementation. Remote apply remains pending with `npm run db:migrate:remote` against `jrw-database-development` / `beabfd98-8611-4d58-8f1b-7a972b8af1ed`; release blocker until development apply evidence is recorded. |

## Story 1.11 Migration Evidence

| Timestamp | Command | Target | Migration | SQL review | Remote development evidence |
| --- | --- | --- | --- | --- | --- |
| 2026-05-16T12:33+08:00 | `npm run db:generate` attempted, blocked by local WSL bridge error `UtilBindVsockAnyPort:307: socket failed 1`; migration written manually to match Drizzle schema delta. | Local Drizzle generation/manual SQL for development D1 schema | `migrations/0014_admin_lifecycle_reasons.sql` | Adds nullable `admins.suspension_reason` and `admins.rejection_reason` only. No table rebuilds, no owner invariant changes, no role columns, no token/session/provider fields, and no destructive data conversion. Columns support Story 1.11 audit-visible lifecycle reason capture while preserving existing `status`, `email_verified_at`, `approved_at`, and `admins_single_owner_idx`. | Not applied remotely during implementation. Remote apply remains pending with `npm run db:migrate:remote` against `jrw-database-development` / `beabfd98-8611-4d58-8f1b-7a972b8af1ed`; release blocker until development apply evidence is recorded. |

## Epic 2 Post-Retro Product Brand FK Evidence

| Timestamp | Command | Target | Migration | SQL review | Remote development evidence |
| --- | --- | --- | --- | --- | --- |
| 2026-05-19T07:50+08:00 | Manual SQL written after schema update; remote state verified on 2026-05-22. | Development D1 schema | `migrations/0015_funny_outlaw.sql` and `migrations/0016_products_brand_id_fk.sql` | `0015` adds brand and brand membership tables; `0016` adds nullable `products.brand_id` FK, backfills from legacy `products.brand`, and creates `idx_products_brand_id`. | Verified by `npm run db:migrate:remote` on `jrw-database-development` / `beabfd98-8611-4d58-8f1b-7a972b8af1ed`: Wrangler listed only `0022_price_centavos_integer.sql` as pending, so `0015` and `0016` were already applied remotely. |

## Epic 3 Post-Retro Money Migration Evidence

| Timestamp | Command | Target | Migration | SQL review | Remote development evidence |
| --- | --- | --- | --- | --- | --- |
| 2026-05-22T14:45+08:00 | `npm run db:migrate:remote` | Remote development D1 `jrw-database-development` / `beabfd98-8611-4d58-8f1b-7a972b8af1ed` | `migrations/0022_price_centavos_integer.sql` | Rebuilds `product_variants` and `order_snapshots` so `product_variants.price` and `order_snapshots.price_at_purchase` use integer centavos. Backfill rounds existing values because Stories 3.4 and 3.8 already write centavos into those columns. Preserves SKU unique index and snapshot indexes/signature unique index. | User-supplied Wrangler output: resource location remote; one migration pending (`0022_price_centavos_integer.sql`); user confirmed prompt; executed 15 commands in 5.18ms; status `✅`. |

## Table And Schema Group Plan

| Current/proposed table or group | Current state | Owning story | Purpose | Main relationships | Migration timing | Destructive-change risk | Remote development evidence policy | Production gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `admins` | Exists with `email`, `password_hash`, `is_owner`, `status`, `email_verified_at`, `approved_at`, nullable lifecycle reasons, timestamps, and `admins_single_owner_idx` unique partial expression index over rows where `is_owner <> 0`. | Stories 1.6, 1.11, 1.13 | Super Admin/Admin identity, approval, suspension, ownership transfer. | Audit logs, future sessions, ownership transfer records. | Epic 1. | Medium: unique owner invariant and owner credential seed changes. | Record seed/migration command, target D1, migration/seed output, owner count before migration/seed, and owner invariant verification. Story 1.6 generated `migrations/0007_stormy_nighthawk.sql` and review correction `migrations/0008_boring_yellowjacket.sql`; Story 1.11 adds `migrations/0014_admin_lifecycle_reasons.sql`; remote apply not performed during implementation. | Review unique Super Admin plan, credential handling, duplicate-owner remediation, and rollback path. |
| Admin sessions/tokens | Missing. | Story 1.7 | HttpOnly admin sessions and authentication state. | `admins`, audit, request context. | Epic 1 before admin-protected workflows. | Medium: token invalidation and session retention. | Record generated migration, auth/session tests, target D1, and success output. | Security review for cookie flags, token hashing, expiration, and revocation. |
| `customers` | Exists with email, nullable password hash, avatar, profile/address fields. | Stories 1.8, 1.10 | Customer identity, profile, delivery/contact data. | `customer_providers`, sessions/tokens, orders, reviews. | Epic 1. | Medium: PII retention and nullable auth fields. | Record migration command, target D1, migration file, profile/privacy checks, and success output. | Privacy notice and retention owner review before production launch. |
| `customer_providers` | Exists with provider, provider user id, JSON metadata, legacy unique `provider_user_id`, and Story 1.10 composite unique `(provider, provider_user_id)`. | Story 1.10 | OAuth provider identity link. | `customers`. | Epic 1. | Medium: raw provider metadata retention and uniqueness. Legacy `provider_user_id` uniqueness remains stricter than future multi-provider ideal but avoids table rebuild risk for Google-only MVP. | Record migration command, target D1, metadata scrub policy, and OAuth link tests. Story 1.10 generated `migrations/0013_wakeful_crystal.sql`; remote development apply remains pending. | Review safe provider metadata, verified-email auto-link rules, and deletion behavior. |
| Verification/reset/OAuth state tables | `email_verification_tokens`, `password_reset_tokens`, and `oauth_state_tokens` exist. Password reset uses polymorphic `actor_kind`/`actor_id` with repository actor existence checks instead of DB foreign keys. OAuth state stores only hashed state/nonce and single-use expiry metadata. | Stories 1.8, 1.9, 1.10 | Email verification, password reset, and OAuth state/nonce tracking. | Customers, Admins, email provider, OAuth provider. | Epic 1. | Medium: token replay, expiry, and PII. | Record migration command, token hashing/expiry test evidence, target D1. Stories 1.9 and 1.10 generated `migrations/0012_public_morlocks.sql` and `migrations/0013_wakeful_crystal.sql`; remote development apply remains pending. | Security review for token hashing, TTL, single-use behavior. |
| Brand tables | Exist in manual migration `0015_funny_outlaw.sql`; remote development apply verified by 2026-05-22 Wrangler pending list. | Stories 2.1-2.5 | Brand catalog groups and collaboration membership. | Admins, products, future brand membership history. | Epic 2. | Medium: product ownership refactor from plain text brand. | Remote development evidence recorded; production still review-gated. | Confirm brand is not tenant/store/merchant; review membership access scope. |
| `categories` | Exists with `name` and legacy `type`. | Story 3.1 | Product category taxonomy. | `product_categories`, products. | Epic 3. | Low to medium: legacy `type` may not match final taxonomy. | Record generated SQL, target D1, category seed/backfill output if any. | Review final category model and storefront filter needs. |
| `product_categories` | Exists join table. | Story 3.3 | Product-category many-to-many assignment. | `products`, `categories`. | Epic 3. | Low if shape remains. | Record migration command and relation tests when altered. | Review cascade behavior and category deletion rules. |
| `products` | Exists with legacy `brand` text plus nullable `brand_id` FK in post-retro schema/migration; remote development apply verified by 2026-05-22 Wrangler pending list. | Stories 3.2-3.8, 2.1-2.6 | Product identity, publish state, brand/category assignment. | Product photos, variants, categories, brands, order snapshots. | Epic 3 after brand model baseline. | High: brand text to brand relationship, publish/archive fields, product snapshot compatibility. | Remote development evidence recorded; production still review-gated. | Review brand relationship backfill and published product compatibility. |
| `product_photos` | Exists with `image_id`, product relation; migration `0006` dropped `image_link`. | Stories 3.5, 3.8 | Product asset references and historical image references. | Products, product variants, order snapshots/R2. | Epic 3. | Medium: asset reference stability and R2 coupling. | Record migration command, R2 reference policy, target D1, and sample product image smoke check. | Review historical snapshot preservation and R2 rollback notes. |
| `product_variants` | Local and remote development schema use integer centavos for `price` after `0022_price_centavos_integer.sql`. | Stories 3.4, 3.6, 5.2, 5.6 | Variant pricing, stock, availability, image variant mapping. | Products, photos, inventory/reservations, orders. | Epic 3 before checkout; inventory extensions in Epic 5. | High: stock reservation must avoid oversell. | Remote development evidence recorded; production still review-gated. | Review money conversion, concurrent checkout evidence, and rollback strategy. |
| Inventory/reservation tables | Missing except variant stock fields. | Stories 3.6, 5.2, 5.6 | Stock movements, reservations, release/reconciliation. | Product variants, checkout attempts, orders, payments. | Epics 3 and 5. | High: concurrency and stock correctness. | Record generated SQL, target D1, Durable Object/optimistic concurrency test evidence. | Require checkout concurrency review before real payments. |
| Checkout/cart tables | Missing. | Stories 4.4, 5.1, 5.2 | Cart/checkout attempt, contact/delivery validation, reservation state. | Customers, variants, inventory, payments. | Epics 4 and 5. | Medium to high: PII and reservation lifecycle. | Record migration command, target D1, validation/reservation test evidence. | Review checkout data retention, privacy notice, and release behavior. |
| Payment tables | Missing. | Stories 5.3-5.5 | PayMongo payment handoff, reconciliation, provider IDs, payment state. | Orders, checkout attempts, webhook events, inventory. | Epic 5. | High: payment state and provider metadata. | Record generated SQL, target D1, idempotency/signature tests, and sanitized metadata policy. | Payment launch gate: signature, idempotency, observability, privacy review. |
| Webhook idempotency tables | Missing. | Stories 5.4, 5.5 | Store webhook event identity and processing result. | Payments, orders, inventory, audit. | Epic 5 before provider webhooks. | High: duplicate event side effects. | Record migration command, target D1, duplicate webhook test evidence. | Review idempotency keys, retry behavior, and safe raw payload handling. |
| `orders` | Exists with combined `status`, `status_description`, shipping type, `real` total. | Stories 5.5, 6.1-6.3 | Order header and status lanes. | Customers, snapshots, payments, returns/refunds, audit. | Epics 5 and 6. | High: combined status must split into payment and fulfillment state; money to centavos. | Record migration command, target D1, state backfill mapping, count checks, and success output. | Review state transition map, customer-visible status, and rollback plan. |
| `order_snapshots` | Local and remote development schema use `price_centavos` and integer legacy `price_at_purchase` after `0022_price_centavos_integer.sql`. | Stories 3.8, 5.5, 6.1-6.3 | Historical purchased product snapshot. | Orders, products, variants/assets. | Epics 3, 5, and 6. | Medium: image reference preservation and production conversion review. | Remote development evidence recorded; production still review-gated. | Review snapshot immutability and historical display behavior. |
| `reviews` | Exists with customer, product, order, rating, comment. | Future post-MVP or catalog/customer story if retained. | Product reviews. | Customers, products, orders. | Not in current MVP feature path unless PRD adds review flow. | Low to medium: moderation/privacy scope unresolved. | Record migration only if changed; document owner if activated. | Review product review scope before production exposure. |
| Return/refund tables | Missing. | Stories 6.4-6.6 | Manual return/refund history. | Orders, admins, audit, payment references. | Epic 6. | Medium: financial records and manual-only provider boundary. | Record migration command, target D1, manual refund/return tests. | Confirm no automated PayMongo refund execution unless later approved. |
| `audit_logs` / audit events | Exists minimal with nullable `admin_id`, action, entity, entity id, JSON details. | Stories 7.1-7.2 | Sensitive action audit and activity history. | Admin actor, target resources, request ID. | Epic 7, with early hooks from Epic 1. | Medium: safe metadata and access scope. | Record migration command, target D1, scrubbed metadata test evidence. | Review audit access scope and PII/secrets scrub policy. |
| Operational log/event tables | Missing; current logging is runtime structured output. | Stories 7.3-7.5 if persistent operational events are added. | Request/error/event traceability if required beyond platform logs. | Request context, actors, target resources. | Epic 7 or observability expansion. | Medium: log retention and PII. | Record migration command, target D1, scrub tests, retention owner. | Review retention, access scope, and environment gating. |
| Support/contact records | Missing. | Future support story. | Customer support contact and admin follow-up. | Customers, orders, audit. | Post-baseline when feature is approved. | Medium: PII and retention. | Record migration command, target D1, privacy notice update evidence. | Review retention owner and access scope. |

## Current Drift To Preserve As Known Debt

- Money fields still use SQLite `real` in `orders.total_amount`. Local and remote development schemas now use integer centavos for variant and snapshot price columns.
- Product brand now has nullable `products.brand_id` FK in local schema/migration, while legacy `products.brand` text remains as fallback until remote migration/backfill evidence is recorded. Future product stories should write `brand_id` first and keep brand language as catalog group only.
- Orders currently use a combined `status`; future checkout/order stories must split payment state from fulfillment/order state.
- Reservation, payment, webhook, return/refund, and audit activity structures are missing or minimal; session, verification, reset, and OAuth state structures now exist but still require remote development migration evidence before release.
- Existing migrations include table rebuilds with `PRAGMA foreign_keys=OFF`; future D1 migration review must verify D1-safe foreign key behavior and wrong-target prevention.

## Production Launch Blockers

- Any production D1 migration without explicit human review.
- Any payment-related migration without webhook signature, idempotency, observability, and rollback/reconciliation evidence.
- Any customer PII migration without privacy notice, retention owner, access scope, and deletion/review notes.
- Any destructive or data-converting migration without development remote evidence and before/after count or sample verification.
