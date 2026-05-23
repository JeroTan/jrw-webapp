---
title: 'Storefront React Feature Boundary'
type: 'refactor'
created: '2026-05-22T20:37:31+08:00'
status: 'done'
baseline_commit: 'db816af'
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/4-1-storefront-shell-design-tokens-and-public-navigation.md'
---

<frozen-after-approval reason="human-owned intent -- do not modify unless human renegotiates">

## Intent

**Problem:** Story 4.1 placed storefront shell UI in Astro/generic `src/components/navigation`, despite project architecture requiring React feature modules for user-facing UI and `src/components/**` only for reusable primitives.

**Approach:** Move storefront shell UI into React components under `src/features/storefront-shell/**`, keep Astro as route/layout wrapper only, and preserve existing public routes, copy, accessibility, and responsive behavior.

## Boundaries & Constraints

**Always:** Use React for storefront feature UI; keep feature-specific UI under `src/features/storefront-shell/**`; keep shared primitives under `src/components/ui/**`; preserve Story 4.1 acceptance criteria and public route behavior; keep no server/domain/API changes.

**Ask First:** Any change that adds cart state, search behavior, product API calls, real catalog data, checkout, auth account UI, or new shared primitives outside Story 4.1 scope.

**Never:** Do not move feature-specific storefront components back into `src/components/**`; do not create product grid/detail/cart implementation; do not change DB/server/domain code; do not invent public category taxonomy because categories are admin-created data; Do not add feature CSS directly to `src/styles/global.css`.

</frozen-after-approval>

## Code Map

- `src/layouts/StorefrontLayout.astro` -- Astro SEO/layout wrapper that should import React shell components from feature module.
- `src/pages/index.astro` -- storefront home route; should render React home feature component.
- `src/pages/products/index.astro`, `src/pages/categories/[slug].astro`, `src/pages/cart/index.astro`, `src/pages/account/index.astro` -- public placeholder routes; should render React placeholder feature component.
- `src/components/navigation/**` -- current misplaced storefront-specific components to remove from generic components.
- `src/components/ui/**` -- reusable React primitives used by feature shell.
- `src/styles/global.css` -- import hub for Tailwind and JRW partials.
- `src/styles/_colors.css` -- JRW palette, `--jrw-color-*` aliases, and semantic Tailwind color aliases.
- `src/styles/storefront/**` -- storefront feature CSS partials using Tailwind `@apply` where practical.

## Tasks & Acceptance

**Execution:**
- [x] `src/features/storefront-shell/**` -- create React feature module for header, footer, home, placeholder, data, and exports -- restores Bulletproof React boundary.
- [x] `src/layouts/StorefrontLayout.astro` -- import React `StorefrontHeader` and `StorefrontFooter` from feature module -- keeps Astro wrapper thin.
- [x] `src/pages/index.astro` -- render React `StorefrontHome` from feature module -- moves home UI out of Astro route.
- [x] `src/pages/products/index.astro`, `src/pages/categories/[slug].astro`, `src/pages/cart/index.astro`, `src/pages/account/index.astro` -- render React `StorefrontPlaceholder` -- moves placeholder UI out of Astro routes.
- [x] `src/components/index.ts` and `src/components/navigation/**` -- remove storefront-specific navigation exports/files -- keeps `src/components/**` primitive-only.
- [x] `_bmad-output/implementation-artifacts/4-1-storefront-shell-design-tokens-and-public-navigation.md` -- update record/file list to reflect React feature boundary -- keeps story audit accurate.

**Acceptance Criteria:**
- Given storefront routes render, when `/`, `/products`, `/products?sort=new`, `/products?view=categories`, `/cart`, or `/account` loads, then the same public shell and route copy render through React feature components.
- Given project architecture rules, when code is inspected, then storefront-specific UI lives under `src/features/storefront-shell/**` and generic `src/components/**` has no Story 4.1 storefront component exports.
- Given responsive QA runs, when viewports 320, 375, 390, 430, 768, 1024, and 1440 are checked, then header/navigation remain usable without text overflow or stretched-mobile desktop layout.
- Given `npm run check` runs, then Astro/TypeScript diagnostics have no errors.

## Spec Change Log

## Verification

**Commands:**
- `npm run check` -- expected: 0 errors.
- `npm exec --yes playwright -- screenshot --channel chrome --viewport-size "320,900" --wait-for-selector "text=JRW Storefront" http://127.0.0.1:4322/ "C:\Users\jerow\AppData\Local\Temp\jrw-storefront-qa\react-home-320.png"` -- expected: screenshot captured and no mobile header overflow.
