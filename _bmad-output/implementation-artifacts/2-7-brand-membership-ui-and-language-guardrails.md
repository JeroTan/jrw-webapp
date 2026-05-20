# Story 2.7: Brand Membership UI and Language Guardrails

Status: done
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
5. Given UI copy is reviewed, when brand screens, product brand fields, and invite/join flows are checked, then forbidden words do not appear for brands: seller, merchant, tenant, store owner, payout owner, PayMongo owner; seller-of-record wording remains in technical/business docs or payment/legal contexts, not routine brand UI.
6. Given responsive/accessibility requirements exist, when brand UI is tested, then tables/forms support keyboard navigation, visible labels, field errors, focus states, and tablet usability, and status badges include text labels.
7. Given implementation finishes, when tests/checks run, then UI/unit tests or documented QA cover brand language, permission states, invite/join status display, brandless product field, and accessibility basics, and `npm run check` passes or blocker is documented.

## Tasks / Subtasks

- [x] Task 1: Confirm dependency gate and prerequisites. (AC: 1-7)
  - [x] Verify Stories 2.1, 2.2, 2.3, 2.4, 2.5, and 2.6 are `done` in sprint status.
  - [x] Confirm brand API routes exist: CRUD, invite, join, approve, reject, archive, product visibility, mutation guards.
  - [x] Confirm UI primitives exist: `src/components/ui/` (Button, Input, Select, Textarea, Checkbox, Toggle, Modal, ConfirmDialog, Tabs, IconButton).
  - [x] Confirm data-display primitives exist: `src/components/data-display/DataTable.tsx`.
  - [x] Confirm feedback primitives exist: `src/components/feedback/` (Skeleton, EmptyState, Toast, StatusBadge, Badge).
  - [x] Confirm existing feature: `src/features/owner-governance/` as pattern reference for feature structure.
  - [x] Confirm global CSS tokens exist in `src/styles/global.css`.
  - [x] Do not start brand UI without Stories 2.1-2.6 foundation complete.

- [x] Task 2: Create brand feature module structure. (AC: 1-3, 5-6)
  - [x] Create `src/features/brands/` directory following Bulletproof React feature organization.
  - [x] Create `src/features/brands/api.ts` — typed API client functions for brand endpoints (list, detail, members, invites, join requests, products, brandless).
  - [x] Create `src/features/brands/types.ts` — TypeScript types for brand DTOs, membership states, invite states, join request states.
  - [x] Create `src/features/brands/components/BrandList.tsx` — brand list table with name, status, member count, pending invites/requests count.
  - [x] Create `src/features/brands/components/BrandDetail.tsx` — brand detail panel showing name, description, status, members table, invites table, join requests table, brand-scoped products.
  - [x] Create `src/features/brands/components/BrandMembershipTable.tsx` — members table with status badges (text-labeled, color-independent), role display, valid next actions.
  - [x] Create `src/features/brands/components/BrandInviteTable.tsx` — pending invites table with status, invited-by, date, valid next actions.
  - [x] Create `src/features/brands/components/BrandJoinRequestTable.tsx` — pending join requests table with status, requester, date, approve/reject actions.
  - [x] All copy uses "brand", "catalog group", "brand members" — NEVER forbidden words.

- [x] Task 3: Create brand language guard utility. (AC: 5)
  - [x] Create `src/features/brands/language.ts` — language guard utility.
  - [x] Export `FORBIDDEN_BRAND_TERMS` array: `["seller", "merchant", "tenant", "store owner", "payout owner", "paymongo owner"]`.
  - [x] Export `validateBrandCopy(text: string, context: string): string[]` — returns array of violations found in text.
  - [x] Export `safeBrandLabel(term: string): string` — maps any forbidden term to approved brand language.
  - [x] Create `src/features/brands/language.test.ts` covering: forbidden term detection, safe label mapping, copy validation across UI strings.
  - [x] This utility is for QA/testing and developer guardrails — not runtime user-facing validation.

- [x] Task 4: Create product brand field component with helper text. (AC: 2, 5-6)
  - [x] Create `src/features/brands/components/ProductBrandField.tsx` — brand selection field for product create/edit forms.
  - [x] Field shows brand dropdown with option for "No brand (brandless)".
  - [x] Helper text explains: brand is an optional catalog organization choice; brandless is valid and does not imply missing seller/store.
  - [x] Uses `Select` primitive from `src/components/ui/Select.tsx`.
  - [x] Keyboard accessible, visible label, field error support.
  - [x] Loads brand options from `GET /api/brands/me` (current admin's brands).

- [x] Task 5: Create brand Astro pages. (AC: 1-3, 6)
  - [x] Create `src/pages/admin/brands/index.astro` — brand list page embedding `BrandList` React island.
  - [x] Create `src/pages/admin/brands/[id].astro` — brand detail page embedding `BrandDetail` React island.
  - [x] Pages use `BaseLayout.astro` for consistent admin shell.
  - [x] Desktop-first layout: dense table-driven, keyboard-friendly.
  - [x] Tablet usable: tables collapse or side panels become full-screen.
  - [x] Status badges include text labels (not color-only).

- [x] Task 6: Integrate permission-aware UI controls. (AC: 4, 6)
  - [x] Brand action buttons (invite, approve, reject, archive) check membership role and permission state.
  - [x] Actions hidden/disabled for users lacking permission with clear safe reason on hover/focus.
  - [x] Server-side guard endpoints from Story 2.6 are the source of truth — UI controls are convenience only.
  - [x] Keyboard navigation: tab order logical, focus visible on all interactive elements.
  - [x] Form field errors visible and associated with inputs.

- [x] Task 7: Validate full flow and QA. (AC: 1-7)
  - [x] Run language guard tests: `npx vitest run src/features/brands/language.test.ts`.
  - [x] Run `npm run check`.
  - [x] Run `npm run build-test` after tests pass.
  - [x] Manual QA checklist:
    - [x] Brand list renders with correct copy (no forbidden terms).
    - [x] Brand detail shows members, invites, join requests, products.
    - [x] Product brand field shows helper text explaining optional catalog group.
    - [x] Brandless option is valid and clearly labeled.
    - [x] Status badges have text labels.
    - [x] Keyboard navigation works across brand tables and forms.
    - [x] Permission states hide/disable actions correctly.
    - [x] Tablet viewport is usable for brand operations.
  - [x] Record exact blockers if any.

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

**UI MICROCOPY RULES:**
- Page descriptions say what the Admin can do on the page.
- Brand list example: "You can manage your list of brands here."
- Brand detail example: "Manage this brand's members, invitations, join requests, and linked products."
- Product brand field example: "Choose a brand when this product belongs in a catalog group. No brand is valid."
- Do not use routine UI text to explain internal business doctrine, payment ownership, seller-of-record boundaries, or what a brand is not.
- Use "catalog group" only when it clarifies product assignment or grouping.
- Empty states state current state plus next action, not abstract brand policy.

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
- Seller-of-record wording belongs in technical docs, API docs, audit/legal/payment copy, and developer notes.
- Do not include seller-of-record wording in normal brand management page descriptions or product brand helper text.
- Never imply that a brand is a seller or merchant

### Permission-Aware UI Behavior

| Action | Required Permission | UI Behavior if Lacking Permission |
|--------|-------------------|-----------------------------------|
| View brand list | Authenticated ADMIN/SUPER_ADMIN | Show list; filter to authorized brands only |
| View brand detail | Brand member OR SUPER_ADMIN | Show detail; hide restricted tabs |
| Invite admin to brand | Active brand member or elevated Admin | Hide/disable invite button with tooltip |
| Approve/reject join request | Active brand member or elevated Admin | Hide/disable approve/reject buttons |
| Archive brand | Active brand member or elevated Admin | Hide/disable archive button; show ConfirmDialog |
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

GPT-5 Codex

### Implementation Plan

1. Validate Story 2.1-2.6 dependency gate and baseline primitives.
2. Build `src/features/brands` typed API/types/components module with language guardrails.
3. Add admin brand pages and responsive brand UI CSS in global styles.
4. Add language + UI render tests for guardrails, status text labels, and product brand field helper copy.
5. Run required validation gates and document blockers.

### Debug Log References

- `npx vitest run src/features/brands/api.test.ts src/features/brands/language.test.ts src/features/brands/components/brands-ui.test.ts` (pass)
- `npm run check` (pass)
- `npm run build-test` (pass)
- `npx vitest run src/features/brands/language.test.ts src/features/brands/api.test.ts src/features/brands/components/brands-ui.test.ts` (pass, 2026-05-19 post-retro checklist reconciliation; targeted only)

### Completion Notes List

- Added `src/features/brands` module: typed API client, DTO types, language guard utility, list/detail panels, membership/invite/join tables, and product brand field.
- Added admin brand pages: `src/pages/admin/brands/index.astro` and `src/pages/admin/brands/[id].astro`.
- Added responsive brand surface CSS and action/table utility classes in `src/styles/global.css`.
- Added tests: `src/features/brands/api.test.ts`, `src/features/brands/language.test.ts`, and `src/features/brands/components/brands-ui.test.ts`.
- Validation gates passed: targeted vitest, `npm run check`, `npm run build-test`.
- Post-retro checklist reconciliation completed: verified existing brand API/types/components/pages/language guard, server-source permission copy, focus-visible primitives, keyboard tabs, horizontally scrollable tables, responsive brand action CSS, and targeted brand tests.

### File List

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-7-brand-membership-ui-and-language-guardrails.md`
- `src/features/brands/types.ts`
- `src/features/brands/api.ts`
- `src/features/brands/language.ts`
- `src/features/brands/language.test.ts`
- `src/features/brands/api.test.ts`
- `src/features/brands/components/BrandList.tsx`
- `src/features/brands/components/BrandDetail.tsx`
- `src/features/brands/components/BrandMembershipTable.tsx`
- `src/features/brands/components/BrandInviteTable.tsx`
- `src/features/brands/components/BrandJoinRequestTable.tsx`
- `src/features/brands/components/ProductBrandField.tsx`
- `src/features/brands/components/brands-ui.test.ts`
- `src/pages/admin/brands/index.astro`
- `src/pages/admin/brands/[id].astro`
- `src/styles/global.css`

## Change Log
- 2026-05-18: Implemented brand UI module, guardrail utility/tests, admin brand pages, responsive styles, and validation gates.
- 2026-05-18: Verified `npm run build-test` end-to-end after review patches. Marked Story 2.7 done and Epic 2 done.
- 2026-05-19: Reconciled stale Story 2.7 checklist boxes after Epic 2 retrospective; ran targeted brand vitest files only.
- 2026-05-18: Story 2.7 context engine created — comprehensive developer guide for brand membership UI and language guardrails.

## Post-Retro Fix: Super Admin Seed Credential Validation
- 2026-05-18: During Epic 2 retrospective, MR. JRW discovered `npm run seed:super-admin` rejected `.env` credentials with "Super Admin seed credentials are missing or invalid."
- Root cause: `src/domain/auth/super-admin-seed.ts` contained a `hasPlaceholderValue()` function that hardcoded `super-admin@example.com` as a rejected placeholder, and also rejected any value starting with `replace-with-` or containing `example-placeholder`.
- Fix: Removed `hasPlaceholderValue()` entirely. `.env` is now treated as the source of truth — any valid email format (16+ char password, 16+ char pepper) is accepted without placeholder rejection.
- Files changed: `src/domain/auth/super-admin-seed.ts` — removed `hasPlaceholderValue()` function and its calls in `validateSuperAdminSeedCredentials()` and `validatePasswordPepper()`.
- This fix enables MR. JRW to seed and login with any credentials defined in `.env` for testing brand UI and admin flows.

## Post-Retro Fix: Smart Seed Dethrone Logic
- 2026-05-18: MR. JRW requested that seeding with a different email should dethrone the current owner (demote to ADMIN) and create a new SUPER_ADMIN, while seeding with the same email should only update the password.
- New operation type `dethrone-and-create-owner` added to `decideSuperAdminSeedOperation()`:
  - If seed email differs from current owner's email → demote old owner (`is_owner = 0`), insert new SUPER_ADMIN
  - If seed email matches current owner's email → update password only (`replace-owner-credentials`)
  - If no owner exists → create new SUPER_ADMIN (`create-owner`)
- Seed script now queries current owner's email via `buildCurrentOwnerEmailSql()` to auto-detect the correct operation.
- The old `REVIEWED_OWNER_CREDENTIAL_REPLACEMENT_CONFIRMATION` gate was removed since email-matching makes it unnecessary.
- Files changed: `src/domain/auth/super-admin-seed.ts`, `scripts/seed-super-admin.ts`, `src/domain/auth/super-admin-seed.test.ts`.
- All 8 seed tests pass, `npm run check` clean.

## Post-Retro Fix: Brand UI Access Path

- 2026-05-19: Confirmed canonical brand UI routes are `/admin/brands` and `/admin/brands/:id`; Astro file paths under `src/pages/**` are not URL prefixes.
- Added lightweight redirects for `/brand`, `/brand/:id`, `/brands`, and `/brands/:id` to the canonical admin brand UI routes.
- Testing path after seeding Admin: sign in with `POST /api/admin/auth/sessions`, then open `/admin/brands` or redirected `/brand`.
- No Vitest exists for redirect-only Astro aliases; full route/build verification is left to MR. JRW's `npm run build-test` gate.
- Status: done.
