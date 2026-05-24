---
workflowType: "correct-course"
mode: "batch"
status: "approved"
projectName: "jrw-webapp"
userName: "MR. JRW"
createdDate: "2026-05-24"
approvedDate: "2026-05-24"
triggerStory: "4-2/4-3 storefront product-card review and Epic 3 admin UI audit"
recommendedScope: "moderate"
---

# Sprint Change Proposal: UI Fidelity and Admin Shell Correction

Date: 2026-05-24
Project: jrw-webapp
Mode: Batch proposal
Status: Approved by MR. JRW on 2026-05-24
Owner: MR. JRW

## 1. Issue Summary

Current implementation has functional progress, but UI fidelity has drifted from `_bmad-output/planning-artifacts/ux-design-directions.html`.

Trigger:

- Product card looked like generic ecommerce card, while Direction 01 uses strict storefront grid modules: 1px dividers, 220px media block, compact metadata, sharp product cells, cobalt accent only for selected/primary/focus states.
- Current user-facing layout is acceptable. Problem is component visual design, not page layout.
- Admin side is materially incomplete against UX direction: current admin routes are standalone pages, not a dashboard console with sidebar/top context bar.
- Admin sign-in/logout/password reset UI is absent, and Admin registration/approval UI is not surfaced even though backend APIs exist.
- Shared button behavior differs from HTML reference: reference uses cobalt `outline: 2px solid var(--accent); outline-offset: 2px;` on hover/focus, while current `Button`/`IconButton` mainly change border color.

Evidence:

- UX spec says JRW has two primary surfaces: public storefront and internal admin command dashboard.
- UX spec requires admin dashboard shell with sidebar, top context bar, fixed dashboard structure, dense tables, filters, and side panels.
- HTML Direction 05 shows `Admin Catalog Console` with sidebar links, toolbar context, chips, primary `New Product`, and dense table.
- HTML Direction 07 shows Super Admin governance with owner controls/admin accounts table plus ownership transfer warning panel.
- PRD FR4 requires Admin can authenticate and access admin dashboard after activation.
- PRD FR76-FR78 require resource browse views, shared component-level specs, and Tailwind/JRW token implementation rules.
- Epic UX-DR10 requires `DashboardShell` with sidebar, top context bar, role badge, active brand scope, action/search region, admin and Super Admin scope states, forbidden/loading states, skip link, landmarks, and keyboard navigation.
- Code currently has admin pages under `src/pages/admin/**`, but no `src/pages/admin/index.astro`, no admin login/register/reset UI routes, and no shared `AdminLayout`/`DashboardShell`.
- Current admin pages import `BaseLayout`, e.g. `src/pages/admin/products/index.astro`, instead of admin dashboard layout.

## 2. Impact Analysis

Epic impact:

- Epic 1 remains functionally valid for auth APIs and governance foundation, but needs UI completion for admin auth entry points.
- Epic 3 is marked done, but Story 3.0 and 3.9 outcomes are incomplete from UI composition perspective because `DashboardShell`/admin console design was specified but not implemented as shared shell.
- Epic 4 is in progress and should pause after current product-card stopgap until storefront visual fidelity is corrected. Story 4.4 should not proceed before shared primitive/button and product-card/detail visual contract is locked.
- Epic 5 checkout will inherit bad UI if primitive corrections are delayed.
- Epic 6 admin order screens depend on admin shell/dashboard density. Implementing orders before admin shell would multiply rework.
- Epic 7 audit/governance pages depend on Direction 07 style and owner-only nav grouping.

Story impact:

- Do not reopen every completed story. Add correction stories and annotate future stories with stricter design acceptance criteria.
- Current 4-4 `Cart Add, Update, Remove` should remain ready-for-dev but blocked by a UI fidelity prerequisite.
- Current 4-7 `Storefront and Cart UI Primitive Extensions` should be pulled forward and expanded into shared visual contract work.
- New admin shell/auth stories should be inserted before Epic 6 admin order work, and ideally before more admin UI stories are created.

Artifact conflicts:

- PRD has correct goals, no MVP reduction needed.
- Epics need correction stories because current "done" status hides unimplemented UI shell/auth pages.
- Architecture already supports `src/components/layout/**` for `DashboardShell`, sidebar slots, top bars, and footer layout, but code does not yet implement it.
- UX docs are correct. Implementation must conform more strictly to HTML design directions.

Technical impact:

- Add shared admin layout/shell under `src/layouts` and/or `src/components/layout`.
- Add admin auth UI routes that consume existing `/api/admin/auth/*` endpoints.
- Add shared primitive styling correction for `Button`, `IconButton`, and related focus/hover states.
- Wrap current admin pages in admin shell without removing product table/list/card functionality.
- Add visual QA tests/manual checklist so future stories cannot pass while ignoring HTML directions.

## 3. Recommended Approach

Recommended path: Direct Adjustment with backlog reorganization.

Rationale:

- No rollback. Existing functionality is valuable and should be retained.
- No MVP scope reduction. Missing admin shell/auth UI is part of already stated MVP.
- Main issue is UI composition/fidelity, not domain logic.
- Fix should happen now, before more checkout/admin/order stories multiply the mismatch.

Scope classification: Moderate.

Estimated impact:

- Add 4 to 5 correction stories before continuing UI-heavy sprint work.
- Expected timeline impact: plus 2 to 4 implementation passes, depending visual QA depth.
- Risk if delayed: every future cart, checkout, order, audit, and admin page repeats same mismatch.
- Risk if rushed: visual style may improve while route protection/auth UX remains incomplete.

## 4. Detailed Change Proposals

### Story Proposal UI-1: Shared Primitive Visual Contract

Add new story before 4-4 or merge into expanded 4-7.

As a user,
I want shared controls to follow JRW HTML design behavior,
So that storefront, admin, and checkout interactions feel consistent.

Acceptance Criteria:

- Given `Button` or `IconButton` renders, when hover or focus-visible state is active, then cobalt outline appears with 2px width and 2px offset instead of only changing border color.
- Given primary button renders, when idle, then background and border use cobalt accent and text is white.
- Given secondary button renders, when idle, then it keeps white/surface background, 1px strong border, sharp corners, Space Mono/system label, and no shadow/blur.
- Given any shared primitive renders, when reviewed against HTML direction, then 0px radius, 1px borders, no shadow, no blur, visible focus, and tokenized cobalt accent are preserved.
- Given tests run, when primitive snapshots/classes are asserted, then button hover/focus class contract and accessible labels remain covered.

Files likely touched:

- `src/components/ui/Button.tsx`
- `src/components/ui/IconButton.tsx`
- `src/components/ui/ViewToggle.tsx`
- `src/components/primitives.test.ts`
- related component tests as needed

Old to new:

```md
OLD:
Story 4.7 extends primitives later during cart work.

NEW:
UI-1 runs before 4-4. Shared primitive hover/focus and visual contract are corrected first, then cart/storefront/admin compose those primitives.
```

### Story Proposal UI-2: Storefront Product Card and Detail Fidelity

Add new story before 4-4, or make it immediate correction follow-up to 4-2/4-3.

As a Prospect or Customer,
I want product browsing components to match JRW storefront design direction,
So that product grid feels like the approved architectural catalog, not a generic product card.

Acceptance Criteria:

- Given storefront product grid renders, when compared to Direction 01, then accepted page layout remains but product card design follows HTML module style.
- Given product image exists, when card renders, then media area keeps strict bordered module behavior and object-fit treatment without soft card shadow/rounded framing.
- Given product image is missing, when card renders, then diagonal placeholder pattern and numbered/initial module style follows HTML reference.
- Given product metadata renders, when card is scanned, then brand/category/status appear as compact slash-separated utility metadata.
- Given product price/action renders, when card is viewed, then price is compact and button uses shared primitive cobalt outline hover/focus behavior.
- Given card/list functionality exists, when design is updated, then existing card/list/table or browse behavior is preserved.
- Given layout has billboard hero or accepted storefront shell, when product card is changed, then hero and page structure are not removed.

Files likely touched:

- `src/features/product-catalog/components/ProductCard.tsx`
- `src/features/product-catalog/components/ProductGrid.tsx`
- `src/features/product-catalog/components/ProductCatalogPage.tsx` only if needed, layout-preserving only
- product catalog tests

Old to new:

```md
OLD:
Product card can satisfy functional product browse while looking like generic ecommerce card.

NEW:
Product card must explicitly match Direction 01 card anatomy while keeping current storefront layout and behavior.
```

### Story Proposal UI-3: Admin Shell, Navigation, and Session UI

Add correction story before more admin UI stories and before Epic 6.

As an Admin or Super Admin,
I want a protected admin dashboard shell with sign-in/logout/session UI,
So that admin work starts from a real console rather than disconnected standalone pages.

Acceptance Criteria:

- Given unauthenticated user opens `/admin`, when no valid `jrw_admin_session` exists, then Admin sign-in UI appears or redirects to admin sign-in route.
- Given Admin submits valid credentials, when `/api/admin/auth/sessions` succeeds, then dashboard-capable session is created and user lands on admin dashboard.
- Given Admin chooses logout, when `/api/admin/auth/sessions/current` succeeds, then session cookie is cleared and UI returns to sign-in state.
- Given password reset route is opened, when Admin requests reset or confirms reset, then UI consumes existing admin password reset APIs and does not create session on reset completion.
- Given Admin self-registration is enabled by product flag/config, when registration page is available, then registration UI clearly says approval is required before dashboard access.
- Given Admin self-registration is disabled, when user seeks registration, then UI points to Super Admin account creation instead of exposing unsupported signup.
- Given dashboard shell renders, when compared to Direction 05, then fixed sidebar/top context bar/role badge/action area are present.
- Given Super Admin renders shell, when owner-only nav group appears, then Admin Accounts, Ownership Transfer, and Audit are separated from daily admin nav.
- Given Admin lacks permission, when route is forbidden, then shell shows safe forbidden state and does not expose owner-only controls.

Files likely touched:

- `src/layouts/AdminLayout.astro` or `src/components/layout/DashboardShell.tsx`
- `src/pages/admin/index.astro`
- `src/pages/admin/sign-in.astro`
- `src/pages/admin/password-reset.astro`
- optional `src/pages/admin/register.astro` gated by flag/story decision
- `src/features/admin-auth/**`
- admin auth UI tests

Old to new:

```md
OLD:
Admin pages use `BaseLayout` individually and rely on existing backend auth APIs without visible admin entry UI.

NEW:
Admin routes use shared dashboard shell and expose sign-in/logout/password reset UI. Registration UI exists only when enabled by product decision.
```

### Story Proposal UI-4: Admin Dashboard Console Fidelity

Add correction story after UI-3.

As an Admin,
I want product, brand, category, inventory, and owner pages inside the JRW admin console,
So that existing functionality remains but feels like the approved operational dashboard.

Acceptance Criteria:

- Given Admin opens `/admin/products`, when page loads, then content appears inside dashboard shell with sidebar, top context bar, toolbar row, dense table-first work area, and side panel/editor flow.
- Given Products dashboard view toggle exists, when Admin switches table/list, then existing table/list functionality remains.
- Given Brand resource views exist, when wrapped in shell, then card/list functionality remains and visual treatment aligns to 1px module system.
- Given Categories page renders, when wrapped in shell, then table density, toolbar, empty/loading/error states use same JRW primitives.
- Given Super Admin opens owner transfer/governance, when page renders, then Direction 07 owner controls/governance panel style is followed.
- Given narrow tablet viewport, when admin shell renders, then shell remains usable, landmarks/skip links work, and no table/action text overflows.
- Given tests run, when admin pages are verified, then existing data/actions still pass and visual shell classes are covered.

Files likely touched:

- `src/pages/admin/products/index.astro`
- `src/pages/admin/brands/index.astro`
- `src/pages/admin/categories/index.astro`
- `src/pages/admin/owner/transfer.astro`
- `src/features/admin-products/components/ProductListDashboard.tsx`
- `src/features/brands/components/BrandList.tsx`
- `src/features/admin-categories/components/CategoryList.tsx`
- `src/features/owner-governance/OwnershipTransferPanel.tsx`
- shared layout/components/tests

Old to new:

```md
OLD:
Admin resources are standalone max-width pages with useful tables/forms but no shared command-dashboard composition.

NEW:
Admin resources retain current CRUD/search/table/list behavior but render inside Direction 05/07 dashboard console.
```

### Story Proposal UI-5: Future Story UI Fidelity Gate

Add planning/process story or update story template/checklist.

As project owner,
I want every future UI story to name exact UX direction references,
So that sprint creation does not repeat design mismatch.

Acceptance Criteria:

- Given new UI story is created, when story touches storefront, then it cites Direction 01/02/03/04 as applicable and includes visual fidelity ACs.
- Given new UI story is created, when story touches admin, then it cites Direction 05/07 as applicable and includes shell/sidebar/topbar/table density ACs.
- Given shared primitive is changed, when story is reviewed, then button/focus/hover/status/empty/loading states are checked against HTML direction and UX spec.
- Given implementation is reviewed, when `npm run check` passes, then reviewer still verifies visual contract manually or through component tests.
- Given story is marked done, when UI fidelity gate is incomplete, then story cannot be considered fully done.

Files likely touched:

- `_bmad-output/implementation-artifacts` story template or future story docs
- `_bmad-output/planning-artifacts/epics.md`
- optional UI QA checklist artifact

Old to new:

```md
OLD:
Stories cite broad UX rules, but implementation can pass with generic-looking UI.

NEW:
Stories include exact HTML direction reference and specific visual acceptance criteria before sprint execution.
```

## 5. Implementation Handoff

Handoff classification: Moderate.

Recommended sequence:

1. Approve this proposal.
2. Update epics/backlog with UI-1 through UI-5 or equivalent story IDs.
3. Move expanded 4-7 primitive work before 4-4.
4. Complete UI-1 shared primitive contract.
5. Complete UI-2 storefront product-card/detail fidelity while preserving accepted layout.
6. Complete UI-3 admin shell/auth/session UI.
7. Complete UI-4 admin dashboard console wrap while preserving existing admin functionality.
8. Add UI-5 gate to story creation/review process.
9. Resume 4-4 cart work and future checkout/admin/order stories.

Developer responsibilities:

- Implement shared primitives and layouts using existing Tailwind v4 tokens.
- Preserve existing working functionality, especially product card/list/table and admin resource actions.
- Keep auth behavior tied to existing backend endpoints and `jrw_admin_session`.
- Avoid obsolete roles, tenant/store language, or unsupported admin OAuth.

Product Owner responsibilities:

- Decide whether Admin self-registration UI is enabled for MVP or deferred behind Super Admin account creation only.
- Approve story insertion/resequencing.
- Confirm admin nav labels and owner-only nav grouping.

Architect responsibilities:

- Validate `AdminLayout`/`DashboardShell` placement and route protection pattern.
- Ensure shell/auth UI does not weaken server-side RBAC/session authority.

Success criteria:

- Product card no longer looks like generic ecommerce card; it matches Direction 01 visual anatomy.
- Accepted storefront page layout remains intact.
- Shared buttons use cobalt outline hover/focus behavior from HTML direction.
- `/admin` exists as dashboard entry.
- Admin sign-in/logout/password reset UI exists.
- Admin registration UI exists only if enabled and clearly communicates approval gate.
- Admin resource pages render inside dashboard shell with sidebar/top context bar.
- Product/brand/category/card/list/table functionality remains intact.
- Future UI stories cite exact HTML design directions and include fidelity ACs.

## 6. Checklist Status

- 1.1 Triggering story identified: Done. Trigger surfaced during product catalog/card UI review after Epic 4 storefront stories and audit of Epic 3 admin UI.
- 1.2 Core problem defined: Done. Misunderstanding/under-enforcement of original UI fidelity requirements, plus missing admin shell/auth UI.
- 1.3 Evidence gathered: Done. UX spec, HTML directions, PRD FRs, epics, and code routes/components inspected.
- 2.1 Current epic impact: Done. Epic 4 should pause before 4-4 for UI prerequisite.
- 2.2 Epic-level changes: Done. Add correction stories rather than reopening all completed stories.
- 2.3 Future epic impact: Done. Epics 5, 6, and 7 depend on shared primitives/admin shell.
- 2.4 Obsolete epic check: Done. No epic invalidated.
- 2.5 Priority/order check: Done. Pull primitive and shell correction earlier.
- 3.1 PRD conflict check: Done. PRD remains valid; implementation is incomplete against PRD UI/auth goals.
- 3.2 Architecture impact: Done. Architecture supports shell; code needs implementation.
- 3.3 UI/UX impact: Done. HTML directions should become explicit acceptance criteria.
- 3.4 Secondary artifacts: Done. Story template/QA checklist should be updated.
- 4.1 Direct Adjustment: Viable. Medium-high effort, medium risk.
- 4.2 Rollback: Not viable. Existing functionality should be retained.
- 4.3 MVP Review: Not needed. MVP scope remains achievable.
- 4.4 Recommended path: Done. Direct Adjustment with backlog reorganization.
- 5.1 Issue summary: Done.
- 5.2 Impact and artifact adjustments: Done.
- 5.3 Path forward: Done.
- 5.4 MVP/action plan: Done.
- 5.5 Agent handoff: Done.
- 6.1 Checklist review: Done.
- 6.2 Proposal accuracy: Done.
- 6.3 User approval: Done. MR. JRW approved with "C go update everything now" on 2026-05-24.
- 6.4 Sprint-status update: Done. Added `3-10`, `3-11`, `4-8`, `4-9`, and `4-10`; reopened Epic 3 for post-retro UI correction; marked correction sequence before 4-4.
- 6.5 Handoff confirmation: Done. Backlog/story docs now route implementation to correction stories before cart/checkout/admin expansion.

## 7. Approval Record

Approved.

Updated artifacts:

- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/4-4-cart-add-update-remove.md`
