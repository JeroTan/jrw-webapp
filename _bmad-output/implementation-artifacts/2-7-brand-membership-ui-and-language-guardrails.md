# Story 2.7: Brand Membership UI and Language Guardrails

Status: ready-for-dev
<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an Admin,
I want brand screens and product forms to use clear catalog-collaboration language,
So that brands are not mistaken for stores, sellers, tenants, merchants, or payment owners.

## Acceptance Criteria

1. Given Admin views brand list or brand detail, when UI renders, then it shows brand name, status, members, pending invites/requests, and brand-scoped products, and copy uses "brand", "catalog group", and "brand members".
2. Given Admin creates or edits product, when brand field appears, then helper text explains brand is optional catalog group, and product can remain brandless without warning that implies missing seller/store.
3. Given Admin views brand membership table, when members and invites are displayed, then statuses are text-labeled and color-independent, and controls expose only valid next actions.
4. Given Admin lacks permission for brand action, when action would be unavailable, then UI hides/disables action with clear safe reason, and server-side denial remains source of truth.
5. Given UI copy is reviewed, when brand screens, product brand fields, and invite/join flows are checked, then forbidden words do not appear for brands: seller, merchant, tenant, store owner, payout owner, PayMongo owner, and any necessary reference to JRW seller of record remains explicit.
6. Given responsive/accessibility requirements exist, when brand UI is tested, then tables/forms support keyboard navigation, visible labels, field errors, focus states, and tablet usability, and status badges include text labels.
7. Given implementation finishes, when tests/checks run, then UI/unit tests or documented QA cover brand language, permission states, invite/join status display, brandless product field, and accessibility basics, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [ ] Task 1: Confirm dependency gate and prerequisites. (AC: 1-7)
  - [ ] Verify Stories 2.1, 2.2, 2.3, 2.4, 2.5, and 2.6 are `done` in sprint status.
  - [ ] Confirm brand API routes exist: CRUD, invite, join, approve, reject, archive, product visibility, mutation guards.
  - [ ] Confirm UI primitives exist: `src/components/ui/` (Button, Input, Select, Textarea, Checkbox, Toggle, Modal, ConfirmDialog, Tabs, IconButton).
  - [ ] Confirm data-display primitives exist: `src/components/data-display/DataTable.tsx`.
  - [ ] Confirm feedback primitives exist: `src/components/feedback/` (Skeleton, EmptyState, Toast, StatusBadge, Badge).
  - [ ] Confirm existing feature: `src/features/owner-governance/` as pattern reference for feature structure.
  - [ ] Confirm global CSS tokens exist in `src/styles/global.css`.
  - [ ] Do not start brand UI without Stories 2.1-2.6 foundation complete.

- [ ] Task 2: Create brand feature module structure. (AC: 1-3, 5-6)
  - [ ] Create `src/features/brands/` directory following Bulletproof React feature organization.
  - [ ] Create `src/features/brands/api.ts` — typed API client functions for brand endpoints (list, detail, members, invites, join requests, products, brandless).
  - [ ] Create `src/features/brands/types.ts` — TypeScript types for brand DTOs, membership states, invite states, join request states.
  - [ ] Create `src/features/brands/components/BrandList.tsx` — brand list table with name, status, member count, pending invites/requests count.
  - [ ] Create `src/features/brands/components/BrandDetail.tsx` — brand detail panel showing name, description, status, members table, invites table, join requests table, brand-scoped products.
  - [ ] Create `src/features/brands/components/BrandMembershipTable.tsx` — members table with status badges (text-labeled, color-independent), role display, valid next actions.
  - [ ] Create `src/features/brands/components/BrandInviteTable.tsx` — pending invites table with status, invited-by, date, valid next actions.
  - [ ] Create `src/features/brands/components/BrandJoinRequestTable.tsx` — pending join requests table with status, requester, date, approve/reject actions.
  - [ ] All copy uses "brand", "catalog group", "brand members" — NEVER forbidden words.

- [ ] Task 3: Create brand language guard utility. (AC: 5)
  - [ ] Create `src/features/brands/language.ts` — language guard utility.
  - [ ] Export `FORBIDDEN_BRAND_TERMS` array: `["seller", "merchant", "tenant", "store owner", "payout owner", "paymongo owner"]`.
  - [ ] Export `validateBrandCopy(text: string, context: string): string[]` — returns array of violations found in text.
  - [ ] Export `safeBrandLabel(term: string): string` — maps any forbidden term to approved brand language.
  - [ ] Create `src/features/brands/language.test.ts` covering: forbidden term detection, safe label mapping, copy validation across UI strings.
  - [ ] This utility is for QA/testing and developer guardrails — not runtime user-facing validation.

- [ ] Task 4: Create product brand field component with helper text. (AC: 2, 5-6)
  - [ ] Create `src/features/brands/components/ProductBrandField.tsx` — brand selection field for product create/edit forms.
  - [ ] Field shows brand dropdown with option for "No brand (brandless)".
  - [ ] Helper text explains: brand is an optional catalog organization choice; brandless is valid and does not imply missing seller/store.
  - [ ] Uses `Select` primitive from `src/components/ui/Select.tsx`.
  - [ ] Keyboard accessible, visible label, field error support.
  - [ ] Loads brand options from `GET /api/brands/me` (current admin's brands).

- [ ] Task 5: Create brand Astro pages. (AC: 1-3, 6)
  - [ ] Create `src/pages/admin/brands/index.astro` — brand list page embedding `BrandList` React island.
  - [ ] Create `src/pages/admin/brands/[id].astro` — brand detail page embedding `BrandDetail` React island.
  - [ ] Pages use `BaseLayout.astro` for consistent admin shell.
  - [ ] Desktop-first layout: dense table-driven, keyboard-friendly.
  - [ ] Tablet usable: tables collapse or side panels become full-screen.
  - [ ] Status badges include text labels (not color-only).

- [ ] Task 6: Integrate permission-aware UI controls. (AC: 4, 6)
  - [ ] Brand action buttons (invite, approve, reject, archive) check membership role and permission state.
  - [ ] Actions hidden/disabled for users lacking permission with clear safe reason on hover/focus.
  - [ ] Server-side guard endpoints from Story 2.6 are the source of truth — UI controls are convenience only.
  - [ ] Keyboard navigation: tab order logical, focus visible on all interactive elements.
  - [ ] Form field errors visible and associated with inputs.

- [ ] Task 7: Validate full flow and QA. (AC: 1-7)
  - [ ] Run language guard tests: `npx vitest run src/features/brands/language.test.ts`.
  - [ ] Run `npm run check`.
  - [ ] Run `npm run build-test` after tests pass.
  - [ ] Manual QA checklist:
    - [ ] Brand list renders with correct copy (no forbidden terms).
    - [ ] Brand detail shows members, invites, join requests, products.
    - [ ] Product brand field shows helper text explaining optional catalog group.
    - [ ] Brandless option is valid and clearly labeled.
    - [ ] Status badges have text labels.
    - [ ] Keyboard navigation works across brand tables and forms.
    - [ ] Permission states hide/disable actions correctly.
    - [ ] Tablet viewport is usable for brand operations.
  - [ ] Record exact blockers if any.

### Review Findings

_(To be populated by code review)_

## Dev Notes

### Epic Context

- Story 2.7 is the FINAL story in Epic 2 (Brand Collaboration and Catalog Organization).
- Stories 2.1-2.6 established the complete brand API: CRUD, membership, invites, join requests, product visibility, mutation guards.
- This story builds the ADMIN UI surfaces for brand management and enforces language guardrails across all brand-related copy.
- Requirements covered: Supports FR12-FR20; UX-DR15, UX-DR19, UX-DR20, UX-DR22, UX-DR30.
- Epic 3 (Catalog, Product Media, and Inventory Operations) will depend on this story's UI patterns for product brand field integration.
- After this story, Epic 2 is complete and ready for retrospective.

### Dependency Gate

- Stories 2.1-2.6 must be `done` in sprint status before starting this story.
- Story 2.1 established: `brands` table, `brand_memberships` table, BrandRepository, BrandService, BrandController, `POST /api/brands` route.
- Story 2.2 established: `PATCH /api/brands/:id`, `POST /api/brands/:id/archive`, brand membership authorization checks.
- Story 2.3 established: `POST /api/brands/:id/invite`, brand invitation email notification.
- Story 2.4 established: `POST /api/brands/:id/accept`, `POST /api/brands/:id/join`, approve/reject join requests.
- Story 2.5 established: `GET /api/brands/:id/products`, `GET /api/brands/products/brandless`, `GET /api/brands/me`, brand-scoped product visibility.
- Story 2.6 established: mutation guard endpoints (`POST /api/brands/:id/products/guard`, etc.), `requireBrandMembershipForMutation(...)` domain function.
- If Stories 2.1-2.6 are not `done`, stop and document blocker before proceeding.

### Current Code Intelligence

#### `src/features/owner-governance/` (Epic 1 — Pattern Reference)
  - **Current state:** Contains `OwnershipTransferPanel.tsx`, `api.ts`, `ownership-transfer.ts`, `ownership-transfer.test.ts`. Uses React components, typed API client functions, domain logic, and tests.
  - **What this story uses as pattern:** Feature module structure — `components/`, `api.ts`, `types.ts`, domain logic, tests. Follow this same organization for `src/features/brands/`.
  - **What must be preserved:** Do not modify owner-governance feature. Use it as reference only.

#### `src/components/ui/` (Epic 1 — UI Primitives)
  - **Current state:** Contains Button, Input, Select, Textarea, Checkbox, Toggle, Modal, ConfirmDialog, Tabs, IconButton. All are generic reusable primitives.
  - **What this story uses:** All primitives for brand UI composition. `Select` for brand dropdown, `Modal`/`ConfirmDialog` for destructive actions, `Tabs` for brand detail sections, `Button`/`IconButton` for actions.
  - **What must be preserved:** Do not modify existing primitives unless a genuine bug is found. Extend if needed but keep backward compatible.

#### `src/components/data-display/DataTable.tsx` (Epic 1)
  - **Current state:** Generic data table component for dense admin surfaces.
  - **What this story uses:** Brand list table, membership table, invite table, join request table.
  - **What must be preserved:** Existing table API. Compose with brand-specific columns and actions.

#### `src/components/feedback/` (Epic 1 — Feedback Primitives)
  - **Current state:** Contains Skeleton, EmptyState, Toast, StatusBadge, Badge.
  - **What this story uses:** `StatusBadge` for brand status (ACTIVE, ARCHIVED), membership status (ACTIVE, PENDING, REVOKED), invite/join request states. `Skeleton` for loading states. `EmptyState` for empty tables. `Toast` for operation feedback.
  - **What must be preserved:** StatusBadge must include TEXT labels — never color-only. This is a critical accessibility requirement.

#### `src/styles/global.css` (Epic 1)
  - **Current state:** Tailwind CSS v4 project style surface with `@theme`, `@utility`, and reusable component classes. Contains JRW Technical Brutalist tokens: sharp 0px corners, 1px grid/borders, no shadows, no blur, cobalt accent.
  - **What this story uses:** Extract repeated Tailwind class chains here for brand components. Use existing theme tokens.
  - **What must be preserved:** Existing theme tokens, utilities. Do not add shadows, blur, or soft generic ecommerce style.

#### `src/pages/admin/owner/transfer.astro` (Epic 1 — Page Pattern Reference)
  - **Current state:** Astro page embedding React island for ownership transfer. Uses `BaseLayout.astro`.
  - **What this story uses as pattern:** Astro page structure for embedding React feature islands. Follow this pattern for brand pages.
  - **What must be preserved:** Do not modify existing pages.

#### `src/pages/index.astro` and `src/layouts/BaseLayout.astro` (Epic 1)
  - **Current state:** Index page and base layout. Base layout provides admin shell structure.
  - **What this story uses:** `BaseLayout.astro` as wrapper for brand admin pages.
  - **What must be preserved:** Existing layout structure.

#### `src/server/routes/brands.routes.ts` (Stories 2.1-2.6)
  - **Current state:** Complete brand API with CRUD, invite, join, approve, reject, archive, product visibility, and mutation guard endpoints. TypeBox schemas, RBAC guard, OpenAPI metadata.
  - **What this story uses:** API endpoints for brand list, detail, members, invites, join requests, products, brandless. The `api.ts` client in brand feature will call these.
  - **What must be preserved:** No API changes needed. This story is UI-only consumption of existing endpoints.

#### `src/domain/brands/brand.ts` (Stories 2.1-2.6)
  - **Current state:** Brand domain rules with types for create/update input, conflict decisions, validation functions. Contains brand name/slug validation, status enums, membership role enums.
  - **What this story uses:** Type references for brand DTOs, status values, membership roles. May re-export types in `src/features/brands/types.ts`.
  - **What must be preserved:** All domain rules. Do not modify.

### Brand UI Surface Inventory

| Surface | Component | Data Source | Key Requirements |
|---------|-----------|-------------|------------------|
| Brand list page | `BrandList.tsx` | `GET /api/brands` (list all) or paginated | Name, status, member count, pending invites/requests count, text-labeled status badges |
| Brand detail page | `BrandDetail.tsx` | `GET /api/brands/:id` | Name, description, status, tabs for members/invites/join-requests/products |
| Members table | `BrandMembershipTable.tsx` | `GET /api/brands/:id/members` | Admin name, role (OWNER/MEMBER), status (ACTIVE/PENDING/REVOKED), valid next actions |
| Invites table | `BrandInviteTable.tsx` | `GET /api/brands/:id/invites` | Invited admin, invited by, date, status, revoke action |
| Join requests table | `BrandJoinRequestTable.tsx` | `GET /api/brands/:id/join-requests` | Requester admin, date, status, approve/reject actions |
| Brand-scoped products | (links to Epic 3 product UI) | `GET /api/brands/:id/products` | Product list for brand scope (may be placeholder until Epic 3) |
| Product brand field | `ProductBrandField.tsx` | `GET /api/brands/me` | Dropdown with brand options + "No brand" option, helper text |

### Language Guardrails (Critical — This Story's Primary Purpose)

**APPROVED TERMS:**
- "brand" — the catalog collaboration group
- "catalog group" — alternative description of what a brand is
- "brand members" — admins who belong to a brand
- "brandless" — product with no brand assignment
- "no brand" — alternative for brandless
- "catalog organization choice" — explains why brand is optional

**FORBIDDEN TERMS (NEVER use for brands):**
- "seller" — JRW is the seller of record, not brands
- "merchant" — brands are not merchants
- "tenant" — brands are not tenants (no multi-tenancy)
- "store owner" — brands do not own stores
- "payout owner" — brands do not own PayMongo payouts
- "PayMongo owner" — JRW has single PayMongo merchant account

**Language rules apply to:**
- All UI copy (labels, headings, helper text, tooltips, error messages)
- Code comments where brand context is described
- Test descriptions for brand-related tests
- Variable names where reasonable (prefer `brandName` over `storeName`, `brandMembers` over `merchants`)
- API response field descriptions (OpenAPI `description` fields)
- Audit event details related to brand operations

**JRW seller of record:**
- When seller context is needed, explicitly state "JRW is the seller of record"
- Never imply that a brand is a seller or merchant

### Permission-Aware UI Behavior

| Action | Required Permission | UI Behavior if Lacking Permission |
|--------|-------------------|-----------------------------------|
| View brand list | Authenticated ADMIN/SUPER_ADMIN | Show list; filter to authorized brands only |
| View brand detail | Brand member OR SUPER_ADMIN | Show detail; hide restricted tabs |
| Invite admin to brand | Brand OWNER or SUPER_ADMIN | Hide/disable invite button with tooltip |
| Approve/reject join request | Brand OWNER or SUPER_ADMIN | Hide/disable approve/reject buttons |
| Archive brand | Brand OWNER or SUPER_ADMIN | Hide/disable archive button; show ConfirmDialog |
| Create product in brand | Brand member OR SUPER_ADMIN | Guard check from Story 2.6; hide/disable create |
| Edit product in brand | Brand member OR SUPER_ADMIN | Guard check from Story 2.6; hide/disable edit |

### Accessibility Requirements

- **WCAG 2.2 AA** target for all brand UI surfaces.
- Status badges MUST include text labels — never rely on color alone.
- All form inputs must have visible labels and associated error messages.
- Keyboard navigation: tab order must be logical across brand tables and forms.
- Focus indicators must be visible on all interactive elements (use cobalt accent sparingly).
- Modals and ConfirmDialogs must trap focus and restore focus on close.
- Tables must be keyboard-navigable (arrow keys for cell navigation where applicable).
- Tablet viewport (768px-1023px) must be usable for brand operations.
- Use `prefers-reduced-motion` for any animations/transitions.

### Testing Requirements

Minimum before completion:

- Language guard unit tests: forbidden term detection, safe label mapping, copy validation across brand UI strings.
- Component tests (if testing framework available): BrandList renders with correct columns, BrandMembershipTable shows status text labels, ProductBrandField shows helper text.
- Manual QA checklist completed (see Task 7).

Validation commands:

```bash
npx vitest run src/features/brands/language.test.ts
npm run check
npm run build-test
```

## References

- Story source: `_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.7)
- PRD anchors: `_bmad-output/planning-artifacts/prd.md` (FR12-FR20; single-store ecommerce; brand collaboration)
- Architecture anchors: `_bmad-output/planning-artifacts/architecture.md` (Brand collaboration boundaries; API & Communication Patterns; UI Architecture)
- UX anchors: `_bmad-output/planning-artifacts/ux-design-specification.md` (UX-DR15, UX-DR19, UX-DR20, UX-DR22, UX-DR30; brand language rules; catalog group terminology; responsive/accessibility)
- Project context: `_bmad-output/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/2-6-brand-scoped-product-mutation-guards.md`
- Existing brand domain: `src/domain/brands/brand.ts`
- Existing brand routes: `src/server/routes/brands.routes.ts`
- Existing UI primitives: `src/components/ui/`
- Existing feedback primitives: `src/components/feedback/`
- Existing data display: `src/components/data-display/DataTable.tsx`
- Existing feature pattern: `src/features/owner-governance/`
- Existing pages: `src/pages/admin/owner/transfer.astro`, `src/layouts/BaseLayout.astro`
- Global CSS: `src/styles/global.css`
- Design system: `docs/design-by-google-stitch.md`
- Cloudflare D1 docs: https://developers.cloudflare.com/d1/worker-api/d1-database/
- Drizzle Cloudflare D1 docs: https://orm.drizzle.team/docs/connect-cloudflare-d1
- Elysia lifecycle docs: https://elysiajs.com/essential/life-cycle
- Astro React integration docs: https://docs.astro.build/en/guides/integrations-guide/react/

## Open Questions

- Should brand list page show ALL brands (SUPER_ADMIN view) or only admin's brands (member view)? Current design: SUPER_ADMIN sees all brands; regular ADMIN sees only brands they belong to.
- Should brand detail page tabs (members, invites, join requests, products) be conditionally rendered based on permission? Current design: tabs visible but content restricted; restricted tabs show "permission required" message.
- Should ProductBrandField component be placed in `src/features/brands/` or `src/features/catalog/` (when Epic 3 creates catalog feature)? Current design: place in `src/features/brands/` now; Epic 3 can import from here or move later.
- Should brand pages use React islands (Astro + `client:visible`) or full React SPA pages? Current design: follow existing pattern from `transfer.astro` — Astro page with React island using `client:visible` or `client:load`.

## Dev Agent Record

### Agent Model Used

_(To be populated by dev agent)_

### Implementation Plan

_(To be populated by dev agent)_

### Debug Log References

- `npx vitest run src/features/brands/language.test.ts`
- `npm run check`
- `npm run build-test`

### Completion Notes List

_(To be populated by dev agent)_

### File List

_(To be populated by dev agent)_

## Change Log

- 2026-05-18: Story 2.7 context engine created — comprehensive developer guide for brand membership UI and language guardrails.
