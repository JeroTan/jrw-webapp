# Technical Roadmap: Validation Schemas & Types

**Feature ID:** 00002
**Title:** Shared Validation Schemas & Types

---

## I. Architectural Alignment
- **Design Pillar (Architecture)**: Complies with Domain-Driven Design (DDD) by placing business data shapes in `src/domain/validation/`. Emphasizes strictly flat, modular base schemas composed into larger types.
- **Design Pillar (Stack)**: Uses Zod for client-side form validation and complex type generation (e.g., casting API responses); explicitly utilizes TypeBox (`t`) for Elysia API endpoints (including `t.File()` for uploads) to ensure accurate OpenAPI Swagger generation.
- **User Convention**: 
  - **Zod Prefixes**: Must use `zod` (e.g., `zodRegistrationForm`, `zodProductDetails`).
  - **TypeBox Prefixes**: Must use `tbox` (e.g., `tboxRegistrationBody`, `tboxProductResponse`).
  - **TypeScript Type Prefixes**: Must use `type` (e.g., `typeRegistrationForm`, `typeProductDetails`).
  - Standardized API wrappers must encapsulate all responses (e.g. `{ data, message }`).

## II. Data Model & Schema Changes
- **Database Schema Updates**:
  - Update `orders` table in `src/domain/schema/transactions.ts`: change `status` default to `"PENDING"` and add a new `status_description` text column.
- Creating new validation files mirroring the business domains and API boundaries:
  - `src/domain/validation/shared.ts` (Enums, API Wrappers)
  - `src/domain/validation/identity.ts`
  - `src/domain/validation/catalog.ts`
  - `src/domain/validation/transactions.ts`
  - `src/domain/validation/audit.ts`

## III. Atomic Task List

### 0. Database Schema Updates
- [x] **Update Order Schema & Migrate**
  > **Detailed Summary:** Modify `src/domain/schema/transactions.ts` to update the `orders` table. Change the `status` column's default value from `"UNPAID"` to `"PENDING"`. Add a new column `status_description` (text) to hold the reason for the status. Then, run `npx drizzle-kit generate` to create the migration file.

### 1. Shared Types & API Wrappers
- [x] **Implement Shared Validation Utilities**
  > **Detailed Summary:** Create `src/domain/validation/shared.ts`.
  > - Define explicit string enums for Order Statuses (`PENDING`, `FAILED`, `ON_THE_WAY`, `FULFILLED`) and Shipping Types in both Zod and TypeBox.
  > - Create higher-order functions/schemas for Standard Responses (`zodApiResponse`, `tboxApiResponse`) and Paginated Responses (`zodPaginatedResponse`, `tboxPaginatedResponse`) injecting the `{ data, message }` structure.

### 2. Identity Domain Validation (Forms & Auth)
- [x] **Implement Identity Forms & Endpoints**
  > **Detailed Summary:** Create `src/domain/validation/identity.ts`. 
  > - Define base modular schemas: `zodAdmin`, `zodCustomer`.
  > - Define Auth forms: `zodRegistrationForm`, `zodLoginForm` and their `tbox` counterparts.
  > - Compose response schemas for API output: `zodAdminDetails` (excluding `password_hash`).

### 3. Catalog Domain Validation (Uploads & Complex Responses)
- [x] **Implement Catalog Forms & Responses**
  > **Detailed Summary:** Create `src/domain/validation/catalog.ts`. 
  > - Define flat base schemas: `zodProduct`, `zodVariant`, `zodPhoto`, `zodCategory`.
  > - Define `zodCreateProductForm` and `tboxCreateProductBody`. **Crucially**, ensure TypeBox uses `t.File()` and Zod uses `zodFile`/`zodImage` to handle `multipart/form-data` uploads for product photos.
  > - Compose frontend API response shapes: `zodProductDetails` (combining Product with arrays of Variants and Photos) and wrap it using the shared `zodApiResponse`.

### 4. Transaction Domain Validation (Checkout Flows)
- [x] **Implement Transaction Forms & Responses**
  > **Detailed Summary:** Create `src/domain/validation/transactions.ts`. 
  > - Define distinct schemas for **Authenticated Checkout** (`zodAuthCheckoutForm`, `tboxAuthCheckoutBody` requiring user ID) and **Guest Checkout** (`zodGuestCheckoutForm`, `tboxGuestCheckoutBody` omitting user ID but requiring full PII).
  > - Define response shapes: `zodOrderDetails` (joining orders with order_snapshots) wrapped in standard API response shapes.
  > - Define review submission forms: `zodSubmitReviewForm` utilizing `zodRarity`.

### 5. Audit Domain Validation
- [x] **Implement Audit Log Responses**
  > **Detailed Summary:** Create `src/domain/validation/audit.ts`.
  > - Define `zodAuditLog` and `tboxAuditLog`.
  > - Compose a `zodAuditLogList` response using the shared `zodPaginatedResponse` wrapper to support the Admin Dashboard list view.

## IV. Critical Path & Dependencies
1. `shared.ts` (Enums and API Wrappers) MUST be completed first as all other domains depend on them for API response formatting.
2. Base schemas (flat entities) must be mapped out before composing complex nested responses.
3. Both Checkout flows (Auth vs Guest) must explicitly handle their respective edge cases regarding the nullable `customer_id`.

## V. Verification & Testing Mechanism (MANDATORY)

| Requirement | Verification Method | Pass Criteria |
| :--- | :--- | :--- |
| **API Wrappers** | Code Review | All endpoint responses utilize the `data/message` and `meta` (for pagination) wrapper structures. |
| **Checkout Parity** | Code Review | Explicitly separate `tboxGuestCheckout` and `tboxAuthCheckout` schemas exist. |
| **File Uploads** | Schema Validation | `tboxCreateProductBody` includes `t.File()` definitions; `zod` equivalent uses `zodImage`. |
| **Type Inference** | `tsc --noEmit` | The generated types (e.g. `typeProductDetails`) accurately represent nested JSON response objects without TS errors. |
