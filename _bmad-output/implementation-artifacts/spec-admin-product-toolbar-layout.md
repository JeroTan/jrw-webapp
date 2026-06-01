---
title: 'Admin Product Toolbar Layout'
type: 'bugfix'
created: '2026-06-01'
status: 'done'
route: 'one-shot'
---

# Admin Product Toolbar Layout

## Intent

**Problem:** Admin product search and filters rendered as stacked toolbar rows, consuming too much vertical space on desktop.

**Approach:** Extract product list controls into one atomic toolbar component that keeps search, brand filter, and category filter in one dense responsive row while reusing shared JRW primitives.

## Suggested Review Order

**Toolbar Composition**

- New atomic toolbar owns dense control layout and shared primitives.
  [`ProductListToolbar.tsx:27`](../../src/features/admin-products/components/ProductListToolbar.tsx#L27)

- Dashboard delegates control rendering without duplicating input/select markup.
  [`ProductListDashboard.tsx:759`](../../src/features/admin-products/components/ProductListDashboard.tsx#L759)

**Coverage**

- Render test locks search and filters into single toolbar grid.
  [`ProductListDashboard.test.tsx:49`](../../src/features/admin-products/components/ProductListDashboard.test.tsx#L49)
