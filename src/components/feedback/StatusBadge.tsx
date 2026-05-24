import * as React from "react";
import type { HTMLAttributes } from "react";

import { Badge, type BadgeTone } from "./Badge";

const statusMarkClass =
  "size-2 border border-current bg-current";

export type StatusBadgeProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  label: string;
  tone?: Exclude<BadgeTone, "neutral">;
};

export function StatusBadge({
  className,
  label,
  tone = "info",
  ...props
}: StatusBadgeProps) {
  return (
    <Badge
      {...props}
      className={className}
      tone={tone}
    >
      <span className={statusMarkClass} aria-hidden="true" />
      <span>{label}</span>
    </Badge>
  );
}
