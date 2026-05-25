---
title: 'Admin Login Registration Course Correction'
type: 'bugfix'
created: '2026-05-25'
status: 'done'
route: 'one-shot'
---

# Admin Login Registration Course Correction

## Intent

**Problem:** Admin sign-in used a low-border clean control and did not explicitly mark the CTA as a submit button, making the login action easier to miss and weaker than the primary-action visual contract. Planning docs also still allowed Admin registration, conflicting with the decision that Super Admin creates Admin accounts.

**Approach:** Replace the sign-in CTA with the shared primary `Button`, assert visible primary styling and submit behavior, and remove Admin registration from MVP planning language. Keep password reset as the only secondary auth affordance.

## Suggested Review Order

**Admin Login CTA**

- Primary submit button makes action visible and functional.
  [`AdminSignInPanel.tsx:67`](../../src/features/admin-auth/components/AdminSignInPanel.tsx#L67)

- Static UI test locks no-register affordance and button contrast.
  [`admin-auth-ui.test.tsx:24`](../../src/features/admin-auth/components/admin-auth-ui.test.tsx#L24)

**Registration Scope**

- PRD now states Super Admin-created Admin accounts only.
  [`prd.md:122`](../planning-artifacts/prd.md#L122)

- Epic 1 account management drops Admin self-signup path.
  [`epics.md:1142`](../planning-artifacts/epics.md#L1142)

- Epic 3 login shell asserts no signup action appears.
  [`epics.md:2256`](../planning-artifacts/epics.md#L2256)

- Architecture auth boundary removes Admin registration UI.
  [`architecture.md:228`](../planning-artifacts/architecture.md#L228)

- UX gate keeps sign-in, logout, reset only.
  [`ux-design-specification.md:578`](../planning-artifacts/ux-design-specification.md#L578)

- OpenAPI route copy no longer implies registration flow.
  [`admin-accounts.routes.ts:522`](../../src/server/routes/admin-accounts.routes.ts#L522)

**Verification**

- Admin auth test covers visible CTA and absent register link.
  [`admin-auth-ui.test.tsx:30`](../../src/features/admin-auth/components/admin-auth-ui.test.tsx#L30)
