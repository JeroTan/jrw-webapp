# Sprint Change Proposal: Customer Account Pages and Authenticated Storefront Navigation

Date: 2026-06-21
Status: approved
Scope: Moderate correction within storefront/customer account plan

## 1. Issue Summary

The customer account API layer exists, but the customer-facing account pages and storefront authenticated navigation are still missing. The current `/account` page is a placeholder, and the storefront header always shows `SIGN IN` instead of reflecting Customer session state.

Trigger:

- User correction on 2026-06-21: JRW still has no customer login page, registration page, profile page, authenticated-user navigation, or page middleware for customer account pages.
- User approval on 2026-06-21: add the correction story and explicitly require `StorefrontHeader` to own authenticated-vs-public branching while extracting `StorefrontAuthNav.tsx`, `StorefrontPublicNav.tsx`, and shared storefront header CTA/action primitives so auth/public nav components stay uncluttered.

Evidence observed in current repo:

- `src/pages/account/index.astro` renders `StorefrontPlaceholder` with placeholder copy instead of a sign-in/register/profile/account shell.
- `src/features/storefront-shell/StorefrontHeader.tsx` always renders a `ButtonLink` to `/account` with label `SIGN IN`; it does not inspect Customer session or show account/profile/sign-out state.
- Customer APIs are already completed in earlier stories: `/api/customer/auth/sessions`, `/api/customer/auth/session`, `/api/customer/auth/sessions/current`, `/api/customers`, `/api/customers/me`, Google OAuth start/callback, email verification, and customer password reset routes.
- No `src/middleware.ts` / `src/middleware/**` customer page guard was found in the active source tree.

Problem statement:

The backend customer identity foundation is complete enough for API use, but the UI story that turns those APIs into customer pages was never added to the sprint plan. This creates a visible MVP gap: Customers can technically authenticate through APIs, but shoppers have no proper UI to sign in, register, manage profile, or see authenticated navigation.

## 2. Impact Analysis

### Epic Impact

- Epic 1 remains valid as API/auth foundation and should not be reopened for UI implementation.
- Epic 4 storefront scope should receive a correction story because account entry and authenticated storefront navigation are storefront/customer UX concerns.
- Epic 5 checkout remains valid, but signed-in checkout prefill and account convenience are weakened until this account UI exists.
- Epic 6 order tracking will depend on customer account shell/navigation for signed-in order history.

### Story Impact

Recommended new story:

- `4-12-customer-account-auth-pages-profile-and-nav`

This story should be inserted after Story 4.11 and before continuing remaining payment/order/customer-history stories, or at least before Epic 6 Story 6.1.

Existing stories affected:

- Story 1.8: APIs are done, but page/UI completion must not be implied by API completion.
- Story 1.10: Google OAuth route exists, but storefront account UI must expose it safely.
- Story 4.1: storefront header/navigation must become Customer-session-aware.
- Story 5.1: signed-in Customer prefill remains optional; account UI improves reuse but must not gate guest checkout.
- Story 6.1: customer order history should build on the same account shell and page guard.

### Artifact Conflicts

PRD:

- PRD already requires Customer registration, Google sign-in, basic profile management, and Customer order history. The conflict is not missing requirements; it is missing sprint/story coverage for pages.

Architecture:

- Architecture already lists `src/pages/account/index.astro`, `src/features/customer-account/**`, and account/order routes, but implementation currently has only a placeholder account page.
- Need clarify customer page middleware separately from API RBAC, mirroring the admin page middleware correction pattern.

UX:

- UX already says Customer account navigation should include orders, profile, email verification, and sign out.
- Need implement the actual account entry screens in the approved storefront/account visual system.

Sprint status:

- Current sprint status has no customer account UI story. Add a new backlog story entry only after proposal approval.

### Technical Impact

Expected implementation areas:

- Add real account pages under `src/pages/account/**`:
  - `/account` as account landing/router page.
  - `/account/sign-in` for Customer sign-in.
  - `/account/register` for Customer registration.
  - `/account/profile` protected Customer profile page.
  - Optional, if in scope: `/account/verify-email`, `/account/password-reset`, `/account/password-reset/confirm` to expose existing customer recovery/verification APIs.
- Add `src/features/customer-account/**` UI components and client API helpers.
- Add customer page middleware / server-side page access helper for protected `/account/profile` and future `/account/orders` pages.
- Update storefront header/nav to inspect `/api/customer/auth/session` or server-side page data and show authenticated Customer actions.
- Refactor the current `StorefrontHeader` implementation so `StorefrontHeader.tsx` remains the orchestrator for session-aware header behavior, while public and authenticated nav/action rendering move into focused child components.
- Move the current public account/sign-in navigation behavior into a renamed component `StorefrontPublicNav.tsx`.
- Add `StorefrontAuthNav.tsx` for authenticated Customer account/profile/orders/sign-out actions.
- Extract reusable storefront header CTA/action primitives for repeated actions and buttons, so `StorefrontAuthNav.tsx` and `StorefrontPublicNav.tsx` plug in shared components instead of duplicating long `ButtonLink`, CTA, cart/account action, or home CTA markup.
- Use existing Customer APIs; do not create new backend identity semantics unless a gap is proven.
- Keep guest checkout intact. Customer auth pages must improve account convenience but must not block checkout.

## 3. Recommended Approach

Use Direct Adjustment.

Do not rollback Epic 1 auth APIs and do not replan MVP. Add a focused storefront/customer-account UI story that consumes the existing APIs, adds page middleware, and updates storefront navigation.

Effort estimate: Medium
Risk level: Medium
Timeline impact: Low to medium, because APIs already exist but auth/profile UI and page guards touch customer identity and storefront shell.

Rationale:

- This is an omitted UI/story coverage gap, not a failed technical approach.
- Existing APIs can be reused.
- Fixing now prevents checkout/order-history stories from building awkward temporary account entry points.
- Customer auth/profile is MVP scope in PRD, so deferring it would leave a visible product hole.

Rejected alternatives:

- Rollback auth APIs: not useful; APIs are already needed and mostly complete.
- Fold into checkout: wrong boundary; guest checkout must remain possible and account UI should be reusable outside checkout.
- Wait until Epic 6: too late for storefront nav and customer profile reuse.

## 4. Detailed Change Proposals

### Sprint / Story Plan

ADD new story after Story 4.11:

`4-12-customer-account-auth-pages-profile-and-nav`

Story:

As a Customer,
I want storefront account pages for sign-in, registration, profile management, and authenticated navigation,
so that I can access JRW account benefits without using raw API routes and without blocking guest checkout.

Acceptance Criteria:

1. Given a Prospect opens `/account/sign-in`, when the page renders, then it shows a Customer sign-in form using the existing `/api/customer/auth/sessions` endpoint and a Google sign-in action using the existing Google OAuth start route.
2. Given a Prospect opens `/account/register`, when the page renders, then it shows a Customer registration form using the existing `/api/customers` endpoint, shows privacy/verification copy, and never creates Admin/Super Admin accounts.
3. Given registration succeeds, when the response returns, then the UI shows a safe verification-email state and does not expose raw verification token, password hash, session token, provider payload, or internal errors.
4. Given a Customer signs in successfully, when a safe `returnTo` path exists, then the browser navigates only to that same-origin relative path; otherwise it navigates to `/account/profile` or the account landing page.
5. Given a valid Customer session opens `/account/profile`, when the page renders, then it loads the safe profile from `/api/customers/me`, allows editing allowed fields only, and saves through `PATCH /api/customers/me`.
6. Given an unauthenticated visitor opens protected account pages such as `/account/profile`, when middleware/page guard runs, then the page redirects to `/account/sign-in?returnTo=/account/profile` before rendering protected account UI.
7. Given an authenticated Customer opens `/account/sign-in` or `/account/register`, when middleware/page guard runs, then the page redirects to `/account/profile` or the safe `returnTo` path instead of showing auth forms.
8. Given the storefront header renders, when no Customer is authenticated, then account navigation shows `SIGN IN`; when a Customer is authenticated, it shows account/profile access and a sign-out action/state without exposing PII-heavy data.
8a. Given `StorefrontHeader` is refactored, when the header renders, then `StorefrontHeader.tsx` owns only the high-level header layout, Customer session branching, logo/search/cart composition, and calls into `StorefrontPublicNav.tsx` or `StorefrontAuthNav.tsx` based on authenticated state.
8b. Given the public header state renders, when no Customer is authenticated, then `StorefrontPublicNav.tsx` renders public account CTAs such as sign in/register using shared storefront header CTA/action components rather than duplicating button/link class strings.
8c. Given the authenticated header state renders, when a Customer is authenticated, then `StorefrontAuthNav.tsx` renders profile/account/future orders/sign-out actions using the same shared storefront header CTA/action components and without exposing PII-heavy profile data.
8d. Given header CTA/action markup is repeated across public/auth nav or home/header actions, when implementation refactors the header, then reusable components are extracted first and plugged into `StorefrontPublicNav.tsx` and `StorefrontAuthNav.tsx` so both components stay small and uncluttered.
9. Given Customer signs out, when sign-out succeeds, then the `jrw_customer_session` cookie is cleared by the existing API and storefront navigation returns to Prospect state.
10. Given implementation finishes, when tests/checks run, then tests cover sign-in success/failure, register success/failure, profile load/update, protected page redirect, authenticated nav state, sign-out, safe `returnTo`, no Admin realm usage, and no token/PII leakage.

Out of scope:

- Admin auth pages.
- Guest checkout gating.
- Order history detail implementation, except nav/link placeholders needed for future Epic 6.
- New backend auth semantics unless an API bug is discovered.
- Automated email verification token generation beyond existing API behavior.

### PRD

No product requirement change needed. Add a planning note only if desired:

- Customer account UI pages are required to complete FR5, FR7, and FR8 at product level; API-only completion is insufficient for MVP.

### Architecture

Add clarification:

- API RBAC protects `/api/customers/me` and Customer auth endpoints.
- Astro/customer page middleware or equivalent page guard protects `/account/profile` and future `/account/orders/**` pages before protected account UI renders.
- Storefront header can use server-provided Customer session summary or a small client session inspector, but it must not leak sensitive profile data into the header.
- `StorefrontHeader.tsx` is the session-aware storefront header orchestrator, not a dumping ground for every nav state. It should delegate public account actions to `StorefrontPublicNav.tsx` and authenticated Customer actions to `StorefrontAuthNav.tsx`.
- Shared header CTA/action primitives should be extracted for repeated header/home/account button patterns before wiring public/auth nav states. These shared components should wrap existing `ButtonLink` / `Button` contracts and JRW focus/outline styling rather than duplicating long class strings.
- Suggested structure:
  - `src/features/storefront-shell/StorefrontHeader.tsx`
  - `src/features/storefront-shell/components/Navigation/StorefrontPublicNav.tsx`
  - `src/features/storefront-shell/components/Navigation/StorefrontAuthNav.tsx`
  - `src/features/storefront-shell/components/Navigation/StorefrontHeaderAction.tsx`
  - `src/features/storefront-shell/components/Navigation/StorefrontHeaderCta.tsx`
  - `src/features/storefront-shell/components/Navigation/StorefrontAccountMenu.tsx` if authenticated account actions need grouping.

### UX

Add/confirm account screens:

- Customer sign-in page follows storefront/account shell, not admin dashboard shell.
- Customer register page uses storefront account shell and clear verification-email outcome.
- Customer profile page uses account shell with profile/contact fields and saved-state feedback.
- Account nav includes profile, future orders link, and sign out for authenticated Customer.
- Public and authenticated account nav states must be separate components plugged into `StorefrontHeader`, not conditionals scattered through one large header file.
- Repeated storefront header/home CTA and account action button patterns should become reusable components before they are used in `StorefrontPublicNav` and `StorefrontAuthNav`.
- Guest checkout remains independent: account prompts assist reuse but never block checkout.

### Sprint Status

Approved on 2026-06-21. Update `_bmad-output/implementation-artifacts/sprint-status.yaml`:

```yaml
  # Customer account UI correction: consume existing Customer APIs before signed-in order-history work.
  4-12-customer-account-auth-pages-profile-and-nav: backlog
```

Epic 4 should be reopened to `in-progress` until Story 4.12 is completed because this correction adds missing storefront/customer account UI scope after 4.11.

## 5. Implementation Handoff

Change classification: Moderate.

Developer agent responsibilities:

- Inspect existing Customer auth/profile APIs before adding UI.
- Build account pages and `customer-account` feature module using existing routes.
- Add page guard/middleware for protected Customer pages.
- Update storefront navigation for Customer session state.
- Refactor `StorefrontHeader` into a session-aware orchestrator that calls `StorefrontPublicNav` for unauthenticated users and `StorefrontAuthNav` for authenticated Customers.
- Extract reusable storefront header CTA/action components before plugging them into public/auth nav states so the two nav components do not duplicate shared button/action markup.
- Preserve guest checkout path.
- Add tests for auth pages, protected redirects, profile update, nav state, sign-out, and safe return path handling.

Product Owner / planning responsibilities:

- Approve adding Story 4.12 to sprint status.
- Confirm whether customer password reset and email verification result pages are included in Story 4.12 or split into a follow-up story.

Success criteria:

- Customer can sign in from a real storefront page.
- Customer can register from a real storefront page.
- Customer can access and update profile from a protected page.
- Storefront header reflects Prospect vs Customer state.
- Protected Customer pages redirect before rendering protected UI.
- Guest checkout still works without account.
- Existing Admin realm remains untouched and separate.

## 6. Checklist Result

- [x] 1.1 Triggering issue identified: missing Customer account UI/page story after Customer APIs were completed.
- [x] 1.2 Core problem categorized: missed sprint/story coverage and misunderstanding that API completion was enough for customer-facing account flows.
- [x] 1.3 Evidence recorded from `src/pages/account/index.astro`, storefront header, completed Customer APIs, and missing middleware.
- [x] 2.1 Current Epic 5 can continue, but account UI should be inserted before remaining customer/order-history dependent work.
- [x] 2.2 Add direct correction story; no new epic required.
- [x] 2.3 Future Epic 6 customer order status/history depends on this account shell.
- [x] 2.4 No planned epic is obsolete.
- [x] 2.5 Recommended ordering: add 4.12 before Epic 6 Story 6.1 and preferably before continuing later checkout/customer-account-dependent UI.
- [x] 3.1 PRD does not conflict; it already requires Customer registration/profile, but planning coverage is incomplete.
- [x] 3.2 Architecture needs customer page middleware/page guard clarification.
- [x] 3.3 UX needs concrete account screens and authenticated nav implementation.
- [x] 3.4 Sprint status needs a new story entry after approval.
- [x] 4.1 Direct Adjustment is viable.
- [x] 4.2 Rollback is not viable or useful.
- [x] 4.3 MVP review is not needed; this is MVP scope already.
- [x] 4.4 Recommended path documented.
- [x] 5.1-5.5 Proposal and handoff documented.
- [x] 6.3 User approval received on 2026-06-21, including required `StorefrontHeader`/`StorefrontAuthNav`/`StorefrontPublicNav` componentization direction.
- [x] 6.4 Sprint status update approved for Story 4.12.
