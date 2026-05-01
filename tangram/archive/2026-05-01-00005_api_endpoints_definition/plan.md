# Plan: API Endpoints Definition (Feature 00005)

## I. Architectural Alignment
- **Project Constitution (Principle 3)**: Routes MUST strictly be used for endpoint definition and documentation. No implementation or technical logic is permitted in the route handlers.
- **Hybrid DI Pattern**: Controllers and Services must be instantiated as global singletons inside their respective Domain Containers to optimize edge performance.
- **TypeBox Validation**: All API boundaries must utilize `tbox` prefixed schemas and the global `tboxApiResponse`/`tboxPaginatedResponse` wrappers to ensure a standardized JSON envelope.

## II. Data Model & Schema Changes
- No database migrations or schema changes are required for this feature.
- TypeBox definitions established in Feature 00002 and Feature 00004 will be mapped to the `body`, `query`, `params`, and `response` objects in Elysia routes.

## III. Atomic Task List

### 1. Scaffold Services (The Mock Layer)
- [x] **Create Domain Services**
  > **Detailed Summary:** Create `IdentityService.ts`, `CatalogService.ts`, `TransactionService.ts`, and `AuditService.ts` in `src/api/services/`. These classes will contain empty methods or methods returning simple mock data structures that align with the expected validation schemas.

### 2. Scaffold Controllers
- [x] **Create Domain Controllers**
  > **Detailed Summary:** Create `IdentityController.ts`, `CatalogController.ts`, `TransactionController.ts`, and `AuditController.ts` in `src/api/controller/`. Each controller will take its respective Service via constructor injection. Methods will delegate to the service and wrap the result in a standard response envelope.

### 3. Scaffold Routes (The Documentation Layer)
- [x] **Define Identity Routes**
  > **Detailed Summary:** Create `src/api/routes/IdentityRoutes.ts`. Define endpoints for `/auth/login`, `/auth/register`, and `/profile`. Map the appropriate TypeBox schemas (e.g., `tboxLoginBody`, `tboxCustomerResponse`) and add OpenAPI `detail` metadata.
- [x] **Define Catalog Routes**
  > **Detailed Summary:** Create `src/api/routes/CatalogRoutes.ts`. Define endpoints for `/catalog/products` (GET, POST), `/catalog/products/:id` (GET, PUT, DELETE), and `/catalog/categories`. Map TypeBox schemas and OpenAPI metadata.
- [x] **Define Transaction Routes**
  > **Detailed Summary:** Create `src/api/routes/TransactionRoutes.ts`. Define endpoints for `/checkout/auth`, `/checkout/guest`, `/orders`, and `/webhooks/paymongo`. Map TypeBox schemas and OpenAPI metadata.
- [x] **Define Audit Routes**
  > **Detailed Summary:** Create `src/api/routes/AuditRoutes.ts`. Define endpoints for `/audit` to fetch logs. Map TypeBox schemas (`tboxAuditLogList`) and OpenAPI metadata.

### 4. Dependency Injection & Assembly
- [x] **Create Domain Containers**
  > **Detailed Summary:** Create `IdentityContainer.ts`, `CatalogContainer.ts`, `TransactionContainer.ts`, and `AuditContainer.ts` in `src/api/container/`. Instantiate the Services and Controllers as singletons, and expose them via Elysia plugins.
- [x] **Update `ApiContainer.ts`**
  > **Detailed Summary:** Modify `src/api/container/ApiContainer.ts` to import and `.use()` all newly created domain containers, wiring up the entire API tree.

## IV. Critical Path & Dependencies
1. **Services -> Controllers -> Routes**: The layered pattern dictates the creation order.
2. **TypeBox Schemas**: Fully reliant on the `tbox*` schemas established in previous validation refactors.

## V. Verification & Testing Mechanism (MANDATORY)

| Requirement | Verification Method | Pass Criteria |
| :--- | :--- | :--- |
| **Logic Separation** | Code Review | No `Response.json()` or data manipulation exists inside `*Routes.ts` files. |
| **Type Integrity** | Static Analysis | `npx tsc --noEmit` passes with 0 errors across all API layers. |
| **Container Registration** | Runtime / Code Review | `ApiContainer.ts` successfully mounts all 4 new domains. |
| **Documentation Metadata** | Code Review | Every route has a `detail: { summary, tags }` block defined. |
