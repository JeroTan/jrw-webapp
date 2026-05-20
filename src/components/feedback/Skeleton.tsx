import * as React from "react";
import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../utils";

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
      className={mergeClassNames("jrw-skeleton", className)}
      role="status"
    >
      {Array.from({ length: lines }).map((_, index) => (
        <span
          className="jrw-skeleton__line motion-safe:animate-pulse"
          key={index}
        />
      ))}
    </div>
  );
}
