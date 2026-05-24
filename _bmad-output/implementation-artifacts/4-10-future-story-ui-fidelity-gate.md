# Story 4.10: Future Story UI Fidelity Gate

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As project owner,
I want future UI stories to cite exact design-direction references,
so that sprint work does not repeat expectation-versus-reality UI drift.

## Acceptance Criteria

1. Given a new UI story is created, when it touches storefront, then it cites Direction 01, 02, 03, or 04 as applicable and acceptance criteria name exact product/card/detail/cart/checkout fidelity checks.
2. Given a new UI story is created, when it touches admin, then it cites Direction 05 or 07 as applicable and acceptance criteria name shell/sidebar/topbar/table density/governance fidelity checks.
3. Given a shared primitive is changed, when story is reviewed, then hover, focus, status, empty, loading, disabled, and error states are checked against the HTML direction and UX spec.
4. Given implementation passes type checks, when reviewer evaluates done status, then visual fidelity still requires manual or automated component QA before story can be considered done.
5. Given story template or planning guidance is updated, when future stories are generated, then exact UX direction references and layout-preservation notes are present by default.

## Tasks / Subtasks

- [x] Task 1: Locate story-creation and review guidance files. (AC: 1-5)
  - [x] Read `.agents/skills/bmad-create-story/template.md`, `checklist.md`, and `discover-inputs.md`.
  - [x] Read `.agents/skills/bmad-dev-story/SKILL.md` for allowed story-file edits and Definition of Done expectations.
  - [x] Read `.agents/skills/bmad-code-review/**` enough to know where review guidance can reference UI fidelity without changing review workflow semantics.
  - [x] Do not modify skill source files outside project unless they are under this repo and intended customizations.

- [x] Task 2: Add UI fidelity section to story template/guidance. (AC: 1-5)
  - [x] Update the project-local create-story template or repo guidance so future generated stories include a `Design Direction Fidelity` subsection under Dev Notes.
  - [x] The subsection must require exact references to `_bmad-output/planning-artifacts/ux-design-directions.html` and direction numbers.
  - [x] Include layout-preservation note: do not remove accepted layout while changing component visual anatomy unless story explicitly approves it.
  - [x] Include primitive interaction note: Button/IconButton hover/focus must use 2px cobalt outline with 2px offset.

- [x] Task 3: Add checklist gate for story quality. (AC: 1-5)
  - [x] Update create-story checklist or local validation guidance so UI stories fail quality review if they omit exact design directions.
  - [x] Storefront checklist must name Direction 01/02/03/04 as applicable.
  - [x] Admin checklist must name Direction 05/07 as applicable.
  - [x] Shared primitive checklist must include hover/focus/status/loading/empty/error state review.

- [x] Task 4: Add implementation prompt guidance. (AC: 3-5)
  - [x] Update or create a small project guidance artifact if needed so dev agents know type checks alone are not UI completion.
  - [x] Require at least one of: component tests asserting visual contract classes, responsive/manual QA notes, or documented blocker.
  - [x] Keep guidance short and agent-readable. Avoid policy essays.

- [x] Task 5: Validate no workflow breakage. (AC: 5)
  - [x] Confirm modified Markdown files keep valid headings and placeholders.
  - [x] Run `rg -n "Design Direction Fidelity|Direction 01|Direction 05|UX-DR35|FR79" .agents _bmad-output/project-context.md _bmad-output/planning-artifacts`.
  - [x] Run `git diff --check` for changed docs.

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- N/A Route auth metadata declares public/optional/required auth, roles, and rate-limit class. Documentation/process story.
- N/A Route-level RBAC guard runs before validation or side effects for protected endpoints. Documentation/process story.
- N/A Service/controller enforces actor state before mutation. Documentation/process story.
- N/A Brand-scoped reads or writes enforce active brand membership or elevated permission server-side. Documentation/process story.
- N/A Public/customer endpoints explicitly document why brand membership is not required. No endpoint.
- N/A Denial tests cover auth/role/brand cases. No endpoint.
- N/A Error response uses safe envelope codes. No endpoint.
- N/A OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes. No endpoint.

## Dev Notes

### Dependencies

- Should run after Story 4.8 and Story 4.9 so the gate can reference concrete primitive/product-card fidelity decisions.
- Must complete before Story 4.4 and before creating more UI-heavy stories.

### Current File Intelligence

#### READ: `.agents/skills/bmad-create-story/template.md`

- Current state: generic story template with Dev Notes, Project Structure Notes, References, Dev Agent Record.
- What this story changes: add concise design-direction fidelity placeholders so future UI stories cannot omit the HTML reference.
- What must be preserved: existing placeholders, endpoint guard checklist, Dev Agent Record structure.

#### READ: `.agents/skills/bmad-create-story/checklist.md`

- Current state: broad quality checklist focused on preventing LLM developer mistakes.
- What this story changes: add explicit UI fidelity failure mode and review items.
- What must be preserved: adversarial quality-review intent and existing categories.

#### READ: `_bmad-output/project-context.md`

- Current state: already records approved UI fidelity rules.
- What this story changes: only update if a short extra implementation gate is needed. Avoid bloating project context.
- What must be preserved: lean AI-agent rules.

#### READ: `_bmad-output/planning-artifacts/ux-design-specification.md`

- Current state: contains Implementation fidelity gate and Phase 0.
- What this story changes: no required change unless a cross-reference is missing.
- What must be preserved: UX source of truth.

### Technical Requirements

- This story is documentation/process only.
- Do not edit application code.
- Do not change BMad workflow behavior in a way that prevents story creation or dev-story execution.
- Keep edits project-local under this repo.

### Testing Requirements

- Use `rg` and `git diff --check` as primary validation.
- No `npm run check` required unless application code changes, which should not happen.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 4.10, UX-DR35.
- `_bmad-output/planning-artifacts/ux-design-directions.html` - direction source.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-24-ui-fidelity-admin-shell.md` - approved change.
- `.agents/skills/bmad-create-story/template.md`
- `.agents/skills/bmad-create-story/checklist.md`
- `.agents/skills/bmad-dev-story/SKILL.md`
- `.agents/skills/bmad-code-review/SKILL.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `.agents/skills/bmad-create-story/template.md`
- `.agents/skills/bmad-create-story/checklist.md`
- `.agents/skills/bmad-dev-story/SKILL.md`
- `.agents/skills/bmad-code-review/SKILL.md`
- `_bmad-output/project-context.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`

### Completion Notes List

- Added `Design Direction Fidelity` subsection to `.agents/skills/bmad-create-story/template.md` with exact UX direction references, storefront/admin direction mapping, primitive state checks, layout-preservation guidance, and UI completion QA requirements.
- Added create-story checklist failure gates for UI fidelity drift, missing storefront/admin direction references, primitive state omissions, layout-preservation omissions, and weak type-check-only completion.
- Added dev-story Definition of Done UI fidelity QA gate requiring exact UX directions plus component visual-contract assertions, responsive/manual QA notes, or documented blocker.
- Validation passed: required `rg` found the new direction/FR/UX references and `git diff --check` was clean for changed docs.

### File List

- `_bmad-output/implementation-artifacts/4-10-future-story-ui-fidelity-gate.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `.agents/skills/bmad-create-story/template.md`
- `.agents/skills/bmad-create-story/checklist.md`
- `.agents/skills/bmad-dev-story/checklist.md`

### Change Log

- 2026-05-24: Created ready-for-dev story context.
- 2026-05-24: Implemented future UI fidelity gate guidance and moved story to review.
- 2026-05-24: Completed local code review and marked story done.
