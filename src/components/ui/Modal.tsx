import * as React from "react";
import {
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { mergeClassNames } from "../utils";
import { IconButton } from "./IconButton";

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
    <div className="jrw-modal" role="presentation">
      <div
        aria-hidden="true"
        className="jrw-modal__backdrop"
        onMouseDown={onClose}
      />
      <section
        {...props}
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={mergeClassNames("jrw-modal__panel", className)}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="jrw-modal__header">
          <div>
            <h2 className="jrw-modal__title" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="jrw-modal__description" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <IconButton label={closeLabel} onClick={onClose} tooltip={closeLabel}>
            x
          </IconButton>
        </header>
        <div className="jrw-modal__body">{children}</div>
        {footer ? (
          <footer className="jrw-modal__footer">{footer}</footer>
        ) : null}
      </section>
    </div>
  );
}
