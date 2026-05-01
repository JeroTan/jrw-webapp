# Debug Session 002: Admin and Customer Endpoint Separation

This debug session addresses the architectural need to explicitly separate Admin endpoints from Customer/Public endpoints. Different roles require different access controls, input validations, and response schemas (e.g., admins see cost prices, customers don't).

## Fixing Checklist

- [x] task 1 - Refactor Identity Routes for Admin
  > **Summary:** Update `src/api/routes/IdentityRoutes.ts`. Add an `/admin` group that includes routes for admin login (`POST /admin/auth/login`) and managing customers/admins.

- [x] task 2 - Refactor Catalog Routes for Admin
  > **Summary:** Update `src/api/routes/CatalogRoutes.ts`. Separate the routes into two main groups:
  > - Public: `GET /catalog/products`, `GET /catalog/products/:id`, `GET /catalog/categories`, `GET /catalog/products/:id/reviews`, `POST /catalog/products/:id/reviews`.
  > - Admin: `POST /admin/catalog/products`, `PUT /admin/catalog/products/:id`, `DELETE /admin/catalog/products/:id`, `POST /admin/catalog/categories`, `PUT /admin/catalog/categories/:id`, `DELETE /admin/catalog/categories/:id`.

- [x] task 3 - Refactor Transaction Routes for Admin
  > **Summary:** Update `src/api/routes/TransactionRoutes.ts`. Ensure `/admin/orders` is clearly separated and add any missing admin-specific transaction management routes if necessary.
