# Debug Session 012: Restoring Multi-Value Utilities

This debug session addresses a critical flaw introduced by overly strict TypeBox schemas. By defining `sort` as a literal union (e.g., `"price" | "-price"`), the API rejects perfectly valid comma-separated multiple sorts like `"-price,created_at"`. The same applies to comma-separated filter values like `category_id=cat1,cat2`.

Furthermore, we will finally update the manual parsing utilities in `src/utils/api/query.ts` to process the new standardized flat query structure (`q`, `page`, `limit`, `sort`, plus dynamic flat filters).

## Fixing Checklist

- [x] task 1 - Revert Strict TypeBox Unions to Described Strings
  > **Summary:** Update `src/domain/validation/catalog.ts` and `src/domain/validation/transactions.ts`. Change the `sort` fields from `t.Union([...])` back to `t.String({ description: "..." })` so they can accept comma-separated multiple fields. Do the same to ensure `status` and `category_id` are documented to accept comma-separated values.

- [x] task 2 - Update `QueryProps` Types
  > **Summary:** Update `src/utils/api/types.ts`. Rename `search` to `q` in `zodQueryProps` to match the new standard. Update the `FilterData` type to handle the simpler standard (we can drop the old `type: "in" | "not_in"` bracket logic for now since flat filters implicitly mean `"in"`).

- [x] task 3 - Refactor `getQueryTransformer` to Standard Parser
  > **Summary:** Update `src/utils/api/query.ts`. Completely rewrite the parser (now renamed to `parseApiQuery`) to take the flat `query` object from Elysia. It will parse `q`, `page`, `limit`. It will split `sort` by commas into `[{field: "price", direction: "desc"}]`. Crucially, it will treat any other remaining key in the query as a filter and split its value by commas into `values: string[]`.
