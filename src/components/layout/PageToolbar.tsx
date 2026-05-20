import * as React from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";

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
    <div className={mergeClassNames("jrw-page-toolbar-shell", className)}>
      <div {...props} className="jrw-page-toolbar">
        <div className="jrw-page-toolbar__main">{main}</div>
        {actions ? (
          <div className="jrw-page-toolbar__actions">{actions}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
