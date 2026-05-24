import * as React from "react";
import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../utils";

const skeletonClass = "grid gap-grid-xs rounded-none shadow-none filter-none";
const skeletonLineClass =
  "min-h-4 rounded-none border border-brand-border bg-brand-border shadow-none filter-none motion-safe:animate-pulse";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
  lines?: number;
};

export function Skeleton({
  className,
  label = "Loading content",
  lines = 1,
  ...props
}: SkeletonProps) {
  return (
    <div
      {...props}
      aria-label={label}
      className={mergeClassNames(skeletonClass, className)}
      role="status"
    >
      {Array.from({ length: lines }).map((_, index) => (
        <span className={skeletonLineClass} key={index} />
      ))}
    </div>
  );
}
