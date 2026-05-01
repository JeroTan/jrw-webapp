# Debug Session 009: Simplify Query Parsing with `t.Composite`

This debug session addresses the user's architectural correction. The previous `tboxListQuery` factory using `t.Transform` was over-engineered and unnecessary. Because pagination logic remains consistent across all list endpoints, we should define a single static `tboxPaginationQuery` schema and use TypeBox's `t.Composite` to merge it with endpoint-specific flat query parameters. This achieves the exact same type safety and OpenAPI documentation with drastically less code and complexity.

## Fixing Checklist

- [x] task 1 - Create Static `tboxPaginationQuery`
  > **Summary:** Update `src/lib/typebox/wrappers.ts`. Delete the complex `tboxListQuery` and replace it with a single static `tboxPaginationQuery` object.

- [x] task 2 - Refactor Catalog Queries
  > **Summary:** Update `src/domain/validation/catalog.ts`. Refactor `tboxProductFilterQuery` to use `t.Composite`.

- [x] task 3 - Refactor Transaction Queries
  > **Summary:** Update `src/domain/validation/transactions.ts`. Refactor `tboxOrderFilterQuery` to use `t.Composite`.

- [x] task 4 - Ensure Route Definitions Compile
  > **Summary:** Ensure routes compile cleanly.
