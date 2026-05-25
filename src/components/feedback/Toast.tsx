import * as React from "react";
import type { ReactNode } from "react";

import { mergeClassNames } from "../utils";
import { Button } from "../ui/Button";
import type { BadgeTone } from "./Badge";

const toastBaseClass =
  "grid max-w-[420px] gap-grid-xs rounded-none border border-brand-border-strong bg-brand-surface p-grid-sm font-system text-brand-content shadow-none filter-none";
const toastToneClass: Record<BadgeTone, string> = {
  neutral: "",
  info: "border-brand-accent",
  success: "border-brand-success",
  warning: "border-brand-warning",
  error: "border-brand-danger",
};
const toastHeaderClass = "grid grid-cols-[1fr_auto] gap-grid-xs";
const toastTitleClass = "font-heading font-bold";

export type ToastProps = {
  action?: ReactNode;
  className?: string;
  dismissLabel?: string;
  message: ReactNode;
  onDismiss?: () => void;
  title: string;
  tone?: BadgeTone;
};

export function Toast({
  action,
  className,
  dismissLabel = "Dismiss notification",
  message,
  onDismiss,
  title,
  tone = "neutral",
}: ToastProps) {
  const urgent = tone === "error" || tone === "warning";

  return (
    <div
      aria-live={urgent ? "assertive" : "polite"}
      className={mergeClassNames(
        toastBaseClass,
        toastToneClass[tone],
        className
      )}
      role={urgent ? "alert" : "status"}
    >
      <div className={toastHeaderClass}>
        <p className={toastTitleClass}>{title}</p>
        {onDismiss ? (
          <Button
            aria-label={dismissLabel}
            onClick={onDismiss}
            size="sm"
            square
            title={dismissLabel}
          >
            x
          </Button>
        ) : null}
      </div>
      <div>{message}</div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
