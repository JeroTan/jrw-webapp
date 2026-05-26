---
status: done
story_key: storefront-catalog-browsing-ux-cleanup
created: 2026-05-26
updated: 2026-05-26
---

# Storefront Catalog Browsing UX Cleanup

## Intent

Make storefront product browsing, category browsing, and brand browsing feel like one clean JRW shopping system instead of separate patched screens.

## Problems

- Product filter rail owns search and page size even though search belongs in nav and page size belongs to pagination.
- Product filters lack real shopping filters: brand, category, price range, and stock state.
- Category browsing has no `/categories` index and category detail behaves like filtered products with category directory noise.
- Brand browsing uses a large hero and image-only product previews instead of the existing product card system.
- Brand filters and product filters do not share UI language.

## Scope

- Add checklist filters for categories, brands, and stock states.
- Add min/max price range inputs.
- Preserve rule: no checklist selection means all selected.
- Keep nav search separate from filters; filters only preserve existing `q` as hidden state.
- Add `/categories` page with category sections, product cards, and View more actions.
- Update `/categories/[slug]` to be category detail only: title, back to all categories, products, no filters.
- Update `/brands` with simple title, checklist brand filter, and brand sections using product cards.
- Update `/brands/[id]` to use the same product card content.
- Make brand data shape ready for optional brand image fields, but do not invent schema fields.

## Design Guardrails

- Reuse existing UI primitives first. If missing, create small atomic primitive.
- Use existing `ProductGrid` and `ProductCard`; no new card anatomy.
- Use `ButtonLink` for View more links.
- Keep section layout simple: title left, metadata/action right, product cards below.
- Keep generous vertical spacing between category/brand sections.
- No fake brand image placeholder. If no brand image exists, show no brand image.
- If brand image later exists, render fixed small height with `object-contain`, not cover.

## Acceptance Criteria

- Given `/products`, when filters render, then search field and items-per-page field are absent.
- Given `/products`, when no category, brand, or stock checkbox is selected, then all matching products remain eligible.
- Given `/products?category=a&category=b&brand=x&stock=available&minPrice=100&maxPrice=500`, when catalog loads, then query state preserves all filter values and repository receives matching filter constraints.
- Given `/categories`, when page loads, then category sections render with category name, View more link, and existing product cards.
- Given `/categories/[slug]`, when page loads, then filters and category directory do not render.
- Given `/brands`, when page loads, then title is `Brands`, filters use brand checklist UI, and brand rows render product cards with product count and View more.
- Given `/brands/[slug]`, when page loads, then brand products render through existing product cards.
- Given active brands with unique slugs, when View more is clicked, then link targets `/brands/[slug]`.

## Code Map

- `src/domain/products/public-types.ts`: storefront catalog query and brand option types.
- `src/domain/products/public-catalog.ts`: query normalization and price/stock parsing.
- `src/server/repositories/ProductRepository.ts`: product-level SQL filters.
- `src/server/repositories/PublicCatalogRepository.ts`: public brand/category option lookup and product card browse data.
- `src/server/services/PublicCatalogService.ts`: filter validation and lookup orchestration.
- `src/server/loaders/PublicCatalogPageDataLoader.ts`: page data for products and categories.
- `src/features/product-catalog/components/ProductCatalogFilters.tsx`: product filter rail.
- `src/features/product-catalog/components/ProductCollectionSection.tsx`: shared category/brand section.
- `src/features/storefront-brands/**`: brand index/detail layout.
- `src/pages/categories/index.astro`: new category index route.
- `src/pages/categories/[slug].astro`: category detail route.
- `src/pages/brands/**`: brand routes.

## Verification

- Run targeted UI/service/route tests for catalog and brands.
- Run `npm run check`.

## Completion Notes

- Product filters now use category, brand, stock, and price controls only; nav search remains separate.
- `/categories` is a real category index and `/products?view=categories` redirects to it.
- Category detail pages render title + product grid without filters.
- Brand index/detail pages use simple titles, checklist filtering, View more links, optional brand image fields, and existing product cards.
- Targeted catalog/brand/shell/detail route tests passed.
- `npm run check` passed with 0 errors and existing deprecation hints only.
