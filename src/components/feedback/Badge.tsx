import * as React from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "error";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
};

const badgeBaseClass =
  "inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-none border border-brand-border-strong bg-brand-surface px-grid-xs font-system text-xs font-bold leading-none text-brand-content shadow-none filter-none [overflow-wrap:anywhere]";

const badgeToneClass: Record<BadgeTone, string> = {
  neutral: "",
  info: "border-brand-accent",
  success: "border-brand-success text-brand-success",
  warning: "border-brand-warning text-brand-warning",
  error: "border-brand-danger text-brand-danger",
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
      className={mergeClassNames(badgeBaseClass, badgeToneClass[tone], className)}
    >
      {children}
    </span>
  );
}
