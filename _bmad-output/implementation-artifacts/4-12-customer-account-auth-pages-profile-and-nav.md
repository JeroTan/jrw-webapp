# Story 4.12: Customer Account Auth Pages, Profile, and Storefront Auth Navigation

Status: ready-for-dev

<!-- Correct-course follow-up from sprint-change-proposal-2026-06-21-customer-account-pages.md. -->

## Story

As a Customer,
I want storefront account pages for sign-in, registration, profile management, and authenticated navigation,
so that I can access JRW account benefits without using raw API routes and without blocking guest checkout.

## Acceptance Criteria

1. Given a Prospect opens `/account/sign-in`, when the page renders, then it shows a Customer sign-in form using the existing Customer sign-in endpoint and a Google sign-in action using the existing Google OAuth start route.
2. Given a Prospect opens `/account/register`, when the page renders, then it shows a Customer registration form using the existing Customer registration endpoint, shows privacy/verification copy, and never creates Admin or Super Admin accounts.
3. Given registration succeeds, when the response returns, then the UI shows a safe verification-email state and does not expose sensitive account/session/provider/internal values.
4. Given a Customer signs in successfully, when a safe `returnTo` path exists, then the browser navigates only to that same-origin relative path; otherwise it navigates to `/account/profile` or the account landing page.
5. Given a valid Customer session opens `/account/profile`, when the page renders, then it loads the safe profile from the existing Customer profile endpoint, allows editing allowed fields only, and saves through the existing Customer profile update endpoint.
6. Given an unauthenticated visitor opens protected account pages such as `/account/profile`, when middleware/page guard runs, then the page redirects to `/account/sign-in?returnTo=/account/profile` before rendering protected account UI.
7. Given an authenticated Customer opens `/account/sign-in` or `/account/register`, when middleware/page guard runs, then the page redirects to `/account/profile` or the safe `returnTo` path instead of showing auth forms.
8. Given the storefront header renders, when no Customer is authenticated, then account navigation shows `SIGN IN` / register/account-entry actions; when a Customer is authenticated, it shows account/profile/future orders/sign-out state without exposing PII-heavy data.
9. Given `StorefrontHeader` is refactored, when the header renders, then `StorefrontHeader.tsx` owns the high-level header layout, Customer session branching, logo/search/cart composition, and calls `StorefrontPublicNav.tsx` or `StorefrontAuthNav.tsx` based on Customer authentication state.
10. Given unauthenticated header state renders, when no Customer session exists, then `StorefrontPublicNav.tsx` renders public account CTAs such as sign in/register using shared storefront header CTA/action components rather than duplicating long button/link class strings.
11. Given authenticated header state renders, when a Customer session exists, then `StorefrontAuthNav.tsx` renders profile/account/future orders/sign-out actions using the same shared storefront header CTA/action components and without exposing PII-heavy profile data.
12. Given header CTA/action markup is repeated across public/auth nav or home/header actions, when implementation refactors the header, then reusable components are extracted first and plugged into `StorefrontPublicNav.tsx` and `StorefrontAuthNav.tsx` so both components stay small and uncluttered.
13. Given Customer signs out, when sign-out succeeds, then the Customer session cookie is cleared by the existing endpoint and storefront navigation returns to Prospect state.
14. Given implementation finishes, when tests/checks run, then tests cover sign-in success/failure, register success/failure, profile load/update, protected page redirect, authenticated nav state, sign-out, safe `returnTo`, no Admin realm usage, no sensitive value leakage, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Task 1: Confirm current Customer contracts and reuse them without new account semantics. (AC: 1-7, 13-14)
  - [ ] Inspect Customer sign-in, session, sign-out, registration, profile, Google OAuth, recovery, and verification routes before coding.
  - [ ] Reuse existing Customer session inspection, sign-in, sign-out, registration, and profile read/update endpoints.
  - [ ] Do not use Admin auth routes, Admin repositories, Admin cookies, or any Admin/Super Admin account state in Customer UI.
  - [ ] Preserve identity-realm separation: Customer UI uses Customer session state only.

- [ ] Task 2: Replace the placeholder account page with real account routes. (AC: 1-7, 14)
  - [ ] Replace `src/pages/account/index.astro` placeholder with an account landing/router that sends authenticated Customers to `/account/profile` and unauthenticated visitors to sign-in/register choices.
  - [ ] Add `src/pages/account/sign-in.astro`.
  - [ ] Add `src/pages/account/register.astro`.
  - [ ] Add `src/pages/account/profile.astro`.
  - [ ] Include customer password reset and email verification result pages only if implementation can safely reuse existing behavior without expanding scope; otherwise document them as follow-up.
  - [ ] All account pages must use storefront/account layout, not admin dashboard shell.

- [ ] Task 3: Build `src/features/customer-account/**` UI and client boundary. (AC: 1-5, 13-14)
  - [ ] Add customer-account client helpers for session inspection, sign-in, sign-out, registration, profile read, and profile update.
  - [ ] Add `CustomerSignInPanel` with email/password sign-in, Google OAuth start action, safe error messages, pending state, and safe `returnTo` handling.
  - [ ] Add `CustomerRegisterPanel` with registration fields, privacy/verification copy, and safe success state.
  - [ ] Add `CustomerProfilePanel` with editable allowed fields only: display name, name fields, phone, delivery/contact fields, and email marketing preference.
  - [ ] Add account loading, empty, success, and error states using shared JRW primitives and Tailwind tokens.

- [ ] Task 4: Add Customer page guard / middleware behavior. (AC: 6-7, 14)
  - [ ] Add server-side or Astro middleware/page guard for protected Customer pages such as `/account/profile` and future `/account/orders/**`.
  - [ ] Unauthenticated protected-page requests redirect before protected UI renders to `/account/sign-in?returnTo=<safe-relative-path>`.
  - [ ] Authenticated Customers visiting `/account/sign-in` or `/account/register` redirect to `/account/profile` or safe `returnTo`.
  - [ ] Reject unsafe `returnTo` values: absolute URLs, protocol-relative URLs, control characters, admin routes, API routes, and external origins.
  - [ ] Keep guest checkout pages out of this guard; checkout must not become account-gated.

- [ ] Task 5: Refactor storefront header authenticated/public navigation. (AC: 8-12, 14)
  - [ ] Keep `src/features/storefront-shell/StorefrontHeader.tsx` as the session-aware orchestrator. It owns high-level header layout, logo, search, cart composition, current URL/active nav wiring, and authenticated-vs-public branching.
  - [ ] Move the current public sign-in/account behavior into `src/features/storefront-shell/components/Navigation/StorefrontPublicNav.tsx`.
  - [ ] Add `src/features/storefront-shell/components/Navigation/StorefrontAuthNav.tsx` for authenticated Customer account/profile/future orders/sign-out actions.
  - [ ] Do not let either nav component become cluttered with duplicated long `ButtonLink`/`Button` class strings or repeated CTA/button markup.
  - [ ] Extract reusable storefront header CTA/action components before plugging them into public/auth nav states. Suggested names:
    - `StorefrontHeaderAction.tsx`
    - `StorefrontHeaderCta.tsx`
    - `StorefrontAccountMenu.tsx` if authenticated actions need grouping
  - [ ] Reuse these same extracted header CTA/action pieces anywhere the home/header/account CTA pattern repeats, including home CTA or repeated storefront header buttons when applicable.
  - [ ] Public nav shows sign-in/register/account-entry actions for Prospect state.
  - [ ] Auth nav shows profile/account/future orders/sign-out actions for Customer state and avoids PII-heavy labels in the header.
  - [ ] Preserve current storefront nav links, cart action, search form, active route behavior, mobile menu behavior, and JRW focus/outline style.

- [ ] Task 6: Tests and validation. (AC: 1-14)
  - [ ] Add UI tests for sign-in form success/failure and safe error display.
  - [ ] Add UI tests for registration success/failure and verification-email success state.
  - [ ] Add UI tests for profile load/update and field-level errors.
  - [ ] Add page guard tests for unauthenticated protected profile redirect and authenticated auth-page redirect.
  - [ ] Add safe `returnTo` tests for allowed relative paths and blocked unsafe paths.
  - [ ] Add storefront header tests for Prospect state, Customer state, sign-out behavior, and no PII-heavy labels.
  - [ ] Add static/import boundary tests or search checks proving Customer account UI does not import Admin repositories/routes/cookies.
  - [ ] Run `npm run check`.
  - [ ] Run relevant Vitest suites and document any blocker.

## Dev Notes

### Correct-Course Context

- Trigger: MR. JRW noticed on 2026-06-21 that Customer auth endpoints exist but Customer login, registration, profile, authenticated nav, and customer page middleware are missing.
- Approved correction: add Story 4.12 and make it visible in sprint docs.
- User-specific architecture direction: `StorefrontHeader.tsx` should handle whether the user is authenticated or not, then call `StorefrontAuthNav.tsx` or `StorefrontPublicNav.tsx`. Repeated CTA/action/button pieces in the storefront header, home CTA, and account nav should be componentized first and plugged into those nav components so they stay clean.
- MVP impact: no MVP reduction. This completes Customer-facing account UI that PRD already requires.

### Current Code Intelligence

- `src/pages/account/index.astro` currently renders a placeholder. Replace it.
- `src/features/storefront-shell/StorefrontHeader.tsx` currently renders the whole header and always shows a `SIGN IN` `ButtonLink` to `/account`. Refactor it into a high-level orchestrator.
- Existing public nav behavior is inside `StorefrontHeader.tsx` / local `StorefrontNav`. Preserve current store nav links, search form, cart action, route active-state behavior, and mobile menu behavior.
- Existing Customer routes provide realm-specific Customer session/sign-in/sign-out behavior and Customer profile read/update behavior.
- Prior admin page middleware correction exists as planning precedent; this story should add Customer page guard behavior without changing Admin page behavior.

### Suggested Files

New or changed account pages:

- `src/pages/account/index.astro`
- `src/pages/account/sign-in.astro`
- `src/pages/account/register.astro`
- `src/pages/account/profile.astro`

New customer account feature files:

- `src/features/customer-account/api.ts`
- `src/features/customer-account/CustomerSignInPanel.tsx`
- `src/features/customer-account/CustomerRegisterPanel.tsx`
- `src/features/customer-account/CustomerProfilePanel.tsx`
- `src/features/customer-account/components/AccountShell.tsx`
- `src/features/customer-account/components/AccountFormField.tsx` if repeated account-field markup appears
- `src/features/customer-account/index.ts`

Storefront header refactor files:

- `src/features/storefront-shell/StorefrontHeader.tsx`
- `src/features/storefront-shell/components/Navigation/StorefrontPublicNav.tsx`
- `src/features/storefront-shell/components/Navigation/StorefrontAuthNav.tsx`
- `src/features/storefront-shell/components/Navigation/StorefrontHeaderAction.tsx`
- `src/features/storefront-shell/components/Navigation/StorefrontHeaderCta.tsx`
- `src/features/storefront-shell/components/Navigation/StorefrontAccountMenu.tsx` if needed

Customer page guard files, exact placement to follow existing middleware conventions:

- `src/middleware/index.ts` or existing middleware entry if present
- `src/middleware/auth/customer-page-guard.ts`
- `src/server/auth/customer-page-session.ts` if server-side session inspection should be shared with Astro middleware

Tests:

- `src/features/customer-account/customer-account-ui.test.tsx`
- `src/features/storefront-shell/StorefrontHeader.test.tsx` or existing storefront-shell test file
- `src/middleware/auth/customer-page-guard.test.ts`
- Additional route tests only if route behavior changes, which is not expected.

### UX / Design Requirements

- Use storefront/account visual language, not admin dashboard shell.
- Sharp 1px borders, 0 radius, no shadows, no blur.
- Use shared `Button`, `ButtonLink`, `Input`, and related primitives before duplicating action styles.
- Use Satoshi for headings/identity and Space Mono for system/utility text consistent with current storefront.
- Keep Customer account copy practical: sign in, create account, manage profile, track orders later, sign out.
- Do not put internal policy copy such as seller-of-record or architecture explanations in account UI.
- Status and errors must be text-first and safe.

### Security / Boundary Requirements

- Customer account UI must not query Admin endpoints, import Admin repositories, read Admin session cookies, or mention Admin/Super Admin account state.
- Header authenticated state must not expose email, phone, address, session values, provider payloads, or other PII-heavy fields.
- `returnTo` must be same-origin relative and must not allow external redirects.
- Registration/sign-in/profile errors must not expose sensitive internal account/session/provider details.
- Guest checkout must remain usable without account.

### Testing Guidance

Targeted commands:

```bash
npx vitest run src/features/customer-account/customer-account-ui.test.tsx
npx vitest run src/features/storefront-shell/StorefrontHeader.test.tsx
npx vitest run src/middleware/auth/customer-page-guard.test.ts
npm run check
```

Run `npm run build-test` before marking done if runtime/middleware changes are significant.

### References

- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-21-customer-account-pages.md`
- `_bmad-output/planning-artifacts/prd.md` - FR5, FR7, FR8, FR39, FR49, Authentication Model.
- `_bmad-output/planning-artifacts/architecture.md` - Frontend Architecture, Project Structure, Authentication & Security.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Customer account navigation, checkout/account principles, storefront visual system.
- `_bmad-output/implementation-artifacts/1-8-customer-registration-verification-and-profile.md`
- `_bmad-output/implementation-artifacts/1-10-customer-google-sign-in.md`
- `_bmad-output/implementation-artifacts/1-12-server-side-rbac-guards.md`
- `_bmad-output/implementation-artifacts/4-1-storefront-shell-design-tokens-and-public-navigation.md`
- `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

TBD

### Debug Log References

TBD

### Completion Notes List

TBD

### File List

TBD

## Change Log

- 2026-06-21: Created approved Correct Course Story 4.12 for missing Customer account UI, authenticated storefront nav, Customer page guard, and `StorefrontHeader` public/auth componentization.
