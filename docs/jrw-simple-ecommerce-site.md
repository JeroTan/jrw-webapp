# Product Requirements Document: JRW Simple E-commerce Site

**Version**: 1.3 (Final)
**Date**: 2026-04-28
**Author**: Sarah (Product Owner)
**Quality Score**: 100/100

---

## Executive Summary

JRW Simple E-commerce is a high-performance, scalable web application designed for selling apparel (T-shirts). Built on a modern edge-computing stack (Cloudflare Workers + Astro), it follows a "Technical Brutalist" design language: clean, authoritative, and data-driven.

The project aims to provide a "viable start" with a focus on transactional integrity via Durable Objects, automated PayMongo refunds, and a clear roadmap for Philippine logistics (COD integration).

---

## Brand & UI Identity (Google Stitch Spec)

- **Theme**: Technical Brutalism / Architectural Precision.
- **Colors**: Surface (#FFFFFF), Content (#0D1117), Accent (#3E96F4), Support Border (#E1E4E8).
- **Typography**: Satoshi (Heads), Space Mono (System Data/Body).
- **Shapes**: Strictly Sharp (0px border radius).
- **Layout**: 12-column modular grid defined by 1px grey borders.

---

## User Personas

### 1. Super-Admin (The Owner)

- **Role**: System owner.
- **Permissions**: Manage Admins. Seeded account (Email + Owner: true).

### 2. Admin (The Manager)

- **Role**: Store operator.
- **Permissions**: Product CRUD, manual stock, update order statuses (PENDING -> ON_THE_WAY -> FULFILLED/FAILED).

### 3. Customer & Visitor

- **Goals**: Frictionless purchase, real-time stock, order tracking.
- **Auth**: Google Sign-in (Customer) or Email-only (Visitor).

---

## Functional Requirements

### Core Features (Phase 1: MVP)

- **Catalog & Discovery**: Grid-based catalog with search, brand filtering, and tag badges (NEW/HOT).
- **Durable Checkout**: PayMongo integration (Card, GCash, Maya).
- **Stock Integrity**: Durable Objects to prevent overselling.
- **Automated Refunds**: Cancelled `PENDING` orders trigger automated PayMongo API refunds.
- **Notifications**: Resend integration for Admin (Low stock) and Customer (Order status).
- **Cancellation**: Users can cancel `PENDING` orders. `ON_THE_WAY` orders require contacting support.
- **Shipping Options**:
  - **Standard**: Economic fee, 1-3 days delivery (Nationwide).
  - **Next-Day**: Premium fee, guaranteed next-day delivery (Metro Manila/Luzon).

### UI Interaction Flows

1. **The Discovery Flow**: Landing -> Grid Scroll -> Product Click -> Side-panel Preview.
2. **The Precision Checkout**: Cart Drawer -> Delivery Info Form (Sharp Borders) -> PayMongo Modal -> Success Screen with Space Mono Receipt.
3. **The Admin Command**: Dashboard Overview -> Table Row Click -> Status Dropdown Update -> Automated Resend Email Trigger.

### Logistics & COD (Phase 2: Growth)

- **COD (Cash on Delivery)**: Enable COD for trusted regions (NCR/Luzon initially).
- **Courier Selection**: Flash Express (Automated) and LBC COP (Manual/Remote).
- **Coverage Handling**: 3-Tier Regional System (NCR/Luzon, Major Cities, Remote ODA).

---

## Technical & Legal Constraints

- **Compliance**: Adherence to the **Philippine Data Privacy Act of 2012**. Encryption of PII (Personally Identifiable Information) before persistence in Cloudflare D1.
- **Stack**: AstroJS + React + ElysiaJS + Cloudflare D1 + Drizzle ORM.
- **Infrastructure**: Cloudflare Workers + Durable Objects (Concurrency Control).
- **Performance**: Edge-first rendering; API response time < 200ms for stock checks.

---

## Delivery Information Fields

- Full Name
- Email & Phone Number
- Street Address / Unit No.
- Barangay
- City / Province
- Postal Code

---

## Risk Assessment

- **Risk**: Overselling. -> **Mitigation**: Durable Object `blockConcurrencyWhile()`.
- **Risk**: Data Breach. -> **Mitigation**: Cloudflare D1 with application/edge authorization, JWT verification, PII encryption, and environment secret rotation.
- **Risk**: Design Drift. -> **Mitigation**: Strict adherence to the `design-by-google-stitch.md` 1px grid system.

---

## Roadmap

### Phase 1: The Core (Current Focus)

- [x] Database Schema Design (Cloudflare D1 + Drizzle).
- [ ] Durable Object Stock Management Logic.
- [ ] PayMongo API Integration (v1).
- [ ] UI Implementation (Technical Brutalist Design).

### Phase 2: Logistics & COD

- [ ] COD checkout flow implementation.
- [ ] Courier API integration (Flash/Ninja Van).
- [ ] Shipping rate calculator per Philippine Region.
