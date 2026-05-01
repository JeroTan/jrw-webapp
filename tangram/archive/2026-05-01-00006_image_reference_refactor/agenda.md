# Agenda: Image Reference Refactor (Feature 00006)

## Context
The user has implemented `src/lib/cloudflare/r2.ts` which manages file uploads to Cloudflare R2 and provides a utility `idToLink` to generate URLs based on environment variables (`env.R2_PUBLIC_URL`). Currently, the database schema stores the full link, which is volatile. We need to refactor the database to store the stable `image_id` (R2 Object Key) and hydrate the response in the Service layer.

## Technical Alignment
- **Database**: `product_photos.image_link` renamed to `image_id`.
- **Transformation Layer**: `CatalogService` will be responsible for mapping `image_id` to `image_link` using the library utility.
- **Contract Integrity**: The API JSON response will still use the key `image_link` for consumer consistency.

## Interrogation Questions
1. **R2 Library Sync**: Should we also update the documentation for the new `src/lib/cloudflare/r2.ts` in `stack.md` as part of this feature?
2. **Schema Naming**: Confirm renaming `image_link` to `image_id` in the Drizzle schema `catalog.ts`?
3. **Migration Strategy**: Since we are in the definition phase, I will generate a new Drizzle migration to apply this change to the development D1.

## Definition of Done
- Database schema `catalog.ts` refactored.
- Migration generated and applied to remote `development`.
- `CatalogService` mock methods updated to perform the hydration.
- `tboxPhoto` validation schema documented to reflect the stable URL output.
