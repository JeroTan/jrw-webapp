# Plan: Image Reference Refactor (Feature 00006)

## I. Architectural Alignment

- **Project Constitution (Principle 3)**: Maintains strict routing isolation by performing data transformation in the Service layer.
- **Design Pillar (Stack)**: Leverages `src/lib/cloudflare/r2.ts` and `env.R2_PUBLIC_URL` to ensure environment-agnostic resource addressing.
- **Design Pillar (Structure)**: Adheres to the Layered API Pattern (Route -> Controller -> Service).

## II. Data Model & Schema Changes

- **Rename**: `product_photos.image_link` -> `product_photos.image_id` (Type: `text`, notNull).
- **Update**: Ensure `product_variants.image_reference_id` naming remains consistent with this new standard.

## III. Atomic Task List

### 1. Database Schema Refactor

- [x] **Rename image_link field**
  > **Detailed Summary:** Update `src/domain/schema/catalog.ts`. Rename the column in `product_photos` from `image_link` to `image_id` to reflect its purpose as a stable R2 Object Key.
- [x] **Generate Migration**
  > **Detailed Summary:** Run `npx drizzle-kit generate` to create the SQL migration file for the column rename.
- [x] **Apply Migration**
  > **Detailed Summary:** Run `npx wrangler d1 migrations apply DB --remote --env development` to synchronize the remote development database.

### 2. Service Layer Alignment (Definition Phase)

- [x] **Align Mock Data & Documentation**
  > **Detailed Summary:** Update `src/domain/services/CatalogService.ts` and `src/domain/services/TransactionService.ts`. Ensure the **Mock Objects** returned by these services align with the new schema (e.g., acknowledging that data originates from an ID). Update any inline documentation or TypeBox schemas in the validation layer to explicitly state that the `image_link` is a derived field for the consumer.

### 3. Documentation Alignment

- [x] **Update stack.md**
  > **Detailed Summary:** Update `tangram/design/stack.md`. Add the `src/lib/cloudflare/r2.ts` library under the Infrastructure section, documenting its role in managing R2 object storage and environment-aware link generation.

## IV. Critical Path & Dependencies

1. **Schema Change**: Blocker for all Service layer updates.
2. **Library Utility**: Relies on the existing `idToLink` function in `src/lib/cloudflare/r2.ts`.

## V. Verification & Testing Mechanism (MANDATORY)

| Requirement           | Verification Method | Pass Criteria                                                                        |
| :-------------------- | :------------------ | :----------------------------------------------------------------------------------- |
| **Schema Integrity**  | SQL Inspection      | `image_link` is replaced by `image_id` in the D1 table schema.                       |
| **Response Contract** | Swagger UI          | `GET /api/catalog/products` still returns the property `image_link` with a full URL. |
| **Type Safety**       | Static Analysis     | `npx tsc --noEmit` passes with no errors in Services or Controllers.                 |
| **Docs Alignment**    | Manual Review       | `stack.md` contains the R2 library details.                                          |
