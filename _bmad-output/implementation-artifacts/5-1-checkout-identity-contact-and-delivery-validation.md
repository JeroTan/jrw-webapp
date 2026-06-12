# Story 5.1: Checkout Identity, Contact, and Delivery Validation

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Shopper,
I want checkout to collect and validate email, contact, and delivery details without forcing account creation,
so that JRW has enough trusted information before payment.

## Acceptance Criteria

1. Given Shopper starts checkout without an account session, when checkout details step loads, then required email/contact/delivery fields are available immediately, optional sign-in/register/Google actions are offered, and cart contents remain intact.
2. Given signed-in Customer opens checkout details, when profile data exists, then checkout prefills matching customer-safe email/contact/delivery fields from `GET /api/customers/me` without exposing tokens, session internals, admin realm data, or unnecessary PII; when profile data is partial or empty, missing required fields remain blank/editable and payment handoff stays blocked until details are complete and valid.
3. Given guest Shopper or signed-in Customer enters email/contact/delivery details, when details are valid, then details are saved to checkout attempt/order contact snapshot and checkout can proceed to server cart validation.
4. Given contact/delivery details are invalid or missing, when Shopper submits checkout details, then field-level errors and form-level summary appear, focus moves to the summary, and payment handoff is blocked.
5. Given privacy requirements apply, when checkout captures PII, then only required checkout/fulfillment/support fields are collected, privacy notice/acknowledgement is visible before submit, and logs do not emit raw PII, secrets, tokens, passwords, OAuth material, PayMongo payloads, or card data.
6. Given checkout creates or updates order/checkout state, when persistence runs, then order keeps checkout email/contact/delivery snapshot, `customer_id` remains nullable for guest checkout, and later account linking is allowed only through safe email verification.
7. Given checkout UI renders, when desktop and mobile layouts are used, then steps show Cart, Details, Payment, and Receipt/Confirmation, current step uses visible text plus `aria-current="step"`, and layout follows Direction 04 without overlap or overflow.
8. Given implementation finishes, when tests/QA run, then checks cover guest email checkout, optional sign-in/register/Google path, signed-in Customer prefill, invalid details, order contact snapshot, nullable Customer reference, PII minimization, mobile/desktop layout, keyboard/focus behavior, and `npm run check`; blockers are documented if any validation cannot pass.

## Tasks / Subtasks

- [ ] Task 1: Lock scope and reuse points before coding. (AC: 1-8)
  - [ ] Re-read every UPDATE file named in Current Code Intelligence before editing. Worktree is dirty; preserve owner edits.
  - [ ] Do not create PayMongo checkout sessions, payment intents, orders, reservations, webhooks, emails, or inventory locks in this story.
  - [ ] Keep `POST /api/checkout/cart-validations` from Story 4.5 as cart authority; this story captures email/contact/delivery before payment/reservation stories expand the flow.
  - [ ] Treat checkout email as required order identity. Customer account is optional.
  - [ ] Reuse Customer auth/profile endpoints only for optional prefill/account convenience, not as prerequisite for ordering.
  - [ ] Show the same required checkout details form for guest and signed-in shoppers; signed-in profile data only prefills available safe fields and never removes required completion.
  - [ ] Keep cart in `jrw.cart.v1` intact through optional auth prompts, registration, Google OAuth return, validation errors, and retry.
  - [ ] Do not use legacy `src/api/**`, Admin auth endpoints, Admin repositories, or cross-realm email lookup for checkout.

- [ ] Task 2: Add checkout details validation contract. (AC: 1-6)
  - [ ] Add pure validation under `src/domain/checkout/**`, recommended `contact-delivery.ts` plus tests, unless existing customer profile validation can be reused without ambiguity.
  - [ ] Validate required checkout fields: email, name, phone, street address, barangay, city/province, postal code, and privacy acknowledgement when required by UX/legal copy.
  - [ ] Use existing profile fields where possible: `displayName`, `firstName`, `lastName`, `phone`, `streetAddress`, `barangay`, `cityProvince`, `postalCode`.
  - [ ] If UI keeps one visible "Full name" field for Direction 04, map it explicitly and safely; do not silently corrupt `firstName`/`lastName`.
  - [ ] Reject unknown checkout fields server-side if a new endpoint is added. Do not accept role, email verification, account status, customer ID, payment, order status, or provider fields from the browser.
  - [ ] Return stable validation reasons usable by field-level UI; do not expose DB rows or raw schema errors.

- [ ] Task 3: Implement guest-email checkout and optional account assist in checkout UI. (AC: 1, 2, 7, 8)
  - [ ] Create or extend customer-facing auth UI under `src/features/customer-account/**` or `src/features/cart-checkout/**` based on reuse. Keep checkout-specific orchestration in `cart-checkout`.
  - [ ] Inspect session/profile through existing endpoints only when Customer session exists: `GET /api/customer/auth/session` and `GET /api/customers/me`.
  - [ ] For guest shoppers, show email/contact/delivery form immediately plus optional sign-in/register/Google link to `/api/oauth/google/sessions?returnTo=/checkout`.
  - [ ] For signed-in Customers with partial or empty profile data, prefill only available safe fields and keep missing required checkout fields blank/editable with validation.
  - [ ] For unverified Customer accounts, allow checkout with entered checkout email/contact details; show verification as account-help, not order blocker.
  - [ ] For Admin/Super Admin/wrong realm actors, do not treat admin cookies as checkout customer identity. Continue as guest checkout unless a Customer session exists.
  - [ ] Preserve local cart state across all auth UI transitions and redirects.

- [ ] Task 4: Save or use checkout contact/delivery details. (AC: 2-6)
  - [ ] Preferred path: add checkout-specific `POST /api/checkout/details` or similarly focused route using Route -> Controller -> Service -> Domain/Repository, optional auth, TypeBox body/response schemas, OpenAPI metadata, and safe envelopes.
  - [ ] If signed-in Customer chooses to save defaults, use protected `PATCH /api/customers/me` separately after successful checkout-details validation.
  - [ ] Checkout details route must accept guest requests and signed-in Customer requests; signed-in Customer ID comes from server session only, never from browser body.
  - [ ] Response should return only safe checkout details, optional customer link state, and request ID metadata. Do not return cookies, token hashes, raw sessions, or provider metadata.
  - [ ] Persistence must support nullable `customer_id` and order/checkout contact snapshot fields for guest checkout.
  - [ ] After valid details save/use, run or allow next server cart validation step; do not start PayMongo handoff.

- [ ] Task 5: Complete checkout details UI with Direction 04 fidelity. (AC: 1-5, 7)
  - [ ] Update `CheckoutDetailsPage.tsx` from placeholder to real form state, validation, pending, success, error, and blocked states.
  - [ ] Keep `CheckoutFlowShell` step labels stable: `01 Cart`, `02 Details`, `03 Payment`, `04 Receipt` or explicit confirmation wording aligned with UX spec.
  - [ ] Keep current step exposed with `aria-current="step"` and only one current step at a time.
  - [ ] Group email/contact/delivery fields by address logic; keep checkout copy short and practical.
  - [ ] Add field-level errors linked with `aria-describedby`, summary with focus on submit failure, and retry-safe pending state.
  - [ ] Keep payment CTA disabled/blocked until valid details and cart validation pass. Do not show fake payment/order status.
  - [ ] Preserve shared primitives: `Button`, `ButtonLink`, `InputBox`/`Input`, `Textarea` only if needed, no duplicate one-off button/link class strings.

- [ ] Task 6: Add tests and QA. (AC: 1-8)
  - [ ] Add domain tests for valid guest details, valid signed-in Customer details, missing required fields, invalid email, invalid phone, overlong address fields, empty privacy acknowledgement, unknown fields if endpoint exists, and safe normalized output.
  - [ ] Add route/service tests for any new or changed endpoint: OpenAPI metadata, request ID propagation, optional auth metadata, guest success, signed-in success, validation failure, nullable Customer reference, success envelope, and PII-safe error details.
  - [ ] Add UI tests for guest checkout form, optional account prompt, Google link return target, signed-in full prefill, signed-in partial/no-profile fill-required behavior, unverified account not blocking guest checkout, invalid field errors, valid submit, payment blocked until valid, and cart preservation.
  - [ ] Keep existing suites green: `src/features/cart-checkout/**/*.test.tsx`, `src/server/routes/customer.routes.test.ts`, `src/server/routes/auth.routes.test.ts`, `src/server/routes/google-oauth.routes.test.ts`, and checkout domain/route tests.
  - [ ] Run `npm run check`.
  - [ ] Run targeted Vitest for changed files. Run `npm run build-test` if server route/domain behavior changes beyond UI-only work.
  - [ ] Run styling guard: `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`.
  - [ ] Manual QA at 320, 375, 390, 430, 768, 1024, and 1440px for checkout steps, form error summary, keyboard-only flow, focus-visible states, text overflow, and cart preservation through auth prompts.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [ ] Route auth metadata declares public/optional/required auth, roles, and rate-limit class.
- [ ] Route-level RBAC guard runs before validation or side effects for protected endpoints.
- [ ] Service/controller enforces actor state before mutation: authenticated, active, verified, approved where applicable.
- [ ] Brand-scoped reads or writes enforce active brand membership or elevated permission server-side.
- [ ] Public/customer endpoints explicitly document why brand membership is not required.
- [ ] Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable.
- [ ] Error response uses safe envelope codes and does not leak provider/internal authorization details.
- [ ] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes.

## Dev Notes

### Epic Context

- Epic 5 goal: guest or signed-in shopper checkout collects trusted email/contact/delivery details, validates/reserves inventory, creates PayMongo hosted payment, processes verified/idempotent webhooks, reconciles payment state, releases reservations on failure, and sends status emails to checkout email.
- Story 5.1 is identity/contact/delivery gate only. It prepares checkout for Story 5.2 server cart validation/inventory reservation and Story 5.3 PayMongo creation.
- Requirements covered: FR39; supports FR5, FR6, FR7, FR8; UX-DR7 and UX-DR22. Source: `_bmad-output/planning-artifacts/epics.md#Story 5.1`.
- PRD privacy applies: collect only data needed for registration, checkout, fulfillment, support, security, and audit; protect customer PII; show privacy notice before checkout. Source: `_bmad-output/planning-artifacts/prd.md#Philippines privacy requirements`.

### Current Code Intelligence

#### READ/UPDATE: `src/features/cart-checkout/components/CheckoutDetailsPage.tsx`

- Current state: validates browser cart on direct `/checkout` load, blocks invalid carts, then renders placeholder details form with Full name, Email, Phone, City, Barangay, Postal code.
- What this story changes: add real identity gate, profile prefill, validation, field errors, privacy acknowledgement, details submit, and payment/cart-validation gate.
- Preserve: direct checkout cart validation, `CartLineItems` blocked review, `CheckoutFlowShell`, visible labels, no PayMongo handoff.

#### READ/UPDATE: `src/features/cart-checkout/components/CheckoutFlow.tsx`

- Current state: renders stepper and summary rail; current step uses `aria-current="step"`; details/payment CTAs are present but payment has no href.
- What this story changes: make details step CTA reflect auth/details validation state; keep payment blocked until valid details and server cart validation pass.
- Preserve: Direction 04 step labels, right summary rail, no future payment/order/fulfillment claims.

#### READ/UPDATE: `src/features/cart-checkout/api.ts`

- Current state: maps cart snapshots, refreshes product details, and posts cart validation to `/api/checkout/cart-validations`.
- What this story changes: add profile/session/details helpers only if feature-local API client needs them.
- Preserve: standard API envelope handling and safe failure copy.

#### READ/UPDATE: `src/features/cart-checkout/store.ts`

- Current state: browser cart store uses `localStorage` key `jrw.cart.v1`, `useSyncExternalStore`, cross-tab storage listener, validation summary application.
- What this story changes: avoid cart changes unless details flow needs explicit "ready" UI state.
- Preserve: cart persistence through auth redirects and all existing add/update/remove/stale behavior.

#### READ/UPDATE: `src/pages/checkout/index.astro`

- Current state: renders `CheckoutDetailsPage` inside `StorefrontLayout` with `client:load`.
- What this story changes: likely no route shell change except metadata/copy if needed.
- Preserve: Storefront layout and immediate checkout island hydration.

#### READ/UPDATE: `src/pages/account/index.astro`

- Current state: placeholder only. Customer auth APIs exist, but no real customer account UI exists.
- What this story changes: if checkout prompts link to `/account`, implement enough account UI there or keep checkout-contained auth panels. Do not send users to a dead placeholder for required checkout auth.
- Preserve: storefront layout and account route ownership.

#### READ/UPDATE: `src/server/routes/customer.routes.ts`

- Current state: `POST /customers`, `POST /email-verifications`, `GET /customers/me`, and `PATCH /customers/me` exist. Profile endpoints are required Customer auth, rate limited, and use `rbacGuard`.
- What this story changes: reuse `GET/PATCH /customers/me` for checkout contact/delivery defaults when enough. Extend docs/tests only if checkout-specific behavior is added.
- Preserve: required Customer auth, error codes including `AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`, and no Admin realm access.

#### READ/UPDATE: `src/server/routes/auth.routes.ts`

- Current state: Customer auth endpoints live under `/api/customer/auth/*`; sign-in sets `jrw_customer_session`; session inspection returns actor/account status but not email/profile.
- What this story changes: checkout UI can use session inspection for auth state, then `GET /customers/me` for profile fields.
- Preserve: Admin and Customer realms stay separate. Do not query Admin auth from checkout.

#### READ/UPDATE: `src/server/routes/google-oauth.routes.ts`

- Current state: Google OAuth start path is `/api/oauth/google/sessions?returnTo=/checkout`; callback sets `jrw_customer_session`.
- What this story changes: checkout auth prompt should link to this route and preserve return to `/checkout`.
- Preserve: OAuth state/nonce behavior, customer-only linking, no raw OAuth token exposure.

#### READ/UPDATE: `src/server/routes/account-recovery.routes.ts`

- Current state: `POST /customer/auth/email-verifications/requests` accepts resend requests and returns 202 without account enumeration.
- What this story changes: checkout unverified prompt can call this endpoint.
- Preserve: enumeration-safe behavior and email-token rate limit.

#### READ/UPDATE: `src/domain/customers/customer-account.ts`

- Current state: validates customer registration/profile patch fields and phone format; profile patch requires at least one field.
- What this story changes: reuse or wrap these rules for checkout details. Add checkout-specific pure validation only if profile patch is not enough.
- Preserve: field limits, phone pattern, normalized customer email, and no role/status/profile privilege fields from user input.

#### READ/UPDATE: `src/domain/schema/identity.ts`

- Current state: `customers` has `display_name`, `first_name`, `last_name`, `phone`, `street_address`, `barangay`, `city_province`, `postal_code`, and `email_marketing_opt_in`.
- What this story changes: no migration expected if existing fields cover checkout defaults.
- Preserve: Customer/Admin realm split and session cookie separation.

#### READ/UPDATE: `src/server/context/request-context.ts` and `src/server/middleware/rbac.ts`

- Current state: request context resolves actor from realm-specific cookie by API path; `rbacGuard` denies unverified, inactive, suspended, wrong-role, and unauthenticated actors for required routes.
- What this story changes: protected checkout details/profile mutation must use same guard pattern.
- Preserve: path-based customer realm resolution for `/api/customer/*`, `/api/customers*`, `/api/oauth/google*`, and `/api/email-verifications`.

### Previous Story Intelligence

- Story 4.5 already implemented authoritative checkout-entry cart validation at `POST /api/checkout/cart-validations`; do not rebuild it.
- Story 4.5 review fixed: no unpublished product leakage, duplicate cart-line rejection, payload caps, stale response protection, direct checkout revalidation after cart changes, visible updated price, and suggested actions on affected cart lines.
- Story 4.10 requires UI stories to cite exact design directions and include visual contract checks. For this story, cite Direction 04 and checkout stepper/form QA.
- Story 4.11 completed product detail Buy/add-to-cart/share and recommendation flow. Preserve product detail cart behavior and no raw stock/internal exposure.

### Git Intelligence Summary

- Recent commits:
  - `98d2e1c docs: retrospective 4 completed`
  - `fc94343 chored: 4-11 reviewed`
  - `1ef5375 chore: story 4-7 reviewed`
  - `2553e73 style: manually change the styling of product detail`
  - `03849fb feat: story 4-7 implemented`
- `fc94343` touched product detail UI and `PublicCatalogRepository`; checkout should not roll back product detail/card/cart assumptions.
- `03849fb` added shared primitive/cart shell work; checkout details must reuse shared primitives and preserve responsive/token rules.
- Worktree is heavily dirty across `.agents`, `_bmad-output`, docs, migrations, and source. Treat uncommitted changes as owner changes and edit only focused sections.

### Architecture Compliance

- Route flow: Route -> Controller -> Service -> Domain/Repository.
- Business validation belongs in `src/domain/**`; UI form state belongs in feature code.
- Customer-facing UI belongs under `src/features/cart-checkout/**` or a reusable `src/features/customer-account/**`, not `src/components/**` unless generic.
- Public API responses use `{ data, meta }` or `{ error: { code, message, details? } }`.
- Use TypeBox/Elysia `t` schemas for route contracts. Use Zod or pure domain validators for forms only when TypeBox/OpenAPI generation is not needed.
- Money/order/payment state remains untouched here. Payment and fulfillment statuses must stay separate in later stories.

### Design Direction Fidelity

- Source: `_bmad-output/planning-artifacts/ux-design-directions.html#direction-04`.
- Direction 04: "Precision Checkout" with stage-based checkout, Details form, and receipt/payment summary as future flow.
- Source: `_bmad-output/planning-artifacts/ux-design-specification.md#CheckoutSteps`.
- Checkout steps must show current/complete/blocked states and current step with `aria-current`.
- Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Form Patterns`.
- Storefront forms should be short, checkout-focused, grouped by delivery/contact logic, and show email verification prompts only when needed.
- Preserve sharp 1px module style, no shadows/blur, Satoshi/Space Mono token rules, shared `Button` hover/focus contract, and no `jrw-*` CSS resurrection.

### Latest Technical Information

- Elysia lifecycle docs list `Transform` before validation and `Before Handle` before the route handler. Existing `rbacGuard` route tests rely on transform denial before body validation for protected profile routes. Source: https://elysiajs.com/essential/life-cycle
- Elysia config docs say unsafe validation details are omitted by default in production since 1.4.13. Do not enable unsafe validation details for checkout/customer endpoints. Source: https://elysiajs.com/patterns/configuration
- PayMongo hosted checkout docs recommend `/v2/checkout_sessions` for new integrations and return a hosted `checkout_url`. This story must not call PayMongo; keep details/cart validation as prerequisite for Story 5.3. Source: https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- MDN documents `aria-current="step"` for current item in a multi-step checkout flow and says only one item in the set should be current. Source: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current

### Testing Requirements

- Minimum changed-code validation:
  - `npx vitest run src/features/cart-checkout/**/*.test.tsx`
  - `npx vitest run src/server/routes/customer.routes.test.ts src/server/routes/auth.routes.test.ts src/server/routes/google-oauth.routes.test.ts`
  - Add changed-domain/route targeted suites if new checkout details files/endpoints are added.
  - `npm run check`
- If new protected endpoint is added, route tests must prove invalid body does not bypass auth denial for anonymous/wrong-role actors and controller/service side effects do not run.
- If UI changes only, still add component tests that assert Direction 04 stepper/form states, field errors, and responsive-safe classes or document manual QA blocker.

### Anti-Patterns To Avoid

- Do not send checkout Customers to `/account` unless it has real sign-in/registration/recovery UI.
- Do not use Admin auth endpoints or Admin cookies for customer checkout.
- Do not write checkout contact data to localStorage as trusted authority.
- Do not collect card data, PayMongo tokens, raw payment payloads, or provider references.
- Do not expose email verification token, OAuth state/nonce/code, session token, cookie value, password, raw DB errors, or validation internals in UI/errors/logs.
- Do not add order/payment/reservation schema in this story unless a documented blocker proves details cannot be validated otherwise.
- Do not show "JRW is seller of record" or marketplace boundary lessons in routine checkout UI. Keep that in docs/legal/payment contexts.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 5.1`
- `_bmad-output/planning-artifacts/prd.md#Functional Requirements`
- `_bmad-output/planning-artifacts/prd.md#Philippines privacy requirements`
- `_bmad-output/planning-artifacts/prd.md#API Endpoint Areas`
- `_bmad-output/planning-artifacts/architecture.md#Process Patterns`
- `_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping`
- `_bmad-output/planning-artifacts/ux-design-directions.html#direction-04`
- `_bmad-output/planning-artifacts/ux-design-specification.md#CheckoutSteps`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/4-5-availability-blocking-before-checkout.md`
- `_bmad-output/implementation-artifacts/4-10-future-story-ui-fidelity-gate.md`
- `_bmad-output/implementation-artifacts/4-11-product-detail-composition-content-and-recommendations.md`
- `src/features/cart-checkout/components/CheckoutDetailsPage.tsx`
- `src/features/cart-checkout/components/CheckoutFlow.tsx`
- `src/server/routes/customer.routes.ts`
- `src/server/routes/auth.routes.ts`
- `src/server/routes/google-oauth.routes.ts`
- `src/server/routes/account-recovery.routes.ts`
- `src/domain/customers/customer-account.ts`
- `src/domain/schema/identity.ts`
- `src/server/context/request-context.ts`
- `src/server/middleware/rbac.ts`
- https://elysiajs.com/essential/life-cycle
- https://elysiajs.com/patterns/configuration
- https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

### File List
