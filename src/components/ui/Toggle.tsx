import * as React from "react";
import { useId, type InputHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

const fieldClass = "grid min-w-0 gap-grid-xs";
const toggleClass =
  "inline-grid grid-cols-[auto_1fr] items-start gap-grid-xs text-brand-content has-[:disabled]:cursor-not-allowed has-[:disabled]:text-brand-disabled has-[:disabled]:opacity-70";
const inputClass = "peer absolute opacity-0";
const trackClass =
  "relative h-6 w-11 rounded-none border border-brand-border-strong bg-brand-surface after:absolute after:left-[3px] after:top-[3px] after:size-4 after:bg-brand-content after:content-[''] peer-checked:bg-brand-accent peer-checked:after:translate-x-5 peer-checked:after:bg-brand-surface peer-disabled:border-brand-disabled peer-disabled:bg-brand-border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-accent";
const descriptionClass = "font-system text-xs text-brand-muted";
const errorClass = "font-system text-xs font-bold text-brand-danger";

export type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  description?: string;
  error?: string;
  label: string;
};

export function Toggle({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  description,
  error,
  id,
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
        <span className={trackClass} aria-hidden="true" />
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
