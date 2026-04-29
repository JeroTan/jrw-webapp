# Technical Roadmap: Database Schema Foundation

**Feature ID:** 00001
**Title:** Initial Database Schema & Migrations

---

## I. Architectural Alignment
- **Design Pillar (Stack)**: Implementation of **Drizzle ORM** for native **Cloudflare D1** integration.
- **Design Pillar (Architecture)**: DDD-aligned structure. Schemas reside in `src/domain/schema/`; infrastructure clients in `src/adapter/infrastructure/db/`.
- **Design Pillar (Security)**: Application-layer role enforcement to compensate for SQLite's lack of native RLS.
- **Project Constitution**: All database identifiers (tables, columns) MUST use `snake_case` and plural table names (e.g., `admins`, `products`).

## II. Data Model & Schema Changes
- **Identity Domain**: 
  - `admins`: `id` (cuid), `email`, `password_hash`, `is_owner` (int/boolean).
  - `customers`: `id` (cuid), `email`, `first_name`, `last_name`, PII fields (for encryption).
- **Catalog Domain**: 
  - `products`: `id`, `name`, `brand`, `description` (text).
  - `product_variants`: `id`, `sku` (unique), `price`, `stock`, `is_preorder`, `stock_lock_version`.
  - `categories`: `id`, `name`, `type` (text-based enum).
  - `product_photos`: `id`, `image_link`.
- **Transaction Domain**:
  - `orders`: `id`, `customer_id`, `status` (text-based enum), `total_amount`.
  - `order_snapshots`: `id`, `order_id`, `product_id` (SET NULL), `product_name`, `variant_name`, `price_at_purchase`.
- **Audit Domain**:
  - `audit_logs`: `id`, `admin_id`, `action`, `details` (json).

## III. Atomic Task List

### 1. Database & ORM Initialization
- [x] **Install Drizzle Dependencies**
  > **Detailed Summary:** Install `drizzle-orm` and `@libsql/client` (or native D1 types). Install `drizzle-kit` as a dev dependency.
- [x] **Configure Drizzle Kit**
  > **Detailed Summary:** Create `drizzle.config.ts` in the root. Configure it to look at `src/domain/schema/*.ts` and output to `migrations/`. Set the driver to `d1-http` or `cloudflare` for remote sync.
- [x] **Initialize Database Client**
  > **Detailed Summary:** Create `src/adapter/infrastructure/db/client.ts`. Export a function `getDb(env: Env)` that initializes `drizzle(env.DB)`.

### 2. Domain Schema Definitions
- [x] **Define Identity Schemas**
  > **Detailed Summary:** Create `src/domain/schema/identity.ts`. Define `admins` and `customers` tables. Include relations where a customer can have many orders.
- [x] **Define Catalog Schemas**
  > **Detailed Summary:** Create `src/domain/schema/catalog.ts`. Define `products`, `product_variants`, `categories`, and `product_photos`. Implement the `product_categories` junction table.
- [x] **Define Transactional Schemas**
  > **Detailed Summary:** Create `src/domain/schema/transactions.ts`. Define `orders`, `order_snapshots`, and `reviews`. Ensure `order_snapshots.product_id` is an optional foreign key with `onDelete: 'set null'`.
- [x] **Define Audit Schema**
  > **Detailed Summary:** Create `src/domain/schema/audit.ts`. Define `audit_logs` with a JSON column for flexible metadata.

### 3. Deployment & Validation
- [x] **Generate & Apply Migrations**
  > **Detailed Summary:** Run `npx drizzle-kit generate` to create SQL migration files. Run `npx wrangler d1 migrations apply jrw-database-development --remote` to sync with the development database.
- [x] **Implement & Execute Seed**
  > **Detailed Summary:** Create `src/adapter/infrastructure/db/seed.ts`. Write logic to upsert the Super-Admin using `SEED_ADMIN_EMAIL`. Run via `npx wrangler d1 execute jrw-database-development --remote --file=...` or a custom script.

## IV. Critical Path & Dependencies
1. **Drizzle Config**: Must be correctly mapped to `src/domain/schema/` before generation.
2. **Identity Schemas**: Blocker for all other schemas that require foreign keys (Admins, Customers).
3. **Migration Generation**: Must be done sequentially to capture all changes accurately.

## V. Verification & Testing Mechanism (MANDATORY)

| Requirement | Verification Method | Pass Criteria |
| :--- | :--- | :--- |
| **Role Isolation** | `wrangler d1 execute` | SQL query confirms `admins` and `customers` are separate tables with correct columns. |
| **Receipt Rule** | Manual SQL Test | Deleting a product results in `order_snapshots.product_id` becoming NULL while `product_name` remains. |
| **Remote Sync** | D1 Dashboard Check | Tables are visible and structured correctly in the Cloudflare D1 dashboard. |
| **Seeding** | Manual Check | Super-Admin record exists in the `admins` table with `is_owner: 1`. |
| **Type Integrity** | `tsc --noEmit` | Drizzle schemas generate valid TypeScript types without errors. |
