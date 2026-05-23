# Sprint Change Proposal: Storefront React Feature Boundary

## 1. Issue Summary

Story 4.1 implemented the storefront shell, but feature UI landed in Astro files and `src/components/navigation/**`. That conflicts with the project architecture: Astro owns routing/SEO shells, React owns feature UI, and `src/features/<feature>/**` owns user-facing feature components.

Evidence:
- Architecture says frontend uses Astro pages plus React feature islands and feature UI belongs under `src/features/<feature>/**`.
- Project context says `src/components/**` is for generic reusable primitives only.
- Story 4.1 storefront-specific header/footer/home UI currently sits outside `src/features/**`.

## 2. Impact Analysis

Epic impact: Epic 4 remains valid. Story 4.1 needs a direct refactor, not a scope change.

Story impact: Story 4.1 implementation record and file list need update. Future Epic 4 stories should place storefront feature UI under `src/features/storefront-shell`, `src/features/product-catalog`, or later feature-specific folders.

Artifact conflicts: Architecture and project context already define the desired boundary. No PRD or UX change needed.

Technical impact: Move storefront-specific UI into React components. Keep Astro pages/layouts as wrappers. No API, domain, DB, cart, search, checkout, or product data changes.

## 3. Recommended Approach

Direct Adjustment. Effort low, risk low.

Rationale: Existing behavior is acceptable, but ownership boundary is wrong. Refactor keeps route behavior and styles intact while aligning code with React-first feature modules.

## 4. Detailed Change Proposals

Story 4.1 file list and implementation plan:

OLD:
- `src/components/navigation/StorefrontHeader.astro`
- `src/components/navigation/StorefrontFooter.astro`
- Storefront home and placeholder markup inside Astro pages.

NEW:
- `src/features/storefront-shell/components/StorefrontHeader.tsx`
- `src/features/storefront-shell/components/StorefrontFooter.tsx`
- `src/features/storefront-shell/components/StorefrontHome.tsx`
- `src/features/storefront-shell/components/StorefrontPlaceholder.tsx`
- Astro pages import React feature components and remain route wrappers.

## 5. Implementation Handoff

Scope: Minor.

Route to: Developer agent.

Success criteria:
- Storefront-specific UI lives under `src/features/storefront-shell/**`.
- `src/components/**` keeps only reusable primitives and non-feature shared components.
- Story 4.1 routes still return 200 and visual QA still passes.
- `npm run check` has 0 errors.
