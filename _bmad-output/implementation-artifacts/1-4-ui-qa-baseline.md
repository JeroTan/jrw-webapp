# Story 1.4 UI QA Baseline

Status: baseline
Owner: Story 1.4
Last updated: 2026-05-12

## Purpose

This baseline defines automated and manual UI QA expectations for future storefront/admin UI stories.

Selected automated baseline: Playwright plus `@axe-core/playwright`.

Current repo does not include Playwright or `@axe-core/playwright`. This story documents the baseline only and does not install new packages.

## Required Viewport Widths

Future responsive screenshot and layout checks must include exactly these widths:

- `320`
- `375`
- `390`
- `430`
- `768`
- `1024`
- `1440`

Default height can be chosen per flow, but evidence must state width, page/flow, browser, OS/CI environment, and date.

## Future Tooling Setup

When project chooses to install automated UI QA:

```powershell
npm install -D @playwright/test @axe-core/playwright
```

Recommended additions:

- `playwright.config.ts` with stable projects for required viewport widths.
- `npm` script such as `test:e2e`.
- Screenshot baseline storage from one OS/browser environment to avoid noisy diffs.
- CI artifact upload for screenshots, traces, and accessibility reports.
- Local command documentation in delivery runbook or README once scripts exist.

Do not claim Playwright automation exists until packages, config, scripts, and tests are added.

## Automated Checks

| Check | Required coverage | Evidence required |
| --- | --- | --- |
| Smoke navigation | Each critical route from future UI story. | Playwright test output or documented manual blocker. |
| Responsive screenshots | Widths `320`, `375`, `390`, `430`, `768`, `1024`, `1440`. | Screenshot artifacts or comparison report. |
| Stable visual comparison | Stable pages/components only. | `toHaveScreenshot()` output from consistent OS/browser baseline. |
| Axe accessibility scan | Key pages and critical states. | `@axe-core/playwright` scan report; note any accepted violations. |
| Console errors | Critical flows have no unexpected console errors. | Playwright console listener output. |
| Reduced motion | Motion-heavy interactions and nav transitions. | Reduced-motion emulation evidence where relevant. |
| API/error states | UI handles loading, empty, validation, forbidden, conflict, and provider unavailable states when story touches them. | Screenshots or test assertions per state. |

Playwright visual comparison warning:

- Browser rendering varies by OS, browser, hardware, and headless settings. Keep screenshot baselines in same environment.

Automated accessibility warning:

- Axe catches only some accessibility defects. Manual keyboard/focus/reading-order checks remain required.

## Manual QA Checklist

Each future UI story must record executed checks or blockers in completion notes.

| Manual check | What to verify |
| --- | --- |
| Keyboard-only walkthrough | User can complete critical flow using keyboard only. |
| Focus visibility | Focus indicator is visible and follows logical order. |
| Focus trap and restore | Modals, drawers, side panels trap focus while open and restore focus after close. |
| Status badge contrast | Status badges meet contrast and remain readable. |
| No color-only status | Status always includes text/icon semantics; color alone never carries meaning. |
| Reduced motion | Motion respects user preference and does not block comprehension. |
| Text overflow | Long names, emails, addresses, prices, and statuses do not clip or overlap. |
| Sticky action bars | Sticky bars do not cover form fields, buttons, tables, pagination, or validation messages. |
| Mobile touch targets | Critical controls meet 44px target guidance where mobile UI applies. |
| Form errors | Validation messages are tied to fields and remain visible after submit. |
| Loading/empty states | States are clear, not marketing filler, and do not shift layout badly. |
| Storefront performance | Lighthouse or WebPageTest evidence exists for storefront launch-bound pages. |

## JRW Visual Baseline Checks

Future UI QA should verify:

- 0px radius where JRW Stitch tokens require sharp corners.
- 1px grid/borders.
- No shadows, blur, generic soft ecommerce styling, decorative gradients, or orb backgrounds.
- Satoshi headings/identity and Space Mono utility/system text when fonts are available.
- Cobalt used sparingly for focus, selected state, primary action, or live status.
- Product imagery carries storefront warmth; UI does not substitute decorative visuals for product inspection.
- Admin dashboard stays dense, table-driven, keyboard-friendly, and operation-focused.

## Evidence Template For Future UI Stories

Future story completion notes should include:

| Evidence item | Example value |
| --- | --- |
| Automated command | `npm run test:e2e` or blocker if tooling absent. |
| Browser/environment | Chromium on CI image or local OS/browser. |
| Viewports covered | `320`, `375`, `390`, `430`, `768`, `1024`, `1440`. |
| Axe results | Pass/fail count and accepted violations. |
| Manual keyboard result | Pass/fail/blocker. |
| Focus trap/restore result | Pass/fail/not applicable. |
| Lighthouse/WebPageTest | URL, date, score/core blockers. |
| Known blockers | Specific issue, owner, follow-up story. |

## Current Open Gaps

- Playwright is not installed.
- `@axe-core/playwright` is not installed.
- No `playwright.config.ts` exists.
- No `test:e2e` script exists.
- No CI screenshot or accessibility artifacts exist.
- Storefront performance evidence does not exist yet because storefront UI stories have not landed.
