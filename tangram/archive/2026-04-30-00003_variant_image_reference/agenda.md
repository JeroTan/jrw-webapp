# Feature Agenda: 00003 - Variant Image Reference

This agenda defines the requirements for adding a reference to specific product photos at the variant level.

## 1. Primary Goals
- **Data Model Update**: Add `image_reference_id` to the `product_variants` table.
- **UI Context**: Ensure this field allows future UI logic to switch to the correct image when a variant is selected.
- **Drizzle Migration**: Execute the schema migration and update the domain validation schemas (Zod/TypeBox) to reflect this new field.

## 2. Requirement Interrogations
- [ ] **Data Type**: Is `image_reference_id` a CUID2 string that references an ID in the `product_photos` table?
- [ ] **Foreign Key**: Should we enforce a foreign key constraint to `product_photos.id` with `onDelete: "set null"`?
- [ ] **Validation Update**: Should we update the `zodVariant` and `tboxVariant` schemas in `src/domain/validation/catalog.ts` immediately?

## 3. Technical Constraints
- **Drizzle Consistency**: Use `text("image_reference_id").references(() => product_photos.id)` in the schema.
- **Migration Protocol**: Generate migration via `drizzle-kit generate` and apply via `wrangler d1`.

## 4. Success Criteria
- [ ] `image_reference_id` successfully added to `product_variants` in `src/domain/schema/catalog.ts`.
- [ ] Migration file generated and applied to the local D1 database.
- [ ] Zod and TypeBox schemas updated in the validation layer.
