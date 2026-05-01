# Debug Session 006: Standardize API Query Parsing

This debug session addresses the user's inquiry regarding the `src/utils/api/query.ts` file. The current implementation uses a manual `getQueryTransformer` to mutate the Elysia query object, which bypasses TypeBox's native validation and OpenAPI documentation capabilities. We will replace this with a "Query Factory" pattern (`tboxListQuery`) that leverages Elysia's `t.Transform()` to parse the flat query string into the expected `PageAndQueryProps` structure while maintaining perfect type safety and Swagger generation.

## Fixing Checklist

- [x] task 1 - Create TypeBox Equivalents for Query Types
  > **Summary:** Update `src/utils/api/types.ts` (or `src/lib/typebox/wrappers.ts`) to define TypeBox schemas that mirror `zodFilterData` and `zodSortData`. 

- [x] task 2 - Implement `tboxListQuery` Factory
  > **Summary:** Create a `tboxListQuery<T>` factory function in `src/lib/typebox/wrappers.ts`. 
  > - It should accept an optional `filterSchema` (`T`).
  > - It should define the standard query params (`search`, `sort`, `page`, `limit`) as `t.Optional(t.String())` (or `t.Numeric()`).
  > - It should use Elysia's `t.Transform` (or a `transform` hook on the route) to encapsulate the logic currently found in `getQueryTransformer` and `convertQueryToQueryProps`, parsing the `filter[field]=value` syntax into a structured array of filters.

- [x] task 3 - Apply `tboxListQuery` to List Endpoints
  > **Summary:** Update the following routes to use the new `tboxListQuery` factory instead of generic objects or `t.Any()`:
  > - `GET /catalog/products` (CatalogRoutes.ts)
  > - `GET /catalog/products/:id/reviews` (CatalogRoutes.ts)
  > - `GET /catalog/categories` (CatalogRoutes.ts)
  > - `GET /orders/` (TransactionRoutes.ts)
  > - `GET /admin/orders/` (TransactionRoutes.ts)
  > - `GET /audit/` (AuditRoutes.ts)

- [x] task 4 - Deprecate Manual Transformer
  > **Summary:** Remove or deprecate `getQueryTransformer` from `src/utils/api/query.ts` as it is no longer needed in the Elysia routing layer.
