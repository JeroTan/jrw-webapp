import * as React from "react";
import {
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { mergeClassNames } from "../utils";
import { Button } from "./Button";

const drawerClass =
  "fixed inset-0 z-50 grid grid-cols-[minmax(0,1fr)_minmax(320px,440px)] max-sm:grid-cols-1";
const backdropClass =
  "absolute inset-0 bg-[color-mix(in_srgb,var(--color-brand-content)_64%,transparent)]";
const panelClass =
  "relative z-[1] col-start-2 grid h-dvh max-h-dvh w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-l border-brand-border-strong bg-brand-surface shadow-none filter-none max-sm:col-start-1 max-sm:border-l-0";
const headerClass =
  "grid grid-cols-[1fr_auto] items-start gap-grid-xs border-b border-brand-border-strong p-grid-sm";
const titleClass = "m-0 font-identity text-2xl font-bold";
const descriptionClass = "m-0 text-sm text-brand-muted";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => !element.hasAttribute("disabled"))
    .filter((element) => element.getAttribute("aria-hidden") !== "true");
}

function isTopmostDialog(dialog: HTMLElement): boolean {
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>("[role='dialog'][aria-modal='true']")
  );

  return dialogs[dialogs.length - 1] === dialog;
}

export type DrawerProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  closeLabel?: string;
  description?: string;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Drawer({
  children,
  className,
  closeLabel = "Close drawer",
  description,
  onClose,
  open,
  title,
  ...props
}: DrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !dialogRef.current) {
      return;
    }

    const dialog = dialogRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusable = getFocusableElements(dialog);
    (focusable[0] ?? dialog).focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || !isTopmostDialog(dialog)) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const currentFocusable = getFocusableElements(dialog);
      if (currentFocusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className={drawerClass} role="presentation">
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
        <div className="min-h-0 overflow-auto p-grid-sm">{children}</div>
      </section>
    </div>
  );
}
