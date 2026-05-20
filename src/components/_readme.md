# Components Directory

Contains generic, highly reusable global React components used across multiple features. Feature-specific UI stays in `src/features/**` until reuse justifies promotion.

## Component Inventory

- `layout/PageToolbar`: page-level search/filter/action bar. Use for resource browse controls with left work area and right actions.
- DashboardShell, SidebarNav, TopBar, Footer: shell specs live in planning artifacts until implementation starts. Keep them sharp, 1px bordered, keyboard friendly, and operation focused.
- `ui/SearchInput`: search field wrapper around `Input`; visible label required, `type="search"` enforced.
- `ui/ViewToggle`: card/list/table mode control; selected state must be text-visible and announced through button state.
- `data-display/ResourceCard`: repeated resource card/module with title, metadata, status, stats, and primary action.
- `data-display/ResourceList`: responsive resource card/list wrapper with `role="list"`.
- `data-display/DataTable`: dense admin list/table primitive for operational scanning.
- `feedback/EmptyState`: states current condition plus next action. Do not use policy lectures.
- `feedback/Skeleton`: stable loading geometry; centralized `jrw-skeleton` pulse respects reduced motion.

## Copy Rules

- UI text states what user can see or do next.
- Routine UI must not explain seller-of-record, tenant, marketplace, payout, or PayMongo ownership boundaries.
- Keep brand screens practical: "Brand", "Brand members", "Join requests", "Linked products", "No brand".
