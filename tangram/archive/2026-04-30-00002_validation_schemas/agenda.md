# Agenda: Shared Validation Schemas & Types

**Feature ID:** 00002
**Context:** The goal is to establish a modular, dual-layer validation and type system. Custom Zod wrappers (`src/lib/zod/wrapperSchemaFields.ts`) drive frontend forms and complex API response casting. Native TypeBox (`t`) handles Elysia API boundary validation and Swagger documentation.

## 📝 Clarification Summary
*   **Dual-Layer Architecture**: Zod exclusively for client-side validation and TypeScript type inference. TypeBox exclusively for Elysia request/response validation. They mirror each other.
*   **Schema Modularity (No Deep Nesting)**: Zod schemas for complex objects (like `zodProductDetails`) MUST be composed of distinct, flat variable schemas (e.g., `zodProduct`, `zodVariant`, `zodPhoto`) merged together, rather than defined as massive, deeply nested inline objects.
*   **Checkout Flows**: Distinct Zod/TypeBox schemas must exist for Authenticated Checkout versus Guest Checkout, reflecting the nullable `customer_id` in the database.
*   **File Uploads**: Admin endpoints for product creation must explicitly use `t.File()` in TypeBox and `zodFile`/`zodImage` in Zod to properly handle `multipart/form-data`.
*   **Shared Enums**: Order statuses are explicitly defined as `PENDING`, `FAILED`, `ON_THE_WAY`, `FULFILLED`. Both Zod and TypeBox schemas will strictly enforce these values. We must also account for a potential description/reason field (e.g. waiting for payment, user cancelled).
*   **Audit Logs**: Explicit API response wrappers and Zod types (`zodAuditLog`, `typeAuditLog`) must be defined for the Admin Dashboard.
*   **API Wrappers**: All API responses must be standardized using wrapper schemas.
    *   **Standard Response**: `{ data: T, message: string }`
    *   **Paginated Response**: `{ data: T[], meta: { page: number, total: number, limit: number }, message: string }`
*   **Location**: All validation schemas and inferred types will reside in `src/domain/validation/`.

---

## Requirements Validation Checklist

### Completeness
- [ ] Are we explicitly defining Zod and TypeBox schemas for BOTH Guest Checkout and Authenticated Checkout?
- [ ] Are we defining generic Zod and TypeBox wrapper schemas for standardized API responses (Single Object vs. Paginated List)?
- [ ] Are we creating independent, modular base schemas (e.g., `zodProduct`, `zodVariant`) before composing them into complex API response shapes (e.g., `zodProductDetails`)?
- [ ] Are we explicitly defining schemas for Audit Logs (`zodAuditLog`, `tboxAuditLog`)?

### Clarity
- [ ] Is the dual-layer system clearly separated? (Zod = Frontend Forms/Response Casting; TypeBox = API Gateway Input/Output).
- [ ] Can the frontend easily import the Zod-generated types (e.g., `typeProductDetails`) without importing server-side dependencies?
- [ ] Are Order Statuses strictly typed to `PENDING`, `FAILED`, `ON_THE_WAY`, `FULFILLED` across both Zod and TypeBox?

### Edge Cases
- [ ] Do the TypeBox schemas accurately mirror the nested structures defined in the composed Zod schemas?
- [ ] How do the schemas handle database-generated fields (like `id`, `created_at`) when distinguishing between an "Insert" form and a "Select" response?
- [ ] Are we correctly utilizing `t.File()` and Zod file wrappers for `multipart/form-data` uploads (e.g., product photos)?

### Non-Functional
- [ ] Is the new `src/domain/validation/` folder modular and easy to import from both the Astro frontend and the Elysia backend?
- [ ] Do the exported TypeScript types serve as the definitive single source of truth bridging the client and the API?