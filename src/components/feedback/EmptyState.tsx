import * as React from "react";
import type { ReactNode } from "react";

import { mergeClassNames } from "../utils";

const emptyStateClass =
  "grid gap-grid-xs rounded-none border border-brand-border bg-brand-surface p-grid-sm font-system shadow-none filter-none";
const titleClass = "font-heading font-bold";
const messageClass = "text-sm text-brand-muted";

export type EmptyStateProps = {
  action?: ReactNode;
  className?: string;
  message: ReactNode;
  title: string;
};

export function EmptyState({
  action,
  className,
  message,
  title,
}: EmptyStateProps) {
  return (
    <div className={mergeClassNames(emptyStateClass, className)}>
      <p className={titleClass}>{title}</p>
      <div className={messageClass}>{message}</div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
