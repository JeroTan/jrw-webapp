# Storefront User Overhaul: Commit 6959300

Status: documented

Commit: `6959300f4b7f4d4df49adcaa717236383ec45585`
Parent: `c601ca53235c2c21ebf394888f435633bc70b26f`
Subject: `refactor: user overhaul`
Date: 2026-05-25

## What Changed

- Added `lucide-react` and replaced the hand-written cart SVG with `ShoppingCart`.
- Expanded `Button` with `paddingX`, `textSize`, and `square` props so one primitive can cover dense header controls without creating one-off button components.
- Added `ButtonLink` for anchor actions that need the same JRW button contract as `Button`.
- Removed the `IconButton` pattern from storefront cart direction; icon-sized controls use the expanded `Button` API instead.
- Split the old duplicated storefront header into `StorefrontHeader`, `NavButton`, `SearchForm`, and `CartAction`.
- Reduced `StorefrontHeader` from 176 lines to 94 lines by removing duplicated mobile/desktop header blocks, custom cart SVG, and repeated anchor class strings.
- Moved `StorefrontHeader`, `StorefrontFooter`, `StorefrontHome`, and shell tests to the storefront-shell feature root, leaving only subcomponents under `components/**`.
- Reworked `CartAction` as a clean cart trigger: shared `Button`, lucide icon, quantity badge, local drawer state, and `CartDrawer`.
- Reworked storefront navigation into border-divider `NavButton` modules for desktop and mobile menu reuse.
- Reworked storefront search into a dedicated `SearchForm` component that posts to `/products`.
- Updated `StorefrontLayout` spacing to use the 1440px shell width with token-driven horizontal padding.
- Removed product catalog hero border so the hero reads as the page billboard, not another card.
- Added `--breakpoint-2xs: 374px` for narrow-device control tuning.
- Added input hover/focus cobalt outline parity with shared controls.

## Follow-Up Fix In This Pass

- Added `StorefrontHero` as the shared storefront billboard component.
- Updated product catalog, storefront home, brand index, and brand detail pages to use `StorefrontHero`.
- Removed brand-page hero drift caused by hand-rolled bordered brand headers.
- Exported `ButtonLink` from `src/components/ui/index.ts`.
- Converted brand filter submit to shared `Button`.
- Converted brand empty/recovery links to shared `ButtonLink`.
- Added brand hero regression coverage.
- Cleared `IconButton` from active source: close controls now use `Button square`, exports no longer expose `IconButton`, and the file is removed.
- Fixed JSX classic-runtime gaps in split storefront navigation and brand components by adding `React` imports.

## Component Contract

- `src/features/storefront-shell/StorefrontHeader.tsx` owns storefront top bar composition.
- `src/features/storefront-shell/components/Navigation/Navbutton.tsx` owns nav link module borders and active state.
- `src/features/storefront-shell/components/Navigation/SearchForm.tsx` owns header search form behavior.
- `src/features/storefront-shell/components/Navigation/CartAction.tsx` owns cart drawer trigger behavior.
- `src/features/storefront-shell/StorefrontHero.tsx` owns storefront page hero/billboard styling.
- `src/components/ui/Button.tsx` is for button actions, including square icon-sized actions when custom badge/layout is needed.
- `src/components/ui/ButtonLink.tsx` is for link actions that visually behave like buttons.
- `src/components/ui/IconButton.tsx` is removed from the active UI system.

## Agent Guardrails

- Do not collapse header pieces back into one component.
- Do not hand-write cart SVG; use `lucide-react` icon through `CartAction`.
- Do not recreate `IconButton`; use `Button square` for icon-sized buttons.
- Do not hand-roll storefront hero headers in product, brand, category, or home pages. Use `StorefrontHero`.
- Do not create duplicate anchor-button class strings. Use `ButtonLink`.
- Do not create a new primitive when `Button` props cover size, padding, text, and square shape.

## Validation

- `npx vitest run src/features/storefront-shell/storefront-shell-ui.test.tsx src/features/product-catalog/components/product-catalog-ui.test.tsx src/features/storefront-brands/components/storefront-brands-ui.test.tsx`
- Result: 3 files passed, 11 tests passed.
