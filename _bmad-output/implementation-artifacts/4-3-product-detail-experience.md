# Story 4.3: Product Detail Experience

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Prospect or Customer,
I want to inspect product details, images, price, variants, and availability,
So that I can choose a valid product option confidently.

## Acceptance Criteria

1. Given published product exists, when user opens product detail, then page/panel shows product name, images, description, brand/category where available, price, variants, and availability and unpublished/archived products are not publicly accessible except documented fallback.
2. Given user selects variant, when variant is available, then selected variant, price, availability, and add-to-cart state update clearly and selected state is keyboard accessible.
3. Given selected variant is unavailable/out of stock/archived, when user selects or views it, then add-to-cart is blocked and unavailable reason appears as text.
4. Given product has multiple images, when user changes image, then gallery updates without layout shift and image alt text/customer-safe labels exist.
5. Given product has no brand, when detail renders, then UI does not imply missing seller/store and JRW remains seller of record.
6. Given desktop viewport is wide enough, when detail opens from grid, then product detail may use side panel or full page per UX and mobile uses full page/sheet behavior with focus management if overlay.
7. Given page metadata is generated, when product detail renders, then product name, description, price display, availability, primary image, and brand/category metadata where available are crawlable.
8. Given implementation finishes, when QA/tests run, then checks cover published detail, missing product, unpublished/archived handling, variant selection, unavailable state, gallery, SEO metadata, keyboard access, and mobile/desktop layout and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Task 1: Lock scope, reuse points, and anti-patterns before coding. (AC: 1-8)
  - [ ] Preserve Story 4.2 public catalog/page contracts: `/products/[slug]` remains canonical public route with `prerender = false`, safe 404/503 handling, and no admin/API self-fetch.
  - [ ] Reuse existing public stack (`public-catalog.routes.ts` -> controller -> service -> repository) instead of creating parallel public API modules.
  - [ ] Do not ship real cart mutation, checkout blocking, or new shared Drawer/SidePanel primitive here; Stories 4.4, 4.5, and 4.7 own those. Product detail may expose truthful action state only.
  - [ ] Do not use `src/api/**`, `/api/admin/**`, or legacy response shapes.
  - [ ] Do not expose raw stock counts, stock versions, R2 keys, SKU-only internal data, admin-only archive state, or provider/internal errors to public HTML/API.

- [ ] Task 2: Define public product detail DTOs and endpoint wiring. (AC: 1-3, 7-8)
  - [ ] Extend `src/domain/products/public-types.ts` with product detail/page DTOs, gallery item types, public variant option types, and customer-safe action state.
  - [ ] Add public detail route under `src/server/routes/public-catalog.routes.ts` (recommended `GET /storefront/catalog/products/:slug`) with TypeBox params/response schemas, `auth.mode = public`, `roles = ["PROSPECT"]`, `rateLimitClass = "public-read"`, and safe error codes.
  - [ ] Extend `PublicCatalogController` and `PublicCatalogService` with detail read flow that keeps `{ data, meta }` envelope and requestId propagation.
  - [ ] Keep OpenAPI docs under `Public Catalog` tag rather than inventing a new public tag unless route module split becomes necessary.

- [ ] Task 3: Implement customer-safe detail repository flow from existing catalog/image/variant sources. (AC: 1-4, 7)
  - [ ] Reuse `ProductRepository`, `PhotoRepository`, and `VariantRepository` data where possible, but wrap them in `PublicCatalogRepository` detail logic so public filters happen server-side.
  - [ ] Require `products.status = "PUBLISHED"` for public detail. Unpublished or archived products return public-safe not-found fallback; do not leak existence.
  - [ ] Filter linked categories to active + visible only before exposing them publicly. Preserve brandless product validity and do not imply missing seller/store.
  - [ ] Reuse ordered image/public asset URL logic from `PhotoRepository.listByProductId(...)` or shared helper so gallery gets `url`, `name`, `width`, `height`, `isPrimary`, and stable ordering without duplicating `/assets/products/...` rules.
  - [ ] Reuse variant records, but filter archived variants out of normal customer selection. If stale/default selection points at archived or unavailable variant, surface customer-safe unavailable reason and disabled action state instead of exposing admin/archive internals.
  - [ ] Expose future-cart-safe opaque identifiers needed by Story 4.4 (product id / variant id) in DTOs if required, but never render raw ids in UI copy.
  - [ ] Reuse existing price formatting and availability helpers from `src/domain/products/public-catalog.ts`; avoid parallel formatting functions.

- [ ] Task 4: Build storefront product detail feature UI and page wiring. (AC: 1-6)
  - [ ] Create dedicated React feature module for detail UI (recommended `src/features/product-detail/**`) with page component, gallery, variant selector, availability/action block, and error/recovery states.
  - [ ] Update `src/pages/products/[slug].astro` to render real SSR detail content instead of `StorefrontPlaceholder`, keeping page-level redirect/status handling in Astro page.
  - [ ] Use full page as canonical baseline. Optional wide-desktop overlay/sheet enhancement is allowed only if it keeps canonical full route working and reuses existing focus-trapping primitives safely; do not invent a shared Drawer/SidePanel primitive in this story.
  - [ ] Gallery must avoid layout shift by using stable aspect-ratio containers and available image dimensions. Alt text should use image name when present and safe fallback labels when absent.
  - [ ] Variant selector must expose selected state clearly, update price/availability/action state immediately, and be keyboard accessible with radio-group-like interaction.
  - [ ] Product detail copy must stay customer-safe: show brand/category when available, omit false seller/store implications for brandless products, and avoid internal language like "story", "placeholder", "archived admin-only", or inventory internals.
  - [ ] If actual cart mutation is intentionally deferred to Story 4.4, keep primary action truthful. It may change enabled/disabled state and label, but must not pretend item was added to cart or silently route user to empty cart.

- [ ] Task 5: Extend storefront metadata and fallback handling. (AC: 1, 6-8)
  - [ ] Extend `BaseLayout.astro` and/or `StorefrontLayout.astro` to accept canonical URL, social preview image, and optional indexing directives so product detail pages can emit unique SEO metadata.
  - [ ] Set title/description/canonical/social preview from product detail data: product name, description/summary, price display, availability, primary image, brand/category when available.
  - [ ] Use request-aware absolute URLs (`Astro.url`) or a documented site origin strategy. Current `astro.config.mjs` has no `site` value, so canonical logic must not assume `Astro.site` exists.
  - [ ] Public 404/503 detail fallbacks must render safe recovery links and non-leaky metadata.

- [ ] Task 6: Add focused tests and QA for public detail behavior. (AC: 1-8)
  - [ ] Extend `src/server/routes/public-catalog.routes.test.ts` for OpenAPI docs, params, public auth metadata, published detail success, unpublished/archived 404, invalid slug/empty slug handling, and safe envelopes.
  - [ ] Extend `src/server/services/PublicCatalogService.test.ts` for public detail mapping, category visibility filtering, archived/unavailable variant behavior, ordered gallery, and error mapping.
  - [ ] Add storefront UI tests (recommended `src/features/product-detail/components/product-detail-ui.test.tsx`) covering available detail, unavailable variant text, brandless copy, missing product fallback, and gallery/variant markup stability.
  - [ ] If `Modal`/overlay enhancement is used, add focus-trap/restore coverage or targeted QA notes proving Escape, Tab loop, and return focus behavior.
  - [ ] Run `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages` to confirm no new runtime styling regressions.
  - [ ] Run targeted Vitest for public catalog/detail route + service + UI files, then `npm run check`, and `npm run build` if no blocker appears.
  - [ ] Manual QA at 320, 375, 390, 430, 768, 1024, and 1440px with keyboard-only walkthrough for product gallery, variant selection, recovery links, and any overlay focus behavior.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [ ] Route auth metadata declares public/optional/required auth, roles, and rate-limit class.
- N/A Route-level RBAC guard runs before validation or side effects for protected endpoints. Product detail endpoint is public read-only.
- N/A Service/controller enforces actor state before mutation: authenticated, active, verified, approved. Story 4.3 adds read-only public detail, not mutation.
- N/A Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. Public detail intentionally does not require membership.
- [ ] Public/customer endpoints explicitly document why brand membership is not required.
- N/A Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable. Public read endpoint has no role denial path beyond safe not-found/provider failures.
- [ ] Error response uses safe envelope codes and does not leak provider/internal authorization details.
- [ ] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes.

## Dev Notes

### Epic Context

- Story 4.3 follows Story 4.2 public catalog browsing. Grid cards and quick actions already link to `/products/[slug]`, but current route is placeholder-only.
- Epic 4 sequence still matters:
  - Story 4.2 owns public grid/category/search/pagination.
  - Story 4.3 owns real product detail SSR, gallery, variant inspection, detail metadata, and truthful action state.
  - Story 4.4 owns actual cart add/update/remove behavior.
  - Story 4.5 owns checkout blocking for unavailable variants.
  - Story 4.7 owns any missing shared storefront/cart primitives such as Drawer/SidePanel if later required.
- Epic 3 already delivered product/category/brand/variant/image/inventory foundations:
  - Story 3.4 established variant CRUD, centavo pricing, `variation_chain`, SKU uniqueness.
  - Story 3.5 established ordered product photos, public asset URLs, width/height metadata, and historical image preservation.
  - Story 3.6 established inventory state and customer-safe availability labels.
  - Story 3.7 established publish readiness rules: published products require at least one active variant, at least one image, at least one visible category assignment, and at least one in-stock or preorder variant at publish time.
- Business value: Story 4.2 lets users discover products. Story 4.3 must answer detail questions confidently before Story 4.4 introduces cart mutation.

### Previous Story Intelligence

- Story 4.2 created canonical public catalog architecture: `src/server/routes/public-catalog.routes.ts` -> `PublicCatalogController` -> `PublicCatalogService` -> `PublicCatalogRepository`, plus `src/server/loaders/PublicCatalogPageDataLoader.ts` for Astro SSR pages. Reuse this stack; do not invent a second public catalog pipeline.
- Story 4.2 review patch removed SSR self-fetch from pages. Keep that rule: Astro pages should call loaders/services directly, not HTTP-fetch their own API origin.
- Story 4.2 review patch fixed strict query validation, category recovery links, and selected-category labeling. Preserve those safe-recovery patterns when adding detail-specific fallback links and errors.
- Story 4.2 placeholder route already returns 404 for missing slug/product and 503 for missing DB binding. Detail implementation must preserve those status semantics while replacing the placeholder content with real data.

### Git Intelligence

- `228ad76` (`feat: 4-2 implemented`) added `src/domain/products/public-types.ts`, `src/domain/products/public-catalog.ts`, `src/server/loaders/PublicCatalogPageDataLoader.ts`, `src/server/routes/public-catalog.routes.ts`, `src/server/services/PublicCatalogService.ts`, `src/server/repositories/PublicCatalogRepository.ts`, `src/features/product-catalog/**`, and the current `/products/[slug].astro` placeholder route. Extend these surfaces first.
- `fe160f4` (`chore: 4-2 reviewed`) patched public catalog SSR and validation behavior. Detail story must keep same principles: no page self-fetch, strict public validation, safe 404/503 handling, customer-safe copy.
- Recent work pattern is small typed modules with targeted Vitest updates, then `npm run check`. Follow that path.

### Review Findings

- `src/pages/products/[slug].astro` is still placeholder-only. It already trims empty slug, redirects blank slugs to `/products`, and sets `Astro.response.status` from loader output. Preserve that page-level control while swapping real detail content in.
- `src/server/loaders/PublicCatalogPageDataLoader.ts` currently has `loadStorefrontProductPlaceholderPageData(...)` that only checks product existence. Replace or extend it with a real detail loader; keep safe 404/503 result typing and direct service/repository access.
- `src/server/repositories/ProductRepository.ts`
  - `findBySlug(...)` returns minimal product record and does not enforce `PUBLISHED`.
  - `findOrganization(...)` returns linked categories but does not enforce public visibility.
  - Public detail must wrap these reads in public-safe filtering instead of exposing raw repository output directly.
- `src/server/repositories/VariantRepository.ts` `listByProductId(...)` returns archived rows and admin-oriented fields such as `stock`, `stockVersion`, and raw `variation_chain`. Public detail must filter/reshape before exposure.
- `src/server/repositories/PhotoRepository.ts` already returns ordered images with `url`, `width`, `height`, `name`, `isPrimary`, and safe asset routing. Reuse it to prevent gallery reinvention and layout shift.
- `src/pages/assets/products/[...key].ts` already serves product images from R2-backed storage with long-lived public caching. Do not duplicate asset URL logic in UI code.
- `src/layouts/BaseLayout.astro` currently only emits `title` and `description`. PRD SEO requirements for canonical/social metadata are still unmet, so Story 4.3 must extend layout metadata plumbing or add a dedicated head helper.
- `src/components/ui/Modal.tsx` already traps focus, restores focus on close, and supports `aria-modal`. If a detail overlay/sheet is added, reuse or adapt this behavior. Do not ship a brand-new shared Drawer primitive here; Story 4.7 owns primitive extensions.
- `src/pages/cart/index.astro` is still placeholder-only. Story 4.3 must not fake successful add-to-cart flows or silently send users to an empty cart experience.

### Latest Technical Intelligence (2026-05-24)

- Astro official docs still support on-demand route rendering per page with `export const prerender = false`, which matches this repo’s `output: "server"` storefront pages. Use page-level SSR for `/products/[slug].astro` and keep redirects/status handling in the Astro page.
- Astro official docs also confirm `Astro.response.status` / `statusText` are page-level APIs and `Astro.redirect()` must be returned from the page itself. Keep 404/redirect behavior in page files, not child components.
- Astro layout/head guidance recommends using normal `<meta>` and `<link>` tags in shared layout/head components for canonical and Open Graph metadata. Story 4.3 is right place to add reusable storefront metadata props because `BaseLayout` currently does not emit them.
- WAI-ARIA APG radio guidance remains best-fit for variant choice UX: one selected option at a time, keyboard access, and clear checked/unavailable state. Treat variant selectors like radio groups rather than ad hoc clickable chips.
- WAI modal guidance still expects focus to move inside the dialog, stay trapped while open, Escape close, and focus to return to the invoker. If product detail uses overlay/sheet behavior at any breakpoint, these focus rules remain mandatory.
- WCAG technique H102 explicitly checks that modal focus enters the dialog, cannot escape while open, and returns to invoking control on close. Use it as QA checklist if overlay/sheet is chosen.

### Story Scope Boundaries

**IN SCOPE**

- Public product detail SSR route `/products/[slug]`
- Public detail API contract/service/repository flow
- Gallery, public variant selection, availability/action state, customer-safe recovery states
- Product detail metadata: title, description, canonical URL, social preview image and related public fields
- Keyboard accessibility and responsive detail behavior across mobile/tablet/desktop
- Public-safe filtering of published product, active visible category, public images, and customer-ready variants

**OUT OF SCOPE**

- Real cart persistence/mutation, cart count updates, cart drawer data, or checkout behavior
- Inventory reservation/release, checkout blocking, or payment flows
- Shared Drawer/SidePanel primitive creation if existing `Modal` / full-page route cannot cover current story
- Admin catalog mutations, admin image/variant editors, or product publish workflow changes
- Legacy `src/api/**` resurrection or admin endpoint reuse for public detail
- SEO site-wide sitemap work beyond product detail metadata surface
- Search/filter/pagination work already owned by Story 4.2

### Current Code Intelligence

#### READ: `src/pages/products/[slug].astro`

- Current state: SSR Astro page trims slug, redirects blank slug to `/products`, calls `loadStorefrontProductPlaceholderPageData(...)`, sets `Astro.response.status`, and renders `StorefrontPlaceholder`.
- What this story changes: Replace placeholder-only content with real product detail page data and UI while keeping page-level redirect/status control.
- What must be preserved: `export const prerender = false`, page-level redirect, safe 404/503 status mapping, and recovery links back to public catalog surfaces.

#### READ: `src/server/loaders/PublicCatalogPageDataLoader.ts`

- Current state: Owns public catalog page query parsing plus placeholder product existence loader. Avoids HTTP self-fetch by instantiating repositories/services directly.
- What this story changes: Add real detail loader logic (either new function in same file or dedicated detail loader file) that returns full detail page data with safe error states.
- What must be preserved: No SSR self-fetch, safe `PROVIDER_UNAVAILABLE` fallback when `DB` binding is missing, and small serializable page-data objects for Astro pages.

#### READ: `src/server/routes/public-catalog.routes.ts`

- Current state: Public browse endpoints only: `/storefront/catalog` and `/storefront/catalog/categories`. Routes define TypeBox query/response schemas, OpenAPI metadata, public auth metadata, and safe error responses.
- What this story changes: Add public product detail endpoint with params schema and detail response schema.
- What must be preserved: Public auth metadata, `rateLimitClass: "public-read"`, TypeBox contracts, route/controller/service separation, and `Public Catalog` OpenAPI grouping.

#### READ: `src/server/controllers/PublicCatalogController.ts`

- Current state: Maps browse/category service results to `{ data, meta }` envelopes and safe HTTP status codes.
- What this story changes: Add detail controller method only.
- What must be preserved: `requestId` propagation, `apiSuccessWithRequestId`, safe error envelope mapping via `publicErrorMessage(...)`, and no business rules in controller.

#### READ: `src/server/services/PublicCatalogService.ts`

- Current state: Normalizes public browse query, resolves visible category, builds empty states, and maps provider errors to `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, or `PROVIDER_UNAVAILABLE`.
- What this story changes: Add public detail orchestration, variant selection defaults/fallbacks, and detail-specific not-found/provider failure handling.
- What must be preserved: `AppResult` pattern, safe public errors, repository isolation, and no transport-specific logic.

#### READ: `src/server/repositories/PublicCatalogRepository.ts`

- Current state: Converts published product browse rows into product cards, resolves category options, checks product existence by slug, and builds `/assets/products/...` image URLs for grid cards.
- What this story changes: Add product detail read that joins product identity, public categories, public images, and public variants.
- What must be preserved: Published-only boundary, customer-safe availability labels, newest-first browse behavior, and shared asset URL helper behavior.

#### READ: `src/server/repositories/ProductRepository.ts`

- Current state: `list(...)` exposes published/admin list data, `findBySlug(...)` returns minimal product record, `findOrganization(...)` returns brand + linked categories, and publish readiness uses image/variant/category constraints.
- What this story changes: No direct product repository contract change required unless extracting shared helper(s); public detail can reuse or wrap existing methods.
- What must be preserved: Admin endpoint behavior, publish readiness logic, and existing query semantics.

#### READ: `src/server/repositories/VariantRepository.ts`

- Current state: Returns variants with price, stock, inventory state, preorder flags, availability label, archived status, and variation chain. `listByProductId(...)` includes archived variants.
- What this story changes: Public detail should reuse data source but filter/reshape variants for customer-safe selection.
- What must be preserved: Admin variant behavior and existing stock/inventory semantics for later cart validation stories.

#### READ: `src/server/repositories/PhotoRepository.ts`

- Current state: Returns product photos ordered by `sort_order`, with `isPrimary`, `name`, `width`, `height`, `r2Key`, and public asset `url`.
- What this story changes: Public detail should reuse this ordered gallery source rather than building a second photo query path.
- What must be preserved: Stable historical photo records, public URL generation, and image ordering semantics.

#### READ: `src/pages/assets/products/[...key].ts`

- Current state: Public asset endpoint normalizes product object keys, serves R2 objects, sets cache headers, and returns 404/503 safely.
- What this story changes: Nothing directly, but detail gallery and meta image URLs depend on this route.
- What must be preserved: Asset URL shape `/assets/products/...`, cache headers, and safe missing-storage behavior.

#### READ: `src/layouts/BaseLayout.astro` + `src/layouts/StorefrontLayout.astro`

- Current state: Layout stack only accepts `title`, `description`, and `mainAriaLabel`. No canonical, Open Graph, or index-control metadata props exist yet.
- What this story changes: Extend shared layout/head support for product-detail SEO metadata.
- What must be preserved: Shared CSS import, skip link, header/footer shell, and no duplication of storefront shell markup in page routes.

#### READ: `src/features/product-catalog/components/ProductCard.tsx`

- Current state: Product cards already link to `/products/[slug]`, show availability text, and disable unavailable quick action with customer-safe hint text.
- What this story changes: Nothing directly required, but detail route contract and availability language must stay compatible with existing card links and quick-action copy.
- What must be preserved: Existing href contract, customer-safe availability labels, and stable product card dimensions.

#### READ: `src/components/ui/Modal.tsx`

- Current state: Existing modal traps focus, restores focus on close, supports `Escape`, `aria-labelledby`, and `aria-describedby`.
- What this story changes: Optional reuse if desktop side-panel / full-screen sheet enhancement is chosen.
- What must be preserved: Focus trap behavior and return-focus semantics.

#### READ: `src/features/admin-products/components/ImageList.tsx` + `VariantList.tsx`

- Current state: Admin-only components already solved ordered gallery display, keyboard movement between image cards, variant table display, and status-badge language.
- What this story changes: Do not reuse admin UI directly, but borrow proven display/accessibility patterns where helpful.
- What must be preserved: Admin UI remains admin-only; no mutation controls or admin copy should leak into public detail.

### Public Detail Data Contract Guidance

Recommended public detail DTO fields:

- `product`: `id`, `slug`, `name`, `summary`, `description`, `priceLabel`, `availability`, optional `brand`, `categories`, optional `primaryImage`
- `gallery[]`: `id`, `src`, `alt`, `width`, `height`, `isPrimary`
- `variants[]`: opaque `id`, `name`, `priceLabel`, `availability`, `selected`, `disabled`, `unavailableReason`, `options[]`, optional `imageSrc`
- `action`: `label`, `disabled`, optional `reason`
- `metadata`: `title`, `description`, `canonicalUrl`, `imageUrl`, `availabilityText`
- `recoveryLinks`: all products, categories, maybe brand / category back-links when relevant

Rules:

- Do not expose raw `stock`, `stockVersion`, `r2Key`, internal request IDs, or provider/debug details in public DTO.
- Do not expose archived variant as normal selectable state.
- Price display should stay consistent with `formatCatalogPrice(...)` / range logic from public catalog.
- Category list should omit inactive / invisible categories even if admin/product joins still contain them.
- Gallery / image alt fallback should prefer explicit image name, then product name + position.

### Variant Selection Guidance

- Use customer-facing variant labels derived from `variationChain` and/or variant name.
- Default selected variant should prefer first active sellable variant in stable display order. If all active variants are unavailable, select first active variant and surface blocked action reason as text.
- Keyboard behavior should follow radio-group expectations: one selected option, arrow-key movement between options when implemented as custom buttons, visible selected state, unavailable options announced and blocked.
- If variant selection is rendered as native radio inputs, keep them visible or style them accessibly; do not hide semantics behind non-semantic divs.
- If variant images exist via `imageReferenceId`, future-proof mapping so gallery / variant sync can be added without refactor, but do not over-scope full media-sync logic if it is not needed for ACs.

### SEO / Metadata Guidance

- Public product detail must render core product content in SSR HTML. Do not hide product name / description / price / availability behind client-only hydration.
- Unique product title / description / canonical / social preview tags are required.
- Use primary image for Open Graph / Twitter image when present.
- Unpublished / archived public detail should return 404 and non-index-safe metadata.
- If origin / site config is unavailable, derive absolute canonical / social URLs from `Astro.url` at request time in SSR.

### Testing Guidance

Targeted Vitest commands:

```bash
npx vitest run src/server/routes/public-catalog.routes.test.ts
npx vitest run src/server/services/PublicCatalogService.test.ts
npx vitest run src/features/product-detail/components/product-detail-ui.test.tsx
```

Validation commands:

```bash
npm run check
npm run build
```

Manual QA checklist:

- 320 / 375 / 390 / 430px: gallery, title, price, variant selector, primary action, recovery links, no overflow, no sticky action overlap.
- 768 / 1024 / 1440px: desktop layout balance, wide gallery/detail composition, no stretched-mobile feel.
- Keyboard-only: tab order, selected variant state, unavailable variant announcement, focus visible, recovery links reachable.
- If overlay / sheet is used: opener focus restored on close, `Escape` closes, Tab stays inside overlay, background not reachable.
- Reduced motion: any gallery transition or overlay animation respects `prefers-reduced-motion`.

### Project Structure Notes

Recommended new feature files:

- `src/features/product-detail/components/ProductDetailPage.tsx`
- `src/features/product-detail/components/ProductGallery.tsx`
- `src/features/product-detail/components/ProductVariantSelector.tsx`
- `src/features/product-detail/components/ProductDetailErrorState.tsx`
- `src/features/product-detail/components/product-detail-ui.test.tsx`
- `src/features/product-detail/index.ts`
- `src/features/product-detail/types.ts`

Recommended server/detail additions:

- `src/server/loaders/PublicCatalogPageDataLoader.ts` (UPDATE with detail loader) or `src/server/loaders/PublicProductDetailPageDataLoader.ts` (NEW if split improves clarity)
- `src/server/routes/public-catalog.routes.ts` (UPDATE)
- `src/server/controllers/PublicCatalogController.ts` (UPDATE)
- `src/server/services/PublicCatalogService.ts` (UPDATE)
- `src/server/repositories/PublicCatalogRepository.ts` (UPDATE)
- `src/domain/products/public-types.ts` (UPDATE)
- `src/domain/products/public-catalog.ts` (UPDATE if extra public formatting/select helpers are needed)
- `src/server/routes/public-catalog.routes.test.ts` (UPDATE)
- `src/server/services/PublicCatalogService.test.ts` (UPDATE)

Expected page/layout updates:

- `src/pages/products/[slug].astro` (UPDATE — replace placeholder with real detail page)
- `src/layouts/BaseLayout.astro` and/or `src/layouts/StorefrontLayout.astro` (UPDATE — metadata props)
- Optional: `src/features/product-catalog/components/ProductCard.tsx` (UPDATE only if card copy / hints need alignment with real detail availability language; avoid unnecessary churn)

Do not modify unless no safe alternative exists:

- `src/pages/cart/index.astro` — keep placeholder honest; no fake add-to-cart success here.
- `src/server/routes/products.routes.ts`, `variants.routes.ts`, `images.routes.ts` — admin contracts should stay stable.
- `src/api/**` — deprecated path.
- Shared primitive creation for Drawer / SidePanel — Story 4.7 territory.

### References

- `_bmad-output/planning-artifacts/epics.md`
  - `## Epic 4: Product-First Storefront and Cart`
  - `### Story 4.3: Product Detail Experience`
- `_bmad-output/planning-artifacts/prd.md`
  - `### Storefront & Customer Shopping`
  - `Rendering requirements`
  - `### SEO Strategy`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `### Platform Strategy`
  - `### ProductDetailPanel`
  - `## Responsive Design & Accessibility`
  - `### Testing Strategy`
- `_bmad-output/planning-artifacts/architecture.md`
  - `### API & Communication Patterns`
  - `### Frontend Architecture`
  - `### Architectural Boundaries`
  - `### Visual System Boundaries`
  - `### Integration Points`
- `_bmad-output/project-context.md`
  - `Source Of Truth`
  - `Technology Stack & Versions`
  - `Critical Implementation Rules`
  - `UI And Design Rules`
  - `Testing And Quality`
- `_bmad-output/implementation-artifacts/4-2-product-grid-category-browsing-search-and-filters.md`
  - `### Review Findings`
  - `### Existing File Analysis`
  - `### Project Structure Notes`
- `_bmad-output/implementation-artifacts/4-1-storefront-shell-design-tokens-and-public-navigation.md`
  - `### Existing File Analysis`
  - `### Component Architecture Decisions`
- `_bmad-output/implementation-artifacts/3-9-admin-product-editor-variant-matrix-and-inventory-ui.md`
  - `### Previous Story Intelligence`
- Official docs
  - Astro on-demand rendering: [https://docs.astro.build/en/guides/on-demand-rendering/](https://docs.astro.build/en/guides/on-demand-rendering/)
  - Astro render context (`Astro.response`, `Astro.redirect`, `Astro.url`): [https://docs.astro.build/en/reference/api-reference/](https://docs.astro.build/en/reference/api-reference/)
  - Astro configuration overview (`site`, metadata guidance): [https://docs.astro.build/en/guides/configuring-astro/](https://docs.astro.build/en/guides/configuring-astro/)
  - WAI-ARIA radio group pattern: [https://www.w3.org/WAI/ARIA/apg/patterns/radio/](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)
  - WAI modal dialog example: [https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/dialog/](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/dialog/)
  - WCAG technique H102 for modal dialogs: [https://www.w3.org/WAI/WCAG21/Techniques/html/H102](https://www.w3.org/WAI/WCAG21/Techniques/html/H102)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `git log --oneline -n 8`
- `src/pages/products/[slug].astro`
- `src/server/loaders/PublicCatalogPageDataLoader.ts`
- `src/server/routes/public-catalog.routes.ts`
- `src/server/services/PublicCatalogService.ts`
- `src/server/repositories/PublicCatalogRepository.ts`
- `src/server/repositories/ProductRepository.ts`
- `src/server/repositories/VariantRepository.ts`
- `src/server/repositories/PhotoRepository.ts`
- `src/pages/assets/products/[...key].ts`
- `src/layouts/BaseLayout.astro`
- `src/layouts/StorefrontLayout.astro`
- `src/features/product-catalog/components/ProductCard.tsx`
- `src/components/ui/Modal.tsx`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Auto-selected first backlog story from sprint status: `4-3-product-detail-experience`.
- Epic 4 already marked `in-progress`, so no epic status change required.
- Story ready for dev with explicit public-detail guardrails, metadata gap callouts, and non-regression notes from 4.1 / 4.2 / 3.x catalog work.

### File List

- `_bmad-output/implementation-artifacts/4-3-product-detail-experience.md`
