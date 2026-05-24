# Story 4.9: Storefront Product Card and Detail Fidelity

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Prospect or Customer,
I want product browsing components to match JRW storefront design direction,
so that the catalog feels like the approved architectural system, not a generic ecommerce card grid.

## Acceptance Criteria

1. Given storefront product grid renders, when compared to Direction 01, then accepted page layout, header, filters, and billboard/hero structure remain intact and only product-card/detail visual anatomy changes unless explicitly approved.
2. Given product card renders with image, when viewed on mobile, tablet, or desktop, then media area keeps strict bordered module behavior, stable dimensions, object-fit treatment, and no rounded/shadow framing.
3. Given product card renders without image, when placeholder appears, then diagonal placeholder pattern and numbered/initial module style follows the HTML reference.
4. Given product metadata renders, when card is scanned, then brand, category, and availability appear as compact slash-separated utility metadata where useful and no status relies on color alone.
5. Given price and action render, when card is viewed or focused, then price is compact, action uses shared button primitive/contract, and hover/focus shows cobalt outline treatment.
6. Given product detail renders, when compared to Direction 02, then detail media, variants, price, availability, and add-to-cart affordance use the same sharp 1px module language.
7. Given existing browse behavior exists, when fidelity update is complete, then search, filters, pagination, category browsing, product links, and current card/list/table behavior remain intact.
8. Given implementation finishes, when QA/tests run, then checks cover product card anatomy, image/missing-image states, metadata, price/action, product detail visual contract, preserved layout, responsive widths, text overflow, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Task 1: Lock scope and preserve accepted storefront layout. (AC: 1, 7-8)
  - [ ] Do not remove or restructure storefront hero/billboard, header, filters, pagination, route loaders, or page metadata.
  - [ ] Do not implement cart mutation, drawer, checkout, server cart, or inventory reservation.
  - [ ] Do not change admin pages in this story.
  - [ ] Reuse Story 4.8 primitive contract. If `Button`/`IconButton` are not corrected yet, stop and implement 4.8 first.

- [ ] Task 2: Add failing product-card fidelity tests first. (AC: 1-5, 7-8)
  - [ ] Update `src/features/product-catalog/components/product-catalog-ui.test.tsx` to assert Direction 01 anatomy: `min-h-[360px]`, 220px media, diagonal placeholder, slash metadata, compact price tag, and no soft/shadow/rounded card styling.
  - [ ] Assert product cards preserve responsive grid behavior already covered: 1-2 mobile columns, tablet 4 columns, desktop 12-column spans.
  - [ ] Assert quick action link/button uses shared focus/hover outline contract from Story 4.8.
  - [ ] Assert home mode still renders current hero copy and does not render category directory or filter rail when disabled.

- [ ] Task 3: Implement Direction 01 product-card anatomy. (AC: 1-5, 7)
  - [ ] Update `src/features/product-catalog/components/ProductCard.tsx` only as needed to match the HTML card anatomy.
  - [ ] Product card must be a sharp module: 1px border or grid divider, no radius, no shadow, no blur, min height 360px.
  - [ ] Media area must stay 220px, bordered, stable, `object-cover` for images.
  - [ ] Missing image state must use the diagonal stripe pattern and centered label/module treatment from the HTML direction.
  - [ ] Metadata must be compact utility text: brand or `Brandless`, category when present, availability label.
  - [ ] Price and quick action must be compact, uppercase, token-driven, and use shared outline focus/hover behavior.

- [ ] Task 4: Add product detail Direction 02 polish without changing data flow. (AC: 6-8)
  - [ ] Update `src/features/product-detail/components/ProductDetailPage.tsx`, `ProductGallery.tsx`, and `ProductVariantSelector.tsx` only if needed for sharper module language and shared primitive contract.
  - [ ] Keep SSR route and DTO flow from Story 4.3 intact.
  - [ ] Keep cart action truthful and disabled until Story 4.4 implements cart mutation.
  - [ ] Replace ad hoc cart action button/link styling with shared `Button` where safe, preserving disabled action state.
  - [ ] Do not add drawer/sheet behavior here.

- [ ] Task 5: Preserve public catalog/data behavior. (AC: 7-8)
  - [ ] Verify `ProductGrid`, `ProductCatalogPage`, filters, pagination, category links, and error/empty states still render.
  - [ ] Do not touch public catalog routes/services/repositories unless a visual field is missing from current DTOs. If data changes are needed, keep them public-safe.
  - [ ] Do not expose raw ids, stock counts, stock versions, R2 keys, archived language, or provider/internal errors in UI copy.

- [ ] Task 6: Run validation and manual QA notes. (AC: 8)
  - [ ] Run `npx vitest run src/features/product-catalog/components/product-catalog-ui.test.tsx src/features/product-detail/components/product-detail-ui.test.tsx`.
  - [ ] Run `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`.
  - [ ] Run `npm run check`.
  - [ ] Manually verify at 320, 375, 390, 430, 768, 1024, and 1440px if dev server/browser QA is available; otherwise document blocker.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- N/A Route auth metadata declares public/optional/required auth, roles, and rate-limit class. Visual-only story unless DTO gap is found.
- N/A Route-level RBAC guard runs before validation or side effects for protected endpoints. No protected endpoint change expected.
- N/A Service/controller enforces actor state before mutation. No mutation.
- N/A Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. Public storefront reads remain public.
- [ ] Public/customer endpoints explicitly document why brand membership is not required if any public DTO/route changes are made.
- N/A Denial tests cover auth/role/brand cases. No protected endpoint change expected.
- [ ] Error response uses safe envelope codes if any public DTO/route changes are made.
- [ ] OpenAPI/endpoint catalog reflects any changed public detail/card fields if DTOs change.

## Dev Notes

### Dependencies

- Requires Story 4.8 completion first.
- Must complete before Story 4.4 cart implementation.
- Story 4.10 should use this story's ACs as template examples for future UI fidelity gate.

### Current Code Intelligence

#### READ: `src/features/product-catalog/components/ProductCard.tsx`

- Current state: card already moved closer to Direction 01 with 220px media and slash metadata, but quick action still uses border-color hover only and article has no explicit full module border/hover outline.
- What this story changes: Finish exact visual fidelity. Keep data props and `StorefrontCatalogProductCard` shape stable.
- What must be preserved: product link hrefs, image alt/source, quickAction disabled/hint behavior, brandless copy, no seller/store language.

#### READ: `src/features/product-catalog/components/ProductGrid.tsx`

- Current state: responsive grid uses 1 column, 2 at `xs`, 4 at `md`, 12-column desktop with card spans.
- What this story changes: Prefer no change unless card module needs grid divider support.
- What must be preserved: responsive columns and list semantics.

#### READ: `src/features/product-catalog/components/ProductCatalogPage.tsx`

- Current state: home/category/products hero, optional category directory/filter rail, product grid, pagination, error/empty states.
- What this story changes: No layout removal. This file should only be touched if card spacing must be framed without changing structure.
- What must be preserved: home hero/billboard and accepted layout.

#### READ: `src/features/product-detail/components/ProductDetailPage.tsx`

- Current state: real SSR detail UI from Story 4.3 with gallery, variant selector, price, availability, disabled truthful cart action.
- What this story changes: tighten module style and shared button usage. Do not create real cart behavior.
- What must be preserved: selected variant/image state, customer-safe availability, recovery links, SSR/SEO behavior.

#### READ: `src/features/product-detail/components/ProductGallery.tsx`

- Current state: stable aspect ratio frame and square thumbnails.
- What this story changes: only visual border/focus alignment if needed.
- What must be preserved: stable frame geometry and image dimensions.

#### READ: `src/features/product-detail/components/ProductVariantSelector.tsx`

- Current state: native radio inputs, selected border, status badges, price.
- What this story changes: only sharpen module/focus styling if needed.
- What must be preserved: keyboard accessibility and radio semantics.

### Technical Requirements

- Use `_bmad-output/planning-artifacts/ux-design-directions.html` Direction 01 and Direction 02 as visual source.
- Preserve current public data flow. Do not use admin routes or legacy `src/api/**`.
- Use shared primitives from `src/components/**` only where generic. Keep product-specific layout in `src/features/product-catalog/**` and `src/features/product-detail/**`.
- No raw color values unless current token cannot express the HTML direction. Prefer brand tokens.

### Testing Requirements

- Tests must prove layout-preservation and visual-contract classes. Do not rely only on screenshots.
- Existing product catalog/detail tests must remain green.
- `npm run check` must pass.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 4.9, Story 4.4 prerequisite.
- `_bmad-output/planning-artifacts/ux-design-directions.html` - Direction 01 Product Discovery Grid, Direction 02 Product Detail / Cart behavior.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Implementation fidelity gate.
- `_bmad-output/implementation-artifacts/4-3-product-detail-experience.md` - previous story intelligence and public detail implementation.
- `_bmad-output/project-context.md` - UI And Design Rules.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `src/features/product-catalog/components/ProductCard.tsx`
- `src/features/product-catalog/components/ProductGrid.tsx`
- `src/features/product-catalog/components/ProductCatalogPage.tsx`
- `src/features/product-catalog/components/product-catalog-ui.test.tsx`
- `src/features/product-detail/components/ProductDetailPage.tsx`
- `src/features/product-detail/components/ProductGallery.tsx`
- `src/features/product-detail/components/ProductVariantSelector.tsx`
- `src/features/product-detail/components/product-detail-ui.test.tsx`

### Completion Notes List

- Story context created only. No implementation performed.

### File List

- `_bmad-output/implementation-artifacts/4-9-storefront-product-card-and-detail-fidelity.md`

### Change Log

- 2026-05-24: Created ready-for-dev story context.
