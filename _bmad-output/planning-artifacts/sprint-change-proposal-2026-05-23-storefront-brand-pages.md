# Sprint Change Proposal: Storefront Brand Pages

Date: 2026-05-23

## 1. Issue Summary

Story 4.1 marked the storefront shell done and included `Brands` in public navigation, but the public `/brands` and `/brands/[id]` routes still returned `"Not yet implemented."`. The older `/brand/**` routes redirected shoppers into `/admin/brands`, which is wrong for user-facing navigation.

Evidence:

- Commit log has Story 4.1 work: `db816af feat: 4-1 implemented`, `8f5b3be chore: 4-1 reviewed`.
- Architecture already listed a public `src/pages/brands/[brandSlug].astro` route.
- UX spec says to use brand pages and product labels for catalog clarity, not marketplace complexity.
- User note in `src/pages/brands/index.astro` requested brand rows with image-only product cards, a final `+N` more card, and a left filter rail.

## 2. Impact Analysis

Epic impact: Epic 4 stays valid. This is a direct Story 4.1 correction, not a new epic.

Story impact:

- Story 4.1 needed correction because navigation linked to a stub page.
- Story 4.2 still owns real product grid/search/filter API integration.
- No rollback needed.

Artifact conflict:

- PRD: no conflict. Brands remain catalog groups.
- Architecture: aligns with existing public brands route expectation.
- UX: aligns with brand page guidance and avoids seller/store language.

Technical impact:

- Add React feature UI under `src/features/storefront-brands/**`.
- Keep Astro pages as route/layout wrappers.
- Add storefront brand CSS partial and import it through `global.css`.
- Add public brand API through the canonical Route -> Controller -> Service -> Repository pattern.
- Avoid admin-only brand APIs and avoid invented brand/product data.

## 3. Recommended Approach

Direct adjustment.

Reason: smallest safe change. Public pages stop being stubs, navigation no longer leaks into admin routes, and active admin-created brands can render through a public read API.

Risk: low-medium. Public read-only API touches server/database boundaries, so route contract tests and standard response envelopes are required.

## 4. Detailed Change Proposal

Implement:

- `/brands`: React brand browsing shell with filter sidebar, search field, checkbox, brand rows, and empty state.
- `/brands/[id]`: React brand detail shell ready for dynamic brand products.
- Public `/api/storefront/brands` endpoints for active brand rows and published product previews.
- `src/server/routes/public-brands.routes.ts`: Elysia contract, OpenAPI metadata, TypeBox response schemas, public auth metadata.
- `src/server/controllers/PublicBrandController.ts`: response envelope and HTTP status mapping.
- `src/server/services/PublicBrandService.ts`: brand list/detail use cases returning `AppResult`.
- `src/server/repositories/PublicBrandRepository.ts`: D1/Drizzle brand and product preview reads.
- `/brand`: redirect to `/brands`.
- `/brand/[id]`: redirect to `/brands/[id]`.
- `src/styles/storefront/_brands.css`: scoped brand page styles using Tailwind `@apply`.

Do not implement:

- Fake brands.
- Fake products.
- Admin API calls from public pages.
- Direct page-to-DB brand loading.
- Full public product grid/detail work; leave for Story 4.2 and later Epic 4 stories.

## 5. Handoff

Developer owns implemented shell, route correction, public brand API, and route contract verification.

Story 4.2 should wire real published product data, brand grouping, product images, filtering, and pagination through a public catalog API.

## Checklist

- [x] Trigger understood: missing public brand page despite public navigation.
- [x] Epic impact assessed: Epic 4 direct correction.
- [x] PRD/architecture/UX checked.
- [x] Direct adjustment selected.
- [x] Brand pages implemented without fake data.
- [x] Admin redirect leak corrected.
