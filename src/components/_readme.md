# Components Directory

Contains generic, highly reusable global React components used across multiple features. Feature-specific UI stays in `src/features/**` until reuse justifies promotion.

## Component Inventory

- `layout/PageToolbar`: page-level search/filter/action bar. Use for resource browse controls with left work area and right actions.
- DashboardShell, SidebarNav, TopBar, Footer: shell specs live in planning artifacts until implementation starts. Keep them sharp, 1px bordered, keyboard friendly, and operation focused.
- `ui/SearchInput`: search field wrapper around `Input`; visible label required, `type="search"` enforced.
- `ui/SegmentedControl`: generic pressed-button choice control for modes or compact options without tab panels.
- `ui/ViewToggle`: card/list/table mode control; selected state must be text-visible and announced through button state.
- `ui/Pagination`: callback-driven page controls for hydrated/admin tables; storefront SSR links may compose the same visual contract locally.
- `ui/Drawer`: modal edge overlay for cart/review surfaces; traps focus, closes on Escape, restores focus.
- `ui/SidePanel`: modal work panel for admin/product/order editing; use for focused edit flows, not cart-specific UI.
- `data-display/ResourceCard`: repeated resource card/module with optional media, title, metadata, status, stats, and primary action.
- `data-display/ResourceList`: responsive resource card/list wrapper with `role="list"`.
- `data-display/DataTable`: dense admin list/table primitive for operational scanning.
- `feedback/EmptyState`: states current condition plus next action. Do not use policy lectures.
- `feedback/Skeleton`: stable loading geometry; Tailwind `motion-safe:animate-pulse` respects reduced motion.

## Copy Rules

- UI text states what user can see or do next.
- Routine UI must not explain seller-of-record, tenant, marketplace, payout, or PayMongo ownership boundaries.
- Keep brand screens practical: "Brand", "Brand members", "Join requests", "Linked products", "No brand".
