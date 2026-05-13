# Story 1.4 D1 Migration Plan Baseline

Status: baseline
Owner: Story 1.4
Last updated: 2026-05-13

## Purpose

This baseline records current D1/Drizzle state, future schema ownership, migration timing, and evidence required before database changes reach production.

D1 plus Drizzle remains relational source of truth. Drizzle schema source stays in `src/domain/schema/*.ts`; migration output stays in `migrations/`.

## Current Inventory

| Area | Current source | Notes |
| --- | --- | --- |
| Schema files | `src/domain/schema/identity.ts`, `src/domain/schema/catalog.ts`, `src/domain/schema/transactions.ts`, `src/domain/schema/audit.ts` | Current brownfield schema, not final PRD model. |
| Migration files | `migrations/0000_classy_menace.sql` through `migrations/0011_sticky_avengers.sql` | Twelve migration entries tracked. Story 1.8 adds customer profile fields and email verification tokens. |
| Migration journal | `migrations/meta/_journal.json` | Version `7`, dialect `sqlite`, entries idx `0` through `11`. |
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

## Story 1.8 Migration Evidence

| Timestamp | Command | Target | Migration | SQL review | Remote development evidence |
| --- | --- | --- | --- | --- | --- |
| 2026-05-13 | `npm run db:generate` | Local Drizzle generation for development D1 schema | `migrations/0011_sticky_avengers.sql` | Adds `email_verification_tokens`, four token indexes, `customers.display_name`, and `customers.email_marketing_opt_in`; no unrelated table rebuild generated. | Not applied remotely during implementation. Remote apply remains pending with `npm run db:migrate:remote` against `jrw-database-development` / `beabfd98-8611-4d58-8f1b-7a972b8af1ed`. |

## Table And Schema Group Plan

| Current/proposed table or group | Current state | Owning story | Purpose | Main relationships | Migration timing | Destructive-change risk | Remote development evidence policy | Production gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `admins` | Exists with `email`, `password_hash`, `is_owner`, timestamps, and `admins_single_owner_idx` unique partial expression index over rows where `is_owner <> 0`. | Stories 1.6, 1.11, 1.13 | Super Admin/Admin identity, approval, suspension, ownership transfer. | Audit logs, future sessions, ownership transfer records. | Epic 1. | Medium: unique owner invariant and owner credential seed changes. | Record seed/migration command, target D1, migration/seed output, owner count before migration/seed, and owner invariant verification. Story 1.6 generated `migrations/0007_stormy_nighthawk.sql` and review correction `migrations/0008_boring_yellowjacket.sql`; remote apply not performed during implementation. | Review unique Super Admin plan, credential handling, duplicate-owner remediation, and rollback path. |
| Admin sessions/tokens | Missing. | Story 1.7 | HttpOnly admin sessions and authentication state. | `admins`, audit, request context. | Epic 1 before admin-protected workflows. | Medium: token invalidation and session retention. | Record generated migration, auth/session tests, target D1, and success output. | Security review for cookie flags, token hashing, expiration, and revocation. |
| `customers` | Exists with email, nullable password hash, avatar, profile/address fields. | Stories 1.8, 1.10 | Customer identity, profile, delivery/contact data. | `customer_providers`, sessions/tokens, orders, reviews. | Epic 1. | Medium: PII retention and nullable auth fields. | Record migration command, target D1, migration file, profile/privacy checks, and success output. | Privacy notice and retention owner review before production launch. |
| `customer_providers` | Exists with provider, provider user id, JSON metadata. | Story 1.10 | OAuth provider identity link. | `customers`. | Epic 1. | Medium: raw provider metadata retention and uniqueness. | Record migration command, target D1, metadata scrub policy, and OAuth link tests. | Review safe provider metadata, verified-email auto-link rules, and deletion behavior. |
| Verification/reset/OAuth state tables | Missing. | Stories 1.8, 1.9, 1.10 | Email verification, password reset, and OAuth state/nonce tracking. | Customers, email provider, OAuth provider. | Epic 1. | Medium: token replay, expiry, and PII. | Record migration command, token hashing/expiry test evidence, target D1. | Security review for token hashing, TTL, single-use behavior. |
| Brand tables | Missing. | Stories 2.1-2.5 | Brand catalog groups and collaboration membership. | Admins, products, future brand membership history. | Epic 2. | Medium: product ownership refactor from plain text brand. | Record migration command, target D1, backfill strategy from `products.brand`, and success output. | Confirm brand is not tenant/store/merchant; review membership access scope. |
| `categories` | Exists with `name` and legacy `type`. | Story 3.1 | Product category taxonomy. | `product_categories`, products. | Epic 3. | Low to medium: legacy `type` may not match final taxonomy. | Record generated SQL, target D1, category seed/backfill output if any. | Review final category model and storefront filter needs. |
| `product_categories` | Exists join table. | Story 3.3 | Product-category many-to-many assignment. | `products`, `categories`. | Epic 3. | Low if shape remains. | Record migration command and relation tests when altered. | Review cascade behavior and category deletion rules. |
| `products` | Exists with `brand` text, JSON tags, description, timestamps. | Stories 3.2-3.8, 2.1-2.6 | Product identity, publish state, brand/category assignment. | Product photos, variants, categories, brands, order snapshots. | Epic 3 after brand model baseline. | High: brand text to brand relationship, publish/archive fields, product snapshot compatibility. | Record generated SQL, backfill command, target D1, count checks before/after, and success output. | Review brand relationship backfill and published product compatibility. |
| `product_photos` | Exists with `image_id`, product relation; migration `0006` dropped `image_link`. | Stories 3.5, 3.8 | Product asset references and historical image references. | Products, product variants, order snapshots/R2. | Epic 3. | Medium: asset reference stability and R2 coupling. | Record migration command, R2 reference policy, target D1, and sample product image smoke check. | Review historical snapshot preservation and R2 rollback notes. |
| `product_variants` | Exists with `real` price, stock, SKU, preorder fields, image reference, variation chain, lock version. | Stories 3.4, 3.6, 5.2, 5.6 | Variant pricing, stock, availability, image variant mapping. | Products, photos, inventory/reservations, orders. | Epic 3 before checkout; inventory extensions in Epic 5. | High: money must move from `real` to integer centavos; stock reservation must avoid oversell. | Record migration command, centavos backfill evidence, target D1, inventory tests, and success output. | Review money conversion, concurrent checkout evidence, and rollback strategy. |
| Inventory/reservation tables | Missing except variant stock fields. | Stories 3.6, 5.2, 5.6 | Stock movements, reservations, release/reconciliation. | Product variants, checkout attempts, orders, payments. | Epics 3 and 5. | High: concurrency and stock correctness. | Record generated SQL, target D1, Durable Object/optimistic concurrency test evidence. | Require checkout concurrency review before real payments. |
| Checkout/cart tables | Missing. | Stories 4.4, 5.1, 5.2 | Cart/checkout attempt, contact/delivery validation, reservation state. | Customers, variants, inventory, payments. | Epics 4 and 5. | Medium to high: PII and reservation lifecycle. | Record migration command, target D1, validation/reservation test evidence. | Review checkout data retention, privacy notice, and release behavior. |
| Payment tables | Missing. | Stories 5.3-5.5 | PayMongo payment handoff, reconciliation, provider IDs, payment state. | Orders, checkout attempts, webhook events, inventory. | Epic 5. | High: payment state and provider metadata. | Record generated SQL, target D1, idempotency/signature tests, and sanitized metadata policy. | Payment launch gate: signature, idempotency, observability, privacy review. |
| Webhook idempotency tables | Missing. | Stories 5.4, 5.5 | Store webhook event identity and processing result. | Payments, orders, inventory, audit. | Epic 5 before provider webhooks. | High: duplicate event side effects. | Record migration command, target D1, duplicate webhook test evidence. | Review idempotency keys, retry behavior, and safe raw payload handling. |
| `orders` | Exists with combined `status`, `status_description`, shipping type, `real` total. | Stories 5.5, 6.1-6.3 | Order header and status lanes. | Customers, snapshots, payments, returns/refunds, audit. | Epics 5 and 6. | High: combined status must split into payment and fulfillment state; money to centavos. | Record migration command, target D1, state backfill mapping, count checks, and success output. | Review state transition map, customer-visible status, and rollback plan. |
| `order_snapshots` | Exists with product/variant names, `real` price, quantity. | Stories 3.8, 5.5, 6.1-6.3 | Historical purchased product snapshot. | Orders, products, variants/assets. | Epics 3, 5, and 6. | Medium: price conversion and image reference preservation. | Record migration command, target D1, sample snapshot preservation checks. | Review snapshot immutability and historical display behavior. |
| `reviews` | Exists with customer, product, order, rating, comment. | Future post-MVP or catalog/customer story if retained. | Product reviews. | Customers, products, orders. | Not in current MVP feature path unless PRD adds review flow. | Low to medium: moderation/privacy scope unresolved. | Record migration only if changed; document owner if activated. | Review product review scope before production exposure. |
| Return/refund tables | Missing. | Stories 6.4-6.6 | Manual return/refund history. | Orders, admins, audit, payment references. | Epic 6. | Medium: financial records and manual-only provider boundary. | Record migration command, target D1, manual refund/return tests. | Confirm no automated PayMongo refund execution unless later approved. |
| `audit_logs` / audit events | Exists minimal with nullable `admin_id`, action, entity, entity id, JSON details. | Stories 7.1-7.2 | Sensitive action audit and activity history. | Admin actor, target resources, request ID. | Epic 7, with early hooks from Epic 1. | Medium: safe metadata and access scope. | Record migration command, target D1, scrubbed metadata test evidence. | Review audit access scope and PII/secrets scrub policy. |
| Operational log/event tables | Missing; current logging is runtime structured output. | Stories 7.3-7.5 if persistent operational events are added. | Request/error/event traceability if required beyond platform logs. | Request context, actors, target resources. | Epic 7 or observability expansion. | Medium: log retention and PII. | Record migration command, target D1, scrub tests, retention owner. | Review retention, access scope, and environment gating. |
| Support/contact records | Missing. | Future support story. | Customer support contact and admin follow-up. | Customers, orders, audit. | Post-baseline when feature is approved. | Medium: PII and retention. | Record migration command, target D1, privacy notice update evidence. | Review retention owner and access scope. |

## Current Drift To Preserve As Known Debt

- Money fields currently use SQLite `real` in `product_variants.price`, `orders.total_amount`, and `order_snapshots.price_at_purchase`. Future stories must migrate API/domain/provider boundaries to integer centavos.
- Product brand currently uses plain `products.brand` text. Future brand stories must migrate to brand relationship and membership-aware product access without treating brands as stores, tenants, merchants, sellers, or PayMongo accounts.
- Orders currently use a combined `status`; future checkout/order stories must split payment state from fulfillment/order state.
- Reservation, payment, webhook, return/refund, audit activity, session, verification, and reset structures are missing or minimal.
- Existing migrations include table rebuilds with `PRAGMA foreign_keys=OFF`; future D1 migration review must verify D1-safe foreign key behavior and wrong-target prevention.

## Production Launch Blockers

- Any production D1 migration without explicit human review.
- Any payment-related migration without webhook signature, idempotency, observability, and rollback/reconciliation evidence.
- Any customer PII migration without privacy notice, retention owner, access scope, and deletion/review notes.
- Any destructive or data-converting migration without development remote evidence and before/after count or sample verification.
