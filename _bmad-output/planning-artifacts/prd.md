---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation-skipped
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
  - step-e-01-discovery
  - step-e-02-review
  - step-e-03-edit
inputDocuments:
  - "tangram/**/*.md"
  - "docs/**/*.md"
  - "package.json"
  - "src/**/*.ts"
documentCounts:
  productBriefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 84
  sourceFilesInspected: 54
workflowType: "prd"
workflowStatus: "complete"
workflow: "edit"
releaseMode: "phased"
projectName: "jrw-webapp"
userName: "MR. JRW"
createdDate: "2026-05-11"
completedAt: "2026-05-11"
lastEdited: "2026-05-13"
projectContext: "brownfield_rebuild_with_existing_tangram_docs_and_partial_api_implementation"
classification:
  projectType:
    primary: "web_app"
    secondary:
      - "api_backend"
  domain:
    primary: "single_store_ecommerce_with_brand_collaboration"
    bmadFallback: "general"
  complexity:
    bmadDomainComplexity: "low"
    operationalComplexity: "medium"
  projectContext: "brownfield_rebuild"
  classificationNotes:
    - "Existing Tangram docs and partial API implementation exist, but user wants a rebuild because current output is messy."
    - "Product returns to a single JRW store, not a multi-store marketplace."
    - "Product expands beyond apparel into lifestyle products and brand-organized catalog management."
    - "STORE_ADMIN is folded into ADMIN; admins may create, manage, join, or skip brands."
    - "Primary UI surfaces are admin dashboard and customer storefront."
editHistory:
  - date: "2026-05-11"
    changes: "Validation-guided edit: separated product requirements from architecture details, added measurable NFRs, added web/API project-type details, refined FRs, and preserved architecture handoff context."
  - date: "2026-05-11"
    changes: "Removed stale deleted-folder reference from PRD input documents; no product requirements changed."
---

# Product Requirements Document - jrw-webapp

**Author:** MR. JRW
**Date:** 2026-05-11

## Executive Summary

JRW Webapp is a brownfield rebuild of the current JRW Simple E-commerce codebase into a single-store commerce platform for JRW lifestyle products. The product expands beyond apparel into a broader catalog where Admins manage products, brands, inventory, pricing, storefront presentation, and order operations.

The rebuild keeps the useful product intent from Tangram and the current codebase while replacing scattered partial implementation with clear product boundaries: owner governance, admin operations, brand collaboration, customer identity, public storefront browsing, inventory-safe checkout, payment reconciliation, order fulfillment, and manual return/refund recording.

Primary users are Super Admin, Admin, Customer, and Prospect. `STORE_ADMIN` is not a separate active role; its responsibilities are folded into `ADMIN`. Super Admin owns platform governance and manages Admin accounts. Admins manage JRW catalog and operations. Customers register, verify email, optionally use Google sign-in, and purchase products. Prospects browse the storefront before registering or buying.

### What Makes This Special

Core differentiator is role-governed single-store commerce. JRW remains the only seller of record, while brands act as catalog organization and collaboration groups rather than stores, tenants, merchants, or payout owners.

Brand collaboration supports Admins who create or join brands and manage brand-scoped products without creating marketplace complexity. Products may also remain brandless when JRW does not need brand grouping.

The rebuild should favor correctness over feature pileup. Product rules must be explicit enough for downstream UX, architecture, epics, stories, and implementation agents to preserve identity, authorization, inventory, payment, and order safety.

## Project Classification

Project Type: `web_app` primary, with `api_backend` as a secondary lens.

Domain: single-store ecommerce for lifestyle products with optional brand collaboration.

Complexity: medium operational complexity because identity, RBAC, brand collaboration, storefront/customer UX, inventory safety, payments, email verification, OAuth, and admin dashboards must work together.

Project Context: brownfield rebuild. Existing Tangram docs and partial implementation provide useful architecture memory, but current source requires reorganization, completion, and product-level correction.

## Success Criteria

### User Success

Admin succeeds when they can access the dashboard, manage JRW products, optionally create or join brands, manage inventory/prices, and process orders without touching owner-only controls.

Brand-collaborating Admin succeeds when they can create a brand, join an existing brand when allowed, associate products with brands, and manage brand-scoped catalog work without creating separate stores.

Super Admin succeeds when one owner account can manage Admin accounts, transfer ownership when needed, and preserve platform control without becoming the daily operator.

Customer succeeds when they can register or use Google sign-in, verify email when needed, browse storefront content, purchase products, and track order status with low friction.

Prospect succeeds when they can browse public storefront content and product details before registering or buying.

### Business Success

MVP works when JRW can operate one real storefront safely, support lifestyle products beyond apparel, and use brands as catalog organization/collaboration rather than store tenancy.

Targets:
- Admin account creation/approval works end-to-end with email validation where registration is open.
- JRW storefront can be published and browsed publicly.
- Brands can be created, joined, skipped, and used to group products without affecting payment ownership.
- Brand members can see, add, and modify products inside brands they belong to.
- Customer can complete purchase flow with inventory-safe checkout.
- Admin can manage catalog, inventory, orders, and brand membership without direct database intervention.
- Super Admin remains unique, can create/manage Admins, and can transfer ownership to another eligible Admin while preserving exactly one owner.
- Single PayMongo merchant account can process JRW store payments because JRW is the seller of record.

### Technical Success

System succeeds when the rebuild produces clear product and implementation boundaries, not only working screens or endpoints.

Technical targets:
- RBAC enforces `SUPER_ADMIN`, `ADMIN`, `CUSTOMER`, and `PROSPECT`.
- `STORE_ADMIN` is treated as a deprecated alias or migration label for `ADMIN`, not an active separate role.
- Brand membership gates brand-scoped catalog collaboration without creating store tenancy.
- Admins can see, add, and modify products in brands where they are members; non-members need broader Admin permission or explicit membership.
- Email verification gates dashboard and customer trust flows.
- Admin approval or Super Admin creation gates dashboard access.
- Product, variant, inventory, payment, order, return, and refund states use explicit transition rules.
- Routes, UI, services, persistence, provider integrations, and domain rules have documented boundaries in the architecture artifact before broad implementation.
- API contracts, response envelopes, auth metadata, validation behavior, and error codes are documented before endpoint implementation is considered complete.
- Business rules are testable without HTTP transport, database persistence, third-party providers, or UI runtime.
- Tests cover domain/service rules before checkout, inventory, and admin dashboards depend on them.
- Source reorganization has a documented migration/deprecation plan for legacy API code.
- Cloudflare binding configuration is environment-scoped in `wrangler.jsonc`; D1, R2, and Durable Object binding commands must target the intended Wrangler environment explicitly.

### Measurable Outcomes

MVP complete when:
- Seed creates exactly one Super Admin.
- Super Admin can create Admin account.
- Super Admin can transfer ownership to another eligible Admin with confirmation and audit trail.
- Super Admin or authorized Admin can approve/reject verified Admin registration if open registration is enabled.
- Admin can create, join, or skip brand assignment.
- Brand member Admin can see, add, and modify products within that brand.
- Admin can add product, variant, image, stock, and price.
- Prospect can browse storefront and product details.
- Customer can register, verify email, use Google sign-in, and place order.
- Inventory cannot oversell during checkout under concurrent purchase attempts.
- Order statuses are visible to Admin and Customer.
- Unauthorized role/brand access returns a consistent forbidden response.
- Target architecture artifact is approved before broad coding and includes complete directory tree, architectural boundaries, requirements-to-structure mapping, integration points, file organization patterns, and validation/readiness checklist.

## Product Scope

### MVP - Minimum Viable Product

- Brownfield rebuild plan with explicit product, API, domain, UI, integration, and utility boundaries.
- Legacy API behavior either migrated or wrapped with a clear deprecation path.
- Seeded unique Super Admin.
- Admin management by Super Admin.
- Optional Admin self-registration with email verification and approval, if enabled.
- Customer registration with email verification.
- Google sign-in for customers.
- Brand creation, brand membership, and optional brandless catalog work.
- Product/category/brand/variant/image/inventory/price management.
- Public storefront browsing for Prospects.
- Customer cart, checkout, order creation, order status tracking.
- PayMongo payment integration for JRW customer purchases under the single JRW merchant account.
- Resend email verification and transactional emails.
- Role/brand authorization middleware or equivalent server-side enforcement.
- Audit logs for sensitive account, approval, brand, inventory, payment, return/refund, and order actions.
- Manual refund/return admin input.
- Request IDs, structured operational logs, and production error tracking gate before real customer payments when feasible.
- Complete target architecture artifact modeled after the BMAD reference output.

### Growth Features (Post-MVP)

- More advanced brand teams with invitations and approval rules.
- Storefront themes and customization.
- Advanced inventory adjustment logs.
- Promotions, coupons, and bundles.
- Product reviews and wishlists.
- Automated refund/return workflows.
- Shipping courier integrations and COD.
- Store analytics and sales reports.
- More OAuth providers.

### Vision (Future)

- Marketplace or multi-store expansion only if PayMongo Platforms/sub-merchant onboarding is adopted later.
- Multi-branch JRW operations.
- White-label store domains.
- Marketplace operating model only if marketplace model is adopted later.
- Advanced fulfillment integrations.
- Admin risk scoring for account approvals.

## User Journeys

### Journey 1: Admin Daily Catalog Work - Brand Optional

Mara is an Admin for JRW. She logs into the dashboard, creates a new product, assigns it to a category, optionally links it to a brand, adds variants, uploads images, sets stock, and publishes it.

If a product has no brand, it still works. Brand is an organization and collaboration layer, not store ownership.

The value moment happens when Mara publishes a lifestyle product without fighting the system structure. The product can live under a brand when collaboration matters, or stay brandless when JRW does not need brand grouping.

This journey reveals requirements for Admin dashboard, product CRUD, category management, optional brand assignment, image upload, variants, pricing, stock, publish status, and audit logs.

### Journey 2: Brand Collaboration - Create or Join Brand

Leo is an Admin. He creates a brand under JRW, invites another Admin, and both can see, add, and modify products assigned to that brand. Admins outside the brand cannot modify brand-scoped products unless they have elevated permission. Products can also remain brandless when brand grouping is unnecessary.

The value moment happens when brand collaboration improves catalog organization without creating marketplace complexity, separate stores, or separate merchant accounts.

This journey reveals requirements for brand creation, brand membership, brand-scoped permissions, brandless product support, product-to-brand association, and membership audit logs.

### Journey 3: Customer Purchase - JRW as Seller

Nina browses the JRW storefront as a Prospect, views product details, selects a variant, signs in with Google or email, verifies email if needed, pays through PayMongo, and tracks order status.

Payment goes to the single JRW PayMongo merchant account because JRW is the seller of record.

The value moment happens when Nina moves from browsing to purchase without confusion, and stock, payment, and order state remain clear.

This journey reveals requirements for storefront browsing, customer auth, email verification, Google OAuth, cart, PayMongo checkout, inventory lock, order creation, order status tracking, and transactional email.

### Journey 4: Super Admin Governance - Owner Controls Admins

The seeded Super Admin signs in, creates Admin accounts, suspends risky Admins, transfers ownership to another eligible Admin when needed, and keeps exactly one owner account. Super Admin can do Admin work only as fallback, not normal flow.

The value moment happens when JRW can change or secure platform operators without weakening the catalog and order workflow.

This journey reveals requirements for unique Super Admin seed, Admin CRUD, suspension/reactivation, ownership transfer, owner safeguards, role boundaries, and privileged audit logs.

### Journey 5: Rebuild Agent - Structure Prevents Drift

Developer or AI agent starts implementation from the PRD, validation report, Tangram history, current source, and architecture artifact. They preserve existing useful helpers, isolate business rules from transport/provider details, and follow the approved target structure instead of scattering new code across legacy folders.

The value moment happens when future implementation stops drifting because file structure, ownership, and responsibilities are explicit in architecture before broad coding starts.

This journey reveals requirements for architecture documentation, project context, directory tree, route/controller/service/repository boundaries, middleware composition, tests, and a legacy API migration plan.

### Journey Requirements Summary

The journeys reveal these capability areas:
- Roles: `SUPER_ADMIN`, `ADMIN`, `CUSTOMER`, `PROSPECT`.
- Deprecated role alias: `STORE_ADMIN` maps to `ADMIN`.
- Identity: email/password, email verification, Google OAuth.
- Governance: unique Super Admin, ownership transfer, Admin management, suspension/reactivation.
- Brands: create, join, skip, membership, product association, member product visibility/editing.
- Catalog: categories, brands, products, variants, images, prices, stock, publish state.
- Storefront: public browsing, product details, cart entry, customer conversion.
- Checkout: PayMongo single JRW merchant account, inventory safety, order creation.
- Orders: Admin fulfillment, Customer tracking.
- Returns/refunds: manual admin recording and customer-safe status.
- Architecture: approved rebuild structure, source migration plan, provider boundaries, tests, and project context.

## Domain-Specific Requirements

### Compliance & Regulatory

JRW is a single-store ecommerce merchant. JRW is seller of record for all customer payments. The product must not model third-party seller payouts in MVP.

Philippines privacy requirements:
- Collect only customer/admin data needed for registration, checkout, fulfillment, support, security, and audit.
- Show privacy notice before registration and checkout.
- Record consent where needed.
- Protect customer PII: email, name, phone, address, order history, and OAuth identity.
- Keep access logs and audit logs for sensitive account, order, and payment actions.
- Define retention rules for inactive accounts, orders, audit logs, and payment metadata.

Philippines ecommerce/consumer trust requirements:
- Storefront must show business/contact information, return/exchange policy, payment options, shipping/fulfillment terms, and complaint/contact path.
- Checkout must show final price, item details, fees, and policies before payment.
- Refund/cancellation policy must be clear before purchase.
- Production launch should verify DTI, Internet Transactions Act, and Trustmark obligations.

Payment and PCI requirements:
- Use PayMongo-hosted or PayMongo-controlled payment capture.
- JRW app must never collect raw card details.
- Webhooks must verify `Paymongo-Signature` before processing.
- Webhooks must be idempotent because PayMongo retries failed delivery.
- Payment events must map safely to internal order states.

### Technical Constraints

Payment state must be separate from order fulfillment state.

Recommended payment statuses:
- `PAYMENT_PENDING`
- `PAYMENT_PAID`
- `PAYMENT_FAILED`
- `PAYMENT_CANCELLED`
- `PAYMENT_REFUNDED`

Recommended order statuses:
- `ORDER_PLACED`
- `ORDER_PROCESSING`
- `ORDER_READY_TO_SHIP`
- `ORDER_SHIPPED`
- `ORDER_DELIVERED`
- `ORDER_CANCELLED`
- `ORDER_REFUNDED`

Recommended product statuses:
- `DRAFT`
- `PUBLISHED`
- `ARCHIVED`

Recommended inventory states:
- `IN_STOCK`
- `LOW_STOCK`
- `OUT_OF_STOCK`
- `PREORDER`

Manual return statuses:
- `RETURN_NOT_REQUESTED`
- `RETURN_REQUESTED`
- `RETURN_APPROVED`
- `RETURN_REJECTED`
- `RETURN_RECEIVED`

Manual refund statuses:
- `REFUND_NOT_REQUESTED`
- `REFUND_REQUESTED`
- `REFUND_APPROVED`
- `REFUND_REJECTED`
- `REFUND_COMPLETED`

Brand membership rules:
- Admin may create brand.
- Admin may join brand if invited/approved.
- Brand member Admin can see, add, and modify products assigned to that brand.
- Brandless products are visible/editable by authorized Admins.
- Brand is not payment owner, store owner, or merchant.

### Integration Requirements

PayMongo:
- Checkout/payment creation must use the single JRW merchant account.
- Webhook signature verification is mandatory before event processing.
- Webhook processing must be idempotent for duplicate provider events.
- Payment success page must reconcile payment state from JRW server, not only provider redirect parameters.
- Raw provider payload may be retained only for audit/reconciliation needs and must not be exposed in customer-facing errors.

Resend:
- Send email verification.
- Send password reset.
- Send Admin invitation or approval/rejection notices when enabled.
- Send order confirmation.
- Send payment success/failure.
- Send fulfillment status updates.

Google OAuth:
- Customer sign-in only for MVP unless Admin OAuth is approved later.
- Auto-link by verified email only when safe.
- Never overwrite local customer profile fields with provider data unless the local field is empty.
- OAuth errors must map to safe user-facing messages.

Product images:
- Product images require stable references that remain valid for current catalog display.
- Historical order snapshots must not break when product images change or are deleted later.
- Public image delivery must support optimized storefront performance targets.

Error tracking:
- Local/dev MVP can rely on provider/platform logs plus request IDs.
- Production MVP should enable configured error tracking before real customer payments if budget permits.
- Error tracking must cover unhandled API exceptions, payment webhook failures, checkout/payment reconciliation failures, auth/email verification failures, and image upload failures.
- Events must scrub secrets, tokens, raw payment payloads, and unnecessary PII.

### Risk Mitigations

Payment mismatch:
- Treat PayMongo webhook as source of truth for payment confirmation.
- Checkout success page must reconcile payment state from server.

Overselling:
- Use a documented inventory concurrency strategy before payment/order finalization.
- Failed payment must release reserved stock.

Brand permission leakage:
- Enforce brand membership server-side, not only in UI.
- Audit product changes with actor, brand, product, and safe before/after metadata.

PII leakage:
- Public errors never expose database/payment/OAuth details.
- Logs omit secrets, raw tokens, and unnecessary PII.

Marketplace drift:
- MVP must reject multi-seller payout assumptions.
- Future marketplace requires PayMongo Platforms or equivalent sub-merchant onboarding.

## Web App + API Backend Specific Requirements

### Project-Type Overview

JRW Webapp has two major surfaces: public customer storefront and protected admin dashboard. The API backend supports auth, brand collaboration, catalog, inventory, checkout, payment webhooks, orders, returns/refunds, audit, and observability.

The product is not a marketplace or B2B SaaS in MVP. JRW is the only store and seller of record.

### Browser & Rendering Requirements

Browser support matrix:
- Customer storefront: latest two stable versions of Chrome, Safari, Edge, and Firefox on mobile and desktop.
- Admin dashboard: latest two stable desktop versions of Chrome, Edge, Safari, and Firefox; tablet layouts must remain usable at 768px width and above.
- Minimum customer viewport: 320px width.
- Minimum admin viewport: usable at 768px width; narrow screens may use stacked layouts.
- Unsupported browsers must receive a safe degraded experience rather than a broken checkout path.

Rendering requirements:
- Public storefront and product detail pages must expose crawlable product metadata.
- Interactive cart, checkout, dashboard tables/forms, inventory controls, and order management may load as enhanced interactive surfaces.
- Customer storefront must prioritize mobile scan, product inspection, cart update, and checkout completion.
- Admin dashboard targets desktop/tablet work patterns and must still support critical actions on smaller screens.

### SEO Strategy

- Storefront home, category, product detail, and policy pages must have unique titles, descriptions, canonical URLs, and social preview metadata.
- Product detail pages must include product name, description, price display, availability, primary image, and brand/category metadata where available.
- Unpublished, archived, out-of-stock-only admin previews, and customer account/order pages must not be indexed.
- Product slugs must remain stable after publication unless redirected.
- Public pages must avoid blocking primary product content behind client-only interaction.

### Authentication Model

- `SUPER_ADMIN`: seeded owner, manages Admins, and can transfer ownership to another eligible Admin.
- `ADMIN`: manages JRW catalog, brands, inventory, prices, orders, and manual return/refund records.
- `CUSTOMER`: registered buyer using email/password or Google sign-in.
- `PROSPECT`: anonymous storefront browser.
- `STORE_ADMIN`: deprecated alias migrated to `ADMIN`.
- Admin dashboard access requires Super Admin creation or approved/verified Admin registration if enabled.
- Customer email verification gates trusted checkout/account flows.
- Ownership transfer must preserve exactly one owner, require deliberate confirmation, require current Super Admin re-authentication or password confirmation, require an active eligible target Admin, record an audit trail, and demote the old owner to Admin unless explicitly disabled.

### API Endpoint Areas

Required route groups and endpoint expectations:

- `auth`: login, logout, customer registration, Admin registration when enabled, email verification, password reset, Google OAuth callback, session inspection.
- `admin`: Admin account management, approval/rejection, suspension/reactivation, ownership transfer, dashboard session.
- `brands`: brand create/read/update/archive, membership list, invitation, join request, approval/rejection, member removal.
- `catalog`: categories, products, variants, product images, publish/archive, brand assignment.
- `inventory`: stock updates, stock state, reservation, release, reconciliation.
- `checkout`: cart validation, payment creation, order creation, checkout status lookup.
- `payments`: PayMongo webhook verification and reconciliation.
- `orders`: customer order tracking, Admin order list/detail, fulfillment transitions, cancellation/refund state display.
- `returns-refunds`: manual return/refund status changes, reason, amount, notes, reference ID, history.
- `assets`: product image upload, replacement, listing, and retrieval metadata.
- `audit`: sensitive action history for authorized actors.

Each implemented endpoint must define:
- Auth mode and allowed roles.
- Required path/query/body fields.
- Success response envelope.
- Error response envelope and error codes.
- Rate limit class.
- Audit event behavior when sensitive.
- Idempotency behavior when mutation can be retried.

### Data & Schema Summary

Public API responses use camelCase. Persistent database naming may use implementation-specific conventions, but API contracts must stay stable for UI and external integrations.

Core entity groups:
- Account: Super Admin/Admin/Customer identity, email verification state, approval state, suspension state, provider links, profile fields.
- Brand: brand profile, archived state, membership, invitation/join request, member role within brand.
- Catalog: category, product, product status, product-brand association, variant, price, image reference, storefront visibility.
- Inventory: stock quantity, stock state, reservation, release/reconciliation record.
- Checkout: cart validation result, checkout attempt, payment creation result, inventory reservation result.
- Order: order header, order item snapshot, fulfillment status, payment status, customer-safe status.
- Return/refund: manual status, reason, amount, notes, reference ID, actor, timestamps.
- Audit: actor, action, target type/id, safe metadata, request ID, timestamp.

Required response envelopes:
- Success: `{ data, meta }`
- Error: `{ error: { code, message, details } }`

### Error Code Catalog

Required error codes:
- `AUTH_REQUIRED`: request needs authenticated actor.
- `AUTH_FORBIDDEN`: actor lacks required role or permission.
- `EMAIL_NOT_VERIFIED`: email verification required before action.
- `ADMIN_APPROVAL_REQUIRED`: Admin account awaits approval.
- `ACCOUNT_SUSPENDED`: account cannot access protected workflow.
- `BRAND_MEMBERSHIP_REQUIRED`: actor lacks brand membership or elevated permission.
- `VALIDATION_FAILED`: request data failed contract validation.
- `RESOURCE_NOT_FOUND`: requested resource does not exist or is not visible to actor.
- `CONFLICT_STATE`: requested transition conflicts with current resource state.
- `INVENTORY_UNAVAILABLE`: stock unavailable or reservation failed.
- `PAYMENT_REQUIRED`: payment required before order can proceed.
- `PAYMENT_FAILED`: provider or reconciliation marked payment failed.
- `WEBHOOK_INVALID_SIGNATURE`: webhook signature check failed.
- `IDEMPOTENCY_CONFLICT`: retry payload conflicts with prior idempotent request.
- `RATE_LIMITED`: request exceeded rate limit.
- `PROVIDER_UNAVAILABLE`: third-party provider unavailable or timed out.
- `INTERNAL_ERROR`: unexpected server failure with safe public message.

### Rate Limits

MVP rate limit classes:
- Auth password attempts: max 5 failed attempts per 15 minutes per account/email and source IP.
- Email verification/password reset requests: max 3 requests per hour per email.
- Customer checkout/payment creation: max 10 attempts per 10 minutes per customer or source IP.
- Admin write actions: max 60 mutation requests per minute per Admin.
- Product image uploads: max 30 uploads per hour per Admin and max configured file size from architecture.
- Public catalog reads: max 120 requests per minute per source IP before throttling or cache-first response.
- Webhooks: signature verification required; duplicate valid events are idempotent and must not create duplicate orders/payments.

### Data & Response Requirements

- Success and error response envelopes are mandatory for all API endpoints.
- Errors must include stable `code`, safe `message`, and optional structured `details`.
- Customer-facing errors must not expose database, payment provider, OAuth, or internal stack details.
- API contract documentation must cover every implemented endpoint before that endpoint is considered complete.
- Endpoint documentation must include params, query, body, responses, tags, summaries, descriptions, auth metadata, rate limit class, and error codes.

### Performance & Reliability

- Storefront usable initial load target: under 2.5 seconds on typical mobile 4G at p75, measured by Lighthouse or WebPageTest profile.
- Product detail primary content should render before non-critical scripts and target LCP under 2.5 seconds at p75.
- Admin actions must show visible feedback within 300ms and complete normal mutation response within 1 second at p95 under MVP expected load.
- Checkout payment/order reconciliation should complete within 5 seconds at p95 after provider confirmation under normal conditions.
- API list endpoints must use pagination with default page size 20 and maximum page size 100 unless architecture documents a stricter limit.
- Product image delivery must use optimized sizes/formats with product-list images targeting <= 250KB and product-detail primary images targeting <= 1MB after processing.
- Inventory reservation/release must prevent overselling under concurrent checkout tests.

### Architecture Handoff Notes

This PRD defines product requirements. Downstream architecture must translate these requirements into concrete file structure, frameworks, runtime choices, data migrations, provider wrappers, and test layout.

Architecture must explicitly address:
- Current source inventory, including user-added server app entrypoint, API bridge, existing helper libraries, utility helpers, validation schemas, and legacy API folders.
- Target source tree and ownership boundaries.
- Route -> controller -> service -> domain/repository flow or approved equivalent.
- Third-party integration wrappers for PayMongo, Resend, Google OAuth, product image storage, error tracking, and cryptography.
- API contract strategy and generated/readable docs.
- Database migration strategy for development and production.
- Wrangler environment and binding strategy for development and production, including explicit environment selection for D1/R2/Durable Object commands.
- Inventory concurrency strategy.
- Request ID, structured logging, and error tracking propagation.
- Testing strategy for domain rules, API contracts, auth/authorization, inventory, payment webhooks, and checkout.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

MVP approach: platform foundation plus first sellable JRW storefront.

The goal is not every ecommerce feature. The goal is clean product boundaries, safe payments, safe inventory, working admin catalog, public storefront, checkout, order tracking, and manual return/refund records.

Resource requirements:
- One full-stack engineer/agent can build in story slices.
- Extra design/QA help improves speed but is not required.
- Payment and auth work must receive higher review/testing than UI-only work.

### MVP Feature Set (Phase 1)

Core user journeys supported:
- Admin manages JRW catalog and optional brands.
- Brand member Admin sees, adds, and modifies products under a brand.
- Customer browses and buys from JRW.
- Super Admin manages Admins and transfers ownership.
- Developer/agent follows approved architecture and avoids drift.

Must-have capabilities:
- Target architecture artifact before broad coding.
- Legacy API migration/deprecation path.
- Unique Super Admin seed.
- Super Admin Admin CRUD.
- Super Admin ownership transfer.
- Admin dashboard auth.
- Customer registration, email verification, and Google sign-in.
- Brand CRUD and membership.
- Brand-scoped product access.
- Product/category/brand/variant/image/stock/price CRUD.
- Public storefront and product details.
- Cart and checkout.
- PayMongo single-merchant payment flow.
- PayMongo webhook verification/idempotency.
- Inventory safety/reservation.
- Order creation and status tracking.
- Manual refund/return admin input.
- Admin can mark order/item as return requested, returned, refund requested, refunded, or rejected.
- Admin can enter refund/return reason, amount, notes, and reference ID.
- Refund/return actions must be audit logged.
- MVP does not automatically issue PayMongo refunds unless explicitly added later.
- Resend transactional emails.
- Audit logs.
- Request IDs and structured logs.
- Configured production error tracking before real payments if feasible.

### Post-MVP Features

Phase 2:
- Automated PayMongo refund flow.
- Customer self-service return/refund request.
- Return shipping/courier workflow.
- Advanced inventory adjustment history.
- Promotions, coupons, and bundles.
- Product reviews and wishlist.
- Storefront customization.
- Store analytics/reporting.
- Shipping fee/rate rules.

Phase 3:
- COD and courier integrations.
- Multi-branch JRW operations.
- More OAuth providers.
- White-label/storefront domain.
- Marketplace or multi-store only if PayMongo Platforms or equivalent is adopted.

### Risk Mitigation Strategy

Technical risks:
- Payment/order mismatch: PayMongo webhook is source of truth and reconciliation is idempotent.
- Overselling: inventory version, reservation, or concurrency lock protects checkout.
- Role leakage: server-side guards and tests enforce permissions.
- Architecture drift: architecture artifact and project context must exist before implementation spreads.

Market risks:
- Too broad lifestyle catalog: launch with small curated product set.
- Customer trust: show clear business information, return policy, payment status, and order tracking.

Resource risks:
- If scope tightens, defer customization, analytics, reviews, coupons, COD, courier integrations, and automated refund.
- Do not defer auth, payment safety, inventory safety, order tracking, manual refund/return records, or role boundaries.

## Functional Requirements

### Roles, Accounts & Access

- FR1: Super Admin can authenticate as the unique platform owner.
- FR2: Super Admin can create, update, suspend, reactivate, and inspect Admin accounts.
- FR3: Super Admin can transfer ownership to another eligible Admin while preserving exactly one owner.
- FR4: Admin can authenticate and access the admin dashboard after account activation.
- FR5: Customer can register with email/password.
- FR6: Customer can verify email address.
- FR7: Customer can sign in with Google.
- FR8: Customer can manage basic profile fields: display name, phone number, default delivery/contact details, and email preference where supported.
- FR9: Prospect can browse public storefront without account.
- FR10: System can treat `STORE_ADMIN` as deprecated alias migrated to `ADMIN`.
- FR11: System can enforce role permissions for Super Admin, Admin, Customer, and Prospect.

### Brands & Collaboration

- FR12: Admin can create a brand under JRW.
- FR13: Admin can update and archive a brand.
- FR14: Admin can join a brand through invitation or approval.
- FR15: Admin can invite another Admin to a brand.
- FR16: Brand member Admin can view products assigned to that brand.
- FR17: Brand member Admin can add products to that brand.
- FR18: Brand member Admin can modify products assigned to that brand.
- FR19: Authorized Admin can manage brandless products.
- FR20: System can prevent non-members from modifying brand-scoped products unless they have elevated permission.

### Catalog & Inventory

- FR21: Admin can create, update, archive, and view product categories.
- FR22: Admin can create, update, archive, and view products.
- FR23: Admin can assign products to zero or one brand.
- FR24: Admin can assign products to categories.
- FR25: Admin can create, update, archive, and view product variants.
- FR26: Admin can upload and manage product images.
- FR27: Admin can set product and variant prices.
- FR28: Admin can update stock quantities.
- FR29: Admin can mark products or variants as draft, published, or archived.
- FR30: Admin can mark inventory as in stock, low stock, out of stock, or preorder.
- FR31: System can preserve product/order snapshots needed for order history.

### Storefront & Customer Shopping

- FR32: Prospect can view JRW storefront.
- FR33: Prospect can browse product categories.
- FR34: Prospect can view product details, images, prices, variants, and availability.
- FR35: Customer can add available variants to cart.
- FR36: Customer can update cart item quantities.
- FR37: Customer can remove cart items.
- FR38: System can block unavailable variants from checkout.
- FR39: Customer can submit checkout for cart items.
- FR40: Customer can view order confirmation after checkout.

### Payments & Checkout

- FR41: System can create PayMongo payment for JRW customer purchase.
- FR42: System can process PayMongo payment success, failure, cancellation, and refund-related events.
- FR43: System can verify PayMongo webhook authenticity.
- FR44: System can process payment webhooks idempotently.
- FR45: System can separate payment status from fulfillment status.
- FR46: System can reconcile payment state before finalizing order state.
- FR47: System can reserve or validate inventory during checkout.
- FR48: System can release reserved inventory after failed or cancelled payment.

### Orders, Fulfillment, Returns & Refunds

- FR49: Customer can view own order status.
- FR50: Admin can view order list.
- FR51: Admin can view order details.
- FR52: Admin can move order through valid fulfillment statuses.
- FR53: System can reject invalid order status transitions.
- FR54: Admin can record manual return status for an order or item.
- FR55: Admin can record manual refund status for an order or item.
- FR56: Admin can enter refund/return reason, amount, notes, and reference ID.
- FR57: System can retain manual refund/return history.
- FR58: System can show customer-safe order, payment, return, and refund status using documented public labels that hide provider/internal details.

### Notifications

- FR59: System can send customer email verification.
- FR60: System can send password reset email.
- FR61: System can send Admin invitation or approval email when enabled.
- FR62: System can send order confirmation email.
- FR63: System can send payment success/failure email.
- FR64: System can send fulfillment status update email.

### Audit, Observability & Operations

- FR65: System can record audit logs for account, ownership transfer, brand, catalog, inventory, payment, refund/return, and order actions.
- FR66: Admin can view authorized audit/activity history for account, brand, catalog, inventory, order, payment, and return/refund events within their permission scope.
- FR67: System can generate request IDs for API requests.
- FR68: System can log operational failures with safe context: request ID, actor role, safe actor identifier, target resource identifier, error code, and timestamp.
- FR69: System can send production error events to configured error tracking when enabled.
- FR70: System can scrub secrets, tokens, payment payloads, and unnecessary PII from logs/error events.

### Architecture & Documentation

- FR71: System can expose machine-readable API contract documentation for implemented endpoints.
- FR72: System can provide consistent success and error response envelopes.
- FR73: Project can maintain architecture artifact with directory tree, boundaries, and requirements-to-structure mapping.
- FR74: Project can provide a migration or deprecation plan for legacy API behavior before broad rebuild implementation.

## Non-Functional Requirements

### Performance

- Public storefront initial usable load must be under 2.5 seconds at p75 on typical mobile 4G as measured by Lighthouse or WebPageTest mobile profile.
- Product detail pages must render primary product content before non-critical interactive scripts and target LCP under 2.5 seconds at p75 on typical mobile 4G.
- Admin dashboard mutations must show visible client feedback within 300ms and complete normal server response within 1 second at p95 under MVP expected load.
- Checkout payment/order reconciliation must complete within 5 seconds at p95 after PayMongo confirmation under normal provider availability.
- API list endpoints must paginate with default page size 20 and maximum page size 100 unless architecture documents a stricter limit.
- Product-list images must target <= 250KB after optimization, and product-detail primary images must target <= 1MB after optimization.

### Security & Privacy

- All protected dashboard actions must enforce server-side role authorization with automated tests covering allowed and denied paths for each role.
- Brand-scoped product actions must enforce server-side brand membership or elevated permission with automated tests for member, non-member, and elevated Admin cases.
- Password storage must use salted hashing with a secret pepper and pass architecture-approved verification tests for correct password, wrong password, and rotated configuration failure handling.
- Email verification tokens must expire within 24 hours; password reset tokens within 30 minutes; OAuth state values within 10 minutes; all token values must provide at least 128 bits of entropy.
- Automated log/event tests or review checklist must verify raw passwords, JWTs, OAuth tokens, PayMongo secrets, raw card data, and unnecessary PII are not emitted.
- JRW app must not collect raw card details; payment capture must use PayMongo-hosted or PayMongo-controlled flow.
- PayMongo webhooks must reject unsigned or invalid-signature requests before any state mutation.
- Customer PII fields must be documented, minimized to registration/checkout/fulfillment/support needs, and covered by retention rules before production launch.
- Ownership transfer must require deliberate confirmation and record an audit trail for actor, target Admin, old role, new role, timestamp, and request ID.

### Reliability & Data Integrity

- Inventory reservation/validation must prevent overselling in a concurrent checkout test with at least 100 simultaneous attempts for the same limited-stock variant.
- Failed or cancelled payment must release reserved stock within 5 minutes or through a documented reconciliation job.
- Payment state and order fulfillment state must be stored and displayed separately.
- PayMongo webhook processing must be idempotent: duplicate valid events must not duplicate orders, payments, inventory movements, or emails.
- Order, payment, refund, return, and inventory transitions must reject invalid state changes with `CONFLICT_STATE`.
- Product/order snapshots must preserve purchased product name, variant, price, quantity, and image reference available at purchase time.
- Manual refund/return history must retain actor, status, reason, amount, notes, reference ID, and timestamps for every change.

### Accessibility

- Customer storefront and checkout must meet WCAG 2.2 AA contrast expectations as measured by automated accessibility scan plus manual review for key flows.
- Primary customer touch targets must be at least 44px by 44px on mobile layouts.
- Forms must have visible labels and field-level errors for every required input.
- Order, payment, refund, return, and inventory statuses must use text labels and not rely on color alone.
- Dashboard forms, tables, and order actions must support keyboard navigation for create, edit, submit, cancel, and status update flows.
- Motion and animated transitions must respect `prefers-reduced-motion`.

### Integration

- PayMongo failures, timeouts, and reconciliation mismatches must map to safe user-facing errors and logged operational events with request ID.
- Transactional email sends must return success/failure status within 2 seconds at p95 under normal provider availability; failures must be logged and retryable where the action is still valid.
- Google OAuth callback must validate state, verify email where provided, and reject unsafe account linking.
- Product image changes must not break historical order snapshots.
- Configured error tracking must be environment-gated and must scrub secrets, tokens, raw payment payloads, and unnecessary PII before event submission.
- External provider failures must map to `PROVIDER_UNAVAILABLE`, `PAYMENT_FAILED`, or another documented safe error code.

### Observability

- Every API request must have a request ID visible in logs and error responses where safe.
- Critical failures must log safe context: request ID, actor role, safe actor identifier when available, target resource identifier, error code, and timestamp.
- Production MVP should not accept real customer payments until unhandled API exceptions, payment webhook failures, checkout/payment reconciliation failures, auth/email verification failures, and image upload failures are captured by configured logging/error tracking.
- Operational logs must avoid secrets, tokens, raw payment payloads, and unnecessary PII.
- Audit logs must be queryable by authorized Admins for account, ownership transfer, brand, catalog, inventory, payment, refund/return, and order actions.

### Maintainability & Architecture

- Business rules must be testable without HTTP transport, database persistence, third-party providers, or UI runtime; domain rule tests must cover roles, brand membership, inventory transitions, order transitions, payment reconciliation, and return/refund transitions.
- Transport/adapters must not contain business rules; architecture review must define the accepted boundary and code review must reject new violations.
- Provider-specific behavior must stay behind documented integration boundaries so provider failures can be tested with mocks/fakes.
- API contract documentation must cover 100% of implemented endpoints before release.
- Contract drift must be caught by automated tests, generated docs diff, or manual release checklist before deployment.
- Existing helpers and utilities must be inventoried before replacement to avoid duplicate abstractions.
