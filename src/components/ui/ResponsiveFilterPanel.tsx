import * as React from "react";
import { useId, type ReactNode } from "react";

import { mergeClassNames } from "../utils";

export type ResponsiveFilterPanelProps = {
  ariaLabel: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  title?: string;
};

export function ResponsiveFilterPanel({
  ariaLabel,
  children,
  defaultExpanded = false,
  title = "Filters",
}: ResponsiveFilterPanelProps) {
  const toggleId = useId();

  return (
    <aside
      aria-label={ariaLabel}
      className={mergeClassNames(
        "group/filter-panel self-start border border-brand-border bg-background p-grid-sm",
        "[&:has(input:checked)_.filter-panel-body]:grid [&:has(input:checked)_.filter-panel-minus]:inline [&:has(input:checked)_.filter-panel-plus]:hidden"
      )}
    >
      <input
        className="peer sr-only"
        defaultChecked={defaultExpanded}
        id={toggleId}
        type="checkbox"
      />
      <label
        className="flex min-h-control-sm cursor-pointer items-center justify-between border border-brand-border bg-brand-surface px-grid-xs font-system text-xs font-bold uppercase md:hidden"
        htmlFor={toggleId}
      >
        <span>{title}</span>
        <span aria-hidden="true" className="filter-panel-plus">
          +
        </span>
        <span aria-hidden="true" className="filter-panel-minus hidden">
          -
        </span>
      </label>
      <div className="filter-panel-body mt-grid-sm hidden md:mt-0 md:grid">
        {children}
      </div>
    </aside>
  );
}
