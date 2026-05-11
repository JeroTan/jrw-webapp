# BMAD Guide for JRW Simple E-commerce

This guide explains how to evaluate and use BMAD Method in this existing JRW codebase, especially if we later migrate from the custom Tangram workflow.

BMAD should be treated as a possible successor workflow, not as a second source of truth running beside Tangram forever.

## 1. What BMAD Is

BMAD Method is an AI-assisted software delivery workflow built around specialized agents and staged artifacts:

```text
Analysis -> Planning -> Solutioning -> Implementation
```

The main BMAD Method track produces:

- `PRD.md`
- `architecture.md`
- epics and stories
- `project-context.md`
- `sprint-status.yaml`

For this repo, BMAD is most useful because it gives us a maintained structure for requirements, architecture, implementation readiness, story creation, coding, review, and sprint tracking.

Official references:

- Getting started: https://docs.bmad-method.org/tutorials/getting-started/
- Existing projects: https://docs.bmad-method.org/how-to/established-projects/
- Workflow map: https://docs.bmad-method.org/reference/workflow-map/
- Project context: https://docs.bmad-method.org/explanation/project-context/
- Install guide: https://docs.bmad-method.org/how-to/install-bmad/

## 2. Best Fit for This Project

Use the full BMAD Method track, not Quick Flow, when the work is a meaningful ecommerce feature such as:

- Durable Object inventory locking
- authorization middleware
- catalog CRUD persistence
- checkout and PayMongo integration
- Resend transactional email flows
- admin command center UI
- storefront UI

Use Quick Flow only for small, clear updates such as:

- fixing a narrow type error
- updating a small route contract
- cleaning documentation drift
- adding a focused utility

This project already has enough domain complexity that the full BMAD flow is the better default for major work.

## 3. Install BMAD

Before installing, start from a clean Git state if possible. The installer writes workflow files into the repo.

Check supported tools first:

```powershell
npx bmad-method install --list-tools
```

Install interactively:

```powershell
npx bmad-method install
```

Recommended choices for this repo:

- Install directory: current project root.
- Module: BMAD Method.
- Channel: stable.
- Tool integration: choose the AI coding tool you will actually use for BMAD commands.
- Output folder: accept BMAD default unless you intentionally want a different artifact path.

The installer should create:

```text
_bmad/
_bmad-output/
```

After install, run:

```text
bmad-help
```

`bmad-help` is the BMAD guide skill. It inspects what is installed and recommends the next workflow.

## 4. Existing Project Onboarding

Because JRW is not a new project, do not start BMAD as if the repo is empty.

Recommended first BMAD task:

```text
bmad-generate-project-context
```

This should create or help create:

```text
_bmad-output/project-context.md
```

That file should capture the real current system:

- Astro server output
- Cloudflare Workers runtime
- Cloudflare D1 with Drizzle ORM
- Elysia route/controller/service pattern
- Zod and TypeBox validation layers
- R2 helper utilities
- Durable Object scaffold, not yet real stock locking
- admin login implemented, most other APIs intentionally mocked
- no authorization middleware yet
- no `any` types without explicit approval
- Remote-first D1 migrations during development

Treat `project-context.md` like BMAD's version of the Tangram constitution plus architecture memory.

## 5. Tangram to BMAD Migration Map

Tangram remains useful as source material, but it must be validated against code before becoming BMAD memory.

Use this map:

| Tangram Source                             | BMAD Target                                | Rule                                                            |
| ------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------- |
| `tangram/studies/business-requirements.md` | `PRD.md`                                   | Convert requirements, personas, NFRs, and scope.                |
| `tangram/studies/feature-backlog.md`       | `PRD.md` and epics                         | Convert active backlog into epics and stories.                  |
| `tangram/design/architecture.md`           | `architecture.md`                          | Convert current architecture only after checking code.          |
| `tangram/design/security.md`               | `architecture.md` and `project-context.md` | Keep current implemented/planned distinction.                   |
| `tangram/design/stack.md`                  | `architecture.md` and `project-context.md` | Keep installed vs planned dependencies separate.                |
| `tangram/design/deployment.md`             | `architecture.md`                          | Reflect actual Cloudflare scripts and missing CI status.        |
| `tangram/constitution.md`                  | `project-context.md`                       | Convert non-negotiable rules into concise implementation rules. |
| `tangram/archive/**`                       | epics, stories, sprint history             | Use as history, not as current truth.                           |

Never blindly copy Tangram into BMAD. Tangram has history, but the codebase is the source of truth.

## 6. Recommended Migration Order

When you decide to test BMAD seriously, follow this order:

1. Install BMAD.
2. Run `bmad-help`.
3. Generate `_bmad-output/project-context.md`.
4. Review `project-context.md` against the current codebase.
5. Create a BMAD PRD from validated Tangram studies.
6. Create BMAD architecture from validated Tangram design docs.
7. Create epics and stories from PRD plus architecture.
8. Run implementation readiness check.
9. Initialize sprint planning.
10. Start implementing one story at a time.

This avoids the biggest migration risk: copying old drift into a new workflow.

## 7. Core BMAD Commands

Use these in fresh chats unless the BMAD skill says otherwise.

| BMAD Command                          | Use                                                       | Tangram Equivalent                                          | Gap / Note                                                                 |
| ------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| `bmad-help`                           | Ask what to do next. Start here after install.            | `tangram-help`, `tangram-workflow`, `tangram-start`         | Tangram has help, but BMAD is more explicit about next workflow selection. |
| `bmad-generate-project-context`       | Capture existing codebase rules and patterns.             | `tangram-align`, `explore-legacy`, `tangram-constitution`   | Tangram has pieces, but no single generated `project-context.md`.          |
| `bmad-create-prd`                     | Create requirements for the project or major feature set. | `tangram-define`, `tangram-explore`, `explore-requirements` | Tangram spreads PRD content across studies instead of one PRD artifact.    |
| `bmad-create-architecture`            | Create architecture from PRD and current constraints.     | `tangram-design`, `design-architecture`                     | Strong equivalent. BMAD expects architecture to flow directly from PRD.    |
| `bmad-create-epics-and-stories`       | Break requirements into implementable work.               | `explore-feature-backlog`, `tangram-plan`                   | Tangram has backlog and plans, but not formal epic/story artifacts.        |
| `bmad-check-implementation-readiness` | Validate PRD, architecture, and stories before coding.    | `tangram-agenda`, `tangram-plan`, `tangram-conditioning`    | Tangram lacks a single hard readiness gate before implementation.          |
| `bmad-sprint-planning`                | Create sprint tracking.                                   | `tangram-plan`                                              | Tangram plans features, but has no `sprint-status.yaml` style tracker.     |
| `bmad-create-story`                   | Prepare one focused implementation story.                 | `tangram-agenda`, `tangram-plan`                            | Tangram plans at feature/task level; BMAD story files are more explicit.   |
| `bmad-dev-story`                      | Implement one story.                                      | `tangram-execute`                                           | Strong equivalent. BMAD narrows work around a single story artifact.       |
| `bmad-code-review`                    | Review implemented code.                                  | No direct Tangram command                                   | Tangram can debug/check, but has no dedicated review command.              |
| `bmad-sprint-status`                  | Check story/sprint progress.                              | No direct Tangram command                                   | Tangram archive shows history, but lacks live sprint status tracking.      |
| `bmad-retrospective`                  | Review an epic after completion.                          | `tangram-complete`                                          | Tangram completes and archives; BMAD retrospective is more analytical.     |
| `bmad-correct-course`                 | Adjust plan after a major direction change.               | `tangram-align`, `tangram-debug`, `tangram-revert`          | Tangram has repair tools, but no named course-correction workflow.         |
| `bmad-quick-dev`                      | Use only for small, clear, low-risk changes.              | No direct Tangram command                                   | Tangram is process-heavy; quick low-risk changes are handled ad hoc.       |

Tangram commands with no close BMAD command:

| Tangram Command        | What It Does                                   | BMAD Note                                                                   |
| ---------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| `tangram-commit`       | Git branch, commit, and push workflow.         | BMAD assumes normal Git/tooling around the workflow.                        |
| `tangram-revert`       | Roll back to the last stable Git commit.       | BMAD has `correct-course`, but not a Git rollback command.                  |
| `tangram-conditioning` | Run QA checks such as typecheck/lint/test.     | BMAD uses review/readiness patterns; local verification remains separate.   |
| `tangram-setup`        | Scaffold from approved design/stack decisions. | BMAD has planning/architecture, but setup is usually handled by dev story.  |
| `tangram-constitution` | Maintain project laws and non-negotiables.     | BMAD would put these into `project-context.md` and architecture rules.      |
| `design-stack`         | Dedicated technology-stack research/update.    | BMAD architecture covers stack, but Tangram splits it into a focused step.  |
| `design-security`      | Dedicated security design/update.              | BMAD architecture covers security, but Tangram keeps it as a pillar.        |
| `design-deployment`    | Dedicated deployment design/update.            | BMAD architecture covers deployment, but Tangram keeps it as a pillar.      |
| `design-ui`            | Dedicated UI/UX design/update.                 | BMAD can model UI in PRD/architecture, but Tangram has a focused UI pillar. |

## 8. Daily Usage Pattern

For major features, use this rhythm:

```text
bmad-help
bmad-create-story
bmad-dev-story
bmad-code-review
bmad-sprint-status
```

For feature planning:

```text
bmad-create-prd
bmad-create-architecture
bmad-create-epics-and-stories
bmad-check-implementation-readiness
bmad-sprint-planning
```

For this repo, each story should still respect local verification:

```powershell
npm run check
npm run build
```

Run tests when test files exist:

```powershell
npm test -- --run
```

## 9. JRW-Specific BMAD Rules

Carry these rules into BMAD artifacts:

- Actual code is the source of truth.
- Do not claim middleware exists until implemented.
- Do not claim Durable Object inventory locking exists until implemented.
- Mocks are intentional until the matching feature story replaces them.
- Keep installed dependencies separate from planned dependencies.
- Use Cloudflare D1 and Drizzle, not Supabase.
- Apply D1 migrations remotely to the Cloudflare development environment unless specifically doing isolated local tests.
- Keep `Route -> Controller -> Service` boundaries.
- Routes define contract and docs.
- Controllers translate request context and response status.
- Services own business behavior.
- `src/lib/**` is for third-party wrappers.
- `src/utils/**` is for atomic independent helpers.
- Avoid `any` unless explicitly approved.

## 10. When to Keep Tangram Around

Keep Tangram during the BMAD trial for:

- archive history
- original intent
- design rationale
- recovery context
- comparison against BMAD output

Do not keep writing new active plans into both systems. Once BMAD is accepted, Tangram should become legacy memory, not a parallel workflow.

## 11. First Trial Recommendation

The safest BMAD trial is not to migrate the entire project immediately.

Use BMAD for the next major feature, likely one of:

- authorization middleware
- Durable Object stock locking
- catalog CRUD persistence

Recommended trial path:

1. Install BMAD.
2. Generate `project-context.md`.
3. Create one epic/story for the selected feature.
4. Run implementation readiness.
5. Implement exactly one story.
6. Compare BMAD's output quality against Tangram.

If the first story feels clearer, more maintainable, and less drift-prone, BMAD becomes the real migration candidate.
