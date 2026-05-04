# Feature Backlog & System Requirements

## 1. User Personas & Needs

- **Super-Admin (Owner):** Needs absolute oversight of the administrative team and system-wide security (Admin creation/deletion).
- **Admin (Operators):** Need high-efficiency interfaces for stock adjustments, order status updates, and catalog curation.
- **Customers & Visitors:** Need a high-speed, "Architectural" interface that provides real-time availability and frictionless payment.

## 2. Core Functional Requirements

- **Durable Inventory Management:** Utilize Cloudflare Durable Objects to provide an atomic "Source of Truth" for stock levels during checkout.
- **Pre-order Management:** Allow variants to be flagged for Pre-order, bypassing the "Zero Stock" block but still utilizing Durable Objects for "Max Pre-order" limits.
- **Localized Payment Processing:** Full integration with PayMongo API for e-wallets and cards.
- **Automated Refund Trigger:** Logic to detect PENDING cancellations and initiate the PayMongo Refund API.
- **Transactional Snapshotting (The Receipt Rule):** When an order is placed, the system MUST replicate the product's "Minimum Meta" (Name, Brand, Price at time of purchase, Variant) into a persistent `OrderSnapshot` table.
- **Hard Delete with Snapshot Retention:** Admins can physically delete products from the catalog. The system MUST set the `product_id` to NULL in history records, but the duplicated metadata in the `OrderSnapshot` MUST remain immutable.
- **Architectural Product Catalog:** A server-side rendered (Astro) grid with client-side (React) filtering/search logic based on the 1px grid design.
- **Transactional Email Suite:** Event-driven notifications via Resend for stock alerts and order lifecycles.

## 3. Recommended Additions (Proactive Backlog)

- **Stock Reconciliation Logic:** A background routine to verify that D1 DB stock counts perfectly match the Durable Object "Lock" state.
- **Admin Audit Trail:** A read-only log tracking which Admin updated which product or order status.
- **ODA (Out-of-Delivery-Area) Detection:** Proactive UI warning if a customer provides a postal code identified as a remote provincial area.
- **Inventory Adjustment Logs:** Tracking "Why" stock was manually changed (e.g., "Damaged Stock", "Restock").

## 4. Structural Models

- **Key Data Entities:** User, Product, ProductVariant, Order, OrderSnapshot (The immutable metadata copy), TransactionHistory, AuditLog.
- **Critical Order States:**
  - `PENDING`: Waiting for payment, preparing item, or verifying inventory.
  - `FAILED`: Terminal failure (Payment failed, User cancelled, Seller declined).
  - `ON_THE_WAY`: In transit or out for delivery.
  - `FULFILLED`: Final delivery state confirmed and completed.

## 5. Sprint Implementation Roadmap (Dynamic Checklist)

### Sprint 1: Foundation & Security

- [x] **Database Schema**: Implement D1 tables with `ON DELETE SET NULL` for `product_id` references in history.
- [x] **Auth Architecture**: Implement Multi-provider Identity Schema (Google, Facebook, etc.) alongside Email/Password flows, with account linking support as per Identity Protocol.
- [x] **API Contract Surface**: Define Elysia route contracts, TypeBox request/response schemas, and controller/service wiring with intentional mocks.
- [x] **Admin Login Implementation**: Replace the mock admin login with real D1 lookup, password verification, and JWT generation.
- [ ] **Durable Object Setup**: Initialize the Stock-Locking DO with `blockConcurrencyWhile` logic.
- [ ] **Authorization Middleware**: Implement JWT verification, admin/customer route guards, and service-level ownership checks.

### Sprint 2: Catalog & Command Center

- [ ] **Admin Product CRUD**: Feature-based module for managing products, variants, and images.
- [ ] **Pre-order Toggle**: Implement "Allow Pre-order" flag and "Expected Release Date" in product management.
- [ ] **The Architectural Grid**: 12-column Astro grid with 1px borders and Satoshi/Space Mono typography.
- [ ] **WYSIWYG Integration**: Toast UI editor for Markdown descriptions.

### Sprint 3: The Transactional Core

- [ ] **Metadata Replication Service**: Logic to snapshot product info into `OrderSnapshot` upon payment.
- [ ] **Cart & Stock Locking**: React-based cart that locks DO stock items upon checkout initiation.
- [ ] **PayMongo Integration**: Secure payment source creation and webhook handler.
- [ ] **Automated Refund Engine**: Logic to handle PENDING -> CANCELLED reversals.

### Sprint 4: Logistics & Notifications

- [ ] **Email Service**: Resend integration for all transactional triggers.
- [ ] **Order Tracking UI**: Customer/Visitor view for monitoring their lifecycle state.
- [ ] **Admin Fulfillment View**: Interface for moving orders through their lifecycle.

### Sprint 5: Refinement & Audit

- [ ] **Stock Reconciliation Tool**: Admin tool to sync DB and DO states.
- [ ] **Audit Logging**: Implement persistent logging for all administrative actions.
- [ ] **Performance Polish**: Final optimization for sub-200ms API response times.

## 6. Verification Notes

- **Completeness**: Audit and Transaction integrity are secured via metadata replication, even after hard product deletion.
- **Verifiability**: Each sprint is verifiable via TDD or manual QA of the "Architectural" design standards.

## 7. Current Stage Notes

- The active codebase is at Feature `00007_admin_login`.
- Mock service methods remain intentional for unimplemented domains.
- Durable Object stock-locking, PayMongo checkout, Resend email, storefront UI, and admin UI are future feature work.
