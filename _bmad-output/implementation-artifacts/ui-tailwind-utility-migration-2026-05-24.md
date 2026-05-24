# UI Tailwind Utility Migration - 2026-05-24

Status: done

## Intent

Replace one-off `jrw-*` runtime styling with Tailwind CSS v4 utilities plus JRW theme tokens so UI debugging happens in markup instead of bouncing between JSX/Astro and detached CSS class layers.

## What Changed

- Runtime UI components now use Tailwind utility classes directly for feature-specific layout, spacing, color, borders, typography, and responsive behavior.
- JRW brand tokens were moved into Tailwind theme tokens in `src/styles/_colors.css` and `src/styles/_tokens.css`.
- `src/styles/global.css` is now only Tailwind entrypoint/imports plus global base styles.
- Deleted feature/storefront/component CSS class layers are not part of the active styling model:
  - `src/styles/features/**`
  - `src/styles/storefront/**`
  - `src/styles/components/_ui.css`
- Shared primitives under `src/components/**` may keep repeated Tailwind class constants inside component files.
- Feature-specific UI keeps utility classes close to JSX/Astro markup unless behavior belongs in a reusable shared primitive.

## Guardrail

Future UI work must not add one-off `jrw-*` runtime classes, page/BEM selector layers, or new feature/storefront CSS files for single elements. Prefer theme-token utilities such as `bg-brand-accent`, `text-brand-muted`, `border-brand-border-strong`, `p-grid-sm`, `gap-grid-xs`, `min-h-control-md`, and responsive variants like `xs:`, `md:`, `lg:`, and `3xl:`.

## Verification

Run before finishing UI work:

```bash
rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages
npm run check
npm run build
```

Expected runtime UI search result: no matches except legitimate brand slugs, fixture text, or tests that explicitly assert absence.

## Source Docs Updated

- `_bmad-output/project-context.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/epics.md`
