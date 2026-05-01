# Debug Session 001: Missing Admin Product Endpoints

This debug session addresses the omission of dedicated Admin endpoints for listing and viewing product details. While public counterparts exist, separate Admin endpoints are required to provide administrators with full visibility (including drafts, internal metadata, and out-of-stock items) while keeping the public catalog restricted.

## Fixing Checklist

- [x] task 1 - Define Admin Product List Route
  > **Summary:** Update `src/api/routes/CatalogRoutes.ts`. Add a `.get("/", catalogController.handleAdminListProducts, { ... })` route inside the `/admin/catalog/products` group. Include appropriate documentation and `tboxProductFilterQuery` validation.

- [x] task 2 - Implement Admin List Controller Handler
  > **Summary:** Update `src/api/controller/CatalogController.ts`. Add the `handleAdminListProducts` method that delegates to the service and returns a standardized `tboxPaginatedResponse`.

- [x] task 3 - Implement Admin List Service Mock
  > **Summary:** Update `src/domain/services/CatalogService.ts`. Add the `mockAdminListProducts` method returning an array of mock product data.

- [x] task 4 - Define Admin Product Details Route
  > **Summary:** Update `src/api/routes/CatalogRoutes.ts`. Add a `.get("/:id", catalogController.handleAdminGetProduct, { ... })` route inside the `/admin/catalog/products` group.

- [x] task 5 - Implement Admin Details Controller Handler
  > **Summary:** Update `src/api/controller/CatalogController.ts`. Add the `handleAdminGetProduct` method that delegates to the service.

- [x] task 6 - Implement Admin Details Service Mock
  > **Summary:** Update `src/domain/services/CatalogService.ts`. Add the `mockAdminGetProduct` method returning mock product details.
