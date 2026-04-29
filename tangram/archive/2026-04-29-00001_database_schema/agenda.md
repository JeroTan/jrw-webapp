# Agenda: Database Schema Foundation (D1/Drizzle Rework)

**Feature ID:** 00001
**Title:** Initial Database Schema & Migrations
**Status:** Requirements Validation

---

## 1. Completeness
- [x] Does the schema include separate tables for `admins` (Governance) and `customers` (Operations) to prevent role leakage?
- [x] Does the `admins` table include a immutable `is_owner` flag for Super-Admin seeding?
- [x] Does the `products` schema support multi-variants, many-to-many categories, and associated photo galleries?
- [x] Is the `reviews` schema linked to both `customers` and `orders` to ensure only verified buyers can leave feedback?
- [x] Does the `orders` or `order_items` schema include a dedicated `order_snapshots` or fields for "Minimum Meta" replication (Price, Name, Variant) at the time of purchase?
- [x] Is the migration configured to use `wrangler d1 migrations` for Cloudflare D1 synchronization?

## 2. Clarity
- [x] Are the many-to-many relationships (e.g., `product_categories` junction table) clearly structured to allow a product to have multiple styles (e.g., Anime, Summer)?
- [x] Is the `categories` table's `type` field clearly defined to distinguish between Clothing Types, Styles, and Seasons?
- [x] Are the foreign key constraints set to `SET NULL` on delete for product references in transaction history to ensure history preservation?
- [x] Are the D1 bindings correctly mapped in `wrangler.jsonc` as per Cloudflare standards?
- [x] Are the Enums and Statuses clearly defined in `src/types/**` to compensate for SQLite's lack of native Enum support?

## 3. Edge Cases
- [x] Does the `product_variants` schema distinguish between "Immediate Stock" (number) and "Pre-order" (boolean) states?
- [x] How does the schema track the `Pre-order` release date? Is there a field for "Expected Release"?
- [x] Are the constraints defined to prevent an order from being placed if `stock <= 0` AND `is_preorder == false`?
- [x] Does the requirements define how to handle D1's "Eventually Consistent" reads if we are not using the Session consistency?

## 4. Non-Functional (Security & Integrity)
- [x] Does the backend/service layer explicitly enforce access control to compensate for the lack of D1 native RLS?
- [x] Does the schema support the Durable Object sync via a `last_synced_at` or `stock_lock_version` column to ensure eventual consistency with D1?
- [x] **Verification**: Successful **Remote-Only** schema migration using `wrangler d1` against the provided database IDs.
