# Story 4.2: Product Grid, Category Browsing, Search, and Filters

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Prospect,
I want to browse JRW products by grid, category, search, and filters,
So that I can discover available products quickly.

## Acceptance Criteria

1. Given Prospect opens storefront product grid, when published products exist, then grid shows product image, product name, brand/category where available, price, availability text, and quick action, and unpublished/archived products are not shown.
2. Given Prospect opens `/`, `/products`, or `/categories/[slug]`, when storefront browsing surfaces render, then JRW identity, category/filter controls, cart/account access, and live product browsing remain available inside existing storefront shell without exposing admin-only data.
3. Given Prospect selects category, when category page or filter loads, then products in that category are shown, and empty category shows alternatives/recovery state.
4. Given Prospect uses search/filter controls, when criteria are applied, then grid updates using documented query params, and pagination uses default page size 20 and maximum 100.
5. Given product has no brand, when card renders, then card does not imply missing seller/store, and brandless product remains valid storefront item.
6. Given product availability is low/out/preorder, when card renders, then availability appears as text label, not color alone, and unavailable quick action is disabled or explained.
7. Given grid loads or errors, when loading/error/empty state renders, then dimensions remain stable, and customer-safe recovery message is shown.
8. Given responsive rules apply, when grid is viewed on mobile/tablet/desktop, then mobile uses 1-2 columns, tablet 2-4 columns, desktop uses 12-column system, and product card text/buttons/badges do not overflow.
9. Given implementation finishes, when QA/tests run, then checks cover product grid, category browsing, search/filter query mapping, pagination, empty/error/loading states, availability labels, quick action behavior, and responsive widths, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Task 1: Confirm scope, reuse points, and anti-patterns before coding. (AC: 1-9)
  - [ ] Confirm Story 4.1 storefront shell, Story 4.1/2026-05-23 public brand correction, and 2026-05-24 Tailwind utility migration stay intact.
  - [ ] Confirm existing public browsing pattern: Astro route wrapper with `export const prerender = false`, server fetch using `Astro.url`, and React feature UI under `src/features/**`.
  - [ ] Reuse standard API envelopes from `src/lib/api/response.ts` and OpenAPI helpers from `src/lib/typebox/api.ts`.
  - [ ] Reuse Route -> Controller -> Service -> Repository split used by `src/server/routes/public-brands.routes.ts`.
  - [ ] Do not fetch storefront data from legacy `src/api/**` or any `/api/admin/**` endpoint.
  - [ ] Do not add one-off `jrw-*` runtime classes, `src/styles/storefront/**`, `src/styles/features/**`, or new feature CSS files.
  - [ ] Do not implement product detail experience, variant selection, cart state, checkout, or customer account UI in this story.

- [ ] Task 2: Define public storefront catalog contracts and route wiring. (AC: 1-7, 9)
  - [ ] Create public catalog DTOs for product cards, category options, pagination metadata, and safe error/empty states.
  - [ ] Add canonical public catalog route(s) under `src/server/routes/**` for published product browsing and category option reads.
  - [ ] Register new public route(s) in `src/server/routes/index.ts` and pass options through `src/server/app.ts` like existing public brand routes.
  - [ ] Mark route metadata as public read-only with `rateLimitClass: "public-read"` and safe error codes only.
  - [ ] Keep default page size 20, max 100, and explicit validation for malformed query params.
  - [ ] Preserve current storefront search/navigation URL expectations: shell header already submits `q` to `/products`; page layer must map that safely to server/API search input instead of breaking existing links.

- [ ] Task 3: Implement public catalog repository/service/controller flow with existing domain logic. (AC: 1-6, 9)
  - [ ] Create public repository/service/controller modules that expose customer-safe published product browsing only.
  - [ ] Reuse `ProductRepository.list(...)` for pagination/search/category filtering where possible instead of duplicating admin list SQL; force published-only results at public boundary.
  - [ ] Resolve category slug from `/categories/[slug]` using active + visible category rules before listing products.
  - [ ] Expose active visible category options for filter rail and empty-category recovery flow.
  - [ ] Preserve brandless product validity and avoid any copy that implies missing seller/store/merchant.
  - [ ] Use existing customer-safe availability fields or inventory-derived labels; never expose raw stock counts or internal inventory/provider details.
  - [ ] Preserve newest-first ordering so current `New Arrivals` links (`/products?sort=new`) stay meaningful. If additional sort options are introduced, document and test them explicitly.
  - [ ] Do not surface category product counts as public truth from `CategoryRepository.list(...)` unless counts are filtered to published products.

- [ ] Task 4: Build `src/features/product-catalog/**` as new storefront feature module. (AC: 1-8)
  - [ ] Create product-catalog feature components for catalog page shell, filter rail/toolbar, product grid, product card, pagination area, empty/error/loading states, and small reusable helpers local to this feature.
  - [ ] Keep feature-specific UI in `src/features/product-catalog/**`; move anything generic to `src/components/**` only if it is clearly cross-feature reusable.
  - [ ] Product cards must show image module, product name, optional brand/category, price, availability text, and quick action with stable dimensions.
  - [ ] Use Tailwind utilities and JRW tokens directly in JSX/Astro markup: `bg-brand-accent`, `text-brand-muted`, `border-brand-border-strong`, `p-grid-sm`, `gap-grid-xs`, `min-h-control-md`, responsive `xs:/md:/lg:/3xl:`.
  - [ ] Use `SearchInput`, `EmptyState`, `Skeleton`, `StatusBadge`, and other existing primitives where they fit without forcing admin-specific behavior into storefront.
  - [ ] Evaluate `src/components/ui/Pagination.tsx` carefully: it is callback-driven for hydrated/admin use. For storefront SSR query links, either extend it without breaking current callers or create a feature-local link/query pagination surface under `src/features/product-catalog/**`.
  - [ ] If quick action needs a non-dead product target before Story 4.3, add only a thin placeholder route wrapper for `/products/[slug]`; do not implement gallery, variants, add-to-cart, or detailed content here.

- [ ] Task 5: Replace placeholder storefront browsing pages with real SSR catalog surfaces. (AC: 1-8)
  - [ ] Update `src/pages/index.astro` so first storefront visit shows JRW identity plus live product browsing instead of placeholder-only home cards.
  - [ ] Update `src/pages/products/index.astro` to render full published catalog browsing with search/filter/pagination query handling.
  - [ ] Update `src/pages/categories/[slug].astro` to resolve active visible category by slug and render category-scoped catalog or recovery state.
  - [ ] Keep `StorefrontLayout.astro`, header, footer, skip link, cart/account links, and public brand navigation intact.
  - [ ] Keep Astro page wrappers thin: parse `Astro.url.searchParams`, call public catalog fetch helper(s), pass serializable props into React feature components.
  - [ ] Keep storefront pages `prerender = false` for fresh query-driven server rendering, matching current public brands pattern.

- [ ] Task 6: Add focused verification for public catalog UI and routes. (AC: 1-9)
  - [ ] Add route contract tests similar to `src/server/routes/public-brands.routes.test.ts` and public-read inventory coverage in `src/server/routes/inventory.routes.test.ts`.
  - [ ] Add React static-markup UI tests for product catalog surfaces, matching local feature patterns such as `src/features/brands/components/brands-ui.test.ts`.
  - [ ] Verify public OpenAPI metadata, public auth annotations, response envelopes, and 404/validation behavior for missing category or bad query params.
  - [ ] Run `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages` and confirm no new runtime styling regressions.
  - [ ] Run `npm run check`, targeted `vitest` for new public catalog routes/UI, and `npm run build` if no blocker appears.
  - [ ] Manual QA at 320, 375, 390, 430, 768, 1024, and 1440px with keyboard-only walkthrough for search, category controls, product links, quick actions, and pagination.

### Review Findings

- Public storefront pages must not call admin APIs or legacy `src/api/**` catalog routes. Use canonical `src/server/**` public routes with standard envelopes only.
- Story 4.1 correction removed invented category labels. Use admin-created category data only; no fake taxonomy, fake products, or placeholder seller/store language.
- 2026-05-24 UI migration removed feature/storefront CSS layers. Keep styling inline with Tailwind utilities and active theme tokens; do not reintroduce deleted CSS files.
- Current `StorefrontHeader` search form submits `q` to `/products`. Preserve that public URL contract or provide backwards-compatible mapping. Do not silently switch public search URLs in a way that breaks existing navigation.
- `CategoryRepository.list(...)` linked-product counts are not published-only counts. Do not display them publicly unless public filtering is applied first.

## Dev Notes

### Epic Context

- Story 4.2 is first live public catalog story after Story 4.1 storefront shell and the 2026-05-23 public brand page/API correction.
- Epic 4 sequence matters:
  - Story 4.2 owns published product discovery, category browsing, search/filter query handling, and pagination.
  - Story 4.3 owns real product detail experience.
  - Story 4.4 owns cart add/update/remove.
  - Story 4.5 owns checkout blocking for unavailable variants.
- Epic 3 already delivered product/category/brand/variant/image/inventory foundations:
  - Story 3.3 added brand/category assignment and admin filters.
  - Story 3.4 added customer-safe price/availability summary fields.
  - Story 3.6 added public availability labels.
  - Story 3.7 gates publish readiness.
- Story 4.1 still leaves `/`, `/products`, and `/categories/[slug]` as placeholder browsing surfaces. This story converts them into real storefront discovery while preserving shell/accessibility rules from 4.1.

### Story Scope Boundaries

**IN SCOPE**

- Public published product browsing across `/`, `/products`, and `/categories/[slug]`
- Search/query-param handling, category browsing, filter controls, pagination, empty/error/loading states
- New `src/features/product-catalog/**` UI module
- Public catalog route/controller/service/repository modules under `src/server/**`
- Category option sourcing for storefront filter rail and recovery flows
- Safe quick action behavior for product cards
- Focused route/UI tests and responsive/accessibility QA

**OUT OF SCOPE**

- Full product detail experience, gallery, variants, variant selection, add-to-cart behavior, cart state, checkout, payment, or account flows
- Admin catalog mutations or any `src/server/routes/products.routes.ts` / `categories.routes.ts` contract changes unless extracting shared helpers with zero behavior change
- Client-hydrated search/filter state when GET forms + SSR page rendering are sufficient
- New feature/storefront CSS files, `jrw-*` runtime classes, or styling work in deleted CSS layers
- Legacy `src/api/**` route revival or legacy response shapes

### Existing File Analysis

#### READ: `src/pages/index.astro`

- Current state: Route wrapper renders `StorefrontHome` inside `StorefrontLayout` with placeholder browse entry points.
- What this story changes: Replace placeholder-only home surface with live product browsing while keeping JRW identity and shell framing.
- What must be preserved: Storefront layout metadata, route-level simplicity, no admin data leakage.

#### READ: `src/pages/products/index.astro`

- Current state: Placeholder page using `StorefrontPlaceholder`.
- What this story changes: Replace with actual published catalog index route.
- What must be preserved: Customer-safe copy, public route behavior, no fake data.

#### READ: `src/pages/categories/[slug].astro`

- Current state: Slug-derived placeholder title and generic category placeholder content.
- What this story changes: Resolve active visible category by slug and render live category-scoped browsing with recovery state when empty/missing.
- What must be preserved: Safe route handling for missing/invalid slug and customer-safe copy.

#### READ: `src/layouts/StorefrontLayout.astro`

- Current state: Base storefront shell with skip link, header, `main` landmark, and footer.
- What this story changes: No structural rewrite expected; browsing pages continue to render inside this shell.
- What must be preserved: Accessibility landmarks, skip link, responsive container, shared metadata behavior.

#### READ: `src/features/storefront-shell/components/StorefrontHeader.tsx`

- Current state: Public header with `New Arrivals`, `Categories`, `Brands`, `All Products`, search form posting to `/products`, cart link, account link, responsive menu.
- What this story changes: Search/category links become meaningful once product browsing is live. Header query contract (`q`) must remain compatible.
- What must be preserved: Existing nav labels, accessible labels, responsive behavior, and no auth wall before browsing.

#### READ: `src/pages/brands/index.astro` + `src/pages/brands/[id].astro`

- Current state: On-demand Astro wrappers fetch public brand data server-side and render React feature components with no admin endpoint leakage.
- What this story changes: Nothing directly, but these are the best current implementation pattern for Story 4.2 page wrappers and server fetch flow.
- What must be preserved: Public brand browsing behavior and route compatibility.

#### READ: `src/features/storefront-brands/**`

- Current state: React storefront feature module with server-fetched props, filter rail UI, empty states, and no client hydration requirement.
- What this story changes: Nothing directly, but this is the closest UI and API precedent for `src/features/product-catalog/**`.
- What must be preserved: Feature ownership boundary and customer-safe messaging style.

#### READ: `src/server/routes/public-brands.routes.ts`, `src/server/controllers/PublicBrandController.ts`, `src/server/services/PublicBrandService.ts`, `src/server/repositories/PublicBrandRepository.ts`

- Current state: Canonical public read stack with TypeBox schemas, public auth metadata, safe envelopes, and repository-owned D1 reads.
- What this story changes: Use same architecture for public product catalog instead of inventing a new path.
- What must be preserved: Route ownership of contracts only, controller envelope mapping, service `AppResult`, repository D1 read isolation.

#### READ: `src/server/repositories/ProductRepository.ts`

- Current state: Shared product list/read repository already supports pagination, `pageSize` max 100, `search`, `brandId`, `brandless`, `categoryId`, `status`, `includeArchived`, newest-first ordering, price range, primary image URL, and availability summary flags.
- What this story changes: Public catalog flow should reuse this capability where possible while constraining output to `PUBLISHED` products only.
- What must be preserved: Admin endpoint behavior, newest-first ordering, safe summary fields, and shared list normalization assumptions.

#### READ: `src/server/repositories/CategoryRepository.ts`

- Current state: Category read/list repository supports active/visible lookup and admin list metadata, including linked product counts that are not filtered to published products.
- What this story changes: Reuse slug lookup and active/visible category discovery for storefront, but treat linked counts carefully.
- What must be preserved: Admin category behavior and no false public product count claims.

#### READ: `src/domain/products/product.ts`

- Current state: `normalizeProductListQuery(...)` enforces page/pageSize/search/category/brand/status semantics with default 20 and max 100.
- What this story changes: Public route/page query parsing should align with these guardrails; add public-specific mapping instead of ad hoc query parsing.
- What must be preserved: Validation behavior and consistent list semantics.

#### READ: `src/components/ui/Pagination.tsx`

- Current state: Shared pagination primitive is callback-driven for interactive/hydrated usage.
- What this story changes: Storefront SSR query navigation may need link/query-driven pagination instead of callback-only buttons.
- What must be preserved: Existing admin caller API if this component is extended. Do not break current admin surfaces.

#### READ: `src/styles/global.css`, `src/styles/_colors.css`, `src/styles/_tokens.css`, `src/styles/_base.css`

- Current state: Only active global styling sources. Tailwind v4 theme tokens define JRW colors, spacing, breakpoints, and base rules.
- What this story changes: Browsing UI must consume these tokens in markup. No new feature/storefront CSS layers should be introduced.
- What must be preserved: Utility-first styling model and current theme token names.

#### READ: `src/api/routes/CatalogRoutes.ts`

- Current state: Legacy catalog route scaffold with old grouping and legacy response shape.
- What this story changes: Nothing. This file is a trap/reference only.
- What must be preserved: Leave it untouched unless a future migration story explicitly removes or documents it.

### Public Query Mapping Guardrails

- Public page URLs should stay human-facing and backwards-compatible:
  - `q` = storefront search text from current header/forms
  - `page` = 1-based page number
  - `pageSize` = optional page size, default 20, max 100
  - `sort=new` = preserve current `New Arrivals` shell link
  - Category scope should come from `/categories/[slug]` or an explicit category filter query when browsing `/products`
- Server/API input can map `q` to `search` internally, but public pages should not silently break existing header links.
- If additional filters are added, keep them minimal and documented. Good candidates are category scope and availability state. Avoid speculative price-range/filter sprawl unless directly required by acceptance criteria.

### Project Structure Notes

- Preferred new shared/public type location:
  - `src/domain/products/public-types.ts` for storefront product/category DTOs shared by server and feature API layer
- Preferred new feature module:
  - `src/features/product-catalog/components/ProductCatalogPage.tsx`
  - `src/features/product-catalog/components/ProductGrid.tsx`
  - `src/features/product-catalog/components/ProductCard.tsx`
  - `src/features/product-catalog/components/ProductCatalogFilters.tsx`
  - `src/features/product-catalog/components/ProductCatalogEmptyState.tsx`
  - `src/features/product-catalog/components/ProductCatalogErrorState.tsx`
  - `src/features/product-catalog/components/ProductCatalogSkeleton.tsx`
  - `src/features/product-catalog/api.ts`
  - `src/features/product-catalog/index.ts`
  - `src/features/product-catalog/types.ts`
- Preferred new server modules:
  - `src/server/routes/public-catalog.routes.ts`
  - `src/server/controllers/PublicCatalogController.ts`
  - `src/server/services/PublicCatalogService.ts`
  - `src/server/repositories/PublicCatalogRepository.ts`
  - `src/server/routes/public-catalog.routes.test.ts`
- Expected updated routes/pages:
  - `src/pages/index.astro`
  - `src/pages/products/index.astro`
  - `src/pages/categories/[slug].astro`
  - `src/server/routes/index.ts`
  - `src/server/app.ts`
- Optional only if needed to avoid dead quick-action links:
  - `src/pages/products/[slug].astro` as thin placeholder wrapper, still leaving full detail work for Story 4.3
- Avoid telling dev to revive deleted CSS files or old Story 4.1 file lists. Current live styling model is Tailwind utilities in markup plus global tokens/base imports only.

### Previous Story Intelligence

- 2026-05-22 correction moved storefront-specific UI out of `src/components/navigation/**` and into `src/features/storefront-shell/**`. Keep storefront product browsing in its own feature module, not generic components.
- 2026-05-22 review removed internal delivery/story language from public placeholder copy. Public storefront text must stay user-facing and operational.
- 2026-05-22 correction removed invented category labels from storefront shell. Use real category data only.
- 2026-05-23 correction established public brand browsing at `/brands` and `/brands/[id]` through a public API. Story 4.2 should follow same public read pattern for catalog data.
- 2026-05-23 public API refactor locked in Route -> Controller -> Service -> Repository ownership. Do not bypass that with page-to-DB reads or controller logic in route files.
- 2026-05-24 UI migration deleted `src/styles/storefront/**`, `src/styles/features/**`, and `src/styles/components/_ui.css`. Any old story note pointing at those files is stale.

### Git Intelligence Summary

- `db816af feat: 4-1 implemented` created storefront shell, placeholders, and initial story record.
- `8f5b3be chore: 4-1 reviewed` patched public copy, review findings, and tracking details. Use it as story formatting/reference precedent.
- `5602c19 feat: storefront brands` added real public brand pages and public API. This is strongest local implementation pattern for Story 4.2.
- `09aab31 rafactor: ui update` removed detached storefront/feature CSS layers and pushed runtime styling into Tailwind utility markup. Story instructions must follow post-refactor reality, not older CSS-based guidance.

### Latest Technical Information

- Repo-pinned versions from `package.json` remain source of truth for implementation:
  - Astro `^6.1.9`
  - React `^19.2.5`
  - Tailwind CSS `^4.2.4`
  - Elysia `^1.4.28`
- Official Astro docs confirm on-demand pages can opt out of prerendering with `export const prerender = false`, and `Astro.url` is a `URL` object built from `Astro.request.url`. This matches current `/brands` route wrappers and is correct for query-driven storefront pages.
- Official Tailwind docs confirm `@theme` variables are the correct v4 source for generated utility classes and responsive breakpoint variants. Current JRW tokens in `_colors.css` and `_tokens.css` are the right place to reuse colors, spacing, and `3xl` breakpoint behavior.
- No library upgrade or migration is required for this story. Goal is correct use of current repo-pinned APIs and local architecture.

### References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 4, Story 4.2)
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR32, FR33, FR34, performance page-size limit, storefront responsiveness/accessibility)
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.md` (UX-DR3, UX-DR4, navigation/filter patterns, empty/loading/recovery, responsive breakpoints, accessibility/testing strategy)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (Storefront mapping, Astro route ownership, React feature boundary, public data flow)
- Project context: `_bmad-output/project-context.md` (UI rules, Tailwind utility-first rule, feature boundaries, public/customer-safe data expectations)
- Previous story: `_bmad-output/implementation-artifacts/4-1-storefront-shell-design-tokens-and-public-navigation.md`
- Storefront React boundary spec: `_bmad-output/implementation-artifacts/spec-storefront-react-feature-boundary.md`
- UI migration note: `_bmad-output/implementation-artifacts/ui-tailwind-utility-migration-2026-05-24.md`
- Public brand correction: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-23-storefront-brand-pages.md`
- Design reference: `docs/design-by-google-stitch.md`
- Astro on-demand rendering docs: https://docs.astro.build/en/guides/on-demand-rendering/
- Astro render context docs (`Astro.url`): https://docs.astro.build/en/reference/api-reference/
- Tailwind theme variable docs: https://tailwindcss.com/docs/customizing-spacing/

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

1. Create public catalog DTOs and server route stack using public brand route architecture.
2. Reuse published product/category data through repository/service composition instead of reviving legacy catalog routes.
3. Build `src/features/product-catalog/**` with SSR-friendly filter/query UI and stable product cards.
4. Replace placeholder storefront browsing pages on `/`, `/products`, and `/categories/[slug]`.
5. Keep query mapping backwards-compatible with existing header/search/nav links.
6. Add public route tests plus static React UI tests for catalog states.
7. Run utility-regression grep, `npm run check`, targeted `vitest`, and build/QA passes.

### Debug Log References

- Story selection from `sprint-status.yaml`: `4-2-product-grid-category-browsing-search-and-filters`
- Previous story implementation record: `_bmad-output/implementation-artifacts/4-1-storefront-shell-design-tokens-and-public-navigation.md`
- Relevant commits:
  - `db816af feat: 4-1 implemented`
  - `8f5b3be chore: 4-1 reviewed`
  - `5602c19 feat: storefront brands`
  - `09aab31 rafactor: ui update`
- Official docs verified on 2026-05-24:
  - Astro on-demand rendering
  - Astro render context / `Astro.url`
  - Tailwind v4 `@theme` variables

### Completion Notes List

- Pending implementation.

### File List

- Pending implementation.

## Change Log

- 2026-05-24: Story 4.2 context engine created for published product grid browsing, category browsing, search/filter query mapping, pagination, public catalog API, Tailwind utility-first storefront UI, and focused verification.
