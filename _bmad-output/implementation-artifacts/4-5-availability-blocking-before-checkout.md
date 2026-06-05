# Story 4.5: Availability Blocking Before Checkout

Status: ready-for-dev

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

- [ ] Task 1: Lock scope, target files, and existing behavior before coding. (AC: 1-7)
  - [ ] Re-read every UPDATE file listed in Current Code Intelligence before editing; the worktree is heavily modified and may include owner refactors.
  - [ ] Treat browser cart state from Story 4.4 as convenience/display state only; server validation is the first checkout authority.
  - [ ] Implement validation before checkout details/payment. Do not create PayMongo payment, reservation, order, payment record, webhook, email, or Durable Object stock lock in this story.
  - [ ] Keep customer identity/contact validation out of scope. Story 5.1 handles sign-in, contact, delivery, and verification gates.
  - [ ] Do not add DB migrations unless an implementation blocker proves a validation-only endpoint cannot read existing product/variant data.
  - [ ] Do not introduce a new global state library or duplicate cart store. Extend `src/features/cart-checkout/store.ts` and `api.ts` only where needed.
  - [ ] Do not use legacy `src/api/**` or admin/private catalog endpoints.
  - [ ] Do not expose raw stock counts beyond already customer-safe `maxQuantity`, stock versions, R2 keys, DB row names, archived admin language, provider errors, or payment internals.

- [ ] Task 2: Define cart validation domain contract and pure rules. (AC: 1-5, 7)
  - [ ] Add focused domain logic under `src/domain/checkout/**`, recommended `cart-validation.ts` plus `cart-validation.test.ts`.
  - [ ] Define request item shape from local cart snapshot: `productId`, `productSlug`, `variantId`, `quantity`, `priceCentavos`, and safe display snapshot fields needed for recovery.
  - [ ] Define validated line output with current safe server fields: product/variant IDs, slug, name, variant label/options, `priceCentavos`, `priceLabel`, availability label, `maxQuantity`, quantity, line subtotal, recovery status, and customer-safe reason.
  - [ ] Define cart-level output with `status` values such as `VALID`, `CHANGED`, and `BLOCKED`; subtotal centavos/label; total quantity; line count; and `requiresCustomerAcceptance`.
  - [ ] Treat sellable inventory states consistently with public catalog semantics: `IN_STOCK`, `LOW_STOCK`, and `PREORDER` are customer-sellable; `OUT_OF_STOCK`, archived variants, missing variants, non-published products, and invalid product/variant matches block.
  - [ ] For price changes, return current price and mark the line changed; do not silently proceed to checkout using stale local price.
  - [ ] For stock/quantity changes, reduce to the safe maximum when current availability can satisfy a lower quantity; block when no safe sellable quantity remains.
  - [ ] For invalid or empty cart payloads, return validation errors without changing server state.
  - [ ] Keep rules pure enough for Vitest coverage without HTTP, D1, Durable Objects, PayMongo, or React runtime.

- [ ] Task 3: Add checkout validation server stack. (AC: 1-7)
  - [ ] Add `src/server/repositories/CheckoutRepository.ts` or a similarly focused repository that reads published product and variant truth from existing Drizzle schema.
  - [ ] Reuse existing availability helpers from `src/domain/products/public-catalog.ts`, `src/domain/products/schemas.ts`, `src/domain/products/price-format.ts`, and existing repository mapping patterns where possible.
  - [ ] Add `src/server/services/CheckoutService.ts` to normalize request body, load current product/variant data, call domain validation rules, and return `AppResult`.
  - [ ] Add `src/server/controllers/CheckoutController.ts` to adapt service results into standard API envelopes with `apiSuccessWithRequestId` / `apiErrorWithRequestId`.
  - [ ] Add `src/server/routes/checkout.routes.ts` and register it in `src/server/routes/index.ts` and `src/server/app.ts` route options.
  - [ ] Endpoint: `POST /api/checkout/cart-validations`.
  - [ ] Route metadata: auth mode `optional` or public-safe, roles `PROSPECT`/`CUSTOMER` when declared, tags `Checkout`, rate-limit class `checkout-payment`, and error codes `VALIDATION_FAILED`, `CONFLICT_STATE`, `INVENTORY_UNAVAILABLE`, `RESOURCE_NOT_FOUND`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`.
  - [ ] Response behavior: valid cart returns `200 { data, meta }`; blocked/changed cart returns a safe error envelope, preferably `409 CONFLICT_STATE` for stale price/quantity or `409 INVENTORY_UNAVAILABLE` for unsellable inventory, with safe validation summary in `error.details`.
  - [ ] Document in route description that brand membership is not required because only published public storefront product/variant data is read.
  - [ ] Ensure no repository/service method mutates inventory, creates reservations, creates payments, writes orders, or calls provider clients.

- [ ] Task 4: Integrate checkout validation into cart and checkout UI. (AC: 1-6)
  - [ ] Add a feature API helper in `src/features/cart-checkout/api.ts`, recommended `validateCartBeforeCheckout`, that posts the current `CartState` to `/api/checkout/cart-validations`.
  - [ ] Update `CartSummary` and the cart step summary in `CheckoutFlow.tsx` so checkout entry uses a real button action with pending/error/success state rather than blind navigation.
  - [ ] On successful validation, allow navigation to `/checkout` details entry and preserve the validated cart summary for the current store state.
  - [ ] On changed price or reduced quantity, update local cart lines with the server-safe current snapshot, show text reasons, and require explicit customer acceptance/retry before checkout can proceed.
  - [ ] On unavailable/missing/archived/out-of-stock items, mark affected lines `UNAVAILABLE` or `STALE`, show safe reason text, keep remove/edit paths available, and block checkout.
  - [ ] On provider/runtime validation failure, keep the current cart visible, mark checkout entry untrusted, show retry copy, and do not proceed.
  - [ ] Update `/checkout` details page so direct visits validate or block before showing a meaningful details step. Do not let a direct `/checkout` load imply payment is ready when cart has not passed validation.
  - [ ] Preserve existing drawer focus trap/restore, cart badge count, quantity controls, `/cart` page shell, and product detail add-to-cart behavior.
  - [ ] Cite and satisfy UI fidelity Direction 02 for cart handoff/drawer language and Direction 04 for checkout stepper/blocked validation state.

- [ ] Task 5: Add focused tests and API contract coverage. (AC: 1-7)
  - [ ] Add domain tests for valid cart, empty cart, missing product, unpublished product, variant/product mismatch, archived variant via `stock_lock_version = -1`, out-of-stock inventory, preorder allowance, price change, quantity reduction, and quantity blocked.
  - [ ] Add service tests with fake repositories proving no payment/reservation/order side effects are called or required.
  - [ ] Add route tests proving `POST /api/checkout/cart-validations` is documented in OpenAPI with auth metadata, `checkout-payment` rate-limit class, standard envelopes, request ID propagation, and safe errors.
  - [ ] Add UI/API tests for cart summary validation success, blocked item copy, price change acceptance, quantity reduction, provider failure retry, and direct `/checkout` blocked state.
  - [ ] Keep existing cart tests green: `src/domain/checkout/cart.test.ts`, `src/features/cart-checkout/store.test.ts`, and `src/features/cart-checkout/components/cart-ui.test.tsx`.
  - [ ] If public catalog DTOs are reused or changed, extend `PublicCatalogService` and `public-catalog.routes` tests rather than weakening them.

- [ ] Task 6: Validate and document blockers. (AC: 7)
  - [ ] Run targeted tests:
    - `npx vitest run src/domain/checkout/**/*.test.ts`
    - `npx vitest run src/server/services/CheckoutService.test.ts src/server/routes/checkout.routes.test.ts`
    - `npx vitest run src/features/cart-checkout/**/*.test.tsx`
  - [ ] Run `npm run check`.
  - [ ] Run `npm run build-test` if no local blocker appears, because this story touches checkout/inventory-risk behavior.
  - [ ] Run styling guard: `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`.
  - [ ] Manual QA at 320, 375, 390, 430, 768, 1024, and 1440px for cart validation, changed price/quantity review, blocked checkout copy, checkout stepper non-overlap, keyboard-only flow, and reduced-motion behavior; document blocker if browser QA is unavailable.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [ ] Route auth metadata declares public/optional/required auth, roles, and rate-limit class. For `POST /api/checkout/cart-validations`, use public/optional checkout-entry metadata and `checkout-payment`.
- N/A Route-level RBAC guard runs before validation or side effects for protected endpoints. Story 4.5 validation is public/checkout-entry safe and has no protected mutation side effects.
- N/A Service/controller enforces actor state before mutation: authenticated, active, verified, approved. Customer identity/contact/verification gating starts in Story 5.1; this endpoint only validates cart sellability.
- N/A Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. Checkout validation reads only published public storefront products/variants.
- [ ] Public/customer endpoint explicitly documents why brand membership is not required: JRW is single-store seller of record and only public published catalog data is exposed.
- N/A Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable. No protected actor path in this story.
- [ ] Error response uses safe envelope codes and does not leak provider/internal authorization, inventory internals, DB rows, stock versions, R2 keys, PayMongo details, or raw payment payloads.
- [ ] OpenAPI/endpoint catalog lists auth mode, roles when declared, rate-limit class, endpoint summary/description, request/response schemas, and denial/error codes.

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
