import * as React from "react";
import { useId, type InputHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

export type InputBorderTone = "subtle" | "strong";

const fieldClass = "grid min-w-0 gap-grid-xs";
const labelClass = "font-system text-[0.8125rem] font-bold text-brand-content";
const descriptionClass = "font-system text-xs text-brand-muted";
const errorClass = "font-system text-xs font-bold text-brand-danger";

const controlBaseClass =
  "min-h-control-md w-full rounded-none border bg-brand-surface px-grid-xs text-brand-content shadow-none filter-none hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent aria-[invalid=true]:border-brand-danger";

const controlBorderToneClass: Record<InputBorderTone, string> = {
  subtle: "border-brand-border",
  strong: "border-brand-border-strong",
};

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  borderTone?: InputBorderTone;
  description?: string;
  error?: string;
  hideLabel?: boolean;
  inputClassName?: string;
  label: string;
};

export function Input({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  borderTone = "strong",
  className,
  description,
  error,
  hideLabel = false,
  id,
  inputClassName,
  label,
  required,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={mergeClassNames(fieldClass, className)}>
      <label
        className={mergeClassNames(labelClass, hideLabel && "sr-only")}
        htmlFor={inputId}
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>

      {description ? (
        <p className={descriptionClass} id={descriptionId}>
          {description}
        </p>
      ) : null}

      <input
        {...props}
        aria-describedby={mergeIds(ariaDescribedBy, descriptionId, errorId)}
        aria-invalid={error ? true : ariaInvalid}
        className={mergeClassNames(
          controlBaseClass,
          controlBorderToneClass[borderTone],
          inputClassName
        )}
        id={inputId}
        required={required}
      />

      {error ? (
        <p className={errorClass} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
