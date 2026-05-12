import * as React from "react";
import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../utils";
import { Badge, type BadgeTone } from "./Badge";

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
      className={mergeClassNames("jrw-status-badge", className)}
      tone={tone}
    >
      <span className="jrw-status-badge__mark" aria-hidden="true" />
      <span>{label}</span>
    </Badge>
  );
}
