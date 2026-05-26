# Story 4.11: Product Detail Composition, Content, and Recommendations

Status: ready-for-dev

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

- [ ] Task 1: Lock scope, reuse points, and anti-patterns. (AC: 1-14)
  - [ ] Treat this as direct adjustment after Stories 4.3, 4.4, and 4.9; do not roll back completed product detail/cart work.
  - [ ] Preserve `/products/[slug]` SSR route, public detail loader, SEO metadata, and existing cart store behavior.
  - [ ] Use `_bmad-output/planning-artifacts/ux-design-directions.html` Direction 02 plus Story 4.9 sharp 1px module language.
  - [ ] Do not use admin routes, `src/api/**`, fake purchasable products, raw stock internals, stock versions, R2 keys, archived admin language, or provider/internal errors in public UI.
  - [ ] Do not surface visible reviews/comments copy until a review story exists.

- [ ] Task 2: Extend public detail/page data only where needed. (AC: 6-12, 14)
  - [ ] Confirm current public detail DTO has enough variant `optionValues` to group options by category and resolve selected variant from selected option values.
  - [ ] If needed, extend public detail DTO with safe fields only: variant option group order, optional color value metadata, safe max quantity, brand image URL/alt, brand product count, and related/latest product cards.
  - [ ] Related products must exclude current product and prefer same visible category or brand when available; latest fallback uses existing public catalog ordering.
  - [ ] If no real related/latest products exist, hide the module. Mock ProductCard data may be used in tests/dev examples only, not live storefront.
  - [ ] Update TypeBox schemas, route docs, service/repository tests, and OpenAPI assertions if public response fields change.

- [ ] Task 3: Build safe markdown description rendering. (AC: 10, 14)
  - [ ] Add a small product-description renderer that converts markdown with installed `showdown`.
  - [ ] Sanitize or strictly constrain converter output before using `dangerouslySetInnerHTML` or Astro `set:html`.
  - [ ] Prefer a tested allowlist sanitizer if adding a dependency is acceptable; otherwise disable raw HTML and prove script/event handler payloads render inert.
  - [ ] Keep description crawlable in SSR output and styled through Tailwind typography-compatible utility classes or local product-detail markup.
  - [ ] Add tests for headings, lists, links, paragraphs, and malicious markdown/HTML.

- [ ] Task 4: Recompose product detail top module. (AC: 1-5, 9, 14)
  - [ ] Update `ProductDetailPage.tsx` to use high-level modules: product details, optional brand details, other products, hidden review placeholder.
  - [ ] Product details module top row uses responsive grid: desktop `minmax(0,40%) minmax(0,60%)` or equivalent, mobile one column.
  - [ ] Product name is first visible item in details/CTA.
  - [ ] Keep price and availability visible near variant/quantity controls.
  - [ ] Rating/review block is hidden with no customer-facing promise.
  - [ ] CTA row uses shared `Button`: wide `Buy`, smaller add-to-cart, smaller share. `Buy` should use current honest app path; if checkout route is not ready, route to cart/next available step or show honest disabled reason.

- [ ] Task 5: Update gallery with square image and thumbnail carousel. (AC: 3-4, 14)
  - [ ] Main frame stays square with stable dimensions and no distortion.
  - [ ] Use `object-contain` when full product visibility matters; use existing approved object treatment only if it better matches Direction 02 without cropping important content.
  - [ ] Thumbnail carousel sits below main image with previous/next arrow controls on the side.
  - [ ] Hide carousel when `gallery.length <= 1`.
  - [ ] Keep alt text customer-safe and preserve keyboard/focus-visible behavior.

- [ ] Task 6: Replace flat variant selector with dynamic option groups. (AC: 6-8, 14)
  - [ ] Derive groups from variant option category names and render each category in order.
  - [ ] Use wrapping selectable chips similar to `ProductCatalogFilters`, but without checkboxes.
  - [ ] Highlight selected value and keep keyboard selection accessible.
  - [ ] Resolve selected variant after option changes. If combination is unavailable or missing, show safe unavailable text and block Buy/add-to-cart.
  - [ ] Color-like groups render square swatch affordance with text label. Detect `color`, `colour`, or future normalized metadata if present; fallback to text-only chip when color value cannot be safely mapped.

- [ ] Task 7: Add availability and quantity controls. (AC: 7-9, 14)
  - [ ] Availability updates when selected variant changes.
  - [ ] Quantity control uses minus button, numeric input, and plus button.
  - [ ] Clamp to min 1 and maximum from safe variant availability/cart rules; never expose internal stock fields unless DTO explicitly provides customer-safe available count.
  - [ ] Disable or explain controls for unavailable variants.
  - [ ] Ensure input changes preserve prior valid quantity on invalid values.

- [ ] Task 8: Add optional brand module. (AC: 11, 14)
  - [ ] Show brand module only when product has brand data.
  - [ ] Render optional brand image on left, brand name on top, total product count below.
  - [ ] Keep copy as brand/catalog context only; no seller/store/merchant implications.
  - [ ] Hide cleanly when no brand exists.

- [ ] Task 9: Add other-products module. (AC: 12, 14)
  - [ ] Reuse `ProductCard` or current product-card-compatible section component.
  - [ ] Prefer related products by same visible category or brand, excluding current product.
  - [ ] Fall back to latest published products excluding current product.
  - [ ] Add `View more` link to the relevant category/brand/products route when a real filter target exists.
  - [ ] Hide the module when no real product card data is available.

- [ ] Task 10: Tests and QA. (AC: 1-14)
  - [ ] Update product detail UI tests for 40/60 desktop classes, mobile stack classes, module order, carousel hide/show, arrow controls, variant groups, color swatches, availability updates, quantity clamp, CTA labels, brand hide/show, related/latest fallback, and hidden reviews placeholder.
  - [ ] Add markdown renderer tests, including unsafe HTML/script payloads.
  - [ ] Extend service/repository/route tests if DTO changes.
  - [ ] Run `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`.
  - [ ] Run targeted Vitest suites for product detail and any changed public catalog service/route files.
  - [ ] Run `npm run check`.
  - [ ] Manual QA at 320, 375, 390, 430, 768, 1024, and 1440px for layout, carousel, variant chips, quantity, CTA row, markdown, brand module, related products, keyboard-only flow, and text overflow.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [ ] Route auth metadata declares public/optional/required auth, roles, and rate-limit class if product detail or related/latest endpoint contracts change.
- N/A Route-level RBAC guard runs before validation or side effects for protected endpoints. This story should only use public read endpoints.
- N/A Service/controller enforces actor state before mutation. Product detail and related/latest reads are public, cart remains browser-local until checkout validation stories.
- N/A Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. Public storefront reads use published products only.
- [ ] Public/customer endpoints explicitly document why brand membership is not required if related/latest product data is added.
- N/A Denial tests cover protected auth/role/brand paths. No protected endpoint expected.
- [ ] Error response uses safe envelope codes and does not leak provider/internal inventory details if response contracts change.
- [ ] OpenAPI/endpoint catalog reflects any changed public detail or related/latest fields.

## Dev Notes

### Correct-Course Context

- Trigger: MR. JRW requested a fuller product detail composition on 2026-05-26 after Stories 4.3, 4.4, and 4.9 were marked done.
- Recommended path: direct adjustment through new Story 4.11. Do not reopen completed history unless owner explicitly asks.
- MVP impact: no MVP reduction. This improves product confidence before checkout validation/payment work.

### Current Code Intelligence

#### READ: `src/features/product-detail/components/ProductDetailPage.tsx`

- Current state: renders header, gallery, price/availability/details card, flat variant selector, and cart action.
- What changes: remove separate hero-like header from product-detail flow if it fights requested order; make product name first in details/CTA; add high-level modules, quantity, Buy/cart/share, markdown description, optional brand and other-products modules.
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

TBD

### Debug Log References

TBD

### Completion Notes List

TBD

### File List

TBD

### Change Log

- 2026-05-26: Created ready-for-dev product detail composition correction story from MR. JRW request.
