import * as React from "react";
import type { ReactNode } from "react";

import { mergeClassNames } from "../utils";
import { IconButton } from "../ui/IconButton";
import type { BadgeTone } from "./Badge";

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
      className={mergeClassNames("jrw-toast", `jrw-toast--${tone}`, className)}
      role={urgent ? "alert" : "status"}
    >
      <div className="jrw-toast__header">
        <p className="jrw-toast__title">{title}</p>
        {onDismiss ? (
          <IconButton
            label={dismissLabel}
            onClick={onDismiss}
            size="sm"
            tooltip={dismissLabel}
          >
            x
          </IconButton>
        ) : null}
      </div>
      <div className="jrw-toast__message">{message}</div>
      {action ? <div className="jrw-toast__action">{action}</div> : null}
    </div>
  );
}
