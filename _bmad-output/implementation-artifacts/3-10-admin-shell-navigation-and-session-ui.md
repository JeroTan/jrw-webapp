# Story 3.10: Admin Shell, Navigation, and Session UI

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin or Super Admin,
I want protected admin entry points and a JRW dashboard shell,
so that admin work starts from a real operational console instead of disconnected standalone pages.

## Acceptance Criteria

1. Given unauthenticated user opens `/admin`, when no valid `jrw_admin_session` exists, then Admin sign-in UI appears or the user is routed to an Admin sign-in route and no protected admin data is rendered.
2. Given Admin submits valid dashboard credentials, when `/api/admin/auth/sessions` succeeds, then an HttpOnly admin session cookie is created and Admin lands inside the dashboard shell.
3. Given Admin chooses sign out, when `/api/admin/auth/sessions/current` delete succeeds, then the session is cleared and UI returns to sign-in state.
4. Given Admin needs password recovery, when reset request or reset confirmation is submitted, then UI consumes existing Admin password reset APIs and reset completion does not create a new session.
5. Given Admin self-registration is enabled by product decision, when registration UI is available, then the page states that approval is required before dashboard access.
6. Given Admin self-registration is not enabled, when user seeks registration, then UI points to Super Admin account creation instead of exposing unsupported signup.
7. Given Admin dashboard shell renders, when compared to Direction 05, then sidebar, top context bar, role badge, active brand scope area, search/action region, skip link, landmarks, and keyboard navigation are present.
8. Given Super Admin dashboard shell renders, when owner-only navigation is visible, then Admin Accounts, Ownership Transfer, and Audit are separated from daily Admin navigation.
9. Given Admin lacks permission for a route, when protected view is blocked, then a safe forbidden state appears inside the shell and owner-only controls are not exposed.
10. Given implementation finishes, when tests/QA run, then checks cover sign-in, sign-out, password reset entry, disabled registration behavior, shell landmarks, sidebar/topbar rendering, forbidden state, and `npm run check` passes or blockers are documented.

## Tasks / Subtasks

- [ ] Task 1: Lock auth/session scope and route decisions. (AC: 1-10)
  - [ ] Use existing Admin auth APIs only: `/api/admin/auth/sessions`, `/api/admin/auth/sessions/current`, `/api/admin/auth/password-resets`, `/api/admin/auth/password-resets/confirmations`.
  - [ ] Do not add Admin OAuth, Customer auth reuse, generic `/api/auth/*`, or cross-realm lookup.
  - [ ] Default Admin self-registration UI to disabled unless an existing config/feature flag already enables it. Do not invent backend registration behavior.
  - [ ] Do not wrap all existing admin resource pages in this story; Story 3.11 owns page migration into shell.

- [ ] Task 2: Add Admin auth feature UI and tests. (AC: 1-6, 10)
  - [ ] Create `src/features/admin-auth/**` for sign-in, sign-out/session helpers, password reset request, password reset confirmation, and disabled registration notice if needed.
  - [ ] Add tests for successful sign-in request shape, failed sign-in safe error, logout request, password reset request/confirmation request shape, and disabled registration copy.
  - [ ] Keep copy short: "Sign in to JRW admin", "Password reset sent if account is eligible", "Ask Super Admin to create an account" when registration disabled.

- [ ] Task 3: Build shared Admin shell components. (AC: 7-9)
  - [ ] Create `DashboardShell`, `SidebarNav`, and `TopBar` under `src/components/layout/**` or `src/components/navigation/**` per architecture boundaries.
  - [ ] Shell must expose landmarks: skip link, `nav`, `main`, top context bar, active nav item, role badge, brand scope placeholder, action/search slot.
  - [ ] Sidebar daily Admin nav: Dashboard, Products, Brands, Inventory, Orders, Customers, Audit, Settings.
  - [ ] Owner-only nav group: Admin Accounts, Ownership Transfer, Audit.
  - [ ] Include logout control in top bar or sidebar utility area.

- [ ] Task 4: Add Admin routes and layout entry points. (AC: 1-10)
  - [ ] Add `/admin` dashboard entry route.
  - [ ] Add Admin sign-in route and password reset routes under `src/pages/admin/**`.
  - [ ] Add `AdminLayout.astro` if Astro wrapper is cleaner than composing shell per page.
  - [ ] Ensure protected admin data is not rendered for unauthenticated users. If server session inspection is not available in Astro yet, render shell-safe sign-in/forbidden states and keep real API/server RBAC authoritative.

- [ ] Task 5: Add forbidden/loading states. (AC: 7-10)
  - [ ] Add shell states for loading session, unauthenticated, forbidden, Admin, and Super Admin.
  - [ ] Owner-only controls must be hidden from non-owner Admin UI.
  - [ ] Forbidden copy must state needed permission without exposing server internals.

- [ ] Task 6: Validate. (AC: 10)
  - [ ] Run targeted tests for admin auth and shell components.
  - [ ] Run `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`.
  - [ ] Run `npm run check`.
  - [ ] Manual QA `/admin`, sign-in, logout, password reset, forbidden/shell states if dev server is available.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- N/A Route auth metadata declares public/optional/required auth, roles, and rate-limit class. This story should consume existing endpoints, not create backend endpoints.
- N/A Route-level RBAC guard runs before validation or side effects for protected endpoints. Existing server endpoints own RBAC.
- N/A Service/controller enforces actor state before mutation. Existing server endpoints own actor checks.
- N/A Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. No brand-scoped backend change.
- N/A Public/customer endpoints explicitly document why brand membership is not required. Admin UI story.
- [ ] Denial UI tests cover unauthenticated and forbidden shell states where implemented.
- [ ] Error response handling uses safe messages and does not leak raw provider/internal auth details.
- N/A OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes. Existing endpoints already documented.

## Dev Notes

### Dependencies

- Requires Story 4.8 for shared button hover/focus contract.
- Prefer Story 4.10 complete first so story/review gates are active.
- Must complete before Story 3.11 admin console wrapping.

### Current Code Intelligence

#### READ: `src/server/routes/auth.routes.ts`

- Current state: Admin auth endpoint group exists at `/api/admin/auth/*`, with `jrw_admin_session` cookie for sessions and current-session delete.
- What this story changes: client UI consumes these APIs only.
- What must be preserved: realm separation. Admin UI must not use customer auth routes/cookies.

#### READ: `src/server/routes/account-recovery.routes.ts`

- Current state: Admin password reset endpoints exist under `/api/admin/auth/password-resets` and `/api/admin/auth/password-resets/confirmations`.
- What this story changes: client UI for request and confirmation.
- What must be preserved: reset completion does not create a session.

#### READ: `src/pages/admin/products/index.astro` and other `src/pages/admin/**`

- Current state: admin pages import `BaseLayout` directly and render standalone feature components.
- What this story changes: add admin entry/auth/shell routes, but leave existing resource page wrapping to Story 3.11.
- What must be preserved: existing resource pages continue to work during shell/auth addition.

#### READ: `src/layouts/BaseLayout.astro`

- Current state: basic HTML/head/slot.
- What this story changes: likely no change. Add `AdminLayout.astro` rather than overloading `BaseLayout`.
- What must be preserved: existing storefront metadata behavior.

#### READ: `src/components/layout/PageToolbar.tsx`

- Current state: shared toolbar primitive exists.
- What this story changes: shell may use `PageToolbar` inside work area but should not mutate it unless needed.
- What must be preserved: existing product/brand/category page usage.

### Technical Requirements

- Admin shell follows UX Direction 05. Super Admin governance nav follows Direction 07.
- Use Tailwind utility classes and brand tokens. No `jrw-*` selectors.
- UI should be desktop-first, dense, keyboard-friendly, and operation-focused.
- Do not claim security from client-only checks. Server-side RBAC remains source of truth.
- If session inspection endpoint wiring is missing for Astro page server-side checks, create honest client-side shell states and document the limitation in Completion Notes.

### Testing Requirements

- Use React static/render tests for shell landmarks, nav labels, role/owner groups, logout control, forbidden state.
- Use fetch-mocking or dependency-injected API helpers for admin auth UI tests. Do not hit real remote auth in unit tests.
- `npm run check` must pass.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 3.10.
- `_bmad-output/planning-artifacts/ux-design-directions.html` - Direction 05 and Direction 07.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - UX-DR10, UX-DR23, UX-DR35.
- `_bmad-output/planning-artifacts/architecture.md` - Component Boundaries, Visual System Boundaries.
- `_bmad-output/project-context.md` - Auth realm-specific warning.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `src/server/routes/auth.routes.ts`
- `src/server/routes/account-recovery.routes.ts`
- `src/server/routes/admin-accounts.routes.ts`
- `src/pages/admin/products/index.astro`
- `src/pages/admin/brands/index.astro`
- `src/pages/admin/categories/index.astro`
- `src/pages/admin/owner/transfer.astro`
- `src/layouts/BaseLayout.astro`
- `src/components/layout/PageToolbar.tsx`

### Completion Notes List

- Story context created only. No implementation performed.

### File List

- `_bmad-output/implementation-artifacts/3-10-admin-shell-navigation-and-session-ui.md`

### Change Log

- 2026-05-24: Created ready-for-dev story context.
