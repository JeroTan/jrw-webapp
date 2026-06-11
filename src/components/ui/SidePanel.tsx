import * as React from "react";
import { useId, type HTMLAttributes, type ReactNode } from "react";

import { mergeClassNames } from "../utils";
import { Button } from "./Button";
import { useDialogFocusTrap } from "./dialog-focus";

const sidePanelClass =
  "fixed inset-0 z-50 grid grid-cols-[minmax(0,1fr)_minmax(360px,560px)] max-md:grid-cols-1";
const backdropClass =
  "absolute inset-0 bg-[color-mix(in_srgb,var(--color-brand-content)_64%,transparent)]";
const panelClass =
  "relative z-[1] col-start-2 grid h-dvh max-h-dvh w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-l border-brand-border-strong bg-brand-surface shadow-none filter-none max-md:col-start-1 max-md:border-l-0";
const headerClass =
  "grid grid-cols-[1fr_auto] items-start gap-grid-xs border-b border-brand-border-strong p-grid-sm";
const titleClass = "m-0 font-identity text-2xl font-bold";
const descriptionClass = "m-0 text-sm text-brand-muted";
const bodyClass = "min-h-0 overflow-auto p-grid-sm";
const footerClass =
  "flex flex-wrap justify-end gap-grid-xs border-t border-brand-border-strong p-grid-sm";

export type SidePanelProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  closeLabel?: string;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function SidePanel({
  children,
  className,
  closeLabel = "Close panel",
  description,
  footer,
  onClose,
  open,
  title,
  ...props
}: SidePanelProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useDialogFocusTrap({ onClose, open });

  if (!open) {
    return null;
  }

  return (
    <div className={sidePanelClass} role="presentation">
      <div aria-hidden="true" className={backdropClass} onMouseDown={onClose} />
      <section
        {...props}
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={mergeClassNames(panelClass, className)}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className={headerClass}>
          <div className="grid gap-1">
            <h2 className={titleClass} id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className={descriptionClass} id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <Button
            aria-label={closeLabel}
            onClick={onClose}
            square
            title={closeLabel}
          >
            x
          </Button>
        </header>
        <div className={bodyClass}>{children}</div>
        {footer ? <footer className={footerClass}>{footer}</footer> : null}
      </section>
    </div>
  );
}
