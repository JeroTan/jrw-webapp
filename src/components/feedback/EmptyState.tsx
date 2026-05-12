import * as React from "react";
import type { ReactNode } from "react";

import { mergeClassNames } from "../utils";

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
    <div className={mergeClassNames("jrw-empty-state", className)}>
      <p className="jrw-empty-state__title">{title}</p>
      <div className="jrw-empty-state__message">{message}</div>
      {action ? <div className="jrw-empty-state__action">{action}</div> : null}
    </div>
  );
}
