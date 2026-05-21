# Story 3.5: Upload and Manage Product Images

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin,
I want to upload and manage product images,
so that storefront products have stable current media and future order snapshots keep valid references.

## Acceptance Criteria

1. Given active approved Admin has product permission, when Admin uploads valid image file, then image is stored through R2/product asset boundary and product image reference is saved with stable ID/key.
2. Given image file is invalid type, too large, corrupt, or fails validation, when upload is submitted, then system returns validation error envelope and no invalid image reference is attached.
3. Given Admin changes product primary image or image order, when update succeeds, then current catalog display uses new image order and previous image references needed by historical snapshots remain resolvable.
4. Given Admin removes image from current catalog, when image is referenced by historical order snapshot, then current product association can be removed and historical snapshot reference is preserved.
5. Given Admin lacks product brand permission, when Admin attempts image mutation, then system returns forbidden error and no R2/object or DB image state changes.
6. Given storefront image performance requirements exist, when image metadata is stored, then variants/sizes/formats or metadata needed to target product-list <= 250KB and detail <= 1MB are captured or processing blocker is documented.
7. Given provider/storage failure occurs, when upload/update fails, then response maps to safe provider/storage error and logs include request ID and safe context only.
8. Given route contract is complete, when API docs are generated, then upload/manage endpoints document auth metadata, file constraints, response schemas, rate-limit class, and error codes.
9. Given implementation finishes, when tests run, then tests cover upload success, invalid file, primary image change, historical reference preservation, permission denial, and storage failure mapping and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Confirm scope and current baseline. (AC: 1-9)
  - [x] Verify Epic 3 is `in-progress` and Stories 3.0-3.4 are `done`; do not reopen.
  - [x] Confirm this story is the fifth Epic 3 backlog item after Story 3.4.
  - [x] Confirm existing `product_photos` table in `src/domain/schema/catalog.ts` — current fields include `id`, `name`, `image_id`, `product_id`.
  - [x] Confirm existing `ProductRepository`, `ProductService`, `ProductController`, and product routes from Stories 3.2-3.4.
  - [x] Confirm existing `VariantRepository`, `VariantService`, `VariantController`, and variant routes from Story 3.4.
  - [x] Confirm existing brand membership guards from Story 2.6.
  - [x] Confirm R2 binding `STORAGE` is configured in `wrangler.jsonc` under `env.development` and `env.production`.
  - [x] Do NOT add stock management, publish/archive transitions, or product editor UI image sections beyond basic upload/list/reorder/remove.

- [x] Task 2: Add image domain types, schemas, and validation. (AC: 1-2, 8)
  - [x] Add `ProductPhotoRecord`, `CreateProductPhotoInput`, `UpdatePhotoOrderInput`, `RemoveProductPhotoInput` types to `src/domain/products/types.ts`.
  - [x] Add Zod schemas for image upload validation (file type, size limits) in `src/domain/products/schemas.ts`.
  - [x] Add TypeBox schemas for image API contracts in `src/domain/products/schemas.ts`.
  - [x] Enforce: allowed file types (image/jpeg, image/png, image/webp), max file size (5MB), image dimensions metadata.

- [x] Task 3: Add R2 image repository. (AC: 1-3, 6-7)
  - [x] Create `ImageRepository` interface and `R2ImageRepository` in `src/server/repositories/ImageRepository.ts`.
  - [x] Methods: `upload(file: File, key: string)`, `get(key: string)`, `delete(key: string)`, `getPublicUrl(key: string)`.
  - [x] Use `env.STORAGE` R2 binding via `import { env } from "cloudflare:workers"`.
  - [x] Generate stable R2 keys using cuid2: `products/{productId}/{photoId}.{ext}`.
  - [x] Return metadata: size, contentType, uploadedAt, R2 key.

- [x] Task 4: Add photo repository methods. (AC: 1-4, 6)
  - [x] Create `PhotoRepository` interface and `DrizzlePhotoRepository` in `src/server/repositories/PhotoRepository.ts`.
  - [x] Methods: `create`, `findById`, `listByProductId`, `updateOrder`, `removeFromProduct`, `findByIds`.
  - [x] Use D1/Drizzle patterns consistent with `ProductRepository` and `VariantRepository`.
  - [x] `removeFromProduct` soft-removes by clearing `product_id` association (not hard delete) to preserve historical references.

- [x] Task 5: Add image service use cases. (AC: 1-5, 7)
  - [x] Create `ImageService` in `src/server/services/ImageService.ts`.
  - [x] Use cases: `uploadImage`, `listProductImages`, `updateImageOrder`, `setPrimaryImage`, `removeImage`, `getImage`.
  - [x] Service enforces: brand membership guard (reuse `requireBrandMutationPermission` pattern from `ProductService`).
  - [x] Service validates: file type, file size, image integrity.
  - [x] Service returns `AppResult`/`GeneralError` with appropriate error codes.
  - [x] Image mutations record audit event through existing audit interface.
  - [x] Storage failures map to `PROVIDER_UNAVAILABLE` safe error.

- [x] Task 6: Add image API routes and controllers. (AC: 1-8)
  - [x] Create `ImageController` in `src/server/controllers/ImageController.ts`.
  - [x] Create image routes under `src/server/routes/images.routes.ts` with endpoints:
    - `GET /api/admin/products/:productId/images` — list images for product
    - `POST /api/admin/products/:productId/images` — upload image (multipart/form-data)
    - `PATCH /api/admin/products/:productId/images/:photoId/order` — update image order
    - `PATCH /api/admin/products/:productId/images/:photoId/primary` — set primary image
    - `DELETE /api/admin/products/:productId/images/:photoId` — remove image from product
  - [x] All routes require Admin authentication via existing RBAC guards.
  - [x] Upload route uses multipart/form-data with file validation.
  - [x] All routes declare TypeBox contracts, OpenAPI metadata, auth, rate-limit class, and error codes.
  - [x] Register image routes in `src/server/app.ts`.

- [x] Task 7: Extend product detail to include image summary. (AC: 6)
  - [x] Extend product detail response to include `imageCount` and `primaryImageUrl` (customer-safe).
  - [x] Image URLs use R2 public URL pattern.
  - [x] No internal R2 keys or metadata exposed in customer-facing responses.

- [x] Task 8: Add admin image UI (basic upload and list). (AC: 1-4, 8)
  - [x] Create `src/features/admin-products/components/ImageUpload.tsx` — drag-and-drop or file picker upload.
  - [x] Create `src/features/admin-products/components/ImageList.tsx` — grid showing product images with reorder controls.
  - [x] Image list: shows thumbnails, primary indicator, order number, actions (set primary, remove).
  - [x] Use existing `Button`, `Input`, `Badge`, `EmptyState`, `Skeleton` primitives from `src/components/**`.
  - [x] Upload progress indicator; error summary on failure.
  - [x] Success toast on upload; confirmation dialog before remove.

- [x] Task 9: Styles and accessibility. (AC: 4-9)
  - [x] Image UI uses JRW tokens: 0px corners, 1px borders, no shadows, cobalt for focus/selected.
  - [x] Primary image indicator uses text label — not color alone.
  - [x] Upload area has visible label and keyboard-accessible file picker.
  - [x] Image grid keyboard accessible (arrow keys for navigation).
  - [x] Respect `prefers-reduced-motion` for any transitions.
  - [x] Image thumbnails use `alt` text from image name or product name.

- [x] Task 10: Targeted tests and checks. (AC: 1-9)
  - [x] Add domain/service tests in `src/server/services/ImageService.test.ts` covering: upload success, invalid file type, file too large, reorder, set primary, remove, brand membership denial, storage failure mapping.
  - [x] Add route/controller tests in `src/server/routes/images.routes.test.ts` covering: upload, list, reorder, set primary, remove, unauthorized access, invalid file.
  - [x] Add UI tests in `src/features/admin-products/components/image-ui.test.ts` covering: upload area rendering, image list rendering, primary indicator, remove confirmation, empty states.
  - [x] Run changed-target tests only: `npx vitest run src/server/services/ImageService.test.ts src/server/routes/images.routes.test.ts src/features/admin-products`.
  - [x] Run `npm run check` after typed/component changes.
  - [x] Do not run full `npm run build-test` unless implementation touches broader surfaces or MR. JRW asks for final full verdict.

### Review Findings

_(To be populated during code review)_

## Dev Notes

### Epic Context

- This is the fifth Epic 3 catalog story after Story 3.4 (product variants and prices).
- Epic 2 (Brand Collaboration) is complete with brand membership guards established.
- Requirements covered: FR26; supports FR31 (order snapshot preservation).
- UX supported: UX-DR12 (Product Editor media section), UX-DR20 (feedback patterns), UX-DR22 (form patterns), UX-DR24 (overlay patterns for image preview), UX-DR29 (responsive admin), UX-DR30 (accessibility).
- Business value: Products need images for storefront display. Without images, products have no visual identity and customers cannot evaluate products before purchase. Historical order snapshots must preserve image references even when catalog images change.

### Current Code Intelligence

#### `src/domain/schema/catalog.ts` — `product_photos` table

- Current state: `product_photos` table has `id` (cuid2), `name` (text, nullable), `image_id` (text, not null), `product_id` (FK to `products`, cascade delete).
- **Gap**: Table is minimal — missing `sort_order`, `is_primary`, `file_size`, `content_type`, `r2_key`, `width`, `height`, `created_at`, `updated_at` fields needed for full image management.
- What this story uses: All photo fields. **Must extend schema** with additional columns for order, primary flag, metadata.
- What this story does NOT change: No stock mutations (Story 3.6), no publish/archive transitions (Story 3.7).
- Preserve: Existing `product_variants`, `products`, `categories` tables and relationships.

#### `src/server/repositories/ProductRepository.ts`

- Current state: Has `create`, `findById`, `findBySlug`, `list`, `update`, `assignBrand`, `removeBrand`, `assignCategories`, `removeCategory`, `findOrganization` methods.
- What this story does NOT change: Product repository methods remain as-is. Photo repository is separate.
- Preserve: Existing method signatures, D1/Drizzle access patterns.

#### `src/server/services/ProductService.ts`

- Current state: Has product CRUD use cases with brand membership guards.
- What this story does NOT change: Product service methods remain as-is. Image service is separate.
- Preserve: Existing `AppResult`/`GeneralError` patterns, existing brand membership guard pattern (`requireBrandMutationPermission`).

#### `src/server/routes/products.routes.ts`

- Current state: Has product CRUD and organization routes.
- What this story adds: Image routes are in **separate** `images.routes.ts` file, registered in `src/server/app.ts`.
- Preserve: Existing route composition pattern, guard usage, envelope adaptation, TypeBox contracts.

#### `src/features/admin-products/`

- Current state: Has `ProductList.tsx`, `ProductEditor.tsx`, `VariantList.tsx`, `VariantEditor.tsx`, `api.ts`, `types.ts` from Stories 3.2-3.4.
- What this story adds: `ImageUpload.tsx`, `ImageList.tsx`, image API fetch helpers, image types.
- Preserve: Existing list and editor behavior, form validation patterns, typed API clients.

#### `src/components/**`

- Current state: `Select`, `Input`, `Button`, `Badge`, `StatusBadge`, `DataTable`, `EmptyState`, `Skeleton`, `PageToolbar`, `SearchInput`, `ConfirmDialog` available.
- What this story uses: `Button` for upload/actions, `EmptyState` for no images, `Skeleton` for loading, `ConfirmDialog` for remove confirmation.
- Preserve: Existing primitive behavior and exports.

#### `wrangler.jsonc` — R2 binding

- Current state: R2 binding `STORAGE` configured under `env.development` and `env.production`.
- What this story uses: `env.STORAGE` for image upload/retrieval/deletion.
- Access pattern: `import { env } from "cloudflare:workers"` in infrastructure adapters only.

### Previous Story Intelligence

- Story 3.4 established variant CRUD with centavos pricing, SKU uniqueness, duplicate option combination detection, brand membership guards, and admin variant UI. Reuse the same repository/service/controller/route patterns.
- Story 3.4 used targeted tests plus `npm run check`; use the same targeted style.
- Story 3.3 established product brand/category assignment with PATCH endpoints, organization GET endpoint, brand membership guards, and audit hooks. Reuse the same patterns.
- Story 3.3 review findings: Product editor reset user edits when organization data arrived — avoid same pattern by not overwriting user-edited image state when data arrives.
- Story 3.2 established product identity CRUD with slug uniqueness, default DRAFT status, admin UI. Image service should follow same error handling and envelope patterns.
- Story 3.2 review findings: slug conflicts should return error (NOT auto-rename). Apply same principle — return conflict errors for duplicate image names, not auto-fix.
- Story 3.1 established category CRUD with ACTIVE/ARCHIVED status. Image removal follows same pattern — soft remove from product, not hard delete.
- Story 2.6 established brand-scoped product mutation guards. This story's image mutations must follow the same membership check pattern — check product's `brand_id` and verify Admin membership.

### Git Intelligence

- Recent commits: 3-4 reviewed and implemented, 3-3 product brand/category assignment, 3-2 product identity CRUD, 3-1 category CRUD, 3-0 component system.
- Current relevant pattern: code changes are small, typed, and backed by targeted Vitest files.
- Image work should follow the same incremental, tested approach.
- Schema migration needed for `product_photos` table extensions — coordinate with MR. JRW for remote development migration.

### Architecture and UX Guardrails

- Astro owns page routing and SEO shells. React feature modules own interactive surfaces.
- Shared primitives go under `src/components/**`; feature-specific image UI stays under `src/features/admin-products/**`.
- Image API follows Route -> Controller -> Service -> Domain/Repository.
- JRW visual system: 0px radius, 1px borders, no shadows, no blur, cobalt accent only for focus/selected/primary/live status.
- Admin UI is dense, keyboard-friendly, and operation-focused.
- Status labels must be text-visible and cannot rely on color alone.
- UI copy must state what the screen, section, or field does for the user. Keep technical boundary language in planning docs only.
- **R2 image references must remain stable** — order snapshots preserve purchased product state. Architecture: "R2 image references must preserve historical order snapshots even when product images change later."
- API JSON uses camelCase; database uses snake_case; controllers/services map rows to DTOs.
- Image removal from product is soft — historical references must remain resolvable.
- File validation: allowed types (jpeg, png, webp), max size 5MB.
- Product-list images target <= 250KB, product-detail primary images target <= 1MB (NFR6).

### Implementation Guidance

#### Schema Migration for `product_photos`

The current `product_photos` table is minimal. This story needs additional columns:

```typescript
// Proposed additions to product_photos table:
sort_order: integer("sort_order").notNull().default(0),
is_primary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
file_size: integer("file_size"),
content_type: text("content_type"),
r2_key: text("r2_key").notNull(), // replaces or supplements image_id
width: integer("width"),
height: integer("height"),
created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
```

**Migration approach**: Create Drizzle migration to add columns to existing `product_photos` table. Apply to remote development first. If `image_id` currently stores R2 key, map it to `r2_key` during migration.

#### Image Service Permission Check

Image mutations must check brand membership for the **parent product**:
- Load product by `productId`.
- If product has `brand_id`, check `BrandMembershipRepository` for active membership.
- SUPER_ADMIN bypasses guard.
- Return `BRAND_MEMBERSHIP_REQUIRED` for non-members.

#### Image API Endpoints

- `GET /api/admin/products/:productId/images` — list all images for a product (ordered by `sort_order`).
- `POST /api/admin/products/:productId/images` — upload new image (multipart/form-data, file field `image`).
- `PATCH /api/admin/products/:productId/images/:photoId/order` — update image order (body: `{ sortOrder: number }`).
- `PATCH /api/admin/products/:productId/images/:photoId/primary` — set as primary image.
- `DELETE /api/admin/products/:productId/images/:photoId` — remove image from product (soft remove, clear `product_id`).

#### Image Validation Rules

- File type: `image/jpeg`, `image/png`, `image/webp` only.
- File size: max 5MB (5,242,880 bytes).
- Image dimensions: validate using Web APIs (`createImageBitmap`) to extract width/height.
- Name: optional, max 255 characters. If not provided, generate from original filename.

#### R2 Key Generation

- Pattern: `products/{productId}/{photoId}.{ext}`.
- Use cuid2 for `photoId`.
- Extract extension from file content-type: `jpeg` -> `jpg`, `png` -> `png`, `webp` -> `webp`.
- Store `r2_key` in DB for later retrieval.

#### Image Summary in Product Responses

- Product detail: include `imageCount` (number), `primaryImageUrl` (string | null).
- These are customer-safe fields — no internal R2 keys, no file sizes.
- `primaryImageUrl` uses R2 public URL pattern.

#### Historical Reference Preservation

- When image is removed from product: clear `product_id` (set to NULL) rather than hard delete.
- This preserves the photo record for any order snapshots that reference it.
- Order snapshots store `photo_id` or `r2_key` directly, not through product relationship.

### Files Being Modified

#### UPDATE: `src/domain/schema/catalog.ts` — extend product_photos table

- Current state: `product_photos` has `id`, `name`, `image_id`, `product_id`.
- What this story adds: `sort_order`, `is_primary`, `file_size`, `content_type`, `r2_key`, `width`, `height`, `created_at`, `updated_at`.
- What must be preserved: Existing table relationships (`products` has many `product_photos`).

#### NEW: `migrations/XXXX_add_product_photos_columns.sql` — schema migration

- Current state: Does not exist.
- What this story creates: Drizzle migration to add columns to `product_photos`.
- Must apply to remote development first.

#### NEW: `src/domain/products/types.ts` — image types (UPDATE existing file)

- What this story adds: `ProductPhotoRecord`, `CreateProductPhotoInput`, `UpdatePhotoOrderInput`, `RemoveProductPhotoInput`, `ImageListResult` types.
- What must be preserved: Existing product and variant types.

#### NEW: `src/domain/products/schemas.ts` — image schemas (UPDATE existing file)

- What this story adds: Zod and TypeBox schemas for image upload/validation.
- What must be preserved: Existing product and variant schemas.

#### NEW: `src/server/repositories/ImageRepository.ts`

- Current state: Does not exist.
- What this story creates: `ImageRepository` interface and `R2ImageRepository` implementation.
- Methods: `upload`, `get`, `delete`, `getPublicUrl`.
- Must use: `env.STORAGE` R2 binding via `import { env } from "cloudflare:workers"`.

#### NEW: `src/server/repositories/PhotoRepository.ts`

- Current state: Does not exist.
- What this story creates: `PhotoRepository` interface and `DrizzlePhotoRepository` implementation.
- Methods: `create`, `findById`, `listByProductId`, `updateOrder`, `setPrimary`, `removeFromProduct`, `findByIds`.

#### NEW: `src/server/services/ImageService.ts`

- Current state: Does not exist.
- What this story creates: `ImageService` with image use cases.
- Use cases: `uploadImage`, `listProductImages`, `updateImageOrder`, `setPrimaryImage`, `removeImage`, `getImage`.
- Must reuse: `requireBrandMutationPermission` pattern from `ProductService`.

#### NEW: `src/server/controllers/ImageController.ts`

- Current state: Does not exist.
- What this story creates: `ImageController` adapting service results to API envelopes.
- Must follow: Same envelope adaptation pattern as `ProductController`.

#### NEW: `src/server/routes/images.routes.ts`

- Current state: Does not exist.
- What this story creates: Image route module with all image endpoints.
- Must follow: Same route composition pattern as `products.routes.ts`.
- Upload route must handle multipart/form-data.

#### UPDATE: `src/server/app.ts`

- Current state: Composes Elysia app with product and variant routes.
- What this story changes: Registers image routes alongside product and variant routes.
- What must be preserved: Existing route composition, middleware, OpenAPI setup.

#### UPDATE: `src/features/admin-products/types.ts`

- Current state: TypeScript types for product and variant DTOs.
- What this story adds: `ProductPhotoRecord`, `UploadImageInput`, `ImageListResult` types for frontend.
- What must be preserved: Existing type definitions.

#### UPDATE: `src/features/admin-products/api.ts`

- Current state: Typed fetch helpers for product and variant operations.
- What this story adds: Fetch helpers for image upload, list, reorder, set primary, remove.
- Must handle: multipart/form-data for upload.
- What must be preserved: Existing API client patterns.

#### NEW: `src/features/admin-products/components/ImageUpload.tsx`

- Current state: Does not exist.
- What this story creates: Drag-and-drop or file picker upload component with progress indicator.

#### NEW: `src/features/admin-products/components/ImageList.tsx`

- Current state: Does not exist.
- What this story creates: Grid showing product images with thumbnails, primary indicator, order, actions.

#### NEW: `src/server/services/ImageService.test.ts`

- Current state: Does not exist.
- What this story creates: Domain/service tests for image use cases.

#### NEW: `src/server/routes/images.routes.test.ts`

- Current state: Does not exist.
- What this story creates: Route/controller tests for image endpoints.

#### NEW: `src/features/admin-products/components/image-ui.test.ts`

- Current state: Does not exist.
- What this story creates: UI tests for image upload and list.

### Project Structure Notes

- Expected new files:
  - `src/domain/schema/catalog.ts` (UPDATE — extend product_photos)
  - `migrations/XXXX_add_product_photos_columns.sql` (NEW)
  - `src/domain/products/types.ts` (UPDATE — add image types)
  - `src/domain/products/schemas.ts` (UPDATE — add image schemas)
  - `src/server/repositories/ImageRepository.ts` (NEW)
  - `src/server/repositories/PhotoRepository.ts` (NEW)
  - `src/server/services/ImageService.ts` (NEW)
  - `src/server/services/ImageService.test.ts` (NEW)
  - `src/server/controllers/ImageController.ts` (NEW)
  - `src/server/routes/images.routes.ts` (NEW)
  - `src/server/routes/images.routes.test.ts` (NEW)
  - `src/features/admin-products/types.ts` (UPDATE — add image types)
  - `src/features/admin-products/api.ts` (UPDATE — add image fetch helpers)
  - `src/features/admin-products/components/ImageUpload.tsx` (NEW)
  - `src/features/admin-products/components/ImageList.tsx` (NEW)
  - `src/features/admin-products/components/image-ui.test.ts` (NEW)
  - `src/server/app.ts` (UPDATE — register image routes)
- Do not modify:
  - `src/server/repositories/ProductRepository.ts`
  - `src/server/repositories/VariantRepository.ts`
  - `src/server/services/ProductService.ts`
  - `src/server/services/VariantService.ts`
  - `src/server/routes/products.routes.ts`
  - `src/server/routes/variants.routes.ts`
  - `src/features/admin-products/components/ProductEditor.tsx`
  - `src/features/admin-products/components/ProductList.tsx`
  - `src/features/admin-products/components/VariantEditor.tsx`
  - `src/features/admin-products/components/VariantList.tsx`
  - `src/domain/brands/**`
  - `src/domain/categories/**`
  - `src/features/brands/**`
  - `src/features/admin-categories/**`
  - PayMongo/payment docs or flows

### Testing Requirements

- Targeted Vitest for domain/service:

```bash
npx vitest run src/server/services/ImageService.test.ts
```

- Targeted Vitest for routes/controllers:

```bash
npx vitest run src/server/routes/images.routes.test.ts
```

- Targeted Vitest for UI:

```bash
npx vitest run src/features/admin-products/components/image-ui.test.ts
```

- Type/Astro check after typed changes:

```bash
npm run check
```

- Manual QA focus for MR. JRW final verdict:
  - Image upload: valid file (jpeg/png/webp), invalid file type rejection, file too large rejection.
  - Image list: shows all images for product, ordered by sort_order, with thumbnails.
  - Primary image: set primary, primary indicator visible with text label.
  - Reorder: change sort order, new order persists and displays correctly.
  - Remove: soft remove from product, image record preserved, confirmation dialog shown.
  - Brand membership denial: non-member Admin cannot upload/edit/remove images for branded product.
  - Storage failure: R2 unavailable maps to safe `PROVIDER_UNAVAILABLE` error.
  - Keyboard navigation for image grid and upload area.
  - Accessibility: alt text on thumbnails, visible focus, aria labels on actions.

### Latest Technical Information

- No web research required for this story. Use repo-pinned dependencies from `package.json`: Astro `^6.1.9`, React `^19.2.5`, Tailwind CSS `^4.2.4`, Vitest `^4.1.5`, Elysia `1.4.28`, Drizzle ORM `0.45.2`, Zod `4.4.1`.
- R2 binding `STORAGE` is configured in `wrangler.jsonc` under `env.development` and `env.production`.
- Access R2 via `import { env } from "cloudflare:workers"` in infrastructure adapters only.
- Development D1: `jrw-database-development`, id `beabfd98-8611-4d58-8f1b-7a972b8af1ed`.
- Production D1: `jrw-database-production`, id `fd08e264-2046-4648-9164-84f66948533e`.
- Remote-first D1 is project standard. Apply schema changes to remote development first.
- `product_photos` table exists but is minimal — needs extension for order, primary, metadata fields.
- NFR6: Product-list images target <= 250KB, product-detail primary images target <= 1MB.
- R2 image references must preserve historical order snapshots even when product images change later.

### References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.5)
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR26, FR31)
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.md` (Product Editor UX-DR12, Feedback Patterns UX-DR20, Form Patterns UX-DR22, Overlay Patterns UX-DR24, Responsive Admin UX-DR29, Accessibility UX-DR30)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (Project Structure, API Layering, Data Architecture, Component Boundaries, R2 Integration)
- Project context: `_bmad-output/project-context.md` (Architecture And DDD, API Layering, Validation Rules, Data/D1/Migrations, Cloudflare Runtime Rules, UI And Design Rules, Testing And Quality)
- Design system: `docs/design-by-google-stitch.md` (Content & Microcopy, Layout & Spacing, Components)
- Previous related stories:
  - `_bmad-output/implementation-artifacts/3-4-manage-product-variants-and-prices.md`
  - `_bmad-output/implementation-artifacts/3-3-assign-product-brand-and-categories.md`
  - `_bmad-output/implementation-artifacts/3-2-create-and-edit-product-identity.md`
  - `_bmad-output/implementation-artifacts/3-1-manage-product-categories.md`
- Existing shared primitives: `src/components/**`
- Existing styles: `src/styles/global.css`
- Existing schema: `src/domain/schema/catalog.ts` (product_photos table)
- Existing product service patterns: `src/server/services/ProductService.ts`
- Existing variant service patterns: `src/server/services/VariantService.ts`
- R2 binding config: `wrangler.jsonc` (STORAGE binding under env.development/env.production)

## Dev Agent Record

### Agent Model Used

gpt-5 (Codex)

### Implementation Plan

1. Extend `product_photos` schema with additional columns (sort_order, is_primary, file_size, content_type, r2_key, width, height, timestamps).
2. Create Drizzle migration for schema changes and apply to remote development.
3. Add image domain types and schemas (Zod + TypeBox) to `src/domain/products/`.
4. Create `ImageRepository` interface and `R2ImageRepository` implementation for R2 operations.
5. Create `PhotoRepository` interface and `DrizzlePhotoRepository` implementation for D1 operations.
6. Create `ImageService` with upload, list, reorder, set primary, remove use cases and brand membership guards.
7. Create `ImageController` adapting service results to API envelopes.
8. Create image routes in `src/server/routes/images.routes.ts` with all endpoints.
9. Register image routes in `src/server/app.ts`.
10. Extend product detail response to include image summary (imageCount, primaryImageUrl).
11. Create `ImageUpload.tsx` and `ImageList.tsx` components.
12. Add typed API fetch helpers for image operations.
13. Add targeted domain/service, route, and UI tests.
14. Run `npm run check` and document any blockers.

### Debug Log References

- `npx vitest run`
- `npm run check`

### Completion Notes List

- Added product image domain + schema support (validation limits, API contracts, product image summary fields).
- Extended `product_photos` schema and added migration `0019_product_photo_assets.sql` for metadata, ordering, primary flag, and stable R2 key.
- Added `ImageRepository` (R2) + `PhotoRepository` (D1) and implemented `ImageService` use-cases with RBAC, brand membership guard, audit hooks, and provider failure mapping.
- Added image admin API endpoints (list/upload/reorder/set primary/remove) with OpenAPI metadata and typed envelopes.
- Extended product repository responses with `imageCount` and `primaryImageUrl`.
- Added admin product editor image management UI (`ImageUpload`, `ImageList`) with keyboard navigation, confirmation dialog, progress/error feedback, and JRW token-based styles.
- Added/updated tests for image service, image routes, image UI, and impacted product/variant/domain contracts.
- Validation gates passed: `npx vitest run` (68 files, 446 tests) and `npm run check` (0 errors).

### File List

- _bmad-output/implementation-artifacts/3-5-upload-and-manage-product-images.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- migrations/0019_product_photo_assets.sql
- src/domain/products/product.test.ts
- src/domain/products/schemas.ts
- src/domain/products/types.ts
- src/domain/schema/catalog.ts
- src/features/admin-products/api.ts
- src/features/admin-products/components/ImageList.tsx
- src/features/admin-products/components/ImageUpload.tsx
- src/features/admin-products/components/ProductEditor.tsx
- src/features/admin-products/components/image-ui.test.ts
- src/features/admin-products/components/products-ui.test.ts
- src/features/admin-products/types.ts
- src/server/app.ts
- src/server/controllers/ImageController.ts
- src/server/repositories/ImageRepository.ts
- src/server/repositories/PhotoRepository.ts
- src/server/repositories/ProductRepository.ts
- src/server/routes/images.routes.test.ts
- src/server/routes/images.routes.ts
- src/server/routes/index.ts
- src/server/routes/products.routes.test.ts
- src/server/services/ImageService.test.ts
- src/server/services/ImageService.ts
- src/server/services/VariantService.test.ts
- src/styles/global.css

## Change Log

- 2026-05-21: Story 3.5 context engine created for product image upload and management API, R2 storage integration, admin image UI, brand membership enforcement, historical reference preservation, and targeted tests.
- 2026-05-21: Story 3.5 implementation complete; image storage/repository/service/routes/UI delivered with tests and validation gates passing.
