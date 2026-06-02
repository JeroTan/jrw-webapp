import * as React from "react";
import { useId, type InputHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

export type ToggleBorderTone = "subtle" | "strong";

const fieldClass = "grid min-w-0 gap-grid-xs";
const toggleClass =
  "inline-grid grid-cols-[auto_1fr] items-start gap-grid-xs text-brand-content has-[:disabled]:cursor-not-allowed has-[:disabled]:text-brand-disabled has-[:disabled]:opacity-70";
const inputClass = "peer absolute opacity-0";

const trackBaseClass =
  "relative h-6 w-11 rounded-none border bg-brand-surface after:absolute after:left-[3px] after:top-[3px] after:size-4 after:bg-brand-content after:content-[''] peer-checked:bg-brand-accent peer-checked:after:translate-x-5 peer-checked:after:bg-brand-surface peer-disabled:border-brand-disabled peer-disabled:bg-brand-border";

const trackInteractiveClass =
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-accent";

const trackBorderToneClass: Record<ToggleBorderTone, string> = {
  subtle: "border-brand-border",
  strong: "border-brand-border-strong",
};

const descriptionClass = "font-system text-xs text-brand-muted";
const errorClass = "font-system text-xs font-bold text-brand-danger";

export type ToggleProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  borderTone?: ToggleBorderTone;
  description?: string;
  error?: string;
  interactive?: boolean;
  label: string;
};

export function Toggle({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  borderTone = "strong",
  className,
  description,
  error,
  id,
  interactive = true,
  label,
  ...props
}: ToggleProps) {
  const generatedId = useId();
  const toggleId = id ?? generatedId;
  const descriptionId = description ? `${toggleId}-description` : undefined;
  const errorId = error ? `${toggleId}-error` : undefined;

  return (
    <div className={mergeClassNames(fieldClass, className)}>
      <label className={toggleClass} htmlFor={toggleId}>
        <input
          {...props}
          aria-describedby={mergeIds(ariaDescribedBy, descriptionId, errorId)}
          aria-invalid={error ? true : ariaInvalid}
          className={inputClass}
          id={toggleId}
          role="switch"
          type="checkbox"
        />
        <span
          className={mergeClassNames(
            trackBaseClass,
            interactive && trackInteractiveClass,
            trackBorderToneClass[borderTone]
          )}
          aria-hidden="true"
        />
        <span>{label}</span>
      </label>

      {description ? (
        <p className={descriptionClass} id={descriptionId}>
          {description}
        </p>
      ) : null}

      {error ? (
        <p className={errorClass} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
