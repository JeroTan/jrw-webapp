# Story 1.6: Seed Unique Super Admin and Deprecated Role Alias

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Super Admin,
I want exactly one seeded owner account and clear role normalization,
so that JRW has a controlled governance root and legacy `STORE_ADMIN` data cannot create a second active role.

## Acceptance Criteria

1. Given no Super Admin exists, when seed script runs with valid reviewed credentials, then exactly one `SUPER_ADMIN` account exists, and seed does not silently create multiple owners.
2. Given Super Admin already exists, when seed script runs again, then script refuses duplicate owner creation or updates only explicitly allowed non-sensitive fields, and output warns before replacing owner credentials.
3. Given legacy data or input uses `STORE_ADMIN`, when role is normalized, then system maps `STORE_ADMIN` to `ADMIN` as deprecated alias, and `STORE_ADMIN` is not exposed as active separate role in current APIs or UI.
4. Given roles are persisted or validated, when role schema/domain constants are reviewed, then active roles are `SUPER_ADMIN`, `ADMIN`, `CUSTOMER`, and `PROSPECT`, and role-related errors use stable safe codes.
5. Given seed and role logic are security-sensitive, when implementation finishes, then tests cover no-owner seed, existing-owner duplicate prevention, and `STORE_ADMIN` alias normalization, and logs do not print raw password, hashes, pepper, tokens, or secrets.
6. Given D1/Drizzle is source of truth, when schema or migration changes are needed, then changes are scoped to owner/admin/role data needed by this story, and no unrelated tables are created early.
7. Given validation exists, when story implementation finishes, then `npm run check` passes or blocker is documented, and remote production seed/migration is not performed without explicit review.

## Tasks / Subtasks

- [ ] Establish canonical role domain helpers. (AC: 3, 4)
  - [ ] Add pure role constants and types under `src/domain/auth/roles.ts` or closest existing domain path.
  - [ ] Define active user roles exactly as `SUPER_ADMIN`, `ADMIN`, `CUSTOMER`, `PROSPECT`.
  - [ ] Define `STORE_ADMIN` only as deprecated input alias, never as active output role.
  - [ ] Implement role normalization so `STORE_ADMIN` maps to `ADMIN`; unknown roles fail with existing stable error code `VALIDATION_FAILED` or `CONFLICT_STATE` where state conflict is the reason.
  - [ ] Reuse role type in request context, OpenAPI route metadata, operational logging, and audit types where practical so role lists do not drift.

- [ ] Enforce unique owner invariant in schema and migration plan. (AC: 1, 2, 6, 7)
  - [ ] Review existing `admins` shape in `src/domain/schema/identity.ts`: `email`, `password_hash`, `is_owner`, timestamps.
  - [ ] Prefer a D1/SQLite unique partial index that allows many non-owner admins but only one owner: `CREATE UNIQUE INDEX ... ON admins (is_owner) WHERE is_owner = 1`.
  - [ ] If Drizzle Kit cannot emit the partial index safely, keep `src/domain/schema/identity.ts` aligned and hand-review generated SQL before applying.
  - [ ] Run `npm run db:generate` if schema changes are made.
  - [ ] Do not apply production migration. Development remote migration needs explicit evidence if run.

- [ ] Replace unsafe Super Admin seed flow. (AC: 1, 2, 5, 7)
  - [ ] Rename or replace `scripts/seed-admin.ts` with canonical `scripts/seed-super-admin.ts`; keep a thin compatibility wrapper only if useful.
  - [ ] Align script env names with `.env.example`: `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD`.
  - [ ] Remove `dotenv/config` dependency unless `dotenv` is intentionally added; current package does not include `dotenv`.
  - [ ] Add package script if useful, preferably using Node 22 `--env-file=.env` with TSX import instead of adding a new env loader.
  - [ ] Validate email/password before building SQL. Never log password, hash, pepper, JWT secret, tokens, or raw env.
  - [ ] Preflight owner count before insert/update. If owner count is greater than zero, default behavior must exit non-zero without changing credentials.
  - [ ] Allow credential replacement only through explicit reviewed flag or confirmation token. Output must warn that owner credentials will be replaced before doing it.
  - [ ] Use temporary SQL files safely and remove them in `finally`, or use a safer D1 access path. Do not commit generated seed SQL.
  - [ ] Target development remote only unless production review flag and human runbook evidence exist.

- [ ] Add pure tests for role and seed decisions. (AC: 1, 2, 3, 4, 5)
  - [ ] Add `src/domain/auth/roles.test.ts` for active role list, alias normalization, active role output, and unknown-role rejection.
  - [ ] Extract seed decision rules into pure testable helper, for example `src/domain/auth/super-admin-seed.ts`, so tests do not call Wrangler or D1.
  - [ ] Test no-owner plan creates exactly one owner insert.
  - [ ] Test existing-owner default refuses duplicate/credential replacement.
  - [ ] Test explicit credential replacement path requires reviewed confirmation and never returns secrets in logs/messages.
  - [ ] Add script smoke test only if it can run without remote D1; otherwise document manual command evidence requirement.

- [ ] Update project docs and baselines. (AC: 3, 4, 6, 7)
  - [ ] Update `.env.example` comments only if command or variable wording changes.
  - [ ] Update `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md` completion/evidence note if migration or owner invariant policy changes materially.
  - [ ] Update `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md` only if an API route/contract changes; this story should not need new public endpoint contracts.
  - [ ] Keep `src/api/**` frozen. New canonical auth/admin route work belongs to later stories under `src/server/**`.

- [ ] Validate and record evidence. (AC: 5, 7)
  - [ ] Run `npm run check`.
  - [ ] Run targeted Vitest for changed role/seed tests.
  - [ ] Run `npm run build-test` if migration, schema, or broader auth code changes make full gate valuable.
  - [ ] Record whether `npm run db:generate` was run and list generated migration file, if any.
  - [ ] Record that no production D1 seed or migration was run.

## Dev Notes

### Current State

- `scripts/seed-admin.ts` currently reads `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`, but `.env.example` defines `SEED_SUPER_ADMIN_EMAIL` and `SEED_SUPER_ADMIN_PASSWORD`.
- `scripts/seed-admin.ts` imports `dotenv/config`, but `package.json` does not list `dotenv`.
- Current seed script builds raw SQL with direct interpolation, writes `seed.sql` in repo root, runs `npx wrangler@latest d1 execute DB --remote --env development --file=seed.sql --yes`, then deletes the file only on success.
- Current seed behavior uses `ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash, is_owner = 1`; this can silently replace owner credentials and does not prevent multiple `is_owner = 1` rows across different emails.
- `src/domain/schema/identity.ts` has `admins` with `id`, `email`, `password_hash`, `is_owner`, `created_at`, and `updated_at`; no role column exists.
- Current Super Admin representation is likely `admins.is_owner = true`; this story does not require adding a role column if the domain role view maps owner admin to `SUPER_ADMIN`.
- Role literals are duplicated today in `src/server/context/request-context.ts`, `src/server/openapi/route-metadata.ts`, `src/adapter/infrastructure/logging/operational-log.ts`, and `src/domain/audit/events.ts`.
- `src/api/**` identity files are frozen migration reference. They still return legacy `{ data, message, code }` shapes and mock behavior; do not make them canonical.
- `src/server/**` has the canonical Elysia app, standard envelopes, request IDs, OpenAPI metadata, and only foundation route wired.

### Required Domain Behavior

- Active user role output must be one of:
  - `SUPER_ADMIN`
  - `ADMIN`
  - `CUSTOMER`
  - `PROSPECT`
- Deprecated input alias:
  - `STORE_ADMIN` normalizes to `ADMIN`.
  - `STORE_ADMIN` must not appear in current API response DTOs, OpenAPI role metadata, UI labels, request actor roles, or audit actor role output.
- System/logging-only actor labels may still include `SYSTEM` and `UNKNOWN` where current infrastructure uses them, but those are not user roles and must not be exposed as active account roles.
- Unknown role input must fail with safe public error behavior. Prefer existing `VALIDATION_FAILED` for invalid input and `CONFLICT_STATE` for owner-state conflicts.

### Unique Owner Guardrails

- Exactly one Super Admin means exactly one owner account. In current schema, that means one `admins` row with `is_owner = true`.
- Use both script-level preflight and database-level protection where possible. Script checks prevent bad UX; database invariant prevents races and manual drift.
- Preferred D1/SQLite invariant:

```sql
CREATE UNIQUE INDEX admins_single_owner_idx
ON admins (is_owner)
WHERE is_owner = 1;
```

- Before creating a unique partial index, verify development data has zero or one owner. If more than one owner exists, stop and document remediation; do not auto-demote.
- If an owner already exists, default seed must exit without changing credentials. Credential replacement is sensitive and needs explicit reviewed confirmation.
- Future ownership transfer in Story 1.13 will preserve exactly one owner; do not prebuild transfer workflow here.

### Seed Script Requirements

- Canonical script path should be `scripts/seed-super-admin.ts` to match architecture. Existing `scripts/seed-admin.ts` may become a compatibility wrapper or be removed if no command references it.
- Script inputs:
  - `SEED_SUPER_ADMIN_EMAIL`
  - `SEED_SUPER_ADMIN_PASSWORD`
  - optional reviewed flag for credential replacement, name chosen by implementer but explicit and hard to set accidentally.
  - optional target env, defaulting to development.
- Script must reject missing or placeholder credentials.
- Script must not print credentials or derived secret material. Safe output may include target environment, D1 binding/name, owner count, and non-sensitive success/failure state. Avoid printing full email if not needed; if printed, treat it as operator-visible PII only.
- Script must fail closed for production. Production seed requires explicit human review and must not be hidden behind default `npm` script behavior.
- If temporary SQL is used, put it under OS temp or a clearly ignored temp path, quote values safely, and delete it in `finally`.

### File Structure Guardrails

Expected touch scope:

- `scripts/seed-super-admin.ts`
- `scripts/seed-admin.ts` only as compatibility wrapper or removal candidate
- `package.json` for seed script command if added
- `.env.example` if env comments/command naming need alignment
- `src/domain/auth/roles.ts`
- `src/domain/auth/super-admin-seed.ts` or equivalent pure helper
- `src/domain/auth/*.test.ts`
- `src/domain/schema/identity.ts` if adding owner invariant
- `migrations/*.sql` and `migrations/meta/*.json` only if generated by Drizzle for this story
- Current duplicate role type files only if importing central role types is low-risk:
  - `src/server/context/request-context.ts`
  - `src/server/openapi/route-metadata.ts`
  - `src/adapter/infrastructure/logging/operational-log.ts`
  - `src/domain/audit/events.ts`

Avoid:

- New canonical code under `src/api/**`.
- Customer registration, session cookies, RBAC middleware, Admin CRUD, or ownership transfer implementation; later stories own those.
- New active role names.
- Production D1 migration or production seed run.
- Broad migration rewrites or unrelated table creation.
- Logging raw password, hash, pepper, JWT, token, cookie, secret, stack, raw provider payload, or unnecessary PII.

### Previous Story Intelligence

- Story 1.5 added UI primitives and global CSS only. It did not change backend/auth state.
- Story 1.5 review fixed focus and disabled-state UI issues. No auth implementation patterns came from that story.
- Story 1.4 D1 baseline marks `admins` as owned by Stories 1.6, 1.11, and 1.13, with unique owner invariant and seed plan requiring review.
- Story 1.4 delivery baseline says production D1 migration is review-gated and development remote evidence must record command, target D1, migration/seed output, timestamp, and success/blocker.
- Story 1.3 froze `src/api/**`; identity legacy routes/controllers/services are migration references only. New backend/API work belongs under `src/server/**`.
- Story 1.2 established request IDs, safe operational logging, error envelope helpers, and audit event types. Reuse scrubbers and stable error codes instead of inventing new logging/error shapes.

### Latest Technical Information

- Cloudflare D1 Wrangler `d1 execute` requires either `--command` or `--file`; `--remote` executes against remote D1 and `--env` selects Wrangler environment. Use this deliberately for development, never silently for production. Source: https://developers.cloudflare.com/d1/wrangler-commands/
- Cloudflare D1 `d1 migrations apply` prompts before apply, captures backup, and rolls back failed migration while leaving previous successful migrations applied. Production still remains project review-gated. Source: https://developers.cloudflare.com/d1/wrangler-commands/
- Cloudflare D1 migrations are SQL files under `migrations/` by default, applied in sequential filename order, tracked in `d1_migrations`. Source: https://developers.cloudflare.com/d1/reference/migrations/
- Drizzle supports `index` and `uniqueIndex` declarations for SQLite, and SQLite index APIs include `.where(sql\`...\`)`. Review generated SQL because Drizzle docs note current `drizzle-kit` index-generation limits. Source: https://orm.drizzle.team/docs/indexes-constraints
- SQLite supports unique partial indexes, which can enforce uniqueness over subset rows such as owner rows only. Source: https://sqlite.org/partialindex.html
- Node 22 supports `--env-file`; values can be quoted and comments are allowed. This repo requires Node `>=22.12.0`, so a seed script can avoid adding `dotenv` solely for env file loading. Source: https://nodejs.org/download/release/v22.18.0/docs/api/cli.html

### Testing Requirements

- Required:
  - `npm run check`
  - `npx vitest run src/domain/auth/roles.test.ts src/domain/auth/super-admin-seed.test.ts` or exact test files created
- If migration/schema changes are generated:
  - `npm run db:generate`
  - inspect generated SQL for owner-only unique invariant and unrelated table churn
  - record migration filename
- Optional but useful:
  - `npm run build-test` after schema/test changes
- Do not run production seed/migration during story implementation. If development remote seed/migration is run, record command, target DB, timestamp, and sanitized output.

### Project Structure Notes

- This story is backend/domain/script safety work. No UI flow required.
- Keep business rules testable without D1 or Wrangler by extracting pure seed-decision and role-normalization helpers.
- Current admin login uses `admins.is_owner` in JWT payload. Story 1.7 will rebuild secure sessions and role guards; do not overbuild it here.
- Public API role names must stay camelCase DTOs where exposed later, but role string values remain uppercase constants.

### References

- `_bmad-output/planning-artifacts/epics.md#Story-1.6-Seed-Unique-Super-Admin-and-Deprecated-Role-Alias`
- `_bmad-output/planning-artifacts/prd.md#Authentication-Model`
- `_bmad-output/planning-artifacts/prd.md#Roles-Accounts-and-Access`
- `_bmad-output/planning-artifacts/architecture.md#Authentication-and-Security`
- `_bmad-output/planning-artifacts/architecture.md#Project-Structure-and-Boundaries`
- `_bmad-output/project-context.md#Product-Boundaries`
- `_bmad-output/project-context.md#Data-D1-And-Migrations`
- `_bmad-output/project-context.md#Testing-And-Quality`
- `_bmad-output/implementation-artifacts/1-3-legacy-api-migration-baseline.md`
- `_bmad-output/implementation-artifacts/1-4-d1-migration-plan.md`
- `_bmad-output/implementation-artifacts/1-5-global-font-ui-token-and-primitive-baseline.md`
- `scripts/seed-admin.ts`
- `.env.example`
- `package.json`
- `src/domain/schema/identity.ts`
- `src/domain/validation/identity.ts`
- `src/server/context/request-context.ts`
- `src/server/openapi/route-metadata.ts`
- `src/adapter/infrastructure/logging/operational-log.ts`
- `src/domain/audit/events.ts`
- Cloudflare D1 Wrangler commands: https://developers.cloudflare.com/d1/wrangler-commands/
- Cloudflare D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- Drizzle indexes and constraints: https://orm.drizzle.team/docs/indexes-constraints
- SQLite partial indexes: https://sqlite.org/partialindex.html
- Node CLI env file: https://nodejs.org/download/release/v22.18.0/docs/api/cli.html

## Story Context Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
