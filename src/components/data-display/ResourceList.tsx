import * as React from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";

const resourceListClass =
  "grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-grid-sm";

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
      className={mergeClassNames(resourceListClass, className)}
      role="list"
    >
      {children}
    </div>
  );
}
