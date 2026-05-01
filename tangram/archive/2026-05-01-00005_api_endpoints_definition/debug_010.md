# Debug Session 010: Strict Query Modularity

This debug session addresses the user's architectural corrections regarding query parameter definitions. The previous schema grouped search (`search`) and sorting (`sort`) inside the `tboxPaginationQuery`, violating modularity rules. Furthermore, it used an open string for `sort` and the non-standard `search` key instead of the industry standard `q`.

## Fixing Checklist

- [x] task 1 - Split Pagination and Search Schemas
  > **Summary:** Update `src/lib/typebox/wrappers.ts`. Remove `search` and `sort` from `tboxPaginationQuery` so it strictly contains only `page` and `limit`. Create a new `tboxSearchQuery` schema that contains only `q: t.Optional(t.String())`.

- [x] task 2 - Enforce Strict Sorting in Catalog
  > **Summary:** Update `src/domain/validation/catalog.ts`. Refactor `tboxProductFilterQuery` to composite `tboxPaginationQuery`, `tboxSearchQuery`, and its specific filters (`category_id`, `min_price`, `max_price`). Crucially, define `sort` here as a strict literal union (e.g., `"price"`, `"-price"`, `"created_at"`, `"-created_at"`) so the API explicitly documents and enforces what product fields can be sorted.

- [x] task 3 - Enforce Strict Sorting in Transactions
  > **Summary:** Update `src/domain/validation/transactions.ts`. Refactor `tboxOrderFilterQuery` to composite `tboxPaginationQuery`, `tboxSearchQuery`, and its specific filters (`status`). Define `sort` as a strict literal union (e.g., `"total_amount"`, `"-total_amount"`, `"created_at"`, `"-created_at"`).
