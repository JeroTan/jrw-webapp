---
artifactType: "implementation-note"
status: "documented"
createdAt: "2026-05-26"
scope:
  - "src/components/ui/Button.tsx"
  - "src/components/ui/ButtonLink.tsx"
  - "src/components/ui/Input.tsx"
  - "src/components/ui/Select.tsx"
  - "src/features/product-catalog/ProductCatalog.tsx"
  - "src/features/product-catalog/components/ProductCard.tsx"
  - "src/features/product-catalog/components/ProductCatalogFilters.tsx"
  - "src/features/product-catalog/components/ProductGrid.tsx"
  - "src/features/storefront-shell/StorefrontHomeHero.tsx"
---

# Storefront Catalog Manual UI Cleanup - 2026-05-26

## What Changed

- Replaced `ProductCatalogPage` mode-based wrapper with `ProductCatalog`.
- Moved home hero composition to `StorefrontHomeHero`.
- Removed `StorefrontHome` and unused `storefrontHomeLinks`.
- Removed unused `StorefrontCatalogPageMode`.
- Changed routes to compose `StorefrontHomeHero` and `ProductCatalog` directly.
- Added primitive visual props: `borderTone` for `Button`, `ButtonLink`, `Input`, `Select`; `textSize` and `controlSize` for `Select`.
- Updated catalog filters to use `SearchInput`, `Select`, `Button`, and `ButtonLink` instead of hand-written button/link class strings.
- Kept form submit behavior explicit with `Button type="submit"`.
- Updated product grid/card to use a tighter module grid: grid owns top/left borders, card owns right/bottom borders.
- Updated public product metadata to omit missing brand instead of rendering `Brandless`.

## Rules Learned

- Feature boundary beats convenience. Product catalog must not own storefront hero copy or import storefront-shell hero composition.
- Routes and shell/home components compose page sections. Feature components render their own feature content only.
- Shared primitives should absorb repeated visual control variations before feature code copies long utility strings.
- `Button` defaults to `type="button"`; every submit form must pass `type="submit"`.
- Public storefront cards should not show operational filler such as `Brandless`; absence of brand is okay when category and availability still explain product.
- Test assertions must follow accepted current UI contract, not stale arbitrary Tailwind syntax.

## Current Component Contracts

- `ProductCatalog`: category directory, filter rail, grid, pagination, empty state, error state. No hero decisions.
- `ProductCatalogFilters`: search, page-size select, apply submit, clear link, category chips.
- `ProductGrid`: responsive grid and outer top/left border frame.
- `ProductCard`: media module, title, metadata, price tag, right/bottom module borders.
- `StorefrontHomeHero`: home page hero only, built from `StorefrontHero`.
- `ButtonLink`: anchor actions with JRW button styling.
- `Button`: button actions; non-submit unless `type="submit"` passed.

## Verification

- `npx vitest run src/features/product-catalog/components/product-catalog-ui.test.tsx src/features/storefront-shell/storefront-shell-ui.test.tsx --reporter verbose`
- `npm run check`

## Follow-Up Boundary

Brand correction remains future work. Do not expand this cleanup into brand-language rewrites beyond documenting that public product cards omit missing-brand filler.
