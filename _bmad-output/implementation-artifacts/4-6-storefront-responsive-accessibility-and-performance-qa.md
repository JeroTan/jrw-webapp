# Story 4.6: Storefront Responsive, Accessibility, and Performance QA

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Prospect or Customer,
I want storefront browsing and cart UI to work across devices and assistive flows,
so that JRW shopping feels fast, readable, and trustworthy.

## Acceptance Criteria

1. Given storefront, product grid, detail, and cart are implemented, when responsive QA runs, then pages are checked at 320, 375, 390, 430, 768, 1024, and 1440px, and sticky cart/action bars do not cover content.
2. Given storefront UI renders dynamic text, when product names, prices, badges, buttons, and table/list cells are long, then text does not overflow or overlap, and layout dimensions remain stable.
3. Given accessibility QA runs, when core storefront paths are tested, then keyboard navigation works for header, filters, product cards, product detail, cart drawer, and checkout entry, and focus is visible.
4. Given automated accessibility scan is available, when scan runs on core storefront pages, then WCAG 2.2 AA contrast and form/control issues are fixed or documented as blockers, and status never relies on color alone.
5. Given reduced motion is enabled, when drawers, sheets, filters, or transitions render, then motion respects `prefers-reduced-motion`.
6. Given performance targets exist, when storefront and product detail are profiled, then usable storefront load and product detail LCP target under 2.5s p75 are met or blockers documented, and product-list images target <= 250KB and detail primary images target <= 1MB after processing.
7. Given implementation finishes, when QA summary is written, then responsive, accessibility, reduced-motion, text-overflow, and performance checks are recorded, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Task 1: Lock QA scope and preserve shipped behavior. (AC: 1-7)
  - [ ] Re-read every UPDATE file listed in Current Code Intelligence before editing; worktree is heavily dirty and includes owner/refactor changes.
  - [ ] Treat this story as a QA automation/evidence story first. Do not rebuild storefront UX, cart behavior, checkout validation, public catalog DTOs, product detail composition, or shared primitives unless QA exposes a concrete defect.
  - [ ] Cite `_bmad-output/planning-artifacts/ux-design-directions.html` Direction 01 for storefront grid/card, Direction 02 for product detail/cart drawer, Direction 03 for mobile commerce parity, and Direction 04 for checkout entry checks.
  - [ ] Preserve Storefront shell ownership: route/shell/home components compose hero content; `ProductCatalog` must not import or switch `StorefrontHero`.
  - [ ] Preserve public storefront data rules: only published public catalog data in QA fixtures; no admin/private endpoints, no raw stock internals, no R2 keys, no provider details, no missing-seller language.

- [ ] Task 2: Harden Playwright QA foundation. (AC: 1, 3-5, 7)
  - [ ] Keep existing `playwright.config.ts` webServer pattern and `tests/qa/**` location; Vitest already excludes `tests/qa/**`.
  - [ ] Add `@axe-core/playwright` as dev dependency unless a documented equivalent is chosen. Latest npm view on 2026-06-07 returned `4.11.3`.
  - [ ] Keep installed `@playwright/test` at current project version `1.60.0`; do not upgrade Playwright in this story unless install conflict forces it.
  - [ ] Add shared QA helpers under `tests/qa/` for required viewport widths, `expectNoHorizontalOverflow`, Astro island hydration wait, reduced-motion emulation, axe scan setup, console-error capture, and long-text fixture generation.
  - [ ] Do not create snapshot baselines unless stable CI/OS baseline is agreed. Prefer assertions and screenshot attachments over noisy `toHaveScreenshot()` goldens.
  - [ ] Add package scripts such as `qa:storefront`, `qa:accessibility`, and/or expand current `qa:checkout-viewports`; keep existing `qa:checkout-viewports` working.

- [ ] Task 3: Add responsive and overflow coverage for storefront routes. (AC: 1-2, 7)
  - [ ] Add Playwright coverage for `/`, `/products`, `/categories`, one category route when fixture allows, one brand route when fixture allows, one product detail route, `/cart`, and `/checkout`.
  - [ ] Use route mocks or seeded local data where needed so QA is deterministic and does not depend on remote D1/R2 contents.
  - [ ] Check widths exactly: `320`, `375`, `390`, `430`, `768`, `1024`, `1440`.
  - [ ] Assert no horizontal overflow at document level and no visible clipping/overlap for product names, metadata, price tags, availability labels, cart quantity badge, checkout step labels, buttons, filter controls, and cart line rows.
  - [ ] Assert sticky/mobile cart or action areas never cover checkout/cart content, validation messages, remove/edit controls, or pagination.
  - [ ] Exercise long strings: product name, brand/category, price label, availability text, variant label, checkout message, and cart line reason.
  - [ ] If any route lacks real fixture data, document route/data blocker in the QA report rather than faking live product claims in app code.

- [ ] Task 4: Add keyboard, focus, and reduced-motion coverage. (AC: 3, 5, 7)
  - [ ] Keyboard path: header logo/nav/search/cart/account/menu, mobile menu, product filters, product links/cards, product detail variant chips, quantity controls, Buy/add-cart/share, cart drawer close/remove/quantity, cart validation, `/checkout` blocked/details entry.
  - [ ] Assert focus-visible treatment uses cobalt 2px outline with 2px offset for shared `Button`, `ButtonLink`, product links, filter controls, quantity controls, drawer close, and checkout buttons.
  - [ ] Assert `CartDrawer` traps focus while open, Escape closes it, and focus returns to cart trigger.
  - [ ] Use `page.emulateMedia({ reducedMotion: "reduce" })` in at least one storefront/cart/detail path and assert UI remains usable without relying on animation completion.
  - [ ] Add manual screen-reader spot-check items to the QA report for status labels, drawer dialog labels, checkout validation status, and product unavailable text.

- [ ] Task 5: Add automated accessibility scan coverage. (AC: 4, 7)
  - [ ] Add `tests/qa/accessibility.spec.ts` or shared accessibility checks inside storefront QA specs using `AxeBuilder`.
  - [ ] Scan core states after UI reaches target state: home, product grid with filters visible, product detail with variants, cart drawer open, cart page, blocked checkout validation state, and checkout details form.
  - [ ] Use WCAG A/AA axe tags matching Playwright docs unless a stricter axe config is documented.
  - [ ] Fail on unexpected violations. If a violation cannot be fixed in this story, document exact rule, selector, page, user impact, and follow-up owner in `_bmad-output/implementation-artifacts/4-6-storefront-qa-report.md`.
  - [ ] Keep manual accessibility note: automated axe does not prove full WCAG compliance; keyboard/focus/screen-reader checks remain required.

- [ ] Task 6: Add storefront performance evidence. (AC: 6-7)
  - [ ] Add documented Lighthouse or WebPageTest evidence for `/` and one product detail route. If using Lighthouse CLI, latest npm view on 2026-06-07 returned `13.3.0`; adding it as dev dependency is optional if `npx lighthouse` is documented.
  - [ ] Measure mobile-like profile where possible and record command, URL, date, environment, and result path.
  - [ ] Record whether initial storefront usable load target under 2.5s p75 and product detail LCP under 2.5s p75 are met, blocked, or not yet measurable in local lab.
  - [ ] Check rendered product-list image candidates target <= 250KB and detail primary image target <= 1MB after processing where assets are present. If image URLs are mocked or remote, record blocker.
  - [ ] Do not optimize images by changing public data contracts in this story unless QA finds a small, localized image attribute/size defect.

- [ ] Task 7: Write QA evidence report. (AC: 1-7)
  - [ ] Create `_bmad-output/implementation-artifacts/4-6-storefront-qa-report.md`.
  - [ ] Include viewport matrix with route, width, pass/fail/blocker, and screenshot/report artifact references where available.
  - [ ] Include accessibility matrix with axe results, keyboard result, focus trap/restore, contrast/status text, reduced-motion result, and screen-reader spot-check note.
  - [ ] Include performance matrix with Lighthouse/WebPageTest command, target, observed result or blocker, image-size evidence, and next action.
  - [ ] Include "Fixes Applied" section for defects found during QA. Reference files and tests.
  - [ ] Include "Accepted Blockers" only when implementation cannot fix without future story scope; be specific and honest.

- [ ] Task 8: Run validation gates. (AC: 1-7)
  - [ ] Run `npm run check`.
  - [ ] Run targeted Vitest suites touched by fixes, likely:
    - `npx vitest run src/features/storefront-shell/storefront-shell-ui.test.tsx`
    - `npx vitest run src/features/product-catalog/components/product-catalog-ui.test.tsx`
    - `npx vitest run src/features/product-detail/components/product-detail-ui.test.tsx src/features/product-detail/lib/renderProductDescription.test.ts src/features/product-detail/lib/variant-options.test.ts`
    - `npx vitest run src/features/cart-checkout/components/cart-ui.test.tsx src/features/cart-checkout/store.test.ts`
  - [ ] Run `npm run qa:checkout-viewports` to preserve Story 4.5 automation.
  - [ ] Run new storefront/accessibility/performance QA scripts added by this story.
  - [ ] Run styling guard: `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`.
  - [ ] Run `npm run build-test` if targeted gates pass and no local-only blocker appears.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- N/A Route auth metadata declares public/optional/required auth, roles, and rate-limit class. This story should not add or change endpoints.
- N/A Route-level RBAC guard runs before validation or side effects for protected endpoints. No protected endpoint expected.
- N/A Service/controller enforces actor state before mutation: authenticated, active, verified, approved. No server mutation expected.
- N/A Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. QA reads public published storefront only.
- N/A Public/customer endpoints explicitly document why brand membership is not required. No endpoint contract change expected.
- N/A Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable. No protected actor path expected.
- N/A Error response uses safe envelope codes and does not leak provider/internal authorization details. No endpoint change expected.
- N/A OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes. No endpoint change expected.

## Dev Notes

### Epic Context

- Epic 4 goal: Prospects browse JRW storefront, inspect products, understand availability, and Customers manage cart before checkout.
- Story 4.6 is the QA and evidence story after storefront shell, product grid, product detail, cart, and checkout-entry validation work.
- Story 4.7 remains backlog and may extend primitives later. Do not pull primitive expansion scope into 4.6 unless QA proves a small shared primitive fix is required.
- Story 4.11 is currently `review` and product detail source already includes composition changes. Preserve its modules and do not roll them back.

### Previous Story Intelligence

- Story 4.5 added `@playwright/test`, `playwright.config.ts`, `qa:install-browsers`, `qa:checkout-viewports`, and `tests/qa/checkout-validation-viewports.spec.ts`.
- Story 4.5 Playwright pattern:
  - `playwright.config.ts` starts `npm run dev -- --host 127.0.0.1 --port 4321`.
  - `baseURL` is `http://127.0.0.1:4321`.
  - `tests/qa` is isolated from Vitest through `vitest.config.ts`.
  - Existing spec seeds `localStorage`, mocks public product detail and checkout validation endpoints, checks reduced motion, keyboard activation, and no horizontal overflow at all required widths.
- Story 4.5 found a real direct `/checkout` hydration race. Browser QA is valuable; do not replace it with class assertions only.
- Story 4.9 requires Direction 01/02 visual fidelity and page-layout preservation.
- Story 4.10 requires every UI story to cite exact design directions and include visual/manual QA before done.
- Story 1.4 UI QA baseline selected Playwright plus `@axe-core/playwright`, required exact widths, and required manual keyboard/focus/contrast/reduced-motion/text-overflow/performance evidence.

### Git And Worktree Intelligence

- Recent commits: `b00e6ae refactor: manual removal of text because it is unnecesssary ui`, `a2e5285 refactor: super admin middleware`, `aa8c689 chore: 4-5 reviewed`, `0e00782 feat: story 4-5 implemented`, `73055cc docs: story 4-5 created`.
- Current worktree is extremely dirty across `.agents`, `_bmad-output`, migrations, package files, and many source files. Treat existing modifications as owner/refactor changes.
- Edit smallest necessary sections. Do not normalize, revert, or reformat unrelated files.

### Current Code Intelligence

#### READ/UPDATE: `package.json` and `package-lock.json`

- Current state: Playwright exists as dev dependency `@playwright/test@^1.60.0`; scripts include `qa:install-browsers` and `qa:checkout-viewports`. No `@axe-core/playwright` or `lighthouse` dependency is installed.
- What this story changes: add axe dependency/script and optional Lighthouse/performance script if chosen. Preserve existing scripts.
- What must be preserved: Node `>=22.12.0`, Astro/Cloudflare scripts, `build-test`, `check`, and Story 4.5 QA command.

#### READ/UPDATE: `playwright.config.ts`

- Current state: single Chromium project, `tests/qa` testDir, `webServer` dev command, trace retained on failure, line reporter, 60s test timeout.
- What this story changes: add projects/use options only if needed for required width coverage or artifacts. Existing spec already sets viewport per test, so config can stay small.
- What must be preserved: `webServer` local dev boot, `baseURL`, and trace-on-failure.

#### READ/UPDATE: `tests/qa/checkout-validation-viewports.spec.ts`

- Current state: required-width Playwright spec for cart changed-price and blocked checkout validation; mocks APIs, seeds cart state, waits for Astro islands, emulates reduced motion, asserts no horizontal overflow.
- What this story changes: reuse helper patterns; extract duplicated helpers only if it clarifies storefront specs without breaking this test.
- What must be preserved: 14 checkout viewport checks and current route mocks.

#### READ/UPDATE: `vitest.config.ts`

- Current state: excludes `tests/qa/**` from Vitest and disables file parallelism.
- What this story changes: likely none.
- What must be preserved: Playwright specs must not run in Vitest.

#### READ/UPDATE: `src/styles/_base.css` and `src/styles/_tokens.css`

- Current state: global focus-visible outline uses accent 2px offset; reduced-motion media rule reduces transitions/animations; tokens define 44px `control-md` and breakpoint tokens.
- What this story changes: only if QA finds concrete focus/reduced-motion/touch target defect.
- What must be preserved: Tailwind v4 token architecture; no one-off `jrw-*` runtime class layer.

#### READ/UPDATE: `src/features/storefront-shell/StorefrontHeader.tsx`

- Current state: responsive header with logo, nav, desktop/mobile search, cart action, sign-in, and mobile `details` menu.
- What this story changes: fix overflow/focus/touch issues only if QA proves them.
- What must be preserved: active nav logic, public navigation labels, `CartAction`, `SearchForm`, and `ButtonLink` sign-in.

#### READ/UPDATE: `src/features/storefront-shell/components/Navigation/CartAction.tsx`

- Current state: shared `Button` cart trigger, lucide `ShoppingCart`, quantity badge, `CartDrawer`.
- What this story changes: only if accessibility label, badge overflow, focus, or drawer behavior fails.
- What must be preserved: no separate `IconButton`; no custom SVG; badge quantity remains visible.

#### READ/UPDATE: `src/components/ui/Drawer.tsx`

- Current state: modal drawer with focus trap, Escape close, focus restore, responsive grid panel, accessible title/description.
- What this story changes: only if keyboard/focus QA exposes defect.
- What must be preserved: role dialog, `aria-modal`, focus trap/restore, Escape behavior.

#### READ/UPDATE: `src/components/ui/Button.tsx` and `src/components/ui/ButtonLink.tsx`

- Current state: shared button contract with 0px radius, 1px borders, focus/hover cobalt outline, `type="button"` default.
- What this story changes: only if focus, text overflow, or 44px target QA exposes defect.
- What must be preserved: cobalt 2px outline with 2px offset, no shadow/blur, default non-submit safety.

#### READ/UPDATE: `src/components/ui/ResponsiveFilterPanel.tsx`

- Current state: mobile checkbox/label toggle and desktop always-open filter body.
- What this story changes: only if keyboard/focus/touch/overflow QA exposes defect.
- What must be preserved: semantic filter region and mobile compact filter behavior.

#### READ/UPDATE: `src/features/product-catalog/ProductCatalog.tsx`

- Current state: catalog container owns category directory, filter panel, product grid, pagination, empty/error states; no hero ownership.
- What this story changes: only QA defect fixes.
- What must be preserved: `ProductCatalog` must not import `StorefrontHero`; layout and query/filter behavior stay intact.

#### READ/UPDATE: `src/features/product-catalog/components/ProductGrid.tsx`

- Current state: `ul` with top/left grid borders and responsive columns `grid-cols-1`, `xs:grid-cols-2`, `md:grid-cols-4`, `lg:grid-cols-12`.
- What this story changes: only if width/overflow tests reveal grid causes document overflow or stretched mobile.
- What must be preserved: Direction 01 grid owns top/left borders.

#### READ/UPDATE: `src/features/product-catalog/components/ProductCard.tsx`

- Current state: Direction 01 card anatomy: card owns right/bottom borders, media `h-55`, compact metadata, price tag, no rounded/shadow/blur.
- What this story changes: long text/price/status wrapping fixes only if needed.
- What must be preserved: public metadata omits missing brand; no generic ecommerce card styling.

#### READ/UPDATE: `src/features/product-detail/ProductDetailPage.tsx`

- Current state: Story 4.11 product detail modules, 40/60 desktop split, mobile stack, gallery, details panel, description, brand summary, recommendations, hidden review placeholder.
- What this story changes: only QA fixes for responsive, accessibility, overflow, reduced motion, or image sizing.
- What must be preserved: product name first in details/CTA, hidden reviews, brand module hidden when no brand, recommendations hide when no real products.

#### READ/UPDATE: `src/features/product-detail/components/**`

- Current state: gallery/carousel, variant selector, quantity control, description sanitizer, brand summary, recommendations, and tests exist.
- What this story changes: only QA defect fixes.
- What must be preserved: dynamic variants keyboard access, quantity clamp, sanitized markdown, square gallery, hidden reviews, public-safe labels.

#### READ/UPDATE: `src/features/cart-checkout/components/CartDrawer.tsx`

- Current state: opens shared Drawer, best-effort refreshes visible items, renders `CartLineItems`, `CartSummary`, and full cart link.
- What this story changes: only QA fixes for focus trap/restore, overflow, reduced motion, or drawer content scroll.
- What must be preserved: refresh is best-effort; stored cart state remains visible.

#### READ/UPDATE: `src/features/cart-checkout/components/CartSummary.tsx`

- Current state: server checkout validation button, refresh action, pending/status copy, disabled empty state.
- What this story changes: only QA fixes for button labels, overflow, focus, sticky/non-overlap.
- What must be preserved: validation before navigation; do not restore blind `/checkout` link.

#### READ/UPDATE: `src/features/cart-checkout/components/CheckoutDetailsPage.tsx` and `CheckoutFlow.tsx`

- Current state: direct `/checkout` validates cart before details; stepper uses `aria-current`; summary rail validates from cart step; details form has visible labels.
- What this story changes: only QA fixes for responsiveness, keyboard, overflow, reduced motion, or form accessibility.
- What must be preserved: direct checkout validation gate; no payment/order promises beyond placeholders.

#### READ/UPDATE: Astro route wrappers under `src/pages/**`

- Current state: storefront, product, category, brand, cart, and checkout Astro pages compose React islands/layouts.
- What this story changes: page metadata or island hydration attributes only if QA finds route-specific issue.
- What must be preserved: `StorefrontLayout`, crawlable product/category baseline, and no protected data exposure.

### Recommended New Files

- `tests/qa/storefront-responsive.spec.ts`
- `tests/qa/storefront-accessibility.spec.ts`
- `tests/qa/storefront-performance.spec.ts` or `tests/qa/storefront-performance.md` if performance is manual/lab-only
- `tests/qa/helpers/viewports.ts`
- `tests/qa/helpers/axe.ts`
- `tests/qa/helpers/overflow.ts`
- `tests/qa/helpers/storefront-fixtures.ts`
- `_bmad-output/implementation-artifacts/4-6-storefront-qa-report.md`

Optional:

- `tests/qa/artifacts/.gitkeep` only if repo tracks report output placeholders.
- `scripts/run-storefront-lighthouse.mjs` only if a script is clearer than npm command composition.

Avoid:

- New app routes solely for QA.
- New UI component library.
- Snapshot baselines without stable CI environment.
- Database migrations.
- PayMongo, order, reservation, webhook, or auth flow changes.
- Broad primitive rewrites.

### Latest Technical Information

- Playwright `webServer` config starts a local dev server before tests and pairs with `use.baseURL` for relative navigation. Current `playwright.config.ts` already follows this pattern. Source: https://playwright.dev/docs/test-webserver
- Playwright accessibility docs use `@axe-core/playwright` with `AxeBuilder`; docs warn automated accessibility tests catch only some issues, so manual checks remain required. Source: https://playwright.dev/docs/accessibility-testing
- Playwright visual comparisons use `expect(page).toHaveScreenshot()`, but rendering can vary by OS, browser, hardware, and headless settings. Do not add screenshot goldens unless environment is controlled. Source: https://playwright.dev/docs/test-snapshots
- Lighthouse LCP guidance treats 0-2.5s as fast on mobile. Story target matches this threshold. Source: https://developer.chrome.com/docs/lighthouse/performance/lighthouse-largest-contentful-paint?hl=en
- Latest npm checks on 2026-06-07:
  - `npm view @axe-core/playwright version` -> `4.11.3`
  - `npm view @playwright/test version` -> `1.60.0`
  - `npm view lighthouse version` -> `13.3.0`

### Project Context Reference

- `_bmad-output/project-context.md` is mandatory before coding.
- Important rules for this story:
  - Storefront UI uses `docs/design-by-google-stitch.md`: 0px corners, 1px borders, no shadows, no blur.
  - Use Tailwind utilities and JRW tokens in markup. Do not add `jrw-*` or feature CSS layers.
  - `Button`, `ButtonLink`, `Input`, `Select`, `Drawer`, and other primitives should be reused before new UI.
  - Storefront must be responsive-first with desktop and mobile parity.
  - Status labels include text and never rely on color alone.
  - UI done requires component class assertions, responsive/manual QA notes, or documented blocker; type checks alone are not enough.

### Testing Requirements

- Required final gates:
  - `npm run check`
  - `npm run qa:checkout-viewports`
  - new storefront Playwright/accessibility scripts
  - targeted Vitest for any touched source/test files
  - styling guard `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages`
- Strongly recommended:
  - `npm run build-test` after targeted gates pass.
- Required evidence:
  - `_bmad-output/implementation-artifacts/4-6-storefront-qa-report.md` records responsive, accessibility, reduced-motion, text-overflow, performance, image-size, fixes, blockers.

### Assumptions And Follow-Up Flags

- Assumption: Story 4.6 may fix small defects found by QA, but should not become a redesign story.
- Assumption: Performance evidence may be lab/local when production-like WebPageTest is unavailable; report must state environment and limitations.
- Assumption: If local remote D1/R2 data is unstable, Playwright route mocks are acceptable for UI QA; report must name mocked routes.
- Follow-up: Story 4.7 can absorb broader primitive extensions discovered during QA.
- Follow-up: Epic 5 checkout/payment stories must keep using these QA helpers for checkout identity, payment handoff, and receipt flows.

### References

- `_bmad-output/planning-artifacts/epics.md` - `### Story 4.6: Storefront Responsive, Accessibility, and Performance QA`
- `_bmad-output/planning-artifacts/epics.md` - UX-DR28, UX-DR30, UX-DR31, UX-DR32, UX-DR33
- `_bmad-output/planning-artifacts/prd.md` - Browser/rendering requirements, Storefront & Customer Shopping, Performance, Accessibility
- `_bmad-output/planning-artifacts/architecture.md` - Frontend Architecture, Visual System Boundaries, Requirements to Structure Mapping
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Design Direction Decision, ProductCard, ProductCatalog, ProductDetailPanel, CartDrawer, CheckoutSteps, Responsive Design & Accessibility
- `_bmad-output/planning-artifacts/ux-design-directions.html` - Directions 01, 02, 03, 04
- `_bmad-output/implementation-artifacts/1-4-ui-qa-baseline.md` - UI QA baseline and evidence template
- `_bmad-output/implementation-artifacts/4-5-availability-blocking-before-checkout.md` - Playwright checkout QA pattern and completion notes
- `_bmad-output/implementation-artifacts/4-10-future-story-ui-fidelity-gate.md` - future UI story gate
- `_bmad-output/implementation-artifacts/4-11-product-detail-composition-content-and-recommendations.md` - product detail composition to preserve

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

