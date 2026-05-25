# Sprint Change Proposal: Admin Page Middleware

Date: 2026-05-25

## Issue Summary

Admin dashboard page entry relied on a client-hydrated `AdminSessionGate`, so `/admin` first rendered "Loading admin session" before deciding whether to show the dashboard or sign-in. That caused poor UX and conflicted with the intended protected admin entry behavior.

## Impact Analysis

- PRD impact: protected admin pages need explicit server-side page gating, not only API RBAC.
- Epic impact: Story 3.10 and Story 3.11 need clarification that Astro page middleware protects `/admin/**` before dashboard shell rendering.
- Architecture impact: API RBAC remains under `src/server/middleware/**`; Astro page access checks belong in `src/middleware/**`.
- Technical impact: add `src/middleware/index.ts`, a focused admin page guard, and a server-side admin session inspector that reuses existing admin auth repositories/services.

## Recommended Approach

Direct adjustment. Add Astro page middleware for protected admin pages, redirect unauthenticated or invalid sessions to `/admin/sign-in`, redirect non-owner Admins away from owner-only pages, and set `Astro.locals.adminActor` for server-rendered admin layouts.

Risk is low to moderate because auth boundaries are sensitive, but implementation reuses existing session inspection and does not change API session creation, cookies, or RBAC.

## Detailed Change Proposals

PRD:

- Add protected admin page middleware to MVP scope.
- Add NFR requiring protected admin pages to run server-side access checks before rendering dashboard UI.

Epics:

- Story 3.10 AC now requires Astro page middleware for `/admin` access and avoids "Loading admin session" as primary page UX.
- Story 3.11 AC now states admin resource pages pass through protected admin page middleware before shell render.

Architecture:

- Clarify API guards are separate from Astro page middleware.
- Clarify client session checks may refresh state but are not first-line page guards.

Implementation:

- Add `src/server/auth/admin-page-session.ts`.
- Add `src/middleware/auth/admin-page-guard.ts`.
- Add `src/middleware/index.ts`.
- Update `src/layouts/AdminLayout.astro` to read `Astro.locals.adminActor`.
- Update `src/pages/admin/index.astro` to render through `AdminLayout` instead of `AdminSessionGate`.

## Implementation Handoff

Scope: Minor.

Owner: Developer agent.

Success criteria:

- `/admin` with no valid `jrw_admin_session` redirects before rendering dashboard shell.
- `/admin` with valid Admin/Super Admin session renders dashboard shell without "Loading admin session" as first page state.
- Owner-only admin page paths require Super Admin session before render.
- Middleware tests and build checks pass.
