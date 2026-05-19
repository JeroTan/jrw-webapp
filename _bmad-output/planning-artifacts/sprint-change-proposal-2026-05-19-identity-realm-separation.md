# Sprint Change Proposal: Identity Realm Separation

## 1. Issue Summary

Admin and Customer were described as three product personas, but implementation and planning language risked treating them as one shared account model. The immediate trigger was Admin creation with an email already used by a Customer, followed by concern that a shared account model or cross-realm lookup would violate least privilege and confuse audit scope.

Current risk found during implementation: generic auth lookup checked Admins first and then Customers by email. If the same email existed in both tables, Admin realm could shadow Customer realm. Account recovery also used combined lookup semantics. This could cause wrong-realm authentication behavior, unsafe future refactors, and audit confusion.

## 2. Impact Analysis

- Epic impact: Epic 1 auth/governance requirements need corrected realm language. Epic 2 should complete, then urgent Epic 2.5 hardens identity before Epic 3 catalog and later Customer checkout/audit work.
- Story impact: Auth/session, Admin account creation, Customer registration, Google OAuth, password reset, request context, RBAC tests, and OpenAPI route documentation need realm-specific expectations.
- Artifact conflicts: PRD Authentication Model, API Endpoint Areas, Data & Schema Summary, Security & Privacy NFRs, FR coverage, and epics list required updates.
- Technical impact: generic `/api/auth/*` routes are replaced with `/api/admin/auth/*` and `/api/customer/auth/*`; cookies split into `jrw_admin_session` and `jrw_customer_session`; auth repositories are realm-specific.

## 3. Recommended Approach

Use direct adjustment with urgent Epic 2.5 after Epic 2. Keep separate `admins` and `customers` tables. Do not introduce shared `accounts` table or `is_admin` flag. Same email in both tables is treated as two unrelated accounts, not as explicit linking.

Scope is moderate because it touches auth routes, cookies, request context, repositories, account recovery, docs, and regression tests. It is still safer than postponing because later checkout/audit stories would otherwise build on ambiguous identity semantics.

## 4. Detailed Change Proposals

- PRD: declare Admin realm and Customer realm as separate identity roots; document separate cookies, routes, repositories, and no auto-linking.
- Epics: add Epic 2.5 with stories for documentation, auth split, cross-realm email/recovery removal, and regression tests.
- Auth API: replace generic login/logout/session inspection with realm routes:
  - `/api/admin/auth/sessions`
  - `/api/admin/auth/session`
  - `/api/admin/auth/sessions/current`
  - `/api/customer/auth/sessions`
  - `/api/customer/auth/session`
  - `/api/customer/auth/sessions/current`
- Recovery API: route password reset through Admin or Customer realm paths and keep Customer email verification under Customer auth.
- Tests: cover same-email lookup, cross-realm cookie ignore behavior, same-table-only Admin conflicts, and static import boundaries.

## 5. Implementation Handoff

Scope classification: Moderate.

Success criteria:
- Admin auth repository imports/queries only `admins`.
- Customer auth repository imports/queries only `customers`.
- Generic `/api/auth/*` login/session docs are gone.
- Cross-realm cookie is ignored by opposite realm endpoints.
- Admin creation no longer rejects Customer email collisions.
- Focused auth, account, route, and repository tests pass.

## 6. Implementation Confirmation - 2026-05-19

Implemented and verified:

- Auth routes split into Admin `/api/admin/auth/*` and Customer `/api/customer/auth/*`; generic `/api/auth/*` removed from current OpenAPI.
- Cookies split into `jrw_admin_session` and `jrw_customer_session`; request context chooses cookie by route realm and treats wrong-realm cookies as anonymous.
- Auth repositories split: `AdminAuthRepository` imports/queries only `admins`; `CustomerAuthRepository` imports/queries only `customers`.
- Account recovery repositories split: `AdminAccountRecoveryRepository` imports/queries only `admins`; `CustomerAccountRecoveryRepository` imports/queries only `customers`; old mixed recovery repository removed.
- Admin creation/update checks only `admins.email`; Customer registration checks only `customers.email`.
- Google OAuth remains Customer-only, uses `jrw_customer_session`, and queries only `customers` / `customer_providers`; same Admin email string does not block Customer OAuth.
- Documentation updated in PRD, Epic 2.5, endpoint catalog, API file-flow doc, and owning implementation stories 1.7-1.13 plus dependent Epic 2 stories.
- Validation: full Vitest suite passed (`56` files, `343` tests), auth regression subset passed (`12` files, `60` tests), `npx astro check` passed with 0 errors, and `npm run build` passed.
