# Story 1.5: Global Font, UI Token, and Primitive Baseline

Status: done

## Story

As a developer/agent,
I want local JRW fonts, Tailwind CSS v4 tokens, and the first reusable UI primitives configured before auth/governance UI starts,
so that Epic 1 and later features share one typography, control, state, and accessibility foundation.

## Acceptance Criteria

1. Given local font assets already exist under `public/fonts/satoshi/**` and `public/fonts/space-mono/**`, when UI baseline styling is configured, then `src/styles/global.css` defines `@font-face` entries for Satoshi and Space Mono using local `.woff2` assets with `font-display: swap`, and Tailwind CSS v4 theme tokens or documented CSS variables expose those families for headings, identity text, body copy, labels, and system/meta text.
2. Given global font CSS is configured, when Astro renders the shared layout or first UI page, then the global stylesheet is imported once through the shared layout/page entry, and future UI stories can consume the font families through documented global CSS variables or token names.
3. Given UI token baseline exists, when Tailwind CSS v4 design tokens are configured from the UX specification, then tokens exist for JRW background/content/muted/border/strong-border/cobalt/error/status colors, 0px radius, 1px borders, visible focus, disabled/loading/error states, and compact spacing, and tokens preserve the technical brutalist rules: no shadows, no blur, no decorative gradients, and restrained cobalt for focus, selected state, primary action, and live status.
4. Given Epic 1 auth and governance UI needs repeatable controls, when baseline shared primitives are implemented, then reusable components exist under `src/components/**` for `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Checkbox`, `Toggle`, `Badge`, `StatusBadge`, `Tabs`, `DataTable`, `Modal`, `Toast`, `ConfirmDialog`, `EmptyState`, and `Skeleton`, and components use Tailwind CSS v4 tokens/local CSS only, without adopting a full external component library.
5. Given primitive components render user-facing controls, when keyboard, focus, status, loading, disabled, empty, and error states are reviewed, then controls have accessible names/labels, visible focus, stable dimensions, text labels for status, associated field errors, and no color-only meaning, and unfamiliar icon buttons include accessible names and tooltip-ready metadata.
6. Given later epics need UI beyond the baseline, when a story needs a new component, then it first reuses or extends existing `src/components/**` primitives where behavior is generic, and feature-specific components stay under `src/features/<feature>/**` until reuse across features justifies promotion to shared components.
7. Given validation exists, when story implementation finishes, then `npm run check` passes or blocker is documented, and no unrelated backend feature work or broad visual redesign is introduced.
8. Given story outputs are reviewed, when implementation is accepted, then `src/styles/global.css`, documented Tailwind/CSS token names, one shared layout/page import, and baseline primitive component exports are present, and rendered font loading plus primitive smoke checks are verified or blockers are documented.

## Tasks / Subtasks

- [x] Configure global style surface and font assets. (AC: 1, 2, 3)
  - [x] Create `src/styles/global.css` with `@import "tailwindcss";`.
  - [x] Add `@font-face` rules for Satoshi and Space Mono from `public/fonts/**` using `.woff2` and `font-display: swap`.
  - [x] Define Tailwind v4 `@theme` variables for font families, JRW colors, radius, border widths, compact spacing, focus, disabled/loading/error/status colors, and tabular data where useful.
  - [x] Add base styles for `html`, `body`, focus-visible, selection, form defaults, disabled elements, and reduced motion without shadows, blur, gradients, or rounded corners.

- [x] Import global styles once through a shared page/layout entry. (AC: 2, 8)
  - [x] Create `src/layouts/BaseLayout.astro` or equivalent shared layout that imports `../styles/global.css` once.
  - [x] Update `src/pages/index.astro` to use the shared layout and stop rendering default `Astro` placeholder page.
  - [x] Keep page content minimal and implementation-focused; do not build a marketing landing page in this story.

- [x] Implement baseline shared primitives under `src/components/**`. (AC: 4, 5, 6)
  - [x] Create shared primitive folders and barrel exports, preferring architecture categories: `src/components/ui/**`, `src/components/feedback/**`, and `src/components/data-display/**`.
  - [x] Implement `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Checkbox`, `Toggle`, `Badge`, `StatusBadge`, `Tabs`, `DataTable`, `Modal`, `Toast`, `ConfirmDialog`, `EmptyState`, and `Skeleton`.
  - [x] Ensure every primitive supports accessible names/labels, visible focus, disabled state, loading/pending state where applicable, error state where applicable, stable dimensions, text overflow handling, and no color-only meaning.
  - [x] `IconButton` must require an accessible label and expose tooltip-ready metadata such as `title` or `aria-label`; do not add an icon package unless explicitly approved later.
  - [x] `Modal` and `ConfirmDialog` must implement focus trap/restore or document a blocker if a safe focus trap cannot be completed without adding a dependency.

- [x] Add primitive smoke coverage. (AC: 5, 7, 8)
  - [x] Add targeted Vitest/React tests only if the current test stack can render React components without new tooling churn.
  - [x] At minimum, verify exports compile through `npm run check` and add manual smoke notes for font loading, focus states, disabled/loading/error states, and primitive rendering.
  - [x] If test tooling is insufficient for DOM/focus checks, document blocker and use Story 1.4 UI QA baseline for future Playwright/axe setup.

- [x] Record completion evidence. (AC: 7, 8)
  - [x] Run `npm run check`.
  - [x] Run `npx vitest run` if component tests, test config, or source logic beyond styling/layout changes are added.
  - [x] List created/updated files, smoke evidence, and any blockers in Dev Agent Record completion notes.

### Review Findings

- [x] [Review][Patch] Tabs arrow navigation updates selection but leaves focus on the old tab [src/components/ui/Tabs.tsx:73]
- [x] [Review][Patch] Modal focus restore runs during open re-renders when `onClose` identity changes [src/components/ui/Modal.tsx:100]
- [x] [Review][Patch] Checkbox and toggle disabled visuals only affect hidden inputs [src/styles/global.css:145]
- [x] [Review][Patch] Story completion evidence and smoke/blocker notes are missing [C:/dev/Web Application/jrw-webapp/_bmad-output/implementation-artifacts/1-5-global-font-ui-token-and-primitive-baseline.md:206]

## Dev Notes

### Current State

- `src/styles/global.css` does not exist. `src/styles/_readme.md` only states styles should enforce Technical Brutalist design.
- `src/components/**` has only `src/components/_readme.md`; no primitive components exist yet.
- `src/layouts/**` has only `src/layouts/_readme.md`; no shared Astro layout exists yet.
- `src/pages/index.astro` is the default Astro placeholder with `<title>Astro</title>` and `<h1>Astro</h1>`.
- Font assets already exist:
  - `public/fonts/satoshi/Satoshi-*.woff2`
  - `public/fonts/space-mono/SpaceMono-*.woff2`
- Tailwind v4 is already wired through `@tailwindcss/vite` in `astro.config.mjs`; no `tailwind.config.*` exists and none is needed for this story unless a blocker is documented.
- Package stack relevant to this story: Astro `^6.1.9`, React `^19.2.5`, React DOM `^19.2.5`, Tailwind CSS `^4.2.4`, `@tailwindcss/vite` `^4.2.4`, TypeScript `^5.9.3`, Vitest `^4.1.5`.
- Playwright and `@axe-core/playwright` are not installed. Story 1.4 selected them as future UI QA baseline only.

### Required Design Tokens

Use JRW Stitch values as source of truth. Minimum token set:

| Token purpose | Value / rule |
| --- | --- |
| surface | `#FFFFFF` |
| background | `#FCF8F9` |
| content | `#0D1117` |
| muted content | `#45474B` |
| border/support | `#E1E4E8` |
| strong border | `#0D1117` |
| cobalt/accent | `#3E96F4` |
| error/destructive | `#BA1A1A` |
| success | text-first green token; must include status text |
| warning | amber token; must include status text |
| radius | `0px` |
| border width | `1px` |
| spacing base | `4px`; named steps `xs=8px`, `sm=16px`, `md=24px`, `lg=48px`, `xl=80px` |
| identity/headings | Satoshi Bold/Variable |
| body/system/labels/data | Space Mono |

No shadows, blur, decorative gradients, orb backgrounds, soft generic ecommerce cards, or rounded corners.

### Primitive Requirements

- Keep shared components generic. Business rules, auth copy, product behavior, admin policy, and feature-specific state stay in `src/features/**`.
- Prefer semantic HTML before ARIA.
- Use explicit props for `label`, `error`, `description`, `disabled`, `loading`, `required`, `variant`, `size`, and status where relevant.
- Status components must render text labels. Color may support meaning but cannot be sole signal.
- Buttons and controls must not resize unpredictably between default, hover, focus, loading, and disabled states.
- Inputs must associate labels/errors through `htmlFor`, `id`, `aria-describedby`, and `aria-invalid` where applicable.
- Dialog primitives must include `role="dialog"`/`aria-modal` or native dialog semantics, close affordance, Escape behavior, focus trap/restore, and reduced-motion-safe transitions.
- `DataTable` baseline can be small: typed columns, empty state, loading state, caption/label, stable cell overflow handling, and keyboard-friendly markup. Do not build sorting/filtering unless needed for baseline smoke.
- `Toast` baseline must not be required for critical errors; forms still need inline errors and accessible summaries where relevant.
- React 19 supports `ref` as a prop for function components. Prefer typed ref props for new leaf primitives where practical; use `forwardRef` only if TypeScript/Astro compatibility requires it and document why.

### File Structure Guardrails

Expected create/update scope:

- Create `src/styles/global.css`.
- Create `src/layouts/BaseLayout.astro` or equivalent shared layout.
- Update `src/pages/index.astro` to import/use shared layout.
- Create primitive modules under:
  - `src/components/ui/**`
  - `src/components/feedback/**`
  - `src/components/data-display/**`
  - `src/components/index.ts` or per-folder `index.ts` barrels.
- Optional: update `src/components/_readme.md`, `src/styles/_readme.md`, or `src/layouts/_readme.md` only if useful.

Avoid:

- Backend/API changes.
- Database/migration changes.
- Full external component libraries.
- New icon package unless explicitly approved.
- Playwright install unless explicitly chosen as separate tooling work.
- Broad storefront/admin feature implementation.

### Architecture Compliance

- Astro owns page routing and SEO shells. React owns interactive primitives and future feature surfaces.
- Shared primitives belong under `src/components/**`; feature UI belongs under `src/features/<feature>/**`.
- `src/styles/global.css` is the Tailwind CSS v4 project style surface for `@theme`, `@utility`, and reusable component classes.
- Use `@/` path alias for imports from `src/*` when useful.
- React component filenames should use PascalCase `.tsx`.
- Keep code Workers-compatible; this story should not add request-path Node APIs.
- Use local CSS/Tailwind tokens. Do not introduce ad hoc inline color palettes in components.

### Previous Story Intelligence

- Story 1.4 created UI QA baseline at `_bmad-output/implementation-artifacts/1-4-ui-qa-baseline.md`.
- Future UI stories must record responsive widths `320`, `375`, `390`, `430`, `768`, `1024`, and `1440`, plus keyboard/focus/status/text-overflow checks or blockers.
- Story 1.4 did not install Playwright/axe; do not claim automated UI QA exists.
- Story 1.3 froze `src/api/**` as legacy/migration-only. This story is UI-only and should not touch API routes.
- Recent commit `a945c84` added docs-only baselines and updated sprint status; it did not create UI source files.

### Latest Technical Information

- Tailwind CSS v4 uses CSS-first configuration. Put `@import "tailwindcss";` in the global stylesheet and define design tokens with `@theme`; Tailwind generates utility classes and CSS variables from theme variables. Source: https://tailwindcss.com/docs/theme
- Tailwind v4 custom utilities can be added with `@utility`; use this sparingly for stable JRW helpers such as focus rings or visually hidden labels if built-in utilities are not enough. Source: https://tailwindcss.com/docs/adding-custom-styles
- Astro bundles and optimizes local CSS imported from Astro component frontmatter; import project global CSS once from the shared layout/page entry. Source: https://docs.astro.build/en/guides/styling/
- React 19 allows `ref` as a regular function component prop and marks `forwardRef` as no longer necessary for new components. Source: https://react.dev/reference/react/forwardRef

### Testing Requirements

- Required validation: `npm run check`.
- Run `npx vitest run` if source tests are added or if component logic needs regression coverage.
- UI smoke evidence must cover:
  - global stylesheet imported once,
  - rendered Satoshi/Space Mono font-family availability,
  - primitive exports compile,
  - keyboard focus visible,
  - disabled/loading/error states visible,
  - status badges include text,
  - modal/confirm focus trap and restore or documented blocker,
  - no shadows/blur/gradients/rounded corners introduced.
- If browser/visual testing is deferred, record blocker against Story 1.4 UI QA baseline rather than claiming completion.

### Project Structure Notes

- This story fills the current gap between design artifacts and future auth/governance UI. It should establish reusable UI foundation, not ship full auth/admin/storefront flows.
- Existing source tree has placeholder folders and default Astro page; implementation must create first real style/layout/component surface.
- No conflict found with current backend architecture.

### References

- `_bmad-output/planning-artifacts/epics.md#Story-1.5-Global-Font-UI-Token-and-Primitive-Baseline`
- `_bmad-output/planning-artifacts/architecture.md#Component-Boundaries`
- `_bmad-output/planning-artifacts/architecture.md#Visual-System-Boundaries`
- `_bmad-output/planning-artifacts/ux-design-specification.md#Visual-Design-Foundation`
- `_bmad-output/planning-artifacts/ux-design-specification.md#Component-Strategy`
- `_bmad-output/planning-artifacts/ux-design-specification.md#Accessibility-Strategy`
- `_bmad-output/planning-artifacts/ux-design-specification.md#Testing-Strategy`
- `docs/design-by-google-stitch.md`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/1-4-ui-qa-baseline.md`
- `package.json`
- `astro.config.mjs`
- `src/pages/index.astro`
- `src/components/_readme.md`
- `src/styles/_readme.md`
- `src/layouts/_readme.md`

## Story Context Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12T15:42:46+08:00: Story moved to in-progress in sprint tracking.
- Code review patches applied: tabs roving focus now programmatically focuses the newly selected tab; modal close callback is ref-backed so focus restore only runs on close/unmount; checkbox/toggle disabled states now affect visible controls.

### Completion Notes List

- `npm run check` passed with 0 errors and existing unrelated hints.
- `npx vitest run src/components/primitives.test.ts` passed 6 primitive smoke tests.
- `npm run build` passed.
- UX alignment checked against `_bmad-output/planning-artifacts/ux-design-directions.html`: sharp 0px radius, 1px line system, cobalt focus/active states, Satoshi/Space Mono usage, visible disabled state, and no shadows/blur/orb styling preserved.
- Browser visual smoke attempted. `127.0.0.1:4321` is occupied by another app, and isolated JRW dev server on `127.0.0.1:4322` returned an empty body/hung in the in-app browser despite successful build/check. Track full browser/viewport verification through Story 1.4 UI QA baseline when Playwright/axe tooling is added.

### File List

- `src/styles/global.css`
- `src/layouts/BaseLayout.astro`
- `src/pages/index.astro`
- `src/components/index.ts`
- `src/components/utils.ts`
- `src/components/primitives.test.ts`
- `src/components/ui/Button.tsx`
- `src/components/ui/Checkbox.tsx`
- `src/components/ui/ConfirmDialog.tsx`
- `src/components/ui/IconButton.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/Select.tsx`
- `src/components/ui/Tabs.tsx`
- `src/components/ui/Textarea.tsx`
- `src/components/ui/Toggle.tsx`
- `src/components/ui/index.ts`
- `src/components/feedback/Badge.tsx`
- `src/components/feedback/EmptyState.tsx`
- `src/components/feedback/Skeleton.tsx`
- `src/components/feedback/StatusBadge.tsx`
- `src/components/feedback/Toast.tsx`
- `src/components/feedback/index.ts`
- `src/components/data-display/DataTable.tsx`
- `src/components/data-display/index.ts`
- `_bmad-output/implementation-artifacts/1-5-global-font-ui-token-and-primitive-baseline.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
