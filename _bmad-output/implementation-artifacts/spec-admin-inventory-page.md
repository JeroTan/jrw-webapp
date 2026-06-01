---
title: 'Admin Inventory Page'
type: 'feature'
created: '2026-06-01'
status: 'done'
route: 'one-shot'
---

# Admin Inventory Page

## Intent

**Problem:** Admin sidebar exposed Inventory as a query on Products instead of a real page, leaving stock operations without a dedicated workspace.

**Approach:** Add `/admin/inventory` with its own inventory dashboard that loads product variants, highlights low/out-of-stock work, and keeps product editing reachable through the existing product flow.

## Suggested Review Order

**Route And Navigation**

- Sidebar now sends Inventory to its own admin route.
  [`DashboardShell.tsx:16`](../../src/components/layout/DashboardShell.tsx#L16)

- New Astro route wraps inventory in AdminLayout with active nav state.
  [`index.astro:7`](../../src/pages/admin/inventory/index.astro#L7)

**Inventory Experience**

- Dashboard loads products, then variant inventory rows from existing APIs.
  [`AdminInventoryDashboard.tsx:28`](../../src/features/admin-products/components/AdminInventoryDashboard.tsx#L28)

- Table presents product, SKU, stock, state, availability, and action.
  [`AdminInventoryTable.tsx:14`](../../src/features/admin-products/components/AdminInventoryTable.tsx#L14)

- Row builder marks no-variant, low-stock, and out-of-stock work.
  [`inventoryRowsFromProducts.ts:6`](../../src/features/admin-products/components/inventoryRowsFromProducts.ts#L6)

**Coverage**

- Dashboard render test locks page content and table surface.
  [`AdminInventoryDashboard.test.tsx:26`](../../src/features/admin-products/components/AdminInventoryDashboard.test.tsx#L26)
