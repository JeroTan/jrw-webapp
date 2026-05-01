# Debug Session 011: OpenAPI Query Descriptions

This debug session addresses the user's request to enhance the OpenAPI/Swagger documentation by adding explicit `description` fields to the pagination parameters, similar to how the `q` (search) parameter is documented. This improves the developer experience (DX) when interacting with the API via the Swagger UI.

## Fixing Checklist

- [x] task 1 - Add Descriptions to Pagination Schema
  > **Summary:** Update `src/lib/typebox/wrappers.ts`. Add `{ description: "..." }` metadata to the `page` and `limit` fields inside `tboxPaginationQuery`.

- [x] task 2 - Ensure Sort Descriptions (Where Applicable)
  > **Summary:** The `sort` fields are defined directly in the domain schemas (`catalog.ts`, `transactions.ts`) as literal unions. We will add a `description` wrapping the union to clarify the sorting behavior.
