import * as React from "react";
import {
  useId,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { mergeClassNames } from "../utils";
import { Button } from "./Button";
import { useDialogFocusTrap } from "./dialog-focus";

const modalClass = "fixed inset-0 z-50 grid place-items-center p-grid-sm";
const backdropClass =
  "absolute inset-0 bg-[color-mix(in_srgb,var(--color-brand-content)_64%,transparent)]";
const panelClass =
  "relative z-[1] grid max-h-[min(720px,calc(100vh-48px))] w-[min(100%,560px)] gap-grid-sm overflow-auto rounded-none border border-brand-border-strong bg-brand-surface p-grid-sm shadow-none filter-none";
const headerClass = "grid grid-cols-[1fr_auto] items-start gap-grid-xs";
const titleClass = "text-xl";
const descriptionClass = "text-sm text-brand-muted";
const footerClass = "flex flex-wrap justify-end gap-grid-xs";

export type ModalProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  closeLabel?: string;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Modal({
  children,
  className,
  closeLabel = "Close dialog",
  description,
  footer,
  onClose,
  open,
  title,
  ...props
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useDialogFocusTrap({ onClose, open });

  if (!open) {
    return null;
  }

  return (
    <div className={modalClass} role="presentation">
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
          <div>
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
        <div>{children}</div>
        {footer ? <footer className={footerClass}>{footer}</footer> : null}
      </section>
    </div>
  );
}
