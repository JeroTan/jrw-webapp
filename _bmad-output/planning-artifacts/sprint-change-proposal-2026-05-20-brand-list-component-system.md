---
workflowType: "correct-course"
mode: "batch"
status: "approved"
projectName: "jrw-webapp"
userName: "MR. JRW"
createdDate: "2026-05-20"
triggerStory: "2-7-brand-membership-ui-and-language-guardrails"
recommendedScope: "minor-to-moderate"
---

# Sprint Change Proposal: Brand List Browse Controls and Admin Component System

## 1. Issue Summary

**Trigger:** Story 2.7 delivered brand management UI after Epic 2, but post-retro review found the brand list UX still feels table-heavy and the page descriptions drifted into technical/business policy instead of useful UI copy. MR. JRW also raised missing component-level detail for shared website/admin structure such as sidebar, navbar, footer, view toggles, search, cards, and loading skeletons.

**Core problem:** Current UX artifacts say "table-first admin dashboard" and mention component names, but do not sufficiently define when admin resources should use responsive cards, list/table views, search controls, or reusable layout components. This gap caused AI implementation to over-index on dense tables and policy copy, instead of a digestible admin resource browser.

**Evidence:**

- Brand list screen reads better as responsive cards for scanning brand name, status, members, pending invites/requests, and linked products.
- Draft reference shows a simple card module: large brand name, divider line, compact metadata/action area.
- Existing UX already allows dashboard tables to collapse to row cards on tablet, but Story 2.7 did not make card/list toggle explicit.
- Existing Skeleton primitive uses custom `jrw-skeleton` CSS animation instead of Tailwind `animate-pulse`; standard is unclear.
- Existing docs mention `DashboardShell`, sidebar, top context bar, tables, skeletons, and navigation, but lack component anatomy and usage rules.

## 2. Checklist Findings

- [x] 1.1 Trigger story identified: Story 2.7, Brand Membership UI and Language Guardrails.
- [x] 1.2 Problem type: misunderstanding/gap in original UX detail plus new stakeholder requirement.
- [x] 1.3 Evidence captured: user feedback, draft card reference, existing artifact gaps.
- [x] 2.1 Current epic impact: Epic 2 remains complete; do not reopen unless final implementation proves defect severity.
- [x] 2.2 Epic-level changes needed: add a bridge story before Epic 3 work so catalog/admin UI patterns harden before more screens are built.
- [x] 2.3 Future epic impact: Epic 3 and Epic 4 benefit from resource-card/search/view-toggle rules; no epic invalidated.
- [x] 2.4 New epic not needed; add story and artifact edits within existing plan.
- [x] 2.5 Priority: implement before Epic 3 admin catalog UI grows.
- [x] 3.1 PRD needs small UX requirement additions; MVP still achievable.
- [x] 3.2 Architecture needs component inventory/detail additions; no stack or data changes.
- [x] 3.3 UX spec needs resource browser/card/list/search/skeleton standards.
- [x] 3.4 Secondary docs: project context and Stitch doc should keep microcopy and component guidance.
- [x] 4.1 Direct adjustment viable; effort low-medium, risk low.
- [x] 4.2 Rollback not viable; no completed story rollback needed.
- [x] 4.3 MVP review not needed; scope improves implementation quality.
- [x] 4.4 Recommended path: Direct Adjustment with new bridge story in Epic 3.
- [x] 5.1-5.5 Proposal sections and handoff included below.
- [x] 6.3 Approved by MR. JRW on 2026-05-20.
- [x] 6.4 Sprint status updated with Story 3.0 backlog entry.

## 3. Impact Analysis

### Epic Impact

**Epic 2:** Keep done. Story 2.7 remains the implementation source for brand UI. If implementation change is approved, record it as post-retro follow-up or apply through new bridge story, not by silently reopening Epic 2.

**Epic 3:** Add a first bridge story before category/product catalog work:

`3-0-admin-resource-browser-and-component-system`

This story defines and implements reusable admin resource browsing controls and applies them to `/admin/brands` as the first real surface.

**Epic 4:** Storefront shell/navigation work benefits from clearer navbar/footer/component specs, but no sequencing change needed.

### Story Impact

Affected completed story:

- `2-7-brand-membership-ui-and-language-guardrails`: document post-retro follow-up and keep current completion status.

New story recommended:

- `3.0: Admin Resource Browser and Component System`

Future stories should reference the new component system:

- `3.1-manage-product-categories`
- `3.2-create-and-edit-product-identity`
- `3.9-admin-product-editor-variant-matrix-and-inventory-ui`
- `4.1-storefront-shell-design-tokens-and-public-navigation`
- `4.7-storefront-and-cart-ui-primitive-extensions`

### Artifact Conflicts

**PRD:** Existing requirements support admin dashboard and UX, but no explicit FR for view modes/searchable resource browsers. Add a small functional requirement or UX note.

**UX Design:** Existing spec says table-first and "no card-heavy dashboard layout." That remains correct for dense operational screens, but needs nuance: resource overview pages may use digestible cards with optional list/table view.

**Architecture:** Existing component boundaries list navigation/layout/feedback/data-display, but do not define component inventory. Add reusable components such as `DashboardShell`, `SidebarNav`, `TopBar`, `PageToolbar`, `SearchInput`, `ViewToggle`, `ResourceCard`, `ResourceList`, and `Skeleton`.

**Project Context / Stitch Docs:** Already updated with microcopy guardrails; keep and extend with resource-browser guidance after approval if needed.

### Technical Impact

No backend schema/API change.

Frontend changes expected later:

- `/admin/brands` supports search, card/list toggle, and responsive cards.
- `BrandList` may become `BrandBrowser` or use new generic primitives.
- Add or extend shared primitives:
  - `SearchInput`
  - `ViewToggle` / segmented control usage
  - `ResourceCard`
  - `ResourceBrowserToolbar`
- `Skeleton` standard clarified:
  - Use stable dimensions.
  - Use pulse animation only through one approved path: `motion-safe:animate-pulse` if Tailwind utility is used, or centralized `jrw-skeleton` CSS if kept.
  - Always respect `prefers-reduced-motion`.

## 4. Recommended Approach

**Path:** Direct Adjustment.

**Scope classification:** Minor-to-moderate.

**Rationale:** This is UX/system correction, not product pivot. It does not change domain model, roles, payment, brand APIs, or data. It prevents future admin UI drift before Epic 3 starts, and it avoids reopening a completed Epic 2 after retrospective.

**Timing:** Before Epic 3 implementation begins.

**Risk:** Low.

**Risk if skipped:** Product/category/order/admin screens may each invent their own card/list/search/loading patterns, causing inconsistent UX and more rework.

## 5. Detailed Change Proposals

### PRD Changes

Section: `Functional Requirements -> Architecture & Documentation`

OLD:

```md
FR74: Project can provide a migration or deprecation plan for legacy API behavior before broad rebuild implementation.
FR75: Project can maintain identity-realm boundary documentation and regression tests that prevent customer-facing code from querying Admin account storage and prevent Admin auth code from querying Customer account storage.
```

NEW:

```md
FR74: Project can provide a migration or deprecation plan for legacy API behavior before broad rebuild implementation.
FR75: Project can maintain identity-realm boundary documentation and regression tests that prevent customer-facing code from querying Admin account storage and prevent Admin auth code from querying Customer account storage.
FR76: Admin resource pages can provide searchable, responsive browse controls with appropriate card/list/table views so records are digestible without losing dense operational scanning.
FR77: Project can maintain component-level UI specifications for shared shell, navigation, footer, toolbar, view toggle, search, card/list/table, loading, empty, and permission patterns.
```

Rationale: Adds product-level support for card/list/search resource browsing and component inventory without changing domain scope.

### UX Design Changes

Section: `Component Strategy -> Design System Components`

OLD:

```md
Foundation primitives:

- Button / IconButton
- Input / Textarea / Select
- Checkbox / Toggle
- Badge / StatusBadge
- Tabs / SegmentedControl
- DataTable
- Modal / Drawer / SidePanel
- Toast / ConfirmDialog
- EmptyState / Skeleton
- Pagination / Stepper
```

NEW:

```md
Foundation primitives:

- Button / IconButton
- Input / Textarea / Select / SearchInput
- Checkbox / Toggle
- Badge / StatusBadge
- Tabs / SegmentedControl / ViewToggle
- DataTable / ResourceList / ResourceCard
- PageToolbar / FilterBar / Pagination
- Modal / Drawer / SidePanel
- Toast / ConfirmDialog
- EmptyState / Skeleton
- Stepper
```

Section: `UX Consistency Patterns -> Admin`

OLD:

```md
Admin:
- Sidebar: Dashboard, Products, Brands, Inventory, Orders, Customers, Audit, Settings.
- Top context bar: role, active brand scope, search/action area.
- Tables lead to side panels or detail pages.
```

NEW:

```md
Admin:
- Sidebar: Dashboard, Products, Brands, Inventory, Orders, Customers, Audit, Settings.
- Top context bar: role, active brand scope, search/action area.
- Resource overview pages use a toolbar with search/filter controls on the left and view toggle/actions on the right.
- Dense operational datasets default to table/list. Digestible resource overviews may default to responsive cards with optional list/table view.
- Tables, lists, or cards lead to side panels or detail pages.
```

Section: `Component Strategy -> Add Custom Component`

NEW:

```md
### ResourceBrowser

**Purpose:** Let Admin browse manageable records with search, optional filters, and a view mode suited to the record type.

**Usage:** Brands, categories, products, orders, customers, audit where appropriate.

**Anatomy:** Page title/description, toolbar, search input, optional filters, view toggle, card/list/table region, pagination, empty state, skeleton state.

**States:** Loading, empty, filtered empty, cards, list/table, permission-limited, error.

**Accessibility:** Search has visible label, view toggle exposes selected mode, cards/list rows are keyboard reachable, status text is not color-only.
```

Section: `Brand language`

ADD as UX-DR34 because UX-DR32 and UX-DR33 already exist:

```md
Brand overview pages may use cards. Card content should prioritize brand name, status, member count, pending invitations/requests, linked product count, and primary action. Avoid policy lectures in card descriptions.
```

Section: `Feedback Patterns -> Loading`

OLD:

```md
- Skeletons for product grid, tables, order timeline.
- Stable dimensions; loading must not shift layout.
```

NEW:

```md
- Skeletons for product grid, tables, cards, order timeline.
- Stable dimensions; loading must not shift layout.
- Skeleton animation must respect reduced motion. Use one standard: `motion-safe:animate-pulse` where Tailwind utilities are used, or centralized `jrw-skeleton` CSS that mirrors pulse behavior.
```

### Architecture Changes

Section: `Component Boundaries`

OLD:

```md
- `src/components/layout/**` for shells and page frames.
- `src/components/navigation/**` for nav, breadcrumbs, tabs, and menus.
- `src/components/data-display/**` for tables, status indicators, timelines, and list primitives.
```

NEW:

```md
- `src/components/layout/**` for `DashboardShell`, storefront shell, page frames, sidebar slots, top bars, and footer layout.
- `src/components/navigation/**` for `SidebarNav`, `TopNav`, breadcrumbs, tabs, menus, and view toggles when navigation-like.
- `src/components/data-display/**` for `DataTable`, `ResourceCard`, `ResourceList`, status indicators, timelines, and list primitives.
- `src/components/ui/**` for `SearchInput`, `SegmentedControl`, `ViewToggle`, and low-level interactive controls.
- `src/components/feedback/**` for `Skeleton`, empty states, toasts, and error states.
```

Section: `Loading State Patterns`

OLD:

```md
- Tables/grids use stable skeletons.
```

NEW:

```md
- Tables, grids, cards, and lists use stable skeletons.
- Skeleton pulse behavior is centralized and reduced-motion safe.
```

### Epics And Stories Changes

Section: `UX Design Requirements`

OLD:

```md
UX-DR11: Implement table-first admin dashboard patterns: dense tables, filters, status bands, side panels, stable skeletons, row drill-in, visible request ID where safe, and no card-heavy dashboard layout.
```

NEW:

```md
UX-DR11: Implement admin resource browsing patterns: dense tables for operational datasets, responsive cards for digestible resource overviews, search/filter toolbars, view toggles where useful, status bands, side panels, stable skeletons, row/card drill-in, visible request ID where safe, and no decorative card-heavy dashboard layout.
```

ADD:

```md
UX-DR34: Define and implement shared component-level specs for DashboardShell, SidebarNav, TopBar, Footer, PageToolbar, SearchInput, ViewToggle, ResourceCard, ResourceList, DataTable, EmptyState, and Skeleton so future admin/storefront work reuses consistent primitives.
```

Add new story before Epic 3 Story 3.1:

```md
### Story 3.0: Admin Resource Browser and Component System

As an Admin,
I want searchable resource pages with clear card/list/table patterns,
So that brands, catalog records, and future admin resources are easy to scan and manage.

**Requirements covered:** FR76, FR77; supports UX-DR10, UX-DR11, UX-DR21, UX-DR23, UX-DR29, UX-DR34.

**Acceptance Criteria:**

**Given** Admin opens `/admin/brands`
**When** brands load
**Then** default view shows responsive brand cards with brand name, status, member count, pending invites/requests, linked product count, and primary action
**And** card design follows the sharp 1px JRW module style.

**Given** Admin uses the brand resource toolbar
**When** Admin searches by brand name or slug
**Then** matching cards/list rows are shown
**And** empty search state states no matching brands and offers a clear reset action.

**Given** Admin changes view mode
**When** card/list toggle is used
**Then** selected mode persists during the current page session
**And** both modes expose the same important fields and actions.

**Given** brand data is loading
**When** skeleton renders
**Then** skeleton dimensions match the target card/list layout
**And** pulse animation respects reduced motion using the approved skeleton standard.

**Given** component inventory is documented
**When** future admin pages are built
**Then** specs exist for DashboardShell, SidebarNav, TopBar, Footer, PageToolbar, SearchInput, ViewToggle, ResourceCard, ResourceList, DataTable, EmptyState, and Skeleton.

**Given** accessibility QA runs
**When** keyboard and screen-reader checks are performed
**Then** search, view toggle, card actions, list actions, focus states, status labels, and empty/loading states are usable without relying on color alone.

**Given** implementation finishes
**When** tests/checks run
**Then** tests cover search filtering, card/list toggle, brand card copy, skeleton markup, reduced-motion behavior where testable, and accessibility basics
**And** `npm run check` passes or blocker is documented.
```

Sprint status addition after approval:

```yaml
  3-0-admin-resource-browser-and-component-system: backlog
```

Place before:

```yaml
  3-1-manage-product-categories: backlog
```

## 6. Implementation Handoff

**Developer agent:**

- Implement Story 3.0 after approval.
- Start with shared component API decisions, then apply to `/admin/brands`.
- Do not alter backend brand APIs unless linked product counts require endpoint support. If counts are not available, show "Unavailable" or defer product count API work explicitly.
- Test only changed component behavior.

**Product/UX agent:**

- Apply PRD, UX, Architecture, and Epics edits after approval.
- Keep component inventory concise and actionable.
- Preserve "table-first" intent for dense operations while allowing cards for resource overview pages.

**User approval needed:**

- Approve adding Story 3.0.
- Approve whether brand cards are default view or only tablet/mobile default.
- Approve skeleton standard:
  - Option A: central `jrw-skeleton` CSS pulse (current pattern).
  - Option B: Tailwind `motion-safe:animate-pulse` in `Skeleton`.

## 7. Recommendation

Approve proposal with this default:

- Add Story 3.0 to Epic 3 backlog.
- Brand list defaults to card view.
- List/table view remains available from top-right toggle.
- Search sits top-left.
- Cards use draft reference: large brand name, divider, compact metadata/action area.
- Skeleton remains centralized in `Skeleton`, but implementation may use Tailwind `motion-safe:animate-pulse` if it works cleanly with Tailwind v4 scanning and reduced-motion rules.

## 8. Approval Gate

Status: approved by MR. JRW on 2026-05-20 and applied to PRD, UX Design, Architecture, Epics, and sprint status.
