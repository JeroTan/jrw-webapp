# Plan: Customer Identity Refactor (Feature 00004)

## I. Architectural Alignment
- **Domain-Driven Design (DDD)**: Logic resides in the `domain` layer; schema and validation are strictly separated from API concerns.
- **Identity Protocol**: Adheres to the mandates in `tangram/knowledge/security/identity-protocol.md` regarding auto-linking and data precedence.
- **Security Pillar**: Aligned with the edge-native JWT strategy defined in `tangram/design/security.md`.
- **Database Conventions**: Follows `snake_case` naming, plural table names, and `cuid2` identifiers established in Feature 00001.

## II. Data Model & Schema Changes

### 1. Update `customers` Table (`src/domain/schema/identity.ts`)
- Change `password_hash` to be nullable to support OAuth-only users.
- Add `avatar_url` (text, nullable) for UI profile picture storage.

### 2. Create `customer_providers` Table (`src/domain/schema/identity.ts`)
- `id`: primary key (cuid2).
- `customer_id`: foreign key to `customers.id` with `onDelete: "cascade"`.
- `provider`: text/enum (e.g., 'GOOGLE', 'FACEBOOK') - NOT NULL.
- `provider_user_id`: text (Unique identifier from the provider) - NOT NULL, UNIQUE.
- `metadata`: json (stores original provider snapshot).
- `created_at`: timestamp.

## III. Atomic Task List

### 1. Database Layer
- [x] **Refactor `customers` Schema**
  > **Detailed Summary:** Update `src/domain/schema/identity.ts` to make `password_hash` nullable and add the `avatar_url` column. Ensure types are exported correctly for Drizzle.
- [x] **Implement `customer_providers` Table**
  > **Detailed Summary:** Define the `customer_providers` table in `src/domain/schema/identity.ts` with a foreign key reference to `customers`. Ensure `provider_user_id` has a unique constraint.
- [x] **Generate and Apply Migration**
  > **Detailed Summary:** Run `npx drizzle-kit generate` and then apply the migration to the remote development D1 instance using `npx wrangler d1 migrations apply DB --remote --env development`.

### 2. Validation & Types Layer
- [x] **Create/Update Identity Validation**
  > **Detailed Summary:** Update `src/domain/validation/identity.ts` to reflect schema changes. Implement `zodCustomer`, `tboxCustomer`, and new schemas for `customer_providers`.
- [x] **Synchronize Inference Types**
  > **Detailed Summary:** Ensure `typeCustomer` and `typeCustomerProvider` are updated/created based on the Zod schemas for system-wide type safety.

## IV. Critical Path & Dependencies
1. **Schema Refactor**: Blocker for all validation and API logic.
2. **Validation Sync**: Required for any future Auth service implementation (Feature 00005+).

## V. Verification & Testing Mechanism (MANDATORY)

| Requirement | Verification Method | Pass Criteria |
| :--- | :--- | :--- |
| **Password Nullability** | Schema Check | `password_hash` is nullable in Drizzle and SQLite metadata. |
| **Provider Linking** | Migration Test | `customer_providers` exists with correct FK to `customers`. |
| **Unique Provider ID** | Constraint Test | Attempting to insert duplicate `provider_user_id` for the same provider fails. |
| **Type Integrity** | Static Analysis | `npx tsc --noEmit` passes with new schema and validation types. |
| **CUID2 Usage** | Code Review | All new `id` fields utilize the `createId()` default function. |
