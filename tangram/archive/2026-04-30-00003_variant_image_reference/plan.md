# Technical Roadmap: 00003 - Variant Image Reference

This roadmap outlines the steps to implement variant-specific image references in the database and synchronize the validation layer.

## I. Architectural Alignment
- **DDD Standards**: Schema updates reside in `src/domain/schema/`.
- **Validation Rules**: Uses the dual-layer validation established in Feature 00002 (`zod*` vs `tbox*`).
- **Safety Policy**: Uses `onDelete: "set null"` for the image reference to ensure variant integrity even if a photo is deleted.

## II. Data Model & Schema Changes

### Entity: `product_variants`
- **New Field**: `image_reference_id` (Type: `text`, Nullable)
  > **Note**: This field is strictly nullable (`null` or a valid CUID2 ID) to allow variants that do not have a specific associated image, reverting to the product's primary gallery.
- **Relationship**: Foreign key to `product_photos.id`.

## III. Atomic Task List

### Layer 1: Database (Drizzle)
- [x] **Task 1.1: Update Schema Definition**
  > **Summary:** Modify `src/domain/schema/catalog.ts` to add the `image_reference_id` column to the `product_variants` table. Ensure it correctly references `product_photos.id` with `onDelete: "set null"`. Update the `productVariantsRelations` to include the `image_reference` relationship.
- [x] **Task 1.2: Generate Migration**
  > **Summary:** Run `npx drizzle-kit generate` to create the SQL migration file in the `migrations/` folder.
- [x] **Task 1.3: Apply Migration**
  > **Summary:** Apply the migration to the local development database using `wrangler d1 migrations apply DB --env development`.

### Layer 2: Validation (Dual-Layer)
- [x] **Task 2.1: Update Catalog Validation**
  > **Summary:** Update `src/domain/validation/catalog.ts`. Add `image_reference_id` to `zodVariant` (using `z.cuid2().nullable().optional()`) and `tboxVariant` (using `t.Optional(t.Union([t.String(), t.Null()]))`). Ensure any related forms (like `zodCreateVariantInput`) also account for this new optional field.

## IV. Critical Path & Dependencies
- **Blocker**: Schema modification (1.1) must precede migration generation (1.2).
- **Sequence**: Database tasks must be completed before updating the validation layer to ensure type consistency.

## V. Verification & Testing Mechanism (MANDATORY)

| Requirement | Verification Method | Pass Criteria |
| :--- | :--- | :--- |
| Schema Update | `git diff src/domain/schema/catalog.ts` | Column `image_reference_id` exists with correct FK. |
| DB Migration | `wrangler d1 execute DB "PRAGMA table_info(product_variants);"` | Table contains the new column. |
| Validation Parity | `npx tsc --noEmit` | No type errors in validation or domain layers. |
| Zod Logic | Manual inspection of `zodVariant` | Field is validated as a nullable CUID2. |
