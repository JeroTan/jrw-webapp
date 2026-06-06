# Story 4.5: Availability Blocking Before Checkout

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Customer,
I want unavailable cart items blocked before checkout,
so that I do not attempt payment for products JRW cannot sell.

## Acceptance Criteria

1. Given cart contains published available variants, when Customer starts checkout, then system validates product status, variant status, price visibility, stock quantity, and inventory state before payment flow and valid cart can proceed to checkout entry.
2. Given cart contains unavailable, archived, out-of-stock, or invalid variant, when Customer starts checkout, then checkout is blocked and affected line items show text reasons and suggested actions.
3. Given cart item price changed after add, when checkout validation runs, then Customer sees updated price before payment and payment handoff cannot start until Customer accepts current cart state.
4. Given cart item stock changed after add, when validation runs, then quantity is reduced or blocked according to available stock and Customer receives safe inventory message.
5. Given cart validation fails, when response returns, then response uses standard error envelope and no PayMongo payment or inventory reservation is created.
6. Given validation succeeds, when response returns, then response uses standard success envelope with validated cart summary and checkout can proceed to Epic 5 payment flow.
7. Given implementation finishes, when tests run, then tests cover valid cart, unavailable variant, archived product, price change, stock change, stale cart recovery, and no payment creation on blocked checkout and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Lock scope, target files, and existing behavior before coding. (AC: 1-7)
  - [x] Re-read every UPDATE file listed in Current Code Intelligence before editing; the worktree is heavily modified and may include owner refactors.
  - [x] Treat browser cart state from Story 4.4 as convenience/display state only; server validation is the first checkout authority.
  - [x] Implement validation before checkout details/payment. Do not create PayMongo payment, reservation, order, payment record, webhook, email, or Durable Object stock lock in this story.
  - [x] Keep customer identity/contact validation out of scope. Story 5.1 handles sign-in, contact, delivery, and verification gates.
  - [x] Do not add DB migrations unless an implementation blocker proves a validation-only endpoint cannot read existing product/variant data.
  - [x] Do not introduce a new global state library or duplicate cart store. Extend `src/features/cart-checkout/store.ts` and `api.ts` only where needed.
  - [x] Do not use legacy `src/api/**` or admin/private catalog endpoints.
  - [x] Do not expose raw stock counts beyond already customer-safe `maxQuantity`, stock versions, R2 keys, DB row names, archived admin language, provider errors, or payment internals.

- [x] Task 2: Define cart validation domain contract and pure rules. (AC: 1-5, 7)
  - [x] Add focused domain logic under `src/domain/checkout/**`, recommended `cart-validation.ts` plus `cart-validation.test.ts`.
  - [x] Define request item shape from local cart snapshot: `productId`, `productSlug`, `variantId`, `quantity`, `priceCentavos`, and safe display snapshot fields needed for recovery.
  - [x] Define validated line output with current safe server fields: product/variant IDs, slug, name, variant label/options, `priceCentavos`, `priceLabel`, availability label, `maxQuantity`, quantity, line subtotal, recovery status, and customer-safe reason.
  - [x] Define cart-level output with `status` values such as `VALID`, `CHANGED`, and `BLOCKED`; subtotal centavos/label; total quantity; line count; and `requiresCustomerAcceptance`.
  - [x] Treat sellable inventory states consistently with public catalog semantics: `IN_STOCK`, `LOW_STOCK`, and `PREORDER` are customer-sellable; `OUT_OF_STOCK`, archived variants, missing variants, non-published products, and invalid product/variant matches block.
  - [x] For price changes, return current price and mark the line changed; do not silently proceed to checkout using stale local price.
  - [x] For stock/quantity changes, reduce to the safe maximum when current availability can satisfy a lower quantity; block when no safe sellable quantity remains.
  - [x] For invalid or empty cart payloads, return validation errors without changing server state.
  - [x] Keep rules pure enough for Vitest coverage without HTTP, D1, Durable Objects, PayMongo, or React runtime.

- [x] Task 3: Add checkout validation server stack. (AC: 1-7)
  - [x] Add `src/server/repositories/CheckoutRepository.ts` or a similarly focused repository that reads published product and variant truth from existing Drizzle schema.
  - [x] Reuse existing availability helpers from `src/domain/products/public-catalog.ts`, `src/domain/products/schemas.ts`, `src/domain/products/price-format.ts`, and existing repository mapping patterns where possible.
  - [x] Add `src/server/services/CheckoutService.ts` to normalize request body, load current product/variant data, call domain validation rules, and return `AppResult`.
  - [x] Add `src/server/controllers/CheckoutController.ts` to adapt service results into standard API envelopes with `apiSuccessWithRequestId` / `apiErrorWithRequestId`.
  - [x] Add `src/server/routes/checkout.routes.ts` and register it in `src/server/routes/index.ts` and `src/server/app.ts` route options.
  - [x] Endpoint: `POST /api/checkout/cart-validations`.
  - [x] Route metadata: auth mode `optional` or public-safe, roles `PROSPECT`/`CUSTOMER` when declared, tags `Checkout`, rate-limit class `checkout-payment`, and error codes `VALIDATION_FAILED`, `CONFLICT_STATE`, `INVENTORY_UNAVAILABLE`, `RESOURCE_NOT_FOUND`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`.
  - [x] Response behavior: valid cart returns `200 { data, meta }`; blocked/changed cart returns a safe error envelope, preferably `409 CONFLICT_STATE` for stale price/quantity or `409 INVENTORY_UNAVAILABLE` for unsellable inventory, with safe validation summary in `error.details`.
  - [x] Document in route description that brand membership is not required because only published public storefront product/variant data is read.
  - [x] Ensure no repository/service method mutates inventory, creates reservations, creates payments, writes orders, or calls provider clients.

- [x] Task 4: Integrate checkout validation into cart and checkout UI. (AC: 1-6)
  - [x] Add a feature API helper in `src/features/cart-checkout/api.ts`, recommended `validateCartBeforeCheckout`, that posts the current `CartState` to `/api/checkout/cart-validations`.
  - [x] Update `CartSummary` and the cart step summary in `CheckoutFlow.tsx` so checkout entry uses a real button action with pending/error/success state rather than blind navigation.
  - [x] On successful validation, allow navigation to `/checkout` details entry and preserve the validated cart summary for the current store state.
  - [x] On changed price or reduced quantity, update local cart lines with the server-safe current snapshot, show text reasons, and require explicit customer acceptance/retry before checkout can proceed.
  - [x] On unavailable/missing/archived/out-of-stock items, mark affected lines `UNAVAILABLE` or `STALE`, show safe reason text, keep remove/edit paths available, and block checkout.
  - [x] On provider/runtime validation failure, keep the current cart visible, mark checkout entry untrusted, show retry copy, and do not proceed.
  - [x] Update `/checkout` details page so direct visits validate or block before showing a meaningful details step. Do not let a direct `/checkout` load imply payment is ready when cart has not passed validation.
  - [x] Preserve existing drawer focus trap/restore, cart badge count, quantity controls, `/cart` page shell, and product detail add-to-cart behavior.
  - [x] Cite and satisfy UI fidelity Direction 02 for cart handoff/drawer language and Direction 04 for checkout stepper/blocked validation state.

- [x] Task 5: Add focused tests and API contract coverage. (AC: 1-7)
  - [x] Add domain tests for valid cart, empty cart, missing product, unpublished product, variant/product mismatch, archived variant via `stock_lock_version = -1`, out-of-stock inventory, preorder allowance, price change, quantity reduction, and quantity blocked.
  - [x] Add service tests with fake repositories proving no payment/reservation/order side effects are called or required.
  - [x] Add route tests proving `POST /api/checkout/cart-validations` is documented in OpenAPI with auth metadata, `checkout-payment` rate-limit class, standard envelopes, request ID propagation, and safe errors.
  - [x] Add UI/API tests for cart summary validation success, blocked item copy, price change acceptance, quantity reduction, provider failure retry, and direct `/checkout` blocked state.
  - [x] Keep existing cart tests green: `src/domain/checkout/cart.test.ts`, `src/features/cart-checkout/store.test.ts`, and `src/features/cart-checkout/components/cart-ui.test.tsx`.
  - [x] If public catalog DTOs are reused or changed, extend `PublicCatalogService` and `public-catalog.routes` tests rather than weakening them.

- [x] Task 6: Validate and document blockers. (AC: 7)
  - [x] Run targeted tests:
    - `npx vitest run src/domain/checkout/**/*.test.ts`
    - `npx vitest run src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts`
    - `npx vitest run src/features/cart-checkout/**/*.test.tsx`
  - [x] Run `npm run check`.
  - [x] Run `npm run build-test` if no local blocker appears, because this story touches checkout/inventory-risk behavior.
  - [x] Run styling guard: `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`.
  - [x] Manual QA at 320, 375, 390, 430, 768, 1024, and 1440px for cart validation, changed price/quantity review, blocked checkout copy, checkout stepper non-overlap, keyboard-only flow, and reduced-motion behavior; document blocker if browser QA is unavailable.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [x] Route auth metadata declares public/optional/required auth, roles, and rate-limit class. For `POST /api/checkout/cart-validations`, use public/optional checkout-entry metadata and `checkout-payment`.
- N/A Route-level RBAC guard runs before validation or side effects for protected endpoints. Story 4.5 validation is public/checkout-entry safe and has no protected mutation side effects.
- N/A Service/controller enforces actor state before mutation: authenticated, active, verified, approved. Customer identity/contact/verification gating starts in Story 5.1; this endpoint only validates cart sellability.
- N/A Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. Checkout validation reads only published public storefront products/variants.
- [x] Public/customer endpoint explicitly documents why brand membership is not required: JRW is single-store seller of record and only public published catalog data is exposed.
- N/A Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable. No protected actor path in this story.
- [x] Error response uses safe envelope codes and does not leak provider/internal authorization, inventory internals, DB rows, stock versions, R2 keys, PayMongo details, or raw payment payloads.
- [x] OpenAPI/endpoint catalog lists auth mode, roles when declared, rate-limit class, endpoint summary/description, request/response schemas, and denial/error codes.

### Review Findings

- [x] [Review][Patch] Public validation leaked unpublished product data [src/server/repositories/CheckoutRepository.ts:125] — fixed by filtering checkout validation reads to published products and active variants, and by using client snapshot fields for non-public blocked lines.
- [x] [Review][Patch] Duplicate cart lines bypassed stock validation [src/domain/checkout/cart-validation.ts:167] — fixed by rejecting duplicate `productId::variantId` request lines before repository access.
- [x] [Review][Patch] Public endpoint lacked cart payload caps [src/server/routes/checkout.routes.ts:50] — fixed by capping cart line count and variant option arrays in route and domain validation.
- [x] [Review][Patch] Stale validation response could overwrite current cart [src/features/cart-checkout/store.ts:388] — fixed by applying validation summaries only when current cart still matches the request snapshot, and by never appending lines absent from current cart.
- [x] [Review][Patch] Direct checkout did not revalidate after cart changes [src/features/cart-checkout/components/CheckoutDetailsPage.tsx:155] — fixed by tracking cart fingerprints and revalidating when cart contents change after hydration.
- [x] [Review][Patch] Changed-price rows hid updated price [src/features/cart-checkout/components/CartLineItems.tsx:207] — fixed by always showing current item price and subtotal for active, stale, and blocked rows.
- [x] [Review][Patch] Suggested actions were dropped from affected cart lines [src/features/cart-checkout/components/CartLineItems.tsx:203] — fixed by preserving `suggestedAction` on cart snapshots and rendering it beside affected line reasons.

## Dev Notes

### Epic Context

- Epic 4 goal: Prospects browse the JRW storefront, inspect products, understand availability, and Customers manage cart before checkout.
- Story 4.4 delivered the browser-local cart, cart drawer/page, quantity controls, stale/unavailable line states, and public detail refresh.
- Story 4.5 is the authoritative checkout-entry validation bridge. It moves from display-level stale detection to server validation before payment/reservation work.
- Epic 5 starts after this boundary:
  - Story 5.1 handles identity/contact/delivery validation.
  - Story 5.2 handles server cart validation plus inventory reservation/oversell prevention.
  - Story 5.3+ handle PayMongo payment creation, webhooks, reconciliation, orders, and emails.
- Story 4.5 must not claim inventory reservation or oversell safety. It only blocks or updates stale cart state before checkout can continue.

### Previous Story Intelligence

- Story 4.4 current behavior:
  - Cart persists in browser `localStorage` under `jrw.cart.v1`.
  - Pure cart rules live in `src/domain/checkout/cart.ts`.
  - Feature store lives in `src/features/cart-checkout/store.ts` using `useSyncExternalStore`, same-tab subscriber notification, and cross-tab `storage` event handling.
  - Cart refresh currently uses `GET /api/storefront/catalog/products/:slug` to mark lines stale/unavailable.
  - Cart CTA currently routes to `/checkout` when local cart has no blocking issues.
  - Blocking is local and display-oriented; it is not authoritative checkout validation.
- Story 4.11 is still marked `review`, but current source already includes product detail composition changes. Re-read current files before implementation and preserve whatever survives review. Do not roll back product detail modules, dynamic variants, quantity controls, brand summary, recommendations, or sanitized markdown work.
- Story 4.10 requires UI stories to cite exact design directions and include visual contract checks. For this story cite:
  - Direction 02: product detail/cart handoff and cart drawer.
  - Direction 04: stage-based checkout and blocked validation state.

### Git And Worktree Intelligence

- Recent commits include cart and storefront refactors: `af60c4e refactor: cart function`, `1b327b3 refactor: brand`, `4220295 refactor: brand on storefront`, `2cfa792 refactor: manual padding change`, and `a41266f refactor: brand in creating brand to show image`.
- The current worktree is very dirty across `.agents`, `_bmad-output`, migrations, package files, and many source files. Treat these as owner/refactor changes unless proven otherwise.
- Many source diffs appear broad and mechanical. Do not normalize, revert, or reformat unrelated files while implementing this story.
- If a target file has unrelated uncommitted changes, edit only the smallest necessary sections and preserve the existing refactored style.

### Current Code Intelligence

#### READ/UPDATE: `src/domain/checkout/cart.ts`

- Current state: defines `CartState`, `CartItemSnapshot`, quantity validation, merge/update/remove, stale/unavailable marking, subtotal, total quantity, and local checkout blocking.
- What this story changes: do not replace these browser-cart rules. Add separate server-validation domain rules or carefully extend exports only where local cart needs to apply server-validated snapshots.
- Preserve: `STOREFRONT_CART_LINE_QUANTITY_MAX = 99`, `cartItemKey`, `CartAvailabilityStatus`, invalid quantity preservation, and no reverse-parsing of formatted prices.

#### READ/UPDATE: `src/features/cart-checkout/store.ts`

- Current state: safe `localStorage` parser/writer, module-scoped store, `useSyncExternalStore`, same-tab notifications, cross-tab storage listener, and store actions for add/update/remove/replace/stale marking.
- What this story changes: add only the store helpers needed to apply validated cart lines or mark validation state. Avoid a second cart store.
- Preserve: SSR-safe browser guards, storage key, subscriber behavior, and existing derived summary selectors.

#### READ/UPDATE: `src/features/cart-checkout/api.ts`

- Current state: maps product detail DTOs into cart snapshots and refreshes cart items using public product detail endpoint.
- What this story changes: add checkout validation POST helper and response mapping. Keep product-detail refresh for best-effort display refresh.
- Preserve: provider failures map to safe stale text and do not leak server internals.

#### READ/UPDATE: `src/features/cart-checkout/components/CartSummary.tsx`

- Current state: shows subtotal/quantity, blocks local stale/unavailable items, provides `Checkout` link to `/checkout`, and manual refresh button.
- What this story changes: convert checkout action into validation flow with pending, blocked, changed, and success states. Navigate only after server validation passes.
- Preserve: shared `Button`/`ButtonLink` use, compact summary layout, refresh behavior, safe error copy, and icon-only refresh accessible label/title.

#### READ/UPDATE: `src/features/cart-checkout/components/CheckoutFlow.tsx`

- Current state: checkout shell, stepper, right-side summary rail, local blocking based on `getCartSummary`, and CTAs for cart/details/payment/receipt.
- What this story changes: reflect server validation state before details/payment progression. Add blocked/error summary state without showing payment/order lanes from future stories.
- Preserve: `aria-current="step"`, stable layout dimensions, Direction 04 step labels, and no payment/fulfillment/return/refund promises.

#### READ/UPDATE: `src/features/cart-checkout/components/CheckoutDetailsPage.tsx`

- Current state: checkout details placeholder form appears as step two using local cart state.
- What this story changes: direct `/checkout` visits should validate/block first and only render details entry after cart validation succeeds or is clearly pending. Do not implement full contact/delivery submission.
- Preserve: visible labels, checkout-focused form layout, and no PayMongo handoff.

#### READ/UPDATE: `src/features/cart-checkout/components/CartLineItems.tsx`

- Current state: shared line rows show image/fallback, product/variant, quantity controls, price/subtotal, stale/unavailable reasons, and remove action.
- What this story changes: display validation reasons and suggested actions from server validation. Keep changed-price/quantity-reduced copy text-first.
- Preserve: item links, accessible quantity group, no raw stock/internal details, remove action for blocked lines, and no layout shift in pending/error states.

#### READ/UPDATE: `src/pages/cart/index.astro` and `src/pages/checkout/index.astro`

- Current state: Astro wrappers render `CartPage` and `CheckoutDetailsPage` as `client:load` React islands inside `StorefrontLayout`.
- What this story changes: likely no route shell changes beyond metadata/copy if validation is handled in feature components.
- Preserve: `StorefrontLayout`, `mainAriaLabel`, and immediately interactive cart/checkout island hydration.

#### READ/UPDATE: `src/server/routes/index.ts`, `src/server/app.ts`, `src/server/openapi/route-metadata.ts`

- Current state: `serverRouteGroups` already includes `checkout`, `payments`, `webhooks`, and `orders`; `routes/index.ts` does not yet register checkout routes. Rate limit classes include `checkout-payment`, not a generic `public-write`.
- What this story changes: register `checkout.routes.ts` and route options. Do not change route group names unless tests prove current metadata cannot express checkout validation.
- Preserve: Route -> Controller -> Service -> Domain/Repository layering and OpenAPI metadata conventions.

#### READ/UPDATE: `src/domain/products/public-catalog.ts`, `src/domain/products/types.ts`, `src/domain/products/schemas.ts`

- Current state: public availability helpers treat `IN_STOCK`, `LOW_STOCK`, and `PREORDER` as in-stock/sellable labels; inventory schemas define state consistency rules.
- What this story changes: reuse helpers for checkout validation. Avoid creating conflicting availability labels or status semantics.
- Preserve: money as integer centavos, customer-safe labels, and `PREORDER` handling.

#### READ/UPDATE: `src/domain/schema/catalog.ts` and `src/server/repositories/VariantRepository.ts`

- Current state: `product_variants` has no `status` column. Variant archive status is represented by `stock_lock_version = -1` in `VariantRepository`, which maps to `ProductVariantStatus = "ARCHIVED"`.
- What this story changes: validation must respect this existing archived representation. Do not add a duplicate variant `status` column in this story.
- Preserve: `stock_version` and `stock_lock_version` internals are not exposed in public/client responses.

#### READ/UPDATE: `src/server/repositories/PublicCatalogRepository.ts` and `src/server/services/PublicCatalogService.ts`

- Current state: public catalog detail reads published products and active variants, maps safe availability, `maxQuantity`, price centavos, labels, brand summary, and recommendations.
- What this story changes: can reuse patterns or helpers, but checkout validation should return cart validation data, not product detail page DTOs. Avoid client-side loops as the authoritative validation boundary.
- Preserve: public-only data, safe envelopes, and no brand membership requirements for published storefront reads.

### Recommended New Files

- `src/domain/checkout/cart-validation.ts`
- `src/domain/checkout/cart-validation.test.ts`
- `src/server/repositories/CheckoutRepository.ts`
- `src/server/services/CheckoutService.ts`
- `src/server/services/CheckoutService.test.ts`
- `src/server/controllers/CheckoutController.ts`
- `src/server/routes/checkout.routes.ts`
- `src/server/routes/checkout.routes.test.ts`

Optional if the implementation stays cleaner:

- `src/domain/checkout/cart-validation-schemas.ts` for route/domain schema sharing.
- `src/features/cart-checkout/validation.ts` for feature-local response mapping if `api.ts` becomes too broad.

Avoid:

- `src/api/**`
- New cart DB tables or migrations
- `src/lib/paymongo/**`
- Durable Object reservation logic
- Payment/order/webhook routes
- Admin/private product routes
- A new global state package

### API Contract Guidance

Recommended request:

```ts
type CheckoutCartValidationRequest = {
  cartUpdatedAt?: string;
  items: Array<{
    productId: string;
    productSlug: string;
    variantId: string;
    quantity: number;
    priceCentavos: number;
    productName?: string;
    variantLabel?: string;
  }>;
};
```

Recommended success data:

```ts
type CheckoutCartValidationData = {
  status: "VALID";
  requiresCustomerAcceptance: false;
  items: ValidatedCartLine[];
  subtotalCentavos: number;
  subtotalLabel: string;
  totalQuantity: number;
  lineItemCount: number;
};
```

Recommended blocked/changed error details:

```ts
type CheckoutCartValidationErrorDetails = {
  status: "CHANGED" | "BLOCKED";
  requiresCustomerAcceptance: boolean;
  items: ValidatedCartLine[];
  subtotalCentavos: number;
  subtotalLabel: string;
  totalQuantity: number;
  lineItemCount: number;
  issues: Array<{
    code:
      | "CART_EMPTY"
      | "ITEM_INVALID"
      | "PRODUCT_UNAVAILABLE"
      | "VARIANT_UNAVAILABLE"
      | "PRICE_CHANGED"
      | "QUANTITY_REDUCED"
      | "QUANTITY_UNAVAILABLE"
      | "PRODUCT_VARIANT_MISMATCH";
    productId?: string;
    variantId?: string;
    message: string;
  }>;
};
```

Use the project envelope helpers:

- Success: `{ data, meta: { requestId, code: "SUCCESS" } }`
- Error: `{ error: { code, message, details } }`; current `apiErrorWithRequestId` places `requestId` inside sanitized `error.details`, not a top-level `meta`.

Map errors carefully:

- Empty/invalid payload: `400 VALIDATION_FAILED`
- Current product/variant unavailable, out of stock, or archived: `409 INVENTORY_UNAVAILABLE`
- Price changed or quantity reduced requiring customer acceptance: `409 CONFLICT_STATE`
- Provider/D1 failure: `503 PROVIDER_UNAVAILABLE`

### UI And UX Requirements

- Design directions:
  - Direction 02: cart drawer/handoff uses sharp module language, clear line rows, subtotal, and checkout action.
  - Direction 04: checkout is stage-based with Cart, Details, Payment, Receipt; this story owns blocked/validated transition before Details/Payment.
- Use existing shared primitives:
  - `Button` for validation actions
  - `ButtonLink` only for navigation that does not need validation
  - `Input` for quantity fields
  - `StatusBadge`/text for non-color-only statuses
  - `Drawer` for cart overlay
- Customer-facing copy must stay short and safe:
  - "Review updated price before checkout."
  - "Quantity changed to match current availability."
  - "This option is unavailable right now."
  - "Could not verify cart. Try again."
- Do not show:
  - `stock_lock_version`
  - raw stock count unless already represented as safe `maxQuantity`
  - R2 keys
  - PayMongo/payment references
  - "archived" as customer copy
  - DB/provider/internal error details
- Checkout feedback should appear within 300ms when the user starts validation, even if the network is still pending.
- Checkout CTA must not cause layout shift when changing pending/success/error labels.
- At mobile widths, validation messages and action buttons must not be covered by sticky cart/action areas.

### Latest Technical Information

- Astro docs: `client:load` remains the correct high-priority hydration directive for immediately interactive UI such as cart and checkout islands; do not convert checkout/cart surfaces to `client:only` unless SSR mismatch is explicitly proven.
- React docs: `useSyncExternalStore` is the right React API for subscribing to an external mutable store. Keep Story 4.4 cart store pattern rather than duplicating local component state.
- Elysia docs: route schemas and response schemas should continue to use Elysia/TypeBox patterns already used in `public-catalog.routes.ts`; keep OpenAPI response coverage.
- Cloudflare/D1 guidance: D1 is the read source of truth for this story. Durable Object inventory coordination is reserved for actual reservation/oversell prevention in Epic 5, not validation-only Story 4.5.
- No library upgrade is required for this story. Stay on repo-pinned versions in `package.json`.

### Testing Guidance

Targeted command sequence:

```bash
npx vitest run src/domain/checkout/cart.test.ts src/domain/checkout/cart-validation.test.ts
npx vitest run src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts
npx vitest run src/features/cart-checkout/store.test.ts src/features/cart-checkout/components/cart-ui.test.tsx
npm run check
```

Run `npm run build-test` if the targeted suites and `npm run check` pass locally.

Manual QA checklist:

- 320, 375, 390, 430px: checkout validation button, changed price review, reduced quantity message, unavailable line removal, sticky action non-overlap.
- 768, 1024, 1440px: drawer/cart page validation flow, summary rail, no stretched mobile layout.
- Keyboard-only: cart line quantity, checkout validation action, changed-state acceptance/retry, drawer close/return focus, details step.
- Failure cases: empty cart, missing product, variant removed, out-of-stock, price changed, quantity reduced, provider validation failure.
- Reduced motion: pending indicators and drawer/step transitions remain usable.

### Assumptions And Follow-Up Flags

- Assumption: `POST /api/checkout/cart-validations` may be public/optional because it only validates published public product data. Identity and email verification start in Story 5.1.
- Assumption: `PREORDER` remains sellable according to existing public catalog semantics unless product owner changes preorder policy.
- Assumption: a changed price or reduced quantity requires an explicit customer retry/acceptance gesture before proceeding.
- Follow-up: Story 5.2 must add inventory reservation/oversell prevention and may supersede or extend the validation service created here.
- Follow-up: Story 5.3 must ensure PayMongo creation only accepts a valid server checkout attempt/reservation, not raw browser cart state.

### References

- `_bmad-output/planning-artifacts/epics.md` - `### Story 4.5: Availability Blocking Before Checkout`
- `_bmad-output/planning-artifacts/epics.md` - FR38, FR39, FR47, NFR16, NFR40, UX-DR6, UX-DR7, UX-DR20, UX-DR21, UX-DR30, UX-DR31, UX-DR32
- `_bmad-output/planning-artifacts/prd.md` - `### Technical Constraints`, `### Domain-Specific Requirements`, `### Journey Requirements Summary`
- `_bmad-output/planning-artifacts/architecture.md` - `### API & Communication Patterns`, `### Frontend Architecture`, `### Implementation Patterns & Consistency Rules`
- `_bmad-output/planning-artifacts/ux-design-specification.md` - `### CartDrawer`, `### CheckoutSteps`, `### Feedback Patterns`, `### Responsive Design & Accessibility`
- `_bmad-output/planning-artifacts/ux-design-directions.html` - Direction 02 Product Detail System, Direction 04 Precision Checkout
- `_bmad-output/project-context.md` - `Critical Implementation Rules`, `Ecommerce Domain Rules`, `UI And Design Rules`, `Testing And Quality`, `Current Implementation Warnings`
- `_bmad-output/implementation-artifacts/4-4-cart-add-update-remove.md` - previous cart implementation and follow-up learnings
- `_bmad-output/implementation-artifacts/4-10-future-story-ui-fidelity-gate.md` - UI fidelity gate requirements
- `_bmad-output/implementation-artifacts/4-11-product-detail-composition-content-and-recommendations.md` - current product detail correction status and files to preserve
- Official docs used for latest-tech pass:
  - Astro client directives: https://docs.astro.build/en/reference/directives-reference/
  - React `useSyncExternalStore`: https://react.dev/reference/react/useSyncExternalStore
  - Elysia schemas/validation: https://elysiajs.com/patterns/typebox.html
  - Cloudflare D1 Worker API: https://developers.cloudflare.com/d1/worker-api/d1-database/

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-05T15:11:28+08:00 - Sprint status set to in-progress for `4-5-availability-blocking-before-checkout`.
- 2026-06-05T15:49:42+08:00 - Red domain test failed because `cart-validation.ts` did not exist.
- 2026-06-05T16:03:53+08:00 - Domain validation tests passed: `npx vitest run src/domain/checkout/cart-validation.test.ts`.
- 2026-06-05T16:20:15+08:00 - Red server tests failed because checkout service/controller modules did not exist.
- 2026-06-05T16:41:07+08:00 - Checkout service and route tests passed.
- 2026-06-05T17:21:06+08:00 - Cart UI/store validation tests passed.
- 2026-06-05T17:32:57+08:00 - Explicit domain targeted tests passed after shell glob did not expand `src/domain/checkout/**/*.test.ts`.
- 2026-06-05T17:36:14+08:00 - `npm run check` passed with existing hints only.
- 2026-06-05T17:43:38+08:00 - `npm run build-test` stopped in full Vitest due unrelated dirty-worktree failures in admin auth and admin inventory UI tests.
- 2026-06-05T18:53:05+08:00 - Updated stale admin auth and inventory UI expectations; targeted Vitest passed for both files.
- 2026-06-05T19:33:40+08:00 - Relevant Vitest regression passed for admin auth, inventory UI, and cart checkout UI after direct-checkout validation adjustment.
- 2026-06-05T19:35:00+08:00 - Added direct Playwright dependency/config and automated checkout viewport QA. First browser run exposed direct `/checkout` hydration race where validation saw an empty SSR snapshot while local cart items were visible.
- 2026-06-05T19:56:00+08:00 - Fixed direct checkout validation to defer first validation until client cart hydration can settle, and isolated Playwright specs from Vitest via `tests/qa/**` exclude.
- 2026-06-05T20:01:49+08:00 - `npm run build-test` passed end-to-end: Astro check, 105 Vitest files / 632 tests, and Astro build.
- 2026-06-05T20:02:00+08:00 - `npm run qa:checkout-viewports` passed 14 Playwright checks across 320, 375, 390, 430, 768, 1024, and 1440px.
- 2026-06-06T00:33:16+08:00 - Code review corrections applied for unpublished data leakage, duplicate line validation, public payload caps, stale validation responses, direct checkout revalidation, changed-price visibility, and suggested action display.
- 2026-06-06T00:33:16+08:00 - Final validation passed: targeted checkout/cart tests, `npm run build-test`, styling guard review, and `npm run qa:checkout-viewports`.

### Completion Notes List

- Implemented pure checkout cart validation in `src/domain/checkout/cart-validation.ts` with `VALID`, `CHANGED`, and `BLOCKED` summaries, customer-safe line issues, preorder sellability, price-change review, quantity reduction, missing/unpublished/archived/out-of-stock blocking, and validation errors for malformed/empty local cart payloads.
- Added read-only checkout server stack for `POST /api/checkout/cart-validations`: repository, service, controller, route module, OpenAPI metadata, standard envelopes, request-id propagation, and route registration. No payment, order, reservation, webhook, email, PayMongo, or Durable Object lock is created by this story.
- Added cart UI validation flow: cart summary and cart-step summary now use a server validation button before navigation, changed/blocked results update local cart lines with safe text reasons, provider/runtime failures show retry copy, and direct `/checkout` visits gate the details form behind validation.
- Direction 02 is reflected through cart handoff/drawer summary language and line-level text reasons; Direction 04 is reflected through the stage-based checkout shell and blocked validation state before Details/Payment.
- Added direct Playwright browser QA with `@playwright/test`, Chromium install script, dedicated Playwright config, and checkout viewport automation that seeds local cart state, mocks public product detail/checkout validation endpoints, checks keyboard activation, uses reduced-motion media emulation, and asserts no horizontal overflow at 320, 375, 390, 430, 768, 1024, and 1440px.
- Browser QA found and fixed a direct `/checkout` hydration race: the details page could validate the server-empty snapshot before the browser cart store hydrated, showing "Add an item before checkout." while cart items were visible. Direct checkout validation now defers the first attempt by one tick and retries against the hydrated cart snapshot before showing the details form or blocked state.
- Code review found and fixed seven checkout validation issues: unpublished server data exposure, duplicate cart-line stock bypass, missing public payload caps, stale validation response replay, missing direct checkout revalidation after cart changes, hidden changed-price row prices, and dropped suggested actions.
- Updated stale admin auth and inventory UI test expectations to match the intentionally edited sign-in copy and current inventory helper copy.
- Validation passed for targeted domain, checkout service/route, cart UI/store, admin auth, and inventory UI suites; `npm run check`, `npm run build-test`, styling guard review, and `npm run qa:checkout-viewports` all passed.

### File List

- `_bmad-output/implementation-artifacts/4-5-availability-blocking-before-checkout.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `package-lock.json`
- `package.json`
- `playwright.config.ts`
- `src/domain/checkout/cart-validation.test.ts`
- `src/domain/checkout/cart-validation.ts`
- `src/features/admin-auth/components/admin-auth-ui.test.tsx`
- `src/features/admin-products/components/inventory-ui.test.ts`
- `src/features/cart-checkout/api.ts`
- `src/features/cart-checkout/components/CartSummary.tsx`
- `src/features/cart-checkout/components/CheckoutDetailsPage.tsx`
- `src/features/cart-checkout/components/CheckoutFlow.tsx`
- `src/features/cart-checkout/components/cart-ui.test.tsx`
- `src/features/cart-checkout/components/useCheckoutValidationAction.ts`
- `src/features/cart-checkout/store.test.ts`
- `src/features/cart-checkout/store.ts`
- `src/server/app.ts`
- `src/server/controllers/CheckoutController.ts`
- `src/server/repositories/CheckoutRepository.ts`
- `src/server/routes/checkout.routes.test.ts`
- `src/server/routes/checkout.routes.ts`
- `src/server/routes/index.ts`
- `src/server/services/CheckoutService.test.ts`
- `src/server/services/CheckoutService.ts`
- `tests/qa/checkout-validation-viewports.spec.ts`
- `vitest.config.ts`

### Implementation Plan

- Keep checkout validation as a pure domain contract first, then adapt it through repository/service/controller/route layers.
- Read current product and variant state from D1 via Drizzle without mutating stock, reserving inventory, creating orders, or touching payment providers.
- Treat browser cart state as display/convenience state and replace checkout navigation with an explicit server validation action.
- Preserve existing cart store, drawer, cart page shell, quantity controls, and product detail add-to-cart behavior while adding validation recovery state.

### Change Log

- 2026-06-05 - Implemented Story 4.5 availability blocking before checkout and moved status to review.
- 2026-06-05 - Added automated Playwright checkout viewport QA, fixed direct checkout hydration validation, updated stale UI expectations, and confirmed `npm run build-test` passes.
