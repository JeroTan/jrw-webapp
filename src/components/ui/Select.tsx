import * as React from "react";
import { useId, type SelectHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

const fieldClass = "grid min-w-0 gap-grid-xs";
const labelClass =
  "font-system text-[0.8125rem] font-bold text-brand-content";
const descriptionClass = "font-system text-xs text-brand-muted";
const errorClass = "font-system text-xs font-bold text-brand-danger";
const controlClass =
  "min-h-control-md w-full rounded-none border border-brand-border-strong bg-brand-surface px-grid-xs text-brand-content shadow-none filter-none aria-[invalid=true]:border-brand-danger";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  description?: string;
  error?: string;
  hideLabel?: boolean;
  label: string;
  selectClassName?: string;
};

export function Select({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  children,
  className,
  description,
  error,
  hideLabel = false,
  id,
  label,
  required,
  selectClassName,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = description ? `${selectId}-description` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className={mergeClassNames(fieldClass, className)}>
      <label
        className={mergeClassNames(
          labelClass,
          hideLabel && "sr-only",
        )}
        htmlFor={selectId}
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {description ? (
        <p className={descriptionClass} id={descriptionId}>
          {description}
        </p>
      ) : null}
      <select
        {...props}
        aria-describedby={mergeIds(ariaDescribedBy, descriptionId, errorId)}
        aria-invalid={error ? true : ariaInvalid}
        className={mergeClassNames(controlClass, selectClassName)}
        id={selectId}
        required={required}
      >
        {children}
      </select>
      {error ? (
        <p className={errorClass} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
