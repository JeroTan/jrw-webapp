import * as React from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";

export type ResourceListProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  label: string;
};

export function ResourceList({
  children,
  className,
  label,
  ...props
}: ResourceListProps) {
  return (
    <div
      {...props}
      aria-label={label}
      className={mergeClassNames("jrw-resource-list", className)}
      role="list"
    >
      {children}
    </div>
  );
}
