# Story 4.11: Product Detail Composition, Content, and Recommendations

Status: review

<!-- Correct-course follow-up for Story 4.3 product detail refinement. -->

## Story

As a Prospect or Customer,
I want a product detail page that shows images, options, availability, quantity, brand context, and nearby products in one precise layout,
so that I can choose and act on the right product without guessing.

## Acceptance Criteria

1. Given published product detail renders, when desktop viewport is wide enough, then the first high-level product detail module uses a top row with image/gallery at about 40% width and details/CTA at about 60% width, and mobile stacks image/gallery and details/CTA at 100% width.
2. Given product detail module renders, when content is organized, then it contains three child modules: image/gallery, details/CTA, and full-width markdown description, and high-level modules use subtle brand border, `bg-brand-background` or approved surface tokens, and visible gaps.
3. Given product has a primary image, when gallery renders, then the main image sits inside a square container, remains viewable without distortion, and does not shift layout, and if multiple images exist, a thumbnail carousel appears below with side arrows and keyboard-accessible selection.
4. Given product has one or zero images, when gallery renders, then the thumbnail carousel is hidden and missing-image state follows the approved sharp module style.
5. Given details/CTA module renders, when user scans top-to-bottom, then product name is first and rating/review visuals remain hidden until review scope is implemented.
6. Given product has variant option categories, when user selects options, then variant controls render dynamic option groups in source order, wrap like catalog filter chips, omit checkboxes, and highlight selected values, and color-like groups can render square swatches with readable text fallback.
7. Given selected variant changes, when availability and quantity render, then availability updates for that variant, and quantity minus/input/plus controls clamp to min 1 and the safe maximum for the selected variant/cart rules.
8. Given selected variant is unavailable or quantity exceeds allowed maximum, when user attempts Buy or add-to-cart, then action is blocked with customer-safe text and prior valid quantity is preserved.
9. Given primary actions render, when layout has room, then `Buy` is the wide primary action around 70% of the action row, and add-to-cart and share actions use smaller shared-button controls with accessible names.
10. Given product description exists as markdown, when detail page renders, then markdown is converted to sanitized crawlable HTML, preferably through the installed `showdown` package plus an explicit sanitizer or safe HTML policy, and unsafe raw HTML/scripts do not execute.
11. Given product has brand data, when detail page renders below product details, then brand module shows optional brand image, brand name, and total product count, and when no brand exists, the brand module is hidden without missing-seller language.
12. Given related published products exist, when other-products module renders, then it reuses existing `ProductCard`-compatible product data, excludes the current product, prefers related products, and falls back to latest products, and if no real products are available, the module is hidden rather than showing fake purchasable products.
13. Given reviews/comments are out of current MVP scope, when page renders, then reviews placeholder remains hidden or developer-only, and no visible customer copy promises reviews until the review story exists.
14. Given implementation finishes, when tests/QA run, then checks cover desktop 40/60 and mobile 100% layout, gallery carousel hide/show, dynamic variants including color swatches, variant-specific availability, quantity clamping, Buy/cart/share actions, sanitized markdown, brand hide/show, related/latest fallback, hidden reviews placeholder, keyboard access, text overflow, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Lock scope, reuse points, and anti-patterns. (AC: 1-14)
  - [x] Treat this as direct adjustment after Stories 4.3, 4.4, and 4.9; do not roll back completed product detail/cart work.
  - [x] Preserve `/products/[slug]` SSR route, public detail loader, SEO metadata, and existing cart store behavior.
  - [x] Use `_bmad-output/planning-artifacts/ux-design-directions.html` Direction 02 plus Story 4.9 sharp 1px module language.
  - [x] Do not use admin routes, `src/api/**`, fake purchasable products, raw stock internals, stock versions, R2 keys, archived admin language, or provider/internal errors in public UI.
  - [x] Do not surface visible reviews/comments copy until a review story exists.

- [x] Task 2: Extend public detail/page data only where needed. (AC: 6-12, 14)
  - [x] Confirm current public detail DTO has enough variant `optionValues` to group options by category and resolve selected variant from selected option values.
  - [x] If needed, extend public detail DTO with safe fields only: variant option group order, optional color value metadata, safe max quantity, brand image URL/alt, brand product count, and related/latest product cards.
  - [x] Related products must exclude current product and prefer same visible category or brand when available; latest fallback uses existing public catalog ordering.
  - [x] If no real related/latest products exist, hide the module. Mock ProductCard data may be used in tests/dev examples only, not live storefront.
  - [x] Update TypeBox schemas, route docs, service/repository tests, and OpenAPI assertions if public response fields change.

- [x] Task 3: Build safe markdown description rendering. (AC: 10, 14)
  - [x] Create `src/features/product-detail/components/product-description/` folder if description rendering needs more than one focused file.
  - [x] Keep `ProductDescription.tsx` as high-level description renderer.
  - [x] Add `ProductDescriptionLayout.tsx` wrapper for generated markdown HTML styling so converter output does not require ad hoc classes per tag in page code.
  - [x] If description styling should be reused outside product detail, place wrapper at `src/components/layout/ProductDescriptionLayout.tsx`; otherwise keep it feature-local at `src/features/product-detail/components/product-description/ProductDescriptionLayout.tsx`.
  - [x] Do not create `src/layout/`; this repo uses `src/layouts/**` for Astro layouts and `src/components/layout/**` for shared React layout wrappers.
  - [x] Keep converter/sanitizer code in `src/features/product-detail/lib/renderProductDescription.ts`, not inside React markup.
  - [x] Keep raw markdown-to-safe-HTML conversion separate from visual layout: renderer returns safe HTML, layout owns typography, spacing, lists, links, tables, and media styling.
  - [x] Add a small product-description renderer that converts markdown with installed `showdown`.
  - [x] Sanitize or strictly constrain converter output before using `dangerouslySetInnerHTML` or Astro `set:html`.
  - [x] Prefer a tested allowlist sanitizer if adding a dependency is acceptable; otherwise disable raw HTML and prove script/event handler payloads render inert.
  - [x] Keep description crawlable in SSR output and styled through Tailwind typography-compatible utility classes or local product-detail markup.
  - [x] Add tests for headings, lists, links, paragraphs, and malicious markdown/HTML.

- [x] Task 4: Recompose product detail top module. (AC: 1-5, 9, 14)
  - [x] Update `ProductDetailPage.tsx` to use high-level modules: product details, optional brand details, other products, hidden review placeholder.
  - [x] Keep `ProductDetailPage.tsx` thin: compose modules, own selected variant/image/quantity state, and delegate UI sections to folder-local children.
  - [x] Product details module top row uses responsive grid: desktop `minmax(0,40%) minmax(0,60%)` or equivalent, mobile one column.
  - [x] Product name is first visible item in details/CTA.
  - [x] Keep price and availability visible near variant/quantity controls.
  - [x] Rating/review block is hidden with no customer-facing promise.
  - [x] Create `src/features/product-detail/components/product-actions/` folder if action row logic grows.
  - [x] Keep `ProductActions.tsx` as high-level action row orchestrator and split `BuyAction.tsx`, `AddToCartAction.tsx`, or `ShareAction.tsx` only when each action gains unique logic.
  - [x] CTA row uses shared `Button`: wide `Buy`, smaller add-to-cart, smaller share. `Buy` should use current honest app path; if checkout route is not ready, route to cart/next available step or show honest disabled reason.

- [x] Task 5: Update gallery with square image and thumbnail carousel. (AC: 3-4, 14)
  - [x] Create `src/features/product-detail/components/product-gallery/` folder for gallery composition.
  - [x] Keep `ProductGallery.tsx` as high-level gallery orchestrator inside that folder.
  - [x] Extract `ProductImage.tsx` for main square image/missing-image frame.
  - [x] Extract `ProductCarousel.tsx` for thumbnail rail and previous/next arrows.
  - [x] Main frame stays square with stable dimensions and no distortion.
  - [x] Use `object-contain` when full product visibility matters; use existing approved object treatment only if it better matches Direction 02 without cropping important content.
  - [x] Thumbnail carousel sits below main image with previous/next arrow controls on the side.
  - [x] Hide carousel when `gallery.length <= 1`.
  - [x] Keep alt text customer-safe and preserve keyboard/focus-visible behavior.

- [x] Task 6: Replace flat variant selector with dynamic option groups. (AC: 6-8, 14)
  - [x] Create `src/features/product-detail/components/product-variant-selector/` folder for variant selector composition.
  - [x] Keep `VariantSelector.tsx` as high-level variant selector orchestrator inside that folder.
  - [x] Extract `VariantWrapper.tsx` for each option-group section label, layout, and accessibility wrapper.
  - [x] Extract `VariantSelectorOption.tsx` for individual selectable chip/swatch option.
  - [x] Derive groups from variant option category names and render each category in order.
  - [x] Use wrapping selectable chips similar to `ProductCatalogFilters`, but without checkboxes.
  - [x] Highlight selected value and keep keyboard selection accessible.
  - [x] Resolve selected variant after option changes. If combination is unavailable or missing, show safe unavailable text and block Buy/add-to-cart.
  - [x] Color-like groups render square swatch affordance with text label. Detect `color`, `colour`, or future normalized metadata if present; fallback to text-only chip when color value cannot be safely mapped.

- [x] Task 7: Add availability and quantity controls. (AC: 7-9, 14)
  - [x] Create `src/features/product-detail/components/product-quantity-control/` folder when quantity logic is extracted.
  - [x] Keep `ProductQuantityControl.tsx` as high-level quantity control and split `QuantityButton.tsx` or `QuantityInput.tsx` only if behavior becomes non-trivial.
  - [x] Availability updates when selected variant changes.
  - [x] Quantity control uses minus button, numeric input, and plus button.
  - [x] Clamp to min 1 and maximum from safe variant availability/cart rules; never expose internal stock fields unless DTO explicitly provides customer-safe available count.
  - [x] Disable or explain controls for unavailable variants.
  - [x] Ensure input changes preserve prior valid quantity on invalid values.

- [x] Task 8: Add optional brand module. (AC: 11, 14)
  - [x] Create `src/features/product-detail/components/product-brand-summary/` folder.
  - [x] Keep `ProductBrandSummary.tsx` as high-level brand module.
  - [x] Extract `BrandSummaryImage.tsx` for optional brand image, missing-image treatment, alt text, and square/fit behavior.
  - [x] Extract `BrandSummaryDetails.tsx` for brand name, optional brand href, and product-count copy.
  - [x] Extract `BrandProductCount.tsx` if pluralization or loading/unknown count state needs focused logic.
  - [x] Show brand module only when product has brand data.
  - [x] Render optional brand image on left, brand name on top, total product count below.
  - [x] Brand module desktop layout uses image left and text right; mobile stacks only if needed for overflow.
  - [x] Brand image must not imply store/seller identity. It is brand/catalog context only.
  - [x] Brand product count should be customer-safe: use published public product count only, not admin total.
  - [x] If brand route exists, brand name/image can link to public brand page with accessible label. If no route/data target exists, render static summary.
  - [x] Keep copy as brand/catalog context only; no seller/store/merchant implications.
  - [x] Hide cleanly when no brand exists.

- [x] Task 9: Add other-products module. (AC: 12, 14)
  - [x] Create `src/features/product-detail/components/product-recommendations/` folder.
  - [x] Keep `ProductRecommendations.tsx` as high-level other-products module.
  - [x] Extract `RecommendationHeader.tsx` for title, source label (`Related products` / `Latest products`), and `View more` link.
  - [x] Extract `RecommendationGrid.tsx` for product-card layout and responsive module spacing.
  - [x] Extract `RecommendationViewMore.tsx` if route/link logic has category/brand/products fallback branching.
  - [x] Keep lightweight recommendation selection helper under `src/features/product-detail/lib/recommendations.ts` only for UI-safe ordering/labels; server remains source of real product data.
  - [x] Reuse `ProductCard` or current product-card-compatible section component.
  - [x] Prefer related products by same visible category or brand, excluding current product.
  - [x] Fall back to latest published products excluding current product.
  - [x] Mark which source produced the section in data or view model: `related` when category/brand matched, `latest` when fallback used.
  - [x] Limit visible cards to a small fixed count that fits mobile and desktop without a giant page tail. Use existing grid/card responsive behavior.
  - [x] Add `View more` link to the relevant category/brand/products route when a real filter target exists.
  - [x] If source is category-related, `View more` targets category when available. If source is brand-related, target brand page when public brand route exists. If fallback is latest, target products/catalog page.
  - [x] Hide the module when no real product card data is available.

- [x] Task 10: Tests and QA. (AC: 1-14)
  - [x] Update product detail UI tests for 40/60 desktop classes, mobile stack classes, module order, carousel hide/show, arrow controls, variant groups, color swatches, availability updates, quantity clamp, CTA labels, brand hide/show, related/latest fallback, and hidden reviews placeholder.
  - [x] Add markdown renderer tests, including unsafe HTML/script payloads.
  - [x] Extend service/repository/route tests if DTO changes.
  - [x] Run `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`.
  - [x] Run targeted Vitest suites for product detail and any changed public catalog service/route files.
  - [x] Run `npm run check`.
  - [x] Manual QA at 320, 375, 390, 430, 768, 1024, and 1440px for layout, carousel, variant chips, quantity, CTA row, markdown, brand module, related products, keyboard-only flow, and text overflow.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [x] Route auth metadata declares public/optional/required auth, roles, and rate-limit class if product detail or related/latest endpoint contracts change.
- N/A Route-level RBAC guard runs before validation or side effects for protected endpoints. This story should only use public read endpoints.
- N/A Service/controller enforces actor state before mutation. Product detail and related/latest reads are public, cart remains browser-local until checkout validation stories.
- N/A Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. Public storefront reads use published products only.
- [x] Public/customer endpoints explicitly document why brand membership is not required if related/latest product data is added.
- N/A Denial tests cover protected auth/role/brand paths. No protected endpoint expected.
- [x] Error response uses safe envelope codes and does not leak provider/internal inventory details if response contracts change.
- [x] OpenAPI/endpoint catalog reflects any changed public detail or related/latest fields.

## Dev Notes

### Correct-Course Context

- Trigger: MR. JRW requested a fuller product detail composition on 2026-05-26 after Stories 4.3, 4.4, and 4.9 were marked done.
- Recommended path: direct adjustment through new Story 4.11. Do not reopen completed history unless owner explicitly asks.
- MVP impact: no MVP reduction. This improves product confidence before checkout validation/payment work.

### Current Code Intelligence

#### READ: `src/features/product-detail/components/ProductDetailPage.tsx`

- Current state: renders header, gallery, price/availability/details card, flat variant selector, and cart action.
- What changes: move page/container composition to feature root if implementation churn is acceptable; remove separate hero-like header from product-detail flow if it fights requested order; make product name first in details/CTA; add high-level modules, quantity, Buy/cart/share, markdown description, optional brand and other-products modules.
- Preserve: selected variant/image state, cart integration from Story 4.4, safe recovery links, SSR detail data.

#### READ: `src/features/product-detail/components/ProductGallery.tsx`

- Current state: stable main image frame and square thumbnail grid.
- What changes: force main frame square, move thumbnails into carousel with side arrows, hide for one or zero images.
- Preserve: alt text, no layout shift, keyboard focus.

#### READ: `src/features/product-detail/components/ProductVariantSelector.tsx`

- Current state: native radio list of full variants.
- What changes: render dynamic option groups/chips derived from `optionValues`, map selection back to variant, handle color-like swatches.
- Preserve: accessible selection semantics and unavailable reasons.

#### READ: `src/features/product-catalog/components/ProductCard.tsx`

- Current state: accepted product card module for grid and likely other-products reuse.
- What changes: reuse this component or product-card-compatible props for other-products section.
- Preserve: no fake live product data, product link hrefs, compact slash metadata, sharp module styling.

### Project Structure Notes

Keep product detail work inside existing feature and public catalog boundaries.

Recommended product-detail files:

- `src/features/product-detail/ProductDetailPage.tsx` - feature page/container composition and high-level module order.
- `src/features/product-detail/components/product-gallery/ProductGallery.tsx` - high-level gallery orchestrator.
- `src/features/product-detail/components/product-gallery/ProductImage.tsx` - main square image and missing-image frame.
- `src/features/product-detail/components/product-gallery/ProductCarousel.tsx` - thumbnail carousel and side arrow controls.
- `src/features/product-detail/components/product-variant-selector/VariantSelector.tsx` - high-level variant selector orchestrator.
- `src/features/product-detail/components/product-variant-selector/VariantWrapper.tsx` - option group wrapper, label, and accessible grouping.
- `src/features/product-detail/components/product-variant-selector/VariantSelectorOption.tsx` - individual chip/swatch selection control.
- `src/features/product-detail/components/product-quantity-control/ProductQuantityControl.tsx` - minus/input/plus quantity control when extracted.
- `src/features/product-detail/components/product-description/ProductDescription.tsx` - sanitized markdown HTML rendering.
- `src/features/product-detail/components/product-description/ProductDescriptionLayout.tsx` - feature-local markdown visual wrapper when not reused elsewhere.
- `src/components/layout/ProductDescriptionLayout.tsx` - shared markdown visual wrapper only if other features need the same generated-description styling.
- `src/features/product-detail/components/product-brand-summary/ProductBrandSummary.tsx` - high-level optional brand block.
- `src/features/product-detail/components/product-brand-summary/BrandSummaryImage.tsx` - optional brand image and fallback frame.
- `src/features/product-detail/components/product-brand-summary/BrandSummaryDetails.tsx` - brand name, public brand link, and product-count placement.
- `src/features/product-detail/components/product-brand-summary/BrandProductCount.tsx` - count label/pluralization if needed.
- `src/features/product-detail/components/product-recommendations/ProductRecommendations.tsx` - high-level related/latest products section.
- `src/features/product-detail/components/product-recommendations/RecommendationHeader.tsx` - section title/source label and view-more composition.
- `src/features/product-detail/components/product-recommendations/RecommendationGrid.tsx` - `ProductCard` grid/list layout.
- `src/features/product-detail/components/product-recommendations/RecommendationViewMore.tsx` - category/brand/products link target logic if branching grows.
- `src/features/product-detail/components/product-actions/ProductActions.tsx` - `Buy`, add-to-cart, and share action row if CTA logic grows.
- `src/features/product-detail/components/ProductReviewsPlaceholder.tsx` - hidden/developer-only review placeholder only if a separate component helps tests.
- `src/features/product-detail/lib/renderProductDescription.ts` - markdown conversion and sanitization helper.
- `src/features/product-detail/lib/variant-options.ts` - option grouping, selected combination resolution, color-like swatch helpers.
- `src/features/product-detail/lib/recommendations.ts` - UI-safe recommendation source labeling/ordering helpers if needed; full algorithm remains future story.
- `src/features/product-detail/components/product-detail-ui.test.tsx` - UI and interaction coverage.
- `src/features/product-detail/lib/renderProductDescription.test.ts` - markdown safety coverage.
- `src/features/product-detail/lib/variant-options.test.ts` - variant grouping/selection coverage if helper is extracted.
- `src/features/product-detail/index.ts` - public feature export for `ProductDetailPage` and only the child modules intended for reuse.

Recommended server/data files only if DTO fields are missing:

- `src/domain/products/public-types.ts` - add safe public fields for brand summary, quantity max, option group metadata, and related/latest card data.
- `src/domain/products/public-catalog.ts` - add public-safe formatting helpers only if existing helpers cannot cover new fields.
- `src/server/repositories/PublicCatalogRepository.ts` - fetch related/latest published products and public brand summary from existing catalog/image/brand sources.
- `src/server/services/PublicCatalogService.ts` - orchestrate detail payload, selected variant defaults, and related/latest fallback.
- `src/server/controllers/PublicCatalogController.ts` - update only if public API response shape changes.
- `src/server/routes/public-catalog.routes.ts` - update TypeBox/OpenAPI schemas only if response fields change.
- `src/server/loaders/PublicCatalogPageDataLoader.ts` - keep SSR page data direct; no page self-fetch.
- `src/server/services/PublicCatalogService.test.ts` and `src/server/routes/public-catalog.routes.test.ts` - cover changed DTO and safe response contracts.

Reuse boundaries:

- `ProductDetailPage` should be the root feature container, matching `src/features/product-catalog/ProductCatalog.tsx`. Child modules stay under `components/**`.
- If `ProductDetailPage.tsx` moves from `components/` to feature root, update `src/features/product-detail/index.ts` and `src/pages/products/[slug].astro` imports in the same change. A short temporary re-export is acceptable only if it reduces churn, but final structure should not keep duplicate containers.
- Avoid god files. High-level components orchestrate; child files own focused UI pieces. If a component exceeds about one screen of mixed responsibilities, split into folder-local children before adding more branching.
- Folder names under `components/**` should be kebab-case for grouped component families, with PascalCase component files inside.
- Reuse `src/features/product-catalog/components/ProductCard.tsx` or a public export from `src/features/product-catalog/index.ts` for related/latest cards. Do not duplicate product-card markup in product detail.
- If product card reuse becomes awkward across catalog/detail, extract a shared storefront product-card module in a follow-up refactor; do not do broad feature reshuffle inside this story unless needed to avoid duplication.
- Keep generic controls in `src/components/ui/**` only when they are reusable outside product detail. Quantity control stays feature-local unless another feature needs the same behavior.
- Keep recommendation ranking simple here. Full recommendation algorithm belongs to a separate future story.

Avoid these placements:

- Do not put product-detail components under `src/components/**` unless truly generic.
- Do not add related/latest logic under admin products, legacy `src/api/**`, page-local helper files, or route-only code.
- Do not create a new public route module if existing `public-catalog` stack can safely serve the detail payload.

### Technical Requirements

- Use Tailwind v4 utilities and project brand tokens directly in JSX/Astro.
- Use shared `Button` for Buy/add-to-cart/share controls. Icon-only share needs accessible name/title.
- Quantity maximum should prefer customer-safe availability count when exposed, otherwise use existing cart quantity maximum and unavailable state.
- Do not expose raw stock count unless product owner confirms it is customer-safe for that variant.
- Markdown rendering must be safe. `showdown` conversion alone is not a sanitizer.
- Related/latest product data should come from public catalog service/repository or existing loader path, not client self-fetch to admin APIs.

### Testing Guidance

Targeted commands:

```bash
npx vitest run src/features/product-detail/components/product-detail-ui.test.tsx
npx vitest run src/server/services/PublicCatalogService.test.ts
npx vitest run src/server/routes/public-catalog.routes.test.ts
npm run check
```

Run service/route tests only when DTO/API data changes.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 4.11.
- `_bmad-output/planning-artifacts/prd.md` - FR81.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - `ProductDetailPanel`.
- `_bmad-output/planning-artifacts/architecture.md` - markdown rendering safety note.
- `_bmad-output/planning-artifacts/ux-design-directions.html` - Direction 02.
- `_bmad-output/implementation-artifacts/4-3-product-detail-experience.md` - original product detail implementation.
- `_bmad-output/implementation-artifacts/4-4-cart-add-update-remove.md` - cart store and quantity rules.
- `_bmad-output/implementation-artifacts/4-9-storefront-product-card-and-detail-fidelity.md` - product card/detail visual contract.
- `_bmad-output/project-context.md` - UI and architecture rules.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npx vitest run src/features/product-detail/components/product-detail-ui.test.tsx`
- `npx vitest run src/features/product-detail/lib/renderProductDescription.test.ts src/features/product-detail/lib/variant-options.test.ts src/server/services/PublicCatalogService.test.ts src/server/routes/public-catalog.routes.test.ts src/server/loaders/PublicCatalogPageDataLoader.test.ts src/server/repositories/PublicCatalogRepository.test.ts`
- `npx vitest run src/features/product-detail/components/product-detail-ui.test.tsx src/features/product-detail/lib/variant-options.test.ts src/features/cart-checkout/components/cart-ui.test.tsx src/features/cart-checkout/store.test.ts`
- `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`
- `npm run check`
- `npx vitest run`
- `npm exec --yes playwright -- screenshot --channel chrome --full-page --viewport-size "<width>,1000" --wait-for-selector "[data-product-detail-module=product-details]" http://127.0.0.1:4321/products/example "C:\Users\jerow\AppData\Local\Temp\jrw-4-11-qa\product-detail-<width>-full.png"`
- `npm exec --yes playwright -- screenshot --channel chrome --full-page --viewport-size "<width>,1000" --wait-for-selector "[data-product-detail-module=product-details]" http://127.0.0.1:4321/products/example "C:\Users\jerow\AppData\Local\Temp\jrw-4-11-qa\product-detail-<width>-final.png"`
- `npm exec --yes playwright -- test product-detail.interaction.spec.ts --workers=1 --reporter=line` blocked: `Cannot find package '@playwright/test' imported from F:\dev\website\jrw-webapp\product-detail.interaction.spec.ts`

### Completion Notes List

- Rebuilt product detail into sharp high-level modules: 40/60 desktop top row, mobile stack, square gallery with carousel controls, details/CTA, full-width sanitized markdown description, optional brand summary, recommendations, and hidden reviews placeholder.
- Extended public product detail data with customer-safe variant max quantities, option values, brand summary/product count, related/latest recommendation payloads, TypeBox route contracts, and public OpenAPI notes.
- Added dynamic option group selection, color swatches, missing-combination blocking copy, variant-specific availability, quantity clamp/preserve behavior, Buy-to-cart handoff, add-to-cart, and share actions using shared `Button`.
- Fixed mobile CTA wrapping after screenshot QA caught clipped button text at 320/375px.
- Fixed shared `Checkbox` prop typing collision (`size`) so `npm run check` passes.
- Verified product detail screenshots at 320, 375, 390, 430, 768, 1024, and 1440px against local dev product `/products/example`; live dev product has no brand/recommendations, so automated fixtures cover brand/recommendation show states.
- Applied MR. JRW correction pass after initial over-check: removed main image border, removed outer detail module `bg-brand-background`, switched product details/description/variant sections to `bg-brand-background` with non-strong borders, removed the availability separator, reduced price type size, fixed add-to-cart/share icon+text flex, made selected variant chips visually obvious, and showed remaining/in-cart quantity when cart already contains selected variant.
- Final QA after correction: screenshots rechecked at 320, 1024, and 1440px; targeted product/cart tests passed 19 tests; full `npx vitest run` passed 95 files / 586 tests; `npm run check` passed with 0 errors and 2 existing deprecated `returnValue` hints.

### File List

- `_bmad-output/implementation-artifacts/4-11-product-detail-composition-content-and-recommendations.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/ui/Checkbox.tsx`
- `src/domain/products/public-types.ts`
- `src/features/product-detail/ProductDetailPage.tsx`
- `src/features/product-detail/components/product-actions/ProductActions.tsx`
- `src/features/product-detail/components/product-brand-summary/BrandProductCount.tsx`
- `src/features/product-detail/components/product-brand-summary/BrandSummaryDetails.tsx`
- `src/features/product-detail/components/product-brand-summary/BrandSummaryImage.tsx`
- `src/features/product-detail/components/product-brand-summary/ProductBrandSummary.tsx`
- `src/features/product-detail/components/product-description/ProductDescription.tsx`
- `src/features/product-detail/components/product-description/ProductDescriptionLayout.tsx`
- `src/features/product-detail/components/product-detail-ui.test.tsx`
- `src/features/product-detail/components/product-gallery/ProductCarousel.tsx`
- `src/features/product-detail/components/product-gallery/ProductGallery.tsx`
- `src/features/product-detail/components/product-gallery/ProductImage.tsx`
- `src/features/product-detail/components/product-quantity-control/ProductQuantityControl.tsx`
- `src/features/product-detail/components/product-recommendations/ProductRecommendations.tsx`
- `src/features/product-detail/components/product-recommendations/RecommendationGrid.tsx`
- `src/features/product-detail/components/product-recommendations/RecommendationHeader.tsx`
- `src/features/product-detail/components/product-recommendations/RecommendationViewMore.tsx`
- `src/features/product-detail/components/product-variant-selector/VariantSelector.tsx`
- `src/features/product-detail/components/product-variant-selector/VariantSelectorOption.tsx`
- `src/features/product-detail/components/product-variant-selector/VariantWrapper.tsx`
- `src/features/product-detail/index.ts`
- `src/features/product-detail/lib/renderProductDescription.test.ts`
- `src/features/product-detail/lib/renderProductDescription.ts`
- `src/features/product-detail/lib/variant-options.test.ts`
- `src/features/product-detail/lib/variant-options.ts`
- `src/pages/products/[slug].astro`
- `src/server/loaders/PublicCatalogPageDataLoader.test.ts`
- `src/server/loaders/PublicCatalogPageDataLoader.ts`
- `src/server/repositories/PublicCatalogRepository.test.ts`
- `src/server/repositories/PublicCatalogRepository.ts`
- `src/server/routes/public-catalog.routes.test.ts`
- `src/server/routes/public-catalog.routes.ts`
- `src/server/services/PublicCatalogService.test.ts`
- `src/server/services/PublicCatalogService.ts`

### Change Log

- 2026-05-26: Created ready-for-dev product detail composition correction story from MR. JRW request.
- 2026-05-27: Implemented product detail composition, public-safe DTO additions, sanitized markdown, variant/quantity/action modules, brand/recommendation modules, tests, and responsive QA. Status moved to review.
- 2026-05-27: Applied MR. JRW correction pass for image border, container backgrounds, non-strong detail/description borders, price sizing, variant visibility, cart capacity, CTA flex, and price-detail separator removal.
