# Story 4.8: Shared Primitive Visual Contract

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a Customer, Prospect, Admin, or Super Admin,
I want shared controls to follow the approved JRW HTML direction,
so that storefront, dashboard, and checkout interactions feel consistent.

## Acceptance Criteria

1. Given `Button` or `IconButton` renders, when hover or focus-visible state is active, then cobalt outline appears with 2px width and 2px offset and hover does not rely on border-color-only feedback.
2. Given primary button renders, when idle, then background and border use cobalt accent and text remains white with no shadow/blur.
3. Given secondary button renders, when idle, then it keeps surface background, 1px strong border, sharp corners, Space Mono/system label, and no shadow/blur.
4. Given shared primitives render statuses, loading, disabled, and error states, when reviewed against the HTML direction, then 0px radius, 1px borders, text status, visible focus, and tokenized cobalt accent are preserved.
5. Given primitive tests run, when classes/markup are asserted, then button hover/focus contract, disabled/loading states, and accessible icon labels are covered and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Task 1: Lock scope and prevent broad primitive churn. (AC: 1-5)
  - [ ] Only touch shared primitive visual contract needed by this story: `Button`, `IconButton`, and tests. Touch `ViewToggle` only if keeping it visually inconsistent would fail AC4.
  - [ ] Do not redesign feature pages, storefront cards, admin layouts, or cart behavior in this story.
  - [ ] Do not add dependencies, CSS files, feature-local button variants, or one-off `jrw-*` selectors.
  - [ ] Preserve existing props and public API for `Button`, `IconButton`, and `ViewToggle`.

- [ ] Task 2: Add failing primitive tests first. (AC: 1-5)
  - [ ] Update `src/components/primitives.test.ts` to assert `Button` includes `hover:outline-2`, `hover:outline-offset-2`, `hover:outline-brand-accent`, `focus-visible:outline-2`, `focus-visible:outline-offset-2`, and `focus-visible:outline-brand-accent`.
  - [ ] Add the same outline contract assertion for `IconButton`.
  - [ ] Assert primary button includes accent border/background and white/surface text.
  - [ ] Assert disabled/loading buttons keep `aria-busy`, `disabled`, and no shadow/blur classes.

- [ ] Task 3: Implement shared outline contract. (AC: 1-4)
  - [ ] Update `src/components/ui/Button.tsx` base class to use cobalt outline on enabled hover and focus-visible, with 2px outline and 2px offset.
  - [ ] Update `src/components/ui/IconButton.tsx` base class with same outline contract.
  - [ ] Ensure primary/danger variants set matching border colors where needed so idle state is clear before outline appears.
  - [ ] Keep controls sharp: `rounded-none`, `border`, `shadow-none`, no blur/filter effects.

- [ ] Task 4: Confirm no regressions in shared primitive behavior. (AC: 1-5)
  - [ ] Verify icon buttons still require accessible `label` and tooltip/title metadata.
  - [ ] Verify loading buttons keep stable label and role.
  - [ ] Verify `StatusBadge`, `Input`, `SearchInput`, `Skeleton`, `DataTable`, `ResourceCard`, and `PageToolbar` tests still pass without unrelated edits.

- [ ] Task 5: Run validation. (AC: 5)
  - [ ] Run `npx vitest run src/components/primitives.test.ts`.
  - [ ] Run `rg -n "jrw-|--jrw|color-jrw|spacing-jrw|font-jrw" src/styles src/components src/features src/layouts src/pages` and confirm no new runtime styling regressions.
  - [ ] Run `npm run check`.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- N/A Route auth metadata declares public/optional/required auth, roles, and rate-limit class. UI primitive-only story.
- N/A Route-level RBAC guard runs before validation or side effects for protected endpoints. UI primitive-only story.
- N/A Service/controller enforces actor state before mutation. UI primitive-only story.
- N/A Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. UI primitive-only story.
- N/A Public/customer endpoints explicitly document why brand membership is not required. No endpoints changed.
- N/A Denial tests cover auth/role/brand cases. No endpoint changed.
- N/A Error response uses safe envelope codes. No endpoint changed.
- N/A OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes. No endpoint changed.

## Dev Notes

### Dependencies

- Must be implemented before Story 4.9 and Story 4.4.
- Story 4.9 product card/detail fidelity must reuse this button outline contract.
- Story 3.10 and Story 3.11 admin shell/dashboard work must reuse this contract.

### Current Code Intelligence

#### READ: `src/components/ui/Button.tsx`

- Current state: base class uses `enabled:hover:border-brand-accent` and no 2px outline. Primary variant sets accent background but not explicit accent border.
- What this story changes: Replace border-only hover with HTML reference outline treatment and make primary idle border match accent.
- What must be preserved: props, default `type="button"`, loading behavior, `aria-busy`, disabled logic, `fullWidth`, `size`, `variant`.

#### READ: `src/components/ui/IconButton.tsx`

- Current state: mirrors `Button` but uses square `size-control-*` classes and accessible `label`.
- What this story changes: Same cobalt outline contract as `Button`.
- What must be preserved: `aria-label`, `title`, `tooltip`, `loading`, `variant`, `size`, and span `aria-hidden`.

#### READ: `src/components/ui/ViewToggle.tsx`

- Current state: already uses outline on hover/focus, but 1px and negative offset. This is acceptable only if tests and UX review do not require exact 2px/2px parity for toggle buttons.
- What this story changes: Optional alignment only if needed. Do not rework behavior or API.
- What must be preserved: `role="group"`, `aria-pressed`, selected state, existing `onChange` shape.

#### READ: `src/components/primitives.test.ts`

- Current state: covers primitive rendering, icon accessibility, loading button, search, view toggle, resource cards, skeleton, token checks.
- What this story changes: Add exact visual contract assertions. Do not remove existing regression tests.

### Technical Requirements

- Use Tailwind v4 utility classes already available in markup. Tailwind official docs support state variants like `hover:` and `focus-visible:` and outline utilities like `outline-2` / `outline-offset-2`.
- Use project token `outline-brand-accent`, not raw color classes.
- Prefer direct class constants inside shared primitives, consistent with project context.
- No CSS module, no BEM/page class, no `jrw-*` runtime selector.

### Testing Requirements

- Test by static markup/class assertions because hover/focus pseudo-state itself is not active in server render tests.
- Keep tests narrow. Do not snapshot full components.
- `npm run check` must pass.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 4.8, UX-DR35.
- `_bmad-output/planning-artifacts/ux-design-directions.html` - `.button:hover`, `.button:focus-visible`.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Implementation fidelity gate, Button Hierarchy.
- `_bmad-output/planning-artifacts/architecture.md` - Visual System Boundaries.
- `_bmad-output/project-context.md` - UI And Design Rules.
- Tailwind official docs: https://tailwindcss.com/docs/outline-style and https://tailwindcss.com/docs/hover-focus-and-other-states

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `src/components/ui/Button.tsx`
- `src/components/ui/IconButton.tsx`
- `src/components/ui/ViewToggle.tsx`
- `src/components/primitives.test.ts`
- `_bmad-output/planning-artifacts/ux-design-directions.html`

### Completion Notes List

- Story context created only. No implementation performed.

### File List

- `_bmad-output/implementation-artifacts/4-8-shared-primitive-visual-contract.md`

### Change Log

- 2026-05-24: Created ready-for-dev story context.
