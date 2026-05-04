# Business Requirements Document (BRD)

## 1. User Personas & Roles

- **Super-Admin:** System Owner - Needs to manage administrative access and monitor system health.
- **Admin:** Store Operator - Needs to manage products, inventory, and fulfill customer orders.
- **Customer:** Registered User - Needs to purchase items quickly and track order history via Google Auth.
- **Visitor:** Guest User - Needs to purchase items without an account using Email-only checkout.

## 2. Functional Requirements (FR)

| ID    | Requirement          | Priority | Description                                                                     |
| ----- | -------------------- | -------- | ------------------------------------------------------------------------------- |
| FR-01 | Durable Stock Sync   | P0       | Real-time inventory locking via Durable Objects to prevent overselling.         |
| FR-02 | PayMongo Checkout    | P0       | Integrated payment gateway supporting Credit/Debit, GCash, and Maya.            |
| FR-03 | Automated Refunds    | P0       | System triggers PayMongo API refund automatically for cancelled PENDING orders. |
| FR-04 | Dual Shipping Mode   | P1       | Choice between Standard and Next-Day delivery with dynamic fee structures.      |
| FR-05 | Admin Command Center | P1       | CRUD interface for products with WYSIWYG support and order status management.   |
| FR-06 | Multi-Channel Alerts | P1       | Resend email triggers for low stock (Admin) and status updates (Customer).      |
| FR-07 | Product Discovery    | P1       | Search, brand filtering, and categorical tags (NEW/HOT) on a 1px grid.          |
| FR-08 | Pre-order Logic      | P1       | Ability to flag variants as "Pre-order" when stock is zero or not yet produced. |

## 3. Non-Functional Requirements (NFR)

- **Performance:** Sub-200ms API response time for stock-locking; edge-first rendering for the catalog.
- **Scalability:** Built on Cloudflare Workers to handle traffic spikes without manual server scaling.
- **Security:** Cloudflare D1 with application/edge-enforced authorization, JWT-based identity, and environment variable encryption.
- **Compliance:** Full adherence to the Philippine Data Privacy Act of 2012 (PII encryption at rest).
- **Aesthetic Integrity:** Strict adherence to 0px border radius and 1px "Architectural" border lines.

## 4. User Journey Summary

A Visitor arrives at the technical grid, filters for "NEW" T-shirts, and selects a variant. They proceed to a frictionless guest checkout where PayMongo handles the transaction and the Durable Object locks the stock immediately. Post-purchase, the user receives an automated receipt and tracking link via email.

## 5. Out of Scope

- Native Mobile Applications (Web-only for Phase 1).
- Automated returns for FULFILLED orders.
- International shipping/currency (PHP only).
- Cash on Delivery (Moved to Phase 2).
