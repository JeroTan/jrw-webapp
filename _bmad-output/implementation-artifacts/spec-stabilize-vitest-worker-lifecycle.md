---
title: 'Stabilize Vitest worker lifecycle on Windows'
type: 'bugfix'
created: '2026-06-22T15:00:00+08:00'
status: 'in-review'
baseline_commit: 'a71f6fd7bfd14c7c024d9eb9e1611ec27aebf678'
context:
  - '{project-root}/_bmad-output/project-context.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** Full Vitest suite intermittently fails on Windows with `[vitest-pool]: Worker forks emitted error` and `Worker exited unexpectedly`, despite focused tests passing. Current default `forks` pool launches and terminates one isolated child process per file because `fileParallelism: false` forces one worker, exposing Vitest 4.1.5 worker-shutdown instability across 117 files.

**Approach:** Run Vitest through worker threads with two-file parallelism. Preserve test isolation and assertions while avoiding Windows child-process fork lifecycle race; use exact configuration already proven against full suite.

## Boundaries & Constraints

**Always:** Keep `tests/qa/**` excluded from Vitest; preserve `@` alias; retain per-file isolation; cap concurrency at two workers to bound memory and D1 integration-test load; require full suite to report every discovered file and test with zero unhandled errors.

**Ask First:** Any dependency upgrade, test-source change, retry wrapper, skipped test, disabled isolation, or concurrency above two workers.

**Never:** Suppress unhandled errors; treat worker exits as success; patch `node_modules`; remove failing tests; change customer-account code; modify Playwright QA configuration; rely on unlimited host CPU parallelism.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Full suite | Windows, Node 24, 117 Vitest files | 117 files and 782 tests complete using thread pool with at most two workers | Any assertion, worker, or unhandled error returns nonzero exit |
| Focused suite | One or several explicit test paths | Only requested files run normally under same pool configuration | Real test failures remain visible and fail command |
| QA exclusion | `tests/qa/**` Playwright specs exist | Vitest does not collect Playwright specs | Playwright remains responsible for QA specs |

</frozen-after-approval>

## Code Map

- `vitest.config.ts` -- owns alias, QA exclusion, pool selection, worker cap, and file parallelism.
- `package.json` -- confirms `npm run test` invokes Vitest; no script or dependency change planned.
- `_bmad-output/implementation-artifacts/5-3-paymongo-payment-creation-and-handoff.md` -- records prior single-thread full-suite timeout and successful targeted thread-pool runs.

## Tasks & Acceptance

**Execution:**
- [x] `vitest.config.ts` -- replace sequential default-forks execution with explicit `threads` pool, `fileParallelism: true`, and `maxWorkers: 2`; preserve alias and QA exclusion.

**Acceptance Criteria:**
- Given current Windows development environment, when full Vitest suite runs, then all 117 files and 782 tests pass without `Worker forks emitted error`, `Worker exited unexpectedly`, or unhandled errors.
- Given focused test paths, when Vitest runs them, then collection and failure semantics remain unchanged.
- Given repository QA specs, when Vitest collects tests, then `tests/qa/**` remains excluded.
- Given config review, when diff is inspected, then only Vitest runner settings and this workflow spec changed.

## Spec Change Log

## Design Notes

Control command `vitest run --pool=threads --fileParallelism --maxWorkers=2 --reporter=dot` passed 117/117 files and 782/782 tests in 497.07 seconds. Sequential thread mode exceeded 15 minutes; default forks reproduced unexpected worker exit twice. Two workers provide proven stability without unbounded parallelism.

## Verification

**Commands:**
- `npm run test -- --run --reporter=dot` -- expected: 117 test files and 782 tests pass; zero unhandled errors.
- `git diff --check` -- expected: no whitespace errors.
- `git diff -- vitest.config.ts` -- expected: only pool, worker cap, and file-parallelism settings change.
