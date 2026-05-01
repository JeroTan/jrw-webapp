# Security & Compliance Protocol: Portability First

## 1. Authentication & Identity
- **Mechanism**: JWT (JSON Web Token) using the **`jose`** library.
- **Provider Pattern**: Multi-Provider OAuth utilizing a one-to-many relationship between Customers and Identity Providers (Google, Facebook, etc.) alongside traditional Email/Password flows.
- **Protocol**: Strictly follows the **Identity Protocol** (`tangram/knowledge/security/identity-protocol.md`) for account linking, auto-merging, and data precedence.
- **Identity Layer**: Authentication is decoupled from the DB provider. Users are verified at the Edge using native WebCrypto before any database query is executed.
- **Why**: `jose` is edge-native, lightweight, and leverages WebCrypto for high performance on Cloudflare Workers.

## 2. Authorization Matrix (Strict Separation)
- **Edge-Enforced Authorization**: Since Cloudflare D1 (SQLite) does not support native RLS, all authorization logic is enforced at the Application/Edge layer via ElysiaJS middleware and Service-level guards.
- **Roles**:
    - **Super-Admin (Governance)**:
        - *Permissions*: Create, modify, and delete Admin accounts; View high-level system audit logs.
        - *Restriction*: Strictly prohibited from operational tasks (e.g., cannot modify product stock or fulfill orders) to maintain a separation of duties.
    - **Admin (Operations)**:
        - *Permissions*: Full CRUD on Products/Variants; Manage Order lifecycles and Fulfillment.
        - *Restriction*: Cannot access, modify, or delete any administrative account (Admin or Super-Admin).
    - **Customer/Visitor**:
        - *Permissions*: Read-only access to Catalog; CRUD access only to their own profile and order history (verified via JWT `sub` and manual ownership checks).

## 3. Data Protection (Compliance)
- **Encryption**: Application-level encryption for sensitive PII (Name, Address, Phone) using `jose` utilities before persistence.
- **Integrity**: Transactional snapshots (`OrderSnapshot`) preserve history even if source products are hard-deleted.
- **Hard Deletion**: Products are physically removed from the DB, but references in snapshots are preserved via `ON DELETE SET NULL`.

## 4. Super-Admin Security (The Root)
- **Identification**: The root "Owner" is identified by a specific environment variable (`SEED_ADMIN_EMAIL`) and a database-level `is_owner: true` check.
- **Protection**: The `is_owner` flag is immutable and cannot be modified by standard Admins.

## 5. Compliance
- **PH Data Privacy Act (2012)**: Strictly enforcing PII encryption at rest and minimizing data retention for guest checkouts. All data exports (if any) must be audit-logged.
