# Story {{epic_num}}.{{story_num}}: {{story_title}}

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a {{role}},
I want {{action}},
so that {{benefit}}.

## Acceptance Criteria

1. [Add acceptance criteria from epics/PRD]

## Tasks / Subtasks

- [ ] Task 1 (AC: #)
  - [ ] Subtask 1.1
- [ ] Task 2 (AC: #)
  - [ ] Subtask 2.1

## Endpoint Guard Checklist

Complete for every new or changed endpoint. Mark non-applicable items as `N/A` with reason.

- [ ] Route auth metadata declares public/optional/required auth, roles, and rate-limit class.
- [ ] Route-level RBAC guard runs before validation or side effects for protected endpoints.
- [ ] Service/controller enforces actor state before mutation: authenticated, active, verified, approved.
- [ ] Brand-scoped reads or writes enforce active brand membership or elevated permission server-side.
- [ ] Public/customer endpoints explicitly document why brand membership is not required.
- [ ] Denial tests cover unauthenticated actor, wrong role, invalid account state, missing brand membership, and elevated actor path where applicable.
- [ ] Error response uses safe envelope codes and does not leak provider/internal authorization details.
- [ ] OpenAPI/endpoint catalog lists auth mode, roles, rate-limit class, and denial codes.

## Dev Notes

- Relevant architecture patterns and constraints
- Source tree components to touch
- Testing standards summary
- For endpoint stories, fill guard-denial cases from `.agents/skills/bmad-create-story/guard-denial-test-template.md`.

### Design Direction Fidelity

- If this story touches UI, cite `_bmad-output/planning-artifacts/ux-design-directions.html` and exact direction numbers in Acceptance Criteria and Dev Notes.
- Storefront UI must cite Direction 01, 02, 03, or 04 as applicable and name exact product/card/detail/cart/checkout fidelity checks.
- Admin UI must cite Direction 05 or 07 as applicable and name shell, sidebar, topbar, table-density, and governance fidelity checks.
- Shared primitives must cover hover, focus-visible, status, empty, loading, disabled, and error states against the HTML direction and UX spec.
- Preserve accepted page layout while changing component visual anatomy unless the story explicitly approves layout changes.
- Button and IconButton hover/focus must use 2px cobalt outline with 2px offset.
- Done requires component class assertions, responsive/manual QA notes, or a documented QA blocker; type checks alone are not enough for UI completion.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Detected conflicts or variances (with rationale)

### References

- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
