# Story 4.1: Storefront Shell, Design Tokens, and Public Navigation

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Prospect,
I want a sharp JRW storefront shell with clear navigation,
So that I can browse products without an account wall.

## Acceptance Criteria

1. Given Prospect opens storefront, when page loads, then JRW identity, category/search navigation, cart access, and account access are visible and no account sign-in is required before browsing.
2. Given design tokens are loaded, when storefront UI renders, then it uses JRW Technical Brutalist tokens: 0px radius, 1px borders, no shadows/blur, cobalt accent, Satoshi headings where available, Space Mono utility text where available.
3. Given storefront shell is responsive, when viewport is mobile, tablet, desktop, or wide desktop, then navigation remains usable and desktop does not feel like stretched mobile.
4. Given public navigation links render, when user activates logo, categories/search, cart, or account entry, then links/actions route to expected storefront/cart/account surfaces and keyboard focus state is visible.
5. Given public storefront page renders, when metadata is generated, then page has SEO-safe title/description and crawlable product/category structure baseline and no protected admin/customer data is exposed.
6. Given reduced motion is enabled, when navigation or shell interactions occur, then motion respects `prefers-reduced-motion`.
7. Given implementation finishes, when QA runs, then storefront shell is checked at 320, 375, 390, 430, 768, 1024, and 1440px and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Confirm prerequisites and scope. (AC: 1-7)
  - [x] Verify Epic 4 is `in-progress` and this is the first Epic 4 story (no prior storefront/cart work exists).
  - [x] Confirm Epics 1-3 are `done` (auth, brands, catalog foundations exist).
  - [x] Confirm existing primitives in `src/components/ui/`: Button, IconButton, Input, Textarea, Select, Checkbox, Toggle, Badge, StatusBadge, Tabs, Modal, ConfirmDialog, Toast, SearchInput, ViewToggle, Pagination.
  - [x] Confirm existing data-display primitives: `src/components/data-display/DataTable.tsx`, `ResourceCard.tsx`, `ResourceList.tsx`.
  - [x] Confirm existing feedback primitives: `src/components/feedback/Badge.tsx`, `EmptyState.tsx`, `Skeleton.tsx`, `StatusBadge.tsx`, `Toast.tsx`.
  - [x] Confirm existing layout primitives: `src/components/layout/PageToolbar.tsx`.
  - [x] Confirm existing `src/layouts/BaseLayout.astro` for shared HTML shell.
  - [x] Confirm global CSS tokens in `src/styles/global.css` — Satoshi, Space Mono, JRW colors, 0px radius, 1px borders, no shadows/blur.
  - [x] Confirm Drawer, SidePanel, SegmentedControl do NOT exist yet — these will be needed by later stories (Story 4.7).
  - [x] Confirm `src/pages/index.astro` currently shows UI baseline test page — must be replaced with real storefront.
  - [x] Do NOT implement product grid, product detail, cart, checkout, search/filter logic, or API calls — this story is shell and navigation only.
  - [x] Do NOT modify `src/server/**`, `src/domain/**`, `src/features/admin-*`, or existing API routes.

- [x] Task 2: Extract storefront layout from shared BaseLayout. (AC: 1-2, 4-5)
  - [x] Create `src/layouts/StorefrontLayout.astro` extending BaseLayout with storefront-specific shell:
    - [x] Header with JRW logo/identity link, category navigation dropdown/links, search entry point, cart icon/button, account/sign-in entry.
    - [x] Footer with basic JRW information and links (if desired for MVP).
    - [x] Slot for page content between header and footer.
  - [x] Use JRW Technical Brutalist tokens throughout: 0px radius, 1px borders, no shadows/blur, cobalt accent for interactive/focus states.
  - [x] Header and footer use 1px borders as separators (not shadows).
  - [x] Logo uses Satoshi Bold font-family for identity.
  - [x] Navigation links use Space Mono font-family.
  - [x] Metadata: SEO-safe title, description, and noindex/nofollow only if appropriate for dev/staging.
  - [x] Do NOT implement search logic or product API calls — search entry point is just a UI shell/placeholder.
  - [x] Do NOT implement full cart — cart entry point is just a link/icon button placeholder.
  - [x] Cart icon button uses `IconButton` from `src/components/ui/IconButton.tsx` with accessible label "Open cart".
  - [x] Account entry uses `IconButton` or link with accessible label "Sign in or view account".

- [x] Task 3: Replace src/pages/index.astro with real storefront shell. (AC: 1-2, 4-5)
  - [x] Update `src/pages/index.astro` to use `StorefrontLayout` instead of `BaseLayout`.
  - [x] Landing page content: hero/welcome section with JRW brand identity, tagline, and call-to-action to browse products.
  - [x] Show placeholder product category cards or category links for navigation — these will integrate with real data in Story 4.2.
  - [x] Link to `/products`, `/categories/[slug]`, `/cart`, `/account` — these pages will be implemented in later stories.
  - [x] Home page metadata: `title="JRW — Lifestyle Products"`, `description="Browse JRW lifestyle products."`.
  - [x] Do NOT hardcode product data — use static placeholder content only.

- [x] Task 4: Create responsive storefront shell styles. (AC: 3, 6-7)
  - [x] Mobile (320px-479px): stacked header with hamburger/collapsible nav, large touch targets (min 44px), sticky options considered.
  - [x] Large mobile (480px-767px): same as mobile with more room for nav items.
  - [x] Tablet (768px-1023px): horizontal nav, logo, search, cart, account all visible.
  - [x] Desktop (1024px-1439px): full horizontal layout with category nav visible, search, cart, account.
  - [x] Wide desktop (1440px+): max-width container with centered content, otherwise same as desktop.
  - [x] Navigation must not feel like stretched mobile on desktop — desktop layout has visible horizontal navigation links.
  - [x] Reduced motion: transitions/animations respect `prefers-reduced-motion` using `motion-safe:` variants or `@media (prefers-reduced-motion: no-preference)`.
  - [x] Use Tailwind CSS v4 responsive utilities and JRW token-based styling.
  - [x] Add responsive utilities in `src/styles/global.css` if needed — do NOT create separate CSS files.
  - [x] Text must not overflow buttons, nav links, badges, or cart icon area.
  - [x] Sticky header evaluated but should not cover content at any viewport.

- [x] Task 5: Accessibility and SEO baseline. (AC: 4-7)
  - [x] Skip link: "Skip to main content" as first focusable element in StorefrontLayout.
  - [x] Landmark regions: `<header role="banner">`, `<nav>` with aria-label, `<main>` with role and aria-label, `<footer>`.
  - [x] Keyboard navigation: all header links, logo, cart, account entry, category nav items are keyboard accessible with visible focus rings (cobalt).
  - [x] Focus indicator: use `focus-visible:ring-2 focus-visible:ring-jrw-cobalt` or equivalent JRW cobalt focus style.
  - [x] Touch targets: minimum 44px for navigation, cart, account, and all interactive header elements.
  - [x] Logo link has accessible label: `"JRW home"` or `"JRW lifestyle products home"`.
  - [x] Cart icon/button has accessible label: `"Open cart (X items)"` where X is count or `"Open cart"` for empty.
  - [x] Account entry has accessible label: `"Sign in"` for anonymous, `"Your account"` for authenticated.
  - [x] Category navigation is an `<nav>` with `aria-label="Categories"`.
  - [x] Search entry has `aria-label="Search products"`.
  - [x] Page title and meta description set per page.
  - [x] No protected admin/customer data exposed in source or rendered HTML.

- [x] Task 6: QA and validation. (AC: 1-7)
  - [x] Responsive QA at 320, 375, 390, 430, 768, 1024, 1440px:
    - [x] Header/navigation visible and usable.
    - [x] Logo, categories, cart, account all render.
    - [x] No text overflow in nav items, buttons, or badges.
    - [x] Desktop layout is not stretched mobile — horizontal nav visible.
    - [x] Mobile nav collapses/hamburger works.
  - [x] Accessibility QA:
    - [x] Keyboard walkthrough: Tab through skip link, logo, categories, search, cart, account — all reachable and have visible focus.
    - [x] Focus visible on all interactive elements.
    - [x] Labels: cart icon has accessible label, account entry has accessible label, category nav has aria-label.
    - [x] Reduced motion: animations/transitions disabled when `prefers-reduced-motion: reduce`.
  - [x] SEO check:
    - [x] Title and meta description set.
    - [x] No admin/customer data exposed.
  - [x] Token verification:
    - [x] JRW Technical Brutalist tokens used: 0px radius, 1px borders, no shadows/blur, cobalt accent.
    - [x] Satoshi for identity (logo/headings), Space Mono for navigation/text.
  - [x] Smoke test:
    - [x] `npm run dev` starts without errors.
    - [x] `npm run check` passes or exact blockers documented.

### Review Findings

- [x] [Review][Patch] Header imports storefront components through the global components barrel, which re-exports navigation and creates a self-import/circular dependency risk. [src/components/navigation/StorefrontHeader.astro:2]
- [x] [Review][Patch] Public placeholder pages expose internal story/epic delivery terms in user-facing copy. [src/pages/products/index.astro:12]
- [x] [Review][Patch] Story tracking still says `ready-for-dev` with empty completion record despite implementation commit `db816af`. [_bmad-output/implementation-artifacts/4-1-storefront-shell-design-tokens-and-public-navigation.md:3]

## Dev Notes

### Epic Context

- Story 4.1 is the FIRST story in Epic 4 (Product-First Storefront and Cart).
- Epic 4 covers: storefront shell, product grid, product detail, cart, availability blocking, responsive/accessibility/performance QA, and UI primitive extensions.
- Stories 4.1-4.7 must be implemented before Epic 5 (checkout/payments) because customers need to browse and add to cart before paying.
- Epic 4 depends on Epics 1-3 being `done`: auth/sessions, brands, catalog/products, inventory, and images APIs exist.
- Storefront reads public catalog data — no auth required for browsing.
- No existing storefront code exists in the repo. `src/pages/index.astro` currently shows a UI baseline test page.
- No existing cart code exists. Cart is placeholder-only in this story.

### Story Scope Boundaries

**IN SCOPE:**
- `src/layouts/StorefrontLayout.astro` -- storefront shell layout
- `src/pages/index.astro` -- storefront landing route
- `src/pages/products/index.astro`, `src/pages/categories/[slug].astro`, `src/pages/cart/index.astro`, `src/pages/account/index.astro` -- public placeholders
- `src/features/storefront-shell/**` -- React storefront shell feature components and navigation data
- `src/styles/global.css` -- Tailwind/JRW CSS import hub only
- `src/styles/_colors.css`, `_fonts.css`, `_tokens.css`, `_base.css`, `_page.css` -- global JRW style partials
- `src/styles/components/**`, `src/styles/features/**`, `src/styles/storefront/**` -- scoped style partials

**OUT OF SCOPE (do NOT implement):**
- Product grid, product cards, product detail — Story 4.2
- Search/filter logic or API calls — Story 4.2
- Cart drawer, cart state, cart API — Story 4.4
- Category pages — Story 4.2
- Account pages — Epic 1 already has auth flows, account UI not part of this story
- Product API calls or server routes
- `src/server/**`, `src/domain/**`, `src/features/admin-*` — no modifications
- Drawer, SidePanel, SegmentedControl components — Story 4.7
- Full search implementation — Story 4.2
- Real cart state or cart API integration — Story 4.4
- Product metadata/tags/JSON-LD for SEO — basic title/description only
- Performance image optimization — Story 4.6

### Existing File Analysis

#### READ: `src/layouts/BaseLayout.astro`

- Current state: Minimal HTML shell with charset, favicon, viewport, description, title, slot for content. Imports `global.css`.
- What this story changes: NOT modified directly. `StorefrontLayout.astro` extends it by wrapping content with header/footer.
- What must be preserved: Base HTML structure, CSS import, slot mechanism.

#### READ: `src/styles/global.css`

- Current state: Has full JRW Technical Brutalist token set: Satoshi/Space Mono fonts, color tokens, 0px radius, 1px border classes, spacing tokens. Already has `@theme` block with all colors and fonts.
- What this story adds: May add responsive/navigation utility classes if needed. May add `@utility` classes for storefront patterns.
- What must be preserved: All existing token definitions, Tailwind CSS v4 `@theme` block, existing component utility classes.

#### READ: `src/pages/index.astro`

- Current state: UI baseline test page showing Button, Input, StatusBadge samples. Uses BaseLayout.
- What this story changes: Replaced with real storefront landing page using StorefrontLayout.
- What must be preserved: No existing functional content to preserve — test page is scaffolding.

#### READ: `src/components/ui/Button.tsx`

- Current state: Reusable Button with variant (primary/secondary), loading state, disabled state.
- What this story reuses: For storefront action buttons.
- What must be preserved: Existing API and behavior.

#### READ: `src/components/ui/IconButton.tsx`

- Current state: Icon button with accessible label and tooltip-ready metadata.
- What this story reuses: For cart icon, account icon, hamburger menu toggle.
- What must be preserved: Existing API and behavior.

#### READ: `src/components/ui/SearchInput.tsx`

- Current state: Search input component with label and icon.
- What this story reuses: As search entry placeholder in storefront header.
- What must be preserved: Existing API. Search logic will come in Story 4.2.

### Project Structure Notes

- Expected new files:
  - `src/layouts/StorefrontLayout.astro` (NEW)
  - `src/features/storefront-shell/components/StorefrontHeader.tsx` (NEW)
  - `src/features/storefront-shell/components/StorefrontFooter.tsx` (NEW)
  - `src/features/storefront-shell/components/StorefrontHome.tsx` (NEW)
  - `src/features/storefront-shell/components/StorefrontPlaceholder.tsx` (NEW)
  - `src/features/storefront-shell/data.ts` (NEW)
  - `src/features/storefront-shell/types.ts` (NEW)
  - `src/features/storefront-shell/index.ts` (NEW)

- Expected updated files:
  - `src/pages/index.astro` (UPDATE -- replace baseline with storefront)
  - `src/pages/products/index.astro`, `src/pages/categories/[slug].astro`, `src/pages/cart/index.astro`, `src/pages/account/index.astro` (UPDATE -- public placeholders)
  - `src/styles/global.css` (UPDATE -- import hub)
  - `src/styles/_colors.css`, `_fonts.css`, `_tokens.css`, `_base.css`, `_page.css` (NEW/UPDATE -- global partials)
  - `src/styles/components/**`, `src/styles/features/**`, `src/styles/storefront/**` (NEW/UPDATE -- scoped partials)

- Do not modify:
  - `src/server/**` (no API/server changes)
  - `src/domain/**` (no domain rule changes)
  - `src/features/admin-*` (no admin feature changes)
  - `src/features/auth/**` (no auth feature changes)
  - `src/features/brands/**` (no brand feature changes)
  - `src/features/checkout/**` (not implemented yet)
  - `src/pages/admin/**` (no admin page changes)
  - `src/pages/api/**` (no API page changes)
  - `src/lib/**` (no library changes)
  - `src/utils/**` (no utility changes)
  - `src/cloudflare/**` (no Cloudflare changes)
  - `src/adapter/**` (no adapter changes)

### Component Architecture Decisions

- Storefront header should be a React feature component (`.tsx`) under `src/features/storefront-shell/**`, rendered by Astro without client hydration while no client-side interactivity is needed.
- Storefront footer is a static React feature component (`.tsx`) under `src/features/storefront-shell/**`.
- Navigation links use `<a>` tags for standard navigation — not React Router or client-side routing.
- Category navigation in header is static placeholder links for MVP — real category data integration comes in Story 4.2.
- Cart icon shows static badge — real cart count comes in Story 4.4.
- Search input is visual-only placeholder — real search comes in Story 4.2.
- Use `display: none` / `flex` or Tailwind responsive classes for mobile hamburger toggle — no complex animation needed for MVP.
- Mobile navigation can use a simple overlay panel — Story 4.7 may add Drawer primitive for this.
- If Drawer does not yet exist for mobile nav, use a simple CSS-based collapsible panel with `hidden` / `block` responsive classes.

### Responsive Navigation Pattern (Recommended)

Mobile (<768px):
- Logo left, hamburger icon right, cart icon right
- Hamburger toggles full-width nav panel below header
- Search is an expandable row below header or hidden behind icon

Tablet (768px-1023px):
- Logo left, horizontal nav links (categories) center, search icon, cart icon, account icon right
- Nav links visible, not hamburger

Desktop (1024px+):
- Same as tablet with richer horizontal layout
- Category nav shows text links
- Search input visible (not just icon if space allows)

### Testing Requirements

- No Vitest tests required for this story — pure layout/navigation shell.
- Manual QA checklist:
  - [x] Storefront loads at `/` without errors.
  - [x] JRW logo visible, links to `/`.
  - [x] Category navigation links visible on desktop, hamburger on mobile.
  - [x] Cart icon/button visible with accessible label.
  - [x] Account/sign-in entry visible.
  - [x] Search entry visible.
  - [x] Footer renders with basic JRW info.
  - [x] Responsive: 320, 375, 390, 430, 768, 1024, 1440px all usable.
  - [x] Desktop layout has horizontal nav, not stretched mobile.
  - [x] Mobile nav collapses/hamburger works.
  - [x] No text overflow in nav items, buttons, badges.
  - [x] Keyboard navigation: Tab through all header elements with visible focus.
  - [x] Skip link visible on first Tab press.
  - [x] Reduced motion: no animations when `prefers-reduced-motion: reduce`.
  - [x] Page title and meta description set.

- Type/Astro check after typed changes:
```bash
npm run check
```

### Latest Technical Information

- No web research required. Use repo-pinned dependencies from `package.json`: Astro `^6.1.9`, React `^19.2.5`, Tailwind CSS `^4.2.4`.
- JRW Technical Brutalist tokens already set in `src/styles/global.css` — reuse existing token names.
- BaseLayout already imports `global.css` — StorefrontLayout extends BaseLayout.
- Satoshi and Space Mono fonts already configured via `@font-face` in `global.css`.
- No API routes, D1, Durable Objects, R2, or Cloudflare-specific features needed — this is a pure UI shell story.
- `npm run dev` for local development — Astro pages render at `http://localhost:4321`.

### References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 4, Story 4.1)
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR32, FR33, FR9)
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.md` (UX-DR1 design tokens, UX-DR23 navigation patterns, UX-DR28 responsive storefront, UX-DR30 accessibility foundation, UX-DR31 responsive QA, UX-DR32 accessibility QA)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (Project Structure, Frontend Architecture, UI and Design Rules, Visual System Boundaries)
- Project context: `_bmad-output/project-context.md` (UI And Design Rules, Testing And Quality, Critical Implementation Rules)
- Design reference: `docs/design-by-google-stitch.md` (sharp 0px corners, 1px borders, no shadows, Satoshi/Space Mono, cobalt accent)
- Previous story pattern reference: `_bmad-output/implementation-artifacts/3-9-admin-product-editor-variant-matrix-and-inventory-ui.md`
- Existing storefront pages: `src/pages/brands/index.astro` (public brand page), `src/pages/brand/index.astro`, `src/pages/brands/[id].astro`
- Existing layout: `src/layouts/BaseLayout.astro`
- Global CSS: `src/styles/global.css`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

1. Review existing BaseLayout, global.css, and available UI primitives.
2. Create `src/features/storefront-shell/components/StorefrontHeader.tsx` with:
   - Logo link, category nav links (static placeholders), search entry, cart icon button, account entry.
   - Responsive hamburger toggle for mobile.
   - JRW Technical Brutalist styling.
3. Create `src/features/storefront-shell/components/StorefrontFooter.tsx` with basic info links.
4. Create `src/layouts/StorefrontLayout.astro` extending BaseLayout with header/footer.
5. Update `src/pages/index.astro` to use StorefrontLayout and React `StorefrontHome`.
6. Add responsive utilities to `src/styles/global.css` if needed.
7. Run responsive QA at all specified breakpoints.
8. Run accessibility QA (keyboard, focus, labels, reduced motion).
9. Run `npm run check` and fix any issues.

### Debug Log References

- Commit found in log: `db816af feat: 4-1 implemented`.
- `npm run check` passed on 2026-05-22 with 0 errors and 4 pre-existing hints.
- `npm run dev -- --host 127.0.0.1 --port 4322` started successfully.
- Initial route smoke via PowerShell `Invoke-WebRequest -Method Head` returned 200 for storefront shell routes.
- Responsive QA screenshots captured with Playwright Chrome at 320, 375, 390, 430, 768, 1024, and 1440px.
- 2026-05-22 correction: storefront-specific UI moved out of `src/components/navigation/**` into React feature module `src/features/storefront-shell/**`.
- 2026-05-22 correction: invented public category labels removed; admin-created categories remain dynamic and Story 4.1 only links to product browsing/category browsing placeholders.
- 2026-05-22 correction smoke via PowerShell `Invoke-WebRequest -Method Head`: `/`, `/products`, `/products?sort=new`, `/products?view=categories`, `/brands`, `/cart`, `/account` returned 200.
- 2026-05-22 correction: header navigation set to `New Arrivals`, `Categories`, `Brands`, `All Products`.
- 2026-05-22 correction: `src/styles/global.css` reduced to import hub; fonts, colors, tokens, base, page, components, features, and storefront CSS moved into partials. Real JRW color declarations now live in `src/styles/_colors.css` with Tailwind semantic aliases such as `bg-primary`, `bg-surface`, `text-muted`, and `border-primary`.
- 2026-05-23 correction: public brand browsing routes now render React storefront brand shells; `/brand/**` redirects to public `/brands/**` instead of admin brand pages.
- 2026-05-23 correction: public brand browsing now consumes `/api/storefront/brands`; existing `/api/brands/**` routes remain admin-auth APIs.
- 2026-05-23 correction: public brand API refactored to Route -> Controller -> Service -> Repository per project context; route file owns Elysia contract only.
- 2026-05-23 verification: `npx vitest run src/server/routes/public-brands.routes.test.ts` passed 3 tests; `npm run check` passed with 0 errors and 2 pre-existing `event.returnValue` hints.

### Completion Notes List

- Storefront shell now uses `StorefrontLayout` with skip link, storefront header, main landmark, and footer.
- Public navigation includes JRW identity, `New Arrivals`, `Categories`, `Brands`, `All Products`, search entry, cart access, and account access without requiring sign-in.
- Placeholder public routes exist for products, categories, cart, and account, with customer-facing copy and no internal story/epic terms.
- Review patches fixed navigation barrel self-import risk, public placeholder copy, and completion tracking.
- Storefront header, footer, home, placeholder, and navigation data now live in React feature module `src/features/storefront-shell/**`; Astro files are route/layout wrappers only.
- Category taxonomy is not hardcoded in Story 4.1; public shell keeps generic category browsing until admin-created category data is wired in later stories.
- `global.css` is now an import map only; new JRW styles should land in scoped partials and use Tailwind `@apply` for reusable utility groups where practical.
- Public brand browsing exists at `/brands` and `/brands/[id]` through `src/features/storefront-brands/**`. It renders the requested filter rail and brand product rows without invented brand/product data or admin-only API calls.
- Brand rows are sourced from public storefront API. Empty product strips mean no published products are linked to that brand yet, not missing brand records.
- Public storefront API follows the canonical route/controller/service/repository split, with contract tests covering public OpenAPI metadata, unauthenticated list, detail success, and 404 envelope.

### File List

- `_bmad-output/implementation-artifacts/4-1-storefront-shell-design-tokens-and-public-navigation.md`
- `_bmad-output/implementation-artifacts/spec-storefront-react-feature-boundary.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-22-storefront-react-feature-boundary.md`
- `src/components/index.ts`
- `src/features/storefront-shell/components/StorefrontFooter.tsx`
- `src/features/storefront-shell/components/StorefrontHeader.tsx`
- `src/features/storefront-shell/components/StorefrontHome.tsx`
- `src/features/storefront-shell/components/StorefrontPlaceholder.tsx`
- `src/features/storefront-shell/data.ts`
- `src/features/storefront-shell/index.ts`
- `src/features/storefront-shell/types.ts`
- `src/features/storefront-brands/components/BrandProductStrip.tsx`
- `src/features/storefront-brands/components/StorefrontBrandDetail.tsx`
- `src/features/storefront-brands/components/StorefrontBrandIndex.tsx`
- `src/features/storefront-brands/api.ts`
- `src/features/storefront-brands/index.ts`
- `src/features/storefront-brands/types.ts`
- `src/domain/brands/public-types.ts`
- `src/layouts/StorefrontLayout.astro`
- `src/pages/account/index.astro`
- `src/pages/brand/[id].astro`
- `src/pages/brand/index.astro`
- `src/pages/brands/[id].astro`
- `src/pages/brands/index.astro`
- `src/pages/cart/index.astro`
- `src/pages/categories/[slug].astro`
- `src/pages/index.astro`
- `src/pages/products/index.astro`
- `src/server/controllers/PublicBrandController.ts`
- `src/server/repositories/PublicBrandRepository.ts`
- `src/server/routes/public-brands.routes.ts`
- `src/server/routes/public-brands.routes.test.ts`
- `src/server/services/PublicBrandService.ts`
- `src/styles/global.css`
- `src/styles/_colors.css`
- `src/styles/_fonts.css`
- `src/styles/_tokens.css`
- `src/styles/_base.css`
- `src/styles/_page.css`
- `src/styles/components/_ui.css`
- `src/styles/features/_owner-governance.css`
- `src/styles/features/_brands.css`
- `src/styles/features/_categories.css`
- `src/styles/features/_products.css`
- `src/styles/features/_variants.css`
- `src/styles/features/_shared.css`
- `src/styles/features/_responsive.css`
- `src/styles/storefront/_layout.css`
- `src/styles/storefront/_navigation.css`
- `src/styles/storefront/_cards.css`
- `src/styles/storefront/_brands.css`
- `src/styles/storefront/_category.css`
- `src/styles/storefront/_footer.css`
- `src/styles/storefront/_responsive.css`

## Change Log

- 2026-05-22: Story 4.1 context engine created for storefront shell, design tokens, and public navigation. First story of Epic 4: Product-First Storefront and Cart.
- 2026-05-22: Implemented storefront shell, public navigation, placeholder routes, responsive/accessibility styling, QA validation, and code-review patches. Story marked done.
- 2026-05-22: Corrected Story 4.1 implementation boundary to React feature module `src/features/storefront-shell/**`; removed storefront-specific generic navigation components.
- 2026-05-22: Removed invented category taxonomy from storefront navigation; kept `New arrivals` as product browsing query.
- 2026-05-22: Updated header navigation to `New Arrivals`, `Categories`, `Brands`, `All Products`.
- 2026-05-23: Split JRW CSS out of `global.css` into partials; moved real color declarations to `_colors.css` and added semantic Tailwind color aliases for `@apply` usage.
- 2026-05-23: Added public brand browsing shell and corrected `/brand/**` redirects away from admin pages.
- 2026-05-23: Added public brand API and wired brand pages to it; published product previews remain data-dependent.
- 2026-05-23: Refactored public brand API into controller/service/repository layers and added public route contract coverage.
