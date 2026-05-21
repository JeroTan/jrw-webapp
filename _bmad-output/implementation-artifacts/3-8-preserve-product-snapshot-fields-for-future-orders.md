# Story 3.8: Preserve Product Snapshot Fields for Future Orders

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As JRW,
I want product and variant snapshot fields prepared for order creation,
So that future orders preserve purchased product name, variant, price, quantity, and image reference even after catalog changes.

## Acceptance Criteria

1. Given product, variant, price, and image records exist, when snapshot payload is built for a future order line, then snapshot contains product name, variant label/options, price centavos, quantity, and stable image reference and payload uses current catalog data at purchase-time boundary.
2. Given product name, variant, price, or image changes after snapshot payload is created, when snapshot is read, then stored snapshot values remain unchanged and current catalog changes do not mutate historical order data.
3. Given product image is removed from current catalog after snapshot, when snapshot image reference is read, then stable image reference remains resolvable or fallback behavior is documented and order history is not broken.
4. Given product or variant is archived after snapshot, when snapshot is read, then historical snapshot remains readable and archived catalog state does not hide purchased item details.
5. Given checkout/order implementation comes later, when this story completes, then snapshot builder/types/schema are available for future order story and this story does not create full order/checkout flow.
6. Given implementation finishes, when tests run, then tests cover snapshot payload creation, catalog mutation after snapshot, image reference preservation, archived product readability, and centavos price preservation and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Confirm scope and current baseline. (AC: 1-6)
  - [x] Verify Epic 3 is `in-progress` and Stories 3.0-3.7 are `done`; do not reopen.
  - [x] Confirm this story is the eighth Epic 3 backlog item after Story 3.7.
  - [x] Confirm existing `order_snapshots` table in `src/domain/schema/transactions.ts` â€” current fields include `id`, `order_id`, `product_id`, `product_name`, `variant_name`, `price_at_purchase`, `quantity`.
  - [x] Confirm existing `products` table in `src/domain/schema/catalog.ts` with `name`, `slug`, `brand_id`, `status`, timestamps.
  - [x] Confirm existing `product_variants` table with `sku`, `price`, `variation_chain`, `image_reference_id`, `inventory_state`, `stock`.
  - [x] Confirm existing `product_photos` table with `r2_key`, `image_id`, `sort_order`, `is_primary`.
  - [x] Confirm existing `ProductRepository`, `ProductService`, `ProductController`, and product routes from Stories 3.2 and 3.7.
  - [x] Confirm existing `VariantRepository` and variant routes from Story 3.4.
  - [x] Do NOT create full order/checkout flow â€” this story is snapshot builder/types/schema only.

- [x] Task 2: Add snapshot domain types and schemas. (AC: 1-2, 5)
  - [x] Create `OrderSnapshot` domain type in `src/domain/orders/types.ts` (or `src/domain/snapshots/types.ts`).
  - [x] Type must capture: `productId`, `productName`, `productSlug`, `variantId`, `variantLabel`, `variantOptions` (from `variation_chain`), `priceCentavos`, `quantity`, `imageReference` (stable R2 key or image ID), `snapshotTimestamp`.
  - [x] Add Zod schema for snapshot validation in `src/domain/snapshots/schemas.ts`.
  - [x] Add TypeBox schema for API transport in `src/lib/typebox/snapshots.ts`.
  - [x] Use `price_centavos` pattern consistent with Story 3.4 pricing (integer centavos, not float).

- [x] Task 3: Add snapshot builder domain service. (AC: 1-4, 6)
  - [x] Create `SnapshotBuilder` or `OrderSnapshotService` in `src/domain/snapshots/` or `src/domain/orders/`.
  - [x] Builder accepts `productId`, `variantId`, `quantity` and reads current catalog state.
  - [x] Builder captures: product name, product slug, variant label (from `variation_chain` or `name`), variant options array, price in centavos, quantity, primary image reference (from variant's `image_reference_id` or product's primary photo).
  - [x] Builder returns immutable snapshot object â€” once created, never changes.
  - [x] Builder must NOT mutate catalog data â€” read-only operation.
  - [x] Builder must handle archived product/variant gracefully â€” still readable for snapshot.

- [x] Task 4: Add snapshot repository methods. (AC: 1-4)
  - [x] Create `SnapshotRepository` in `src/server/repositories/SnapshotRepository.ts` OR extend existing order snapshot patterns.
  - [x] Add `createSnapshot(snapshot: OrderSnapshot)` method â€” inserts into `order_snapshots` table.
  - [x] Add `getSnapshot(snapshotId: string)` method â€” reads stored snapshot.
  - [x] Add `getSnapshotsByOrderId(orderId: string)` method â€” returns all snapshots for an order.
  - [x] Use D1/Drizzle patterns consistent with existing repositories.
  - [x] Snapshot insert is atomic â€” all fields required, no partial writes.

- [x] Task 5: Extend order_snapshots schema if needed. (AC: 1-3, 5)
  - [x] Review existing `order_snapshots` table in `src/domain/schema/transactions.ts`.
  - [x] Add missing fields if needed: `product_slug`, `variant_id`, `variant_options` (JSON), `image_r2_key`, `snapshot_timestamp`.
  - [x] If schema changes needed, create migration via `npm run db:migrate:remote`.
  - [x] Preserve existing fields: `product_id`, `product_name`, `variant_name`, `price_at_purchase`, `quantity`.
  - [x] Use `price_centavos` (integer) instead of `price_at_purchase` (real) â€” add migration if changing.

- [x] Task 6: Add snapshot API route and controller. (AC: 1-2, 5-6)
  - [x] Create `POST /api/admin/snapshots/build` â€” builds snapshot from product/variant (admin-only for testing/validation).
  - [x] Create `GET /api/admin/snapshots/:snapshotId` â€” reads stored snapshot.
  - [x] Create `SnapshotController` in `src/server/controllers/SnapshotController.ts`.
  - [x] Create `snapshots.routes.ts` in `src/server/routes/snapshots.routes.ts`.
  - [x] All routes require Admin authentication via existing RBAC guards.
  - [x] All routes declare TypeBox contracts, OpenAPI metadata, auth, rate-limit class, and error codes.
  - [x] Register new routes in `src/server/app.ts`.
  - [x] Do NOT expose snapshot build to customer-facing endpoints â€” internal use only.

- [x] Task 7: Add snapshot builder tests. (AC: 1-6)
  - [x] Add domain tests in `src/domain/snapshots/snapshot-builder.test.ts` covering: snapshot creation with valid data, snapshot immutability, archived product readability, archived variant readability, image reference preservation, centavos price accuracy, variant options capture.
  - [x] Add repository tests in `src/server/repositories/SnapshotRepository.test.ts` covering: snapshot insert, snapshot read, snapshots by order, atomic insert validation.
  - [x] Add route tests in `src/server/routes/snapshots.routes.test.ts` covering: build snapshot, read snapshot, unauthorized access, invalid data.
  - [x] Run targeted tests: `npx vitest run src/domain/snapshots src/server/repositories/SnapshotRepository.test.ts src/server/routes/snapshots.routes.test.ts`.
  - [x] Run `npm run check` after typed changes.

- [x] Task 8: Integration with existing patterns. (AC: 1-6)
  - [x] Ensure snapshot builder uses existing `ProductRepository` and `VariantRepository` for data reads.
  - [x] Ensure snapshot builder uses existing image resolution patterns from Story 3.5.
  - [x] Ensure snapshot types are exportable for future Epic 5 (checkout) and Epic 6 (orders) use.
  - [x] Document snapshot builder API for future order story consumption.

### Review Findings

_(To be populated after code review)_

## Dev Notes

### Epic Context

- This is the eighth Epic 3 catalog story after Story 3.7 (publish/archive validation).
- Epic 2 (Brand Collaboration) is complete with brand membership guards established.
- Requirements covered: FR31; supports NFR21, NFR32.
- UX supported: UX-DR8 (Order Receipt), UX-DR21 (Loading/Conflict Patterns), UX-DR26 (Status Labels).
- Business value: Order history must show what the customer actually purchased, not what the product looks like today. Without snapshot preservation, catalog changes (price updates, name changes, image swaps, variant edits) would break historical order records and cause customer support disputes.

### Current Code Intelligence

#### `src/domain/schema/transactions.ts` â€” `order_snapshots` table

- Current state: `order_snapshots` table has `id` (cuid2), `order_id` (FK to `orders`), `product_id` (FK to `products`, nullable), `product_name` (text), `variant_name` (text), `price_at_purchase` (real), `quantity` (integer).
- **Verify**: Current `price_at_purchase` is `real` (float). Story 3.4 uses `price_centavos` (integer) for variants. May need migration to align or document conversion.
- What this story uses: Existing table as baseline, may add fields for `product_slug`, `variant_id`, `variant_options`, `image_r2_key`, `snapshot_timestamp`.
- What this story does NOT change: Does not create `orders` table or full order flow. Does not change checkout logic.
- Preserve: Existing `orders`, `order_snapshots`, `reviews` tables and relationships.

#### `src/domain/schema/catalog.ts` â€” product, variant, image tables

- `products`: `id`, `name`, `slug`, `brand_id`, `status` (`DRAFT`/`PUBLISHED`/`ARCHIVED`), timestamps.
- `product_variants`: `id`, `name`, `sku`, `price` (real), `variation_chain` (JSON), `image_reference_id` (FK to `product_photos`), `inventory_state`, `stock`, `product_id`.
- `product_photos`: `id`, `image_id`, `r2_key`, `sort_order`, `is_primary`, `product_id`.
- What this story uses: Reads product name, slug, variant data, image references for snapshot capture.
- What must be preserved: No changes to catalog schema. Snapshot builder is read-only against catalog.

#### `src/server/repositories/ProductRepository.ts` and `VariantRepository.ts`

- Current state: Have product/variant CRUD methods from Stories 3.2 and 3.4.
- What this story uses: Repository methods to read current product/variant state for snapshot building.
- What must be preserved: Existing method signatures, D1/Drizzle patterns.

### Previous Story Intelligence

- Story 3.7 established product publish/archive lifecycle with readiness validation, state transitions, brand membership guards, and audit event recording. Reuse the same repository/service/controller/route patterns for snapshot API.
- Story 3.7 used targeted tests plus `npm run check`; use the same targeted style.
- Story 3.7 review findings: status mutations needed stale transition guards, readiness counted only active categories, archive confirmation error handling. Apply same principles: validate snapshot data before persistence, handle edge cases (archived items), ensure error handling is clean.
- Story 3.6 established inventory management with stock quantity, inventory state, brand membership guards. Snapshot builder must read variant `inventory_state` but does NOT mutate inventory.
- Story 3.5 established product image upload/management with R2 storage. Snapshot must capture stable `r2_key` reference â€” not just `image_id` â€” so historical orders survive image deletion from catalog.
- Story 3.4 established variant CRUD with centavos pricing, SKU uniqueness, `variation_chain` JSON. Snapshot must capture variant options from `variation_chain` and price in centavos.
- Story 3.2 established product identity CRUD with slug uniqueness. Snapshot must capture `product_slug` for stable reference.

### Git Intelligence

- Recent commits: 3-7 reviewed and implemented (publish/archive), 3-6 inventory management, 3-5 product images, 3-4 variant CRUD, 3-3 product brand/category assignment, 3-2 product identity CRUD.
- Current relevant pattern: code changes are small, typed, and backed by targeted Vitest files.
- Snapshot work should follow the same incremental, tested approach.
- Schema migration may be needed if extending `order_snapshots` table.

### Architecture and UX Guardrails

- Astro owns page routing and SEO shells. React feature modules own interactive surfaces.
- Snapshot builder is domain logic â€” belongs in `src/domain/snapshots/` or `src/domain/orders/`.
- Snapshot repository belongs in `src/server/repositories/`.
- Snapshot API follows Route -> Controller -> Service -> Domain/Repository.
- API JSON uses camelCase; database uses snake_case; controllers/services map rows to DTOs.
- Use `price_centavos` (integer) consistently with Story 3.4 pricing pattern.
- Snapshot is immutable once created â€” treat as append-only record.
- R2 image references must remain stable for historical orders (project-context, NFR32).
- Product/order snapshots must preserve purchased product name, variant, price, quantity, and image reference (project-context, NFR21).
- Do NOT build storefront UI, checkout flows, or order creation â€” snapshot builder/types/schema only.

### Implementation Guidance

#### Snapshot Domain Type

```typescript
interface OrderSnapshot {
  id: string;
  orderId: string; // FK to orders (may be null until order created)
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  variantLabel: string; // e.g., "Small / Blue" from variation_chain
  variantOptions: { name: string; group: string }[]; // from variation_chain JSON
  priceCentavos: number; // integer, consistent with Story 3.4
  quantity: number;
  imageR2Key: string | null; // stable R2 reference, not just image_id
  snapshotTimestamp: string; // ISO timestamp of snapshot creation
}
```

#### Snapshot Builder Logic

1. Accept `productId`, `variantId`, `quantity`.
2. Read product from `ProductRepository`: get `name`, `slug`, `status`.
3. Read variant from `VariantRepository`: get `name`, `sku`, `price`, `variation_chain`, `image_reference_id`.
4. If variant has `image_reference_id`, read photo from `ProductRepository` or `ImageRepository`: get `r2_key`.
5. If variant has no image, fall back to product's primary photo `r2_key`.
6. Build `variantLabel` from `variation_chain` array: join `name` values with " / " separator.
7. Convert `price` to `priceCentavos` (multiply by 100, round to integer).
8. Return immutable `OrderSnapshot` object.

#### Schema Migration (if needed)

If extending `order_snapshots` table:

- Add `product_slug` (text, nullable).
- Add `variant_id` (text, nullable, FK to `product_variants`).
- Add `variant_options` (text, JSON mode, nullable).
- Add `image_r2_key` (text, nullable).
- Add `snapshot_timestamp` (text, not null, default CURRENT_TIMESTAMP).
- Consider: rename `price_at_purchase` to `price_centavos` and change type from `real` to `integer` â€” document decision, may defer to avoid breaking existing data.

#### Snapshot API Endpoints

- `POST /api/admin/snapshots/build` â€” build snapshot from product/variant (body: `{ productId, variantId, quantity }`).
- `GET /api/admin/snapshots/:snapshotId` â€” read stored snapshot.
- `GET /api/admin/orders/:orderId/snapshots` â€” read all snapshots for an order (future use).

All admin routes require Admin authentication and RBAC guards.

#### Snapshot Immutability Guarantee

Once a snapshot is created and stored, it MUST NOT change. This is the core requirement:

- Snapshot builder reads current catalog state at call time.
- Snapshot is serialized and stored immediately.
- No update operations on snapshots â€” only create and read.
- Future catalog changes (product rename, price change, image swap, variant edit) do NOT affect stored snapshots.

#### Image Reference Preservation

- Store `r2_key` (stable R2 object key) in snapshot, not just `image_id`.
- R2 key persists even if image is removed from product catalog (Story 3.5 soft-delete preserves R2 object).
- If image is fully deleted from R2 (unlikely in MVP), document fallback behavior: show placeholder or "Image unavailable" text.
- Do NOT delete R2 objects that are referenced by historical snapshots.

#### Archived Product/Variants Readability

- Snapshot builder must read archived products and variants â€” status check is NOT a blocker.
- Archived product name, variant label, price, and image reference must still be capturable.
- This ensures orders placed before archival still show correct historical data.

### Files Being Modified

#### UPDATE: `src/domain/schema/transactions.ts` â€” extend order_snapshots if needed

- Current state: Has `order_snapshots` with basic fields.
- What this story adds: May add `product_slug`, `variant_id`, `variant_options`, `image_r2_key`, `snapshot_timestamp`.
- What must be preserved: Existing `orders`, `order_snapshots`, `reviews` tables and relationships.

#### NEW: `src/domain/snapshots/types.ts`

- Current state: Does not exist.
- What this story creates: `OrderSnapshot` domain type, `SnapshotBuildInput`, `SnapshotReadResult` types.

#### NEW: `src/domain/snapshots/schemas.ts`

- Current state: Does not exist.
- What this story creates: Zod schema for snapshot validation, TypeBox schema for API transport.

#### NEW: `src/domain/snapshots/snapshot-builder.ts`

- Current state: Does not exist.
- What this story creates: `SnapshotBuilder` domain service â€” reads catalog, builds immutable snapshot.

#### NEW: `src/domain/snapshots/snapshot-builder.test.ts`

- Current state: Does not exist.
- What this story creates: Domain tests for snapshot builder â€” valid data, archived items, image references, centavos pricing, variant options.

#### NEW: `src/server/repositories/SnapshotRepository.ts`

- Current state: Does not exist.
- What this story creates: Repository for snapshot CRUD â€” `createSnapshot`, `getSnapshot`, `getSnapshotsByOrderId`.

#### NEW: `src/server/repositories/SnapshotRepository.test.ts`

- Current state: Does not exist.
- What this story creates: Repository tests for snapshot insert, read, by-order queries.

#### NEW: `src/server/controllers/SnapshotController.ts`

- Current state: Does not exist.
- What this story creates: Controller for snapshot build/read endpoints.

#### NEW: `src/server/routes/snapshots.routes.ts`

- Current state: Does not exist.
- What this story creates: Elysia routes for snapshot build, read, by-order.

#### NEW: `src/server/routes/snapshots.routes.test.ts`

- Current state: Does not exist.
- What this story creates: Route tests for snapshot endpoints, auth, validation.

#### UPDATE: `src/server/app.ts` â€” register snapshot routes

- Current state: Composes Elysia app with product, variant, image, inventory, publish routes.
- What this story changes: Registers snapshot routes.
- What must be preserved: Existing route composition, middleware, OpenAPI setup.

#### UPDATE: `src/lib/typebox/snapshots.ts`

- Current state: May not exist.
- What this story creates: TypeBox schemas for snapshot API contracts.

### Project Structure Notes

- Expected new files:
  - `src/domain/snapshots/types.ts` (NEW)
  - `src/domain/snapshots/schemas.ts` (NEW)
  - `src/domain/snapshots/snapshot-builder.ts` (NEW)
  - `src/domain/snapshots/snapshot-builder.test.ts` (NEW)
  - `src/server/repositories/SnapshotRepository.ts` (NEW)
  - `src/server/repositories/SnapshotRepository.test.ts` (NEW)
  - `src/server/controllers/SnapshotController.ts` (NEW)
  - `src/server/routes/snapshots.routes.ts` (NEW)
  - `src/server/routes/snapshots.routes.test.ts` (NEW)
  - `src/lib/typebox/snapshots.ts` (NEW)
- Expected updated files:
  - `src/domain/schema/transactions.ts` (UPDATE â€” extend order_snapshots if needed)
  - `src/server/app.ts` (UPDATE â€” register snapshot routes)
- Do not modify:
  - `src/domain/schema/catalog.ts` (no catalog schema changes)
  - `src/server/repositories/ProductRepository.ts` (read-only use, no changes)
  - `src/server/repositories/VariantRepository.ts` (read-only use, no changes)
  - `src/server/services/ProductService.ts` (not in scope)
  - `src/server/routes/products.routes.ts` (not in scope)
  - `src/features/admin-products/**` (no UI changes for this story)
  - `src/features/storefront/**` (not in scope)
  - PayMongo/payment docs or flows
  - Checkout/order creation flows (Epic 5)
  - `migrations/**` (only if schema migration needed â€” create new migration file)

### Testing Requirements

- Targeted Vitest for domain/snapshot builder:

```bash
npx vitest run src/domain/snapshots/snapshot-builder.test.ts
```

- Targeted Vitest for repository:

```bash
npx vitest run src/server/repositories/SnapshotRepository.test.ts
```

- Targeted Vitest for routes/controllers:

```bash
npx vitest run src/server/routes/snapshots.routes.test.ts
```

- Type/Astro check after typed changes:

```bash
npm run check
```

- Manual QA focus for MR. JRW final verdict:
  - Snapshot creation: valid product/variant data captured correctly, centavos price accurate, variant options from `variation_chain`, image R2 key stable.
  - Snapshot immutability: after creation, catalog changes do NOT affect stored snapshot.
  - Archived product/variant: snapshot builder reads archived items successfully.
  - Image reference preservation: R2 key stored, survives catalog image removal.
  - Schema migration: if applied, `order_snapshots` table has new fields, existing data preserved.
  - API endpoints: build snapshot returns correct payload, read snapshot returns stored data, unauthorized access denied.

### Latest Technical Information

- No web research required for this story. Use repo-pinned dependencies from `package.json`: Astro `^6.1.9`, React `^19.2.5`, Tailwind CSS `^4.2.4`, Vitest `^4.1.5`, Elysia `1.4.28`, Drizzle ORM `0.45.2`, Zod `4.4.1`.
- Development D1: `jrw-database-development`, id `beabfd98-8611-4d58-8f1b-7a972b8af1ed`.
- Production D1: `jrw-database-production`, id `fd08e264-2046-4648-9164-84f66948533e`.
- Remote-first D1 is project standard. Apply schema changes to remote development first.
- Schema migration may be needed if extending `order_snapshots` table â€” use `npm run db:migrate:remote`.
- `InventoryDurableObject` is scaffolded only â€” not relevant for this story.

### References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.8)
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR31, NFR21, NFR32)
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.md` (Order Receipt UX-DR8, Loading/Conflict Patterns UX-DR21, Status Labels UX-DR26)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (Project Structure, API Layering, Data Architecture, R2 Image References)
- Project context: `_bmad-output/project-context.md` (Architecture And DDD, API Layering, Validation Rules, Data/D1/Migrations, Ecommerce Domain Rules)
- Previous related stories:
  - `_bmad-output/implementation-artifacts/3-7-publish-archive-and-validate-product-readiness.md`
  - `_bmad-output/implementation-artifacts/3-6-manage-stock-quantity-and-inventory-state.md`
  - `_bmad-output/implementation-artifacts/3-5-upload-and-manage-product-images.md`
  - `_bmad-output/implementation-artifacts/3-4-manage-product-variants-and-prices.md`
  - `_bmad-output/implementation-artifacts/3-2-create-and-edit-product-identity.md`
- Existing schema: `src/domain/schema/transactions.ts` (order_snapshots table), `src/domain/schema/catalog.ts` (products, variants, photos)
- Existing repository patterns: `src/server/repositories/ProductRepository.ts`, `src/server/repositories/VariantRepository.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

1. Review existing `order_snapshots` table and determine if schema extension is needed.
2. Create snapshot domain types in `src/domain/snapshots/types.ts`.
3. Create snapshot Zod/TypeBox schemas in `src/domain/snapshots/schemas.ts` and `src/lib/typebox/snapshots.ts`.
4. Implement `SnapshotBuilder` domain service in `src/domain/snapshots/snapshot-builder.ts`.
5. Create `SnapshotRepository` in `src/server/repositories/SnapshotRepository.ts`.
6. Create `SnapshotController` in `src/server/controllers/SnapshotController.ts`.
7. Create snapshot routes in `src/server/routes/snapshots.routes.ts`.
8. Register routes in `src/server/app.ts`.
9. Add domain, repository, and route tests.
10. Run `npm run check` and document any blockers.

### Debug Log References

- 2026-05-21: `npx vitest run src/domain/snapshots/snapshot-builder.test.ts src/server/repositories/SnapshotRepository.test.ts src/server/routes/snapshots.routes.test.ts` failed red phase because snapshot modules did not exist yet.
- 2026-05-21: `npx vitest run src/domain/snapshots/snapshot-builder.test.ts src/server/repositories/SnapshotRepository.test.ts src/server/routes/snapshots.routes.test.ts` passed after implementation: 3 files, 14 tests.
- 2026-05-21: `npm run check` passed with existing unrelated hints only.
- 2026-05-21: `npx vitest run` passed: 76 files, 497 tests.
- 2026-05-21: `npx vitest run src/domain/snapshots src/server/repositories/SnapshotRepository.test.ts src/server/routes/snapshots.routes.test.ts` passed: 3 files, 14 tests.
- 2026-05-21: `npm run db:migrate:remote` applied remote development D1 migrations `0017` through `0021`; all reported success.

### Completion Notes List

- Added snapshot domain types, Zod schemas, TypeBox transport contracts, and `SnapshotBuilder`.
- Snapshot builder captures product name/slug, variant id/label/options, centavos price, quantity, stable R2 image reference, and timestamp from current catalog state.
- Builder is read-only and returns frozen immutable snapshot payloads; archived products and archived variants remain readable.
- Extended `order_snapshots` with `product_slug`, `variant_id`, `variant_options`, `price_centavos`, `image_r2_key`, `snapshot_timestamp`, and `snapshot_signature`.
- Added `SnapshotRepository` with create/read/by-order methods. Duplicate protection reuses only exact same order-line snapshot signature; product-only reuse is intentionally avoided so later catalog changes still create correct historical snapshots.
- Added admin-only snapshot build/read/list routes with RBAC guard, TypeBox contracts, OpenAPI metadata, rate-limit class, and standard envelopes.
- Added migration `0021_product_snapshot_preservation.sql` and applied it to remote development D1.

### File List

- `migrations/0021_product_snapshot_preservation.sql`
- `src/domain/products/types.ts`
- `src/domain/schema/transactions.ts`
- `src/domain/snapshots/schemas.ts`
- `src/domain/snapshots/snapshot-builder.test.ts`
- `src/domain/snapshots/snapshot-builder.ts`
- `src/domain/snapshots/types.ts`
- `src/lib/typebox/snapshots.ts`
- `src/server/app.ts`
- `src/server/controllers/SnapshotController.ts`
- `src/server/repositories/SnapshotRepository.test.ts`
- `src/server/repositories/SnapshotRepository.ts`
- `src/server/repositories/VariantRepository.ts`
- `src/server/routes/index.ts`
- `src/server/routes/route-groups.ts`
- `src/server/routes/snapshots.routes.test.ts`
- `src/server/routes/snapshots.routes.ts`
- `src/server/services/SnapshotService.ts`

## Change Log

- 2026-05-21: Implemented Story 3.8 product snapshot preservation, exact duplicate snapshot reuse, admin snapshot APIs, schema migration, and tests.
- 2026-05-21: Story 3.8 context engine created for product snapshot preservation, snapshot builder domain service, order snapshot schema extension, immutable snapshot guarantee, image reference stability, and targeted tests.
