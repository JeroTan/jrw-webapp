import * as React from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "error";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
};

export function Badge({
  children,
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={mergeClassNames("jrw-badge", `jrw-badge--${tone}`, className)}
    >
      {children}
    </span>
  );
}
