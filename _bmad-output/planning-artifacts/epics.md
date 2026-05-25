---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
  - "_bmad-output/project-context.md"
workflowType: "epics-and-stories"
workflowStatus: "complete"
projectName: "jrw-webapp"
userName: "MR. JRW"
createdDate: "2026-05-11"
lastUpdated: "2026-05-24"
completedAt: "2026-05-12"
---

# jrw-webapp - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for jrw-webapp, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Super Admin can authenticate as the unique platform owner.

FR2: Super Admin can create, update, suspend, reactivate, and inspect Admin accounts.

FR3: Super Admin can transfer ownership to another eligible Admin while preserving exactly one owner.

FR4: Admin can authenticate and access the admin dashboard after account activation.

FR5: Customer can register with email/password.

FR6: Customer can verify email address.

FR7: Customer can sign in with Google.

FR8: Customer can manage basic profile fields: display name, phone number, default delivery/contact details, and email preference where supported.

FR9: Prospect can browse public storefront without account.

FR10: System can treat `STORE_ADMIN` as deprecated alias migrated to `ADMIN`.

FR11: System can enforce role permissions for Super Admin, Admin, Customer, and Prospect.

FR12: Admin can create a brand under JRW.

FR13: Admin can update and archive a brand.

FR14: Admin can join a brand through invitation or approval.

FR15: Admin can invite another Admin to a brand.

FR16: Brand member Admin can view products assigned to that brand.

FR17: Brand member Admin can add products to that brand.

FR18: Brand member Admin can modify products assigned to that brand.

FR19: Authorized Admin can manage brandless products.

FR20: System can prevent non-members from modifying brand-scoped products unless they have elevated permission.

FR21: Admin can create, update, archive, and view product categories.

FR22: Admin can create, update, archive, and view products.

FR23: Admin can assign products to zero or one brand.

FR24: Admin can assign products to categories.

FR25: Admin can create, update, archive, and view product variants.

FR26: Admin can upload and manage product images.

FR27: Admin can set product and variant prices.

FR28: Admin can update stock quantities.

FR29: Admin can mark products or variants as draft, published, or archived.

FR30: Admin can mark inventory as in stock, low stock, out of stock, or preorder.

FR31: System can preserve product/order snapshots needed for order history.

FR32: Prospect can view JRW storefront.

FR33: Prospect can browse product categories.

FR34: Prospect can view product details, images, prices, variants, and availability.

FR35: Customer can add available variants to cart.

FR36: Customer can update cart item quantities.

FR37: Customer can remove cart items.

FR38: System can block unavailable variants from checkout.

FR39: Customer can submit checkout for cart items.

FR40: Customer can view order confirmation after checkout.

FR41: System can create PayMongo payment for JRW customer purchase.

FR42: System can process PayMongo payment success, failure, cancellation, and refund-related events.

FR43: System can verify PayMongo webhook authenticity.

FR44: System can process payment webhooks idempotently.

FR45: System can separate payment status from fulfillment status.

FR46: System can reconcile payment state before finalizing order state.

FR47: System can reserve or validate inventory during checkout.

FR48: System can release reserved inventory after failed or cancelled payment.

FR49: Customer can view own order status.

FR50: Admin can view order list.

FR51: Admin can view order details.

FR52: Admin can move order through valid fulfillment statuses.

FR53: System can reject invalid order status transitions.

FR54: Admin can record manual return status for an order or item.

FR55: Admin can record manual refund status for an order or item.

FR56: Admin can enter refund/return reason, amount, notes, and reference ID.

FR57: System can retain manual refund/return history.

FR58: System can show customer-safe order, payment, return, and refund status using documented public labels that hide provider/internal details.

FR59: System can send customer email verification.

FR60: System can send password reset email.

FR61: System can send Admin invitation or approval email when enabled.

FR62: System can send order confirmation email.

FR63: System can send payment success/failure email.

FR64: System can send fulfillment status update email.

FR65: System can record audit logs for account, ownership transfer, brand, catalog, inventory, payment, refund/return, and order actions.

FR66: Admin can view authorized audit/activity history for account, brand, catalog, inventory, order, payment, and return/refund events within their permission scope.

FR67: System can generate request IDs for API requests.

FR68: System can log operational failures with safe context: request ID, actor role, safe actor identifier, target resource identifier, error code, and timestamp.

FR69: System can send production error events to configured error tracking when enabled.

FR70: System can scrub secrets, tokens, payment payloads, and unnecessary PII from logs/error events.

FR71: System can expose machine-readable API contract documentation for implemented endpoints.

FR72: System can provide consistent success and error response envelopes.

FR73: Project can maintain architecture artifact with directory tree, boundaries, and requirements-to-structure mapping.

FR74: Project can provide a migration or deprecation plan for legacy API behavior before broad rebuild implementation.

FR75: Project can maintain identity-realm boundary documentation and regression tests that prevent customer-facing code from querying Admin account storage and prevent Admin auth code from querying Customer account storage.

FR76: Admin resource pages can provide searchable, responsive browse controls with appropriate card/list/table views so records are digestible without losing dense operational scanning.

FR77: Project can maintain component-level UI specifications for shared shell, navigation, footer, toolbar, view toggle, search, card/list/table, loading, empty, and permission patterns.

FR78: Project can maintain Tailwind utility-first UI implementation rules so feature-specific styling stays visible in markup, uses JRW brand theme tokens, and avoids one-off `jrw-*` runtime class layers.

FR79: Project can enforce approved UX design-direction fidelity for shared buttons, product cards, storefront layout-preserving changes, admin auth entry points, admin dashboard shell, and future UI stories before marking UI work done.

### NonFunctional Requirements

NFR1: Public storefront initial usable load must be under 2.5 seconds at p75 on typical mobile 4G as measured by Lighthouse or WebPageTest mobile profile.

NFR2: Product detail pages must render primary product content before non-critical interactive scripts and target LCP under 2.5 seconds at p75 on typical mobile 4G.

NFR3: Admin dashboard mutations must show visible client feedback within 300ms and complete normal server response within 1 second at p95 under MVP expected load.

NFR4: Checkout payment/order reconciliation must complete within 5 seconds at p95 after PayMongo confirmation under normal provider availability.

NFR5: API list endpoints must paginate with default page size 20 and maximum page size 100 unless architecture documents a stricter limit.

NFR6: Product-list images must target <= 250KB after optimization, and product-detail primary images must target <= 1MB after optimization.

NFR7: All protected dashboard actions must enforce server-side role authorization with automated tests covering allowed and denied paths for each role.

NFR8: Brand-scoped product actions must enforce server-side brand membership or elevated permission with automated tests for member, non-member, and elevated Admin cases.

NFR9: Password storage must use salted hashing with a secret pepper and pass architecture-approved verification tests for correct password, wrong password, and rotated configuration failure handling.

NFR10: Email verification tokens must expire within 24 hours; password reset tokens within 30 minutes; OAuth state values within 10 minutes; all token values must provide at least 128 bits of entropy.

NFR11: Automated log/event tests or review checklist must verify raw passwords, JWTs, OAuth tokens, PayMongo secrets, raw card data, and unnecessary PII are not emitted.

NFR12: JRW app must not collect raw card details; payment capture must use PayMongo-hosted or PayMongo-controlled flow.

NFR13: PayMongo webhooks must reject unsigned or invalid-signature requests before any state mutation.

NFR14: Customer PII fields must be documented, minimized to registration/checkout/fulfillment/support needs, and covered by retention rules before production launch.

NFR15: Ownership transfer must require deliberate confirmation and record an audit trail for actor, target Admin, old role, new role, timestamp, and request ID.

NFR16: Inventory reservation/validation must prevent overselling in a concurrent checkout test with at least 100 simultaneous attempts for the same limited-stock variant.

NFR17: Failed or cancelled payment must release reserved stock within 5 minutes or through a documented reconciliation job.

NFR18: Payment state and order fulfillment state must be stored and displayed separately.

NFR19: PayMongo webhook processing must be idempotent: duplicate valid events must not duplicate orders, payments, inventory movements, or emails.

NFR20: Order, payment, refund, return, and inventory transitions must reject invalid state changes with `CONFLICT_STATE`.

NFR21: Product/order snapshots must preserve purchased product name, variant, price, quantity, and image reference available at purchase time.

NFR22: Manual refund/return history must retain actor, status, reason, amount, notes, reference ID, and timestamps for every change.

NFR23: Customer storefront and checkout must meet WCAG 2.2 AA contrast expectations as measured by automated accessibility scan plus manual review for key flows.

NFR24: Primary customer touch targets must be at least 44px by 44px on mobile layouts.

NFR25: Forms must have visible labels and field-level errors for every required input.

NFR26: Order, payment, refund, return, and inventory statuses must use text labels and not rely on color alone.

NFR27: Dashboard forms, tables, and order actions must support keyboard navigation for create, edit, submit, cancel, and status update flows.

NFR28: Motion and animated transitions must respect `prefers-reduced-motion`.

NFR29: PayMongo failures, timeouts, and reconciliation mismatches must map to safe user-facing errors and logged operational events with request ID.

NFR30: Transactional email sends must return success/failure status within 2 seconds at p95 under normal provider availability; failures must be logged and retryable where the action is still valid.

NFR31: Google OAuth callback must validate state, verify email where provided, and reject unsafe Customer-realm account linking without querying Admin account storage.

NFR32: Product image changes must not break historical order snapshots.

NFR33: Configured error tracking must be environment-gated and must scrub secrets, tokens, raw payment payloads, and unnecessary PII before event submission.

NFR34: External provider failures must map to `PROVIDER_UNAVAILABLE`, `PAYMENT_FAILED`, or another documented safe error code.

NFR35: Every API request must have a request ID visible in logs and error responses where safe.

NFR36: Critical failures must log safe context: request ID, actor role, safe actor identifier when available, target resource identifier, error code, and timestamp.

NFR37: Production MVP should not accept real customer payments until unhandled API exceptions, payment webhook failures, checkout/payment reconciliation failures, auth/email verification failures, and image upload failures are captured by configured logging/error tracking.

NFR38: Operational logs must avoid secrets, tokens, raw payment payloads, and unnecessary PII.

NFR39: Audit logs must be queryable by authorized Admins for account, ownership transfer, brand, catalog, inventory, payment, refund/return, and order actions.

NFR40: Business rules must be testable without HTTP transport, database persistence, third-party providers, or UI runtime; domain rule tests must cover roles, brand membership, inventory transitions, order transitions, payment reconciliation, and return/refund transitions.

NFR41: Transport/adapters must not contain business rules; architecture review must define the accepted boundary and code review must reject new violations.

NFR42: Provider-specific behavior must stay behind documented integration boundaries so provider failures can be tested with mocks/fakes.

NFR43: API contract documentation must cover 100% of implemented endpoints before release.

NFR44: Contract drift must be caught by automated tests, generated docs diff, or manual release checklist before deployment.

NFR45: Existing helpers and utilities must be inventoried before replacement to avoid duplicate abstractions.

### Additional Requirements

- Use existing Cloudflare Astro foundation; do not scaffold a fresh project over current work.
- First implementation story must reconcile `src/server/app.ts` and `src/pages/api/[...slug].ts`, remove outdated route drift, and treat current `src/api/**` as migration source only.
- Canonical backend home is `src/server/**`; Astro API catch-all remains thin bridge into Elysia.
- API flow must follow Route -> Controller -> Service -> Domain/Repository.
- D1 plus Drizzle is relational source of truth; migrations are remote-first with development before production review.
- Wrangler bindings for D1, R2, and Durable Objects are environment-scoped under `env.development` and `env.production`; scripts using bindings must pass the intended `--env`.
- TypeBox/Elysia schemas drive route contracts and OpenAPI; Zod remains for forms and non-Elysia parsing.
- Browser authentication must use secure HttpOnly cookies backed by server-side session records.
- `jose` token helpers remain approved for email verification, password reset, OAuth state, and signed short-lived internal tokens.
- RBAC and brand membership must be enforced server-side, not only in UI.
- Durable Object plus optimistic stock versioning must coordinate inventory reservation and release.
- PayMongo integration must use single JRW merchant account, signature-verified webhooks, and idempotent webhook mutation.
- R2 image references must remain stable, and order snapshots must preserve purchased product state.
- Standard API envelopes are mandatory: `{ data, meta }` for success or `{ error: { code, message, details? } }` for failure.
- Vitest domain/service tests are required before risky auth, payment, inventory, RBAC, ownership transfer, or webhook work is marked complete.
- Frontend uses Astro pages plus React feature islands.
- UI uses local primitives and JRW Stitch tokens, not a full external component library.
- Payment, fulfillment, return, refund, inventory, and product status must remain separate.
- Manual return/refund records are admin operations, not automated PayMongo refund execution.
- Error tracking is environment-gated; Cloudflare logs and request IDs are MVP baseline.
- Schema work must cover roles, verification, approval, brands, brand memberships, status separation, reservations, payments, webhook events/idempotency keys, returns/refunds, and audit logs.
- New money fields use integer centavos.
- API JSON uses camelCase; database uses snake_case; controllers/services map rows to DTOs.
- Events use lower dot names such as `order.status_changed` and `payment.webhook_processed`.
- Webhook events require an idempotency key before mutation.
- Audit events must include actor, action, entity, entityId, safe details, timestamp, and request ID.
- Server state is authority for auth, cart checkout, inventory, payment, and order status; checkout/payment/order updates are not optimistic.
- Domain/services return `AppResult`/`GeneralError`; controllers adapt results to public API envelopes.
- Provider adapters normalize provider failures before services consume them.
- Validate before provider calls, inventory mutation, payment handoff, and state transitions.
- Co-locate pure domain/service tests as `*.test.ts`; shared fixtures live in `src/test/fixtures/**`.
- Feature UI belongs under `src/features/<feature>/**`; shared primitives belong under `src/components/**`; business rules belong under `src/domain/**`.
- Infrastructure adapters belong under `src/adapter/infrastructure/**`; third-party wrappers belong under `src/lib/**`; provider-free atomic helpers belong under `src/utils/**`.
- Story 1.3 must establish API contract, endpoint catalog, and legacy migration baselines before broad feature implementation.
- Story 1.4 must establish table-by-table D1 migration plan, CI workflow command, deployment runbook, observability setup checklist, and retention/privacy checklist before broad feature implementation.
- All agents must read `_bmad-output/project-context.md` and architecture before coding.

### UX Design Requirements

UX-DR1: Implement JRW Technical Brutalist design tokens: white/background/content/muted/border/strong-border/cobalt/error/status colors, Satoshi identity headings, Space Mono body/system labels, 0px radius, 1px borders, no shadows, no blur, no decorative gradients, and restrained cobalt for focus/selected/primary/live states.

UX-DR2: Build shared primitive components with JRW tokens: `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Checkbox`, `Toggle`, `Badge`, `StatusBadge`, `Tabs`, `SegmentedControl`, `DataTable`, `Modal`, `Drawer`, `SidePanel`, `Toast`, `ConfirmDialog`, `EmptyState`, `Skeleton`, `Pagination`, and `Stepper`.

UX-DR3: Implement storefront product discovery with modular product grid, strong product imagery, category/filter/search controls, product metadata, availability text, cart access, and desktop/mobile feature parity.

UX-DR4: Implement `ProductCard` with image module, product name, brand/category, price, availability badge, quick action, loading image state, unavailable states, and accessible product link.

UX-DR5: Implement `ProductDetailPanel` as desktop side panel or full detail page and mobile full-screen sheet/page with gallery, heading, brand/category, price, description, variants, stock, add-to-cart, selected/unavailable variant states, and keyboard-accessible variant controls.

UX-DR6: Implement `CartDrawer` for desktop and sticky cart/action behavior for mobile with line items, quantity controls, price, stock warnings, subtotal, empty state, stale inventory state, checkout blocking, focus trap, and focus restoration.

UX-DR7: Implement staged checkout using `CheckoutSteps`: cart, delivery/contact, payment, confirmation, blocked state, payment pending/failed states, error summary, and `aria-current` for current step.

UX-DR8: Implement `OrderReceipt` with receipt-style order number, items, totals, payment status, fulfillment status, next action, and states for payment pending, paid, failed, and reconciliation delayed.

UX-DR9: Implement customer-safe `OrderTimeline` with separate payment, fulfillment, return, and refund status lanes, timestamps, safe labels, and color-independent status text.

UX-DR10: Implement `DashboardShell` with sidebar, top context bar, role badge, active brand scope, action/search region, admin and Super Admin scope states, forbidden/loading states, skip link, landmarks, and keyboard navigation.

UX-DR11: Implement admin resource browsing patterns: dense tables for operational datasets, responsive cards for digestible resource overviews, search/filter toolbars, view toggles where useful, status bands, side panels, stable skeletons, row/card drill-in, visible request ID where safe, and no decorative card-heavy dashboard layout.

UX-DR12: Implement `ProductEditor` with identity, media, brand, categories, variants, pricing, inventory, publish status, draft/dirty/saving/validation/publish-blocked/saved states, field labels, error summary, and keyboard save support.

UX-DR13: Implement `VariantMatrix` for SKU/options, price, stock, status, bulk actions, empty state, duplicate option state, low-stock/archived state, table semantics, and keyboard row actions.

UX-DR14: Implement `InventoryAdjuster` pattern for stock quantity/state changes with validation, conflict feedback, audit-ready reason where needed, and rollback messaging for stale inventory.

UX-DR15: Implement `BrandMemberTable` and brand membership views showing members, pending invites, brand-scoped products, brandless clarity, and catalog/collaboration language only.

UX-DR16: Implement admin `OrderStatusPanel` with payment, fulfillment, return, and refund lanes, valid next actions only, disabled action reasons, pending update state, conflict rollback, and customer-safe status labels.

UX-DR17: Implement `ReturnRefundRecorder` with type, status, amount, reason, notes, reference ID, actor, timestamp, validation error, confirmation before save, and wording that avoids implying automated PayMongo refunds.

UX-DR18: Implement `OwnershipTransferDialog` with target Admin eligibility check, consequences, confirmation phrase, password re-entry, final action, ineligible/ready/confirming/failed/complete states, focus trap, and audit-safe language.

UX-DR19: Enforce brand language in UI: use "brand", "catalog group", and "brand members"; never use seller, merchant, tenant, store owner, or payout owner for brands.

UX-DR20: Implement feedback patterns: routine save toast, inline confirmation for checkout/payment/ownership/return-refund records, field-level errors, form-level error summaries, customer-safe errors, admin request ID when safe, and warnings before irreversible or high-impact actions.

UX-DR21: Implement loading and conflict patterns with stable dimensions, button pending states, skeletons for product grid/tables/order timeline, stale cart update messaging, and invalid order transition rollback with allowed next action.

UX-DR22: Implement form patterns with visible labels, required markers, inline errors, stable-width save buttons, dirty-state protection for admin editors, short checkout-focused forms, and email verification prompts only when needed.

UX-DR23: Implement navigation patterns: storefront header with logo/categories/search/cart/account, customer account navigation for orders/profile/verification/sign out, admin sidebar for Dashboard/Products/Brands/Inventory/Orders/Customers/Audit/Settings, and separate owner-only Admin Accounts/Ownership Transfer/Audit group.

UX-DR24: Implement overlay patterns for cart drawer, admin side panels, mobile sheets, confirmation modals, ownership transfer, manual return/refund, and image preview with focus trap, focus restore, Escape/back behavior for non-destructive overlays, and explicit destructive action.

UX-DR25: Implement empty/recovery states for no products, no brands, no orders, no audit events, empty storefront category, payment failed, payment pending, inventory unavailable, forbidden role/brand access, upload failure, and provider unavailable.

UX-DR26: Implement status labels for payment, fulfillment, return, and refund exactly as safe public labels: Payment Pending/Paid/Failed/Cancelled/Refunded; Fulfillment Placed/Processing/Ready to Ship/Shipped/Delivered/Cancelled/Refunded; Return Not Requested/Requested/Approved/Rejected/Received; Refund Not Requested/Requested/Approved/Rejected/Completed.

UX-DR27: Enforce dense-but-readable spacing: badges/status labels above titles need at least 12px bottom spacing, titles above descriptive copy need at least 16px bottom spacing in dashboard cards, timelines, panels, and governance modules.

UX-DR28: Implement responsive storefront rules for 320px through wide desktop: mobile 1-2 column grid, tablet 2-4 column grid, desktop 12-column system, compact mobile filters, desktop rich filters, sticky mobile action bars, and no stretched-mobile desktop layout.

UX-DR29: Implement responsive admin rules: desktop-first dense tables and side panels, tablet usability at 768px and above, row-card collapse where needed, side panels as full-screen panels on narrow viewports, and stable fixed-format UI dimensions.

UX-DR30: Implement accessibility foundation: WCAG 2.2 AA contrast, 44px touch targets for storefront/checkout/mobile controls, visible focus, keyboard access for grids/filters/cart/checkout/tables/forms/dialogs/order actions, associated field errors, focus-managed modals/drawers/side panels, reduced motion, and no color-only status.

UX-DR31: Add UX QA requirements for storefront widths 320, 375, 390, 430, 768, 1024, and 1440px; checkout mobile/tablet/desktop; dashboard tablet/desktop/wide desktop; sticky bar non-overlap; text non-overflow in product cards, badges, buttons, titles, tables, and cells.

UX-DR32: Add accessibility QA requirements: automated axe or equivalent scan for core pages, keyboard-only walkthrough for storefront, checkout, admin product editor, order detail, and ownership transfer, screen reader spot check for statuses/errors/dialogs/drawers, contrast check for status badges, and reduced-motion check.

UX-DR33: Add performance UX QA requirements: storefront usable load under 2.5s p75, product images sized to target, checkout feedback visible within 300ms, and admin mutation feedback visible within 300ms.

UX-DR34: Define and implement shared component-level specs for DashboardShell, SidebarNav, TopBar, Footer, PageToolbar, SearchInput, ViewToggle, ResourceCard, ResourceList, DataTable, EmptyState, and Skeleton so future admin/storefront work reuses consistent primitives.

UX-DR35: Enforce approved HTML direction fidelity before UI stories are done: Button/IconButton hover and focus use 2px cobalt outline with 2px offset, storefront product cards match Direction 01 without removing accepted layout, admin shell/auth pages match Direction 05 and Direction 07, and every future UI story cites the exact UX direction reference it implements.

### FR Coverage Map

FR1: Epic 1 - Super Admin unique-owner authentication.

FR2: Epic 1 - Super Admin Admin account management.

FR3: Epic 1 - Super Admin ownership transfer with single-owner safeguard.

FR4: Epic 1 - Admin authentication and activated dashboard access.

FR5: Epic 1 - Customer email/password registration.

FR6: Epic 1 - Customer email verification.

FR7: Epic 1 - Customer Google sign-in.

FR8: Epic 1 - Customer basic profile management.

FR9: Epic 1 - Prospect anonymous access model for public browsing.

FR10: Epic 1 - `STORE_ADMIN` migration/alias handling to `ADMIN`.

FR11: Epic 1 - Role permission enforcement for Super Admin, Admin, Customer, and Prospect.

FR11A: Epic 2.5 - Admin and Customer identity realm separation across auth routes, cookies, repositories, and recovery flows.

FR12: Epic 2 - Admin brand creation.

FR13: Epic 2 - Admin brand update/archive.

FR14: Epic 2 - Admin brand join via invitation or approval.

FR15: Epic 2 - Admin brand invitations.

FR16: Epic 2 - Brand member product visibility.

FR17: Epic 2 - Brand member product creation.

FR18: Epic 2 - Brand member product modification.

FR19: Epic 2 - Authorized Admin brandless product management.

FR20: Epic 2 - Brand-scoped non-member modification prevention.

FR21: Epic 3 - Product category management.

FR22: Epic 3 - Product management.

FR23: Epic 3 - Optional product brand assignment.

FR24: Epic 3 - Product category assignment.

FR25: Epic 3 - Product variant management.

FR26: Epic 3 - Product image upload and management.

FR27: Epic 3 - Product and variant pricing.

FR28: Epic 3 - Stock quantity updates.

FR29: Epic 3 - Product/variant publish state.

FR30: Epic 3 - Inventory state management.

FR31: Epic 3 - Product/order snapshot preservation.

FR32: Epic 4 - Public JRW storefront.

FR33: Epic 4 - Public category browsing.

FR34: Epic 4 - Product detail, image, price, variant, and availability browsing.

FR35: Epic 4 - Customer add-to-cart for available variants.

FR36: Epic 4 - Cart quantity updates.

FR37: Epic 4 - Cart item removal.

FR38: Epic 4 - Checkout blocking for unavailable variants.

FR39: Epic 5 - Customer checkout submission.

FR40: Epic 5 - Checkout order confirmation.

FR41: Epic 5 - PayMongo payment creation for JRW purchases.

FR42: Epic 5 - PayMongo success/failure/cancellation/refund-related event processing.

FR43: Epic 5 - PayMongo webhook authenticity verification.

FR44: Epic 5 - Idempotent payment webhook processing.

FR45: Epic 5 - Payment status separated from fulfillment status.

FR46: Epic 5 - Payment state reconciliation before final order state.

FR47: Epic 5 - Inventory reservation/validation during checkout.

FR48: Epic 5 - Reserved inventory release after failed/cancelled payment.

FR49: Epic 6 - Customer own-order status view.

FR50: Epic 6 - Admin order list.

FR51: Epic 6 - Admin order detail.

FR52: Epic 6 - Valid fulfillment status progression.

FR53: Epic 6 - Invalid order transition rejection.

FR54: Epic 6 - Manual return status recording.

FR55: Epic 6 - Manual refund status recording.

FR56: Epic 6 - Refund/return reason, amount, notes, and reference ID capture.

FR57: Epic 6 - Manual refund/return history retention.

FR58: Epic 6 - Customer-safe order, payment, return, and refund labels.

FR59: Epic 1 - Customer email verification notification.

FR60: Epic 1 - Password reset email.

FR61: Epic 1 - Admin invitation or approval email.

FR62: Epic 5 - Order confirmation email.

FR63: Epic 5 - Payment success/failure email.

FR64: Epic 6 - Fulfillment status update email.

FR65: Epic 7 - Audit logs for sensitive account, brand, catalog, inventory, payment, refund/return, and order actions.

FR66: Epic 7 - Authorized audit/activity history viewing.

FR67: Epic 7 - API request ID generation.

FR68: Epic 7 - Safe operational failure logging.

FR69: Epic 7 - Production error event submission when enabled.

FR70: Epic 7 - Secret/token/payment payload/PII log scrubbing.

FR71: Epic 1 - Machine-readable API contract documentation.

FR72: Epic 1 - Consistent API success/error envelopes.

FR73: Epic 1 - Architecture artifact maintenance.

FR74: Epic 1 - Legacy API migration/deprecation plan.

FR75: Epic 2.5 - Identity realm boundary documentation and regression tests.

FR76: Epic 3.0 - Searchable responsive admin resource browser patterns.

FR77: Epic 3.0 - Component-level UI specifications for shared shell, navigation, footer, toolbar, resource views, loading, empty, and permission patterns.

FR78: Epic 1.5 / Epic 3.0 / Epic 4 - Tailwind utility-first UI implementation guardrails with JRW brand tokens and no one-off runtime class layers.

FR79: Epic 3.10 / Epic 3.11 / Epic 4.8 / Epic 4.9 / Epic 4.10 - Approved UX design-direction fidelity gate for admin shell/auth, storefront product cards, shared button behavior, and future UI stories.

## Epic List

### Epic 1: Trusted Access, Governance, and Rebuild Guardrails

Users can sign in safely, owner/admin/customer roles work, email flows exist, legacy API drift is contained, and implementation agents have stable API/documentation boundaries.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR59, FR60, FR61, FR71, FR72, FR73, FR74

### Epic 2: Brand Collaboration for JRW Catalog Work

Admins can create, join, invite, and manage brand-scoped catalog collaboration without turning brands into stores/sellers.

**FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20

### Epic 2.5: Identity Realm Separation Hardening

Admin and Customer accounts remain separate legal/security realms before catalog, storefront, checkout, and audit scope expand.

**FRs covered:** FR11A, FR75; reinforces FR1, FR2, FR4, FR5, FR7, FR8, FR11, FR60, FR65, FR66, FR68

### Epic 3: Catalog, Product Media, and Inventory Operations

Admins can manage categories, products, variants, images, prices, stock, publish states, and order-safe product snapshots.

**FRs covered:** FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR76, FR77, FR79

### Epic 4: Product-First Storefront and Cart

Prospects browse JRW storefront, inspect products, understand availability, and customers manage cart before checkout.

**FRs covered:** FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR78, FR79

### Epic 5: Inventory-Safe Checkout and PayMongo Payments

Customers submit checkout, inventory is reserved/validated, PayMongo payment state reconciles safely, webhooks are verified/idempotent, and payment emails send.

**FRs covered:** FR39, FR40, FR41, FR42, FR43, FR44, FR45, FR46, FR47, FR48, FR62, FR63

### Epic 6: Orders, Fulfillment, Returns, Refunds, and Customer Status

Customers and Admins can track orders; Admins can progress fulfillment and record manual return/refund history with safe customer labels.

**FRs covered:** FR49, FR50, FR51, FR52, FR53, FR54, FR55, FR56, FR57, FR58, FR64

### Epic 7: Audit, Activity, Request IDs, and Safe Operations

Sensitive actions are auditable, authorized Admins can view activity, request IDs/logging/error tracking work, and secrets/PII stay scrubbed.

**FRs covered:** FR65, FR66, FR67, FR68, FR69, FR70

## Epic 1: Trusted Access, Governance, and Rebuild Guardrails

Users can sign in safely, owner/admin/customer roles work, email flows exist, legacy API drift is contained, and implementation agents have stable API/documentation boundaries.

### Story 1.1: Brownfield Server Migration and Minimal Reformat

As a developer/agent,
I want canonical API code under `src/server/**` with thin Astro bridging and migrated useful brownfield patterns,
So that future auth, catalog, checkout, and admin stories build on stable architecture without route drift.

**Requirements covered:** FR73, FR74; supports FR71, FR72.

**Acceptance Criteria:**

**Given** current brownfield API code exists in `src/api/**`, `src/server/app.ts`, and `src/pages/api/[...slug].ts`
**When** server migration is completed
**Then** `src/server/app.ts` is canonical Elysia app composer
**And** `src/pages/api/[...slug].ts` only injects Astro request context and delegates to `createApp().handle(request)`.

**Given** architecture requires `src/server/**` ownership
**When** folders are reconciled
**Then** target server folders exist: `context`, `routes`, `controllers`, `services`, `repositories`, `middleware`, `dto`, `openapi`
**And** new backend work has documented home under those folders.

**Given** current `src/api/**` contains usable route/controller/container patterns
**When** migration is done
**Then** useful patterns are moved or wrapped into `src/server/**`
**And** stale/mock/outdated route names are not treated as current JRW behavior.

**Given** `src/api/**` is deprecated brownfield scaffolding
**When** migration notes are written
**Then** document states which pieces moved, which remain frozen, and which should be removed later
**And** no future story depends on adding new code under `src/api/**`.

**Given** architecture requires Route -> Controller -> Service -> Domain/Repository
**When** migrated server code is reviewed
**Then** route modules contain transport contracts/composition only
**And** business rules are not placed in route handlers.

**Given** architecture requires minimal formatting churn
**When** files are changed
**Then** only touched files are reformatted
**And** no broad repo-wide prettier/reformat pass occurs.

**Given** TypeScript/Astro validation exists
**When** story implementation finishes
**Then** `npm run check` passes or failures are documented with exact blocker
**And** no unrelated user changes are reverted.

**Given** story outputs are reviewed
**When** implementation is accepted
**Then** `src/server/app.ts`, `src/pages/api/[...slug].ts`, target `src/server/**` folders, and migration notes are present
**And** the output summary lists changed files and any remaining `src/api/**` freeze/removal candidates.

### Story 1.2: API Foundation, Envelopes, Request Context, and Operational Hooks

As a developer/agent and API consumer,
I want consistent API envelopes, stable request context, safe operational logging, and typed audit/event hooks,
So that completed endpoints behave predictably and sensitive future stories do not invent response, logging, or audit shapes.

**Requirements covered:** FR72, FR67; supports FR65, FR68, FR70, FR71.

**Acceptance Criteria:**

**Given** server routes return successful responses
**When** a completed endpoint responds
**Then** response shape is `{ data, meta }`
**And** `meta.requestId` is included when request context has one.

**Given** server routes return errors
**When** validation, auth, conflict, provider, or internal failures occur
**Then** response shape is `{ error: { code, message, details? } }`
**And** public messages do not expose DB errors, provider payloads, stacks, secrets, or tokens.

**Given** request enters API through Astro bridge
**When** Elysia handles request
**Then** request context reads `x-request-id` or generates request ID
**And** typed context exposes request ID to controllers/services without global mutable state.

**Given** successful or failed API actions need operational visibility
**When** safe logging hooks are added
**Then** log context supports request ID, actor role, safe actor identifier, target resource identifier, error code where applicable, and timestamp
**And** logs reject or scrub secrets, tokens, raw provider payloads, cookies, passwords, and unnecessary PII.

**Given** sensitive future stories need audit behavior before Epic 7 viewing exists
**When** audit/event foundation is added
**Then** a typed audit event interface or port exists for account, brand, catalog, inventory, payment, refund/return, and order actions
**And** future sensitive stories must record or enqueue audit events through this interface instead of deferring audit semantics to Epic 7.

**Given** TypeBox/Elysia contracts are required
**When** API response helpers are added or reconciled
**Then** `src/lib/api/response.ts` and `src/lib/typebox/api.ts` support standard success/error schema reuse
**And** route contracts can describe params, query, body, responses, tags, auth metadata, rate-limit class, and error codes.

**Given** legacy/mock handlers may still exist
**When** completed endpoints are reviewed
**Then** they do not return legacy `{ data, message, code }` shape
**And** any remaining legacy/mock endpoint is marked migration-only, not accepted completion.

**Given** architecture requires Route -> Controller -> Service -> Domain/Repository
**When** envelope helpers are used
**Then** controllers adapt service/domain results into public envelopes
**And** response helpers contain no business rules.

**Given** validation exists
**When** story implementation finishes
**Then** response envelope, request ID, safe log context, and audit interface examples or tests cover success and error paths
**And** `npm run check` passes or blocker is documented.

**Given** story outputs are reviewed
**When** implementation is accepted
**Then** response helper example/test, request ID propagation example/test, safe log context example/test, and audit event interface example/test are present
**And** the output summary identifies where future stories must import or call those helpers.

### Story 1.3: API Contract Documentation and Legacy Migration Baseline

As a developer/agent,
I want machine-readable API contract documentation, endpoint catalog baseline, and explicit legacy migration notes,
So that future endpoint stories know current contracts, auth metadata, errors, endpoint ownership, and deprecated paths.

**Requirements covered:** FR71, FR73, FR74; supports NFR43, NFR44.

**Acceptance Criteria:**

**Given** Elysia route contracts exist under `src/server/**`
**When** OpenAPI setup is completed
**Then** implemented endpoints expose machine-readable API docs
**And** docs include params, query, body, responses, tags, summaries, descriptions, auth metadata, rate-limit class, and documented error codes where endpoint is considered complete.

**Given** route modules define contracts
**When** new endpoint stories add or modify routes
**Then** contracts use TypeBox/Elysia schemas
**And** reusable response schemas come from `src/lib/typebox/api.ts`.

**Given** legacy API files exist under `src/api/**`
**When** migration notes are written
**Then** notes list migrated, wrapped, frozen, and removal-candidate modules
**And** notes warn that new backend/API work belongs under `src/server/**`.

**Given** MVP route groups are known
**When** endpoint catalog baseline is written
**Then** each route group has a table row for known or planned method/path, owning story, auth mode, roles, rate-limit class, primary DTO/schema, error codes, and implementation status
**And** later feature stories must update the catalog when endpoints are added or changed.

**Given** `src/server/app.ts` had outdated route drift
**When** docs are reviewed
**Then** outdated scaffold routes are identified or removed
**And** current JRW route naming follows plural kebab-case nouns.

**Given** API docs may expose sensitive areas
**When** docs are generated
**Then** docs show public contract metadata only
**And** no secrets, tokens, raw provider payloads, or environment values appear.

**Given** architecture requires endpoint-level API contract table
**When** baseline API contract and migration documentation are created
**Then** initial contract/migration document exists as baseline
**And** later feature stories can extend it per endpoint.

**Given** validation exists
**When** story implementation finishes
**Then** `npm run check` passes or blocker is documented
**And** docs generation route/build path is documented.

**Given** story outputs are reviewed
**When** implementation is accepted
**Then** OpenAPI docs route/build path, endpoint catalog baseline, and legacy migration notes exist as referenced artifacts
**And** the output summary names each artifact path and how later endpoint stories update it.

### Story 1.4: Delivery, Data, Observability, Privacy, and UI QA Baselines

As a developer/agent,
I want migration, delivery, observability, privacy, and UI QA baselines documented before feature implementation,
So that future stories know how to ship database, deployment, logging, customer-data, and user-interface changes safely.

**Requirements covered:** Supports NFR14, NFR37, NFR43, NFR44.

**Acceptance Criteria:**

**Given** D1 and Drizzle are relational source of truth
**When** table-by-table migration baseline is written
**Then** each planned table or schema group has owning story, purpose, main relationships, migration timing, and remote development migration evidence policy
**And** production migration remains explicitly review-gated.

**Given** implementation needs repeatable verification
**When** CI/check baseline is written
**Then** it documents local check command, intended CI gate command, test command expectations, and Cloudflare binding/type generation expectations
**And** blockers or missing CI automation are visible before broad feature implementation.

**Given** deployment must be repeatable
**When** deployment runbook baseline is written
**Then** it documents development deploy command, production deploy review gate, smoke check, rollback notes, and environment-specific migration warning
**And** production deploy remains review-gated.

**Given** production payments require operations readiness
**When** observability setup checklist is written
**Then** checklist covers request IDs, Cloudflare logs, error tracking enablement, critical failure categories, safe event context, and launch blockers
**And** real customer payments remain gated until critical observability items are satisfied or explicitly accepted.

**Given** customer/admin PII requirements apply
**When** retention/privacy checklist is written
**Then** checklist covers PII fields, data purpose, access scope, retention rule owner, deletion/review notes, and registration/checkout notice needs
**And** blockers are documented before production launch.

**Given** UI stories require repeatable quality checks
**When** UI QA baseline is written
**Then** it selects Playwright plus `@axe-core/playwright` or documented equivalent for automated accessibility checks
**And** it defines responsive screenshot widths `320`, `375`, `390`, `430`, `768`, `1024`, and `1440`.

**Given** UI QA cannot be fully automated
**When** manual QA checklist is written
**Then** it covers keyboard-only walkthroughs, focus trap/restore, status badge contrast, no color-only status, reduced motion, text overflow, and Lighthouse/WebPageTest storefront performance evidence
**And** each UI story must record executed checks or blockers.

**Given** validation exists
**When** story implementation finishes
**Then** the migration plan, delivery runbook, observability checklist, retention/privacy checklist, and UI QA baseline exist as referenced artifacts
**And** `npm run check` passes or blocker is documented.

**Given** story outputs are reviewed
**When** implementation is accepted
**Then** D1 migration plan, CI/check baseline, deployment runbook, observability checklist, retention/privacy checklist, and UI QA baseline are present
**And** the output summary names each artifact path and any launch blockers still open.

### Story 1.5: Global Font, UI Token, and Primitive Baseline

As a developer/agent,
I want local JRW fonts, Tailwind CSS v4 tokens, and the first reusable UI primitives configured before auth/governance UI starts,
So that Epic 1 and later features share one typography, control, state, and accessibility foundation.

**Requirements covered:** UX-DR1, FR78; supports UX-DR2, UX-DR30, and Epic 1 UI flows.

**Acceptance Criteria:**

**Given** local font assets already exist under `public/fonts/satoshi/**` and `public/fonts/space-mono/**`
**When** UI baseline styling is configured
**Then** `src/styles/global.css` defines `@font-face` entries for Satoshi and Space Mono using local `.woff2` assets with `font-display: swap`
**And** Tailwind CSS v4 theme tokens or documented CSS variables expose those families for headings, identity text, body copy, labels, and system/meta text.

**Given** global font CSS is configured
**When** Astro renders the shared layout or first UI page
**Then** the global stylesheet is imported once through the shared layout/page entry
**And** future UI stories can consume the font families through documented global CSS variables or token names.

**Given** UI token baseline exists
**When** Tailwind CSS v4 design tokens are configured from the UX specification
**Then** tokens exist for JRW background/content/muted/border/strong-border/cobalt/error/status colors, 0px radius, 1px borders, visible focus, disabled/loading/error states, and compact spacing
**And** tokens preserve the technical brutalist rules: no shadows, no blur, no decorative gradients, and restrained cobalt for focus, selected state, primary action, and live status.

**Given** Epic 1 auth and governance UI needs repeatable controls
**When** baseline shared primitives are implemented
**Then** reusable components exist under `src/components/**` for `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Checkbox`, `Toggle`, `Badge`, `StatusBadge`, `Tabs`, `DataTable`, `Modal`, `Toast`, `ConfirmDialog`, `EmptyState`, and `Skeleton`
**And** components use Tailwind CSS v4 utility classes and JRW theme tokens directly, without adopting a full external component library or hiding one-off element styling behind `jrw-*` selectors.

**Given** primitive components render user-facing controls
**When** keyboard, focus, status, loading, disabled, empty, and error states are reviewed
**Then** controls have accessible names/labels, visible focus, stable dimensions, text labels for status, associated field errors, and no color-only meaning
**And** unfamiliar icon buttons include accessible names and tooltip-ready metadata.

**Given** later epics need UI beyond the baseline
**When** a story needs a new component
**Then** it first reuses or extends existing `src/components/**` primitives where the behavior is generic
**And** feature-specific components stay under `src/features/<feature>/**` until reuse across features justifies promotion to shared components.

**Given** feature-specific UI needs layout, spacing, color, or responsive state
**When** implementation adds or changes markup
**Then** developer uses Tailwind utility classes plus JRW tokens such as `bg-brand-accent`, `text-brand-muted`, `border-brand-border-strong`, `p-grid-sm`, `gap-grid-xs`, and responsive variants directly in JSX/Astro
**And** no new one-off `jrw-*` runtime classes or deleted `src/styles/features/**`, `src/styles/storefront/**`, or `src/styles/components/_ui.css` class layers are introduced.

**Given** validation exists
**When** story implementation finishes
**Then** `npm run check` passes or blocker is documented
**And** no unrelated backend feature work or broad visual redesign is introduced.

**Given** story outputs are reviewed
**When** implementation is accepted
**Then** `src/styles/global.css`, documented Tailwind token names, one shared layout/page import, and baseline primitive component exports are present
**And** rendered font loading plus primitive smoke checks are verified or blockers are documented.

### Story 1.6: Seed Unique Super Admin and Deprecated Role Alias

As Super Admin,
I want exactly one seeded owner account and clear role normalization,
So that JRW has a controlled governance root and legacy `STORE_ADMIN` data cannot create a second active role.

**Requirements covered:** FR1, FR10; supports FR11.

**Acceptance Criteria:**

**Given** no Super Admin exists
**When** seed script runs with valid reviewed credentials
**Then** exactly one `SUPER_ADMIN` account exists
**And** seed does not silently create multiple owners.

**Given** Super Admin already exists
**When** seed script runs again
**Then** script refuses duplicate owner creation or updates only explicitly allowed non-sensitive fields
**And** output warns before replacing owner credentials.

**Given** legacy data or input uses `STORE_ADMIN`
**When** role is normalized
**Then** system maps `STORE_ADMIN` to `ADMIN` as deprecated alias
**And** `STORE_ADMIN` is not exposed as active separate role in current APIs or UI.

**Given** roles are persisted or validated
**When** role schema/domain constants are reviewed
**Then** active roles are `SUPER_ADMIN`, `ADMIN`, `CUSTOMER`, and `PROSPECT`
**And** role-related errors use stable safe codes.

**Given** seed and role logic are security-sensitive
**When** implementation finishes
**Then** tests cover no-owner seed, existing-owner duplicate prevention, and `STORE_ADMIN` alias normalization
**And** logs do not print raw password, hashes, pepper, tokens, or secrets.

**Given** D1/Drizzle is source of truth
**When** schema or migration changes are needed
**Then** changes are scoped to owner/admin/role data needed by this story
**And** no unrelated tables are created early.

**Given** validation exists
**When** story implementation finishes
**Then** `npm run check` passes or blocker is documented
**And** remote production seed/migration is not performed without explicit review.

### Story 1.7: Secure Session Authentication

As Super Admin, Admin, or Customer,
I want secure email/password sign-in and sign-out,
So that role-protected areas can identify me without exposing credentials or tokens.

**Requirements covered:** FR1, FR4, FR11; supports FR5.

**Acceptance Criteria:**

**Given** user has active account with password credentials
**When** user submits valid email/password
**Then** system creates secure HttpOnly session cookie backed by server-side session record
**And** response uses standard `{ data, meta }` envelope.

**Given** user submits invalid credentials
**When** sign-in fails
**Then** response uses stable safe error code
**And** message does not reveal whether email or password was wrong.

**Given** account is suspended, inactive, unverified where required, or not approved where required
**When** user attempts dashboard sign-in
**Then** system denies access with safe error code
**And** does not create dashboard-capable session.

**Given** user is signed in
**When** user signs out
**Then** server invalidates session
**And** browser cookie is cleared.

**Given** request includes session cookie
**When** server context derives actor
**Then** typed request context exposes actor ID, role, account status, and request ID
**And** actor context is scoped per request, not global mutable state.

**Given** password verification runs
**When** implementation is tested
**Then** tests cover correct password, wrong password, suspended/inactive user, and missing/expired session
**And** password storage uses salted hashing with secret pepper per architecture.

**Given** rate limit requirements exist
**When** repeated failed password attempts occur
**Then** auth failure rate limiting is applied or documented as blocker for release
**And** public errors remain safe.

**Given** validation exists
**When** story implementation finishes
**Then** `npm run check` passes or blocker is documented
**And** logs do not emit raw passwords, hashes, session tokens, JWTs, pepper, or cookies.

### Story 1.8: Customer Registration, Verification, and Profile

As a Customer,
I want to register, verify my email, and manage basic profile details,
So that I can build trusted checkout/account identity before buying from JRW.

**Requirements covered:** FR5, FR6, FR8, FR59.

**Acceptance Criteria:**

**Given** Prospect submits valid registration details
**When** registration succeeds
**Then** Customer account is created with `CUSTOMER` role
**And** verification email request is queued/sent through notification boundary.

**Given** registration email already belongs to existing account
**When** Prospect registers
**Then** system returns safe account/validation response
**And** does not reveal sensitive account state beyond allowed UX.

**Given** verification token is valid and unexpired
**When** Customer verifies email
**Then** account email is marked verified
**And** token cannot be reused.

**Given** verification token is expired, invalid, or already used
**When** Customer attempts verification
**Then** system returns safe error code
**And** no account state changes.

**Given** Customer is authenticated
**When** Customer updates profile fields
**Then** display name, phone number, default delivery/contact details, and email preference update where supported
**And** PII changes are validated and minimized to allowed fields.

**Given** profile/registration APIs are completed
**When** responses are returned
**Then** standard success/error envelopes are used
**And** OpenAPI metadata documents auth, request body, responses, rate-limit class, and error codes.

**Given** privacy/security requirements exist
**When** implementation finishes
**Then** tests cover registration, verification success/failure, token reuse prevention, and profile update validation
**And** logs do not emit raw passwords, tokens, unnecessary PII, or secrets.

**Given** validation exists
**When** story implementation finishes
**Then** `npm run check` passes or blocker is documented.

### Story 1.9: Password Reset and Account Email Notifications

As a Customer or Admin,
I want secure password reset and account-status emails,
So that account recovery and account lifecycle events work without leaking secrets.

**Requirements covered:** FR60, FR61; supports FR59.

**Acceptance Criteria:**

**Given** user requests password reset for an email
**When** request is accepted
**Then** system creates reset token with 30-minute expiry and at least 128 bits entropy
**And** sends reset email through Resend boundary without exposing whether account exists.

**Given** reset token is valid and unexpired
**When** user submits new password
**Then** password is updated using approved hashing/pepper flow
**And** token is invalidated after use.

**Given** reset token is invalid, expired, or already used
**When** reset is submitted
**Then** system returns safe error code
**And** password remains unchanged.

**Given** email verification resend is requested
**When** request is accepted
**Then** verification token expiry remains within 24 hours
**And** rate limit of max 3 verification/reset requests per hour per email is enforced or documented as release blocker.

**Given** Admin invitation or approval/rejection email is triggered
**When** account lifecycle state changes require notification
**Then** email payload contains only necessary safe account details
**And** no password, token, raw auth state, or secret appears in logs.

**Given** transactional email provider fails
**When** email send fails
**Then** failure is logged with request ID and safe context
**And** response maps to stable safe error or retryable internal state.

**Given** completed APIs return responses
**When** password reset or email actions finish
**Then** standard envelopes and OpenAPI metadata are used
**And** success responses avoid account enumeration.

**Given** implementation finishes
**When** tests run
**Then** tests cover reset request, valid reset, invalid/expired/reused token, safe enumeration behavior, and provider failure mapping
**And** `npm run check` passes or blocker is documented.

### Story 1.10: Customer Google Sign-In

As a Customer,
I want to sign in with Google,
So that I can access JRW checkout/account flows without creating separate password credentials.

**Requirements covered:** FR7; supports FR5, FR8.

**Acceptance Criteria:**

**Given** Prospect or Customer starts Google sign-in
**When** OAuth flow begins
**Then** system creates OAuth state with 10-minute expiry and at least 128 bits entropy
**And** state is validated before any account linking or session creation.

**Given** Google callback returns verified email for new Customer
**When** callback is valid
**Then** Customer account is created or activated with `CUSTOMER` role only
**And** Admin OAuth is not enabled in MVP.

**Given** Google callback returns verified email matching existing Customer
**When** auto-linking is safe
**Then** provider identity links to that Customer account
**And** local profile fields are not overwritten unless local field is empty.

**Given** Google callback email is unverified, missing, mismatched, or unsafe to link
**When** callback is processed
**Then** system rejects sign-in with safe error code
**And** no account link/session is created.

**Given** OAuth provider returns error or is unavailable
**When** callback fails
**Then** customer receives safe message
**And** operational log includes request ID and safe provider context only.

**Given** sign-in succeeds
**When** session is created
**Then** secure HttpOnly session cookie is issued
**And** response redirects or returns standard envelope according to route type.

**Given** completed OAuth endpoints exist
**When** docs are generated
**Then** OpenAPI/docs include safe contract metadata and error codes where applicable
**And** no OAuth secrets/tokens appear in docs or logs.

**Given** implementation finishes
**When** tests run
**Then** tests cover valid callback, invalid state, expired state, unverified email, safe auto-link, provider error, and customer-only role enforcement
**And** `npm run check` passes or blocker is documented.

### Story 1.11: Admin Account Management and Approval

As Super Admin,
I want to create, inspect, update, suspend, reactivate, approve, and reject Admin accounts,
So that only trusted operators can access JRW dashboard.

**Requirements covered:** FR2, FR4, FR61.

**Acceptance Criteria:**

**Given** Super Admin is authenticated
**When** Super Admin creates Admin account
**Then** Admin account is created with `ADMIN` role
**And** invitation or setup email is sent when enabled.

**Given** an Admin account needs activation after Super Admin creation or setup
**When** activation is not complete
**Then** dashboard access is blocked until the account is active.

**Given** Super Admin activates, suspends, or reactivates Admin access
**When** action succeeds
**Then** Admin account status changes accordingly
**And** account status notice is sent when enabled.

**Given** Super Admin suspends Admin
**When** suspension succeeds
**Then** Admin loses dashboard access and active dashboard-capable sessions are invalidated or blocked
**And** suspension reason is captured where supported.

**Given** Super Admin reactivates Admin
**When** reactivation succeeds
**Then** Admin may sign in if email verified and approved
**And** role remains `ADMIN`, not `SUPER_ADMIN`.

**Given** Super Admin views Admin accounts
**When** list/detail endpoints respond
**Then** response includes safe admin account fields only
**And** secrets, password hashes, tokens, and internal auth state are hidden.

**Given** non-owner or Customer attempts Admin management
**When** protected action is requested
**Then** system returns forbidden error code
**And** no account state changes.

**Given** account management APIs are completed
**When** docs are generated
**Then** OpenAPI metadata includes auth requirement, body/response schemas, error codes, and rate-limit class.

**Given** implementation finishes
**When** tests run
**Then** tests cover create, inspect, update, suspend, reactivate, approve/reject, non-owner denial, and dashboard access gate
**And** `npm run check` passes or blocker is documented.

### Story 1.12: Server-Side RBAC Guards

As JRW,
I want server-side role guards for Super Admin, Admin, Customer, and Prospect access,
So that protected routes enforce permissions even if UI controls are bypassed.

**Requirements covered:** FR9, FR11.

**Acceptance Criteria:**

**Given** API route requires authenticated actor
**When** request has no valid session
**Then** system returns unauthorized error code
**And** no route action executes.

**Given** API route requires `SUPER_ADMIN`
**When** Admin, Customer, Prospect, or anonymous actor calls it
**Then** system returns forbidden error code
**And** no state changes.

**Given** API route requires `ADMIN`
**When** active approved Admin calls it
**Then** request proceeds
**And** suspended, unapproved, unverified, Customer, Prospect, and anonymous actors are denied.

**Given** API route requires `CUSTOMER`
**When** Customer calls it
**Then** request proceeds
**And** Admin/Super Admin access is only allowed if route explicitly documents fallback behavior.

**Given** public storefront route supports `PROSPECT`
**When** anonymous actor browses public catalog route
**Then** route can proceed with Prospect context
**And** no protected account/order/admin data is exposed.

**Given** legacy role input uses `STORE_ADMIN`
**When** RBAC checks normalize role
**Then** it is evaluated as `ADMIN`
**And** no separate `STORE_ADMIN` permission branch exists.

**Given** guards are used in routes
**When** route contract docs are generated
**Then** auth metadata documents required roles and errors
**And** rate-limit class is present for completed endpoints.

**Given** implementation finishes
**When** tests run
**Then** tests cover allowed/denied paths for each role and account status
**And** route handlers remain free of business rules beyond guard composition.

### Story 1.13: Ownership Transfer Governance

As Super Admin,
I want to transfer ownership to an eligible Admin with deliberate confirmation,
So that JRW can change platform owner while preserving exactly one Super Admin.

**Requirements covered:** FR3; supports FR1, FR2, FR11; UX-DR18, UX-DR24.

**Acceptance Criteria:**

**Given** Super Admin views ownership transfer candidates
**When** candidate list loads
**Then** only eligible active approved verified Admin accounts can be selected
**And** current Super Admin cannot create duplicate owner path.

**Given** target Admin is ineligible, suspended, unapproved, unverified, or not Admin
**When** ownership transfer is attempted
**Then** system blocks transfer with safe error code
**And** exactly one Super Admin remains unchanged.

**Given** eligible target Admin is selected
**When** transfer flow begins
**Then** UI/API require deliberate confirmation phrase
**And** current Super Admin must re-enter password before final action.

**Given** confirmation phrase or password is wrong
**When** transfer is submitted
**Then** transfer is rejected
**And** no role changes occur.

**Given** confirmation and password are valid
**When** transfer completes
**Then** target Admin becomes `SUPER_ADMIN`
**And** previous owner becomes `ADMIN` or documented allowed non-owner role
**And** transaction preserves exactly one `SUPER_ADMIN`.

**Given** ownership transfer completes
**When** audit entry is written
**Then** audit includes actor, target Admin, old role, new role, timestamp, request ID, and safe details
**And** no password/token/session secret is logged.

**Given** sessions exist for both accounts
**When** transfer completes
**Then** affected sessions are invalidated or role context refresh is forced
**And** stale sessions cannot retain old owner authority.

**Given** implementation finishes
**When** tests run
**Then** tests cover eligible transfer, ineligible target, wrong phrase, wrong password, unique-owner invariant, audit record, and session authority refresh
**And** `npm run check` passes or blocker is documented.

## Epic 2: Brand Collaboration for JRW Catalog Work

Admins can create, join, invite, and manage brand-scoped catalog collaboration without turning brands into stores/sellers.

### Story 2.1: Create Brand as Catalog Group

As an Admin,
I want to create a brand under JRW,
So that products can be organized and collaborated on without creating separate stores or sellers.

**Requirements covered:** FR12; supports FR16, FR17, FR18, FR19, FR20.

**Acceptance Criteria:**

**Given** active approved Admin is authenticated
**When** Admin submits valid brand creation data
**Then** brand is created under JRW as catalog/collaboration group
**And** creator becomes brand member with appropriate membership role.

**Given** Admin submits brand data
**When** validation runs
**Then** required fields, uniqueness rules, slug/name format, and archived-name conflicts are enforced
**And** validation errors use standard error envelope.

**Given** brand is created
**When** response returns
**Then** response uses standard `{ data, meta }` envelope
**And** brand response never includes seller, merchant, tenant, payout, or PayMongo-owner fields.

**Given** non-Admin or inactive/unapproved Admin attempts brand creation
**When** request is processed
**Then** system returns forbidden/unauthorized safe error
**And** no brand is created.

**Given** brand creation succeeds
**When** audit/event hooks run
**Then** safe actor, action, brand target, timestamp, and request ID are recorded or emitted for later audit story integration
**And** no secrets or unnecessary PII are logged.

**Given** route contract is complete
**When** API docs are generated
**Then** endpoint includes body schema, response schema, auth metadata, rate-limit class, and error codes.

**Given** implementation finishes
**When** tests run
**Then** tests cover create success, invalid data, duplicate conflict, non-Admin denial, and catalog-group-only response shape
**And** `npm run check` passes or blocker is documented.

### Story 2.2: Update and Archive Brand

As an Admin with brand permission,
I want to update and archive a brand,
So that JRW can keep brand catalog groups accurate without deleting historical product/order context.

**Requirements covered:** FR13; supports FR16, FR17, FR18, FR19, FR20.

**Acceptance Criteria:**

**Given** active approved Admin is brand member or has elevated Admin permission
**When** Admin updates allowed brand fields
**Then** brand details are updated
**And** response uses standard `{ data, meta }` envelope.

**Given** Admin submits invalid brand update data
**When** validation runs
**Then** required, format, uniqueness, and conflict rules are enforced
**And** response uses standard error envelope.

**Given** brand has historical products or orders
**When** Admin archives brand
**Then** brand is marked archived rather than hard-deleted
**And** historical product/order references remain readable.

**Given** archived brand exists
**When** storefront/catalog responses expose brand data
**Then** archived brand behavior follows documented visibility rules
**And** archived brand cannot be used for new product assignment unless explicitly allowed later.

**Given** non-member Admin without elevated permission attempts update/archive
**When** request is processed
**Then** system returns forbidden error
**And** brand state remains unchanged.

**Given** brand update/archive succeeds
**When** audit/event hooks run
**Then** safe actor, action, brand target, old/new state where safe, timestamp, and request ID are recorded or emitted.

**Given** route contract is complete
**When** API docs are generated
**Then** update/archive endpoints include auth metadata, request/response schemas, rate-limit class, and error codes.

**Given** implementation finishes
**When** tests run
**Then** tests cover update success, archive success, invalid data, duplicate conflict, non-member denial, and historical-reference preservation
**And** `npm run check` passes or blocker is documented.

### Story 2.3: Invite Admins to Brand

As a brand member Admin with permission,
I want to invite another Admin to a brand,
So that JRW catalog work can be shared inside a brand group.

**Requirements covered:** FR15; supports FR14.

**Acceptance Criteria:**

**Given** active approved Admin has permission to invite to a brand
**When** Admin invites another existing Admin
**Then** pending brand membership invitation is created
**And** invited Admin is notified when email notifications are enabled.

**Given** invite target is not an Admin, is suspended, or does not exist
**When** invitation is submitted
**Then** system returns safe validation/error response
**And** no pending membership is created.

**Given** duplicate active membership or pending invite already exists
**When** invitation is submitted
**Then** system returns conflict error
**And** no duplicate invitation is created.

**Given** inviting Admin is not brand member and lacks elevated permission
**When** invitation is submitted
**Then** system returns forbidden error
**And** no invitation is created.

**Given** invitation is created
**When** response returns
**Then** response uses standard envelope
**And** does not expose unnecessary invited Admin PII.

**Given** invitation succeeds
**When** audit/event hooks run
**Then** safe actor, target Admin, brand target, action, timestamp, and request ID are recorded or emitted.

**Given** route contract is complete
**When** API docs are generated
**Then** endpoint includes auth metadata, schemas, rate-limit class, and error codes.

**Given** implementation finishes
**When** tests run
**Then** tests cover invite success, non-Admin target, suspended target, duplicate invite, non-member denial, and safe notification payload
**And** `npm run check` passes or blocker is documented.

### Story 2.4: Join Brand by Invitation or Approval

As an Admin,
I want to join a brand through invitation or approval,
So that I can collaborate on products assigned to that brand.

**Requirements covered:** FR14; supports FR16, FR17, FR18.

**Acceptance Criteria:**

**Given** Admin has pending valid brand invitation
**When** Admin accepts invitation
**Then** active brand membership is created
**And** invitation is marked accepted and cannot be reused.

**Given** invitation is expired, revoked, already accepted, or not for current Admin
**When** Admin accepts invitation
**Then** system returns safe error code
**And** no membership changes occur.

**Given** Admin requests to join a brand that allows approval flow
**When** request is submitted
**Then** pending join request is created
**And** authorized brand member/elevated Admin can approve or reject it.

**Given** authorized approver approves join request
**When** approval succeeds
**Then** active brand membership is created
**And** request is marked approved.

**Given** unauthorized Admin attempts to approve/reject join request
**When** action is submitted
**Then** system returns forbidden error
**And** request state remains unchanged.

**Given** duplicate active membership or pending request exists
**When** Admin requests join
**Then** system returns conflict response
**And** duplicate membership/request is not created.

**Given** membership state changes
**When** audit/event hooks run
**Then** safe actor, target Admin, brand target, action, timestamp, and request ID are recorded or emitted.

**Given** implementation finishes
**When** tests run
**Then** tests cover invite accept, invalid invite, join request, approval, rejection, unauthorized approval, duplicate conflict, and audit/event emission
**And** `npm run check` passes or blocker is documented.

### Story 2.5: Brand Member Visibility and Brand Scope

As a brand member Admin,
I want to see products assigned to brands I belong to and brandless products I am authorized to manage,
So that my catalog workspace matches my JRW collaboration scope.

**Requirements covered:** FR16, FR19; supports FR20.

**Acceptance Criteria:**

**Given** active approved Admin belongs to a brand
**When** Admin lists brand-scoped products
**Then** products assigned to that brand are visible
**And** response uses standard envelope with request ID.

**Given** Admin belongs to multiple brands
**When** Admin filters by brand scope
**Then** only products in selected authorized brand scope are returned
**And** inactive/archived brand visibility follows documented rules.

**Given** authorized Admin accesses brandless products
**When** brandless scope is requested
**Then** brandless products are visible/manageable according to Admin permission
**And** UI/API labels brandless as catalog organization choice, not missing seller/store.

**Given** Admin does not belong to a brand and lacks elevated permission
**When** Admin requests that brand scope
**Then** system returns forbidden or empty authorized result per documented contract
**And** no product details leak.

**Given** brand scope is returned to UI
**When** response includes brand metadata
**Then** metadata uses brand/catalog group language only
**And** no seller, merchant, tenant, payout owner, or PayMongo ownership fields appear.

**Given** route contract is complete
**When** docs are generated
**Then** query params, response schemas, auth metadata, rate-limit class, and error codes are documented.

**Given** implementation finishes
**When** tests run
**Then** tests cover single-brand visibility, multi-brand filtering, brandless visibility, non-member denial/no leakage, and archived brand behavior
**And** `npm run check` passes or blocker is documented.

### Story 2.6: Brand-Scoped Product Mutation Guards

As JRW,
I want brand membership to gate product creation and edits inside a brand,
So that only authorized Admins modify brand-scoped catalog work.

**Requirements covered:** FR17, FR18, FR20; supports FR19.

**Acceptance Criteria:**

**Given** active approved Admin is brand member
**When** Admin creates product assigned to that brand
**Then** creation is allowed
**And** product is associated with the brand as catalog group only.

**Given** active approved Admin is brand member
**When** Admin edits product assigned to that brand
**Then** update is allowed
**And** product brand association remains valid.

**Given** Admin lacks brand membership and lacks elevated permission
**When** Admin creates or edits product assigned to that brand
**Then** system returns `BRAND_MEMBERSHIP_REQUIRED` or documented forbidden code
**And** no product state changes.

**Given** authorized Admin creates or edits brandless product
**When** brand field is empty
**Then** operation is allowed if Admin has brandless product permission
**And** brandless state is stored as no brand, not synthetic brand/store.

**Given** product brand assignment changes from one brand to another
**When** Admin submits reassignment
**Then** system verifies permission for source and target brand scopes
**And** rejects invalid reassignment with conflict/forbidden error.

**Given** route/controller/service flow handles product mutations
**When** guards are applied
**Then** membership checks run server-side before domain mutation
**And** UI-only controls are not relied on for enforcement.

**Given** implementation finishes
**When** tests run
**Then** tests cover member create/edit, non-member denial, elevated permission, brandless product mutation, invalid reassignment, and no state change on denial
**And** `npm run check` passes or blocker is documented.

### Story 2.7: Brand Membership UI and Language Guardrails

As an Admin,
I want brand screens and product forms to use clear catalog-collaboration language,
So that brands are not mistaken for stores, sellers, tenants, merchants, or payment owners.

**Requirements covered:** Supports FR12-FR20; UX-DR15, UX-DR19, UX-DR20, UX-DR22, UX-DR30.

**Acceptance Criteria:**

**Given** Admin views brand list or brand detail
**When** UI renders
**Then** it shows brand name, status, members, pending invites/requests, and brand-scoped products
**And** copy uses "brand", "catalog group", and "brand members".

**Given** Admin creates or edits product
**When** brand field appears
**Then** helper text explains brand is optional catalog group
**And** product can remain brandless without warning that implies missing seller/store.

**Given** Admin views brand membership table
**When** members and invites are displayed
**Then** statuses are text-labeled and color-independent
**And** controls expose only valid next actions.

**Given** Admin lacks permission for brand action
**When** action would be unavailable
**Then** UI hides/disables action with clear safe reason
**And** server-side denial remains source of truth.

**Given** UI copy is reviewed
**When** brand screens, product brand fields, and invite/join flows are checked
**Then** forbidden words do not appear for brands: seller, merchant, tenant, store owner, payout owner, PayMongo owner
**And** any necessary reference to JRW seller of record remains explicit.

**Given** responsive/accessibility requirements exist
**When** brand UI is tested
**Then** tables/forms support keyboard navigation, visible labels, field errors, focus states, and tablet usability
**And** status badges include text labels.

**Given** implementation finishes
**When** tests/checks run
**Then** UI/unit tests or documented QA cover brand language, permission states, invite/join status display, brandless product field, and accessibility basics
**And** `npm run check` passes or blocker is documented.

## Epic 2.5: Identity Realm Separation Hardening

Admin and Customer accounts remain separate legal/security realms before catalog, storefront, checkout, and audit scope expand.

### Story 2.5.1: Document Identity Realm Boundaries and API Contract

As a developer/agent,
I want Admin and Customer account boundaries documented in planning and API contracts,
So that future auth, profile, checkout, and audit work does not collapse separate personas into one account model.

**Requirements covered:** FR11A, FR75; supports FR71, FR73, FR74.

**Acceptance Criteria:**

**Given** identity model is reviewed
**When** documentation is updated
**Then** `SUPER_ADMIN` and `ADMIN` are documented as Admin realm accounts in `admins`
**And** `CUSTOMER` is documented as Customer realm account in `customers`
**And** docs reject shared account table and `is_admin` flag designs.

**Given** same email exists in both realms
**When** docs describe behavior
**Then** records are described as unrelated accounts
**And** no auto-linking, role promotion, shared password, shared OAuth identity, or merged audit identity is implied.

**Given** API docs are generated
**When** auth/recovery endpoints are listed
**Then** Admin and Customer route groups, cookies, and allowed roles are distinct
**And** removed generic auth endpoints are not presented as current behavior.

### Story 2.5.2: Split Generic Auth into Admin and Customer Realms

As a user in either realm,
I want login, logout, and session inspection to use realm-specific APIs,
So that Customer code cannot authenticate against Admin storage and Admin code cannot authenticate against Customer storage.

**Requirements covered:** FR11A, FR75; supports FR1, FR4, FR7, FR11.

**Acceptance Criteria:**

**Given** Admin signs in
**When** `POST /api/admin/auth/sessions` receives valid Admin credentials
**Then** session has `actor_kind = ADMIN`
**And** response sets only `jrw_admin_session`.

**Given** Customer signs in
**When** `POST /api/customer/auth/sessions` receives valid Customer credentials
**Then** session has `actor_kind = CUSTOMER`
**And** response sets only `jrw_customer_session`.

**Given** same email exists in `admins` and `customers`
**When** each realm login endpoint receives its matching password
**Then** each authenticates only its own realm account
**And** wrong-realm password or wrong-realm endpoint fails without checking the other table.

**Given** session inspection runs
**When** Customer endpoint receives Admin cookie or Admin endpoint receives Customer cookie
**Then** request is treated as anonymous
**And** no cross-realm account is loaded.

### Story 2.5.3: Remove Cross-Realm Email Conflict and Recovery Lookup

As a Super Admin and Customer,
I want account creation and recovery to check only the active realm,
So that separate Admin and Customer records do not block each other or leak realm existence.

**Requirements covered:** FR11A, FR75; supports FR2, FR5, FR60.

**Acceptance Criteria:**

**Given** Customer email already exists
**When** Super Admin creates Admin with same email
**Then** create succeeds if no Admin uses that email
**And** no Customer conflict reason is returned.

**Given** Admin email already exists
**When** Customer registers with same email
**Then** registration succeeds if no Customer uses that email
**And** no Admin lookup or conflict reason is used.

**Given** password reset is requested
**When** request uses Admin reset route
**Then** only Admin account storage is queried
**And** Customer reset route only queries Customer account storage.

**Given** password reset confirmation is submitted
**When** token belongs to the other realm
**Then** confirmation returns safe not-found/conflict behavior
**And** no other-realm password is changed.

**Given** Google OAuth callback uses a verified email that also exists in Admin realm
**When** Customer OAuth completes
**Then** OAuth remains Customer-only
**And** no Admin account storage is queried
**And** same Admin email string does not block Customer OAuth account creation or sign-in.

### Story 2.5.4: Add Identity Realm Regression Tests

As a maintainer,
I want automated regression tests for identity realm boundaries,
So that future work cannot reintroduce shared-account behavior.

**Requirements covered:** FR11A, FR75; supports NFR security/privacy rules.

**Acceptance Criteria:**

**Given** same email exists in both realms
**When** auth repository and route tests run
**Then** Admin lookup returns only Admin record
**And** Customer lookup returns only Customer record.

**Given** wrong-realm cookies are sent
**When** Admin and Customer session/profile endpoints inspect requests
**Then** cross-realm cookie is ignored
**And** protected route returns `AUTH_REQUIRED` instead of treating actor as wrong-role authenticated user.

**Given** account creation tests run
**When** Admin and Customer use same email across separate tables
**Then** only same-table duplicate is rejected.

**Given** static boundary tests run
**When** auth, recovery, and Google OAuth repository source imports are scanned
**Then** Customer auth repository does not import Admin table
**And** Admin auth repository does not import Customer table.
**And** Admin recovery repository does not import Customer table
**And** Customer recovery and Google OAuth repositories do not import Admin table.

**Implementation confirmation - 2026-05-19:**

- Generic `/api/auth/*` routes removed from current OpenAPI. Admin auth lives under `/api/admin/auth/*`; Customer auth lives under `/api/customer/auth/*`.
- Cookies split into `jrw_admin_session` and `jrw_customer_session`; request context selects cookie by route realm and ignores wrong-realm cookies.
- Auth repositories split into `AdminAuthRepository` and `CustomerAuthRepository`; session repository remains shared only for `sessions`.
- Account recovery repositories split into `AdminAccountRecoveryRepository` and `CustomerAccountRecoveryRepository`; old mixed recovery repository removed.
- Admin create/update checks only `admins.email`; Customer registration checks only `customers.email`.
- Google OAuth remains Customer-only and queries only `customers` / `customer_providers`; same Admin email string does not block Customer OAuth.
- Regression coverage includes same-email auth, wrong-realm cookies, Admin/Customer same-email creation, recovery realm routing, OAuth same-email behavior, and static import-boundary tests.

## Epic 3: Catalog, Product Media, and Inventory Operations

Admins can manage categories, products, variants, images, prices, stock, publish states, and order-safe product snapshots.

### Story 3.0: Admin Resource Browser and Component System

As an Admin,
I want searchable resource pages with clear card/list/table patterns,
So that brands, catalog records, and future admin resources are easy to scan and manage.

**Requirements covered:** FR76, FR77, FR78; supports UX-DR10, UX-DR11, UX-DR21, UX-DR23, UX-DR29, UX-DR34.

**Acceptance Criteria:**

**Given** Admin opens `/admin/brands`
**When** brands load
**Then** default view shows responsive brand cards with brand name, status, member count, pending invites/requests, linked product count, and primary action
**And** card design follows the sharp 1px JRW module style.

**Given** Admin uses the brand resource toolbar
**When** Admin searches by brand name or slug
**Then** matching cards/list rows are shown
**And** empty search state states no matching brands and offers a clear reset action.

**Given** Admin changes view mode
**When** card/list toggle is used
**Then** selected mode persists during the current page session
**And** both modes expose the same important fields and actions.

**Given** brand data is loading
**When** skeleton renders
**Then** skeleton dimensions match the target card/list layout
**And** pulse animation respects reduced motion using the approved skeleton standard.

**Given** component inventory is documented
**When** future admin pages are built
**Then** specs exist for DashboardShell, SidebarNav, TopBar, Footer, PageToolbar, SearchInput, ViewToggle, ResourceCard, ResourceList, DataTable, EmptyState, and Skeleton.
**And** specs document Tailwind utility-first implementation: shared components can keep repeated class constants internally, while feature-specific admin styling stays visible in markup and does not add one-off `jrw-*` runtime selectors.

**Given** accessibility QA runs
**When** keyboard and screen-reader checks are performed
**Then** search, view toggle, card actions, list actions, focus states, status labels, and empty/loading states are usable without relying on color alone.

**Given** implementation finishes
**When** tests/checks run
**Then** tests cover search filtering, card/list toggle, brand card copy, skeleton markup, reduced-motion behavior where testable, and accessibility basics
**And** `npm run check` passes or blocker is documented.

### Story 3.1: Manage Product Categories

As an Admin,
I want to create, update, archive, and view product categories,
So that JRW storefront and admin catalog can organize products clearly.

**Requirements covered:** FR21.

**Acceptance Criteria:**

**Given** active approved Admin is authenticated
**When** Admin creates category with valid data
**Then** category is created
**And** response uses standard `{ data, meta }` envelope.

**Given** Admin updates category name, slug, sort order, or visibility fields
**When** update data is valid
**Then** category is updated
**And** updated category remains usable for product assignment.

**Given** Admin archives category
**When** category has linked products or history
**Then** category is archived rather than hard-deleted
**And** historical product/order references remain readable.

**Given** category data is invalid or slug conflicts
**When** create/update is submitted
**Then** system returns validation/conflict error envelope
**And** no invalid state persists.

**Given** non-Admin or inactive/unapproved Admin attempts category mutation
**When** request is processed
**Then** system returns forbidden/unauthorized error
**And** no category state changes.

**Given** category list endpoint is called
**When** categories are returned
**Then** pagination uses default page size 20 and maximum 100
**And** archived/visible filters are documented.

**Given** route contract is complete
**When** API docs are generated
**Then** endpoints include schemas, auth metadata, rate-limit class, pagination params, and error codes.

**Given** implementation finishes
**When** tests run
**Then** tests cover create, update, archive, list pagination, invalid data, duplicate slug, and non-Admin denial
**And** `npm run check` passes or blocker is documented.

### Story 3.2: Create and Edit Product Identity

As an Admin,
I want to create and edit core product identity,
So that JRW can maintain accurate product records before variants, media, stock, and publishing.

**Requirements covered:** FR22; supports FR29.

**Acceptance Criteria:**

**Given** active approved Admin is authenticated
**When** Admin creates product with valid core fields
**Then** product is created in `DRAFT` status by default
**And** response uses standard `{ data, meta }` envelope.

**Given** Admin edits product name, slug, description, summary, SKU/base metadata, or display fields
**When** update data is valid
**Then** product identity is updated
**And** product status remains unchanged unless explicitly changed by publish/archive story.

**Given** product data is invalid, missing required fields, or slug conflicts
**When** create/update is submitted
**Then** system returns validation/conflict error envelope
**And** no partial invalid product state persists.

**Given** non-Admin or inactive/unapproved Admin attempts product mutation
**When** request is processed
**Then** system returns forbidden/unauthorized error
**And** no product state changes.

**Given** Admin lists products
**When** list endpoint is called
**Then** pagination uses default page size 20 and maximum 100
**And** filters for status, brand, category, search, and archive state are documented where available.

**Given** product identity APIs are completed
**When** API docs are generated
**Then** endpoints include schemas, auth metadata, rate-limit class, pagination params, and error codes.

**Given** implementation finishes
**When** tests run
**Then** tests cover create draft, edit identity, invalid data, duplicate slug, non-Admin denial, and paginated list
**And** `npm run check` passes or blocker is documented.

### Story 3.3: Assign Product Brand and Categories

As an Admin,
I want to assign products to zero or one brand and one or more categories,
So that JRW catalog organization stays clear and brand collaboration rules remain enforced.

**Requirements covered:** FR23, FR24; supports FR19, FR20.

**Acceptance Criteria:**

**Given** Admin edits product organization
**When** Admin assigns no brand
**Then** product remains brandless
**And** brandless state is valid and does not imply missing seller/store.

**Given** Admin assigns product to one brand
**When** Admin has brand membership or elevated permission
**Then** product brand association is saved
**And** response uses standard envelope.

**Given** Admin assigns product to category or categories
**When** categories are active and valid
**Then** product-category associations are saved
**And** archived/invalid categories are rejected.

**Given** Admin lacks permission for selected brand
**When** brand assignment is submitted
**Then** system returns `BRAND_MEMBERSHIP_REQUIRED` or documented forbidden code
**And** product organization remains unchanged.

**Given** Admin attempts to assign multiple brands
**When** request is validated
**Then** system rejects request
**And** product remains assigned to zero or one brand only.

**Given** brand or category assignment changes
**When** audit/event hooks run
**Then** safe actor, product target, old/new organization where safe, timestamp, and request ID are recorded or emitted.

**Given** route contract is complete
**When** API docs are generated
**Then** schemas document zero-or-one brand, category assignment rules, auth metadata, error codes, and rate-limit class.

**Given** implementation finishes
**When** tests run
**Then** tests cover brandless assignment, valid brand assignment, unauthorized brand assignment, valid category assignment, archived category rejection, and multiple-brand rejection
**And** `npm run check` passes or blocker is documented.

### Story 3.4: Manage Product Variants and Prices

As an Admin,
I want to create, update, archive, and price product variants,
So that customers can choose purchasable options with accurate JRW pricing.

**Requirements covered:** FR25, FR27.

**Acceptance Criteria:**

**Given** Admin edits product variants
**When** Admin adds valid variant option/SKU data
**Then** variant is created under product
**And** response uses standard envelope.

**Given** Admin updates variant option, SKU, price, or display metadata
**When** data is valid
**Then** variant is updated
**And** price is stored as integer centavos, not float.

**Given** Admin archives a variant
**When** variant has historical order references or stock history
**Then** variant is archived rather than hard-deleted
**And** historical references remain readable.

**Given** Admin submits duplicate option combination, invalid price, missing SKU where required, or invalid metadata
**When** validation runs
**Then** system returns validation/conflict error
**And** no invalid variant state persists.

**Given** Admin lacks product brand permission
**When** Admin attempts variant mutation
**Then** brand-scoped guard denies request
**And** no variant state changes.

**Given** product has variants
**When** product detail/list response includes variant summary
**Then** response exposes customer-safe price/availability data only
**And** internal inventory/provider details are hidden.

**Given** route contract is complete
**When** API docs are generated
**Then** schemas document variant fields, centavos money format, auth metadata, error codes, and rate-limit class.

**Given** implementation finishes
**When** tests run
**Then** tests cover create, update price, archive, duplicate option conflict, invalid price, non-member denial, and centavos storage
**And** `npm run check` passes or blocker is documented.

### Story 3.5: Upload and Manage Product Images

As an Admin,
I want to upload and manage product images,
So that storefront products have stable current media and future order snapshots keep valid references.

**Requirements covered:** FR26; supports FR31.

**Acceptance Criteria:**

**Given** active approved Admin has product permission
**When** Admin uploads valid image file
**Then** image is stored through R2/product asset boundary
**And** product image reference is saved with stable ID/key.

**Given** image file is invalid type, too large, corrupt, or fails validation
**When** upload is submitted
**Then** system returns validation error envelope
**And** no invalid image reference is attached.

**Given** Admin changes product primary image or image order
**When** update succeeds
**Then** current catalog display uses new image order
**And** previous image references needed by historical snapshots remain resolvable.

**Given** Admin removes image from current catalog
**When** image is referenced by historical order snapshot
**Then** current product association can be removed
**And** historical snapshot reference is preserved.

**Given** Admin lacks product brand permission
**When** Admin attempts image mutation
**Then** system returns forbidden error
**And** no R2/object or DB image state changes.

**Given** storefront image performance requirements exist
**When** image metadata is stored
**Then** variants/sizes/formats or metadata needed to target product-list <= 250KB and detail <= 1MB are captured or processing blocker is documented.

**Given** provider/storage failure occurs
**When** upload/update fails
**Then** response maps to safe provider/storage error
**And** logs include request ID and safe context only.

**Given** route contract is complete
**When** API docs are generated
**Then** upload/manage endpoints document auth metadata, file constraints, response schemas, rate-limit class, and error codes.

**Given** implementation finishes
**When** tests run
**Then** tests cover upload success, invalid file, primary image change, historical reference preservation, permission denial, and storage failure mapping
**And** `npm run check` passes or blocker is documented.

### Story 3.6: Manage Stock Quantity and Inventory State

As an Admin,
I want to update stock quantities and inventory state for variants,
So that storefront availability is accurate before checkout reservation exists.

**Requirements covered:** FR28, FR30; supports FR47.

**Acceptance Criteria:**

**Given** active approved Admin has product permission
**When** Admin updates variant stock quantity
**Then** stock quantity is saved
**And** response uses standard envelope.

**Given** Admin sets inventory state
**When** state is valid
**Then** inventory state is one of `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, or `PREORDER`
**And** invalid states are rejected.

**Given** stock quantity and inventory state conflict
**When** validation runs
**Then** system enforces documented consistency rules or returns conflict/validation error
**And** no invalid inventory state persists.

**Given** Admin lacks product brand permission
**When** Admin attempts stock mutation
**Then** system returns forbidden error
**And** stock state remains unchanged.

**Given** inventory update succeeds
**When** audit/event hooks run
**Then** safe actor, product/variant target, old/new stock where safe, timestamp, and request ID are recorded or emitted.

**Given** storefront/product APIs read availability
**When** inventory state is exposed
**Then** customer-safe availability labels are returned
**And** internal reservation/provider details are hidden.

**Given** checkout inventory reservation comes later
**When** this story completes
**Then** inventory structure supports future reservation/release with Durable Object and/or stock versioning
**And** this story does not claim checkout oversell safety yet.

**Given** implementation finishes
**When** tests run
**Then** tests cover stock update, valid states, invalid states, consistency conflict, permission denial, and customer-safe availability output
**And** `npm run check` passes or blocker is documented.

### Story 3.7: Publish, Archive, and Validate Product Readiness

As an Admin,
I want to publish, draft, and archive products only when required catalog data is valid,
So that storefront shoppers see complete, purchasable product information.

**Requirements covered:** FR29; supports FR22, FR25, FR26, FR27, FR30.

**Acceptance Criteria:**

**Given** product is in `DRAFT`
**When** Admin publishes product with required identity, category, variant, price, image, and availability data
**Then** product status becomes `PUBLISHED`
**And** storefront-visible fields are complete.

**Given** product is missing publish-required data
**When** Admin attempts publish
**Then** system returns validation/conflict error with missing readiness items
**And** product remains `DRAFT`.

**Given** Admin moves product from `PUBLISHED` to `DRAFT`
**When** transition is valid
**Then** product is removed from public storefront browsing
**And** admin product record remains editable.

**Given** Admin archives product or variant
**When** item has historical references
**Then** item is archived rather than hard-deleted
**And** order/history references remain readable.

**Given** Admin submits invalid status transition
**When** transition is processed
**Then** system returns `CONFLICT_STATE` or documented conflict code
**And** no status change occurs.

**Given** Admin lacks product brand permission
**When** Admin attempts publish/draft/archive transition
**Then** system returns forbidden error
**And** product status remains unchanged.

**Given** publish/archive action succeeds
**When** audit/event hooks run
**Then** safe actor, product target, old/new status, timestamp, and request ID are recorded or emitted.

**Given** implementation finishes
**When** tests run
**Then** tests cover publish success, publish blocked by missing data, draft transition, archive, invalid transition, non-member denial, and storefront visibility change
**And** `npm run check` passes or blocker is documented.

### Story 3.8: Preserve Product Snapshot Fields for Future Orders

As JRW,
I want product and variant snapshot fields prepared for order creation,
So that future orders preserve purchased product name, variant, price, quantity, and image reference even after catalog changes.

**Requirements covered:** FR31.

**Acceptance Criteria:**

**Given** product, variant, price, and image records exist
**When** snapshot payload is built for a future order line
**Then** snapshot contains product name, variant label/options, price centavos, quantity, and stable image reference
**And** payload uses current catalog data at purchase-time boundary.

**Given** product name, variant, price, or image changes after snapshot payload is created
**When** snapshot is read
**Then** stored snapshot values remain unchanged
**And** current catalog changes do not mutate historical order data.

**Given** product image is removed from current catalog after snapshot
**When** snapshot image reference is read
**Then** stable image reference remains resolvable or fallback behavior is documented
**And** order history is not broken.

**Given** product or variant is archived after snapshot
**When** snapshot is read
**Then** historical snapshot remains readable
**And** archived catalog state does not hide purchased item details.

**Given** checkout/order implementation comes later
**When** this story completes
**Then** snapshot builder/types/schema are available for future order story
**And** this story does not create full order/checkout flow.

**Given** implementation finishes
**When** tests run
**Then** tests cover snapshot payload creation, catalog mutation after snapshot, image reference preservation, archived product readability, and centavos price preservation
**And** `npm run check` passes or blocker is documented.

### Story 3.9: Admin Product Editor, Variant Matrix, and Inventory UI

As an Admin,
I want table-first catalog screens and focused product editing controls,
So that I can manage product identity, variants, images, prices, stock, brand, categories, and publish status efficiently.

**Requirements covered:** Supports FR21-FR31; UX-DR10, UX-DR11, UX-DR12, UX-DR13, UX-DR14, UX-DR20, UX-DR21, UX-DR22, UX-DR29, UX-DR30, UX-DR31, UX-DR32.

**Acceptance Criteria:**

**Given** Admin opens Products dashboard
**When** page loads
**Then** table-first product list shows product name, brand/category, status, stock/availability, price summary, and updated timestamp
**And** filters/search/pagination align with API contracts.

**Given** Admin creates or edits product
**When** Product Editor opens
**Then** sections appear for identity, media, brand, categories, variants, pricing, inventory, and publish status
**And** required fields, inline errors, form summary, dirty state, and saving state are visible.

**Given** Admin manages variants
**When** Variant Matrix renders
**Then** rows support SKU/options, price, stock, status, duplicate option warnings, low-stock/archived states, and keyboard row actions.

**Given** Admin manages inventory
**When** Inventory Adjuster is used
**Then** quantity/state changes validate before submit
**And** stale/conflict responses rollback UI and show allowed next action.

**Given** Admin publishes product
**When** product is not publish-ready
**Then** UI shows missing readiness items from server response
**And** publish action is blocked without hiding draft save.

**Given** Admin lacks brand permission
**When** product belongs to unauthorized brand scope
**Then** UI hides/disables mutations with safe reason
**And** server denial remains source of truth.

**Given** design system rules apply
**When** catalog UI is reviewed
**Then** UI uses sharp 0px corners, 1px borders, no shadows/blur, text status badges, visible focus, and no card-heavy dashboard layout.

**Given** responsive/accessibility QA runs
**When** product editor/table is tested
**Then** tablet/desktop layouts work, narrow side panels become full-screen as needed, keyboard navigation works, labels/errors are associated, and text does not overflow buttons/badges/table cells.

**Given** implementation finishes
**When** tests/checks run
**Then** UI tests or documented QA cover product list, editor sections, variant matrix, inventory adjuster, publish readiness, permission states, and accessibility basics
**And** `npm run check` passes or blocker is documented.

### Story 3.10: Admin Shell, Navigation, and Session UI

As an Admin or Super Admin,
I want protected admin entry points and a JRW dashboard shell,
So that admin work starts from a real operational console instead of disconnected standalone pages.

**Requirements covered:** FR4, FR60, FR77, FR79; supports UX-DR10, UX-DR23, UX-DR30, UX-DR34, UX-DR35.

**Acceptance Criteria:**

**Given** unauthenticated user opens `/admin`
**When** no valid `jrw_admin_session` exists
**Then** Astro page middleware routes the user to an Admin sign-in route before protected dashboard UI renders
**And** no protected admin data is rendered.

**Given** authenticated Admin opens `/admin`
**When** the admin session cookie is valid
**Then** the dashboard shell renders from the server-gated page entry
**And** the primary experience does not show "Loading admin session" as a blocking page state.

**Given** Admin submits valid dashboard credentials
**When** `/api/admin/auth/sessions` succeeds
**Then** an HttpOnly admin session cookie is created
**And** Admin lands inside the dashboard shell.

**Given** Admin chooses sign out
**When** `/api/admin/auth/sessions/current` delete succeeds
**Then** the session is cleared
**And** UI returns to sign-in state.

**Given** Admin needs password recovery
**When** reset request or reset confirmation is submitted
**Then** UI consumes existing Admin password reset APIs
**And** reset completion does not create a new session.

**Given** Admin sign-in UI renders
**When** user needs an Admin account
**Then** the page states Admin accounts are created by Super Admin
**And** no signup or registration action is exposed.

**Given** Admin dashboard shell renders
**When** compared to Direction 05
**Then** sidebar, top context bar, role badge, active brand scope area, search/action region, skip link, landmarks, and keyboard navigation are present.

**Given** Super Admin dashboard shell renders
**When** owner-only navigation is visible
**Then** Admin Accounts, Ownership Transfer, and Audit are separated from daily Admin navigation.

**Given** Admin lacks permission for a route
**When** protected view is blocked
**Then** a safe forbidden state appears inside the shell
**And** owner-only controls are not exposed.

**Given** implementation finishes
**When** tests/QA run
**Then** checks cover sign-in, sign-out, password reset entry, absence of registration affordance, shell landmarks, sidebar/topbar rendering, forbidden state, and `npm run check`
**And** blockers are documented if any API dependency is unavailable.

### Story 3.11: Admin Dashboard Console Fidelity

As an Admin,
I want existing admin resources wrapped in the approved JRW console design,
So that product, brand, category, inventory, and owner work keeps functionality while matching the UX reference.

**Requirements covered:** FR21-FR31, FR76, FR77, FR79; supports UX-DR10, UX-DR11, UX-DR23, UX-DR29, UX-DR31, UX-DR34, UX-DR35.

**Acceptance Criteria:**

**Given** Admin opens `/admin/products`
**When** products load
**Then** page passes through protected admin page middleware and renders inside dashboard shell with Direction 05 sidebar, top context bar, toolbar row, dense table-first work area, and editor/side-panel flow
**And** existing product search, filters, pagination, table view, list view, editor, variant, inventory, publish, and permission behavior remains intact.

**Given** Admin opens brand resources
**When** brand cards or list/table view renders
**Then** existing card/list functionality remains
**And** visual treatment follows the 1px module system without decorative card-heavy dashboard styling.

**Given** Admin opens categories
**When** category table, editor, loading, empty, or error state renders
**Then** UI uses the same dashboard toolbar, table density, focus, and status treatment.

**Given** Super Admin opens owner governance
**When** Admin Accounts or Ownership Transfer controls render
**Then** Direction 07 owner-governance composition is followed
**And** ownership transfer remains deliberate with confirmation and audit-safe wording.

**Given** tablet or wide desktop viewport is used
**When** dashboard pages render
**Then** shell remains usable, table/action text does not overflow, and side panels adapt per responsive admin rules.

**Given** implementation finishes
**When** tests/QA run
**Then** checks cover products, brands, categories, owner governance, preserved view toggles, preserved resource actions, shell composition, keyboard access, text overflow, and `npm run check`
**And** blockers are documented if any page cannot be wrapped safely.

## Epic 4: Product-First Storefront and Cart

Prospects browse JRW storefront, inspect products, understand availability, and customers manage cart before checkout.

### Story 4.1: Storefront Shell, Design Tokens, and Public Navigation

As a Prospect,
I want a sharp JRW storefront shell with clear navigation,
So that I can browse products without an account wall.

**Requirements covered:** FR32, FR33; supports FR9, FR78; UX-DR1, UX-DR23, UX-DR28, UX-DR30.

**Acceptance Criteria:**

**Given** Prospect opens storefront
**When** page loads
**Then** JRW identity, category/search navigation, cart access, and account access are visible
**And** no account sign-in is required before browsing.

**Given** design tokens are loaded
**When** storefront UI renders
**Then** it uses JRW Technical Brutalist tokens: 0px radius, 1px borders, no shadows/blur, cobalt accent, Satoshi headings where available, Space Mono utility text where available.
**And** implementation uses Tailwind utilities and JRW brand tokens directly in markup instead of custom `jrw-*` storefront selectors.

**Given** storefront shell is responsive
**When** viewport is mobile, tablet, desktop, or wide desktop
**Then** navigation remains usable
**And** desktop does not feel like stretched mobile.

**Given** public navigation links render
**When** user activates logo, categories/search, cart, or account entry
**Then** links/actions route to expected storefront/cart/account surfaces
**And** keyboard focus state is visible.

**Given** public storefront page renders
**When** metadata is generated
**Then** page has SEO-safe title/description and crawlable product/category structure baseline
**And** no protected admin/customer data is exposed.

**Given** reduced motion is enabled
**When** navigation or shell interactions occur
**Then** motion respects `prefers-reduced-motion`.

**Given** implementation finishes
**When** QA runs
**Then** storefront shell is checked at 320, 375, 390, 430, 768, 1024, and 1440px
**And** `npm run check` passes or blocker is documented.

### Story 4.2: Product Grid, Category Browsing, Search, and Filters

As a Prospect,
I want to browse JRW products by grid, category, search, and filters,
So that I can discover available products quickly.

**Requirements covered:** FR32, FR33, FR34; UX-DR3, UX-DR4, UX-DR25, UX-DR28.

**Acceptance Criteria:**

**Given** Prospect opens storefront product grid
**When** published products exist
**Then** grid shows product image, product name, brand/category where available, price, availability text, and quick action
**And** unpublished/archived products are not shown.

**Given** Prospect selects category
**When** category page or filter loads
**Then** products in that category are shown
**And** empty category shows alternatives/recovery state.

**Given** Prospect uses search/filter controls
**When** criteria are applied
**Then** grid updates using documented query params
**And** pagination uses default page size 20 and maximum 100.

**Given** product has no brand
**When** card renders
**Then** card does not imply missing seller/store
**And** brandless product remains valid storefront item.

**Given** product availability is low/out/preorder
**When** card renders
**Then** availability appears as text label, not color alone
**And** unavailable quick action is disabled or explained.

**Given** grid loads or errors
**When** loading/error/empty state renders
**Then** dimensions remain stable
**And** customer-safe recovery message is shown.

**Given** responsive rules apply
**When** grid is viewed on mobile/tablet/desktop
**Then** mobile uses 1-2 columns, tablet 2-4 columns, desktop 12-column system
**And** product card text/buttons/badges do not overflow.

**Given** implementation finishes
**When** QA/tests run
**Then** checks cover product grid, category browsing, search/filter query, pagination, empty/error/loading states, availability labels, and responsive widths
**And** `npm run check` passes or blocker is documented.

### Story 4.3: Product Detail Experience

As a Prospect or Customer,
I want to inspect product details, images, price, variants, and availability,
So that I can choose a valid product option confidently.

**Requirements covered:** FR34; supports FR35; UX-DR5.

**Acceptance Criteria:**

**Given** published product exists
**When** user opens product detail
**Then** page/panel shows product name, images, description, brand/category where available, price, variants, and availability
**And** unpublished/archived products are not publicly accessible except documented fallback.

**Given** user selects variant
**When** variant is available
**Then** selected variant, price, availability, and add-to-cart state update clearly
**And** selected state is keyboard accessible.

**Given** selected variant is unavailable/out of stock/archived
**When** user selects or views it
**Then** add-to-cart is blocked
**And** unavailable reason appears as text.

**Given** product has multiple images
**When** user changes image
**Then** gallery updates without layout shift
**And** image alt text/customer-safe labels exist.

**Given** product has no brand
**When** detail renders
**Then** UI does not imply missing seller/store
**And** JRW remains seller of record.

**Given** desktop viewport is wide enough
**When** detail opens from grid
**Then** product detail may use side panel or full page per UX
**And** mobile uses full page/sheet behavior with focus management if overlay.

**Given** page metadata is generated
**When** product detail renders
**Then** product name, description, price display, availability, primary image, and brand/category metadata where available are crawlable.

**Given** implementation finishes
**When** QA/tests run
**Then** checks cover published detail, missing product, unpublished/archived handling, variant selection, unavailable state, gallery, SEO metadata, keyboard access, and mobile/desktop layout
**And** `npm run check` passes or blocker is documented.

Correction sequencing note: Stories 4.8, 4.9, and 4.10 were added after 4.3 and must run before Story 4.4. Existing 4.4-4.7 IDs are not renumbered to avoid breaking sprint references.

### Story 4.8: Shared Primitive Visual Contract

As a Customer, Prospect, Admin, or Super Admin,
I want shared controls to follow the approved JRW HTML direction,
So that storefront, dashboard, and checkout interactions feel consistent.

**Requirements covered:** FR78, FR79; supports UX-DR1, UX-DR2, UX-DR30, UX-DR34, UX-DR35.

**Acceptance Criteria:**

**Given** `Button` or `IconButton` renders
**When** hover or focus-visible state is active
**Then** cobalt outline appears with 2px width and 2px offset
**And** hover does not rely on border-color-only feedback.

**Given** primary button renders
**When** idle
**Then** background and border use cobalt accent
**And** text remains white with no shadow/blur.

**Given** secondary button renders
**When** idle
**Then** it keeps surface background, 1px strong border, sharp corners, Space Mono/system label, and no shadow/blur.

**Given** shared primitives render statuses, loading, disabled, and error states
**When** reviewed against the HTML direction
**Then** 0px radius, 1px borders, text status, visible focus, and tokenized cobalt accent are preserved.

**Given** primitive tests run
**When** classes/markup are asserted
**Then** button hover/focus contract, disabled/loading states, and accessible icon labels are covered
**And** `npm run check` passes or blocker is documented.

### Story 4.9: Storefront Product Card and Detail Fidelity

As a Prospect or Customer,
I want product browsing components to match JRW storefront design direction,
So that the catalog feels like the approved architectural system, not a generic ecommerce card grid.

**Requirements covered:** FR32, FR33, FR34, FR78, FR79; supports UX-DR3, UX-DR4, UX-DR5, UX-DR28, UX-DR31, UX-DR35.

**Acceptance Criteria:**

**Given** storefront product grid renders
**When** compared to Direction 01
**Then** accepted page layout, header, filters, and billboard/hero structure remain intact
**And** only product-card/detail visual anatomy changes unless explicitly approved.

**Given** product card renders with image
**When** viewed on mobile, tablet, or desktop
**Then** media area keeps strict bordered module behavior, stable dimensions, object-fit treatment, and no rounded/shadow framing.

**Given** product card renders without image
**When** placeholder appears
**Then** diagonal placeholder pattern and numbered/initial module style follows the HTML reference.

**Given** product metadata renders
**When** card is scanned
**Then** brand, category, and availability appear as compact slash-separated utility metadata where useful
**And** no status relies on color alone.

**Given** price and action render
**When** card is viewed or focused
**Then** price is compact, action uses shared button primitive, and hover/focus shows cobalt outline treatment.

**Given** product detail renders
**When** compared to Direction 02
**Then** detail media, variants, price, availability, and add-to-cart affordance use the same sharp 1px module language.

**Given** existing browse behavior exists
**When** fidelity update is complete
**Then** search, filters, pagination, category browsing, product links, and current card/list/table behavior remain intact.

**Given** implementation finishes
**When** QA/tests run
**Then** checks cover product card anatomy, image/missing-image states, metadata, price/action, product detail visual contract, preserved layout, responsive widths, text overflow, and `npm run check`
**And** blockers are documented if any layout cannot be preserved.

### Story 4.10: Future Story UI Fidelity Gate

As project owner,
I want future UI stories to cite exact design-direction references,
So that sprint work does not repeat expectation-versus-reality UI drift.

**Requirements covered:** FR77, FR79; supports UX-DR31, UX-DR34, UX-DR35.

**Acceptance Criteria:**

**Given** a new UI story is created
**When** it touches storefront
**Then** it cites Direction 01, 02, 03, or 04 as applicable
**And** acceptance criteria name exact product/card/detail/cart/checkout fidelity checks.

**Given** a new UI story is created
**When** it touches admin
**Then** it cites Direction 05 or 07 as applicable
**And** acceptance criteria name shell/sidebar/topbar/table density/governance fidelity checks.

**Given** a shared primitive is changed
**When** story is reviewed
**Then** hover, focus, status, empty, loading, disabled, and error states are checked against the HTML direction and UX spec.

**Given** implementation passes type checks
**When** reviewer evaluates done status
**Then** visual fidelity still requires manual or automated component QA before story can be considered done.

**Given** story template or planning guidance is updated
**When** future stories are generated
**Then** exact UX direction references and layout-preservation notes are present by default.

### Story 4.4: Cart Add, Update, Remove

**Prerequisite:** Story 4.8 and Story 4.9 must be complete before implementation begins. Story 4.10 must be complete before new UI-heavy stories are created after this point.

As a Customer or Prospect,
I want to add available variants to cart and update or remove cart items,
So that I can prepare my purchase before checkout.

**Requirements covered:** FR35, FR36, FR37; supports FR38; UX-DR6.

**Acceptance Criteria:**

**Given** user selects available published variant
**When** user adds item to cart
**Then** cart contains product/variant ID, quantity, current display snapshot summary, and price shown to user
**And** cart count updates visibly.

**Given** user updates cart item quantity
**When** quantity is valid
**Then** cart item quantity and subtotal update
**And** UI shows pending/success state without layout shift.

**Given** user removes cart item
**When** remove action succeeds
**Then** item is removed
**And** empty cart state appears when no items remain.

**Given** user attempts invalid quantity
**When** quantity is below minimum, above allowed limit, or not numeric
**Then** validation error appears
**And** prior valid cart state remains.

**Given** cart drawer opens on desktop
**When** drawer is active
**Then** focus is trapped and restored on close
**And** cart shows line items, quantities, price, stock warnings, subtotal, and checkout action.

**Given** user views cart on mobile
**When** cart summary/action appears
**Then** sticky cart/action behavior does not cover content
**And** controls meet 44px touch target guidance.

**Given** product becomes unavailable after cart add
**When** cart refreshes or user changes quantity
**Then** cart marks stale/unavailable item with text reason
**And** checkout action is blocked until resolved.

**Given** implementation finishes
**When** tests/QA run
**Then** checks cover add, update, remove, invalid quantity, empty cart, drawer focus, mobile sticky behavior, stale inventory display, and safe price display
**And** `npm run check` passes or blocker is documented.

### Story 4.5: Availability Blocking Before Checkout

As a Customer,
I want unavailable cart items blocked before checkout,
So that I do not attempt payment for products JRW cannot sell.

**Requirements covered:** FR38; supports FR39.

**Acceptance Criteria:**

**Given** cart contains published available variants
**When** Customer starts checkout
**Then** system validates product status, variant status, price visibility, stock quantity, and inventory state before payment flow
**And** valid cart can proceed to checkout entry.

**Given** cart contains unavailable, archived, out-of-stock, or invalid variant
**When** Customer starts checkout
**Then** checkout is blocked
**And** affected line items show text reasons and suggested actions.

**Given** cart item price changed after add
**When** checkout validation runs
**Then** Customer sees updated price before payment
**And** payment handoff cannot start until Customer accepts current cart state.

**Given** cart item stock changed after add
**When** validation runs
**Then** quantity is reduced or blocked according to available stock
**And** Customer receives safe inventory message.

**Given** cart validation fails
**When** response returns
**Then** response uses standard error envelope
**And** no PayMongo payment or inventory reservation is created.

**Given** validation succeeds
**When** response returns
**Then** response uses standard success envelope with validated cart summary
**And** checkout can proceed to Epic 5 payment flow.

**Given** implementation finishes
**When** tests run
**Then** tests cover valid cart, unavailable variant, archived product, price change, stock change, stale cart recovery, and no payment creation on blocked checkout
**And** `npm run check` passes or blocker is documented.

### Story 4.6: Storefront Responsive, Accessibility, and Performance QA

As a Prospect or Customer,
I want storefront browsing and cart UI to work across devices and assistive flows,
So that JRW shopping feels fast, readable, and trustworthy.

**Requirements covered:** Supports FR32-FR38; UX-DR28, UX-DR30, UX-DR31, UX-DR32, UX-DR33.

**Acceptance Criteria:**

**Given** storefront, product grid, detail, and cart are implemented
**When** responsive QA runs
**Then** pages are checked at 320, 375, 390, 430, 768, 1024, and 1440px
**And** sticky cart/action bars do not cover content.

**Given** storefront UI renders dynamic text
**When** product names, prices, badges, buttons, and table/list cells are long
**Then** text does not overflow or overlap
**And** layout dimensions remain stable.

**Given** accessibility QA runs
**When** core storefront paths are tested
**Then** keyboard navigation works for header, filters, product cards, product detail, cart drawer, and checkout entry
**And** focus is visible.

**Given** automated accessibility scan is available
**When** scan runs on core storefront pages
**Then** WCAG 2.2 AA contrast and form/control issues are fixed or documented as blockers
**And** status never relies on color alone.

**Given** reduced motion is enabled
**When** drawers, sheets, filters, or transitions render
**Then** motion respects `prefers-reduced-motion`.

**Given** performance targets exist
**When** storefront and product detail are profiled
**Then** usable storefront load and product detail LCP target under 2.5s p75 are met or blockers documented
**And** product-list images target <= 250KB and detail primary images target <= 1MB after processing.

**Given** implementation finishes
**When** QA summary is written
**Then** responsive, accessibility, reduced-motion, text-overflow, and performance checks are recorded
**And** `npm run check` passes or blocker is documented.

### Story 4.7: Storefront and Cart UI Primitive Extensions

As a Customer, Prospect, Admin, or Super Admin,
I want storefront and cart UI to extend the shared primitive kit instead of creating duplicate controls,
So that storefront, checkout, dashboard, and governance flows behave predictably while each epic can add only the components it needs.

**Requirements covered:** UX-DR2; supports FR32-FR58 UI flows and FR78.

**Acceptance Criteria:**

**Given** Story 1.5 baseline primitives already exist
**When** storefront and cart UI need common controls
**Then** they reuse or extend existing `Button`, `IconButton`, `Input`, `Select`, `Checkbox`, `Toggle`, `Badge`, `StatusBadge`, `Tabs`, `Modal`, `Toast`, `ConfirmDialog`, `EmptyState`, and `Skeleton`
**And** duplicate feature-local versions of those base controls are not introduced.
**And** styling composes Tailwind utilities and JRW brand tokens directly instead of recreating feature/storefront CSS class layers.

**Given** storefront and cart flows need reusable UI beyond the Epic 1 baseline
**When** missing generic primitives are implemented
**Then** shared extensions exist for `SegmentedControl`, `Drawer`, `SidePanel`, and `Pagination` where needed by storefront/cart flows
**And** feature components such as `ProductCard`, `ProductGrid`, `ProductDetailPanel`, and `CartDrawer` stay under `src/features/**` while composing shared primitives.

**Given** future checkout or order stories need additional generic primitives
**When** a later epic requires components such as `Stepper` or timeline/list variants
**Then** that epic can add them under the appropriate `src/components/**` area if reused across features
**And** otherwise keeps them local to the feature module.

**Given** primitives render interactive controls
**When** keyboard navigation and focus are tested
**Then** controls are reachable and operable by keyboard
**And** unfamiliar icon buttons have accessible names/tooltips.

**Given** primitives render statuses, errors, loading, and empty states
**When** UI states are shown
**Then** status is text-labeled, errors are associated with controls, skeletons keep stable dimensions, and empty states provide safe next action.

**Given** modal, drawer, side panel, and confirmation primitives are used
**When** overlays open and close
**Then** focus is trapped, restored on close, and destructive actions require explicit action.

**Given** responsive constraints apply
**When** primitives are used in narrow and wide layouts
**Then** text does not overflow buttons, badges, tabs, counters, or table cells
**And** touch targets meet 44px guidance where used in customer/mobile flows.

**Given** implementation finishes
**When** tests/QA run
**Then** checks cover primitive rendering, focus, labels, disabled/loading/error states, overlay focus management, reduced motion, and text overflow
**And** `npm run check` passes or blocker is documented.

## Epic 5: Inventory-Safe Checkout and PayMongo Payments

Customers submit checkout, inventory is reserved/validated, PayMongo payment state reconciles safely, webhooks are verified/idempotent, and payment emails send.

### Story 5.1: Checkout Identity, Contact, and Delivery Validation

As a Customer,
I want checkout to collect and validate identity, contact, and delivery details,
So that JRW has enough trusted information before payment.

**Requirements covered:** FR39; supports FR5, FR6, FR7, FR8; UX-DR7, UX-DR22.

**Acceptance Criteria:**

**Given** Customer starts checkout
**When** Customer is not signed in or email is not verified where required
**Then** checkout prompts sign-in, registration, verification, or Google sign-in
**And** cart contents remain intact.

**Given** authenticated verified Customer enters contact/delivery details
**When** details are valid
**Then** checkout can proceed to server cart validation
**And** details are stored or used only for checkout/account purposes.

**Given** contact/delivery details are invalid or missing
**When** Customer submits checkout step
**Then** field-level errors and form-level summary appear
**And** payment handoff is blocked.

**Given** privacy requirements apply
**When** checkout captures PII
**Then** only required fields for checkout/fulfillment/support are collected
**And** logs do not emit unnecessary PII.

**Given** checkout UI renders
**When** desktop and mobile layouts are used
**Then** steps show cart, contact/delivery, payment, and confirmation
**And** current step is exposed with text and `aria-current`.

**Given** implementation finishes
**When** tests/QA run
**Then** checks cover unauthenticated gate, unverified email gate, valid details, invalid details, PII minimization, mobile/desktop layout, and `npm run check`
**And** blockers are documented if validation cannot pass.

### Story 5.2: Server Cart Validation and Inventory Reservation

As a Customer,
I want JRW to validate and reserve inventory before payment,
So that checkout cannot oversell limited stock.

**Requirements covered:** FR47; supports FR38, FR39.

**Acceptance Criteria:**

**Given** Customer submits checkout for cart items
**When** server validation runs
**Then** product status, variant status, current price, stock quantity, and inventory state are validated
**And** unavailable items block checkout.

**Given** cart is valid and stock is available
**When** reservation runs
**Then** inventory is reserved through Durable Object coordination and/or documented optimistic stock versioning
**And** reservation result is tied to checkout attempt.

**Given** concurrent checkout attempts target limited stock
**When** at least 100 simultaneous attempts run in test
**Then** system prevents oversell
**And** losing attempts receive `INVENTORY_UNAVAILABLE` or documented conflict error.

**Given** reservation fails
**When** response returns
**Then** payment handoff does not start
**And** reserved stock is not partially retained.

**Given** reservation succeeds
**When** response returns
**Then** response includes checkout attempt/reservation reference needed for payment creation
**And** no raw internal lock details are exposed.

**Given** implementation finishes
**When** tests run
**Then** tests cover valid reservation, unavailable inventory, concurrent oversell prevention, partial failure cleanup, and safe errors
**And** `npm run check` passes or blocker is documented.

### Story 5.3: PayMongo Payment Creation and Handoff

As a Customer,
I want to pay through PayMongo under JRW seller account,
So that payment is handled by a provider while JRW never collects raw card details.

**Requirements covered:** FR41; supports FR39, FR40.

**Acceptance Criteria:**

**Given** checkout attempt has valid reservation
**When** payment creation is requested
**Then** PayMongo checkout/payment is created using single JRW merchant account
**And** JRW app never collects raw card details.

**Given** payment request is built
**When** provider payload is created
**Then** amount uses centavos, item summary matches validated cart, and checkout attempt reference is included for reconciliation
**And** raw provider payload is not exposed to Customer.

**Given** PayMongo returns handoff URL or payment reference
**When** response returns
**Then** Customer can proceed to PayMongo-controlled payment
**And** response uses standard envelope or safe redirect behavior.

**Given** provider fails, times out, or rejects request
**When** payment creation fails
**Then** response maps to `PROVIDER_UNAVAILABLE`, `PAYMENT_FAILED`, or documented safe code
**And** reserved inventory is released immediately or queued for reconciliation.

**Given** payment creation succeeds
**When** audit/log hooks run
**Then** safe request ID, checkout attempt, amount, and provider reference are logged
**And** secrets/raw payment payloads are scrubbed.

**Given** implementation finishes
**When** tests run
**Then** tests cover payment creation success, centavos amount, JRW merchant account boundary, provider failure, no raw card collection, and safe logging
**And** `npm run check` passes or blocker is documented.

### Story 5.4: PayMongo Webhook Verification and Idempotency

As JRW,
I want PayMongo webhooks verified and processed idempotently,
So that payment events cannot be spoofed or duplicated.

**Requirements covered:** FR42, FR43, FR44.

**Acceptance Criteria:**

**Given** webhook request has missing or invalid PayMongo signature
**When** webhook endpoint receives it
**Then** request is rejected before any state mutation
**And** failure logs safe request ID/context only.

**Given** webhook signature is valid
**When** event is processed
**Then** event idempotency key is recorded before mutation
**And** duplicate valid events do not duplicate orders, payments, stock movements, or emails.

**Given** duplicate event payload matches prior event
**When** webhook is retried
**Then** system returns safe idempotent response
**And** no duplicate side effects occur.

**Given** duplicate event ID conflicts with different payload
**When** webhook is processed
**Then** system returns/logs `IDEMPOTENCY_CONFLICT` or documented safe code
**And** mutation is blocked.

**Given** webhook event type is unsupported
**When** endpoint receives it
**Then** system records safe ignored/unsupported event state
**And** no payment/order mutation occurs.

**Given** implementation finishes
**When** tests run
**Then** tests cover valid signature, invalid signature, duplicate event, idempotency conflict, unsupported event, and no mutation before verification
**And** `npm run check` passes or blocker is documented.

### Story 5.5: Payment Reconciliation and Order Confirmation

As a Customer,
I want JRW to reconcile payment state before confirming my order,
So that checkout success reflects server truth, not redirect parameters.

**Requirements covered:** FR40, FR42, FR45, FR46, FR62.

**Acceptance Criteria:**

**Given** PayMongo reports payment success through verified webhook or server reconciliation
**When** payment is confirmed
**Then** payment status becomes `PAYMENT_PAID`
**And** order/checkout confirmation can be created from JRW server state.

**Given** PayMongo redirect returns success-like params
**When** Customer lands on success page
**Then** JRW checks server payment state
**And** redirect params alone do not finalize order/payment.

**Given** payment is pending or reconciliation delayed
**When** Customer views confirmation/status
**Then** UI shows payment pending/reconciliation message
**And** no false paid confirmation is shown.

**Given** payment fails or is cancelled
**When** reconciliation runs
**Then** payment status becomes `PAYMENT_FAILED` or `PAYMENT_CANCELLED`
**And** Customer sees safe retry/return-to-cart action.

**Given** order confirmation is created
**When** email notification runs
**Then** order confirmation email is sent or queued
**And** email payload contains only safe order/customer details.

**Given** implementation finishes
**When** tests run
**Then** tests cover paid, pending, failed, cancelled, redirect-not-trusted, confirmation email, and safe customer labels
**And** `npm run check` passes or blocker is documented.

### Story 5.6: Release Reserved Inventory After Failed or Cancelled Payment

As JRW,
I want reserved inventory released after failed or cancelled payment,
So that stock does not remain stuck and future customers can buy available products.

**Requirements covered:** FR48; supports FR42, FR44, FR47.

**Acceptance Criteria:**

**Given** checkout reservation exists and payment fails
**When** failure is reconciled
**Then** reserved stock is released
**And** release is idempotent.

**Given** checkout reservation exists and payment is cancelled
**When** cancellation is reconciled
**Then** reserved stock is released
**And** Customer can return to cart safely.

**Given** payment remains pending beyond allowed window
**When** reconciliation job/manual process runs
**Then** reservation is released within 5 minutes or documented reconciliation behavior
**And** stale pending state is visible to operations.

**Given** release operation is retried
**When** same reservation is released again
**Then** stock is not over-restored
**And** idempotent result is returned.

**Given** release fails due to provider/storage/runtime error
**When** operation fails
**Then** safe operational event is logged with request ID
**And** issue is retryable without duplicate stock movement.

**Given** implementation finishes
**When** tests run
**Then** tests cover failed payment release, cancelled payment release, timeout reconciliation, duplicate release, release failure retry, and no over-restoration
**And** `npm run check` passes or blocker is documented.

### Story 5.7: Checkout Receipt, Payment Status, and Payment Emails

As a Customer,
I want checkout receipt and payment status updates that are clear and safe,
So that I know what happened after payment without seeing provider internals.

**Requirements covered:** FR40, FR63; supports FR45, FR46; UX-DR8.

**Acceptance Criteria:**

**Given** Customer reaches confirmation page
**When** payment is paid
**Then** receipt shows order number/reference, items, totals, payment status, fulfillment status, and next action
**And** provider internals are hidden.

**Given** payment is pending, failed, or cancelled
**When** Customer views receipt/status
**Then** UI shows safe status label and next action
**And** no raw PayMongo error appears.

**Given** payment success or failure email is triggered
**When** email sends
**Then** Customer receives safe payment status email
**And** operational failures are logged and retryable where action remains valid.

**Given** receipt/status UI renders
**When** desktop and mobile QA run
**Then** content is readable, status labels are text-based, and buttons meet touch/focus requirements
**And** receipt style follows JRW tokens.

**Given** implementation finishes
**When** tests/QA run
**Then** checks cover paid receipt, pending status, failed status, cancelled status, email success/failure, mobile/desktop layout, and safe messaging
**And** `npm run check` passes or blocker is documented.

## Epic 6: Orders, Fulfillment, Returns, Refunds, and Customer Status

Customers and Admins can track orders; Admins can progress fulfillment and record manual return/refund history with safe customer labels.

### Story 6.1: Customer Own-Order Status View

As a Customer,
I want to view my own order status,
So that I can track payment, fulfillment, return, and refund state safely.

**Requirements covered:** FR49, FR58; supports FR31; UX-DR9, UX-DR26.

**Acceptance Criteria:**

**Given** Customer is authenticated
**When** Customer lists own orders
**Then** only that Customer's orders are returned
**And** response uses standard envelope.

**Given** Customer opens order detail
**When** order belongs to Customer
**Then** order items, totals, payment status, fulfillment status, return status, refund status, and timestamps are shown with safe labels
**And** provider/internal details are hidden.

**Given** Customer attempts to access another Customer order
**When** request is processed
**Then** system returns forbidden/not found per documented contract
**And** no order details leak.

**Given** order includes historical product snapshot
**When** detail renders
**Then** purchased product name, variant, price, quantity, and image reference come from snapshot
**And** current catalog changes do not alter order history.

**Given** implementation finishes
**When** tests/QA run
**Then** checks cover own-order list, own-order detail, cross-customer denial, snapshot display, safe labels, and `npm run check`
**And** blockers are documented if validation cannot pass.

### Story 6.2: Admin Order List and Detail

As an Admin,
I want to view order list and order details,
So that JRW can operate fulfillment, returns, refunds, and customer support.

**Requirements covered:** FR50, FR51; supports FR58.

**Acceptance Criteria:**

**Given** active approved Admin is authenticated
**When** Admin opens order list
**Then** orders show customer-safe summary, payment status, fulfillment status, return/refund indicators, timestamps, and filters
**And** pagination uses default page size 20 and maximum 100.

**Given** Admin opens order detail
**When** order exists
**Then** detail shows items, snapshots, totals, customer/contact data needed for fulfillment, payment lane, fulfillment lane, return lane, refund lane, and audit-safe timestamps
**And** unnecessary PII/provider internals are hidden.

**Given** unauthorized actor attempts admin order access
**When** request is processed
**Then** system returns forbidden/unauthorized error
**And** no order data leaks.

**Given** order list/detail APIs are complete
**When** docs are generated
**Then** schemas, auth metadata, pagination params, rate-limit class, and error codes are documented.

**Given** implementation finishes
**When** tests run
**Then** tests cover list pagination, filters, detail, unauthorized denial, safe PII exposure, and snapshot usage
**And** `npm run check` passes or blocker is documented.

### Story 6.3: Fulfillment Status Transitions and Emails

As an Admin,
I want to move orders through valid fulfillment statuses,
So that Customers can track delivery progress.

**Requirements covered:** FR52, FR53, FR64; supports FR45.

**Acceptance Criteria:**

**Given** order is eligible for next fulfillment status
**When** Admin updates status
**Then** order fulfillment status changes to valid next state
**And** payment status remains separate.

**Given** Admin attempts invalid fulfillment transition
**When** request is processed
**Then** system returns `CONFLICT_STATE` or documented conflict code
**And** fulfillment status remains unchanged.

**Given** payment is not in required state for fulfillment transition
**When** Admin attempts transition
**Then** system blocks transition with safe reason
**And** no fulfillment state changes.

**Given** fulfillment status changes
**When** notification runs
**Then** fulfillment status update email is sent or queued
**And** failure is logged/retryable without rolling back valid domain state unless documented.

**Given** status update succeeds
**When** audit/event hooks run
**Then** safe actor, order target, old/new status, timestamp, and request ID are recorded or emitted.

**Given** implementation finishes
**When** tests run
**Then** tests cover valid transitions, invalid transitions, payment-state gate, email success/failure, audit event, and status separation
**And** `npm run check` passes or blocker is documented.

### Story 6.4: Manual Return Recording

As an Admin,
I want to record manual return status and details for an order or item,
So that JRW can track return handling without automating provider refunds.

**Requirements covered:** FR54, FR56, FR57, FR58.

**Acceptance Criteria:**

**Given** Admin opens return recorder
**When** Admin records return status
**Then** status is one of `RETURN_NOT_REQUESTED`, `RETURN_REQUESTED`, `RETURN_APPROVED`, `RETURN_REJECTED`, or `RETURN_RECEIVED`
**And** invalid status is rejected.

**Given** Admin submits return details
**When** details are valid
**Then** reason, notes, actor, timestamp, order/item target, and request ID are retained
**And** history is append-only or auditable.

**Given** Admin attempts invalid return transition
**When** request is processed
**Then** system returns `CONFLICT_STATE` or documented conflict code
**And** prior return state remains unchanged.

**Given** unauthorized actor attempts return recording
**When** request is processed
**Then** system returns forbidden/unauthorized error
**And** no return history is added.

**Given** return record is shown to Customer
**When** status is exposed
**Then** label is customer-safe and color-independent
**And** internal notes are hidden unless explicitly customer-safe.

**Given** implementation finishes
**When** tests run
**Then** tests cover valid return record, invalid status, invalid transition, unauthorized denial, history retention, and customer-safe label
**And** `npm run check` passes or blocker is documented.

### Story 6.5: Manual Refund Recording

As an Admin,
I want to record manual refund status and details for an order or item,
So that JRW can track refund handling without implying automated PayMongo refund execution.

**Requirements covered:** FR55, FR56, FR57, FR58.

**Acceptance Criteria:**

**Given** Admin opens refund recorder
**When** Admin records refund status
**Then** status is one of `REFUND_NOT_REQUESTED`, `REFUND_REQUESTED`, `REFUND_APPROVED`, `REFUND_REJECTED`, or `REFUND_COMPLETED`
**And** invalid status is rejected.

**Given** Admin submits refund details
**When** details are valid
**Then** reason, amount centavos, notes, reference ID, actor, timestamp, order/item target, and request ID are retained
**And** history is append-only or auditable.

**Given** refund amount is invalid or exceeds allowed order/item amount
**When** refund record is submitted
**Then** system returns validation/conflict error
**And** prior refund state remains unchanged.

**Given** Admin records refund status
**When** UI/API language is reviewed
**Then** copy says manual refund record/status
**And** does not claim PayMongo refund was executed.

**Given** unauthorized actor attempts refund recording
**When** request is processed
**Then** system returns forbidden/unauthorized error
**And** no refund history is added.

**Given** implementation finishes
**When** tests run
**Then** tests cover valid refund record, invalid status, invalid amount, invalid transition, unauthorized denial, history retention, and no automated PayMongo wording
**And** `npm run check` passes or blocker is documented.

### Story 6.6: Order Truth Timeline and Status UX

As a Customer or Admin,
I want order status displayed in separate truthful lanes,
So that payment, fulfillment, return, and refund state are understandable.

**Requirements covered:** Supports FR49-FR58; UX-DR9, UX-DR16, UX-DR17, UX-DR26, UX-DR27.

**Acceptance Criteria:**

**Given** order timeline renders
**When** order has payment, fulfillment, return, and refund states
**Then** UI displays separate status lanes
**And** labels are text-based and color-independent.

**Given** Customer views timeline
**When** internal/provider status exists
**Then** Customer sees safe public labels only
**And** provider payloads, webhook details, and internal notes are hidden.

**Given** Admin views timeline
**When** valid next actions exist
**Then** UI shows allowed fulfillment, return, and refund actions
**And** unavailable actions are disabled with safe reason.

**Given** stale update conflict occurs
**When** Admin attempts status action
**Then** UI rolls back stale optimistic state
**And** shows allowed next action from server.

**Given** responsive/accessibility QA runs
**When** timeline is tested
**Then** mobile/tablet/desktop layouts are readable, keyboard usable, and badge/title/copy spacing follows UX spec
**And** text does not overflow.

**Given** implementation finishes
**When** tests/QA run
**Then** checks cover customer timeline, admin timeline, separate lanes, safe labels, disabled actions, conflict rollback, and accessibility basics
**And** `npm run check` passes or blocker is documented.

## Epic 7: Audit, Activity, Request IDs, and Safe Operations

Sensitive actions are auditable, authorized Admins can view activity, request IDs/logging/error tracking work, and secrets/PII stay scrubbed.

### Story 7.1: Audit Event Capture for Sensitive Actions

As JRW,
I want sensitive actions recorded as audit events,
So that account, brand, catalog, inventory, payment, refund/return, and order changes are traceable.

**Requirements covered:** FR65.

**Acceptance Criteria:**

**Given** sensitive account, ownership transfer, brand, catalog, inventory, payment, refund/return, or order action succeeds
**When** audit hook runs
**Then** audit event records actor, action, entity, entityId, safe details, timestamp, and request ID
**And** event name follows lower dot form where events are emitted.

**Given** action fails before mutation
**When** failure occurs
**Then** audit behavior follows documented policy for failed attempts
**And** security-relevant denied attempts can be reviewed where required.

**Given** audit details include changed values
**When** details are stored
**Then** secrets, tokens, raw payment payloads, password data, and unnecessary PII are excluded.

**Given** audit write fails after domain mutation
**When** action completes
**Then** failure is logged with request ID and safe context
**And** retry/operational handling is documented for critical audit failures.

**Given** implementation finishes
**When** tests run
**Then** tests cover audit event creation for each major domain, safe detail filtering, failed attempt policy, and audit write failure handling
**And** `npm run check` passes or blocker is documented.

### Story 7.2: Authorized Audit and Activity History

As an authorized Admin,
I want to view audit and activity history within my permission scope,
So that I can understand what changed without seeing data I should not access.

**Requirements covered:** FR66.

**Acceptance Criteria:**

**Given** Super Admin views audit history
**When** list endpoint is called
**Then** account, ownership, brand, catalog, inventory, payment, return/refund, and order events are visible according to owner authority
**And** pagination uses default 20 and maximum 100.

**Given** Admin views audit history
**When** list endpoint is called
**Then** Admin sees only events within authorized account/brand/catalog/order scope
**And** unauthorized events are hidden or forbidden per documented contract.

**Given** audit filters are used
**When** actor, entity, action, date, brand, or order filters are applied
**Then** results match filter criteria
**And** response uses standard envelope.

**Given** audit details are returned
**When** response is serialized
**Then** secrets, tokens, raw provider payloads, and unnecessary PII are not included
**And** request ID is visible where safe.

**Given** audit UI renders
**When** Admin opens activity page
**Then** actor, action, target, timestamp, request ID where safe, and safe details appear in dense table/timeline format
**And** keyboard navigation works.

**Given** implementation finishes
**When** tests/QA run
**Then** checks cover owner scope, admin scope, filters, pagination, PII scrubbing, forbidden access, and UI accessibility basics
**And** `npm run check` passes or blocker is documented.

### Story 7.3: Request ID and Safe Operational Logging

As JRW,
I want every API request to have a request ID and safe operational logs,
So that failures can be traced without exposing secrets or unnecessary PII.

**Requirements covered:** FR67, FR68.

**Acceptance Criteria:**

**Given** request includes `x-request-id`
**When** server context is derived
**Then** existing request ID is validated/used
**And** response/log context includes it where safe.

**Given** request lacks request ID
**When** server context is derived
**Then** system generates request ID
**And** typed context exposes it to controllers/services.

**Given** successful or failed API action logs operational event
**When** log is written
**Then** log includes request ID, actor role, safe actor identifier where available, target resource identifier where safe, error code where applicable, and timestamp
**And** no raw secrets/tokens/payment payloads are logged.

**Given** error response is safe to include request ID
**When** error envelope is returned
**Then** request ID appears in metadata/details according to response policy
**And** internal stack traces remain hidden.

**Given** implementation finishes
**When** tests run
**Then** tests cover incoming request ID, generated request ID, propagation to response/log, and safe error logging
**And** `npm run check` passes or blocker is documented.

### Story 7.4: Environment-Gated Error Tracking

As JRW,
I want production error events sent to configured tracking when enabled,
So that critical auth, checkout, payment, webhook, and image failures are visible before real payments.

**Requirements covered:** FR69.

**Acceptance Criteria:**

**Given** error tracking is disabled or not configured
**When** server error occurs
**Then** app continues using Cloudflare/platform logs and request ID
**And** no provider call is attempted.

**Given** error tracking is enabled in environment
**When** unhandled API exception or critical provider failure occurs
**Then** safe error event is sent to configured tracking adapter
**And** event includes request ID and safe context only.

**Given** critical failure categories occur
**When** auth/email verification, checkout/payment reconciliation, payment webhook, image upload, or unhandled API exception fails
**Then** event capture policy includes those categories
**And** production readiness notes warn real payments should wait until capture works or exception is approved.

**Given** error tracking provider fails
**When** event submission fails
**Then** failure does not expose secrets or break primary response flow beyond documented policy
**And** local/platform log records safe failure with request ID.

**Given** implementation finishes
**When** tests/config checks run
**Then** checks cover disabled mode, enabled mode, critical category capture, provider failure, and environment gating
**And** `npm run check` passes or blocker is documented.

### Story 7.5: Secret, Token, Payment Payload, and PII Scrubbing

As JRW,
I want logs, errors, audit details, and error tracking events scrubbed,
So that sensitive data never leaks through operations tooling.

**Requirements covered:** FR70; supports FR68, FR69.

**Acceptance Criteria:**

**Given** operational log/event contains password, JWT, OAuth token, PayMongo secret, raw payment payload, session cookie, pepper, or unnecessary PII
**When** scrubbing runs
**Then** sensitive values are removed or replaced with safe redaction marker
**And** structure remains useful for debugging.

**Given** public error is returned
**When** underlying failure contains DB/provider/stack details
**Then** response maps to safe error code/message
**And** internal details are not exposed.

**Given** audit details are stored
**When** audit payload includes changed values
**Then** fields are allowlisted or scrubbed according to data sensitivity
**And** payment/OAuth/provider payloads are excluded unless safe summary is explicitly allowed.

**Given** error tracking event is built
**When** event includes request/context data
**Then** scrubber removes secrets, tokens, raw payment payloads, cookies, and unnecessary PII before submission
**And** request ID remains.

**Given** implementation finishes
**When** automated tests or review checklist runs
**Then** checks cover password, hash, JWT, OAuth token, PayMongo secret, raw provider payload, cookie, address/phone where unnecessary, and stack trace redaction
**And** `npm run check` passes or blocker is documented.
