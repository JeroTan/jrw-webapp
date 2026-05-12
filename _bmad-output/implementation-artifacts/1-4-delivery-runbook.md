# Story 1.4 CI, Check, And Delivery Runbook Baseline

Status: baseline
Owner: Story 1.4
Last updated: 2026-05-12

## Purpose

This runbook defines repeatable local checks, intended CI gates, Cloudflare binding/type expectations, development deploy steps, production review gates, smoke checks, and rollback limits.

## Current Local Commands

Commands come from `package.json`.

| Command | Current use | Notes |
| --- | --- | --- |
| `npm run check` | Astro/TypeScript validation. | Required for Story 1.4 completion. |
| `npx vitest run` | One-shot test run. | Required when source code, scripts, package config, Playwright config, or tests change. |
| `npm run build-test` | Intended full local gate: `astro check && vitest run && astro build`. | Intended CI gate once Cloudflare auth/bindings exist in CI. |
| `npm run wrangler-types` | Generate Cloudflare binding types. | Run after `wrangler.jsonc` binding changes. |
| `npm run db:generate` | Generate Drizzle migrations. | Run after schema changes under `src/domain/schema/*.ts`. |
| `npm run db:migrate:remote` | Apply D1 migrations to remote development. | Uses `wrangler d1 migrations apply DB --remote --env development`. |
| `npm run deploy-development` | Deploy Worker to development env. | Uses `npx wrangler@latest deploy --env="development"`. |
| `npm run deploy-production` | Deploy Worker to production env. | Command exists, but production deploy remains review-gated. |

## Intended CI Gate

Use this as intended CI gate when GitHub Actions or equivalent CI has Cloudflare auth and environment bindings configured:

```powershell
npm run build-test
```

Current automation gap:

- `.github/workflows/**` is missing.
- CI secrets and Cloudflare auth strategy are not defined.
- Until CI exists, each story must record local `npm run check` and targeted test/build evidence or blockers.

## Cloudflare Configuration Baseline

From `wrangler.jsonc`:

| Item | Value |
| --- | --- |
| Worker main | `src/cloudflare/worker.ts` |
| Top-level Worker name | `jrw-simple-ecommerce-site` |
| Development env Worker name | `jrw-ecommerce-development` |
| Production env Worker name | `jrw-simple-ecommerce-site` |
| Compatibility date | `2026-04-28` |
| Compatibility flags | `nodejs_compat`, `global_fetch_strictly_public` |
| Assets binding | `ASSETS`, directory `./dist` |
| D1 binding | `DB` |
| Development D1 | `jrw-database-development` / `beabfd98-8611-4d58-8f1b-7a972b8af1ed` |
| Production D1 | `jrw-database-production` / `fd08e264-2046-4648-9164-84f66948533e` |
| R2 binding | `STORAGE` |
| Development R2 bucket | `jrw-ecommerce-storage-development` |
| Production R2 bucket | `jrw-ecommerce-storage-production` |
| Durable Object binding | `INVENTORY_DURABLE_OBJECT` |
| Durable Object class | `InventoryDurableObject` |
| Durable Object migration tag | `v1` |
| Observability | Top-level `observability.enabled = true`, `head_sampling_rate = 1` |

Named env observability note:

- Top-level observability is enabled. Before production payment launch, verify whether named env deploys inherit the top-level setting as intended or need explicit per-env observability config.

## Binding And Type Generation

Run `npm run wrangler-types` after any `wrangler.jsonc` binding change, including:

- D1 database binding changes.
- R2 bucket binding changes.
- Durable Object binding changes.
- Assets binding changes.
- Compatibility date/flag changes that affect generated Worker types.

Generated type diffs must be reviewed with binding changes. Do not treat a successful deploy as proof that TypeScript binding types stayed correct.

## Schema Change Sequence

1. Update `src/domain/schema/*.ts`.
2. Run `npm run db:generate`.
3. Review generated SQL under `migrations/`.
4. Check `migrations/meta/_journal.json`.
5. Apply remote development migration only:

```powershell
npm run db:migrate:remote
```

6. Record evidence: command, environment, migration files, timestamp, success output.
7. Do not run production D1 migration without explicit human review.

Production D1 command for reviewed use only:

```powershell
wrangler d1 migrations apply DB --remote --env production
```

## Development Deploy Sequence

1. Run validation:

```powershell
npm run check
```

2. Run tests when source/scripts/test/package config changed:

```powershell
npx vitest run
```

3. For broad or production-bound changes, run full local gate:

```powershell
npm run build-test
```

4. If binding config changed, run:

```powershell
npm run wrangler-types
```

5. If schema changed, generate and review migrations:

```powershell
npm run db:generate
```

6. Apply remote development D1 migration only after SQL review:

```powershell
npm run db:migrate:remote
```

7. Deploy development:

```powershell
npm run deploy-development
```

8. Run smoke checks and record evidence.

## Production Deploy Gate

Production deploy command exists:

```powershell
npm run deploy-production
```

Production deploy remains review-gated. Required review items:

- `npm run build-test` pass or accepted blocker.
- Development deploy smoke evidence.
- Remote development D1 migration evidence for schema changes.
- Explicit production D1 migration plan if schema changed.
- Observability checklist status for critical failure categories.
- Rollback plan for Worker plus separate D1/R2/Durable Object recovery notes.

## Smoke Checks

After deploy, verify:

| Check | Expected result |
| --- | --- |
| `GET /api/` | Public API root responds with safe envelope. |
| `GET /api/openapi/json` | OpenAPI JSON responds and includes expected route metadata. |
| Representative changed API/page | Changed surface responds without unexpected error. |
| Request ID header | Response includes `x-request-id` where API middleware applies. |
| Safe public error | Error response does not expose stack traces, secrets, provider payloads, or raw PII. |
| Cloudflare logs | Operational logs include request ID and sanitized context for failure paths. |

## Rollback Notes

- Worker rollback can restore a previous Worker deployment.
- Worker rollback does not roll back D1 schema/data.
- Worker rollback does not roll back R2 object changes.
- Worker rollback does not roll back Durable Object state or SQLite-backed Durable Object migrations.
- Any schema/data rollback needs separate reviewed SQL, backup/export plan, and verification.
- If payment or checkout state changed, rollback plan must preserve reconciliation and idempotency records.

## Open Automation Gaps

- No `.github/workflows/**` CI exists.
- CI Cloudflare auth/bindings are not configured.
- Playwright and `@axe-core/playwright` are selected in UI QA baseline but not installed in this story.
- Production deployment and production D1 migration are manual review gates, not automated approvals.
