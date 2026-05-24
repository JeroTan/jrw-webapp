import * as React from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";

const toolbarShellClass = "grid gap-grid-sm pt-grid-md";
const toolbarClass =
  "grid grid-cols-[minmax(260px,1fr)_auto] items-end gap-grid-sm border-b border-brand-border pb-grid-sm max-md:grid-cols-1";
const mainClass = "min-w-0";
const actionsClass =
  "flex flex-wrap justify-end gap-grid-xs max-md:justify-stretch";

export type PageToolbarProps = HTMLAttributes<HTMLDivElement> & {
  actions?: ReactNode;
  children?: ReactNode;
  main?: ReactNode;
};

export function PageToolbar({
  actions,
  children,
  className,
  main,
  ...props
}: PageToolbarProps) {
  return (
    <div className={mergeClassNames(toolbarShellClass, className)}>
      <div {...props} className={toolbarClass}>
        <div className={mainClass}>{main}</div>
        {actions ? (
          <div className={actionsClass}>{actions}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
