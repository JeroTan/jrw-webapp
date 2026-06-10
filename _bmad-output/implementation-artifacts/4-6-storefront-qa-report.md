# Story 4.6 QA Evidence Report

Date: 2026-06-07

## Scope

- Design references: Direction 01 storefront grid/card, Direction 02 product detail/cart drawer, Direction 03 mobile commerce parity, Direction 04 checkout entry checks from `_bmad-output/planning-artifacts/ux-design-directions.html`.
- QA routes: `/`, `/products`, `/categories`, `/brands`, one live product detail route, `/cart`, `/checkout`.
- Required widths: `320`, `375`, `390`, `430`, `768`, `1024`, `1440`.
- Pass artifacts: Playwright line reporter and JSON reporter output. Snapshot goldens intentionally not created.

## Responsive Matrix

| Route or state | Widths | Result | Evidence |
| --- | --- | --- | --- |
| Home | 320, 375, 390, 430, 768, 1024, 1440 | Pass | storefront QA, 66-test run covered base routes |
| Product grid | 320, 375, 390, 430, 768, 1024, 1440 | Pass | storefront QA, 66-test run covered product grid |
| Categories index | 320, 375, 390, 430, 768, 1024, 1440 | Pass | storefront QA, 66-test run covered category index |
| Brands index | 320, 375, 390, 430, 768, 1024, 1440 | Pass | storefront QA, 66-test run covered brand index |
| Category detail live route | 320, 375, 390, 430, 768, 1024, 1440 when live link exists | Pass | dynamic route subset, 21 passed |
| Brand detail live route | 320, 375, 390, 430, 768, 1024, 1440 when live link exists | Pass | dynamic route subset, 21 passed |
| Product detail live route | 320, 375, 390, 430, 768, 1024, 1440 when live link exists | Pass | dynamic route subset, 21 passed |
| Cart with long item data | 320, 375, 390, 430, 768, 1024, 1440 | Pass | seeded cart fixture, no horizontal/text overflow |
| Checkout blocked state | 320, 375, 390, 430, 768, 1024, 1440 | Pass | mocked validation fixture, no horizontal/text overflow |
| Story 4.5 checkout regression | 320, 375, 390, 430, 768, 1024, 1440 | Pass | `npm run qa:checkout-viewports`, 14 passed |

## Accessibility Matrix

| Check | Result | Evidence |
| --- | --- | --- |
| Axe WCAG A/AA home, products, categories, brands | Pass | `npm run qa:accessibility`, 7 passed |
| Axe cart drawer and cart page | Pass | `npm run qa:accessibility`, 7 passed |
| Axe checkout blocked/details states | Pass | `npm run qa:accessibility`, 7 passed |
| Axe product detail live route | Pass | `npm run qa:accessibility`, 7 passed |
| Keyboard header/menu/cart path | Pass | cart drawer opens by keyboard, Escape closes, focus returns |
| Focus treatment | Pass | visible outline asserted on keyboard path and shared controls |
| Focus trap | Pass | cart drawer keeps focus in dialog while open |
| Reduced motion | Pass | storefront/cart path uses `page.emulateMedia({ reducedMotion: "reduce" })` and remains usable |
| Screen-reader spot check | Pass by code review | dialog labels, checkout validation status text, product availability text, and status labels include text, not color-only |

Manual note: axe automation does not prove full WCAG compliance. Keyboard, focus, status text, and screen-reader-oriented code review remain part of evidence.

## Performance Matrix

Commands:

- `npx lighthouse@13.3.0 http://127.0.0.1:4321/ --quiet --chrome-flags="--headless --no-sandbox" --max-wait-for-fcp=60000 --max-wait-for-load=90000 --output=json --output-path=_bmad-output/implementation-artifacts/4-6-lighthouse-home.json`
- `npx lighthouse@13.3.0 http://127.0.0.1:4321/products/water --quiet --chrome-flags="--headless --no-sandbox" --output=json --output-path=_bmad-output/implementation-artifacts/4-6-lighthouse-product-water.json`
- `npx playwright test tests/qa/storefront-performance.spec.ts --project=chromium --workers=1 --reporter=json`

Environment: local Astro dev server, Chromium, 390px viewport, 2026-06-07.

| Route | DOM content loaded | Load | LCP | Image evidence | Result |
| --- | ---: | ---: | ---: | --- | --- |
| `/` | 2440 ms | 2456 ms | 8280 ms | PNG 2,180,570 transfer bytes; JPG 56,584 transfer bytes | Blocked: LCP > 2.5s and PNG > 250KB list target |
| `/products/water` | 2429 ms | 2438 ms | 2416 ms | cached PNG decoded 2,180,270 bytes; cached JPG decoded 56,284 bytes | LCP pass, image size blocker remains |

| Lighthouse route | Performance | Accessibility | FCP | LCP | Transfer | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `/` | 0.57 | 0.98 | 3508 ms | 34507 ms | 6,121,930 bytes | Blocked: LCP > 2.5s |
| `/products/water` | 0.56 | 0.98 | 3915 ms | 22997 ms | 6,523,837 bytes | Blocked: LCP > 2.5s |

Image-size note: large product image URL is served from dev asset route but was not present as a repo file under `public/` or `src/`. No image optimization was applied because fixing remote/generated asset size would change data/asset pipeline scope.

## Fixes Applied

- Added storefront responsive/performance QA scripts and helpers under `tests/qa/**`.
- Added `@axe-core/playwright@4.11.3` and `qa:accessibility`.
- Forced Playwright to `workers: 1` to keep Astro/Cloudflare dev-server QA stable.
- Fixed QA-discovered contrast defect by darkening `--color-brand-accent` from `#3e96f4` to `#0969da`; white-on-accent contrast is now 5.19:1.
- Fixed QA-discovered hidden-label defect in `ResponsiveFilterPanel` by hiding the mobile-only checkbox on desktop and adding peer focus-visible styling to the visible label.
- Hardened accessibility route scans as one route per test with `domcontentloaded` navigation.
- Fixed review-discovered QA gaps by adding `QA_PORT` and `QA_SERVER_TIMEOUT_MS` Playwright config support, expanding responsive coverage to category/brand/product detail routes at every required width, enforcing 2px focus offset, scanning list/table text for overflow, using keyboard Tab for focus-visible checks, and setting a stable 1440px accessibility scan viewport.

## Accepted Blockers

- Performance: Playwright local lab measured `/` LCP at 8280 ms and Lighthouse measured `/` at 34507 ms plus `/products/water` at 22997 ms. One product PNG was 2.18 MB and page transfer exceeded 6 MB, above image targets. Asset is remote/generated relative to this repo, so follow-up should optimize public product image processing/storage.
- Full `npm run build-test`: `astro check` passed and full Vitest reached 637 passed, but two unrelated existing tests failed: `src/components/layout/admin-shell.test.tsx` expects `Owner-only`, and `src/domain/products/product.test.ts` denies a super-admin product list case. These are outside Story 4.6 storefront QA scope.

## Validation

- `npm run check` under Node 22.22.3: pass, 0 errors, 10 hints.
- `npx vitest run src/features/storefront-shell/storefront-shell-ui.test.tsx`: 7 passed.
- `npx vitest run src/features/product-catalog/components/product-catalog-ui.test.tsx`: 7 passed.
- `npx vitest run src/features/product-detail/components/product-detail-ui.test.tsx src/features/product-detail/lib/renderProductDescription.test.ts src/features/product-detail/lib/variant-options.test.ts`: 13 passed.
- `npx vitest run src/features/cart-checkout/components/cart-ui.test.tsx src/features/cart-checkout/store.test.ts`: 14 passed.
- `npx vitest run src/components/primitives.test.ts`: 19 passed.
- `npm run qa:checkout-viewports` equivalent under Node 22.22.3 with `QA_PORT=4327`: 14 passed.
- Storefront responsive/performance QA under Node 22.22.3 with `QA_PORT=4325`: 65 passed, 1 focus-test failure exposed programmatic `.focus()` as an invalid focus-visible assertion; after patch, targeted keyboard path passed.
- Dynamic category/brand/product detail responsive subset under Node 22.22.3 with `QA_PORT=4323`: 21 passed.
- `npm run qa:accessibility` equivalent under Node 22.22.3 with `QA_PORT=4324`: 7 passed.
- Lighthouse home/product JSON artifacts written to `_bmad-output/implementation-artifacts/4-6-lighthouse-home.json` and `_bmad-output/implementation-artifacts/4-6-lighthouse-product-water.json`.
- Styling guard command run. Hits are `jrw-studio` slug fixtures and negative assertions; no runtime `--jrw`, `color-jrw`, `spacing-jrw`, or `font-jrw` style tokens introduced.
- `npm run build-test`: blocked by unrelated full-suite failures listed above.
